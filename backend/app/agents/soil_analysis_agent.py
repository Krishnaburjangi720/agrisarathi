from app.agents.state import AgentState
from app.database.connection import SessionLocal
from app.models.soil_test import SoilTest
from sqlalchemy import desc
from app.services.sensor_simulator import SensorSimulator

def soil_analysis_node(state: AgentState) -> dict:
    field_id = state.get("field_id")
    if not field_id:
        return {"agent_status": {"soil_analysis": "skipped"}}

    use_sensors = state.get("use_simulated_sensors", False)

    analysis = {
        "soil_ph": None,
        "nitrogen_kg_per_ha": None,
        "phosphorus_kg_per_ha": None,
        "potassium_kg_per_ha": None,
        "soil_moisture_percent": None,
        "organic_matter_percent": None,
    }

    with SessionLocal() as db:
        test = db.query(SoilTest).filter(SoilTest.field_id == field_id).order_by(desc(SoilTest.measurement_timestamp)).first()
        if test:
            analysis["soil_ph"] = test.soil_ph
            analysis["nitrogen_kg_per_ha"] = test.nitrogen_kg_per_ha
            analysis["phosphorus_kg_per_ha"] = test.phosphorus_kg_per_ha
            analysis["potassium_kg_per_ha"] = test.potassium_kg_per_ha
            analysis["soil_moisture_percent"] = test.soil_moisture_percent
            analysis["organic_matter_percent"] = test.organic_matter_percent

    if use_sensors:
        sim = SensorSimulator()
        sensor_data = sim.get_readings(field_id, "SENSOR-001")
        if sensor_data["status"] == "active":
            readings = sensor_data["readings"]
            if readings.get("soil_ph", {}).get("value") is not None:
                analysis["soil_ph"] = readings["soil_ph"]["value"]
            if readings.get("soil_moisture_percent", {}).get("value") is not None:
                analysis["soil_moisture_percent"] = readings["soil_moisture_percent"]["value"]
            if readings.get("nitrogen_kg_per_ha", {}).get("value") is not None:
                analysis["nitrogen_kg_per_ha"] = readings["nitrogen_kg_per_ha"]["value"]
            if readings.get("phosphorus_kg_per_ha", {}).get("value") is not None:
                analysis["phosphorus_kg_per_ha"] = readings["phosphorus_kg_per_ha"]["value"]
            if readings.get("potassium_kg_per_ha", {}).get("value") is not None:
                analysis["potassium_kg_per_ha"] = readings["potassium_kg_per_ha"]["value"]

    if not test and not use_sensors:
        return {
            "missing_information": ["soil_test"],
            "agent_status": {"soil_analysis": "no_data"}
        }

    missing = []
    for k, v in analysis.items():
        if v is None:
            missing.append(k)

    return {
        "soil_analysis": analysis,
        "missing_information": missing,
        "agent_status": {"soil_analysis": "completed"}
    }
