from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.localisation import CM_NAME_EN, cm_columns
from app.api.tables import cm, pc
from app.db.connect import get_db
from app.schema import GetCmRequest, LocationRequest, UpdateCmRequest

router = APIRouter(tags=["Chief Ministers"])

def _cm_columns(lang):
    return (
        *cm_columns(lang, "name", "state"),
        CM_NAME_EN,
        cm.c.state_key, cm.c.party,
        *cm_columns(lang, "designation"),
        cm.c.photo_url, cm.c.slap_count, cm.c.rose_count,
        *cm_columns(lang, "manifesto_points"),
    )


@router.post("/get-cm-location")
def get_cm_location(request: LocationRequest, db: Session= Depends(get_db)):
    latitude= request.latitude
    longitude= request.longitude
    lang= request.lang

    user_point= func.ST_SetSRID(
        func.ST_Point(longitude, latitude),
        4326
    )
    stmt= (select(*_cm_columns(lang))
            .join(pc, cm.c.state_key==pc.c.state_key)
            .where(func.ST_Contains(pc.c.geom, user_point))
    )

    final_cm= db.execute(stmt).mappings().first()
    return {"cm": final_cm}


@router.post("/get-cm")
def get_cm(request: GetCmRequest, db: Session= Depends(get_db)):
    """One Chief Minister by state, or all of them when no state is given."""
    state_key= request.state_key
    lang= request.lang
    stmt= select(*_cm_columns(lang))

    if not state_key:
        all_cms= db.execute(stmt.order_by(cm.c.state)).mappings().all()
        return {"cms": all_cms}

    final_cm_details= db.execute(stmt.where(cm.c.state_key==state_key)).mappings().first()
    return {"cm_details": final_cm_details}


@router.get("/get-leaderboard-cm")
def get_leaderboard_cm(offset:int= Query(0,ge=0,le=100), limit: int= Query(10,ge=1,le=100), lang: str= Query("en"), db: Session= Depends(get_db)):
    cols= (*cm_columns(lang, "name", "state"), CM_NAME_EN,
           cm.c.state_key, cm.c.party,
           cm.c.photo_url, cm.c.slap_count, cm.c.rose_count)
    slap_toppers= db.execute(
        select(*cols).order_by(cm.c.slap_count.desc(), cm.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    rose_toppers= db.execute(
        select(*cols).order_by(cm.c.rose_count.desc(), cm.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}


@router.patch("/update-cm-count")
def update_cm_count(request: UpdateCmRequest, db: Session= Depends(get_db)):
    """Record a slap or a rose, on both the all-time and the daily tally."""
    field= request.field_to_update
    name= request.name_field_to_update
    state_key= request.state_key
    if field not in ("slap_count", "rose_count"):
        raise HTTPException(status_code=400, detail=f"Cannot update {field} field")

    today_count= "rose_count_today" if field=="rose_count" else "slap_count_today"
    stmt= (update(cm)
            .where((cm.c.state_key==state_key) & (cm.c.name==name))
            .values({
                field: cm.c[field]+1,
                today_count: func.coalesce(cm.c[today_count], 0)+1,
            })
    )

    result= db.execute(stmt)
    db.commit()
    return {"rows_updated": result.rowcount}
