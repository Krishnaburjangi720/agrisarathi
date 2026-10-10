import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Activity, Field } from '../types';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newActivity, setNewActivity] = useState({
    activity_id: '',
    field_id: '',
    title: '',
    description: '',
    due_date: ''
  });

  const loadData = async () => {
    try {
      const [actRes, fldRes] = await Promise.all([api.getActivities(), api.getFields()]);
      setActivities(actRes.items);
      setFields(fldRes.items);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [actRes, fldRes] = await Promise.all([api.getActivities(), api.getFields()]);
        if (!ignore) {
          setActivities(actRes.items);
          setFields(fldRes.items);
        }
      } catch (err: any) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createActivity(newActivity);
      setNewActivity({ activity_id: '', field_id: '', title: '', description: '', due_date: '' });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (activity: Activity) => {
    const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateActivity(activity.activity_id, { status: newStatus });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="text-green-500" size={20} />;
    if (status === 'overdue') return <AlertCircle className="text-red-500" size={20} />;
    return <Clock className="text-amber-500" size={20} />;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Activity Planner</h1>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">New Activity</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input required placeholder="Activity ID (e.g. ACT-1)" className="w-full p-2 border rounded"
              value={newActivity.activity_id} onChange={e => setNewActivity({...newActivity, activity_id: e.target.value})} />

            <select required className="w-full p-2 border rounded bg-white"
              value={newActivity.field_id} onChange={e => setNewActivity({...newActivity, field_id: e.target.value})}>
              <option value="">Select Field...</option>
              {fields.map(f => <option key={f.field_id} value={f.field_id}>{f.field_id}</option>)}
            </select>

            <input required placeholder="Task Title" className="w-full p-2 border rounded"
              value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} />

            <textarea placeholder="Description (Optional)" className="w-full p-2 border rounded"
              value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} />

            <input type="date" className="w-full p-2 border rounded text-gray-700"
              value={newActivity.due_date} onChange={e => setNewActivity({...newActivity, due_date: e.target.value})} />

            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 flex items-center justify-center gap-2">
              <Calendar size={18} /> Schedule Task
            </button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Tasks
            {activities.some(a => a.status === 'overdue') && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Overdue Alert</span>
            )}
          </h2>
          {loading ? <p>Loading...</p> : activities.length === 0 ? (
            <p className="text-gray-500 italic bg-white p-6 rounded-xl border border-gray-100">No scheduled activities.</p>
          ) : (
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.activity_id} className={`p-4 rounded-xl border flex items-start gap-4 transition-colors ${act.status === 'completed' ? 'bg-gray-50 border-gray-200 opacity-60' : act.status === 'overdue' ? 'bg-red-50 border-red-200' : 'bg-white border-amber-100'}`}>
                  <button onClick={() => handleToggleStatus(act)} className="mt-1 hover:scale-110 transition-transform">
                    {getStatusIcon(act.status)}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${act.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{act.title}</h3>
                    <div className="text-sm text-gray-600 mt-1">Field: {act.field_id} | Due: {act.due_date || 'No Date'}</div>
                    {act.description && <p className="text-sm text-gray-500 mt-2">{act.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
