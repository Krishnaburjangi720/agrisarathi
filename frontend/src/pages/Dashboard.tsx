import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Field, SensorData, WeatherData } from '../types';
import { Cloud, Droplets, Thermometer, Wifi } from 'lucide-react';

export default function Dashboard() {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<string>('');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [sensor, setSensor] = useState<SensorData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getFields().then(res => {
      setFields(res.items);
      if (res.items.length > 0) {
        setSelectedField(res.items[0].field_id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedField) return;
    const fetchTelemetry = async () => {
      setLoading(true);
      setError(null);
      try {
        const [wData, sData] = await Promise.all([
          api.getCurrentWeather(selectedField).catch(() => null),
          api.getSimulatedSensors(selectedField).catch(() => null)
        ]);
        setWeather(wData);
        setSensor(sData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTelemetry();
  }, [selectedField]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Telemetry Dashboard</h1>
        {fields.length > 0 && (
          <select
            className="p-2 border rounded-lg bg-white shadow-sm font-medium"
            value={selectedField}
            onChange={e => setSelectedField(e.target.value)}
          >
            {fields.map(f => <option key={f.field_id} value={f.field_id}>{f.field_id}</option>)}
          </select>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}
      {fields.length === 0 ? (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
          No fields found. Please create a farm and field first.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Weather Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-800">
              <Cloud className="text-blue-500" /> Current Weather
            </h2>
            {loading ? <div className="text-gray-400">Loading...</div> : weather ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Temperature</div>
                  <div className="text-2xl font-bold">{weather.temperature_c}°C</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Precipitation</div>
                  <div className="text-2xl font-bold">{weather.precipitation_mm} mm</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Humidity</div>
                  <div className="text-2xl font-bold">{weather.humidity_percent}%</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Conditions</div>
                  <div className="text-lg font-bold capitalize">{weather.conditions.replace('_', ' ')}</div>
                </div>
              </div>
            ) : <div className="text-gray-500">Weather data unavailable.</div>}
          </div>

          {/* Sensor Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 relative">
            {sensor?.is_simulated && (
              <span className="absolute top-4 right-4 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
                Simulated
              </span>
            )}
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-800">
              <Wifi className="text-emerald-500" /> Field Sensors
            </h2>
            {loading ? <div className="text-gray-400">Loading...</div> : sensor && sensor.status === 'active' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-sm text-emerald-600 font-medium flex items-center gap-1"><Droplets size={16}/> Moisture</div>
                  <div className="text-2xl font-bold">
                    {sensor.readings.soil_moisture_percent?.value ?? '--'}
                    <span className="text-sm font-normal text-gray-500 ml-1">{sensor.readings.soil_moisture_percent?.unit}</span>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <div className="text-sm text-emerald-600 font-medium flex items-center gap-1"><Thermometer size={16}/> Temperature</div>
                  <div className="text-2xl font-bold">
                    {sensor.readings.soil_temperature_c?.value ?? '--'}
                    <span className="text-sm font-normal text-gray-500 ml-1">{sensor.readings.soil_temperature_c?.unit}</span>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg col-span-2">
                  <div className="text-sm text-emerald-600 font-medium">Nutrients (NPK)</div>
                  <div className="flex justify-between mt-2">
                    <div><span className="text-gray-500">N:</span> <span className="font-bold">{sensor.readings.nitrogen_mg_kg?.value ?? '--'}</span></div>
                    <div><span className="text-gray-500">P:</span> <span className="font-bold">{sensor.readings.phosphorus_mg_kg?.value ?? '--'}</span></div>
                    <div><span className="text-gray-500">K:</span> <span className="font-bold">{sensor.readings.potassium_mg_kg?.value ?? '--'}</span></div>
                  </div>
                </div>
              </div>
            ) : <div className="text-gray-500">Sensor offline or data unavailable.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
