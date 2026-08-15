from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class CmCriminalCases(Base):
    """One Chief Minister's declared criminal record, from one affidavit.

    Shaped after `MpWealthDeclaration` deliberately — same side-table pattern,
    same MyNeta provenance columns, one row per subject keyed by a unique
    `cm_id` — so the two read as one family rather than as two designs.

    `criminal_cases` is the affidavit's own headline count of pending cases;
    `charges` is the section-by-section breakdown printed beneath it, kept as
    declared rather than re-totalled. The two do not agree by construction and
    are not meant to: one case is routinely charged under several sections, so
    the charge counts sum well past the number of cases.

    A CM with a genuinely clean affidavit is stored with `criminal_cases = 0`
    and an empty `charges` list. That is a claim the affidavit makes; the
    absence of a row is not, and is what the API reports as "not on file".
    """

    __tablename__ = "cm_criminal_cases"

    id = Column(Integer, primary_key=True)
    cm_id = Column(Integer, nullable=False, index=True)
    criminal_cases = Column(Integer)
    charges = Column(JSONB)
    election_year = Column(Integer)
    election_name = Column(Text)
    source = Column(Text)
    source_url = Column(Text)
    myneta_dataset_slug = Column(Text)
    myneta_candidate_id = Column(Text)
    fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )
    __table_args__ = (UniqueConstraint("cm_id", name="uq_cm_criminal_cases_cm"),)
