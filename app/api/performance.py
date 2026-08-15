from fastapi import Depends, HTTPException
from sqlalchemy import MetaData, Table, and_, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.connect import engine, get_db
from app.main import app
from app.schema import GetMpPerformanceListRequest, GetMpPerformanceRequest

metadata = MetaData()
mp = Table("mps", metadata, autoload_with=engine)
mp_wealth = Table("mp_wealth_declaration", metadata, autoload_with=engine)
mplads_funds = Table("mp_mplads_funds", metadata, autoload_with=engine)
mplads_works = Table("mp_mplads_works", metadata, autoload_with=engine)
parl_performance = Table("mp_parliamentary_performance", metadata, autoload_with=engine)
parl_sessions = Table("mp_parliamentary_sessions", metadata, autoload_with=engine)
parl_questions = Table("mp_parliamentary_questions", metadata, autoload_with=engine)
parl_debates = Table("mp_parliamentary_debates", metadata, autoload_with=engine)
parl_committees = Table("mp_parliamentary_committees", metadata, autoload_with=engine)
promises = Table("mp_promises", metadata, autoload_with=engine)
benchmarks = Table("mp_performance_benchmarks", metadata, autoload_with=engine)

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20
STATUS_GROUPS = ("completed", "ongoing", "pending")
MPLADS_NOTE = (
    "MPLADS is a constituency development budget. Funds are released to the "
    "district authority and spent on works the MP recommends; none of it is "
    "money received by the MP."
)


def paging(request: GetMpPerformanceListRequest):
    page = max(1, request.page or 1)
    size = min(MAX_PAGE_SIZE, max(1, request.page_size or DEFAULT_PAGE_SIZE))
    return page, size, (page - 1) * size


def metric(value, *, source=None, url=None, as_of=None, derived=False, formula=None):
    if value is None and source is None:
        return None
    return {
        "value": value,
        "source": {"name": source, "url": url, "asOf": as_of} if source else None,
        "derived": derived,
        "formula": formula,
    }


def _row(db, stmt):
    return db.execute(stmt).mappings().first()


def _rows(db, stmt):
    return db.execute(stmt).mappings().all()

_TOTAL = "__total"


def _paged(db, stmt, *, page, size):
    rows = _rows(db, stmt.add_columns(func.count().over().label(_TOTAL))
                 .limit(size).offset((page - 1) * size))
    total = rows[0][_TOTAL] if rows else 0
    items = [{key: value for key, value in row.items() if key != _TOTAL}
             for row in rows]
    return {
        "items": items,
        "page": page,
        "pageSize": size,
        "total": total,
        "hasMore": page * size < total,
    }


