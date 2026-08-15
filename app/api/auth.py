"""Google sign-in.

The shape of this flow is unchanged from the original: a `/auth/google_login`
that hands the reader to Google, a `/auth/google/callback` that exchanges the
code, upserts the user and issues an access/refresh JWT pair as httpOnly
cookies. What follows fixes the parts that stopped it running and adds the two
endpoints a browser client cannot work without.

Fixed rather than rewritten:

  * `from db.connect import get_db` — the package is `app.db.connect`, so the
    module raised ImportError before FastAPI ever saw it.
  * Google's userinfo endpoint returns `sub`, not `id`, and `User` has no
    `first_name` column, so building the row raised KeyError then TypeError.
  * `db.add(...)` on every callback made a second sign-in a primary-key
    collision; the user is now looked up and updated in place.
  * The callback answered with JSON, which leaves the browser sitting on an API
    URL after Google redirects to it. It now returns to the frontend.

Added, because httpOnly cookies are invisible to JavaScript and a client
otherwise has no way to ask whether it is signed in:

  * `GET  /auth/me`     — the current user, or 401.
  * `POST /auth/logout` — clears both cookies.
"""
import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from google_auth_oauthlib.flow import Flow
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse, RedirectResponse

from app.config.settings import get_settings
from app.db.connect import get_db
from app.db.model.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

_settings = get_settings()

GOOGLE_CLIENT_CONFIG = {
    "web": {
        "client_id": _settings.CLIENT_ID,
        "client_secret": _settings.CLIENT_SECRET,
        "redirect_uri": _settings.REDIRECT_URI,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

# The `state` parameter is the CSRF defence for an OAuth round trip: without
# checking that what comes back is what we sent, anyone can feed the callback a
# code of their choosing. Held in a short-lived cookie because the exchange is
# stateless — there is no server-side session to put it in.
STATE_COOKIE = "oauth_state"
STATE_TTL_SECONDS = 600


def create_google_flow(state=None):
    flow = Flow.from_client_config(
        GOOGLE_CLIENT_CONFIG,
        scopes=GOOGLE_SCOPES,
        state=state,
    )
    flow.redirect_uri = _settings.REDIRECT_URI
    return flow


def _set_cookie(response, key, value, max_age):
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=_settings.COOKIE_SECURE,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _issue_tokens(response, user_id):
    now = datetime.datetime.now(datetime.timezone.utc)
    access = jwt.encode(
        {
            "user_id": str(user_id),
            "token_type": "access",
            "exp": now + datetime.timedelta(minutes=_settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        },
        _settings.SECRET_KEY,
        algorithm="HS256",
    )
    refresh = jwt.encode(
        {
            "user_id": str(user_id),
            "token_type": "refresh",
            "exp": now + datetime.timedelta(days=_settings.REFRESH_TOKEN_EXPIRE_DAYS),
        },
        _settings.SECRET_KEY,
        algorithm="HS256",
    )
    _set_cookie(response, "access_token", access,
                _settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    _set_cookie(response, "refresh_token", refresh,
                _settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)


# GET as well as POST: a browser starts this flow by navigating to it, and a
# navigation is a GET. The original POST still works and still redirects, so
# nothing that called it before is broken.
@router.api_route("/google_login", methods=["GET", "POST"])
async def login():
    """Hand the reader to Google's consent screen."""
    flow = create_google_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="select_account",
    )

    response = RedirectResponse(authorization_url)
    _set_cookie(response, STATE_COOKIE, state, STATE_TTL_SECONDS)
    return response


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Finish the exchange, sign the user in, and return them to the app.

    Every failure lands back on the frontend with `?auth_error=<reason>` rather
    than as an API error page: at this point the reader is mid-navigation in a
    browser, and a raw 500 from a URL they never typed is not an answer.
    """
    frontend = _settings.FRONTEND_URL.rstrip("/")

    # The user pressing "cancel" on Google's consent screen comes back as
    # `?error=access_denied` with no code — a normal outcome, not a fault.
    error = request.query_params.get("error")
    if error:
        return RedirectResponse(f"{frontend}/auth?auth_error={error}")

    expected_state = request.cookies.get(STATE_COOKIE)
    returned_state = request.query_params.get("state")
    if not expected_state or expected_state != returned_state:
        return RedirectResponse(f"{frontend}/auth?auth_error=state_mismatch")

    try:
        flow = create_google_flow(state=expected_state)
        flow.fetch_token(authorization_response=str(request.url))
        credentials = flow.credentials

        profile = httpx.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {credentials.token}"},
            timeout=10,
        )
        profile.raise_for_status()
        google_user = profile.json()
    except Exception:  # noqa: BLE001 — any failure here is "sign-in didn't work"
        return RedirectResponse(f"{frontend}/auth?auth_error=exchange_failed")

    # userinfo v3 returns `sub`, `email`, `name`, `picture`. There is no `id`
    # field, and `User` has no `first_name` column — both were why this raised.
    google_id = google_user.get("sub")
    email = google_user.get("email")
    if not google_id or not email:
        return RedirectResponse(f"{frontend}/auth?auth_error=no_profile")

    # Upsert: signing in twice is the normal case, not a conflict.
    user = (
        db.query(User).filter(User.google_id == google_id).first()
        or db.query(User).filter(User.email == email).first()
    )
    if user is None:
        user = User(google_id=google_id, email=email)
        db.add(user)
    user.google_id = google_id
    user.email = email
    user.name = google_user.get("name")
    user.picture = google_user.get("picture")
    db.commit()
    db.refresh(user)

    response = RedirectResponse(f"{frontend}/auth/callback")
    _issue_tokens(response, user.id)
    response.delete_cookie(STATE_COOKIE, path="/")
    return response


def current_user(request: Request, db: Session = Depends(get_db)):
    """The signed-in user, or a 401. Reads the httpOnly access-token cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, _settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Session expired")
    if payload.get("token_type") != "access":
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.query(User).filter(User.id == int(payload["user_id"])).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.get("/me")
def me(user: User = Depends(current_user)):
    """Who is signed in. The client's only way to see an httpOnly session."""
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        }
    }


@router.post("/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    for key in ("access_token", "refresh_token"):
        response.delete_cookie(key, path="/")
    return response
