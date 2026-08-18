
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.Auth.VerifyJWT import get_current_user
from app.api.localisation import (
    HINDI,
    MP_NAME_EN,
    localise_points,
    manifesto_columns,
    mp_localised,
    with_mp_hindi,
)
from app.api.tables import manifesto, mp, mp_hindi, mp_milestone, pc
from app.db.connect import get_db
from app.schema import (
    GetMpRequest,
    GetMpTimelineRequest,
    LocationRequest,
    UpdateMemberRequest,
)

router = APIRouter(tags=["MPs"])


@router.post("/get-location")
def get_location(request: LocationRequest, db: Session= Depends(get_db)):

    latitude= request.latitude
    longitude= request.longitude

    user_point= func.ST_SetSRID(
        func.ST_Point(longitude, latitude),
        4326
    )

    lang= request.lang
    mp_name, mp_state, mp_constituency= mp_localised(lang)
    stmt= (select(mp.c.id, mp_name, MP_NAME_EN, mp.c.party, mp.c.criminal_cases,
                  mp.c.education, mp.c.photo_url, mp.c.slap_count, mp.c.rose_count,
                  mp_state, mp_constituency, mp.c.constituency_key,
                  *manifesto_columns(lang))
            .select_from(mp)
            .join(pc, (mp.c.constituency_key==pc.c.constituency_key) & (mp.c.state_key==pc.c.state_key))
            .join(manifesto, mp.c.party==manifesto.c.party, isouter=True)
    )
    if lang == HINDI:
        stmt= stmt.join(mp_hindi, mp.c.id==mp_hindi.c.mp_id, isouter=True)
    stmt= stmt.where(func.ST_Contains(pc.c.geom, user_point))

    final_mp= localise_points(db.execute(stmt).mappings().first(), lang)
    return {"mp": final_mp}


@router.post("/get-mps-by-name")
def get_mp_by_name(request: GetMpRequest, db: Session= Depends(get_db)):
    name= request.name
    mp_id= request.id
    constituency_key= request.constituency_key

    lang= request.lang
    mp_name, mp_state, mp_constituency= mp_localised(lang)
    cols= (mp.c.id, mp_name, MP_NAME_EN, mp.c.party, mp_state, mp.c.state_key,
           mp_constituency, mp.c.constituency_key, mp.c.criminal_cases,
           mp.c.education, mp.c.photo_url, mp.c.slap_count, mp.c.rose_count)
    one= (select(*cols, *manifesto_columns(lang))
            .select_from(mp)
            .join(manifesto, mp.c.party==manifesto.c.party, isouter=True))
    many= select(*cols).select_from(mp)
    if lang == HINDI:
        one= one.join(mp_hindi, mp.c.id==mp_hindi.c.mp_id, isouter=True)
        many= many.join(mp_hindi, mp.c.id==mp_hindi.c.mp_id, isouter=True)

    if mp_id is not None:
        mp_details= db.execute(one.where(mp.c.id==mp_id)).mappings().first()
        return {"mp_details": localise_points(mp_details, lang)}

    if name and constituency_key:
        mp_details= db.execute(
            one.where((mp.c.name==name) & (mp.c.constituency_key==constituency_key))
        ).mappings().first()
        return {"mp_details": localise_points(mp_details, lang)}

    if name:
        matches_name= mp.c.name.ilike(f"%{name}%")
        if lang == HINDI:
            matches_name= matches_name | mp_hindi.c.name_hindi.ilike(f"%{name}%")
        matches= db.execute(
            many.where(matches_name).order_by(mp.c.name).limit(25)
        ).mappings().all()
        return {"mps": matches}

    all_mps= db.execute(many.order_by(mp.c.name)).mappings().all()
    return {"mps": all_mps}


@router.post("/get-mp-timeline")
def get_mp_timeline(request: GetMpTimelineRequest, db: Session= Depends(get_db), userid: int = Depends(get_current_user)):
    stmt= (select(mp_milestone.c.id, mp_milestone.c.start_date, mp_milestone.c.end_date,
                  mp_milestone.c.position_title, mp_milestone.c.position_rank,
                  mp_milestone.c.election_type, mp_milestone.c.entry_mode,
                  mp_milestone.c.is_current, mp_milestone.c.source)
            .where(mp_milestone.c.mp_id==request.id)
            .order_by(mp_milestone.c.position_rank.asc(),
                      mp_milestone.c.start_date.desc().nullslast()))
    timeline= db.execute(stmt).mappings().all()
    return {"timeline": timeline}


@router.get("/get-leaderboard-mp")
def get_leaderboard_mp(offset:int= Query(0,ge=0,le=100),
                       limit: int= Query(10,ge=1,le=100),
                       lang: str= Query("en"),
                       db: Session= Depends(get_db),
                        userid: int = Depends(get_current_user)
):
    mp_name, _mp_state, mp_constituency= mp_localised(lang)
    cols= (mp.c.id, mp_name, MP_NAME_EN, mp.c.party, mp_constituency,
           mp.c.constituency_key, mp.c.photo_url, mp.c.slap_count, mp.c.rose_count)
    slap_toppers= db.execute(
        with_mp_hindi(select(*cols), lang)
                     .order_by(mp.c.slap_count.desc(), mp.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    rose_toppers= db.execute(
        with_mp_hindi(select(*cols), lang)
                     .order_by(mp.c.rose_count.desc(), mp.c.id.asc())
                     .limit(limit)
                     .offset(offset)
    ).mappings().all()
    return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}


@router.patch("/update-member-count")
def update_member_count(request: UpdateMemberRequest, db: Session= Depends(get_db), userid: int = Depends(get_current_user)):
    table= request.table_to_update
    name= request.name_field_to_update
    constituency_key= request.constituency_key
    field= request.field_to_update

    if field not in ("slap_count","rose_count"):
        raise HTTPException(status_code=400, detail=f"Cannot update {field} field")

    member= {"mps": mp}.get(table)
    if member is None:
        raise HTTPException(status_code=400, detail=f"Cannot update table {table}")

    stmt= (update(member)
           .where((member.c.constituency_key==constituency_key) & (member.c.name==name))
           .values({field: member.c[field] + 1})
    )

    result= db.execute(stmt)
    db.commit()
    return {"rows_updated": result.rowcount}
