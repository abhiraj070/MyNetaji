
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.Auth.VerifyJWT import get_current_user
from app.api.localisation import (
    CM_NAME_EN,
    MINISTER_NAME_EN,
    cm_columns,
    minister_columns,
)
from app.api.tables import cm, minister
from app.db.connect import get_db

router = APIRouter(tags=["Highlights"])


def _today(column):
    return func.coalesce(column, 0)


def _highlight(db, cm_count, minister_count, key, lang="en"):
    top_cm = db.execute(
        select(
            *cm_columns(lang, "name", "state"),
            CM_NAME_EN,
            cm.c.state_key,
            cm.c.party,
            cm.c.photo_url,
            cm.c.slap_count,
            cm.c.rose_count,
            cm_count.label("count"),
        )
        .where(cm_count > 0)
        .order_by(cm_count.desc(), cm.c.id.asc())
        .limit(1)
    ).mappings().first()

    top_minister = db.execute(
        select(
            *minister_columns(lang, "minister_name", "party", "ministry"),
            MINISTER_NAME_EN,
            minister.c.photo_url,
            minister.c.slap_count,
            minister.c.rose_count,
            minister_count.label("count"),
        )
        .where(minister_count > 0)
        .order_by(minister_count.desc(), minister.c.id.asc())
        .limit(1)
    ).mappings().first()

    if top_cm is None and top_minister is None:
        return {key: None}
    if top_minister is None:
        winner, tier = top_cm, "cm"
    elif top_cm is None:
        winner, tier = top_minister, "minister"
    elif top_cm["count"] >= top_minister["count"]:
        winner, tier = top_cm, "cm"
    else:
        winner, tier = top_minister, "minister"

    return {key: {**dict(winner), "tier": tier}}


@router.get("/most-slapped")
def get_most_slapped(lang: str = Query("en"), db: Session = Depends(get_db), userid: int = Depends(get_current_user)):
    return _highlight(
        db,
        _today(cm.c.slap_count_today),
        _today(minister.c.slap_count_today),
        "most_slapped",
        lang,
    )


@router.get("/most-roasted")
def get_most_roasted(lang: str = Query("en"), db: Session = Depends(get_db), userid: int = Depends(get_current_user)):
    return _highlight(
        db,
        _today(cm.c.rose_count_today),
        _today(minister.c.rose_count_today),
        "most_roasted",
        lang,
    )


@router.get("/most-judged")
def get_most_judged(lang: str = Query("en"), db: Session = Depends(get_db), userid: int = Depends(get_current_user)):
    return _highlight(
        db,
        _today(cm.c.slap_count_today) + _today(cm.c.rose_count_today),
        _today(minister.c.slap_count_today) + _today(minister.c.rose_count_today),
        "most_judged",
        lang,
    )
