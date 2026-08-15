from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

#print(origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.api import user
from app.api import performance
