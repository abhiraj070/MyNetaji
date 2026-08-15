from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config.settings import get_settings
from app.tasks import daily_reset
from app.core.schedular import scheduler
from app.core.redis import redis_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.connect import engine
    from app.db.model.feedback import Feedback

    Feedback.__table__.create(bind=engine, checkfirst=True)
    scheduler.start()
    daily_reset.start(app)
    try:
        yield
    finally:
        scheduler.shutdown()
        await redis_client.aclose()
        await daily_reset.stop(app)


app = FastAPI(title="MyNetaji", lifespan=lifespan)
origins = [
    origin.strip()
    for origin in get_settings().CORS_ORIGINS.split(",")
    if origin.strip()
]


# Every route used to carry its own copy of these two `except` clauses — the
# same four lines, twenty-one times over. They live here now, once, with the
# wording unchanged so the `{"detail": …}` bodies clients already parse stay
# identical.
#
# Rollback is not repeated either: `get_db` rolls the session back on its way
# out for any exception, which covers every route that takes it.
#
# The catch-all is a middleware rather than `@app.exception_handler(Exception)`
# on purpose. Starlette runs that handler in `ServerErrorMiddleware`, which
# wraps everything *including* the CORS layer — so its 500 goes out with no
# `Access-Control-Allow-Origin`, and the browser reports a CORS failure instead
# of showing the server's message. Registered before `CORSMiddleware` below,
# this sits inside it and its responses pick the header up on the way out.
@app.middleware("http")
async def catch_unhandled(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:  # noqa: BLE001 — this is the boundary
        return JSONResponse(
            status_code=500, content={"detail": f"Unexpected error: {str(exc)}"}
        )


# A specific class, so Starlette dispatches this one from its inner
# `ExceptionMiddleware`, which is already inside the CORS layer.
@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500, content={"detail": f"Database error: {str(exc)}"}
    )


# Added last so it ends up outermost — `add_middleware` inserts at the front of
# the stack, and CORS has to see every response, error responses included.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.api import user
from app.api import performance
