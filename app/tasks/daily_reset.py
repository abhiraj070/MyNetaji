import asyncio
import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import text

from app.db.connect import engine

logger = logging.getLogger("uvicorn.error")

_LOCK_KEY = 8_412_553_001

_BOOKKEEPING_DDL = text(
    """
    CREATE TABLE IF NOT EXISTS daily_counter_resets (
        id smallint PRIMARY KEY,
        last_reset_on date NOT NULL,
        CONSTRAINT daily_counter_resets_singleton CHECK (id = 1)
    )
    """
)

_RESET_STATEMENTS = (
    text(
        """
        UPDATE chief_ministers
           SET slap_count_today = 0, rose_count_today = 0
         WHERE slap_count_today IS DISTINCT FROM 0
            OR rose_count_today IS DISTINCT FROM 0
        """
    ),
    text(
        """
        UPDATE ministers
           SET slap_count_today = 0, rose_count_today = 0
         WHERE slap_count_today IS DISTINCT FROM 0
            OR rose_count_today IS DISTINCT FROM 0
        """
    ),
)


def _zone():
    name = os.getenv("RESET_TIMEZONE", "Asia/Kolkata")
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        logger.warning("Timezone %s unavailable; falling back to UTC.", name)
        return ZoneInfo("UTC")


def seconds_until_next_midnight(now=None):
    zone = _zone()
    now = now or datetime.now(zone)
    tomorrow = (now + timedelta(days=1)).date()
    boundary = datetime.combine(tomorrow, datetime.min.time(), tzinfo=zone)
    return max(1.0, (boundary - now).total_seconds())


def run_daily_reset():
    today = datetime.now(_zone()).date()

    with engine.begin() as conn:
        conn.execute(_BOOKKEEPING_DDL)
        if not conn.execute(
            text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": _LOCK_KEY}
        ).scalar():
            return "skipped: another worker holds the lock"

        last_reset_on = conn.execute(
            text("SELECT last_reset_on FROM daily_counter_resets WHERE id = 1")
        ).scalar()

        if last_reset_on is not None and last_reset_on >= today:
            return f"skipped: already reset for {today}"

        cleared = sum(conn.execute(stmt).rowcount for stmt in _RESET_STATEMENTS)

        conn.execute(
            text(
                """
                INSERT INTO daily_counter_resets (id, last_reset_on)
                VALUES (1, :today)
                ON CONFLICT (id) DO UPDATE SET last_reset_on = EXCLUDED.last_reset_on
                """
            ),
            {"today": today},
        )

        return f"reset {cleared} row(s) for {today}"


async def _reset_loop():
    while True:
        try:
            logger.info("Daily counter reset: %s", await asyncio.to_thread(run_daily_reset))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Daily counter reset failed; retrying at the next boundary.")

        await asyncio.sleep(seconds_until_next_midnight())


def start(app):
    app.state.daily_reset_task = asyncio.create_task(_reset_loop())


async def stop(app):
    task = getattr(app.state, "daily_reset_task", None)
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
