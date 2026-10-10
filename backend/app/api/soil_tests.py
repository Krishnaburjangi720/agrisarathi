"""
AgriSārathi — Soil Tests API router

POST   /soil-tests                              — record a soil test
GET    /soil-tests/{soil_test_id}               — retrieve one soil test
GET    /fields/{field_id}/soil-tests            — chronological history for a field
GET    /fields/{field_id}/latest-soil-test      — most recent test for a field
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import get_db
from app.models.field import Field
from app.models.soil_test import SoilTest
from app.schemas.soil_test import SoilTestCreate, SoilTestResponse, SoilTestListResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /soil-tests
# ---------------------------------------------------------------------------
@router.post(
    "/soil-tests",
    response_model=SoilTestResponse,
    status_code=201,
    tags=["Soil Tests"],
    summary="Record a soil test",
    description=(
        "Records a soil test for an existing field. "
        "All measurement values are optional — a missing value means "
        "the parameter was **not measured**, not that it is zero. "
        "Returns **404** if the field does not exist. "
        "Returns **409** if the `soil_test_id` is already in use."
    ),
)
def create_soil_test(
    payload: SoilTestCreate, db: Session = Depends(get_db)
) -> SoilTestResponse:
    # Verify field exists
    field = db.query(Field).filter(Field.field_id == payload.field_id).first()
    if not field:
        raise HTTPException(
            status_code=404,
            detail=f"Field '{payload.field_id}' not found. Register the field before adding soil tests.",
        )

    # Check for duplicate soil_test_id
    existing = db.query(SoilTest).filter(SoilTest.soil_test_id == payload.soil_test_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Soil test with soil_test_id '{payload.soil_test_id}' already exists.",
        )

    soil_test = SoilTest(**payload.model_dump())
    db.add(soil_test)
    try:
        db.commit()
        db.refresh(soil_test)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Soil test with soil_test_id '{payload.soil_test_id}' already exists.",
        )

    logger.info("Recorded soil test: %s for field: %s", soil_test.soil_test_id, soil_test.field_id)
    return soil_test


# ---------------------------------------------------------------------------
# GET /soil-tests/{soil_test_id}
# ---------------------------------------------------------------------------
@router.get(
    "/soil-tests/{soil_test_id}",
    response_model=SoilTestResponse,
    tags=["Soil Tests"],
    summary="Get a soil test",
    description="Retrieves a single soil-test record by its ID. Returns **404** if not found.",
)
def get_soil_test(soil_test_id: str, db: Session = Depends(get_db)) -> SoilTestResponse:
    test = db.query(SoilTest).filter(SoilTest.soil_test_id == soil_test_id).first()
    if not test:
        raise HTTPException(
            status_code=404,
            detail=f"Soil test '{soil_test_id}' not found.",
        )
    return test


# ---------------------------------------------------------------------------
# GET /fields/{field_id}/soil-tests
# ---------------------------------------------------------------------------
@router.get(
    "/fields/{field_id}/soil-tests",
    response_model=SoilTestListResponse,
    tags=["Soil Tests"],
    summary="List soil tests for a field",
    description=(
        "Returns all soil-test records for the specified field in chronological order "
        "(oldest first). Returns **404** if the field does not exist."
    ),
)
def list_field_soil_tests(
    field_id: str, db: Session = Depends(get_db)
) -> SoilTestListResponse:
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found.")

    tests = (
        db.query(SoilTest)
        .filter(SoilTest.field_id == field_id)
        .order_by(SoilTest.measurement_timestamp.asc(), SoilTest.created_at.asc())
        .all()
    )
    return SoilTestListResponse(soil_tests=tests, total=len(tests))


# ---------------------------------------------------------------------------
# GET /fields/{field_id}/latest-soil-test
# ---------------------------------------------------------------------------
@router.get(
    "/fields/{field_id}/latest-soil-test",
    response_model=SoilTestResponse,
    tags=["Soil Tests"],
    summary="Get latest soil test for a field",
    description=(
        "Retrieves the most recent soil-test record for a field. "
        "Returns **404** if the field does not exist or has no soil tests."
    ),
)
def get_latest_soil_test(field_id: str, db: Session = Depends(get_db)) -> SoilTestResponse:
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found.")

    test = (
        db.query(SoilTest)
        .filter(SoilTest.field_id == field_id)
        .order_by(SoilTest.measurement_timestamp.desc(), SoilTest.created_at.desc())
        .first()
    )
    if not test:
        raise HTTPException(
            status_code=404,
            detail=f"No soil tests found for field '{field_id}'.",
        )
    return test
