import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Farm, Field, SensorData, WeatherData, SoilTest, Activity } from '../types';
import {
  Cloud,
  Droplets,
  Thermometer,
  Wifi,
  Sprout,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  FlaskConical,
  Activity as ActivityIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const PALETTE = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#1b4332'];

export default function Dashboard() {
  const navigate = useNavigate();

  // Primary data states
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('all');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  // Interactive chart toggle: 'parcels' | 'crops'
  const [chartView, setChartView] = useState<'parcels' | 'crops'>('parcels');

  // Field-specific data
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [latestSoilTest, setLatestSoilTest] = useState<SoilTest | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // UI state
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  // Initial load: Fetch farms, fields, and activities
  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setLoadingInitial(true);
      setError(null);
      try {
        const [farmsRes, fieldsRes, actRes] = await Promise.all([
          api.getFarms().catch(() => ({ items: [] })),
          api.getFields().catch(() => ({ items: [] })),
          api.getActivities().catch(() => ({ items: [] }))
        ]);

        if (!active) return;

        setFarms(farmsRes.items);
        setFields(fieldsRes.items);
        setActivities(actRes.items);

        if (fieldsRes.items.length > 0) {
          setSelectedFieldId(fieldsRes.items[0].field_id);
        }
        setLastRefreshedAt(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to initialize dashboard');
      } finally {
        if (active) setLoadingInitial(false);
      }
    }

    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  // Filter fields according to selected farm
  const filteredFields = useMemo(() => {
    if (selectedFarmId === 'all') return fields;
    return fields.filter(f => f.farm_id === selectedFarmId);
  }, [fields, selectedFarmId]);

  // Handle farm filter change
  const handleFarmChange = (newFarmId: string) => {
    setSelectedFarmId(newFarmId);
    const available = newFarmId === 'all' ? fields : fields.filter(f => f.farm_id === newFarmId);
    if (available.length > 0) {
      setSelectedFieldId(available[0].field_id);
    } else {
      setSelectedFieldId('');
    }
  };

  // Fetch telemetry & soil data for current selected field
  const fetchTelemetry = useCallback(async (fieldId: string) => {
    if (!fieldId) {
      setWeather(null);
      setSensor(null);
      setLatestSoilTest(null);
      return;
    }

    setRefreshing(true);
    try {
      const [wData, sData, stData] = await Promise.all([
        api.getCurrentWeather(fieldId).catch(() => null),
        api.getSimulatedSensors(fieldId).catch(() => null),
        api.getLatestSoilTest(fieldId).catch(() => null)
      ]);

      setWeather(wData);
      setSensor(sData);
      setLatestSoilTest(stData);
      setLastRefreshedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err: any) {
      console.warn('Telemetry fetch error:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Sync telemetry when selected field changes
  useEffect(() => {
    if (selectedFieldId) {
      const timer = setTimeout(() => {
        fetchTelemetry(selectedFieldId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedFieldId, fetchTelemetry]);

  // Aggregate stats across filtered fields
  const totalAreaHectares = useMemo(() => {
    return filteredFields.reduce((acc, curr) => acc + (Number(curr.field_area_hectares) || 0), 0);
  }, [filteredFields]);

  const selectedFieldObj = useMemo(() => {
    return fields.find(f => f.field_id === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  const selectedFarmObj = useMemo(() => {
    if (!selectedFieldObj) return null;
    return farms.find(f => f.farm_id === selectedFieldObj.farm_id) || null;
  }, [farms, selectedFieldObj]);

  // Activities for currently selected field
  const fieldActivities = useMemo(() => {
    if (!selectedFieldId) return activities;
    return activities.filter(a => a.field_id === selectedFieldId);
  }, [activities, selectedFieldId]);

  const pendingActivitiesCount = useMemo(() => {
    return activities.filter(a => a.status === 'pending' || a.status === 'overdue').length;
  }, [activities]);

  const overdueActivitiesCount = useMemo(() => {
    return activities.filter(a => a.status === 'overdue').length;
  }, [activities]);

  // Toggle activity status
  const handleToggleActivity = async (activity: Activity) => {
    const nextStatus = activity.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateActivity(activity.activity_id, { status: nextStatus });
      setActivities(prev =>
        prev.map(a => (a.activity_id === activity.activity_id ? { ...a, status: nextStatus } : a))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update activity status');
    }
  };

  // Download PDF report
  const handleDownloadReport = async () => {
    if (!selectedFieldId) return;
    try {
      setDownloadingReport(true);
      await api.downloadReport(selectedFieldId);
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Chart data: Field area distribution
  const fieldAreaChartData = useMemo(() => {
    return filteredFields.map(f => ({
      name: f.field_id,
      area: Number(f.field_area_hectares) || 0,
      crop: f.proposed_crop || f.previous_crop || f.primary_crop_current || 'Not specified',
      irrigation: f.irrigation_source || 'Unknown'
    }));
  }, [filteredFields]);

  // Chart data: Crop variety distribution
  const cropDistributionChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFields.forEach(f => {
      const crop = f.proposed_crop || f.previous_crop || f.primary_crop_current || 'Unassigned';
      counts[crop] = (counts[crop] || 0) + (Number(f.field_area_hectares) || 1);
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value.toFixed(1))
    }));
  }, [filteredFields]);

  // Chart data: Real Soil / Nutrient Analysis (strictly from verified lab test)
  const nutrientChartData = useMemo(() => {
    if (!latestSoilTest) return [];

    const data: { parameter: string; value: number; unit: string }[] = [];

    const n = latestSoilTest.nitrogen_kg_per_ha;
    const p = latestSoilTest.phosphorus_kg_per_ha;
    const k = latestSoilTest.potassium_kg_per_ha;
    const moisture = latestSoilTest.soil_moisture_percent;
    const ph = latestSoilTest.soil_ph;

    if (n !== undefined && n !== null) {
      data.push({ parameter: 'Nitrogen (N)', value: Number(n), unit: 'kg/ha' });
    }
    if (p !== undefined && p !== null) {
      data.push({ parameter: 'Phosphorus (P)', value: Number(p), unit: 'kg/ha' });
    }
    if (k !== undefined && k !== null) {
      data.push({ parameter: 'Potassium (K)', value: Number(k), unit: 'kg/ha' });
    }
    if (moisture !== undefined && moisture !== null) {
      data.push({ parameter: 'Soil Moisture', value: Number(moisture), unit: '%' });
    }
    if (ph !== undefined && ph !== null) {
      data.push({ parameter: 'Soil pH', value: Number(ph), unit: 'pH' });
    }

    return data;
  }, [latestSoilTest]);

  if (loadingInitial) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 p-5 shadow-xs animate-pulse space-y-3">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-8 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-gray-100 p-6 animate-pulse" />
          <div className="h-80 bg-white rounded-2xl border border-gray-100 p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Top Banner & Context Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span>Agri-Telemetry Dashboard</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60 uppercase tracking-wider">
              Live Operations
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time agro-telemetry, soil parameters, and multi-field crop intelligence.
          </p>
        </div>

        {/* Global Action & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Farm Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Farm:</span>
            <select
              aria-label="Filter by Farm"
              className="text-xs sm:text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
              value={selectedFarmId}
              onChange={e => handleFarmChange(e.target.value)}
            >
              <option value="all">All Farms ({farms.length})</option>
              {farms.map(f => (
                <option key={f.farm_id} value={f.farm_id}>
                  {f.name} ({f.farm_id})
                </option>
              ))}
            </select>
          </div>

          {/* Field Selector */}
          {filteredFields.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs ring-1 ring-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Field:</span>
              <select
                aria-label="Select Field for Telemetry"
                className="text-xs sm:text-sm font-bold text-emerald-950 bg-transparent focus:outline-none cursor-pointer"
                value={selectedFieldId}
                onChange={e => setSelectedFieldId(e.target.value)}
              >
                {filteredFields.map(f => (
                  <option key={f.field_id} value={f.field_id}>
                    Field {f.field_id} ({f.field_area_hectares} ha)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => selectedFieldId && fetchTelemetry(selectedFieldId)}
            disabled={refreshing || !selectedFieldId}
            title="Refresh current field telemetry"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 shadow-xs text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Quick PDF Report Download */}
          {selectedFieldId && (
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Download size={14} />
              <span>{downloadingReport ? 'Building PDF...' : 'Field Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
          <div className="flex-1 text-sm font-medium">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs underline text-red-800 mt-1 font-semibold hover:text-red-950"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Empty State Banner if no fields are registered */}
      {fields.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Sprout size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome to AgriSārathi Farm Intelligence
          </h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
            No agricultural fields have been registered yet. Start by defining your farm parameters and registering your first field parcel.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/farms')}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md transition-all hover:shadow-lg"
            >
              <PlusCircle size={18} />
              Set Up Farms & Fields
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Total Cultivated Area */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Cultivated Area</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                  <Layers size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {totalAreaHectares.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-gray-500">hectares</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="font-medium text-emerald-700">
                  {filteredFields.length} {filteredFields.length === 1 ? 'Field registered' : 'Fields registered'}
                </span>
                <span>{selectedFarmId === 'all' ? 'Across all farms' : 'In selected farm'}</span>
              </div>
            </div>

            {/* Card 2: Field Crop & Irrigation Profile */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Current Field Profile</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                  <Sprout size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-extrabold text-gray-900 capitalize tracking-tight truncate">
                  {selectedFieldObj?.proposed_crop || selectedFieldObj?.previous_crop || selectedFieldObj?.primary_crop_current || 'Unspecified'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="inline-flex items-center gap-1 font-medium text-gray-700 capitalize">
                  <Droplets size={12} className="text-cyan-600" />
                  {selectedFieldObj?.irrigation_source || 'Rainfed / Natural'}
                </span>
                <span className="text-emerald-700 font-semibold capitalize">
                  {selectedFieldObj?.water_availability ? `${selectedFieldObj.water_availability} water` : 'Water status: N/A'}
                </span>
              </div>
            </div>

            {/* Card 3: Live Soil Moisture / Health */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Soil Moisture & Health</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                  <Droplets size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                {sensor?.readings?.soil_moisture_percent?.value !== undefined ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {sensor.readings.soil_moisture_percent.value}
                    </span>
                    <span className="text-sm font-semibold text-gray-500">% volumetric</span>
                  </>
                ) : latestSoilTest?.soil_moisture_percent !== undefined ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {latestSoilTest.soil_moisture_percent}
                    </span>
                    <span className="text-sm font-semibold text-gray-500">% lab test</span>
                  </>
                ) : (
                  <span className="text-base font-bold text-gray-400">Awaiting Sensor</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="font-medium text-emerald-800">
                  {latestSoilTest?.soil_ph !== undefined
                    ? `pH ${latestSoilTest.soil_ph}`
                    : sensor?.readings?.soil_ph?.value !== undefined
                    ? `pH ${sensor.readings.soil_ph.value}`
                    : 'pH Unmeasured'}
                </span>
                <span className="text-xs text-gray-400">
                  {sensor?.is_simulated ? 'Telemetry Simulated' : 'Sensor Telemetry'}
                </span>
              </div>
            </div>

            {/* Card 4: Operations & Tasks */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Scheduled Operations</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
                  <Calendar size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {fieldActivities.length}
                </span>
                <span className="text-sm font-semibold text-gray-500">activities</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="text-amber-700 font-semibold">
                  {pendingActivitiesCount} Pending
                </span>
                {overdueActivitiesCount > 0 ? (
                  <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md">
                    {overdueActivitiesCount} Overdue
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">On schedule</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Visualizations Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Field Area & Crop Allocation with View Toggle */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-700" />
                    {chartView === 'parcels' ? 'Field Area Distribution' : 'Crop Diversity Breakdown'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {chartView === 'parcels'
                      ? 'Hectares mapped per field parcel under active cultivation'
                      : 'Hectare allocation across crop types'}
                  </p>
                </div>
                {/* Interactive View Toggle */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setChartView('parcels')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      chartView === 'parcels'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Parcels
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView('crops')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      chartView === 'crops'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <PieChartIcon size={12} />
                    Crops
                  </button>
                </div>
              </div>

              {filteredFields.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic">
                  No fields available for the current filter.
                </div>
              ) : chartView === 'parcels' ? (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fieldAreaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        unit=" ha"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c2419',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#ffffff',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: '#6ee7b7' }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} hectares (${item.payload.crop})`,
                          'Area'
                        ]}
                        labelFormatter={(label) => `Field: ${label}`}
                      />
                      <Bar dataKey="area" radius={[6, 6, 0, 0]}>
                        {fieldAreaChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cropDistributionChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={3}
                      >
                        {cropDistributionChartData.map((_entry, index) => (
                          <Cell key={`crop-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c2419',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#ffffff'
                        }}
                        itemStyle={{ color: '#6ee7b7' }}
                        formatter={(val: any) => [`${val} ha`, 'Cultivated Area']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Soil Nutrients & Telemetry Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FlaskConical size={18} className="text-emerald-700" />
                    Soil Nutrients & Chemical Readings
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedFieldId ? `Parameters recorded for Field ${selectedFieldId}` : 'Select a field'}
                  </p>
                </div>
                {latestSoilTest && (
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Verified Lab Soil Test
                  </span>
                )}
              </div>

              {nutrientChartData.length > 0 ? (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nutrientChartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="parameter"
                        stroke="#64748b"
                        fontSize={11}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0c2419',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#ffffff',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: '#a7f3d0' }}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val} ${item.payload.unit}`,
                          'Measurement'
                        ]}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {nutrientChartData.map((_entry, index) => (
                          <Cell
                            key={`nutr-${index}`}
                            fill={['#2d6a4f', '#40916c', '#52b788', '#0284c7', '#d97706'][index % 5]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center bg-gray-50/70 rounded-xl border border-dashed border-gray-200 p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FlaskConical size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">No Soil Test On Record</h3>
                    <p className="text-xs text-gray-500 max-w-xs mt-1">
                      No soil test has been logged yet for Field <span className="font-mono font-medium">{selectedFieldId}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/farms')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <PlusCircle size={14} />
                    Record Soil Test in Field Management
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Detail & Environmental Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Telemetry Sensors Panel (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Wifi size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Sensor Telemetry & In-Situ Readings
                    </h2>
                    <p className="text-xs text-gray-500">
                      Field <span className="font-mono font-medium text-emerald-700">{selectedFieldId}</span>
                      {lastRefreshedAt && ` • Updated at ${lastRefreshedAt}`}
                    </p>
                  </div>
                </div>

                {sensor && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      sensor.is_simulated
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sensor.is_simulated ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                    />
                    {sensor.is_simulated ? 'Simulated Telemetry' : 'Live Field Sensor'}
                  </span>
                )}
              </div>

              {sensor && sensor.status === 'active' && sensor.readings ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Soil Moisture */}
                  <div className="bg-[#f8faf9] p-4 rounded-xl border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1">
                        <Droplets size={14} className="text-blue-500" />
                        Moisture
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">Volumetric</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {sensor.readings.soil_moisture_percent?.value ?? '--'}
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        {sensor.readings.soil_moisture_percent?.unit || '%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, sensor.readings.soil_moisture_percent?.value || 0))}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Soil Temp */}
                  <div className="bg-[#f8faf9] p-4 rounded-xl border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1">
                        <Thermometer size={14} className="text-amber-500" />
                        Temperature
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">Soil</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {sensor.readings.soil_temperature_c?.value ?? '--'}
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        {sensor.readings.soil_temperature_c?.unit || '°C'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((sensor.readings.soil_temperature_c?.value || 20) / 45) * 100))}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Electrical Conductivity */}
                  <div className="bg-[#f8faf9] p-4 rounded-xl border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1">
                        <ActivityIcon size={14} className="text-emerald-600" />
                        Salinity / EC
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">EC</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {sensor.readings.electrical_conductivity_ds_m?.value ?? '--'}
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        {sensor.readings.electrical_conductivity_ds_m?.unit || 'dS/m'}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-800 font-medium">Optimal Salinity</div>
                  </div>

                  {/* Soil pH */}
                  <div className="bg-[#f8faf9] p-4 rounded-xl border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1">
                        <FlaskConical size={14} className="text-purple-600" />
                        Soil pH
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">0-14</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {sensor.readings.soil_ph?.value ?? latestSoilTest?.soil_ph ?? '--'}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {Number(sensor.readings.soil_ph?.value || latestSoilTest?.soil_ph || 7) < 6.5
                        ? 'Slightly Acidic'
                        : Number(sensor.readings.soil_ph?.value || latestSoilTest?.soil_ph || 7) > 7.5
                        ? 'Alkaline'
                        : 'Neutral Range'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 text-sm space-y-1">
                  <p className="font-medium text-gray-700">Sensor Offline or Telemetry Unavailable</p>
                  <p className="text-xs text-gray-400">
                    Simulated sensors will automatically activate when field telemetry is polled.
                  </p>
                </div>
              )}

              {/* NPK Detailed Card */}
              {sensor?.readings && (
                <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Macro-Nutrient Ratios (N-P-K)
                    </h3>
                    <p className="text-xs text-emerald-800/80">Available plant nutrients in topsoil</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase">Nitrogen</span>
                      <span className="text-base font-extrabold text-emerald-900">
                        {sensor.readings.nitrogen_mg_kg?.value ?? '--'}{' '}
                        <span className="text-xs font-normal text-gray-500">mg/kg</span>
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase">Phosphorus</span>
                      <span className="text-base font-extrabold text-emerald-900">
                        {sensor.readings.phosphorus_mg_kg?.value ?? '--'}{' '}
                        <span className="text-xs font-normal text-gray-500">mg/kg</span>
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase">Potassium</span>
                      <span className="text-base font-extrabold text-emerald-900">
                        {sensor.readings.potassium_mg_kg?.value ?? '--'}{' '}
                        <span className="text-xs font-normal text-gray-500">mg/kg</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Environmental & Weather Telemetry (1 Col) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Cloud size={18} className="text-blue-500" />
                    Atmospheric Feed
                  </h2>
                  <span className="text-xs font-semibold text-gray-500">Microclimate</span>
                </div>

                {weather ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-3xl font-black text-gray-900">{weather.temperature_c}°C</span>
                        <p className="text-xs text-gray-500 capitalize">{weather.conditions.replace('_', ' ')}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Cloud size={24} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-400 block">Precipitation</span>
                        <span className="font-bold text-gray-800 text-sm">{weather.precipitation_mm} mm</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-400 block">Humidity</span>
                        <span className="font-bold text-gray-800 text-sm">{weather.humidity_percent}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-100/80 text-xs text-gray-600 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                      <MapPin size={14} className="text-emerald-600" />
                      <span>Farm Geo-Coordinates</span>
                    </div>
                    <p className="text-gray-500 leading-relaxed">
                      {selectedFarmObj?.latitude && selectedFarmObj?.longitude
                        ? `Configured at Latitude ${selectedFarmObj.latitude}°, Longitude ${selectedFarmObj.longitude}°.`
                        : 'No GPS coordinates defined for the parent farm. Weather station connects automatically when latitude/longitude are registered.'}
                    </p>
                    <p className="text-[11px] text-gray-400 italic">
                      Weather data will render when active station feed is present.
                    </p>
                  </div>
                )}
              </div>

              {/* Direct Crop Advisory CTA Card */}
              <div className="pt-4 border-t border-gray-100">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">AI Crop Advisory</span>
                    <ArrowUpRight size={16} className="text-emerald-300" />
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    Evaluate crop suitability & irrigation decisions using our multi-agent RAG engine.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/advisory')}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors text-center shadow-xs"
                  >
                    Generate Field Advisory
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Planner & Tasks Quick Panel */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-700" />
                  Field Action Planner & Alerts
                </h2>
                <p className="text-xs text-gray-500">
                  Tasks scheduled for Field <span className="font-mono font-medium">{selectedFieldId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/activities')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Open Full Planner</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            {fieldActivities.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 space-y-2">
                <p className="text-sm font-medium text-gray-600">No scheduled activities for this field.</p>
                <p className="text-xs text-gray-400">
                  Plan fertilization, irrigation, or soil testing in the Activity Planner.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/activities')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  <PlusCircle size={14} />
                  Schedule Action Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fieldActivities.slice(0, 6).map(act => (
                  <div
                    key={act.activity_id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      act.status === 'completed'
                        ? 'bg-gray-50/70 border-gray-200 opacity-60'
                        : act.status === 'overdue'
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-white border-gray-200/80 hover:border-emerald-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleActivity(act)}
                      title={act.status === 'completed' ? 'Mark pending' : 'Mark completed'}
                      className="mt-0.5 hover:scale-110 transition-transform shrink-0"
                    >
                      {act.status === 'completed' ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : act.status === 'overdue' ? (
                        <AlertTriangle size={18} className="text-red-500" />
                      ) : (
                        <Clock size={18} className="text-amber-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            act.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}
                        >
                          {act.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            act.status === 'completed'
                              ? 'bg-gray-100 text-gray-500'
                              : act.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        Due: {act.due_date || 'No due date'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
