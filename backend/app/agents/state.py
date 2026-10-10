from typing import TypedDict, Any, List, Dict, Optional
import operator
from typing_extensions import Annotated

def add_to_list(left: list | None, right: list | None) -> list:
    if left is None:
        left = []
    if right is None:
        right = []
    return left + right

def update_dict(left: dict | None, right: dict | None) -> dict:
    if left is None:
        left = {}
    if right is None:
        right = {}
    res = left.copy()
    res.update(right)
    return res

class AgentState(TypedDict):
    request_id: str
    field_id: str
    requested_crop: str
    use_simulated_sensors: bool

    field_profile: Optional[Dict[str, Any]]
    soil_analysis: Optional[Dict[str, Any]]
    weather_analysis: Optional[Dict[str, Any]]
    crop_requirements: Optional[Dict[str, Any]]
    crop_suitability: Optional[Dict[str, Any]]
    irrigation_assessment: Optional[Dict[str, Any]]
    ml_prediction: Optional[Dict[str, Any]]
    risk_findings: Optional[Dict[str, Any]]
    retrieved_evidence: Optional[Dict[str, Any]]

    recommendations: Annotated[List[str], add_to_list]
    missing_information: Annotated[List[str], add_to_list]
    source_references: Annotated[List[str], add_to_list]
    agent_status: Annotated[Dict[str, str], update_dict]
    errors: Annotated[List[str], add_to_list]

    narrative_advisory: Optional[str]
    human_review_required: bool
    approval_status: Optional[str]
