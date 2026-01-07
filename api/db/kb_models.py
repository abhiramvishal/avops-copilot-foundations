from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime
from api.db.base import Base

class KBDoc(Base):
    __tablename__ = "kb_docs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    source = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
