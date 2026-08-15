import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse
from fastapi import Response
from app.Auth.VerifyJWT import get_current_user
from app.config.settings import get_settings
from app.db.connect import get_db
from app.db.model.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

_settings = get_settings()

logger = logging.getLogger("uvicorn.error")


class GoogleCredential(BaseModel):
    credential: str


def set_cookie(response, key, value, max_age):
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=_settings.COOKIE_SECURE,
        samesite=_settings.COOKIE_SAMESITE,
        max_age=max_age,
    )


def create_tokens(response, user_id):
    now = datetime.datetime.now(datetime.timezone.utc)

    access = jwt.encode(
        {
            "user_id": str(user_id),
            "token_type": "access",
            "exp": now + datetime.timedelta(
                minutes=_settings.ACCESS_TOKEN_EXPIRE_MINUTES
            ),
        },
        _settings.SECRET_KEY,
        algorithm="HS256",
    )

    refresh = jwt.encode(
        {
            "user_id": str(user_id),
            "token_type": "refresh",
            "exp": now + datetime.timedelta(
                days=_settings.REFRESH_TOKEN_EXPIRE_DAYS
            ),
        },
        _settings.SECRET_KEY,
        algorithm="HS256",
    )

    set_cookie(
        response,
        "access_token",
        access,
        _settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    set_cookie(
        response,
        "refresh_token",
        refresh,
        _settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def verify_google(credential):
    try:
        return google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            _settings.CLIENT_ID,
            # Google signs the token on their clock and this checks it on ours.
            # Without a little tolerance, a machine a second or two behind
            # rejects a perfectly good credential as "used too early".
            clock_skew_in_seconds=10,
        )
    except google_exceptions.TransportError as exc:
        # Google's certificate endpoint was unreachable — the credential may be
        # fine, so this is worth retrying rather than a sign-in failure.
        logger.error("Could not reach Google to verify a credential: %s", exc)
        raise HTTPException(503, "Could not reach Google. Please try again.")
    except ValueError as exc:
        # Expired, wrong audience, wrong signature — the reason never goes to
        # the browser, but without it in the log a failed sign-in is unreadable.
        logger.warning("Google credential rejected: %s", exc)
        raise HTTPException(401, "Invalid Google credential")


def get_or_create_user(db, claims):
    google_id = claims["sub"]
    email = claims["email"]

    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            google_id=google_id,
            email=email,
        )
        db.add(user)

    user.name = claims.get("name")
    user.picture = claims.get("picture")

    db.commit()
    db.refresh(user)

    return user


@router.post("/google")
def google_login(
    payload: GoogleCredential,
    db: Session = Depends(get_db),
):
    claims = verify_google(payload.credential)
    user = get_or_create_user(db, claims)

    response = JSONResponse({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        }
    })

    create_tokens(response, user.id)

    return response

@router.get("/me")
def me(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(401, "Not authenticated")

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        }
    }


@router.post("/logout")
def logout(response: Response):
    for key in ("access_token", "refresh_token"):
        response.delete_cookie(key, path="/")
    return {"message": "Logged out"}
