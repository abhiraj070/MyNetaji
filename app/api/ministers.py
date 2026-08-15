from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.localisation import MINISTER_NAME_EN, minister_columns
from app.api.tables import minister
from app.db.connect import get_db
from app.schema import GetMinisterRequest, MinistrySearchRequest, UpdateMinistryRequest

router = APIRouter(tags=["Union Ministers"])


@router.post("/get-minister")
def get_minister(request: MinistrySearchRequest, db: Session= Depends(get_db)):
    minister_name= request.name
    lang= request.lang
    stmt= select(
        *minister_columns(lang, "ministry", "minister_name", "party"),
        MINISTER_NAME_EN,
        minister.c.photo_url, minister.c.slap_count, minister.c.rose_count,
        *minister_columns(lang, "manifesto_points"),
    )

    if not minister_name:
        all_ministers= db.execute(stmt.order_by(minister.c.ministry)).mappings().all()
        return {"ministers": all_ministers}

    final_minister_details= db.execute(stmt.where(minister.c.minister_name==minister_name)).mappings().first()
    return {"minister_details": final_minister_details}


@router.post("/get-ministers-by-name")
def get_minister_by_name(request: GetMinisterRequest, db: Session= Depends(get_db)):
    name= request.name
    ministry= request.ministry
    stmt= (
        select(minister.c.ministry, minister.c.minister_name, minister.c.party,
               minister.c.photo_url, minister.c.slap_count, minister.c.rose_count,
               minister.c.manifesto_points)
        .where((minister.c.minister_name==name) & (minister.c.ministry==ministry))
    )
    minister_details= db.execute(stmt).mappings().first()
    return {"minister_details": minister_details}


@router.get("/get-leaderboard-minister")
def get_leaderboard_minister(limit:int= Query(10,ge=1,le=100), offset: int= Query(0,ge=0,le=100), lang: str= Query("en"), db: Session= Depends(get_db)):
    cols= (*minister_columns(lang, "minister_name", "party", "ministry"),
           MINISTER_NAME_EN,
           minister.c.photo_url, minister.c.slap_count, minister.c.rose_count)
    slap_toppers= db.execute(
        select(*cols).order_by(minister.c.slap_count.desc(), minister.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    rose_toppers= db.execute(
        select(*cols).order_by(minister.c.rose_count.desc(), minister.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}


@router.patch("/update-ministry-count")
def update_ministry_count(request: UpdateMinistryRequest, db: Session= Depends(get_db)):
    field= request.field_to_update
    name= request.name_field_to_update
    ministry_name= request.ministry_name
    if field not in ("slap_count", "rose_count"):
        raise HTTPException(status_code=400, detail=f"Cannot update {field} field")

    today_count= "rose_count_today" if field=="rose_count" else "slap_count_today"
    stmt= (update(minister)
            .where((minister.c.ministry==ministry_name) & (minister.c.minister_name==name))
            .values({
                field: minister.c[field]+1,
                today_count: func.coalesce(minister.c[today_count], 0)+1,
            })
    )

    result= db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Minister not found")
    db.commit()
    return {"rows_updated": result.rowcount}