def development_section(db, mp_id):
    funds = _row(db, select(mplads_funds).where(mplads_funds.c.mp_id == mp_id)
                 .order_by(mplads_funds.c.period_label))

    totals = _row(db, select(
        func.count().label("total"),
        *[
            func.count().filter(mplads_works.c.status_group == group).label(group)
            for group in STATUS_GROUPS
        ],
        func.count().filter(mplads_works.c.status_group.is_(None)).label("unclassified"),
        func.sum(mplads_works.c.recommended_amount).label("recommended"),
        func.sum(mplads_works.c.sanctioned_amount).label("sanctioned"),
        func.sum(mplads_works.c.expenditure_amount).label("expenditure"),
    ).where(mplads_works.c.mp_id == mp_id))

    total_works = (totals or {}).get("total") or 0
    completed = (totals or {}).get("completed") or 0
    completion_rate = round(completed / total_works * 100, 2) if total_works else None

    source_name = (funds or {}).get("source_name")
    source_url = (funds or {}).get("source_url")
    as_of = (funds or {}).get("last_verified_at")
    derived_fields = set((funds or {}).get("derived_fields") or [])

    def fund_metric(field, formula=None):
        if not funds:
            return None
        return metric(
            funds[field], source=source_name, url=source_url, as_of=as_of,
            derived=field in derived_fields,
            formula=formula if field in derived_fields else None,
        )

    return {
        "funds": {
            "period": (funds or {}).get("period_label"),
            "financialYear": (funds or {}).get("financial_year"),
            "tenure": (funds or {}).get("tenure"),
            "allocated": fund_metric("allocated_amount"),
            # NULL by design — see the note this carries.
            "released": fund_metric("funds_released"),
            "sanctioned": fund_metric("funds_sanctioned"),
            "utilised": fund_metric("funds_utilised"),
            "recommended": fund_metric("recommended_amount"),
            "unspent": fund_metric(
                "unspent_amount", "Allocated limit minus expenditure to date."
            ),
            "utilisationRate": fund_metric(
                "utilisation_pct",
                "Expenditure on completed and ongoing works, divided by the "
                "allocated limit for the tenure, as a percentage.",
            ),
            "calamity": fund_metric("calamity_amount"),
            "note": MPLADS_NOTE,
        } if funds else None,
        "summary": {
            "totalWorks": total_works,
            "completed": completed,
            "ongoing": (totals or {}).get("ongoing") or 0,
            "pending": (totals or {}).get("pending") or 0,
            "unclassified": (totals or {}).get("unclassified") or 0,
            "completionRate": metric(
                completion_rate, source=source_name, url=source_url, as_of=as_of,
                derived=True,
                formula="Works marked completed, divided by all works "
                        "recommended in this tenure, as a percentage.",
            ),
            "recommendedAmount": (totals or {}).get("recommended"),
            "sanctionedAmount": (totals or {}).get("sanctioned"),
            "expenditureAmount": (totals or {}).get("expenditure"),
            "note": MPLADS_NOTE,
        },
        "works": works_page(db, mp_id, page=1, size=DEFAULT_PAGE_SIZE, status=None),
    }


def works_page(db, mp_id, *, page, size, status):
    where = [mplads_works.c.mp_id == mp_id]
    if status in STATUS_GROUPS:
        where.append(mplads_works.c.status_group == status)

    return _paged(db, select(
        mplads_works.c.id, mplads_works.c.work_name, mplads_works.c.description,
        mplads_works.c.sector, mplads_works.c.sub_sector, mplads_works.c.location,
        mplads_works.c.district, mplads_works.c.constituency, mplads_works.c.state,
        mplads_works.c.implementing_agency, mplads_works.c.recommended_amount,
        mplads_works.c.sanctioned_amount, mplads_works.c.expenditure_amount,
        mplads_works.c.remaining_amount, mplads_works.c.work_status,
        mplads_works.c.status_group, mplads_works.c.recommended_date,
        mplads_works.c.sanction_date, mplads_works.c.work_start_date,
        mplads_works.c.completion_date, mplads_works.c.financial_year,
        mplads_works.c.source_name, mplads_works.c.source_url,
    ).where(and_(*where)).order_by(
        mplads_works.c.recommended_date.desc().nullslast(),
        mplads_works.c.id.desc(),
    ), page=page, size=size)


