import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Field, AdvisoryResponse } from '../types';
import { CheckCircle2, AlertTriangle, Info, Sprout, Droplets, BookOpen, Clock, Download } from 'lucide-react';

export default function Advisory() {
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState('');
  const [crop, setCrop] = useState('');
  const [useSensors, setUseSensors] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.getFields().then(res => setFields(res.items)).catch(console.error);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField || !crop) return;

    setLoading(true);
    setError(null);
    setAdvisory(null);
    try {
      const res = await api.analyzeAdvisory({
        field_id: selectedField,
        requested_crop: crop,
        use_simulated_sensors: useSensors
      });
      setAdvisory(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedField) return;
    try {
      setDownloading(true);
      await api.downloadReport(selectedField);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-800">Crop Advisory & Planning</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleAnalyze} className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 col-span-1">
            <label className="text-sm font-medium text-gray-700">Select Field</label>
            <select
              required
              className="w-full p-2 border rounded-lg"
              value={selectedField} onChange={e => setSelectedField(e.target.value)}
            >
              <option value="">Choose...</option>
              {fields.map(f => <option key={f.field_id} value={f.field_id}>{f.field_id}</option>)}
            </select>
          </div>
          <div className="space-y-2 col-span-1">
            <label className="text-sm font-medium text-gray-700">Crop Type</label>
            <input
              required
              placeholder="e.g. wheat, corn"
              className="w-full p-2 border rounded-lg"
              value={crop} onChange={e => setCrop(e.target.value)}
            />
          </div>
          <div className="space-y-2 col-span-1 flex items-center mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
                checked={useSensors} onChange={e => setUseSensors(e.target.checked)}
              />
              <span className="text-sm font-medium text-gray-700">Use Live Sensors</span>
            </label>
          </div>
          <div className="col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : <Sprout size={20} />}
              Generate Advisory
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Crop Advisory & Planning</h1>
        {advisory && (
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            {downloading ? 'Generating PDF...' : 'Download Full Report'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {advisory && (
        <div className="space-y-6">
          {advisory.human_review_required && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
              <Info className="mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">Human Review Required</h4>
                <p className="text-sm">These recommendations are advisory only and must be verified before acting. Do not operate physical equipment automatically.</p>
              </div>
            </div>
          )}

          {advisory.narrative_advisory && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100 shadow-sm">
              <h2 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                <Sprout className="text-green-600" /> AI Executive Summary
              </h2>
              <p className="text-green-800 leading-relaxed">
                {advisory.narrative_advisory}
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Suitability */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-blue-500" /> Crop Suitability
              </h2>
              <div className="text-xl font-semibold text-blue-900 mb-2">
                {advisory.crop_suitability.category}
              </div>
              {advisory.crop_suitability.limiting_factors?.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Limiting Factors</span>
                  <ul className="list-disc list-inside mt-2 text-gray-700 text-sm">
                    {advisory.crop_suitability.limiting_factors.map((lf: string, i: number) => (
                      <li key={i}>{lf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Irrigation */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Droplets className="text-cyan-500" /> Irrigation Assessment
              </h2>
              <div className="text-xl font-semibold text-cyan-900 mb-2">
                {advisory.irrigation_assessment.decision}
              </div>
              <p className="text-gray-700 text-sm">{advisory.irrigation_assessment.reason}</p>
              {advisory.irrigation_assessment.evidence && (
                <div className="mt-3 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block font-mono">
                  Source: {advisory.irrigation_assessment.evidence}
                </div>
              )}
            </div>

            {/* Recommendations & Risks */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Detailed Recommendations & Risks</h2>

              {advisory.recommendations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-800">
                    {advisory.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {advisory.risk_findings?.environmental_risks?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-red-700 uppercase mb-2">Identified Risks</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    {advisory.risk_findings.environmental_risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {advisory.missing_information.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Missing Information</h3>
                  <div className="flex flex-wrap gap-2">
                    {advisory.missing_information.map((m, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sources */}
            {advisory.source_references.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="text-indigo-500" /> Evidence Sources
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-indigo-700">
                  {advisory.source_references.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
