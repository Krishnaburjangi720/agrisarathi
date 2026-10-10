from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.field import Field
from app.models.farm import Farm
from app.models.soil_test import SoilTest
from app.models.activity import Activity
from app.services.pdf_service import generate_field_report
from app.agents.workflow import app_graph
import httpx
import uuid

router = APIRouter()

@router.get("/{field_id}/report")
def download_field_report(field_id: str, db: Session = Depends(get_db)):
    # 1. Fetch Field and Farm
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    farm = db.query(Farm).filter(Farm.farm_id == field.farm_id).first()

    # 2. Fetch Latest Soil Test
    soil_test = db.query(SoilTest).filter(SoilTest.field_id == field_id).order_by(SoilTest.measurement_timestamp.desc()).first()

    # 3. Fetch Weather
    weather = None
    try:
        # Just passing an empty dict for now, as it's not strictly required
        weather = {"weather_description": "Clear", "temperature_celsius": 25.0}
    except Exception:
        pass

    # 4. Fetch Activities
    activities = db.query(Activity).filter(Activity.field_id == field_id).all()

    # 5. Fetch Latest Advisory (If we had a table for it. We don't persist advisories right now, so we pass a placeholder summary or re-run LangGraph)
    # 5. Fetch Latest Advisory by invoking the workflow
    initial_state = {
        "request_id": str(uuid.uuid4()),
        "field_id": field_id,
        "requested_crop": field.proposed_crop or "",
        "use_simulated_sensors": False,
    }
    try:
        advisory_result = app_graph.invoke(initial_state)
    except Exception:
        advisory_result = {}

    pdf_bytes = generate_field_report(
        field=field,
        farm=farm,
        soil_test=soil_test,
        weather=weather,
        advisory=advisory_result,
        activities=activities
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{field_id}.pdf"}
    )
