from datetime import datetime

from sqlalchemy import String, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.db.base import Base


class TelemetryEvent(Base):
    __tablename__ = "telemetry_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    temperature: Mapped[int] = mapped_column(Integer, nullable=False)
    packet_loss: Mapped[int] = mapped_column(Integer, nullable=False)
    audio_dropouts: Mapped[int] = mapped_column(Integer, nullable=False)

    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class CopilotRun(Base):
    __tablename__ = "copilot_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # store raw request/response later (Step 5)
    task: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False, default="")

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
