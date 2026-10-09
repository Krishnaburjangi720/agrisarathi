# AgriSārathi — Test Plan

> **Document Status:** Phase 1 — Planned Tests (not yet executed)
> All test cases below are designs. Actual test execution will occur in Phase 7.

---

## Table of Contents

1. [Test Strategy Overview](#test-strategy-overview)
2. [TC-01: Suitable Soil and Weather Conditions](#tc-01-suitable-soil-and-weather-conditions)
3. [TC-02: Soil pH Outside Configured Crop-Specific Range](#tc-02-soil-ph-outside-configured-crop-specific-range)
4. [TC-03: Low Soil Moisture](#tc-03-low-soil-moisture)
5. [TC-04: Significant Rainfall Forecast](#tc-04-significant-rainfall-forecast)
6. [TC-05: Missing Soil-Test Information](#tc-05-missing-soil-test-information)
7. [TC-06: High Humidity and Temperature — Disease Risk Conditions](#tc-06-high-humidity-and-temperature--disease-risk-conditions)
8. [Test Environment](#test-environment)
9. [Test Execution Checklist](#test-execution-checklist)

---

## Test Strategy Overview

### Scope

These six test cases cover the assignment-required scenarios for validating the AgriSārathi multi-agent system. Each test exercises a specific combination of input conditions and verifies that the appropriate agents produce correct, evidence-based outputs.

### Testing Levels

| Level | Description | Tools |
|-------|-------------|-------|
| **Unit Tests** | Test individual agent logic, validation functions, and utility modules in isolation | pytest |
| **Integration Tests** | Test agent interactions through the LangGraph orchestrator with mocked external services | pytest + httpx mock |
| **End-to-End Tests** | Test the full request lifecycle from API call through agent execution to recommendation output | pytest + FastAPI TestClient |
| **Manual Verification** | Review recommendation text quality, evidence citations, and uncertainty disclosure | Human review |

### Test Data Policy

- All test input data is explicitly defined in each test case.
- Test data does not claim to represent universal agricultural truths.
- Reference ranges used in tests are configured crop-specific values, not invented thresholds.
- Expected outputs describe the **structure and behavior** — not exact text wording.

---

## TC-01: Suitable Soil and Weather Conditions

### Test Objective

Verify that when all field conditions (soil, weather, irrigation) fall within the crop-specific reference ranges, the system produces a "Suitable" suitability category with appropriate evidence.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-001",
  "field_area_hectares": 2.5,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "alluvial",
  "previous_crop": "rice",
  "proposed_crop": "wheat",
  "irrigation_source": "canal",
  "water_availability": "adequate",
  "soil_test": {
    "soil_ph": 6.8,
    "nitrogen_kg_per_ha": 200,
    "phosphorus_kg_per_ha": 30,
    "potassium_kg_per_ha": 150,
    "soil_moisture_percent": 30,
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab"
  }
}
```

**Mocked Weather API Response:**
- Current temperature: 20°C
- Current humidity: 60%
- Current rainfall: 0mm
- 7-day forecast: mild temperatures (8–22°C), minimal rainfall (0–5mm), humidity 50–65%

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept all fields, compute `completeness_score: 1.0`, no `missing_information` entries |
| 2 | Agent 2 (Soil Analysis) | All measured values within wheat reference ranges, no deviations reported |
| 3 | Agent 3 (Weather) | Retrieve weather, no significant agricultural conditions flagged |
| 4 | Agent 4 (Suitability) | Classify as **"Suitable"**, list all favorable conditions |
| 5 | Agent 5 (Irrigation) | Adequate moisture, no immediate irrigation needed |
| 6 | Agent 6 (Advisory) | No significant risks, provide maintenance advisory |

### Agents Involved

All six agents.

### Evidence Required

- Soil analysis output must preserve exact input values (pH 6.8, N 200, P 30, K 150, moisture 30%).
- Suitability output must cite the crop-specific reference source.
- Weather output must include API source name and retrieval timestamp.
- `missing_information` list must be empty.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | Suitability category is "Suitable" | ✅ | Any other category |
| 2 | All measured soil values preserved exactly in output | ✅ | Any value rounded or modified |
| 3 | Favorable conditions list is non-empty with specific evidence | ✅ | Empty or generic statements |
| 4 | No deviations reported in soil analysis | ✅ | Any deviation flagged |
| 5 | `missing_information` is empty | ✅ | Any missing info entries |
| 6 | Weather source and timestamp recorded | ✅ | Missing provenance |
| 7 | Recommendations include source references | ✅ | No references cited |

---

## TC-02: Soil pH Outside Configured Crop-Specific Range

### Test Objective

Verify that when soil pH falls outside the configured crop-specific range, the system identifies the deviation, preserves the original measured value, and classifies suitability as "Suitable with Conditions" with an explanation of the pH limitation.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-002",
  "field_area_hectares": 1.8,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "clay loam",
  "previous_crop": "rice",
  "proposed_crop": "wheat",
  "irrigation_source": "borewell",
  "water_availability": "adequate",
  "soil_test": {
    "soil_ph": 5.2,
    "nitrogen_kg_per_ha": 180,
    "phosphorus_kg_per_ha": 25,
    "potassium_kg_per_ha": 140,
    "soil_moisture_percent": 28,
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab"
  }
}
```

**Mocked Weather API Response:** Same as TC-01 (mild, suitable conditions).

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept all fields, complete profile |
| 2 | Agent 2 (Soil Analysis) | Identify pH 5.2 as **below** wheat reference range (6.0–7.5); report deviation |
| 3 | Agent 3 (Weather) | Normal weather retrieval |
| 4 | Agent 4 (Suitability) | Classify as **"Suitable with Conditions"**; explain pH limitation |
| 5 | Agent 5 (Irrigation) | Normal irrigation assessment |
| 6 | Agent 6 (Advisory) | Include pH-related advisory; suggest consulting agronomist for soil amendment; do **not** prescribe specific lime quantities |

### Agents Involved

All six agents. Agents 2, 4, and 6 are the primary focus.

### Evidence Required

- Agent 2 output must show `soil_ph: 5.2` exactly (no rounding or correction).
- Agent 2 must report the deviation with reference min/max values.
- Agent 4 must explain why pH 5.2 is a limiting condition.
- Agent 6 must **not** invent specific fertilizer or lime quantities.
- Agent 6 must recommend professional agronomic consultation for soil amendment dosage.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | Suitability category is "Suitable with Conditions" | ✅ | "Suitable" or other |
| 2 | Measured pH 5.2 preserved exactly in output | ✅ | Value changed or rounded |
| 3 | Deviation reported with reference range | ✅ | No deviation flagged |
| 4 | Explanation mentions acidic soil impact | ✅ | No explanation |
| 5 | Advisory does NOT prescribe specific lime kg/ha | ✅ | Specific dosage invented |
| 6 | Advisory recommends agronomic consultation | ✅ | No professional referral |
| 7 | Source reference cited for pH range | ✅ | No reference |

---

## TC-03: Low Soil Moisture

### Test Objective

Verify that when soil moisture is significantly below the crop's requirement, the irrigation agent recommends action with clear reasoning, and the advisory agent highlights moisture stress as a risk.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-003",
  "field_area_hectares": 3.0,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "sandy loam",
  "proposed_crop": "wheat",
  "irrigation_source": "borewell",
  "water_availability": "limited",
  "soil_test": {
    "soil_ph": 6.5,
    "nitrogen_kg_per_ha": 190,
    "phosphorus_kg_per_ha": 28,
    "potassium_kg_per_ha": 145,
    "soil_moisture_percent": 12,
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "Sensor-SIM-001"
  }
}
```

**Mocked Weather API Response:**
- Current temperature: 25°C
- Current humidity: 40%
- Current rainfall: 0mm
- 5-day forecast: dry conditions, 0mm rainfall, precipitation probability < 10%

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept fields; note `previous_crop` missing |
| 2 | Agent 2 (Soil Analysis) | Flag moisture 12% as potentially low (compared to crop reference); other values within range |
| 3 | Agent 3 (Weather) | Report dry forecast; flag absence of expected rainfall |
| 4 | Agent 4 (Suitability) | Classify as **"Suitable with Conditions"**; note moisture limitation |
| 5 | Agent 5 (Irrigation) | Identify clear moisture deficit; recommend irrigation with reasoning; note limited water availability as a constraint |
| 6 | Agent 6 (Advisory) | Prioritize moisture stress risk; note dry forecast compounds the issue; factor in limited water availability |

### Agents Involved

All six agents. Agents 5 and 6 are the primary focus.

### Evidence Required

- Agent 5 must calculate a moisture deficit based on crop water need vs. available moisture.
- Agent 5 must note that limited water availability constrains irrigation options.
- Agent 5 reasoning must reference the dry weather forecast.
- Agent 6 must identify moisture stress as a risk with severity.
- Measured moisture (12%) must be preserved exactly.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | Irrigation agent identifies moisture deficit | ✅ | No deficit identified |
| 2 | Irrigation recommendation includes reasoning | ✅ | Bare recommendation without rationale |
| 3 | Water availability constraint acknowledged | ✅ | Ignored in recommendation |
| 4 | Dry forecast referenced in irrigation reasoning | ✅ | Forecast not considered |
| 5 | Moisture stress listed as a risk by Agent 6 | ✅ | Not identified as risk |
| 6 | Measured moisture 12% preserved exactly | ✅ | Value modified |
| 7 | No rigid irrigation schedule generated | ✅ | "Irrigate every N days" without reasoning |

---

## TC-04: Significant Rainfall Forecast

### Test Objective

Verify that when a significant rainfall event is forecast, the weather agent flags it, the irrigation agent defers irrigation appropriately, and the advisory agent considers waterlogging risk and field operations impact.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-004",
  "field_area_hectares": 2.0,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "clay loam",
  "proposed_crop": "wheat",
  "irrigation_source": "canal",
  "water_availability": "adequate",
  "soil_test": {
    "soil_ph": 7.0,
    "nitrogen_kg_per_ha": 210,
    "phosphorus_kg_per_ha": 35,
    "potassium_kg_per_ha": 160,
    "soil_moisture_percent": 25,
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab"
  }
}
```

**Mocked Weather API Response:**
- Current temperature: 18°C
- Current humidity: 70%
- Current rainfall: 0mm
- Forecast: 45mm rainfall over 2 days (precipitation probability 85%), followed by 3 dry days

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept all fields |
| 2 | Agent 2 (Soil Analysis) | All values within range |
| 3 | Agent 3 (Weather) | Flag 45mm rainfall as a significant condition with 85% probability |
| 4 | Agent 4 (Suitability) | Consider rainfall in assessment; may note positive (water supply) or negative (waterlogging risk for clay soil) |
| 5 | Agent 5 (Irrigation) | **Defer irrigation** — expected rainfall will replenish soil moisture; provide reasoning |
| 6 | Agent 6 (Advisory) | Assess waterlogging risk for clay loam soil with 45mm rain; advise on field drainage; note field operations may be difficult during rain |

### Agents Involved

All six agents. Agents 3, 5, and 6 are the primary focus.

### Evidence Required

- Agent 3 must flag the 45mm rainfall as a significant condition with the probability.
- Agent 5 must explicitly reason about expected rainfall vs. current moisture.
- Agent 5 must defer irrigation with a clear rationale.
- Agent 6 must consider waterlogging risk (clay soil + heavy rain).
- Weather source and retrieval timestamp must be recorded.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | Weather agent flags significant rainfall event | ✅ | Rainfall not flagged |
| 2 | Rainfall amount and probability recorded | ✅ | Values missing |
| 3 | Irrigation agent defers irrigation | ✅ | Recommends irrigation despite incoming rain |
| 4 | Deferral reasoning references forecast rainfall | ✅ | No reasoning provided |
| 5 | Advisory agent considers waterlogging risk | ✅ | No waterlogging consideration |
| 6 | Advisory notes field operations may be affected | ✅ | Operations impact ignored |
| 7 | Weather provenance (source, timestamp) recorded | ✅ | Missing provenance |

---

## TC-05: Missing Soil-Test Information

### Test Objective

Verify that when soil test data is absent, the system explicitly identifies the missing information, does not substitute defaults, and classifies suitability as "Additional Information Required" rather than proceeding with incomplete analysis.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-005",
  "field_area_hectares": 1.5,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "red soil",
  "proposed_crop": "cotton",
  "irrigation_source": "rainfed",
  "water_availability": "seasonal",
  "soil_test": null
}
```

**Mocked Weather API Response:** Suitable conditions (warm, dry).

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept fields; note `previous_crop` missing |
| 2 | Agent 2 (Soil Analysis) | Record all soil parameters as missing in `missing_information`; **not** produce zero values; skip reference comparison |
| 3 | Agent 3 (Weather) | Normal weather retrieval |
| 4 | Agent 4 (Suitability) | Classify as **"Additional Information Required"**; explain that soil data is needed for suitability assessment |
| 5 | Agent 5 (Irrigation) | Note soil moisture unknown; cannot assess irrigation need; recommend manual field check |
| 6 | Agent 6 (Advisory) | Primary recommendation: obtain soil test before planning; note that without soil data, nutrient and pH suitability cannot be assessed |

### Agents Involved

All six agents. Agents 2, 4, and 6 are the primary focus.

### Evidence Required

- Agent 2 output: all `measured_values` fields must be `null`, not 0.
- `missing_information` list must contain entries for: `soil_ph`, `nitrogen_kg_per_ha`, `phosphorus_kg_per_ha`, `potassium_kg_per_ha`, `soil_moisture_percent`.
- Each missing info entry must include impact description.
- Agent 4 must classify as "Additional Information Required."
- Agent 6 must not invent agricultural recommendations based on absent soil data.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | Suitability category is "Additional Information Required" | ✅ | "Suitable" or "Suitable with Conditions" |
| 2 | All soil values are `null` in output, not 0 | ✅ | Any soil value is 0 or a default |
| 3 | `missing_information` contains entries for each soil parameter | ✅ | Missing parameters not listed |
| 4 | Each missing info entry has an impact description | ✅ | Impact descriptions absent |
| 5 | Agent 6 recommends obtaining soil test | ✅ | No recommendation to test soil |
| 6 | No nutrient or pH recommendations generated from absent data | ✅ | Recommendations based on missing data |
| 7 | Irrigation agent notes moisture is unknown | ✅ | Irrigation recommendation based on assumed moisture |

---

## TC-06: High Humidity and Temperature — Disease Risk Conditions

### Test Objective

Verify that when weather conditions (high humidity combined with warm temperatures) are favorable for plant disease development, the system identifies this as an environmental risk, clearly labels it as a risk condition (not a diagnosis), and provides appropriate monitoring advice.

### Input Data

```json
{
  "farm_id": "FARM-TEST-001",
  "field_id": "FIELD-TEST-006",
  "field_area_hectares": 2.2,
  "latitude": 26.85,
  "longitude": 80.91,
  "soil_type": "alluvial",
  "previous_crop": "rice",
  "proposed_crop": "wheat",
  "irrigation_source": "canal",
  "water_availability": "adequate",
  "soil_test": {
    "soil_ph": 6.8,
    "nitrogen_kg_per_ha": 195,
    "phosphorus_kg_per_ha": 32,
    "potassium_kg_per_ha": 155,
    "soil_moisture_percent": 35,
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab"
  }
}
```

**Mocked Weather API Response:**
- Current temperature: 28°C
- Current humidity: 85%
- Current rainfall: 2mm
- 5-day forecast: temperatures 26–32°C, humidity consistently 80–90%, light intermittent rain

### Expected Behavior

| Step | Agent | Expected Action |
|------|-------|-----------------|
| 1 | Agent 1 (Farm Profile) | Accept all fields |
| 2 | Agent 2 (Soil Analysis) | All values within range; note moisture 35% is on the higher side |
| 3 | Agent 3 (Weather) | Flag high humidity + warm temperature combination as a significant agricultural condition |
| 4 | Agent 4 (Suitability) | Note weather conditions as a limiting factor; classify as "Suitable with Conditions" |
| 5 | Agent 5 (Irrigation) | Note adequate soil moisture; defer irrigation given wet conditions |
| 6 | Agent 6 (Advisory) | **Identify disease-favorable conditions** as a risk; clearly state this is NOT a diagnosis; recommend crop monitoring; suggest consulting an agronomist if symptoms appear |

### Agents Involved

All six agents. Agents 3 and 6 are the primary focus.

### Evidence Required

- Agent 3 must flag high humidity + warm temperature as a significant condition.
- Agent 6 must identify this as "disease-favorable conditions" — not "disease detected" or "disease diagnosed."
- Agent 6 must include an explicit disclaimer distinguishing environmental conditions from confirmed disease.
- Risk finding must reference specific weather data (humidity %, temperature °C).
- Mitigation options must include monitoring and professional consultation.
- Agent 6 must **not** prescribe specific fungicide names or dosages.

### Pass/Fail Criteria

| # | Criterion | Pass | Fail |
|---|-----------|------|------|
| 1 | High humidity + temperature flagged by weather agent | ✅ | Conditions not flagged |
| 2 | Risk identified as "disease-favorable conditions" (not "disease") | ✅ | Labeled as disease diagnosis or confirmed infection |
| 3 | Explicit disclaimer present distinguishing conditions from diagnosis | ✅ | No disclaimer |
| 4 | Risk references specific weather data points | ✅ | Vague risk without evidence |
| 5 | Monitoring advice included in mitigation options | ✅ | No monitoring guidance |
| 6 | Professional consultation recommended | ✅ | System presents itself as diagnostic authority |
| 7 | No specific fungicide/pesticide names or dosages prescribed | ✅ | Specific chemicals recommended |
| 8 | Suitability is "Suitable with Conditions" or "Agronomic Review Required" | ✅ | "Suitable" with no conditions noted |

---

## Test Environment

### Planned Setup

| Component | Configuration |
|-----------|--------------|
| **Python** | 3.11+ |
| **Test Framework** | pytest with pytest-asyncio for async tests |
| **API Testing** | FastAPI TestClient (httpx-based) |
| **External Services** | Mocked using `unittest.mock` or `responses` library |
| **Weather API** | Mocked responses with predefined JSON payloads |
| **Knowledge Base** | Test-specific ChromaDB collection with controlled reference documents |
| **Database** | SQLite in-memory for test isolation |
| **ML Service** | Mocked with predefined predictions |

### Test Data Management

- Each test case uses self-contained input data (no shared mutable state between tests).
- Mocked API responses are stored as JSON fixtures in `backend/tests/fixtures/`.
- Reference ranges used in tests match the configured knowledge base values, not invented thresholds.

---

## Test Execution Checklist

> **Status:** All items are planned. Checkboxes will be marked during Phase 7 execution.

- [ ] TC-01: Suitable conditions → "Suitable" category
- [ ] TC-02: pH outside range → "Suitable with Conditions" + deviation reported
- [ ] TC-03: Low moisture → Irrigation recommendation with reasoning
- [ ] TC-04: Significant rainfall → Irrigation deferred + waterlogging risk
- [ ] TC-05: Missing soil data → "Additional Information Required" + no zero defaults
- [ ] TC-06: Disease-favorable conditions → Risk identified (not diagnosed) + disclaimers
- [ ] Cross-test: All measured values preserved exactly in all test outputs
- [ ] Cross-test: All recommendations include source references
- [ ] Cross-test: All recommendations include uncertainty statements
- [ ] Cross-test: No fertilizer quantities or pesticide names invented
- [ ] Cross-test: `approval_status` defaults to "awaiting_review" in all recommendations
