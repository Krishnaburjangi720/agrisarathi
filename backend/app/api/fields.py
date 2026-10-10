"""
AgriSÄrathi â€” Fields API router

POST   /fields                          â€” register a field
GET    /fields                          â€” list fields (paginated, filterable by farm_id)
GET    /fields/{field_id}               â€” retrieve one field
PATCH  /fields/{field_id}               â€” partial update (preserves omitted values)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import get_db
from app.models.farm import Farm
from app.models.field import Field
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse, FieldListResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /fields
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=FieldResponse,
    status_code=201,
    summary="Register a field",
    description=(
        "Creates a new field under an existing farm. The `farm_id` must reference "
        "an existing farm. Returns **404** if the farm does not exist. "
        "Returns **409** if the `field_id` is already in use."
    ),
)
def create_field(payload: FieldCreate, db: Session = Depends(get_db)) -> FieldResponse:
    # Verify the parent farm exists
    farm = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if not farm:
        raise HTTPException(
            status_code=404,
            detail=f"Farm '{payload.farm_id}' not found. Register the farm before adding fields.",
        )

    # Check for duplicate field_id
    existing = db.query(Field).filter(Field.field_id == payload.field_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Field with field_id '{payload.field_id}' already exists.",
        )

    field = Field(**payload.model_dump())
    db.add(field)
    try:
        db.commit()
        db.refresh(field)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Field with field_id '{payload.field_id}' already exists.",
        )

    logger.info("Created field: %s under farm: %s", field.field_id, field.farm_id)
    return field


# ---------------------------------------------------------------------------
# GET /fields
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=FieldListResponse,
    summary="List fields",
    description=(
        "Returns a paginated list of fields. Optionally filter by `farm_id`."
    ),
)
def list_fields(
    farm_id: str | None = Query(default=None, description="Filter by farm_id"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> FieldListResponse:
    query = db.query(Field)
    if farm_id:
        query = query.filter(Field.farm_id == farm_id)

    total = query.count()
    offset = (page - 1) * page_size
    fields = query.order_by(Field.created_at.desc()).offset(offset).limit(page_size).all()

    return FieldListResponse(fields=fields, total=total, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# GET /fields/{field_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{field_id}",
    response_model=FieldResponse,
    summary="Get a field",
    description="Retrieves a single field by its `field_id`. Returns **404** if not found.",
)
def get_field(field_id: str, db: Session = Depends(get_db)) -> FieldResponse:
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found.")
    return field


# ---------------------------------------------------------------------------
# PATCH /fields/{field_id}
# ---------------------------------------------------------------------------
@router.patch(
    "/{field_id}",
    response_model=FieldResponse,
    summary="Update a field",
    description=(
        "Partially updates a field. Only the supplied fields are changed â€” "
        "omitted fields retain their existing values. "
        "To explicitly clear an optional field, send it as `null`."
    ),
)
def update_field(
    field_id: str,
    payload: FieldUpdate,
    db: Session = Depends(get_db),
) -> FieldResponse:
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found.")

    # Only update fields that were explicitly supplied in the request body
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    logger.info("Updated field: %s â€” changed fields: %s", field_id, list(update_data.keys()))
    return field
