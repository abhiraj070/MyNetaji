"""MP Performance: MPLADS development work, parliamentary activity, promises.

Nine tables rather than one wide `mp_performance`, because the four subjects
have nothing in common but the MP: MPLADS funds are per tenure, works are per
project, questions and debates are per event, and benchmarks belong to no MP at
all. Flattening them would mean a row shape that is mostly NULL whichever fact
it carries.

Every table that belongs to an MP carries `mp_id` and — declared in the
migration, per this repo's convention (see `alembic/env.py`) — a foreign key
onto the reflected `mps` table.

Two rules run through all of it:

  * A missing figure stays NULL. MPLADS not publishing a released amount and an
    MP being released nothing are different claims, and zero says the second.
  * Every fact keeps the URL it came from, so the UI can always answer "says
    who?" without a lookup table in the frontend.

Each table has a natural key that the ingestion upserts on, so a re-run
updates in place instead of duplicating. Where the natural key would be a long
free-text field (question titles, promise text) a `content_hash` stands in.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Index,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


# Money is stored as Numeric, not the BigInteger used by `mp_wealth_declaration`:
# MyNeta affidavit totals are whole rupees, whereas MPLADS publishes paise
# (₹9,76,436.00), and rounding a sanction figure to fit the column would be a
# silent edit of a government number.
_MONEY = Numeric(18, 2)
# Percentages: 100.00 fits, and so does a source that reports 0.
_PERCENT = Numeric(6, 2)


class MpPerformanceSource(Base):
    """The registry of where performance data comes from.

    One row per publisher, referenced by every fact table. The per-row
    `source_url` on those tables still points at the exact page or endpoint —
    this table carries what is true of the publisher as a whole (who they are,
    whether they are the government or a third party) so the UI can label a
    figure without hardcoding a list of source names.
    """

    __tablename__ = "mp_performance_sources"

    id = Column(Integer, primary_key=True)
    source_key = Column(Text, nullable=False)
    name = Column(Text, nullable=False)
    publisher = Column(Text)
    # 'government' or 'civil_society' — the distinction the reader needs when
    # an official figure and an aggregator's figure disagree.
    source_type = Column(Text)
    homepage_url = Column(Text)
    notes = Column(Text)
    last_fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("source_key", name="uq_mp_performance_sources_key"),
    )


class MpMpladsFund(Base):
    """MPLADS money at MP level, as MPLADS publishes it.

    Note what this is not: MPLADS is a constituency development budget spent by
    the district authority on works the MP recommends. None of these figures is
    income, and the API and UI say so wherever they are shown.

    `period_label` rather than `financial_year` is what makes a row unique. The
    MPLADS eSAKSHI dashboard reports per tenure, not per financial year, so the
    honest key is a label ('18th Lok Sabha') and `financial_year` stays NULL
    until a source publishes a year-wise split. A nullable column cannot carry
    the uniqueness itself — Postgres treats NULLs as distinct, so re-running
    the importer would insert a second row every time.
    """

    __tablename__ = "mp_mplads_funds"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text)
    tenure = Column(Text)
    period_label = Column(Text, nullable=False)
    financial_year = Column(Text)
    period_start_date = Column(Date)
    period_end_date = Column(Date)

    # The MP's entitlement for the tenure — the ceiling, not a transfer.
    allocated_amount = Column(_MONEY)
    # Left NULL deliberately: under the eSAKSHI fund-flow (from 1 Apr 2023)
    # money is paid centrally to vendors, and no per-MP "released" figure is
    # published. Zero would assert nothing was released, which is false.
    funds_released = Column(_MONEY)
    funds_sanctioned = Column(_MONEY)
    funds_utilised = Column(_MONEY)
    recommended_amount = Column(_MONEY)
    calamity_amount = Column(_MONEY)
    unspent_amount = Column(_MONEY)
    utilisation_pct = Column(_PERCENT)

    works_recommended_count = Column(Integer)
    works_sanctioned_count = Column(Integer)
    works_completed_count = Column(Integer)

    # Which columns above this importer calculated rather than read. The API
    # passes it through so a percentage can show its own arithmetic.
    derived_fields = Column(ARRAY(Text))

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    data_as_of = Column(Date)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "house", "tenure", "period_label",
            name="uq_mp_mplads_funds_period",
        ),
    )


class MpMpladsWork(Base):
    """One recommended MPLADS work — the project-level record.

    `source_work_id` is MPLADS's own recommendation id and is unique across the
    scheme, which makes it the natural key: re-running the importer updates the
    same row even if the work has since moved from "Pending for Sanction" to
    "Work Completed", and even if the MP match were re-derived.

    `work_status` keeps MPLADS's own wording. `status_group` is this repo's
    three-way reduction of it for the UI filter — stored rather than computed
    per request so the mapping lives in one documented place.
    """

    __tablename__ = "mp_mplads_works"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    source_work_id = Column(Text, nullable=False)
    external_work_id = Column(Text)
    letter_no = Column(Text)

    work_name = Column(Text, nullable=False)
    description = Column(Text)
    sector = Column(Text)
    sub_sector = Column(Text)

    location = Column(Text)
    state = Column(Text)
    district = Column(Text)
    constituency = Column(Text)
    constituency_id = Column(Integer)
    implementing_agency = Column(Text)
    vendor_name = Column(Text)

    recommended_amount = Column(_MONEY)
    sanctioned_amount = Column(_MONEY)
    expenditure_amount = Column(_MONEY)
    remaining_amount = Column(_MONEY)

    work_status = Column(Text)
    status_group = Column(Text, index=True)

    recommended_date = Column(Date)
    sanction_date = Column(Date)
    work_start_date = Column(Date)
    completion_date = Column(Date)

    financial_year = Column(Text)
    tenure = Column(Text)
    house = Column(Text)
    payment_count = Column(Integer)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("source_work_id", name="uq_mp_mplads_works_source_work_id"),
        # The list view is always "this MP's works, newest first", optionally
        # narrowed to one status.
        Index("ix_mp_mplads_works_mp_status", "mp_id", "status_group"),
        Index("ix_mp_mplads_works_mp_recommended_date", "mp_id", "recommended_date"),
    )


class MpParliamentaryPerformance(Base):
    """Per-term parliamentary totals for one MP.

    Counts are stored as published rather than derived from the per-event
    tables below, because the two can legitimately disagree: a source may
    report 69 questions while listing 65, and silently substituting the listed
    number would hide that.
    """

    __tablename__ = "mp_parliamentary_performance"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text, nullable=False)
    term = Column(Text, nullable=False)
    period_start_date = Column(Date)
    period_end_date = Column(Date)

    attendance_pct = Column(_PERCENT)
    debates_count = Column(Integer)
    questions_count = Column(Integer)
    starred_questions_count = Column(Integer)
    unstarred_questions_count = Column(Integer)
    private_member_bills_count = Column(Integer)
    bills_participated_count = Column(Integer)
    committees_count = Column(Integer)
    issues_raised_count = Column(Integer)

    derived_fields = Column(ARRAY(Text))

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    data_as_of = Column(Date)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "house", "term", name="uq_mp_parliamentary_performance_term"
        ),
    )


class MpParliamentarySession(Base):
    """Session-wise attendance for one MP.

    `session_order` is the position the source printed the session in, kept so
    the UI can restore that order — the names ("Monsoon Session 2026") sort
    neither alphabetically nor chronologically.
    """

    __tablename__ = "mp_parliamentary_sessions"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text)
    term = Column(Text)
    session_name = Column(Text, nullable=False)
    session_order = Column(Integer)
    session_start_date = Column(Date)
    session_end_date = Column(Date)

    attendance_pct = Column(_PERCENT)
    sittings_attended = Column(Integer)
    sittings_total = Column(Integer)
    questions_count = Column(Integer)
    debates_count = Column(Integer)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "term", "session_name",
            name="uq_mp_parliamentary_sessions_session",
        ),
    )


class MpParliamentaryQuestion(Base):
    """One question asked in the House.

    Keyed on `content_hash` (mp, date, title, type) rather than the fields
    themselves: an MP can ask two questions on one day, titles run long, and a
    composite text index on a table of ~60k rows is not worth the bytes.
    """

    __tablename__ = "mp_parliamentary_questions"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text)
    term = Column(Text)
    session_name = Column(Text)
    asked_on = Column(Date)
    title = Column(Text, nullable=False)
    # 'Starred' / 'Unstarred', in the source's own wording.
    question_type = Column(Text, index=True)
    ministry = Column(Text)
    subject_category = Column(Text)

    content_hash = Column(Text, nullable=False)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "content_hash", name="uq_mp_parliamentary_questions_content"
        ),
        Index("ix_mp_parliamentary_questions_mp_date", "mp_id", "asked_on"),
    )


class MpParliamentaryDebate(Base):
    """One debate an MP took part in.

    Bills are not a separate table: a "bill participation" is a debate whose
    type is a bill category, so it is the same row with `is_bill` set. The API
    splits them apart for the frontend.
    """

    __tablename__ = "mp_parliamentary_debates"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text)
    term = Column(Text)
    session_name = Column(Text)
    debate_date = Column(Date)
    title = Column(Text, nullable=False)
    debate_type = Column(Text, index=True)
    is_bill = Column(Boolean)
    is_private_member_bill = Column(Boolean)

    content_hash = Column(Text, nullable=False)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "content_hash", name="uq_mp_parliamentary_debates_content"
        ),
        Index("ix_mp_parliamentary_debates_mp_date", "mp_id", "debate_date"),
    )


class MpParliamentaryCommittee(Base):
    """A committee an MP sits on."""

    __tablename__ = "mp_parliamentary_committees"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    house = Column(Text)
    term = Column(Text)
    committee_name = Column(Text, nullable=False)
    # 'Standing', 'Departmentally Related Standing', 'Joint', …
    committee_type = Column(Text)
    # 'Member' / 'Chairperson'.
    role = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    is_current = Column(Boolean)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "mp_id", "term", "committee_name",
            name="uq_mp_parliamentary_committees_committee",
        ),
    )


class MpPromise(Base):
    """A public commitment attributed to an MP, and the evidence for its status.

    `status` is constrained to 'completed' / 'in_progress' / 'not_started' /
    'unverified', and the CHECK in the migration additionally refuses any of
    the first three without `evidence_url` — whether a politician kept a
    promise is exactly the claim that must never be inferred, so the schema
    itself declines to hold an unevidenced verdict. 'unverified' is the only
    status a row may carry on its own.
    """

    __tablename__ = "mp_promises"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    promise_text = Column(Text, nullable=False)
    category = Column(Text, index=True)
    status = Column(Text, nullable=False, default="unverified")
    made_on = Column(Date)
    # Where it was said: 'election manifesto', 'Lok Sabha reply', …
    context = Column(Text)
    target_date = Column(Date)

    evidence = Column(Text)
    evidence_url = Column(Text)
    verified_on = Column(Date)
    verified_by = Column(Text)

    content_hash = Column(Text, nullable=False)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("mp_id", "content_hash", name="uq_mp_promises_content"),
    )


class MpPerformanceBenchmark(Base):
    """A published average an MP's number can be read against.

    No `mp_id`: a benchmark belongs to a population, not a person. `scope_value`
    is NOT NULL with 'INDIA' standing for the national scope, so the unique key
    works — the same reason `mp_mplads_funds` uses `period_label`.

    Only benchmarks a source states outright are stored. Computing "the average
    of the MPs we happen to have data for" would produce a number that looks
    official and is not.
    """

    __tablename__ = "mp_performance_benchmarks"

    id = Column(Integer, primary_key=True)

    # 'attendance_pct', 'debates_count', 'questions_count',
    # 'private_member_bills_count'.
    metric = Column(Text, nullable=False)
    # 'national' or 'state'.
    scope = Column(Text, nullable=False)
    # State key for a state scope; 'INDIA' for national.
    scope_value = Column(Text, nullable=False)
    house = Column(Text, nullable=False)
    term = Column(Text, nullable=False)

    value = Column(Numeric(12, 2))
    sample_size = Column(Integer)
    period_start_date = Column(Date)
    period_end_date = Column(Date)

    source_id = Column(Integer, index=True)
    source_name = Column(Text)
    source_url = Column(Text)
    last_verified_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "metric", "scope", "scope_value", "house", "term",
            name="uq_mp_performance_benchmarks_metric",
        ),
    )
