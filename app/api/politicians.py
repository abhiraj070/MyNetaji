
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.Auth.VerifyJWT import get_current_user
from app.api.localisation import milestone_columns
from app.api.tables import milestones, politician, wealth
from app.db.connect import get_db
from app.schema import GetAssetsRequest

router = APIRouter(tags=["Politician records"])


@router.post("/get-assets")
def get_assets(request: GetAssetsRequest, db: Session = Depends(get_db), userid: int = Depends(get_current_user)):
    name= request.name
    designation= request.designation
    stmt1= (select(politician.c.id).where((politician.c.canonical_name==name) & (politician.c.subject_type==designation)))
    pol_id= db.execute(stmt1).scalar()
    stmt2= (select(wealth.c.election_year, wealth.c.election_name, wealth.c.source_url, wealth.c.total_assets,
                   wealth.c.total_liabilities, wealth.c.movable_assets, wealth.c.immovable_assets, wealth.c.cash,
                   wealth.c.bank_deposits, wealth.c.shares_investments, wealth.c.mutual_funds, wealth.c.jewellery,
                   wealth.c.vehicles, wealth.c.residential_property, wealth.c.commercial_property, wealth.c.agricultural_land,
                   wealth.c.other_assets).where(wealth.c.politician_id==pol_id))
    result= db.execute(stmt2).mappings().all()
    return {"top_assets": result}


@router.post("/get-timeline")
def get_timeline(request: GetAssetsRequest, db: Session = Depends(get_db), userid: int = Depends(get_current_user)):
    name= request.name
    designation= request.designation
    lang= request.lang
    stmt1= (select(milestones.c.year, milestones.c.start_date, milestones.c.end_date,
                *milestone_columns(lang, "position_title"),
                milestones.c.position_rank, milestones.c.party, milestones.c.entry_mode, milestones.c.is_current,
                milestones.c.sources, wealth.c.total_assets)
                .join(politician, politician.c.id == milestones.c.politician_id)
                .outerjoin(wealth, wealth.c.milestone_id == milestones.c.id)
                .where((politician.c.subject_type==designation) & (politician.c.canonical_name==name)))
    timeline= db.execute(stmt1).mappings().all()
    return {"timeline": timeline}
