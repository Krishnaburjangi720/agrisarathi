import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.advisory import AdvisoryRequest, AdvisoryResponse
from app.agents.workflow import app_graph
from app.agents.state import AgentState

router = APIRouter()

@router.post("/analyze", response_model=AdvisoryResponse)
def analyze_advisory(request: AdvisoryRequest):
    req_id = str(uuid.uuid4())

    initial_state = {
        "request_id": req_id,
        "field_id": request.field_id,
        "requested_crop": request.requested_crop,
        "use_simulated_sensors": request.use_simulated_sensors,
    }

    # Run the workflow
    result = app_graph.invoke(initial_state)

    # Handle explicit errors such as field not found
    if result.get("errors"):
        if any("not found" in str(e).lower() for e in result["errors"]):
            raise HTTPException(status_code=404, detail=result["errors"][0])

    return result
