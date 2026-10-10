import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Farm, Field } from '../types';
import { Map, RefreshCw } from 'lucide-react';

export default function FarmManagement() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newFarm, setNewFarm] = useState({ farm_id: '', name: '' });
  const [newField, setNewField] = useState({ field_id: '', farm_id: '', field_area_hectares: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const farmsRes = await api.getFarms();
      setFarms(farmsRes.items);
      const fieldsRes = await api.getFields();
      setFields(fieldsRes.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const farmsRes = await api.getFarms();
        const fieldsRes = await api.getFields();
        if (!cancelled) {
          setFarms(farmsRes.items);
          setFields(fieldsRes.items);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFarm(newFarm);
      setNewFarm({ farm_id: '', name: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createField(newField);
      setNewField({ field_id: '', farm_id: '', field_area_hectares: 0 });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-green-600" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Farm & Field Management</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Farms */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Map size={20} className="text-green-600"/> Farms</h2>
          <form onSubmit={handleCreateFarm} className="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Add New Farm</h3>
            <input
              required placeholder="Farm ID (e.g. F-1)" className="w-full p-2 border rounded"
              value={newFarm.farm_id} onChange={e => setNewFarm({...newFarm, farm_id: e.target.value})}
            />
            <input
              required placeholder="Farm Name" className="w-full p-2 border rounded"
              value={newFarm.name} onChange={e => setNewFarm({...newFarm, name: e.target.value})}
            />
            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">Create Farm</button>
          </form>

          <div className="space-y-3">
            {farms.length === 0 ? <p className="text-gray-500 italic">No farms found.</p> : farms.map(farm => (
              <div key={farm.farm_id} className="p-3 border rounded-lg hover:border-green-300 transition-colors">
                <div className="font-semibold">{farm.name}</div>
                <div className="text-sm text-gray-500">ID: {farm.farm_id}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Fields</h2>
          <form onSubmit={handleCreateField} className="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">Add New Field</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                required placeholder="Field ID (e.g. FLD-1)" className="p-2 border rounded"
                value={newField.field_id} onChange={e => setNewField({...newField, field_id: e.target.value})}
              />
              <select
                required className="p-2 border rounded bg-white"
                value={newField.farm_id} onChange={e => setNewField({...newField, farm_id: e.target.value})}
              >
                <option value="">Select Farm...</option>
                {farms.map(f => <option key={f.farm_id} value={f.farm_id}>{f.name}</option>)}
              </select>
            </div>
            <input
              required type="number" step="0.1" placeholder="Area (Hectares)" className="w-full p-2 border rounded"
              value={newField.field_area_hectares || ''} onChange={e => setNewField({...newField, field_area_hectares: parseFloat(e.target.value)})}
            />
            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">Create Field</button>
          </form>

          <div className="space-y-3">
            {fields.length === 0 ? <p className="text-gray-500 italic">No fields found.</p> : fields.map(field => (
              <div key={field.field_id} className="p-3 border rounded-lg hover:border-green-300 transition-colors">
                <div className="font-semibold flex justify-between">
                  <span>Field {field.field_id}</span>
                  <span className="text-sm font-normal text-gray-500">{field.field_area_hectares} ha</span>
                </div>
                <div className="text-sm text-gray-500">Farm: {field.farm_id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
