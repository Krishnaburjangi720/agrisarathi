"""
AgriSÄrathi â€” Farm Pydantic Schemas

Request and response models for the /farms endpoint.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import re


class FarmCreate(BaseModel):
    """Schema for creating a new farm.

    Example request body:
    ```json
    {
        "farm_id": "FARM-001",
        "name": "Sunrise Farm",
        "owner_name": "Ramesh Kumar",
        "location_name": "Lucknow, Uttar Pradesh",
        "latitude": 26.85,
        "longitude": 80.91
    }
    ```
    """

    farm_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Unique farm identifier (alphanumeric with hyphens, e.g. 'FARM-001')",
        examples=["FARM-001"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Farm name",
        examples=["Sunrise Farm"],
    )
    owner_name: str | None = Field(
        default=None,
        max_length=200,
        description="Farm owner's name (optional)",
        examples=["Ramesh Kumar"],
    )
    location_name: str | None = Field(
        default=None,
        max_length=300,
        description="General location description (optional)",
        examples=["Lucknow, Uttar Pradesh"],
    )
    latitude: float | None = Field(
        default=None,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (-90 to 90)",
        examples=[26.85],
    )
    longitude: float | None = Field(
        default=None,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (-180 to 180)",
        examples=[80.91],
    )

    @field_validator("farm_id")
    @classmethod
    def validate_farm_id_format(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9\-]+$", v):
            raise ValueError(
                "farm_id must contain only alphanumeric characters and hyphens"
            )
        return v


class FarmResponse(BaseModel):
    """Schema for a farm in API responses."""

    farm_id: str
    name: str
    owner_name: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FarmListResponse(BaseModel):
    """Paginated list of farms."""

    farms: list[FarmResponse]
    total: int
    page: int
    page_size: int
