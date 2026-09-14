import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, MapPin, Search, ShieldAlert, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PartnerApplication {
  id: number;
  full_name: string;
  phone: string;
  whatsapp?: string;
  email: string;
  state: string;
  district: string;
  city: string;
  area?: string;
  pincode?: string;
  background?: string;
  college_university?: string;
  occupation?: string;
  experience?: string;
  capabilities?: string[];
  properties_per_month?: string;
  students_reached?: string;
  promotion_channels?: string[];
  social_links?: string;
  motivation?: string;
  status: string;
  admin_note?: string;
  created_at: string;
}

export const PartnerManagementView: React.FC = () => {
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false });
    if (!error) setRows((data || []) as PartnerApplication[]);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    const matchesStatus = filter === 'all' || String(r.status).toLowerCase() === filter;
    const hay = `${r.full_name} ${r.email} ${r.phone} ${r.state} ${r.district} ${r.city} ${r.area || ''}`.toLowerCase();
    return matchesStatus && hay.includes(query.trim().toLowerCase());
  }), [rows, filter, query]);

  const review = async (row: PartnerApplication, status: 'approved' | 'rejected' | 'suspended') => {
    setBusy(row.id);
    try {
      const { data: updated, error } = await supabase.from('partner_applications').update({ status, admin_note: note[row.id] || null, reviewed_at: new Date().toISOString() }).eq('id', row.id).select('*').single();
      if (error) throw error;

      if (status === 'approved') {
        const { data: profile } = await supabase.from('profiles').select('id, full_name, phone, email').eq('email', row.email).maybeSingle();
        if (profile?.id) {
          const { error: upsertError } = await supabase.from('profiles').update({ role: 'partner', status: 'active' }).eq('id', profile.id);
          if (upsertError) throw upsertError;
          const { error: partnerError } = await supabase.from('partner_profiles').upsert({ user_id: profile.id, application_id: row.id, full_name: row.full_name, email: row.email, phone: row.phone, state: row.state, district: row.district, city: row.city, areas: row.area ? [row.area] : [], status: 'active' }, { onConflict: 'user_id' });
          if (partnerError) throw partnerError;
        }
      }
      setRows((prev) => prev.map((x) => x.id === row.id ? (updated as PartnerApplication) : x));
    } catch (e: any) {
      window.alert(e?.message || 'Partner review failed.');
    } finally { setBusy(null); }
  };

  return <div className="space-y-5">
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div><div className="text-[10px] uppercase tracking-[.18em] text-amber-300 font-black">Partner Network</div><h1 className="text-2xl md:text-3xl font-black mt-1">Partner Applications</h1><p className="text-xs text-slate-400 mt-1">Review local applicants, approve territory access and manage partner status.</p></div>
      <button onClick={load} className="px-4 py-2 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300 text-xs font-black">Refresh</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['pending','Pending',Clock3],['approved','Approved',CheckCircle2],['rejected','Rejected',XCircle],['suspended','Suspended',ShieldAlert]].map(([key,label,Icon]: any) => <button key={key} onClick={() => setFilter(key)} className={`text-left p-4 rounded-2xl border ${filter===key?'border-amber-400/50 bg-amber-500/10':'border-slate-800 bg-slate-900/50'}`}><Icon className="w-4 h-4 text-amber-300"/><div className="text-xl font-black mt-2">{rows.filter(r=>String(r.status).toLowerCase()===key).length}</div><div className="text-[10px] text-slate-400 font-bold">{label}</div></button>)}
    </div>
    <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email, city, district..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs outline-none" /></div><button onClick={()=>setFilter('all')} className={`px-4 py-2 rounded-xl text-xs font-black border ${filter==='all'?'border-amber-400/40 bg-amber-500/10 text-amber-300':'border-slate-800 text-slate-300'}`}>All Applications</button></div>
    {loading ? <div className="min-h-[240px] flex items-center justify-center text-xs text-slate-400">Loading partner applications…</div> : filtered.length === 0 ? <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400">No partner applications found.</div> : <div className="space-y-4">{filtered.map(row => <article key={row.id} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black">{row.full_name}</h2><span className="px-2 py-1 rounded-full text-[9px] uppercase font-black bg-amber-500/10 text-amber-300">{row.status}</span></div><div className="text-xs text-slate-400 mt-1">{row.email} · {row.phone}</div><div className="flex items-center gap-1.5 text-xs text-slate-300 mt-3"><MapPin className="w-3.5 h-3.5 text-amber-300"/>{row.area ? `${row.area}, ` : ''}{row.city}, {row.district}, {row.state}{row.pincode ? ` · ${row.pincode}` : ''}</div></div><div className="text-[10px] text-slate-500">Applied {new Date(row.created_at).toLocaleString()}</div></div>
      <div className="grid md:grid-cols-3 gap-3 mt-5 text-[11px]"><div><b className="text-slate-300">Background</b><p className="text-slate-400 mt-1">{row.background || '—'} {row.college_university ? `· ${row.college_university}` : ''}</p></div><div><b className="text-slate-300">Capacity</b><p className="text-slate-400 mt-1">{row.properties_per_month || '—'} properties/month · {row.students_reached || '—'} students</p></div><div><b className="text-slate-300">Capabilities</b><p className="text-slate-400 mt-1">{(row.capabilities || []).join(', ') || '—'}</p></div></div>
      {row.motivation && <div className="mt-4 p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-400"><b className="text-slate-300">Motivation:</b> {row.motivation}</div>}
      {row.status === 'pending' && <div className="mt-4 flex flex-col md:flex-row gap-2"><input value={note[row.id] || ''} onChange={e=>setNote(n=>({...n,[row.id]:e.target.value}))} placeholder="Optional admin note" className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"/><button disabled={busy===row.id} onClick={()=>review(row,'approved')} className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-black">Approve</button><button disabled={busy===row.id} onClick={()=>review(row,'rejected')} className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-black">Reject</button></div>}
      {row.status === 'approved' && <div className="mt-4"><button disabled={busy===row.id} onClick={()=>review(row,'suspended')} className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-black">Suspend Partner</button></div>}
      {row.status === 'suspended' && <div className="mt-4"><button disabled={busy===row.id} onClick={()=>review(row,'approved')} className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-black">Reactivate Partner</button></div>}
    </article>)}</div>}
  </div>;
};
