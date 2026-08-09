from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    Text,
)

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class MpPoliticalMilestone(Base):
    __tablename__ = "mp_political_milestone"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    position_title = Column(Text, nullable=False)
    position_rank = Column(Integer, nullable=False, default=0)
    election_type = Column(Text)
    entry_mode = Column(Text)
    is_current = Column(Boolean, nullable=False, default=False)
    source = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )
