from app.db.connect import Base
from sqlalchemy import Column, Integer, String

class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    picture = Column(String)
    name = Column(String)