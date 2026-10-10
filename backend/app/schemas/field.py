"""
AgriSārathi — Field Pydantic Schemas

Request and response models for the /fields endpoint.
Validation rules per Phase 1 Data Dictionary.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


# Valid enumerated values from the Phase 1 data dictionary
VALID_IRRIGATION_SOURCES = {
    "canal", "borewell", "tubewell", "pond", "river",
    "rainfed", "drip", "sprinkler", "other",
}

VALID_WATER_AVAILABILITY = {"adequate", "limited", "seasonal", "unknown"}


class FieldCreate(BaseModel):
    """Schema for registering a new field under a farm.

    Example request body:
    ```json
    {
        "field_id": "FIELD-001",
        "farm_id": "FARM-001",
        "field_area_hectares": 5.0,
        "soil_type": "loamy",
        "previous_crop": "groundnut",
        "proposed_crop": "maize",
        "irrigation_source": "borewell",
        "water_availability": "adequate"
    }
    ```
    """

    field_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Unique field identifier (alphanumeric with hyphens)",
        examples=["FIELD-001"],
    )
    farm_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Parent farm identifier (must exist)",
        examples=["FARM-001"],
    )
    field_area_hectares: float = Field(
        ...,
        gt=0,
        le=10000,
        description="Field area in hectares (must be > 0, ≤ 10,000)",
        examples=[5.0],
    )
    soil_type: str | None = Field(
        default=None,
        max_length=100,
        description="Primary soil classification (e.g. 'loamy', 'alluvial', 'clay loam')",
        examples=["loamy"],
    )
    previous_crop: str | None = Field(
        default=None,
        max_length=100,
        description="Last crop grown on this field (optional)",
        examples=["groundnut"],
    )
    proposed_crop: str | None = Field(
        default=None,
        max_length=100,
        description="Crop the farmer intends to grow (optional at registration)",
        examples=["maize"],
    )
    irrigation_source: str | None = Field(
        default=None,
        max_length=50,
        description=(
            f"Water source. Valid values: {', '.join(sorted(VALID_IRRIGATION_SOURCES))}"
        ),
        examples=["borewell"],
    )
    water_availability: str | None = Field(
        default=None,
        max_length=50,
        description=(
            f"Water status. Valid values: {', '.join(sorted(VALID_WATER_AVAILABILITY))}"
        ),
        examples=["adequate"],
    )

    @field_validator("field_id", "farm_id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9\-]+$", v):
            raise ValueError(
                "Identifier must contain only alphanumeric characters and hyphens"
            )
        return v

    @field_validator("irrigation_source")
    @classmethod
    def validate_irrigation_source(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in VALID_IRRIGATION_SOURCES:
            raise ValueError(
                f"Invalid irrigation_source '{v}'. "
                f"Valid values: {', '.join(sorted(VALID_IRRIGATION_SOURCES))}"
            )
        return v.lower() if v else v

    @field_validator("water_availability")
    @classmethod
    def validate_water_availability(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in VALID_WATER_AVAILABILITY:
            raise ValueError(
                f"Invalid water_availability '{v}'. "
                f"Valid values: {', '.join(sorted(VALID_WATER_AVAILABILITY))}"
            )
        return v.lower() if v else v


class FieldUpdate(BaseModel):
    """Schema for PATCH /fields/{field_id}.

    All fields are optional. Omitted fields are not modified.
    Explicitly setting a field to null clears that optional value.
    """

    field_area_hectares: float | None = Field(
        default=None,
        gt=0,
        le=10000,
        description="Updated field area in hectares",
    )
    soil_type: str | None = Field(default=None, max_length=100)
    previous_crop: str | None = Field(default=None, max_length=100)
    proposed_crop: str | None = Field(default=None, max_length=100)
    irrigation_source: str | None = Field(default=None, max_length=50)
    water_availability: str | None = Field(default=None, max_length=50)

    @field_validator("irrigation_source")
    @classmethod
    def validate_irrigation_source(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in VALID_IRRIGATION_SOURCES:
            raise ValueError(
                f"Invalid irrigation_source '{v}'. "
                f"Valid values: {', '.join(sorted(VALID_IRRIGATION_SOURCES))}"
            )
        return v.lower() if v else v

    @field_validator("water_availability")
    @classmethod
    def validate_water_availability(cls, v: str | None) -> str | None:
        if v is not None and v.lower() not in VALID_WATER_AVAILABILITY:
            raise ValueError(
                f"Invalid water_availability '{v}'. "
                f"Valid values: {', '.join(sorted(VALID_WATER_AVAILABILITY))}"
            )
        return v.lower() if v else v


class FieldResponse(BaseModel):
    """Schema for a field in API responses."""

    field_id: str
    farm_id: str
    field_area_hectares: float
    soil_type: str | None = None
    previous_crop: str | None = None
    proposed_crop: str | None = None
    irrigation_source: str | None = None
    water_availability: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FieldListResponse(BaseModel):
    """Paginated list of fields."""

    fields: list[FieldResponse]
    total: int
    page: int
    page_size: int
