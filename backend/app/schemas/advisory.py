from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AdvisoryRequest(BaseModel):
    field_id: str
    requested_crop: str
    use_simulated_sensors: bool = False

class AdvisoryResponse(BaseModel):
    request_id: str
    field_id: str
    requested_crop: str
    field_profile: Optional[Dict[str, Any]] = None
    soil_analysis: Optional[Dict[str, Any]] = None
    weather_analysis: Optional[Dict[str, Any]] = None
    crop_requirements: Optional[Dict[str, Any]] = None
    crop_suitability: Optional[Dict[str, Any]] = None
    irrigation_assessment: Optional[Dict[str, Any]] = None
    risk_findings: Optional[Dict[str, Any]] = None
    recommendations: List[str] = []
    missing_information: List[str] = []
    source_references: List[str] = []
    agent_status: Dict[str, str] = {}
    errors: List[str] = []
    narrative_advisory: Optional[str] = None
    human_review_required: bool = True
