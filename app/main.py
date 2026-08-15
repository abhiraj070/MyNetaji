from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api import (
    chief_ministers,
    feedback,
    feeds,
    highlights,
    ministers,
    mps,
    performance,
    politicians,
)
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
@app.middleware("http")
async def catch_unhandled(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        return JSONResponse(
            status_code=500, content={"detail": f"Unexpected error: {str(exc)}"}
        )

@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500, content={"detail": f"Database error: {str(exc)}"}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (
    mps,
    chief_ministers,
    ministers,
    highlights,
    politicians,
    performance,
    feeds,
    feedback,
):
    app.include_router(module.router)
