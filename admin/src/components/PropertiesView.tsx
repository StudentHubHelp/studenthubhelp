import React, { useEffect, useState, useMemo } from 'react';
import { ListingRequest, PropertyItem, PropertyType } from '../types';
import {
  propertyConfig,
  MASTER_TYPES,
  propVerified,
  propFeatured,
  propStatus,
  propRating,
  propViews,
  propBookings,
  shortDate,
  exportToCSV,
  supabase,
} from '../lib/supabase';
import {
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Star,
  Phone,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface PropertiesViewProps {
  categoryFilter?: PropertyType | 'all';
  properties: PropertyItem[];
  onOpenPreview: (property: PropertyItem) => void;
  onOpenEditor: (property: PropertyItem | null, type: PropertyType) => void;
  onToggleVerification: (property: PropertyItem, nextVerified: boolean) => void;
  onDeleteProperty: (property: PropertyItem) => void;
  onBulkAction: (action: 'verify' | 'activate' | 'suspend' | 'feature', selectedIds: string[]) => void;
}

const listingRequestToProperty = (r: ListingRequest): PropertyItem => ({
  ...(r as any),
  id: String(r.id),
  name: r.name || r.property_name || r.title || 'Listing Request',
  category: r.category || r.property_type || 'Hostel',
  property_type: r.property_type || r.category || 'Hostel',
  status: 'pending',
  verified: Boolean(r.verified),
  _source_table: 'listing_requests',
  _source_id: r.id,
});

const listingRequestTable = (p: PropertyItem): PropertyType => {
  const raw = String((p as any).property_type || (p as any).category || '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (raw.includes('tiffin') || raw.includes('mess')) return 'tiffins';
  if (raw.includes('library')) return 'libraries';
  if (raw.includes('cafe')) return 'cafes';
  if (raw.includes('book') || raw.includes('stationery')) return 'bookstores';
  return 'hostels';
};

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  categoryFilter = 'all',
  properties,
  onOpenPreview,
  onOpenEditor,
  onToggleVerification,
  onDeleteProperty,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter);
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingListingProperties, setPendingListingProperties] = useState<PropertyItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [liveProperties, setLiveProperties] = useState<PropertyItem[]>(properties);
  const [bulkBusy, setBulkBusy] = useState(false);

  const isPendingRequestView = categoryFilter === 'all' && statusFilter === 'pending';

  useEffect(() => setLiveProperties(properties), [properties]);
  useEffect(() => setSelectedIds([]), [categoryFilter, selectedCategory, statusFilter, verifiedFilter, featuredFilter, areaFilter, ownerFilter]);

  useEffect(() => {
    let cancelled = false;
    if (!isPendingRequestView) {
      setPendingListingProperties([]);
      setPendingLoading(false);
      return;
    }
    const loadPendingRequests = async () => {
      setPendingLoading(true);
      try {
        const rows: ListingRequest[] = [];
        const pageSize = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from('listing_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          const page = Array.isArray(data) ? (data as ListingRequest[]) : [];
          rows.push(...page);
          if (page.length < pageSize) break;
          from += pageSize;
        }
        if (!cancelled) setPendingListingProperties(rows.map(listingRequestToProperty));
      } catch (error) {
        console.warn('Pending listing request load failed:', error);
        if (!cancelled) setPendingListingProperties([]);
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    };
    loadPendingRequests();
    return () => { cancelled = true; };
  }, [isPendingRequestView]);

  const filteredProperties = useMemo(() => {
    const sourceProperties = isPendingRequestView ? pendingListingProperties : liveProperties;
    return sourceProperties.filter((p) => {
      let matchesCat = true;
      if (selectedCategory && selectedCategory !== 'all') {
        const sourceTable = String((p as any)._source_table || '').toLowerCase();
        if (sourceTable === 'listing_requests') matchesCat = listingRequestTable(p) === selectedCategory.toLowerCase();
        else if (sourceTable) matchesCat = sourceTable === selectedCategory.toLowerCase();
        else {
          const c = (p.category || 'Hostel').toLowerCase();
          const target = propertyConfig[selectedCategory as PropertyType]?.category.toLowerCase() || '';
          matchesCat = c.includes(target) || c.includes(selectedCategory.toLowerCase());
        }
      }
      const matchesArea = !areaFilter || (p.area || '').toLowerCase().includes(areaFilter.toLowerCase());
      const matchesStatus = !statusFilter || propStatus(p) === statusFilter.toLowerCase();
      const matchesVerified = !verifiedFilter || (verifiedFilter === 'true' && propVerified(p)) || (verifiedFilter === 'false' && !propVerified(p));
      const matchesFeatured = !featuredFilter || (featuredFilter === 'true' && propFeatured(p)) || (featuredFilter === 'false' && !propFeatured(p));
      const matchesOwner = !ownerFilter || (p.owner_name || '').toLowerCase().includes(ownerFilter.toLowerCase()) || (p.phone || '').includes(ownerFilter) || (p.name || '').toLowerCase().includes(ownerFilter.toLowerCase());
      return matchesCat && matchesArea && matchesStatus && matchesVerified && matchesFeatured && matchesOwner;
    }).sort((a, b) => {
      if (sortBy === 'rating-high') return propRating(b) - propRating(a);
      if (sortBy === 'rating-low') return propRating(a) - propRating(b);
      if (sortBy === 'views') return propViews(b) - propViews(a);
      if (sortBy === 'bookings') return propBookings(b) - propBookings(a);
      if (sortBy === 'az') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [liveProperties, pendingListingProperties, isPendingRequestView, selectedCategory, areaFilter, statusFilter, verifiedFilter, featuredFilter, ownerFilter, sortBy]);

  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filteredProperties.length ? [] : filteredProperties.map((p) => String(p.id)));
  const toggleSelectOne = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  const handlePersistedBulkAction = async (action: 'verify' | 'activate' | 'suspend' | 'feature') => {
    if (isPendingRequestView || !selectedIds.length || bulkBusy) return;
    const selected = liveProperties.filter((p) => selectedIds.includes(String(p.id)));
    const grouped = new Map<string, string[]>();
    for (const property of selected) {
      const table = String((property as any)._source_table || '').toLowerCase();
      if (!['hostels', 'tiffins', 'libraries', 'cafes', 'bookstores'].includes(table)) continue;
      grouped.set(table, [...(grouped.get(table) || []), String(property.id)]);
    }
    if (!grouped.size) {
      window.alert('No live properties were selected. Pending requests must be managed from Listing Requests.');
      return;
    }
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (action === 'verify') updatePayload.verified = true;
    if (action === 'activate') updatePayload.status = 'active';
    if (action === 'suspend') updatePayload.status = 'suspended';
    if (action === 'feature') updatePayload.featured = true;
    try {
      setBulkBusy(true);
      for (const [table, ids] of grouped.entries()) {
        const { error } = await supabase.from(table).update(updatePayload).in('id', ids);
        if (error) throw error;
      }
      setLiveProperties((prev) => prev.map((property) => {
        if (!selectedIds.includes(String(property.id))) return property;
        if (action === 'verify') return { ...property, verified: true };
        if (action === 'activate') return { ...property, status: 'active' };
        if (action === 'suspend') return { ...property, status: 'suspended' };
        return { ...property, featured: true, is_featured: true };
      }));
      setSelectedIds([]);
    } catch (error: any) {
      console.error('Bulk property action failed:', error);
      window.alert(error?.message || 'Bulk property action failed. No success was reported.');
    } finally {
      setBulkBusy(false);
    }
  };

  const pageTitle = categoryFilter === 'all' ? 'All Property Listings' : propertyConfig[categoryFilter as PropertyType]?.title || 'Properties';
  const defaultAddType: PropertyType = categoryFilter !== 'all' ? (categoryFilter as PropertyType) : 'hostels';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">{pageTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">{pendingLoading && isPendingRequestView ? 'Loading pending listing requests…' : `${filteredProperties.length} ${isPendingRequestView ? 'pending listing requests' : 'active listings'} • Real-time live Supabase management`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToCSV(filteredProperties, `properties-${selectedCategory}`)} className="px-3.5 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"><Download className="w-3.5 h-3.5" /><span>Export CSV</span></button>
          <button onClick={() => onOpenEditor(null, defaultAddType)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"><Plus className="w-4 h-4" /><span>Add Property</span></button>
        </div>
      </div>

      <div className="rounded-3xl bg-[#081026] border border-slate-800 p-4 space-y-3 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
          {categoryFilter === 'all' && <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white"><option value="all">All Categories</option>{MASTER_TYPES.map((t) => <option key={t} value={t}>{propertyConfig[t].category}</option>)}</select>}
          <input type="text" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Locality / Area" className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white"><option value="">Any Status</option><option value="active">Active Only</option><option value="pending">Pending Only</option><option value="suspended">Suspended Only</option></select>
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white"><option value="">Verification: Any</option><option value="true">Verified Badge</option><option value="false">Unverified</option></select>
          <select value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value)} className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white"><option value="">Featured: Any</option><option value="true">Featured Only</option><option value="false">Non-Featured</option></select>
          <input type="text" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} placeholder="Owner / Title / Phone" className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-400" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-white"><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option><option value="rating-high">Rating (High to Low)</option><option value="views">Most Viewed</option><option value="bookings">Most Booked</option><option value="az">A-Z Name</option></select>
        </div>
        {selectedIds.length > 0 && !isPendingRequestView && <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0d1838] border border-amber-500/30 text-xs animate-in fade-in duration-150"><span className="font-bold text-amber-300">{selectedIds.length} properties selected</span><div className="flex items-center gap-1.5"><button disabled={bulkBusy} onClick={() => handlePersistedBulkAction('verify')} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold disabled:opacity-50">{bulkBusy ? 'Working…' : 'Bulk Verify'}</button><button disabled={bulkBusy} onClick={() => handlePersistedBulkAction('activate')} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-bold disabled:opacity-50">Bulk Activate</button><button disabled={bulkBusy} onClick={() => handlePersistedBulkAction('suspend')} className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold disabled:opacity-50">Bulk Suspend</button><button disabled={bulkBusy} onClick={() => handlePersistedBulkAction('feature')} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold disabled:opacity-50">Bulk Feature</button></div></div>}
      </div>

      <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800"><tr><th className="p-4 w-10"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">{selectedIds.length === filteredProperties.length && filteredProperties.length > 0 ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}</button></th><th className="p-4">Property Name</th><th className="p-4">Category</th><th className="p-4">Owner / Contact</th><th className="p-4">Locality</th><th className="p-4">Status</th><th className="p-4">Verification</th><th className="p-4">Rating</th><th className="p-4">Views</th><th className="p-4">Updated</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-800/60">
        {filteredProperties.length ? filteredProperties.map((p) => {
          const isVerified = propVerified(p);
          const isFeatured = propFeatured(p);
          const status = propStatus(p);
          const isSelected = selectedIds.includes(String(p.id));
          const isPendingRequest = String((p as any)._source_table || '') === 'listing_requests';
          const sourceTable = String((p as any)._source_table || '').toLowerCase();
          let categoryType: PropertyType = 'hostels';
          if (sourceTable === 'listing_requests') categoryType = listingRequestTable(p);
          else if (sourceTable === 'tiffins' || sourceTable === 'libraries' || sourceTable === 'cafes' || sourceTable === 'bookstores') categoryType = sourceTable as PropertyType;
          else { const c = (p.category || '').toLowerCase(); if (c.includes('tiffin') || c.includes('mess')) categoryType = 'tiffins'; else if (c.includes('library')) categoryType = 'libraries'; else if (c.includes('cafe')) categoryType = 'cafes'; else if (c.includes('book')) categoryType = 'bookstores'; }
          return <tr key={`${sourceTable || 'property'}-${p.id}`} className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
            <td className="p-4"><button disabled={isPendingRequest} onClick={() => toggleSelectOne(String(p.id))} className="text-slate-400 hover:text-white disabled:opacity-40">{isSelected ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4" />}</button></td>
            <td className="p-4"><button onClick={() => !isPendingRequest && onOpenPreview(p)} className={`font-bold text-slate-100 ${!isPendingRequest ? 'hover:text-amber-300 cursor-pointer' : 'cursor-default'} text-left transition-colors flex items-center gap-1.5 group`}><span>{p.name || p.title || 'Accommodation'}</span>{isFeatured && <span className="text-[10px] text-amber-400 font-extrabold flex items-center gap-0.5"><Sparkles className="w-3 h-3" /></span>}</button><div className="text-[10px] text-slate-400 font-mono mt-0.5">#{p.id}</div></td>
            <td className="p-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{p.category || 'Hostel'}</span></td>
            <td className="p-4 font-mono"><div className="font-sans font-medium text-slate-200">{p.owner_name || '—'}</div><div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{p.phone || '—'}</div></td>
            <td className="p-4 text-slate-300">{p.area || 'Kota'}</td>
            <td className="p-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-rose-500/10 text-rose-400 border-rose-500/25'}`}>{status}</span></td>
            <td className="p-4">{isPendingRequest ? <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/25">Pending Review</span> : <button onClick={() => onToggleVerification(p, !isVerified)} className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${isVerified ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30'}`} title={isVerified ? 'Click to revoke verified status' : 'Click to grant Verified badge'}>{isVerified ? <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span>Verified</span></> : <><ShieldAlert className="w-3 h-3 text-slate-400" /><span>Verify</span></>}</button>}</td>
            <td className="p-4 text-amber-300 font-bold">{propRating(p) > 0 ? <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-300" /> {propRating(p)}</span> : <span className="text-slate-400">—</span>}</td>
            <td className="p-4 text-slate-300 font-mono">{propViews(p)}</td>
            <td className="p-4 text-slate-400">{shortDate(p.updated_at || p.created_at)}</td>
            <td className="p-4 text-right whitespace-nowrap"><div className="flex items-center justify-end gap-1.5">{!isPendingRequest ? <><button onClick={() => onOpenPreview(p)} className="px-2.5 py-1.5 rounded-lg bg-[#0d1838] hover:bg-[#14224d] text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"><Eye className="w-3 h-3" /><span>Preview</span></button><button onClick={() => onOpenEditor(p, categoryType)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer" title="Edit in Master Editor"><Edit className="w-3.5 h-3.5" /></button><button onClick={() => onDeleteProperty(p)} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer" title="Delete from Live Supabase"><Trash2 className="w-3.5 h-3.5" /></button></> : <span className="text-[10px] text-slate-500 font-semibold">Manage in Listing Requests</span>}</div></td>
          </tr>;
        }) : <tr><td colSpan={11} className="p-8 text-center text-slate-400 text-xs">{pendingLoading && isPendingRequestView ? 'Loading all pending listing requests…' : 'No properties match your current search or filter criteria.'}</td></tr>}
      </tbody></table></div></div>
    </div>
  );
};