def parliament_section(db, mp_id, state_key):
    record = _row(db, select(parl_performance)
                  .where(parl_performance.c.mp_id == mp_id)
                  .order_by(parl_performance.c.period_end_date.desc().nullslast()))

    source_name = (record or {}).get("source_name")
    source_url = (record or {}).get("source_url")
    as_of = (record or {}).get("data_as_of")
    derived_fields = set((record or {}).get("derived_fields") or [])

    def field(name, formula=None):
        if not record:
            return None
        return metric(
            record[name], source=source_name, url=source_url, as_of=as_of,
            derived=name in derived_fields,
            formula=formula if name in derived_fields else None,
        )

    sessions = _rows(db, select(
        parl_sessions.c.session_name, parl_sessions.c.session_order,
        parl_sessions.c.attendance_pct, parl_sessions.c.questions_count,
        parl_sessions.c.debates_count, parl_sessions.c.source_name,
        parl_sessions.c.source_url,
    ).where(parl_sessions.c.mp_id == mp_id).order_by(parl_sessions.c.session_order))

    published_averages = load_benchmarks(db, record, state_key)

    committees = _rows(db, select(
        parl_committees.c.committee_name, parl_committees.c.committee_type,
        parl_committees.c.role, parl_committees.c.start_date,
        parl_committees.c.end_date, parl_committees.c.is_current,
        parl_committees.c.source_name, parl_committees.c.source_url,
    ).where(parl_committees.c.mp_id == mp_id).order_by(parl_committees.c.committee_name))

    return {
        "term": (record or {}).get("term"),
        "house": (record or {}).get("house"),
        "periodStart": (record or {}).get("period_start_date"),
        "periodEnd": (record or {}).get("period_end_date"),
        "attendance": {
            "overall": field("attendance_pct"),
            "sessions": [dict(row) for row in sessions],
            "comparisons": comparisons_for(published_averages, "attendance_pct"),
        },
        "questions": {
            "total": field("questions_count"),
            "starred": field(
                "starred_questions_count",
                "Counted from the questions the source lists for this MP.",
            ),
            "unstarred": field(
                "unstarred_questions_count",
                "Counted from the questions the source lists for this MP.",
            ),
            "comparisons": comparisons_for(published_averages, "questions_count"),
            "items": questions_page(db, mp_id, page=1, size=DEFAULT_PAGE_SIZE,
                                    question_type=None),
        },
        "debates": {
            "total": field("debates_count"),
            "comparisons": comparisons_for(published_averages, "debates_count"),
            "items": debates_page(db, mp_id, page=1, size=DEFAULT_PAGE_SIZE),
        },
        "bills": {
            "privateMemberBills": field("private_member_bills_count"),
            "participated": field(
                "bills_participated_count",
                "Debates the source classifies as bill debates.",
            ),
            "comparisons": comparisons_for(
                published_averages, "private_member_bills_count"
            ),
        },
        "committees": {
            "count": field("committees_count"),
            "items": [dict(row) for row in committees],
        },
    }


def load_benchmarks(db, record, state_key):
    if not record:
        return {}

    scope_values = ["INDIA"] + ([state_key] if state_key else [])
    rows = _rows(db, select(
        benchmarks.c.metric, benchmarks.c.scope, benchmarks.c.scope_value,
        benchmarks.c.value, benchmarks.c.period_start_date,
        benchmarks.c.period_end_date, benchmarks.c.source_name,
        benchmarks.c.source_url,
    ).where(and_(
        benchmarks.c.house == record["house"],
        benchmarks.c.term == record["term"],
        benchmarks.c.scope_value.in_(scope_values),
    )))

    by_metric = {}
    for row in rows:
        by_metric.setdefault(row["metric"], []).append({
            "scope": row["scope"],
            "scopeValue": row["scope_value"],
            "average": row["value"],
            "periodStart": row["period_start_date"],
            "periodEnd": row["period_end_date"],
            "source": {"name": row["source_name"], "url": row["source_url"]},
        })
    return by_metric


def comparisons_for(by_metric, metric_name):
    return by_metric.get(metric_name, [])


def questions_page(db, mp_id, *, page, size, question_type):
    where = [parl_questions.c.mp_id == mp_id]
    if question_type:
        where.append(func.lower(parl_questions.c.question_type)
                     == question_type.strip().lower())

    return _paged(db, select(
        parl_questions.c.id, parl_questions.c.asked_on, parl_questions.c.title,
        parl_questions.c.question_type, parl_questions.c.ministry,
        parl_questions.c.session_name, parl_questions.c.source_name,
        parl_questions.c.source_url,
    ).where(and_(*where)).order_by(
        parl_questions.c.asked_on.desc().nullslast(), parl_questions.c.id.desc()
    ), page=page, size=size)


def debates_page(db, mp_id, *, page, size):
    return _paged(db, select(
        parl_debates.c.id, parl_debates.c.debate_date, parl_debates.c.title,
        parl_debates.c.debate_type, parl_debates.c.is_bill,
        parl_debates.c.is_private_member_bill, parl_debates.c.session_name,
        parl_debates.c.source_name, parl_debates.c.source_url,
    ).where(parl_debates.c.mp_id == mp_id).order_by(
        parl_debates.c.debate_date.desc().nullslast(), parl_debates.c.id.desc()
    ), page=page, size=size)


