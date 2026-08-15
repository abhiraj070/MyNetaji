import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
import httpx

from app.Auth.VerifyJWT import get_current_user
from app.api.localisation import HINDI
from app.api.tables import cm, minister
from app.config.settings import get_settings
from app.core.redis import redis_client
from app.db.connect import get_db
from app.schema import TweetRequest

router = APIRouter(tags=["Feeds"])

_settings = get_settings()

X_SEARCH_URL = "https://api.x.com/2/tweets/search/recent"


@router.post("/tweets")
async def get_tweets(request: TweetRequest, db: Session= Depends(get_db), userid: int = Depends(get_current_user)):
    table= request.table
    name= request.name
    if table == "chief_ministers":
        username= db.execute((select(cm.c.x_username).where(cm.c.name==name))).scalar()
    else:
        username= db.execute((select(minister.c.x_username).where(minister.c.minister_name==name))).scalar()

    if not username:
        return {"top_tweets": {}}

    headers={"Authorization": f"Bearer {_settings.BEARER_TOKEN_X}"}
    params = {
        "query": f"@{username} -is:retweet",
        "sort_order": "relevancy",
        "max_results": 10,

        "tweet.fields": (
            "created_at,"
            "public_metrics,"
            "author_id,"
            "attachments,"
            "referenced_tweets"
        ),

        "expansions": (
            "author_id,"
            "attachments.media_keys,"
            "referenced_tweets.id,"
            "referenced_tweets.id.author_id"
        ),

        "user.fields": (
            "id,"
            "name,"
            "username,"
            "profile_image_url,"
            "verified,"
            "verified_type"
        ),

        "media.fields": (
            "media_key,"
            "type,"
            "url,"
            "preview_image_url,"
            "width,"
            "height,"
            "alt_text"
        ),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response= await client.get(X_SEARCH_URL, headers= headers, params= params)
    return {"top_tweets": response.json()}


@router.get("/get-news")
async def get_news(lang: str = "en", userid: int = Depends(get_current_user)):
    key= "hindi_news" if lang == HINDI else "english_news"
    res= await redis_client.get(key)
    try:
        return {"news": json.loads(res) if res else []}
    except json.JSONDecodeError:
        return {"news": []}
