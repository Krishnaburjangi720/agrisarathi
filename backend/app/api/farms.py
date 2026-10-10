"""
AgriSārathi — Farms API router

POST   /farms              — register a farm
GET    /farms              — list farms (paginated)
GET    /farms/{farm_id}    — retrieve one farm
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import get_db
from app.models.farm import Farm
from app.schemas.farm import FarmCreate, FarmResponse, FarmListResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# POST /farms
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=FarmResponse,
    status_code=201,
    summary="Register a farm",
    description=(
        "Creates a new farm record. The `farm_id` must be unique. "
        "Returns **409** if the `farm_id` already exists."
    ),
)
def create_farm(payload: FarmCreate, db: Session = Depends(get_db)) -> FarmResponse:
    existing = db.query(Farm).filter(Farm.farm_id == payload.farm_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Farm with farm_id '{payload.farm_id}' already exists.",
        )

    farm = Farm(**payload.model_dump())
    db.add(farm)
    try:
        db.commit()
        db.refresh(farm)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Farm with farm_id '{payload.farm_id}' already exists.",
        )

    logger.info("Created farm: %s", farm.farm_id)
    return farm


# ---------------------------------------------------------------------------
# GET /farms
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=FarmListResponse,
    summary="List farms",
    description="Returns a paginated list of all registered farms.",
)
def list_farms(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> FarmListResponse:
    total = db.query(Farm).count()
    offset = (page - 1) * page_size
    farms = db.query(Farm).order_by(Farm.created_at.desc()).offset(offset).limit(page_size).all()

    return FarmListResponse(farms=farms, total=total, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# GET /farms/{farm_id}
# ---------------------------------------------------------------------------
@router.get(
    "/{farm_id}",
    response_model=FarmResponse,
    summary="Get a farm",
    description="Retrieves a single farm by its public `farm_id`. Returns **404** if not found.",
)
def get_farm(farm_id: str, db: Session = Depends(get_db)) -> FarmResponse:
    farm = db.query(Farm).filter(Farm.farm_id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
    return farm
