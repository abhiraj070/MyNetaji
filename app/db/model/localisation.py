from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
)

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class MpHindi(Base):
    __tablename__ = "mps_hindi"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)
    name = Column(Text)
    state = Column(Text)
    constituency = Column(Text)
    name_hindi = Column(Text)
    state_hindi = Column(Text)
    constituency_hindi = Column(Text)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )
    __table_args__ = (
        UniqueConstraint("mp_id", name="uq_mps_hindi_mp"),
    )
