import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class SensorConfig:
    def __init__(self, seed: Optional[int] = None, failure_rate: float = 0.05, stale_rate: float = 0.05, out_of_range_rate: float = 0.05):
        self.seed = seed
        self.failure_rate = failure_rate
        self.stale_rate = stale_rate
        self.out_of_range_rate = out_of_range_rate

class SensorSimulator:
    def __init__(self, config: Optional[SensorConfig] = None):
        self.config = config or SensorConfig()

    def get_readings(self, field_id: str, sensor_id: str) -> Dict[str, Any]:
        if self.config.seed is not None:
            random.seed(self.config.seed)

        now = datetime.now(timezone.utc)

        if random.random() < self.config.failure_rate:
            return {
                "field_id": field_id,
                "sensor_id": sensor_id,
                "status": "failure",
                "timestamp": now.isoformat(),
                "is_simulated": True,
                "readings": {}
            }

        timestamp = now
        if random.random() < self.config.stale_rate:
            timestamp = now - timedelta(days=2) # 48 hours old

        def generate_value(base: float, variance: float, min_val: float, max_val: float, oob_low: float, oob_high: float):
            if random.random() < 0.05:
                return None
            if random.random() < self.config.out_of_range_rate:
                return random.choice([oob_low, oob_high])
            val = base + random.uniform(-variance, variance)
            return round(max(min_val, min(max_val, val)), 2)

        readings = {
            "soil_moisture_percent": {"value": generate_value(25.0, 10.0, 0.0, 100.0, -10.0, 150.0), "unit": "%"},
            "soil_temperature_c": {"value": generate_value(20.0, 5.0, -10.0, 60.0, -50.0, 100.0), "unit": "C"},
            "soil_ph": {"value": generate_value(6.5, 1.0, 0.0, 14.0, -2.0, 16.0), "unit": "pH"},
            "electrical_conductivity_ds_m": {"value": generate_value(1.2, 0.5, 0.0, 10.0, -1.0, 20.0), "unit": "dS/m"},
            "nitrogen_kg_per_ha": {"value": generate_value(150.0, 50.0, 0.0, 500.0, -100.0, 1000.0), "unit": "kg/ha"},
            "phosphorus_kg_per_ha": {"value": generate_value(50.0, 20.0, 0.0, 200.0, -50.0, 500.0), "unit": "kg/ha"},
            "potassium_kg_per_ha": {"value": generate_value(200.0, 60.0, 0.0, 800.0, -200.0, 1500.0), "unit": "kg/ha"}
        }

        return {
            "field_id": field_id,
            "sensor_id": sensor_id,
            "status": "active",
            "timestamp": timestamp.isoformat(),
            "is_simulated": True,
            "readings": readings
        }
