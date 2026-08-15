import datetime
from typing import Any
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.orm import Session
from app.config.settings import get_settings
from app.db.connect import get_db
from app.db.model.user import User

# `auto_error=False` so a missing Authorization header is not an instant 401:
# the browser never sends one. The session issued by `POST /auth/google`
# lives in an httpOnly cookie, which JavaScript cannot read and therefore
# cannot put in a header — so the cookie has to be a first-class source here,
# not a fallback bolted on. Bearer still wins when both are present, which
# keeps non-browser clients (and the Swagger "Authorize" button) working.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="start", auto_error=False)
ALGORITHM = "HS256"

ACCESS_COOKIE = "access_token"


def credentials_exception(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def get_user_id(payload: dict[str, Any]) -> int:
    user_id = payload.get("user_id")
    if user_id is None:
        raise credentials_exception()
    try:
        return int(user_id)
    except (TypeError, ValueError) as exc:
        raise credentials_exception() from exc


def get_user(payload: dict[str, Any], db: Session, expected_token_type: str) -> User:
    token_type = payload.get("token_type")
    if token_type != expected_token_type:
        raise credentials_exception()

    user_id = get_user_id(payload)
    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception("User no longer exists")
    return user


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"user_id": user_id, "token_type": "access", "exp": expires_at}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def get_access_token(
    request: Request,
    token: str = Depends(oauth2_scheme),
) -> str:
    """The access token, from the Authorization header or the session cookie."""
    resolved = token or request.cookies.get(ACCESS_COOKIE)
    if not resolved:
        raise credentials_exception("Not authenticated")
    return resolved


def _set_access_cookie(response: Response, token: str) -> None:
    """Rotate the browser's session cookie after a refresh.

    Without this the refresh branch below would hand a new access token back in
    a header the browser ignores, so the cookie would stay expired and every
    single request would pay for a refresh round trip.
    """
    settings = get_settings()
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def get_refresh_token(request: Request):
    return (
        request.headers.get("X-Refresh-Token")
        or request.headers.get("refresh-token")
        or request.headers.get("refresh_token")
        or request.cookies.get("refresh_token")
    )


def get_current_user(
    request: Request,
    response: Response,
    token: str = Depends(get_access_token),
    db: Session = Depends(get_db),
) -> int:
    try:
        payload = decode_token(token)
        user = get_user(payload, db, expected_token_type="access")
        return user.id
    except ExpiredSignatureError:
        refresh_token = get_refresh_token(request)
        if refresh_token is None:
            raise credentials_exception("Access token expired")

        try:
            refresh_payload = decode_token(refresh_token)
        except ExpiredSignatureError as exc:
            raise credentials_exception("Refresh token expired") from exc
        except JWTError as exc:
            raise credentials_exception() from exc

        user = get_user(refresh_payload, db, expected_token_type="refresh")
        access_token = create_access_token(str(user.id))
        response.headers["X-Access-Token"] = access_token
        response.headers["Authorization"] = f"Bearer {access_token}"
        _set_access_cookie(response, access_token)
        return user.id
    except JWTError as exc:
        raise credentials_exception() from exc
