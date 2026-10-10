"""
AgriSārathi — Field ORM Model

Represents an agricultural field belonging to a farm.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Field(Base):
    """SQLAlchemy model for an agricultural field.

    Each field belongs to exactly one farm (via `farm_id` FK).
    Soil type, crop history, irrigation, and water availability are
    stored as provided — the backend never modifies user-submitted values.
    """

    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    field_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    farm_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("farms.farm_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_area_hectares: Mapped[float] = mapped_column(Float, nullable=False)
    soil_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    previous_crop: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proposed_crop: Mapped[str | None] = mapped_column(String(100), nullable=True)
    irrigation_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    water_availability: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    farm: Mapped["Farm"] = relationship("Farm", back_populates="fields")  # noqa: F821
    soil_tests: Mapped[list["SoilTest"]] = relationship(  # noqa: F821
        "SoilTest", back_populates="field", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Field(field_id='{self.field_id}', farm_id='{self.farm_id}')>"
