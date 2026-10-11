import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Farm, Field } from '../types';
import { MapPin, RefreshCw, Sprout, PlusCircle, Layers, Droplets, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function FarmManagement() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Farm form state
  const [newFarm, setNewFarm] = useState({
    farm_id: '',
    name: '',
    owner_name: '',
    location_name: '',
    latitude: '',
    longitude: ''
  });

  // New Field form state
  const [newField, setNewField] = useState({
    field_id: '',
    farm_id: '',
    field_area_hectares: '',
    soil_type: 'loamy',
    proposed_crop: '',
    irrigation_source: 'borewell',
    water_availability: 'adequate'
  });

  // Quick Soil Test form state
  const [soilTestFieldId, setSoilTestFieldId] = useState('');
  const [newSoilTest, setNewSoilTest] = useState({
    soil_test_id: '',
    soil_ph: '',
    nitrogen_kg_per_ha: '',
    phosphorus_kg_per_ha: '',
    potassium_kg_per_ha: '',
    soil_moisture_percent: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [farmsRes, fieldsRes] = await Promise.all([api.getFarms(), api.getFields()]);
      setFarms(farmsRes.items);
      setFields(fieldsRes.items);
      if (fieldsRes.items.length > 0) {
        setSoilTestFieldId(prev => prev || fieldsRes.items[0].field_id);
      }
      if (farmsRes.items.length > 0) {
        setNewField(prev => ({ ...prev, farm_id: prev.farm_id || farmsRes.items[0].farm_id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load farm management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [farmsRes, fieldsRes] = await Promise.all([api.getFarms(), api.getFields()]);
        if (!cancelled) {
          setFarms(farmsRes.items);
          setFields(fieldsRes.items);
          if (fieldsRes.items.length > 0) {
            setSoilTestFieldId(prev => prev || fieldsRes.items[0].field_id);
          }
          if (farmsRes.items.length > 0) {
            setNewField(prev => ({ ...prev, farm_id: prev.farm_id || farmsRes.items[0].farm_id }));
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load farm data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload: Partial<Farm> = {
        farm_id: newFarm.farm_id.trim(),
        name: newFarm.name.trim(),
        owner_name: newFarm.owner_name.trim() || undefined,
        location_name: newFarm.location_name.trim() || undefined,
        latitude: newFarm.latitude ? parseFloat(newFarm.latitude) : undefined,
        longitude: newFarm.longitude ? parseFloat(newFarm.longitude) : undefined
      };
      await api.createFarm(payload);
      setNewFarm({ farm_id: '', name: '', owner_name: '', location_name: '', latitude: '', longitude: '' });
      setSuccessMessage(`Farm "${payload.name}" created successfully!`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create farm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const area = parseFloat(newField.field_area_hectares);
      if (isNaN(area) || area <= 0) {
        throw new Error('Field area must be greater than 0');
      }
      const payload: Partial<Field> = {
        field_id: newField.field_id.trim(),
        farm_id: newField.farm_id,
        field_area_hectares: area,
        soil_type: newField.soil_type || undefined,
        proposed_crop: newField.proposed_crop.trim() || undefined,
        irrigation_source: newField.irrigation_source || undefined,
        water_availability: newField.water_availability || undefined
      };
      await api.createField(payload);
      setNewField({
        field_id: '',
        farm_id: '',
        field_area_hectares: '',
        soil_type: 'loamy',
        proposed_crop: '',
        irrigation_source: 'borewell',
        water_availability: 'adequate'
      });
      setSuccessMessage(`Field "${payload.field_id}" registered successfully!`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create field');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSoilTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soilTestFieldId) return;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const testId = newSoilTest.soil_test_id.trim() || `ST-${Date.now().toString().slice(-4)}`;
      await api.createSoilTest({
        soil_test_id: testId,
        field_id: soilTestFieldId,
        soil_ph: newSoilTest.soil_ph ? parseFloat(newSoilTest.soil_ph) : undefined,
        nitrogen_kg_per_ha: newSoilTest.nitrogen_kg_per_ha ? parseFloat(newSoilTest.nitrogen_kg_per_ha) : undefined,
        phosphorus_kg_per_ha: newSoilTest.phosphorus_kg_per_ha ? parseFloat(newSoilTest.phosphorus_kg_per_ha) : undefined,
        potassium_kg_per_ha: newSoilTest.potassium_kg_per_ha ? parseFloat(newSoilTest.potassium_kg_per_ha) : undefined,
        soil_moisture_percent: newSoilTest.soil_moisture_percent ? parseFloat(newSoilTest.soil_moisture_percent) : undefined,
        measurement_timestamp: new Date().toISOString(),
        measurement_source: 'Farmer Field Record'
      });
      setNewSoilTest({
        soil_test_id: '',
        soil_ph: '',
        nitrogen_kg_per_ha: '',
        phosphorus_kg_per_ha: '',
        potassium_kg_per_ha: '',
        soil_moisture_percent: ''
      });
      setSuccessMessage(`Soil test logged for Field "${soilTestFieldId}"! Visible immediately in Dashboard.`);
    } catch (err: any) {
      setError(err.message || 'Failed to record soil test');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="animate-spin text-emerald-700" size={32} />
        <p className="text-sm font-medium text-gray-500">Loading farm and field infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Layers className="text-emerald-700" size={28} />
            Farm & Field Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure farm properties, geographic coordinates, soil categories, and parcel boundaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-white rounded-xl border border-gray-200 text-gray-600 shadow-xs">
            {farms.length} {farms.length === 1 ? 'Farm' : 'Farms'} • {fields.length} {fields.length === 1 ? 'Field' : 'Fields'}
          </span>
          <button
            type="button"
            onClick={loadData}
            title="Refresh list"
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
          <div className="flex-1 text-sm font-medium">
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
          <div className="flex-1 text-sm font-medium">
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Farms & Fields Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Farms Section */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-emerald-700" />
              Agricultural Farms
            </h2>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {farms.length} Registered
            </span>
          </div>

          {/* Add Farm Form */}
          <form onSubmit={handleCreateFarm} className="space-y-3.5 p-4 sm:p-5 bg-[#f8faf9] rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Register New Farm</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Farm ID *</label>
                <input
                  required
                  placeholder="e.g. FARM-001"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.farm_id}
                  onChange={e => setNewFarm({ ...newFarm, farm_id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Farm Name *</label>
                <input
                  required
                  placeholder="e.g. Sunrise Organic Farm"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.name}
                  onChange={e => setNewFarm({ ...newFarm, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Owner Name</label>
                <input
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.owner_name}
                  onChange={e => setNewFarm({ ...newFarm, owner_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Location / District</label>
                <input
                  placeholder="e.g. Lucknow, UP"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.location_name}
                  onChange={e => setNewFarm({ ...newFarm, location_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 26.85"
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.latitude}
                  onChange={e => setNewFarm({ ...newFarm, latitude: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 80.91"
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newFarm.longitude}
                  onChange={e => setNewFarm({ ...newFarm, longitude: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-700 text-white font-semibold text-sm p-2.5 rounded-lg hover:bg-emerald-800 shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={16} />
              {submitting ? 'Registering...' : 'Register Farm'}
            </button>
          </form>

          {/* Farm List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Registered Farms</h3>
            {farms.length === 0 ? (
              <p className="text-gray-400 italic text-sm py-4 text-center">No farms registered yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {farms.map(farm => (
                  <div
                    key={farm.farm_id}
                    className="p-3.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">{farm.name}</span>
                      <span className="text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        {farm.farm_id}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {farm.owner_name && <span>Owner: {farm.owner_name}</span>}
                      {farm.location_name && <span>• {farm.location_name}</span>}
                      {farm.latitude && farm.longitude && (
                        <span className="font-mono text-[11px]">
                          • {farm.latitude.toFixed(2)}°, {farm.longitude.toFixed(2)}°
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fields Section */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sprout size={20} className="text-emerald-700" />
              Field Parcels
            </h2>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {fields.length} Mapped
            </span>
          </div>

          {/* Add Field Form */}
          <form onSubmit={handleCreateField} className="space-y-3.5 p-4 sm:p-5 bg-[#f8faf9] rounded-xl border border-gray-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Add New Field Parcel</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Field ID *</label>
                <input
                  required
                  placeholder="e.g. FIELD-001"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.field_id}
                  onChange={e => setNewField({ ...newField, field_id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Parent Farm *</label>
                <select
                  required
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  value={newField.farm_id}
                  onChange={e => setNewField({ ...newField, farm_id: e.target.value })}
                >
                  <option value="">Select Farm...</option>
                  {farms.map(f => (
                    <option key={f.farm_id} value={f.farm_id}>
                      {f.name} ({f.farm_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Area (Hectares) *</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 5.0"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.field_area_hectares}
                  onChange={e => setNewField({ ...newField, field_area_hectares: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Proposed / Current Crop</label>
                <input
                  placeholder="e.g. maize, wheat"
                  className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.proposed_crop}
                  onChange={e => setNewField({ ...newField, proposed_crop: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Soil Type</label>
                <select
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.soil_type}
                  onChange={e => setNewField({ ...newField, soil_type: e.target.value })}
                >
                  <option value="loamy">Loamy</option>
                  <option value="clay">Clay</option>
                  <option value="sandy">Sandy</option>
                  <option value="alluvial">Alluvial</option>
                  <option value="black">Black Soil</option>
                  <option value="red">Red Soil</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Irrigation Source</label>
                <select
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.irrigation_source}
                  onChange={e => setNewField({ ...newField, irrigation_source: e.target.value })}
                >
                  <option value="borewell">Borewell</option>
                  <option value="canal">Canal</option>
                  <option value="tubewell">Tubewell</option>
                  <option value="rainfed">Rainfed</option>
                  <option value="drip">Drip</option>
                  <option value="sprinkler">Sprinkler</option>
                  <option value="river">River</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Water Security</label>
                <select
                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newField.water_availability}
                  onChange={e => setNewField({ ...newField, water_availability: e.target.value })}
                >
                  <option value="adequate">Adequate</option>
                  <option value="limited">Limited</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-700 text-white font-semibold text-sm p-2.5 rounded-lg hover:bg-emerald-800 shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle size={16} />
              {submitting ? 'Adding...' : 'Create Field Parcel'}
            </button>
          </form>

          {/* Fields List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Registered Field Parcels</h3>
            {fields.length === 0 ? (
              <p className="text-gray-400 italic text-sm py-4 text-center">No field parcels registered yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {fields.map(field => (
                  <div
                    key={field.field_id}
                    className="p-3.5 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 transition-colors shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">Field {field.field_id}</span>
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                        {field.field_area_hectares} ha
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">Farm: {field.farm_id}</span>
                      {field.proposed_crop && (
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-medium">
                          Crop: {field.proposed_crop}
                        </span>
                      )}
                      {field.soil_type && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                          {field.soil_type}
                        </span>
                      )}
                      {field.irrigation_source && (
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Droplets size={12} className="text-cyan-600" />
                          {field.irrigation_source}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Soil Test Logging Section */}
      {fields.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical size={20} className="text-emerald-700" />
                Quick Soil Test Logger
              </h2>
              <p className="text-xs text-gray-500">
                Log real laboratory soil analysis to power telemetry visualizations on the Dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSoilTest} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target Field *</label>
              <select
                required
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={soilTestFieldId}
                onChange={e => setSoilTestFieldId(e.target.value)}
              >
                <option value="">Select Field...</option>
                {fields.map(f => (
                  <option key={f.field_id} value={f.field_id}>
                    Field {f.field_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Soil pH (0-14)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                placeholder="e.g. 6.8"
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={newSoilTest.soil_ph}
                onChange={e => setNewSoilTest({ ...newSoilTest, soil_ph: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nitrogen (kg/ha)</label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 85"
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={newSoilTest.nitrogen_kg_per_ha}
                onChange={e => setNewSoilTest({ ...newSoilTest, nitrogen_kg_per_ha: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phosphorus (kg/ha)</label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 40"
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={newSoilTest.phosphorus_kg_per_ha}
                onChange={e => setNewSoilTest({ ...newSoilTest, phosphorus_kg_per_ha: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Potassium (kg/ha)</label>
              <input
                type="number"
                step="1"
                placeholder="e.g. 55"
                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={newSoilTest.potassium_kg_per_ha}
                onChange={e => setNewSoilTest({ ...newSoilTest, potassium_kg_per_ha: e.target.value })}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || !soilTestFieldId}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm p-2 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <FlaskConical size={16} />
                Save Test
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
