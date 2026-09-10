import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SectionTab, PropertyItem, UserProfile, ListingRequest } from '../types';
import { Search, SlidersHorizontal, RefreshCw, Bell, Globe, CheckCircle2, Star, Hotel, Utensils, BookOpen, Coffee, Store, User, Inbox, X, Command } from 'lucide-react';

interface HeaderProps {
  currentTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  unreadNotifications: number;
  properties: PropertyItem[];
  students: UserProfile[];
  owners: UserProfile[];
  listingRequests: ListingRequest[];
  onOpenPropertyPreview: (prop: PropertyItem) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onToggleMobileSidebar: () => void;
}

type ResultType = 'property' | 'user' | 'listing_request';
type SearchResult = { id: string | number; type: ResultType; category: string; title: string; subtitle: string; verified?: boolean; status?: string; rating?: number | null; score: number; matches: string[]; original: any };

const normalize = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

// Global search deliberately searches the COMPLETE loaded record, not a hardcoded field list.
const flattenRecord = (value: unknown, path = '', out: Array<{ key: string; value: string }> = []) => {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((item, i) => flattenRecord(item, path ? `${path}[${i}]` : `[${i}]`, out));
    return out;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      const next = path ? `${path}.${key}` : key;
      if (item !== null && typeof item === 'object') flattenRecord(item, next, out);
      else if (item !== null && item !== undefined) out.push({ key: next, value: String(item) });
    });
    return out;
  }
  out.push({ key: path || 'value', value: String(value) });
  return out;
};

const scoreRecord = (record: any, query: string) => {
  const q = normalize(query).trim();
  if (!q) return 1;
  const tokens = q.split(/\s+/).filter(Boolean);
  const fields = flattenRecord(record);
  const full = normalize(fields.map(f => f.value).join(' '));
  const qDigits = digits(q);
  let score = full.includes(q) ? 120 : 0;
  if (qDigits.length >= 4 && digits(full).includes(qDigits)) score += 110;
  for (const token of tokens) {
    const tokenDigits = digits(token);
    let best = 0;
    for (const field of fields) {
      const text = normalize(field.value);
      const key = normalize(field.key);
      if (text === token) best = Math.max(best, 70);
      else if (text.startsWith(token)) best = Math.max(best, 55);
      else if (text.includes(token)) best = Math.max(best, 35);
      if (key.includes(token)) best = Math.max(best, 10);
      if (tokenDigits.length >= 4 && digits(field.value).includes(tokenDigits)) best = Math.max(best, 65);
    }
    if (!best) return 0;
    score += best;
  }
  return score;
};

const matchingFields = (record: any, query: string) => {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return flattenRecord(record).filter(f => {
    const text = normalize(f.value); const key = normalize(f.key);
    return tokens.some(t => text.includes(t) || key.includes(t) || (digits(t).length >= 4 && digits(f.value).includes(digits(t))));
  }).slice(0, 4).map(f => `${f.key.split('.').pop()?.replace(/\[\d+\]/g, '')}=${f.value}`);
};

