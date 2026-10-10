from app.agents.state import AgentState

CROP_REQUIREMENTS = {
    "wheat": {"ph_min": 6.0, "ph_max": 7.5, "water_need": "adequate"},
    "rice": {"ph_min": 5.5, "ph_max": 7.0, "water_need": "adequate"},
    "maize": {"ph_min": 5.8, "ph_max": 7.5, "water_need": "seasonal"},
    "groundnut": {"ph_min": 6.0, "ph_max": 6.5, "water_need": "seasonal"},
}

def crop_planning_node(state: AgentState) -> dict:
    crop = state.get("requested_crop", "").lower()

    if not crop or crop not in CROP_REQUIREMENTS:
        return {
            "agent_status": {"crop_planning": "unsupported_crop"},
            "errors": [f"Unsupported crop requirements for: {crop}"],
            "crop_suitability": {"category": "Insufficient Data: Crop Unspecified", "reasons": ["Crop requirements not found."]}
        }

    reqs = CROP_REQUIREMENTS.get(crop, {"ph_min": 5.5, "ph_max": 8.0, "water_need": "adequate"})
    profile = state.get("field_profile") or {}
    soil = state.get("soil_analysis") or {}
    weather = state.get("weather_analysis") or {}
    evidence = state.get("retrieved_evidence")

    limitations = []
    supportive = []

    if evidence:
        supportive.append("Evaluated using retrieved authoritative knowledge base.")

    if weather:
        temp = weather.get("temperature_c")
        if temp is not None and (temp < 0 or temp > 45):
            limitations.append(f"Current temperature {temp}°C is extreme for {crop}.")
        elif temp is not None:
            supportive.append(f"Current temperature {temp}°C is within manageable limits.")

    # Soil pH check
    ph = soil.get("soil_ph")
    if ph is not None:
        if ph < reqs["ph_min"] or ph > reqs["ph_max"]:
            limitations.append(f"Soil pH {ph} is outside optimal range {reqs['ph_min']}-{reqs['ph_max']} for {crop}.")
        else:
            supportive.append(f"Soil pH {ph} is optimal for {crop}.")
    else:
        limitations.append("Soil pH not measured.")

    # Water check
    water = profile.get("water_availability")
    if water:
        if reqs["water_need"] == "adequate" and water != "adequate":
            limitations.append(f"{crop} requires adequate water, but availability is {water}.")
        else:
            supportive.append(f"Water availability '{water}' meets {crop} requirements.")
    else:
        limitations.append("Water availability not recorded.")

    missing_info = [lim for lim in limitations if "not measured" in lim or "not recorded" in lim]
    hard_limits = [lim for lim in limitations if lim not in missing_info]

    if not crop:
        category = "Insufficient Data: Crop Unspecified"
    elif not soil:
        category = "Insufficient Data: Soil Tests Missing"
    elif not profile or missing_info:
        category = "Insufficient Data: Missing Requirements"
    elif hard_limits:
        category = "Agronomic Review Required"
    else:
        category = "Suitable"

    return {
        "crop_requirements": reqs,
        "crop_suitability": {
            "category": category,
            "supporting_factors": supportive,
            "limiting_factors": limitations
        },
        "agent_status": {"crop_planning": "completed"}
    }
