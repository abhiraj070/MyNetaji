import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from app.config.settings import get_settings
from app.db.connect import get_db
from app.db.model.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

_settings = get_settings()


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
            "type": "access",
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
            "type": "refresh",
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
        )
    except ValueError:
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

@router.post("/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    for key in ("access_token", "refresh_token"):
        response.delete_cookie(key, path="/")
    return response