export const Header: React.FC<HeaderProps> = ({
  onSelectTab, onRefresh, isRefreshing, unreadNotifications, properties, students, owners, listingRequests,
  onOpenPropertyPreview, onOpenUserProfile, onToggleMobileSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isOpenResults, setIsOpenResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearchInput')?.focus(); setIsOpenResults(true); }
      if (e.key === 'Escape') setIsOpenResults(false);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    const outside = (e: MouseEvent) => { if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) setIsOpenResults(false); };
    document.addEventListener('mousedown', outside); return () => document.removeEventListener('mousedown', outside);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim();
    const out: SearchResult[] = [];
    const city = normalize(selectedCity); const area = normalize(selectedArea);
    const add = (record: any, type: ResultType, category: string, title: string, subtitle: string, bonus = 0) => {
      const score = scoreRecord(record, q) + bonus;
      if (q && score <= 0) return;
      if (city && !normalize(record?.city).includes(city)) return;
      if (area && !normalize(record?.area).includes(area)) return;
      if (verifiedOnly && !Boolean(record?.verified ?? record?.is_verified)) return;
      out.push({ id: record?.id ?? `${type}-${out.length}`, type, category, title, subtitle, verified: Boolean(record?.verified ?? record?.is_verified), status: record?.status, rating: record?.rating == null ? null : Number(record.rating), score, matches: matchingFields(record, q), original: record });
    };

    properties.forEach(p => {
      const c = normalize(String(p.category || p.type || 'property'));
      const wanted = normalize(selectedEntity);
      if (wanted && wanted !== 'properties' && !c.includes(wanted.replace(/s$/, ''))) return;
      if (!selectedEntity || ['properties','hostels','tiffins','libraries','cafes','bookstores'].includes(selectedEntity)) add(p, 'property', String(p.category || p.type || 'Property'), p.name || p.title || `Property ${p.id ?? ''}`, `${p.city || p.area || '—'} • ${p.phone || 'No phone'} • ${p.owner_name || 'Owner'}`, 25);
    });

    if (!selectedEntity || selectedEntity === 'user' || selectedEntity === 'profile') {
      [...students, ...owners].forEach(u => add(u, 'user', u.role === 'owner' ? 'Owner' : 'Student', u.full_name || u.name || `User ${u.id ?? ''}`, `${u.role?.toUpperCase() || 'USER'} • ${u.phone || 'No phone'} • ${u.email || 'No email'}`));
    }
    if (!selectedEntity || selectedEntity === 'listing_request') listingRequests.forEach(r => add(r, 'listing_request', 'Listing Request', r.name || r.property_name || `Request ${r.id ?? ''}`, `${r.status || 'PENDING'} • ${r.area || 'Area'} • ${r.phone || ''}`));
    return out.sort((a,b) => b.score - a.score).slice(0, 30);
  }, [searchQuery, selectedEntity, selectedCity, selectedArea, verifiedOnly, properties, students, owners, listingRequests]);

  const clearSearch = () => { setSearchQuery(''); setSelectedEntity(''); setSelectedCity(''); setSelectedArea(''); setVerifiedOnly(false); };

  const iconFor = (r: SearchResult) => {
    if (r.type === 'user') return <User className="w-4 h-4" />;
    if (r.type === 'listing_request') return <Inbox className="w-4 h-4" />;
    const c = normalize(r.category);
    if (c.includes('tiffin')) return <Utensils className="w-4 h-4" />;
    if (c.includes('library')) return <BookOpen className="w-4 h-4" />;
    if (c.includes('cafe')) return <Coffee className="w-4 h-4" />;
    if (c.includes('book')) return <Store className="w-4 h-4" />;
    return <Hotel className="w-4 h-4" />;
  };

  const openResult = (r: SearchResult) => {
    setIsOpenResults(false);
    if (r.type === 'property') onOpenPropertyPreview(r.original);
    else if (r.type === 'user') onOpenUserProfile(r.original);
    else onSelectTab('listing-requests');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#081026]/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        <button onClick={onToggleMobileSidebar} className="md:hidden p-2 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:bg-[#14224d] transition-colors" title="Toggle Navigation"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>

        <div ref={searchWrapRef} className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-amber-400 pointer-events-none" />
            <input id="globalSearchInput" type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setIsOpenResults(true); }} onFocus={() => setIsOpenResults(true)} placeholder="Search anything — name, ID, phone, owner, city, address, email..." className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[#0d1838] border border-amber-500/30 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors shadow-inner" />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && <button type="button" onClick={clearSearch} className="p-1 text-slate-400 hover:text-white" title="Clear search"><X className="w-3.5 h-3.5" /></button>}
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700"><Command className="w-2.5 h-2.5" />K</span>
              <button type="button" onClick={() => { setShowFilters(v => !v); setIsOpenResults(true); }} className={`p-1.5 rounded-lg border text-xs transition-colors ${showFilters ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}`} title="Search Filters"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {showFilters && <div className="absolute left-0 right-0 top-12 mt-2 p-3.5 rounded-2xl bg-[#081026] border border-amber-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Search Type</label><select value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)} className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white"><option value="">Everything</option><option value="properties">All Properties</option><option value="hostels">Hostels / PG</option><option value="tiffins">Tiffins</option><option value="libraries">Libraries</option><option value="cafes">Cafes</option><option value="bookstores">Bookstores</option><option value="user">Students / Owners</option><option value="listing_request">Listing Requests</option></select></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">City</label><input value={selectedCity} onChange={e => setSelectedCity(e.target.value)} placeholder="Any city" className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white" /></div>
              <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Area</label><input value={selectedArea} onChange={e => setSelectedArea(e.target.value)} placeholder="Any area" className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white" /></div>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-5"><input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="accent-amber-500 rounded" /> Verified only</label>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800"><span className="text-[10px] text-slate-500">Search scans every loaded field and nested value</span><button type="button" onClick={clearSearch} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs">Clear</button></div>
          </div>}

          {isOpenResults && (searchQuery.trim() || showFilters) && <div className="absolute left-0 right-0 top-12 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-[#081026] border border-amber-500/30 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in duration-150">
            <div className="px-2 py-1.5 flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold"><span>{results.length} result{results.length === 1 ? '' : 's'}</span><span>Global search</span></div>
            {results.length ? results.map((r, i) => <button key={`${r.type}-${r.id}-${i}`} onClick={() => openResult(r)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition-colors border border-transparent hover:border-slate-700 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-300 flex items-center justify-center shrink-0">{iconFor(r)}</div>
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-bold text-xs text-white truncate">{r.title}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">{r.category}</span>{r.verified && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}{r.rating ? <span className="text-[10px] text-amber-300 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-300" />{r.rating}</span> : null}</div><p className="text-[11px] text-slate-400 truncate mt-0.5">{r.subtitle}</p>{r.matches.length > 0 && <p className="text-[10px] text-slate-500 truncate mt-0.5">Match: {r.matches.join(' • ')}</p>}</div>
            </button>) : <div className="p-7 text-center"><Search className="w-6 h-6 text-slate-600 mx-auto mb-2" /><p className="text-slate-400 text-xs">No matching record found</p><p className="text-slate-600 text-[10px] mt-1">Try a name, ID, phone, owner, city, address or any stored detail</p></div>}
          </div>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefresh} disabled={isRefreshing} className="w-10 h-10 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#14224d] flex items-center justify-center transition-all cursor-pointer" title="Refresh from Supabase"><RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} /></button>
          <button onClick={() => onSelectTab('notifications')} className="relative w-10 h-10 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#14224d] flex items-center justify-center transition-all cursor-pointer" title="Notifications"><Bell className="w-4 h-4" />{unreadNotifications > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-md animate-pulse">{unreadNotifications}</span>}</button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all"><Globe className="w-3.5 h-3.5" /><span>Live Site</span></a>
          <button onClick={() => onSelectTab('admin')} className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-xl bg-[#0d1838] border border-amber-500/20 hover:border-amber-500/40 transition-colors"><div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs">SS</div><span className="hidden md:inline-block text-xs font-bold text-slate-200">Director</span></button>
        </div>
      </div>
    </header>
  );
};
