from pydantic import BaseModel
from typing import Any, Dict
from datetime import datetime

class CopilotRunRequest(BaseModel):
    task: str
    input_context: Dict[str, Any] = {}

class CopilotRunResponse(BaseModel):
    run_id: int
    status: str
    task: str
    input_context: Dict[str, Any]
    output: Dict[str, Any]
    created_at: datetime
