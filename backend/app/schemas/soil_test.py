"""
AgriSÄrathi â€” SoilTest Pydantic Schemas

Request and response models for soil-test endpoints.

Units (from Phase 1 Data Dictionary):
  - soil_ph:                pH units (0â€“14)
  - nitrogen_kg_per_ha:     kg/ha
  - phosphorus_kg_per_ha:   kg/ha
  - potassium_kg_per_ha:    kg/ha
  - soil_moisture_percent:  % (volumetric)
  - organic_matter_percent: %

All measurement values are optional. A null value means the parameter
was NOT measured â€” it must NEVER be interpreted as zero.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


class SoilTestCreate(BaseModel):
    """Schema for recording a new soil-test.

    Example request body:
    ```json
    {
        "soil_test_id": "ST-001",
        "field_id": "FIELD-001",
        "soil_ph": 6.5,
        "nitrogen_kg_per_ha": 85.0,
        "phosphorus_kg_per_ha": 40.0,
        "potassium_kg_per_ha": 55.0,
        "soil_moisture_percent": 24.0,
        "organic_matter_percent": null,
        "measurement_timestamp": "2025-01-10T09:00:00Z",
        "measurement_source": "District Soil Testing Lab"
    }
    ```
    """

    soil_test_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Unique soil test identifier",
        examples=["ST-001"],
    )
    field_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Field this test belongs to (must exist)",
        examples=["FIELD-001"],
    )

    # --- Measured values â€” all optional (missing â‰  zero) ---
    soil_ph: float | None = Field(
        default=None,
        ge=0.0,
        le=14.0,
        description="Soil pH (0â€“14). Null means not measured, NOT neutral.",
        examples=[6.5],
    )
    nitrogen_kg_per_ha: float | None = Field(
        default=None,
        ge=0.0,
        description="Available nitrogen in kg/ha. Null means not measured, NOT zero.",
        examples=[85.0],
    )
    phosphorus_kg_per_ha: float | None = Field(
        default=None,
        ge=0.0,
        description="Available phosphorus in kg/ha. Null means not measured, NOT zero.",
        examples=[40.0],
    )
    potassium_kg_per_ha: float | None = Field(
        default=None,
        ge=0.0,
        description="Available potassium in kg/ha. Null means not measured, NOT zero.",
        examples=[55.0],
    )
    soil_moisture_percent: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Volumetric soil moisture (0â€“100%). Null means not measured.",
        examples=[24.0],
    )
    organic_matter_percent: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Organic matter percentage. Null means not measured.",
        examples=[2.5],
    )

    # --- Provenance ---
    measurement_timestamp: datetime | None = Field(
        default=None,
        description="When the measurement was taken (ISO 8601)",
        examples=["2025-01-10T09:00:00Z"],
    )
    measurement_source: str | None = Field(
        default=None,
        max_length=300,
        description="Lab name, sensor ID, or 'farmer_reported'",
        examples=["District Soil Testing Lab"],
    )

    @field_validator("soil_test_id", "field_id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9\-]+$", v):
            raise ValueError(
                "Identifier must contain only alphanumeric characters and hyphens"
            )
        return v


class SoilTestResponse(BaseModel):
    """Schema for a soil-test in API responses.

    All measurement fields preserve the original values exactly as recorded.
    Null values indicate the parameter was not measured.
    """

    soil_test_id: str
    field_id: str
    soil_ph: float | None = None
    nitrogen_kg_per_ha: float | None = None
    phosphorus_kg_per_ha: float | None = None
    potassium_kg_per_ha: float | None = None
    soil_moisture_percent: float | None = None
    organic_matter_percent: float | None = None
    measurement_timestamp: datetime | None = None
    measurement_source: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SoilTestListResponse(BaseModel):
    """List of soil-test records (chronological order)."""

    soil_tests: list[SoilTestResponse]
    total: int
