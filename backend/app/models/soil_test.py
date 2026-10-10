"""
AgriSārathi — SoilTest ORM Model

Represents a soil-test record for an agricultural field.

Units (from Phase 1 Data Dictionary):
  - soil_ph:                pH units (0–14)
  - nitrogen_kg_per_ha:     kg/ha (available nitrogen)
  - phosphorus_kg_per_ha:   kg/ha (available phosphorus)
  - potassium_kg_per_ha:    kg/ha (available potassium)
  - soil_moisture_percent:  % volumetric
  - organic_matter_percent: %

All nutrient values are stored in kg/ha as documented.  The backend
NEVER silently modifies original measured values.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SoilTest(Base):
    """SQLAlchemy model for a soil-test record.

    Each test belongs to a field. All measurement columns are nullable
    because a test may not include every parameter. A null value means
    the parameter was *not measured* — it must NEVER be treated as zero.
    """

    __tablename__ = "soil_tests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    soil_test_id: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    field_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("fields.field_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Measured values — all nullable (missing ≠ zero)
    soil_ph: Mapped[float | None] = mapped_column(Float, nullable=True)
    nitrogen_kg_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    phosphorus_kg_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    potassium_kg_per_ha: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_moisture_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    organic_matter_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Provenance
    measurement_timestamp: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    measurement_source: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    field: Mapped["Field"] = relationship(  # noqa: F821
        "Field", back_populates="soil_tests"
    )

    def __repr__(self) -> str:
        return (
            f"<SoilTest(soil_test_id='{self.soil_test_id}', "
            f"field_id='{self.field_id}')>"
        )
