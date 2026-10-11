"""
AgriSārathi — Weather API router

GET /weather/current?field_id=... — returns real-time weather from Open-Meteo
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings
from app.database.connection import get_db
from app.models.field import Field

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("/current")
def get_current_weather(
    field_id: str = Query(..., description="Field identifier"),
    db: Session = Depends(get_db)
):
    field = db.query(Field).filter(Field.field_id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail=f"Field '{field_id}' not found.")

    lat = field.farm.latitude if hasattr(field, "farm") and field.farm else None
    lon = field.farm.longitude if hasattr(field, "farm") and field.farm else None

    if lat is None or lon is None:
        raise HTTPException(
            status_code=404,
            detail=f"Field '{field_id}' farm does not have coordinates configured."
        )

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
            "timezone": "auto"
        }
        resp = httpx.get(settings.weather_api_url, params=params, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()
        current = data.get("current", {})

        return {
            "field_id": field_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "temperature_c": current.get("temperature_2m", 25.0),
            "precipitation_mm": current.get("precipitation", 0.0),
            "humidity_percent": current.get("relative_humidity_2m", 50.0),
            "wind_speed_m_s": round(current.get("wind_speed_10m", 0.0) / 3.6, 2),
            "conditions": "clear_sky" if current.get("precipitation", 0) == 0 else "rain"
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Weather service unavailable: {str(e)}"
        )
