import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Field, AdvisoryResponse } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Sprout,
  Droplets,
  BookOpen,
  Clock,
  Download,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';

const COMMON_CROPS = ['wheat', 'maize', 'groundnut', 'cotton', 'rice', 'mustard', 'chickpea'];

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
    api.getFields().then(res => {
      setFields(res.items);
      if (res.items.length > 0) {
        setSelectedField(prev => prev || res.items[0].field_id);
      }
    }).catch(console.error);
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
        requested_crop: crop.trim().toLowerCase(),
        use_simulated_sensors: useSensors
      });
      setAdvisory(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate advisory');
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
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Sprout className="text-emerald-700" size={28} />
            Crop Advisory & Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Agentic crop suitability, soil compatibility analysis, and irrigation decision support.
          </p>
        </div>
        {advisory && (
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloading}
            className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? 'Compiling PDF...' : 'Download Full PDF Report'}
          </button>
        )}
      </div>

      {/* Advisory Configuration Card */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600" />
          Query Advisory Engine
        </h2>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Field Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Field Parcel *</label>
              <select
                required
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                value={selectedField}
                onChange={e => setSelectedField(e.target.value)}
              >
                <option value="">Select Field...</option>
                {fields.map(f => (
                  <option key={f.field_id} value={f.field_id}>
                    Field {f.field_id} ({f.field_area_hectares} ha)
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Crop Name *</label>
              <input
                required
                placeholder="e.g. wheat, maize, groundnut"
                className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                value={crop}
                onChange={e => setCrop(e.target.value)}
              />
            </div>

            {/* Submit & Toggle */}
            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 select-none pb-1">
                <input
                  type="checkbox"
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  checked={useSensors}
                  onChange={e => setUseSensors(e.target.checked)}
                />
                <span>Include Live Sensor Telemetry</span>
              </label>

              <button
                type="submit"
                disabled={loading || !selectedField || !crop}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm p-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Clock className="animate-spin" size={18} /> : <Sprout size={18} />}
                {loading ? 'Evaluating Advisory...' : 'Run Agricultural Analysis'}
              </button>
            </div>
          </div>

          {/* Quick Crop Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-gray-400 font-medium mr-1">Quick Select:</span>
            {COMMON_CROPS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCrop(c)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors capitalize ${
                  crop.toLowerCase() === c
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Advisory Output */}
      {advisory && (
        <div className="space-y-6">
          {/* Human Review Disclaimer */}
          {advisory.human_review_required && (
            <div className="bg-amber-50 border border-amber-200/90 text-amber-900 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
              <Info className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <div className="text-sm space-y-1">
                <h4 className="font-bold">Human Verification Required</h4>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  These recommendations are synthesized for agronomic decision support and must be validated with local extension agents before operating physical machinery.
                </p>
              </div>
            </div>
          )}

          {/* AI Narrative Executive Summary */}
          {advisory.narrative_advisory && (
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-7 rounded-2xl shadow-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-emerald-100 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-300" />
                  AI Executive Agro-Summary
                </h2>
                <span className="text-[11px] font-mono uppercase bg-emerald-700/60 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/40">
                  Crop: {advisory.requested_crop}
                </span>
              </div>
              <p className="text-sm text-emerald-50 leading-relaxed whitespace-pre-line font-sans">
                {advisory.narrative_advisory}
              </p>
            </div>
          )}

          {/* Evaluation Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crop Suitability */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={20} />
                  Crop Suitability Category
                </h3>
              </div>

              <div>
                <span className="inline-block text-xl font-extrabold text-emerald-900 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                  {advisory.crop_suitability?.category || 'Assessed'}
                </span>
              </div>

              {advisory.crop_suitability?.limiting_factors && advisory.crop_suitability.limiting_factors.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-amber-600" />
                    Limiting Agronomic Factors
                  </span>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {advisory.crop_suitability.limiting_factors.map((lf: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{lf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Irrigation Assessment */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Droplets className="text-cyan-600" size={20} />
                  Irrigation Strategy
                </h3>
              </div>

              <div>
                <span className="inline-block text-xl font-extrabold text-cyan-950 bg-cyan-50 px-3.5 py-1.5 rounded-xl border border-cyan-200">
                  {advisory.irrigation_assessment?.decision || 'Evaluated'}
                </span>
              </div>

              <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                {advisory.irrigation_assessment?.reason || 'Irrigation schedule optimized for local soil moisture and precipitation.'}
              </p>

              {advisory.irrigation_assessment?.evidence && (
                <div className="text-[11px] bg-cyan-50 text-cyan-800 px-3 py-1.5 rounded-lg border border-cyan-100 font-mono">
                  Basis: {advisory.irrigation_assessment.evidence}
                </div>
              )}
            </div>

            {/* Recommendations & Environmental Risks */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 col-span-1 md:col-span-2 space-y-6">
              <h3 className="font-bold text-gray-900 text-base pb-3 border-b border-gray-100 flex items-center gap-2">
                <FileText size={18} className="text-emerald-700" />
                Actionable Recommendations & Agronomic Risks
              </h3>

              {advisory.recommendations && advisory.recommendations.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Precision Field Recommendations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {advisory.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f8faf9] border border-gray-200/70 text-xs text-gray-800">
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advisory.risk_findings?.environmental_risks && advisory.risk_findings.environmental_risks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-600" />
                    Identified Environmental & Climatic Risks
                  </h4>
                  <div className="space-y-2">
                    {advisory.risk_findings.environmental_risks.map((risk: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                        <span className="font-bold">•</span>
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advisory.missing_information && advisory.missing_information.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    Data Gaps / Recommended Tests
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {advisory.missing_information.map((info, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium">
                        {info}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Evidence & Grounding Sources */}
            {advisory.source_references && advisory.source_references.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200/80 col-span-1 md:col-span-2 space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-700" />
                  RAG Knowledge Retrieval Sources
                </h3>
                <div className="space-y-2">
                  {advisory.source_references.map((source, i) => (
                    <div key={i} className="text-xs text-emerald-950 font-mono bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
