
from sqlalchemy import MetaData, Table

from app.db.connect import engine

metadata = MetaData()


def _reflect(name: str) -> Table:
    return Table(name, metadata, autoload_with=engine)


mp = _reflect("mps")
minister = _reflect("ministers")
cm = _reflect("chief_ministers")
politician = _reflect("politicians")
wealth = _reflect("wealth_declarations")
milestones = _reflect("political_milestones")
mp_hindi = _reflect("mps_hindi")
mp_milestone = _reflect("mp_political_milestone")
pc = _reflect("parliamentary_constituencies")
manifesto = _reflect("party_manifesto_points")
count = _reflect("Count")
