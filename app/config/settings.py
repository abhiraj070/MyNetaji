from functools import lru_cache
from typing import Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class settings(BaseSettings):
    # `extra="ignore"` so a key left behind in an existing `.env` — REDIRECT_URI,
    # for one, which the Google popup flow no longer uses — does not stop the
    # server from starting. Missing *required* settings still fail loudly.
    model_config = SettingsConfigDict(env_file="app/.env", extra="ignore")

    DB_URL: str
    BEARER_TOKEN_X: str
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    NEWS_API_KEY: str
    REDIS_URL: str
    # CLIENT_ID is also read by the browser (Google Identity Services needs it
    # to open the popup); CLIENT_SECRET is server-side only and is not used by
    # the popup flow at all — it is kept for anything that talks to Google's
    # token endpoint directly.
    CLIENT_ID : str
    CLIENT_SECRET : str
    # One origin, or several comma-separated. Production:
    # https://meetyourleader.in
    FRONTEND_URL: str = "http://localhost:3000"
    # Filled in by the validator below: every entry, in order.
    FRONTEND_URLS: list[str] = []
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    SECRET_KEY : str
    DATA_UPDATED_AT: Optional[str] = None

    @model_validator(mode="after")
    def _check_frontend_url(self):
        """One frontend origin, or several separated by commas.

        A list is what a migration looks like — the app answering on an old
        host and a new one at the same time. Every entry is validated, so a
        typo in the second one is caught at startup rather than at the moment
        something reads it.

        `FRONTEND_URL` stays the canonical single value (the first entry) for
        the code that wants one; `FRONTEND_URLS` has them all. Note this is not
        what authorises browser requests — that is `CORS_ORIGINS`, which has
        always taken a list.
        """
        raw = (self.FRONTEND_URL or "").strip()
        entries = [part.strip().rstrip("/") for part in raw.split(",") if part.strip()]
        if not entries:
            raise ValueError(
                "FRONTEND_URL must be an absolute http(s) URL, got "
                f"{self.FRONTEND_URL!r}. A blank value in .env counts as "
                "set and overrides the default."
            )
        for entry in entries:
            if not entry.startswith(("http://", "https://")):
                raise ValueError(
                    f"FRONTEND_URL entries must be absolute http(s) URLs, got "
                    f"{entry!r} in {self.FRONTEND_URL!r}."
                )
        self.FRONTEND_URLS = entries
        self.FRONTEND_URL = entries[0]
        return self

    @model_validator(mode="after")
    def _check_cookie_policy(self):
        allowed = {"lax", "strict", "none"}
        value = (self.COOKIE_SAMESITE or "").lower()
        if value not in allowed:
            raise ValueError(
                f"COOKIE_SAMESITE must be one of {sorted(allowed)}, got "
                f"{self.COOKIE_SAMESITE!r}"
            )
        if value == "none" and not self.COOKIE_SECURE:
            raise ValueError(
                "COOKIE_SAMESITE=none requires COOKIE_SECURE=true — browsers "
                "discard a cross-site cookie that is not marked Secure."
            )
        self.COOKIE_SAMESITE = value
        return self


@lru_cache
def get_settings():
    return settings()
