from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database.base import Base

class Activity(Base):
    """
    SQLAlchemy model for farm/field activities.
    """
    __tablename__ = "activities"

    activity_id = Column(String, primary_key=True, index=True)
    field_id = Column(String, ForeignKey("fields.field_id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending, completed, overdue
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    field = relationship("Field")
