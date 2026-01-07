from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Union

from pydantic import BaseModel, Field


class CopilotRunRequest(BaseModel):
    task: str


class CopilotRunResponse(BaseModel):
    run_id: int
    status: str
    task: str
    input_context: Dict[str, Any] = Field(default_factory=dict)
    output: Dict[str, Any] = Field(default_factory=dict)
    created_at: Union[datetime, str]

class CopilotRunListResponse(BaseModel):
    items: List[CopilotRunResponse]
