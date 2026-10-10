from app.agents.state import AgentState
from app.database.connection import SessionLocal
from app.models.field import Field

def farm_profile_node(state: AgentState) -> dict:
    field_id = state.get("field_id")
    with SessionLocal() as db:
        field = db.query(Field).filter(Field.field_id == field_id).first()
        if not field:
            return {
                "errors": [f"Field {field_id} not found."],
                "agent_status": {"farm_profile": "failed"}
            }

        profile = {
            "field_id": field.field_id,
            "farm_id": field.farm_id,
            "field_area_hectares": field.field_area_hectares,
            "soil_type": field.soil_type,
            "previous_crop": field.previous_crop,
            "proposed_crop": field.proposed_crop,
            "irrigation_source": field.irrigation_source,
            "water_availability": field.water_availability,
            "latitude": field.farm.latitude if hasattr(field, "farm") and hasattr(field.farm, "latitude") else None,
            "longitude": field.farm.longitude if hasattr(field, "farm") and hasattr(field.farm, "longitude") else None,
        }

        missing = []
        if not field.soil_type:
            missing.append("soil_type")
        if not field.irrigation_source:
            missing.append("irrigation_source")
        if not field.water_availability:
            missing.append("water_availability")

        return {
            "field_profile": profile,
            "missing_information": missing,
            "agent_status": {"farm_profile": "completed"}
        }
