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
    __tablename__ = "mp_wealth_declaration"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)
    election_year = Column(Integer)
    election_name = Column(Text)
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
    warnings = Column(ARRAY(Text))
    fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )
    __table_args__ = (UniqueConstraint("mp_id", name="uq_mp_wealth_declaration_mp"),)