def promises_section(db, mp_id):
    rows = _rows(db, select(
        promises.c.id, promises.c.promise_text, promises.c.category,
        promises.c.status, promises.c.made_on, promises.c.context,
        promises.c.target_date, promises.c.evidence, promises.c.evidence_url,
        promises.c.verified_on, promises.c.verified_by, promises.c.source_name,
        promises.c.source_url,
    ).where(promises.c.mp_id == mp_id).order_by(
        promises.c.made_on.desc().nullslast(), promises.c.id.desc()
    ))
    def tally(status):
        return sum(1 for row in rows if row["status"] == status)

    return {
        "summary": {
            "total": len(rows),
            "completed": tally("completed"),
            "inProgress": tally("in_progress"),
            "notStarted": tally("not_started"),
            "unverified": tally("unverified"),
        },
        "items": [dict(row) for row in rows],
    }


def transparency_section(db, mp_id):
    row = _row(db, select(
        mp.c.criminal_cases, mp.c.education, mp.c.assets,
        mp_wealth.c.election_year, mp_wealth.c.election_name,
        mp_wealth.c.total_assets, mp_wealth.c.total_liabilities,
        mp_wealth.c.movable_assets, mp_wealth.c.immovable_assets,
        mp_wealth.c.source.label("wealth_source"),
        mp_wealth.c.source_url.label("wealth_source_url"),
    ).select_from(
        mp.join(mp_wealth, mp.c.id == mp_wealth.c.mp_id, isouter=True)
    ).where(mp.c.id == mp_id))

    if not row:
        return None

    return {
        "criminalCases": row["criminal_cases"],
        "education": row["education"],
        "declaredAssets": row["total_assets"],
        "declaredLiabilities": row["total_liabilities"],
        "movableAssets": row["movable_assets"],
        "immovableAssets": row["immovable_assets"],
        "electionYear": row["election_year"],
        "electionName": row["election_name"],
        "source": {
            "name": row["wealth_source"],
            "url": row["wealth_source_url"],
        } if row["wealth_source"] else None,
        "note": (
            "Declared in the candidate's election affidavit. Assets and "
            "liabilities are as declared at the time of that election, not a "
            "current valuation."
        ),
    }


@app.post("/get-mp-performance")
def get_mp_performance(request: GetMpPerformanceRequest, db: Session = Depends(get_db)):
    try:
        person = _row(db, select(mp.c.id, mp.c.name, mp.c.state, mp.c.state_key,
                                 mp.c.constituency, mp.c.party)
                      .where(mp.c.id == request.id))
        if person is None:
            raise HTTPException(status_code=404, detail="MP not found")

        return {"performance": {
            "mp": {
                "id": person["id"], "name": person["name"],
                "state": person["state"], "constituency": person["constituency"],
                "party": person["party"],
            },
            "development": development_section(db, request.id),
            "parliament": parliament_section(db, request.id, person["state_key"]),
            "promises": promises_section(db, request.id),
            "transparency": transparency_section(db, request.id),
        }}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-mp-performance-works")
def get_mp_performance_works(request: GetMpPerformanceListRequest,
                             db: Session = Depends(get_db)):
    try:
        page, size, _ = paging(request)
        return {"works": works_page(db, request.id, page=page, size=size,
                                    status=request.status)}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-mp-performance-questions")
def get_mp_performance_questions(request: GetMpPerformanceListRequest,
                                 db: Session = Depends(get_db)):
    try:
        page, size, _ = paging(request)
        return {"questions": questions_page(db, request.id, page=page, size=size,
                                            question_type=request.question_type)}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-mp-performance-debates")
def get_mp_performance_debates(request: GetMpPerformanceListRequest,
                               db: Session = Depends(get_db)):
    try:
        page, size, _ = paging(request)
        return {"debates": debates_page(db, request.id, page=page, size=size)}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
