from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class MpWealthDeclaration(Base):
    """An MP's declared-wealth affidavit, as published by MyNeta (ADR).

    Column names and types deliberately mirror `wealth_declarations` — the
    table that already holds the same figures for Chief Ministers and Union
    Ministers — so the same parser (`app/data_update/journey/myneta.py`) fills
    both and the two can be read with one mental model. The only structural
    difference is the link: this one hangs off `mps.id` rather than
    `politicians.id`, because `politicians` holds no MP rows.

    One row per MP, enforced: the app shows a single current declaration, so a
    second row for the same MP would be an ambiguity rather than extra detail.
    (A `UNIQUE` on `mp_id` is also what makes the ingest safely re-runnable.)

    Every money column is nullable on purpose. MyNeta genuinely omits fields,
    and a NULL says "not declared / not published" while a 0 says "declared as
    zero" — collapsing the two would be a fabrication in the direction that
    flatters. Amounts are whole rupees in BigInteger; nothing is stored as a
    formatted string.

    The foreign key is declared in the migration: `mps` is reflected at runtime
    rather than modelled on this Base, so there is no table object to resolve
    against at import time. It is a real FK in Postgres, ON DELETE CASCADE.
    """

    __tablename__ = "mp_wealth_declaration"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    # Which declaration these numbers belong to. Without the year the figures
    # are unreadable — a 2019 affidavit next to a 2024 one is a different claim.
    election_year = Column(Integer)
    election_name = Column(Text)

    # Provenance, kept so any row can be re-verified against the page it came
    # from. `source` names the publisher; `source_url` is the exact profile.
    source = Column(Text)
    source_url = Column(Text)
    myneta_dataset_slug = Column(Text)
    myneta_candidate_id = Column(Text)

    total_assets = Column(BigInteger)
    total_liabilities = Column(BigInteger)
    movable_assets = Column(BigInteger)
    immovable_assets = Column(BigInteger)

    cash = Column(BigInteger)
    bank_deposits = Column(BigInteger)
    shares_investments = Column(BigInteger)
    mutual_funds = Column(BigInteger)
    jewellery = Column(BigInteger)
    vehicles = Column(BigInteger)
    residential_property = Column(BigInteger)
    commercial_property = Column(BigInteger)
    agricultural_land = Column(BigInteger)
    other_assets = Column(BigInteger)

    # Where the affidavit's own stated subtotal disagrees with the sum of its
    # rows, both are kept and the difference is recorded here rather than
    # quietly reconciled. These are the rows worth a human's eye.
    warnings = Column(ARRAY(Text))

    fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (UniqueConstraint("mp_id", name="uq_mp_wealth_declaration_mp"),)
