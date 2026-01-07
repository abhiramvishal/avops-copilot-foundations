from datetime import datetime

from sqlalchemy import String, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.db.base import Base
from sqlalchemy import JSON, ForeignKey
from sqlalchemy import Column
from sqlalchemy.sql import func

class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    temperature: Mapped[int] = mapped_column(Integer, nullable=False)
    packet_loss: Mapped[int] = mapped_column(Integer, nullable=False)
    audio_dropouts: Mapped[int] = mapped_column(Integer, nullable=False)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    
class CopilotRun(Base):
    __tablename__ = "copilot_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    task = Column(Text, nullable=False)
    input_context = Column(JSON, nullable=False, default=dict)
    output = Column(JSON, nullable=False, default=dict)

    status = Column(String(32), nullable=False, default="success")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)  # ✅ change here



