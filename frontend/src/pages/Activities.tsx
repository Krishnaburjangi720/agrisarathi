import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import type { Activity, Field } from '../types';
import { Calendar, CheckCircle2, Clock, AlertTriangle, PlusCircle, Filter } from 'lucide-react';

const COMMON_TASKS = [
  'Irrigation cycle scheduled',
  'Soil NPK testing',
  'Pest & disease scouting',
  'Nitrogen top-dressing',
  'Harvest planning'
];

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [filterFieldId, setFilterFieldId] = useState<string>('all');

  const [newActivity, setNewActivity] = useState({
    activity_id: '',
    field_id: '',
    title: '',
    description: '',
    due_date: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [actRes, fldRes] = await Promise.all([api.getActivities(), api.getFields()]);
      setActivities(actRes.items);
      setFields(fldRes.items);
      if (fldRes.items.length > 0 && !newActivity.field_id) {
        setNewActivity(prev => ({ ...prev, field_id: fldRes.items[0].field_id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
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
          if (fldRes.items.length > 0) {
            setNewActivity(prev => ({ ...prev, field_id: prev.field_id || fldRes.items[0].field_id }));
          }
        }
      } catch (err: any) {
        if (!ignore) setError(err.message || 'Failed to load initial data');
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
    if (!newActivity.field_id || !newActivity.title) return;
    setSubmitting(true);
    setError(null);
    try {
      const actId = newActivity.activity_id.trim() || `ACT-${Date.now().toString().slice(-4)}`;
      await api.createActivity({
        activity_id: actId,
        field_id: newActivity.field_id,
        title: newActivity.title.trim(),
        description: newActivity.description.trim() || undefined,
        due_date: newActivity.due_date || undefined
      });
      setNewActivity({
        activity_id: '',
        field_id: fields.length > 0 ? fields[0].field_id : '',
        title: '',
        description: '',
        due_date: ''
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (activity: Activity) => {
    const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateActivity(activity.activity_id, { status: newStatus });
      setActivities(prev =>
        prev.map(a => (a.activity_id === activity.activity_id ? { ...a, status: newStatus } : a))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update task status');
    }
  };

  // Filtered task list
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchesStatus =
        filterStatus === 'all' ? true : filterStatus === 'pending' ? a.status === 'pending' : a.status === filterStatus;
      const matchesField = filterFieldId === 'all' ? true : a.field_id === filterFieldId;
      return matchesStatus && matchesField;
    });
  }, [activities, filterStatus, filterFieldId]);

  const counts = useMemo(() => {
    return {
      all: activities.length,
      pending: activities.filter(a => a.status === 'pending').length,
      overdue: activities.filter(a => a.status === 'overdue').length,
      completed: activities.filter(a => a.status === 'completed').length
    };
  }, [activities]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider">
            <AlertTriangle size={12} />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-emerald-700" size={28} />
            Farm Activity Planner & Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize seasonal farming operations, irrigation schedules, and field milestones.
          </p>
        </div>

        {/* Status Count Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 shadow-xs">
            {counts.all} Total Tasks
          </span>
          <span className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800 shadow-xs">
            {counts.pending} Pending
          </span>
          {counts.overdue > 0 && (
            <span className="bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 text-red-700 font-bold shadow-xs">
              {counts.overdue} Overdue
            </span>
          )}
          <span className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 shadow-xs">
            {counts.completed} Done
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Grid: Form + Task Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* New Activity Form (1 Col) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PlusCircle size={18} className="text-emerald-700" />
              Schedule New Action
            </h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Field Parcel *</label>
              <select
                required
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                value={newActivity.field_id}
                onChange={e => setNewActivity({ ...newActivity, field_id: e.target.value })}
              >
                <option value="">Select Field...</option>
                {fields.map(f => (
                  <option key={f.field_id} value={f.field_id}>
                    Field {f.field_id} ({f.field_area_hectares} ha)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Activity Title *</label>
              <input
                required
                placeholder="e.g. Apply urea fertilizer"
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={newActivity.title}
                onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
              />
            </div>

            {/* Quick Title Presets */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {COMMON_TASKS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNewActivity(prev => ({ ...prev, title: preset }))}
                  className="text-[11px] bg-gray-50 hover:bg-emerald-50 hover:text-emerald-800 text-gray-600 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-700"
                value={newActivity.due_date}
                onChange={e => setNewActivity({ ...newActivity, due_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                placeholder="Specific dosages, observation notes, or instructions..."
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                value={newActivity.description}
                onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !newActivity.field_id || !newActivity.title}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm p-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Calendar size={16} />
              {submitting ? 'Saving Task...' : 'Schedule Activity'}
            </button>
          </form>
        </div>

        {/* Tasks List with Interactive Filters (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'pending' ? 'bg-white text-amber-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending ({counts.pending})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('overdue')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'overdue' ? 'bg-white text-red-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overdue ({counts.overdue})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Completed ({counts.completed})
              </button>
            </div>

            {/* Field Filter */}
            <div className="flex items-center gap-2 text-xs">
              <Filter size={14} className="text-gray-400" />
              <select
                aria-label="Filter activities by Field"
                className="bg-transparent font-semibold text-gray-700 focus:outline-none cursor-pointer"
                value={filterFieldId}
                onChange={e => setFilterFieldId(e.target.value)}
              >
                <option value="all">All Fields</option>
                {fields.map(f => (
                  <option key={f.field_id} value={f.field_id}>
                    Field {f.field_id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Activities List */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-200/80 text-center text-gray-400">
              Loading scheduled activities...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
              <p className="text-sm font-semibold text-gray-700">No activities match your current filter.</p>
              <p className="text-xs text-gray-400">
                Schedule a new activity or select another filter tab above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map(act => (
                <div
                  key={act.activity_id}
                  className={`p-4 rounded-2xl border flex items-start gap-4 transition-all shadow-xs ${
                    act.status === 'completed'
                      ? 'bg-gray-50/70 border-gray-200 opacity-60'
                      : act.status === 'overdue'
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-white border-gray-200/80 hover:border-emerald-300'
                  }`}
                >
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(act)}
                    title={act.status === 'completed' ? 'Mark task as pending' : 'Mark task as completed'}
                    className="mt-0.5 hover:scale-115 transition-transform shrink-0"
                  >
                    {act.status === 'completed' ? (
                      <CheckCircle2 className="text-emerald-600" size={22} />
                    ) : act.status === 'overdue' ? (
                      <AlertTriangle className="text-red-500" size={22} />
                    ) : (
                      <Clock className="text-amber-500" size={22} />
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3
                        className={`text-sm font-bold truncate ${
                          act.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {act.title}
                      </h3>
                      {getStatusBadge(act.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        Field {act.field_id}
                      </span>
                      <span>
                        Due: <strong className="text-gray-700">{act.due_date || 'No Date Specified'}</strong>
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                        {act.description}
                      </p>
                    )}
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
