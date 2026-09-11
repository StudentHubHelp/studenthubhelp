import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, RefreshCw, MessageSquare, Users, Activity, Database, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { supabase, exportToCSV, fmtDate } from '../lib/supabase';

type Conversation = { id: string; session_id: string; first_message_at?: string; last_message_at?: string; message_count?: number; primary_topic?: string; intent?: string; sentiment?: string; target_city?: string; recommended_category?: string; last_user_message?: string; last_bot_reply?: string; live_active_property_count?: number; grounded?: boolean; created_at?: string; metadata?: any };
type Lead = { id: string; conversation_id?: string; session_id: string; name?: string; phone?: string; email?: string; city?: string; detected_need?: string; status?: string; source?: string; created_at?: string; updated_at?: string };
type Message = { id: number; conversation_id?: string; session_id: string; role: string; message: string; intent?: string; primary_topic?: string; sentiment?: string; created_at?: string };
type Event = { id: number; session_id: string; event_type: string; payload?: any; created_at?: string };

const sourceTables = ['hostels', 'tiffins', 'libraries', 'cafes', 'bookstores'] as const;

export const ChatbotAdminView: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'conversations' | 'leads' | 'messages' | 'events'>('overview');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeListings, setActiveListings] = useState(0);
  const [counts, setCounts] = useState({ conversations: 0, leads: 0, messages: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cRes, lRes, mRes, eRes] = await Promise.all([
        supabase.from('chatbot_conversations').select('*', { count: 'exact' }).order('last_message_at', { ascending: false }).limit(100),
        supabase.from('chatbot_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('chatbot_messages').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
        supabase.from('chatbot_events').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      ]);
      if (cRes.error) throw cRes.error; if (lRes.error) throw lRes.error; if (mRes.error) throw mRes.error; if (eRes.error) throw eRes.error;
      setConversations(cRes.data || []); setLeads(lRes.data || []); setMessages(mRes.data || []); setEvents(eRes.data || []);
      setCounts({ conversations: cRes.count ?? 0, leads: lRes.count ?? 0, messages: mRes.count ?? 0, events: eRes.count ?? 0 });
      const results = await Promise.all(sourceTables.map((table) => supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'active')));
      setActiveListings(results.reduce((sum, r) => sum + (r.count || 0), 0));
    } catch (e: any) { setError(e?.message || 'Unable to load chatbot records from Supabase.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const todayMessages = useMemo(() => { const start = new Date(); start.setHours(0, 0, 0, 0); return messages.filter((m) => m.created_at && new Date(m.created_at) >= start).length; }, [messages]);
  const groundedCount = useMemo(() => conversations.filter((c) => c.grounded === true).length, [conversations]);
  const statCards = [
    { label: 'Conversations', value: counts.conversations, icon: MessageSquare },
    { label: 'Messages', value: counts.messages, icon: Activity },
    { label: 'Captured Leads', value: counts.leads, icon: Users },
    { label: 'Live Active Listings', value: activeListings, icon: Database },
  ];
  const tabs = [['overview', 'Overview'], ['conversations', 'Conversations'], ['leads', 'Leads'], ['messages', 'Messages'], ['events', 'Events']] as const;

  return <div className="space-y-6 animate-in fade-in duration-200">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><div className="flex items-center gap-2"><Bot className="w-6 h-6 text-amber-400" /><h2 className="text-2xl font-serif font-extrabold text-white">AI Chatbot & CRM</h2></div><p className="text-xs text-slate-400 mt-1">Live chatbot records, AI diagnostics, captured leads and Supabase-backed activity.</p></div>
      <button onClick={load} disabled={loading} className="px-4 py-2 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh live data</button>
    </div>
    {error && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{statCards.map((s) => { const Icon = s.icon; return <div key={s.label} className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400">{s.label}</span><Icon className="w-4 h-4 text-amber-400" /></div><div className="text-2xl font-extrabold text-white mt-2">{s.value.toLocaleString('en-IN')}</div></div>; })}</div>
    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 rounded-xl text-xs font-bold ${tab === key ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-[#081026] text-slate-400 border border-slate-800'}`}>{label}</button>)}</div>
    {tab === 'overview' && <>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="text-xs text-slate-400">Backend</div><div className="text-lg font-extrabold text-emerald-300 mt-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Supabase Edge Function</div><div className="text-[11px] text-slate-500 mt-1">studenthubhelp-chat</div></div>
        <div className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="text-xs text-slate-400">AI model</div><div className="text-lg font-extrabold text-white mt-1">Gemini 3.8 Flash</div><div className="text-[11px] text-slate-500 mt-1">Server-side API key</div></div>
        <div className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="text-xs text-slate-400">Grounded conversations</div><div className="text-lg font-extrabold text-white mt-1">{groundedCount.toLocaleString('en-IN')}</div><div className="text-[11px] text-slate-500 mt-1">of latest {conversations.length} loaded</div></div>
      </div>
      <div className="rounded-3xl bg-[#081026] border border-slate-800 p-6"><h3 className="font-bold text-white flex items-center gap-2"><Database className="w-4 h-4 text-amber-400" /> Live AI knowledge sources</h3><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">{sourceTables.map((t) => <div key={t} className="p-3 rounded-xl bg-[#0d1838] border border-slate-800"><div className="text-xs font-bold text-white">{t}</div><div className="text-[10px] text-emerald-300 mt-1">active listings included</div></div>)}</div><p className="text-[11px] text-slate-500 mt-4">Recommendations are sourced from active records in these five tables. Chat logs, leads and AI events are stored separately for the admin dashboard.</p></div>
      <div className="grid md:grid-cols-2 gap-4"><div className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Messages today</div><div className="text-xl font-extrabold text-white mt-2">{todayMessages}</div></div><div className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Target cities in loaded conversations</div><div className="flex flex-wrap gap-2 mt-2">{Array.from(new Set(conversations.map(c => c.target_city).filter(Boolean))).slice(0,8).map(c => <span key={c} className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">{c}</span>)}{!conversations.some(c => c.target_city) && <span className="text-xs text-slate-500">No city data recorded yet.</span>}</div></div></div>
    </>}
    {tab === 'conversations' && <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr>{['Last activity','Session','Topic','Intent','City','Messages','Grounded','Last user message'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{conversations.map(c => <tr key={c.id} className="hover:bg-slate-800/30"><td className="p-4 text-slate-400 whitespace-nowrap">{fmtDate(c.last_message_at || c.created_at)}</td><td className="p-4 font-mono text-slate-500 max-w-[150px] truncate">{c.session_id}</td><td className="p-4 text-white font-bold">{c.primary_topic || '—'}</td><td className="p-4 text-slate-300">{c.intent || '—'}</td><td className="p-4 text-slate-300">{c.target_city || '—'}</td><td className="p-4 text-amber-300 font-bold">{c.message_count || 0}</td><td className="p-4">{c.grounded ? <span className="text-emerald-300">Yes</span> : <span className="text-slate-500">No</span>}</td><td className="p-4 text-slate-400 max-w-sm truncate">{c.last_user_message || '—'}</td></tr>)}{!conversations.length && <tr><td colSpan={8} className="p-10 text-center text-slate-500">No chatbot conversations recorded yet.</td></tr>}</tbody></table></div></div>}
    {tab === 'leads' && <div className="space-y-3">{leads.length ? leads.map(l => <div key={l.id} className="rounded-2xl bg-[#081026] border border-slate-800 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-white font-bold">{l.name || 'Student Visitor'}</div><div className="text-xs text-slate-400 mt-1">{l.phone || l.email || 'No contact captured'}</div></div><span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">{l.status || 'new'}</span></div><div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs"><div><span className="text-slate-500">City</span><div className="text-slate-200 mt-1">{l.city || '—'}</div></div><div><span className="text-slate-500">Need</span><div className="text-slate-200 mt-1">{l.detected_need || '—'}</div></div><div><span className="text-slate-500">Captured</span><div className="text-slate-200 mt-1">{fmtDate(l.created_at)}</div></div></div></div>) : <div className="p-10 text-center rounded-3xl bg-[#081026] border border-slate-800 text-slate-500">No leads captured yet.</div>}<button onClick={() => exportToCSV(leads, 'chatbot-leads')} className="px-4 py-2 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 text-xs font-bold">Export Leads CSV</button></div>}
    {tab === 'messages' && <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr><th className="p-4">Time</th><th className="p-4">Role</th><th className="p-4">Session</th><th className="p-4">Topic</th><th className="p-4">Message</th></tr></thead><tbody className="divide-y divide-slate-800/60">{messages.map(m => <tr key={m.id}><td className="p-4 text-slate-500 whitespace-nowrap">{fmtDate(m.created_at)}</td><td className="p-4 font-bold text-white">{m.role}</td><td className="p-4 font-mono text-slate-500 max-w-[140px] truncate">{m.session_id}</td><td className="p-4 text-slate-300">{m.primary_topic || '—'}</td><td className="p-4 text-slate-300 max-w-xl">{m.message}</td></tr>)}{!messages.length && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No chatbot messages recorded yet.</td></tr>}</tbody></table></div></div>}
    {tab === 'events' && <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr><th className="p-4">Time</th><th className="p-4">Event</th><th className="p-4">Session</th><th className="p-4">Payload</th></tr></thead><tbody className="divide-y divide-slate-800/60">{events.map(e => <tr key={e.id}><td className="p-4 text-slate-500 whitespace-nowrap">{fmtDate(e.created_at)}</td><td className="p-4 text-white font-bold">{e.event_type}</td><td className="p-4 font-mono text-slate-500 max-w-[140px] truncate">{e.session_id}</td><td className="p-4 text-slate-400 max-w-xl truncate font-mono">{e.payload ? JSON.stringify(e.payload) : '—'}</td></tr>)}{!events.length && <tr><td colSpan={4} className="p-10 text-center text-slate-500">No chatbot events recorded yet.</td></tr>}</tbody></table></div></div>}
  </div>;
};
