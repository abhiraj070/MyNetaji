from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

class settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="app/.env")

    DB_URL: str
    BEARER_TOKEN_X: str
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    NEWS_API_KEY: str
    REDIS_URL: str
    CLIENT_ID : str
    CLIENT_SECRET : str
    # Where Google sends the user back — must match the redirect URI registered
    # in the Google Cloud console exactly. Used by `app/api/auth.py`, which
    # referenced it before it was declared here.
    REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    # Where to return the reader once the callback has signed them in.
    FRONTEND_URL: str = "http://localhost:3000"
    # Session cookies are `Secure` in production. Off by default so the flow
    # also works over plain http on a dev machine.
    COOKIE_SECURE: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    SECRET_KEY : str
    # The date the political dataset is published as current for, shown as
    # "Data updated …". Separate from each importer's `fetched_at`, which
    # records when *we* ran the scraper — a different fact, and one that stays
    # untouched as an audit trail. Leave unset to fall back to the newest
    # `fetched_at` the data itself carries.
    DATA_UPDATED_AT: Optional[str] = None


@lru_cache
def get_settings():
    return settings()
