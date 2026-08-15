from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.db.connect import get_db

_settings = get_settings()

router = APIRouter(tags=["Metadata"])
MYNETA = {
    "source": "MyNeta / ADR",
    "source_detail": "MyNeta — Association for Democratic Reforms",
    "source_url": "https://myneta.info",
}

_FRESHNESS = text("""
    select
        (select max(fetched_at) from mp_wealth_declaration) as mp,
        greatest(
            (select max(fetched_at) from cm_criminal_cases),
            (select max(w.fetched_at)
               from wealth_declarations w
               join politicians p on p.id = w.politician_id
              where p.subject_type = 'cm')
        ) as cm,
        (select max(w.fetched_at)
           from wealth_declarations w
           join politicians p on p.id = w.politician_id
          where p.subject_type = 'union_minister') as minister
""")


@router.get("/get-data-freshness")
def get_data_freshness(db: Session = Depends(get_db)):
    row = db.execute(_FRESHNESS).mappings().first() or {}
    declared = _declared_date()

    datasets = {
        tier: {"tier": tier, "data_updated_at": declared or stamp, **MYNETA}
        for tier, stamp in row.items()
        if declared or stamp is not None
    }
    return {"datasets": datasets}


def _declared_date():
    raw = (_settings.DATA_UPDATED_AT or "").strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
