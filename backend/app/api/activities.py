from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database.connection import get_db
from app.models.activity import Activity
from app.models.field import Field
from app.schemas.activity import ActivityCreate, ActivityResponse, ActivityList, ActivityUpdate

router = APIRouter()

@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(activity_in: ActivityCreate, db: Session = Depends(get_db)):
    # Validate field exists
    field = db.query(Field).filter(Field.field_id == activity_in.field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    db_activity = db.query(Activity).filter(Activity.activity_id == activity_in.activity_id).first()
    if db_activity:
        raise HTTPException(status_code=409, detail="Activity ID already exists")

    new_activity = Activity(
        activity_id=activity_in.activity_id,
        field_id=activity_in.field_id,
        title=activity_in.title,
        description=activity_in.description,
        due_date=activity_in.due_date,
        status=activity_in.status
    )
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    return new_activity

@router.get("", response_model=ActivityList)
def list_activities(field_id: str = None, status: str = None, db: Session = Depends(get_db)):
    query = db.query(Activity)
    if field_id:
        query = query.filter(Activity.field_id == field_id)
    if status:
        query = query.filter(Activity.status == status)

    # Check for overdue
    now = datetime.now(timezone.utc).isoformat()
    activities = query.all()

    # Auto-update overdue status if due_date is past
    # For a real system we'd want a cron job, but we'll do it on-read here for simplicity
    updated = False
    for act in activities:
        if act.status == "pending" and act.due_date and act.due_date < now[:10]: # Compare YYYY-MM-DD
            act.status = "overdue"
            updated = True

    if updated:
        db.commit()

    return {"items": activities}

@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(activity_id: str, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.activity_id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity

@router.patch("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: str, update_in: ActivityUpdate, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.activity_id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    update_data = update_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity
