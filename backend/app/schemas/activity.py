from typing import Optional
from pydantic import BaseModel, Field as PydanticField, ConfigDict
from datetime import datetime

class ActivityBase(BaseModel):
    field_id: str
    title: str = PydanticField(..., min_length=2, max_length=100)
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: str = PydanticField(default="pending", pattern="^(pending|completed|overdue)$")

class ActivityCreate(ActivityBase):
    activity_id: str = PydanticField(..., min_length=1, max_length=50)

class ActivityUpdate(BaseModel):
    title: Optional[str] = PydanticField(None, min_length=2, max_length=100)
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = PydanticField(None, pattern="^(pending|completed|overdue)$")

class ActivityResponse(ActivityBase):
    activity_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ActivityList(BaseModel):
    items: list[ActivityResponse]
