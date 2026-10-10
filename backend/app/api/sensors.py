from fastapi import APIRouter, Query
from app.services.sensor_simulator import SensorSimulator, SensorConfig

router = APIRouter(prefix="/sensors", tags=["sensors"])
simulator = SensorSimulator(SensorConfig(seed=None))

@router.get("/simulated")
def get_simulated_readings(
    field_id: str,
    sensor_id: str = Query(default="SENSOR-001"),
    seed: int = Query(default=None)
):
    if seed is not None:
        sim = SensorSimulator(SensorConfig(seed=seed))
        return sim.get_readings(field_id, sensor_id)
    return simulator.get_readings(field_id, sensor_id)
