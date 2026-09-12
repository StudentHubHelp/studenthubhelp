import React, { useEffect, useState } from 'react';
import { Bot, Save, RefreshCw, ShieldCheck, Brain, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Config = {
  id: number;
  enabled: boolean;
  ai_rerank_enabled: boolean;
  semantic_search_enabled: boolean;
  lead_capture_enabled: boolean;
  comparison_enabled: boolean;
  budget_planner_enabled: boolean;
  max_candidates: number;
  max_results: number;
  max_output_tokens: number;
  temperature: number;
  maintenance_message?: string | null;
  updated_by?: string | null;
  updated_at?: string;
};

const defaults: Config = {
  id: 1,
  enabled: true,
  ai_rerank_enabled: true,
  semantic_search_enabled: false,
  lead_capture_enabled: true,
  comparison_enabled: true,
  budget_planner_enabled: true,
  max_candidates: 40,
  max_results: 8,
  max_output_tokens: 900,
  temperature: 0.2,
  maintenance_message: '',
};

export const ChatbotAdminControls: React.FC = () => {
  const [config, setConfig] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('chatbot_admin_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) setMessage(error.message);
    if (data) setConfig({ ...defaults, ...data });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const updatedBy = userData.user?.email || 'admin';
      const payload = {
        ...config,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('chatbot_admin_config').update(payload).eq('id', 1);
      if (error) throw error;
      setConfig(payload);
      setMessage('AI control settings saved to Supabase.');
    } catch (e: any) {
      setMessage(e?.message || 'Unable to save AI controls.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Config) => setConfig((c) => ({ ...c, [key]: !c[key] }));

  return (
    <section className="rounded-3xl bg-[#081026] border border-amber-500/20 p-6 shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-amber-400" /><h3 className="text-lg font-extrabold text-white">Enterprise AI Control Plane</h3></div>
          <p className="text-[11px] text-slate-400 mt-1">Director-only controls for the live chatbot behaviour. Changes are stored in Supabase and are designed to affect the server-side AI layer, not the public UI.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="px-3 py-2 rounded-xl bg-[#0d1838] border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          ['enabled', 'AI assistant enabled', ShieldCheck],
          ['ai_rerank_enabled', 'Gemini AI reranking', Brain],
          ['lead_capture_enabled', 'Lead capture', SlidersHorizontal],
          ['comparison_enabled', 'Live comparison mode', SlidersHorizontal],
          ['budget_planner_enabled', 'Live budget planner', SlidersHorizontal],
        ].map(([key, label, Icon]: any) => (
          <button key={key} onClick={() => toggle(key)} className={`p-4 rounded-2xl border text-left transition-colors ${config[key] ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-slate-900/40 border-slate-800'}`}>
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{label}</span><Icon className="w-4 h-4 text-amber-400" /></div>
            <div className={`text-[10px] mt-2 font-bold ${config[key] ? 'text-emerald-300' : 'text-slate-500'}`}>{config[key] ? 'ENABLED' : 'DISABLED'}</div>
          </button>
        ))}
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="text-xs font-bold text-white">Semantic vector search</div>
          <div className="text-[10px] text-amber-300 mt-2">STAGED — vector index/backfill required before enabling.</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['max_candidates', 'Max retrieval candidates', 10, 100, 1],
          ['max_results', 'Max recommendation cards', 1, 20, 1],
          ['max_output_tokens', 'Max AI output tokens', 200, 3000, 50],
          ['temperature', 'AI temperature', 0, 1, 0.05],
        ].map(([key, label, min, max, step]: any) => (
          <label key={key} className="rounded-2xl bg-[#0d1838] border border-slate-800 p-4 block">
            <span className="text-[10px] font-bold text-slate-400">{label}</span>
            <input type="number" min={min} max={max} step={step} value={config[key] as any} onChange={(e) => setConfig((c) => ({ ...c, [key]: Number(e.target.value) }))} className="mt-2 w-full bg-[#081026] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white" />
          </label>
        ))}
      </div>

      <label className="block"><span className="text-[10px] font-bold text-slate-400">Maintenance / emergency message</span><textarea value={config.maintenance_message || ''} onChange={(e) => setConfig((c) => ({ ...c, maintenance_message: e.target.value }))} rows={2} placeholder="Leave empty for normal operation" className="mt-2 w-full bg-[#0d1838] border border-slate-700 rounded-xl p-3 text-xs text-white" /></label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] text-slate-500">Last saved: {config.updated_at ? new Date(config.updated_at).toLocaleString('en-IN') : 'Not saved yet'}</div>
        <button onClick={() => void save()} disabled={saving || loading} className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2"><Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save AI controls'}</button>
      </div>
      {message && <div className="text-xs text-slate-300 bg-slate-900/50 border border-slate-800 rounded-xl p-3">{message}</div>}
    </section>
  );
};
