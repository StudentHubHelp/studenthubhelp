import React, { useEffect, useMemo, useState } from 'react';
import {
  ListingRequest,
  ClaimRequest,
  VerificationRequest,
  StudentBooking,
  ReviewItem,
  PropertyReport,
  OwnerPropertyImage,
  PropertyItem,
  UserProfile,
} from '../types';
import { shortDate, fmtDate, exportToCSV, supabase } from '../lib/supabase';
import { Check, X, Download, Upload, Trash2, Search } from 'lucide-react';

interface PlatformControlViewsProps {
  currentSubTab:
    | 'listing-requests'
    | 'claim-requests'
    | 'verification'
    | 'bookings'
    | 'reviews'
    | 'reports'
    | 'media'
    | 'featured';
  listingRequests: ListingRequest[];
  claimRequests: ClaimRequest[];
  verificationRequests: VerificationRequest[];
  bookings: StudentBooking[];
  reviews: ReviewItem[];
  reports: PropertyReport[];
  mediaImages: OwnerPropertyImage[];
  properties: PropertyItem[];
  students?: UserProfile[];
  owners?: UserProfile[];
  onApproveListing: (id: string | number) => void;
  onRejectListing: (id: string | number) => void;
  onApproveClaim: (id: string | number) => void;
  onRejectClaim: (id: string | number) => void;
  onApproveVerification: (id: string | number) => void;
  onRejectVerification: (id: string | number) => void;
  onToggleBookingStatus: (id: string | number, status: string) => void;
  onToggleReviewStatus: (id: string | number, status: string) => void;
  onResolveReport: (id: string | number, status: string) => void;
  onUnfeatureProperty: (property: PropertyItem) => void;
  onUploadMedia: (propertyId: string, file: File, category: string) => Promise<void>;
  onDeleteMedia: (id: string | number) => void;
  onPreviewProperty: (property: PropertyItem) => void;
}

const tableFor = (value?: string) => {
  const v = String(value || '').toLowerCase().trim();
  if (v.includes('book')) return 'bookstores';
  if (v.includes('cafe')) return 'cafes';
  if (v.includes('library')) return 'libraries';
  if (v.includes('tiffin') || v.includes('mess')) return 'tiffins';
  return 'hostels';
};

const statusClass = (status?: string) => {
  const s = String(status || 'pending').toLowerCase();
  if (s === 'approved' || s === 'published' || s === 'active' || s === 'resolved') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  if (s === 'rejected' || s === 'cancelled' || s === 'dismissed') return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
  return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
};

const Badge = ({ status }: { status?: string }) => <span className={`text-[10px] font-bold px-2 py-1 rounded-full border capitalize ${statusClass(status)}`}>{status || 'pending'}</span>;

export const PlatformControlViews: React.FC<PlatformControlViewsProps> = (props) => {
  const {
    currentSubTab, listingRequests, claimRequests, verificationRequests, bookings, reviews, reports,
    mediaImages, properties, students = [], owners = [], onRejectListing, onApproveClaim, onRejectClaim,
    onApproveVerification, onRejectVerification, onToggleBookingStatus, onToggleReviewStatus,
    onResolveReport, onUnfeatureProperty,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [media, setMedia] = useState<OwnerPropertyImage[]>(mediaImages);
  const [mediaPropId, setMediaPropId] = useState('');
  const [mediaCategory, setMediaCategory] = useState('Room');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadedProfiles, setLoadedProfiles] = useState<UserProfile[]>([...students, ...owners]);

  useEffect(() => setMedia(mediaImages), [mediaImages]);

  useEffect(() => {
    let cancelled = false;
    const loadSectionSupportData = async () => {
      if (['bookings', 'reviews', 'reports', 'verification'].includes(currentSubTab) && loadedProfiles.length === 0) {
        const { data, error } = await supabase.from('profiles').select('*');
        if (!cancelled && !error) setLoadedProfiles(Array.isArray(data) ? data as UserProfile[] : []);
      }
      if (currentSubTab === 'media') {
        const { data, error } = await supabase.from('owner_property_images').select('*').order('created_at', { ascending: false });
        if (!cancelled && !error) setMedia(Array.isArray(data) ? data as OwnerPropertyImage[] : []);
      }
    };
    void loadSectionSupportData();
    return () => { cancelled = true; };
  }, [currentSubTab, loadedProfiles.length]);

  const profileRows = loadedProfiles.length ? loadedProfiles : [...students, ...owners];
  const propertyByKey = useMemo(() => {
    const map = new Map<string, PropertyItem>();
    properties.forEach((p) => {
      const table = String((p as any)._source_table || p.category || '').toLowerCase();
      map.set(`${table}:${String(p.id)}`, p);
      map.set(`:${String(p.id)}`, p);
    });
    return map;
  }, [properties]);
  const studentById = useMemo(() => new Map(profileRows.filter(p => String(p.role || '').toLowerCase() === 'student').map((s) => [String(s.id), s])), [profileRows]);
  const ownerById = useMemo(() => new Map(profileRows.filter(p => String(p.role || '').toLowerCase() === 'owner').map((o) => [String(o.id), o])), [profileRows]);

  const pendingListings = listingRequests.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    const pending = String(r.status || 'pending').toLowerCase() === 'pending';
    if (!pending || !q) return pending;
    return [r.name, r.owner_name, r.phone, r.area, r.category].some((v) => String(v || '').toLowerCase().includes(q));
  });

  if (currentSubTab === 'listing-requests') {
    const approve = async (id: string | number) => {
      setBusyId(id);
      try {
        const { data, error } = await supabase.rpc('admin_approve_listing_request', { p_request_id: Number(id) });
        if (error) throw error;
        if (!data) throw new Error('Listing approval returned no result.');
        window.location.reload();
      } catch (e: any) {
        alert(e?.message || 'Listing approval failed. No request was marked approved.');
        setBusyId(null);
      }
    };
    const reject = async (id: string | number) => {
      setBusyId(id);
      try {
        const { error } = await supabase.from('listing_requests').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
        if (error) throw error;
        onRejectListing(id);
        setBusyId(null);
      } catch (e: any) { alert(e?.message || 'Unable to reject listing request.'); setBusyId(null); }
    };
    return <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-serif font-extrabold text-white">Listing Requests Management</h2><p className="text-xs text-slate-400 mt-1">Only pending requests appear here. Approved listings move to their real property table; rejected requests leave this queue.</p></div><div className="flex gap-2 items-center"><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search request..." className="pl-9 pr-3 py-2 rounded-xl bg-[#0d1838] border border-slate-700 text-xs text-white outline-none"/></div><button onClick={()=>exportToCSV(pendingListings,'listing-requests-pending')} className="px-3 py-2 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5"><Download className="w-3.5 h-3.5"/>CSV</button></div></div>
      <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300 font-bold"><tr>{['Request','Property','Category','Owner','Phone','Area','Submitted','Status','Actions'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{pendingListings.length ? pendingListings.map(r=><tr key={r.id} className="hover:bg-slate-800/40"><td className="p-4 font-mono text-slate-400">#{r.id}</td><td className="p-4 font-bold text-white">{r.name || r.property_name || '—'}</td><td className="p-4 text-slate-300">{r.category || r.property_type || 'Hostel'}</td><td className="p-4 text-slate-300">{r.owner_name || '—'}</td><td className="p-4 text-slate-300">{r.phone || r.owner_phone || '—'}</td><td className="p-4 text-slate-300">{r.area || '—'}</td><td className="p-4 text-slate-400">{shortDate(r.created_at || r.submitted_at)}</td><td className="p-4"><Badge status="pending"/></td><td className="p-4 whitespace-nowrap"><div className="flex gap-1.5"><button disabled={busyId===r.id} onClick={()=>approve(r.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5"/>Approve & Publish</button><button disabled={busyId===r.id} onClick={()=>reject(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1"><X className="w-3.5 h-3.5"/>Reject</button></div></td></tr>) : <tr><td colSpan={9} className="p-10 text-center text-slate-400">No pending listing requests.</td></tr>}</tbody></table></div></div>
    </div>;
  }

  if (currentSubTab === 'claim-requests') {
    const pendingClaims = claimRequests.filter(r=>String(r.status||'pending').toLowerCase()==='pending');
    const approve = async (id:string|number) => { setBusyId(id); try { const {error}=await supabase.rpc('admin_approve_claim_request',{p_claim_id:Number(id)}); if(error)throw error; onApproveClaim(id); setBusyId(null); } catch(e:any){alert(e?.message||'Claim approval failed. Ownership was not changed.');setBusyId(null);} };
    const reject = async (id:string|number) => { setBusyId(id); try { const {error}=await supabase.from('claim_requests').update({status:'rejected',updated_at:new Date().toISOString()}).eq('id',id).eq('status','pending'); if(error)throw error; onRejectClaim(id); setBusyId(null); } catch(e:any){alert(e?.message||'Claim rejection failed.');setBusyId(null);} };
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Owner Claim Requests</h2><p className="text-xs text-slate-400 mt-1">A claim never grants ownership directly. It becomes an owner request first and only an admin approval changes the property owner.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300 font-bold"><tr>{['Request','Property','Type','Claimant','Phone','Submitted','Status','Actions'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{pendingClaims.length?pendingClaims.map(r=>{const p=propertyByKey.get(`${tableFor(r.property_type)}:${r.property_id}`)||propertyByKey.get(`:${r.property_id}`);const o=ownerById.get(String(r.claimant_id||''));return <tr key={r.id} className="hover:bg-slate-800/40"><td className="p-4 font-mono text-slate-400">#{r.id}</td><td className="p-4 font-bold text-white">{r.property_name||p?.name||`Property #${r.property_id}`}</td><td className="p-4 text-slate-300">{r.property_type||'—'}</td><td className="p-4 text-slate-300">{r.claimant_name||r.owner_name||o?.full_name||'—'}</td><td className="p-4 text-slate-300">{r.phone||(r as any).owner_phone||'—'}</td><td className="p-4 text-slate-400">{fmtDate(r.created_at)}</td><td className="p-4"><Badge status={r.status}/></td><td className="p-4"><div className="flex gap-1.5"><button disabled={busyId===r.id} onClick={()=>approve(r.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">Approve & Verify</button><button disabled={busyId===r.id} onClick={()=>reject(r.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">Reject</button></div></td></tr>}) : <tr><td colSpan={8} className="p-10 text-center text-slate-400">No pending ownership claims.</td></tr>}</tbody></table></div></div></div>;
  }

  if (currentSubTab === 'verification') {
    const pending=verificationRequests.filter(r=>String(r.status||'pending').toLowerCase()==='pending');
    const process=async(id:string|number,status:'approved'|'rejected')=>{setBusyId(id);try{const{error}=await supabase.rpc('admin_process_verification_request',{p_request_id:Number(id),p_status:status});if(error)throw error;if(status==='approved')onApproveVerification(id);else onRejectVerification(id);setBusyId(null);}catch(e:any){alert(e?.message||'Verification request could not be processed.');setBusyId(null);}};
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Verification Center</h2><p className="text-xs text-slate-400 mt-1">Review owner verification requests. Approval also marks the linked property as verified.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr>{['Request','Property','Owner','Type','Submitted','Status','Actions'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{pending.length?pending.map(r=>{const p=propertyByKey.get(`${tableFor(r.property_table)}:${r.property_id}`)||propertyByKey.get(`:${r.property_id}`);const o=ownerById.get(String(r.owner_id||''));return <tr key={r.id}><td className="p-4 font-mono text-slate-400">#{r.id}</td><td className="p-4 font-bold text-white">{r.property_name||p?.name||`Property #${r.property_id}`}</td><td className="p-4 text-slate-300">{r.owner_name||o?.full_name||'—'}</td><td className="p-4 text-slate-300">{r.property_table||p?.category||'—'}</td><td className="p-4 text-slate-400">{fmtDate(r.created_at)}</td><td className="p-4"><Badge status={r.status}/></td><td className="p-4"><div className="flex gap-1.5"><button disabled={busyId===r.id} onClick={()=>process(r.id,'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">Approve & Verify</button><button disabled={busyId===r.id} onClick={()=>process(r.id,'rejected')} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">Reject</button></div></td></tr>}) : <tr><td colSpan={7} className="p-10 text-center text-slate-400">No pending verification requests.</td></tr>}</tbody></table></div></div></div>;
  }

  if (currentSubTab === 'bookings') {
    const grouped=new Map<string,StudentBooking[]>();bookings.forEach(b=>{const key=`${b.property_type||(b as any).category||''}:${b.property_id}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key)!.push(b);});
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Bookings / Admissions</h2><p className="text-xs text-slate-400 mt-1">Complete booking history: student, property, booking date, start/join date, duration and current status. Property-wise totals are included below.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="rounded-2xl bg-[#081026] border border-slate-800 p-4"><div className="text-xs text-slate-400">Total bookings</div><div className="text-2xl font-extrabold text-white mt-1">{bookings.length}</div></div><div className="rounded-2xl bg-[#081026] border border-slate-800 p-4"><div className="text-xs text-slate-400">Pending</div><div className="text-2xl font-extrabold text-amber-300 mt-1">{bookings.filter(b=>String(b.status||'').toLowerCase()==='pending').length}</div></div><div className="rounded-2xl bg-[#081026] border border-slate-800 p-4"><div className="text-xs text-slate-400">Active admissions</div><div className="text-2xl font-extrabold text-emerald-300 mt-1">{bookings.filter(b=>String(b.status||'').toLowerCase()==='active').length}</div></div></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr>{['Student','Property','Type','Booked / Created','Start / Joined','Duration','Status','Action'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{bookings.length?bookings.map(b=>{const s=studentById.get(String(b.student_id||''));const p=propertyByKey.get(`${String(b.property_type||b.category||'').toLowerCase()}:${b.property_id}`)||propertyByKey.get(`:${b.property_id}`);const current=String(b.status||'active').toLowerCase();return <tr key={b.id}><td className="p-4"><div className="font-bold text-white">{b.student_name||(b as any).user_name||s?.full_name||s?.name||'Student'}</div><div className="text-slate-500">{b.student_phone||s?.phone||'—'}</div></td><td className="p-4 font-bold text-white">{b.property_name||p?.name||`Property #${b.property_id}`}</td><td className="p-4 text-slate-300">{b.property_type||(b as any).category||'—'}</td><td className="p-4 text-slate-400">{fmtDate(b.booking_date||b.created_at)}</td><td className="p-4 text-slate-300">{fmtDate(b.start_date||b.joined_date)}</td><td className="p-4 text-slate-300">{b.duration||(b as any).duration_months?`${(b as any).duration_months} month(s)`:'—'}</td><td className="p-4"><Badge status={b.status}/></td><td className="p-4"><select value={current} onChange={async e=>{const next=e.target.value;setBusyId(b.id);try{const{error}=await supabase.from('student_bookings').update({status:next}).eq('id',b.id);if(error)throw error;onToggleBookingStatus(b.id,next);}catch(err:any){alert(err?.message||'Booking update failed.');}finally{setBusyId(null);}}} disabled={busyId===b.id} className="bg-[#0d1838] border border-slate-700 text-white rounded-lg px-2 py-1.5"><option value="pending">Pending</option><option value="active">Active</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></td></tr>}) : <tr><td colSpan={8} className="p-10 text-center text-slate-400">No booking records found.</td></tr>}</tbody></table></div></div><div className="rounded-3xl bg-[#081026] border border-slate-800 p-5"><h3 className="font-extrabold text-white mb-4">Property-wise booking totals</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{Array.from(grouped.entries()).map(([key,rows])=><div key={key} className="rounded-2xl border border-slate-800 bg-[#0d1838] p-4"><div className="font-bold text-white">{rows[0].property_name||propertyByKey.get(`:${rows[0].property_id}`)?.name||`Property #${rows[0].property_id}`}</div><div className="text-xs text-slate-400 mt-1">{rows[0].property_type||rows[0].category||'Property'}</div><div className="text-xl font-extrabold text-amber-300 mt-3">{rows.length} student{rows.length===1?'':'s'}</div></div>)}</div></div></div>;
  }

  if (currentSubTab === 'reviews') {
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Reviews Moderation</h2><p className="text-xs text-slate-400 mt-1">Every student review stored in Supabase is shown here, including existing records.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr>{['Student','Property','Rating','Review','Date','Status','Action'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{reviews.length?reviews.map(r=>{const s=studentById.get(String(r.student_id||(r as any).user_id||''));const p=propertyByKey.get(`${String(r.property_type||'').toLowerCase()}:${r.property_id}`)||propertyByKey.get(`:${r.property_id}`);const status=String(r.status||'pending').toLowerCase();return <tr key={r.id}><td className="p-4 font-bold text-white">{r.student_name||(r as any).user_name||s?.full_name||s?.name||'Student'}</td><td className="p-4 font-bold text-white">{r.property_name||p?.name||`Property #${r.property_id}`}</td><td className="p-4 text-amber-300">{'★'.repeat(Math.max(0,Math.min(5,Number(r.rating)||0)))} <span className="text-slate-400">{r.rating??'—'}</span></td><td className="p-4 text-slate-300 max-w-[420px]">{r.review||r.comment||(r as any).review_text||'—'}</td><td className="p-4 text-slate-400">{fmtDate(r.created_at)}</td><td className="p-4"><Badge status={r.status}/></td><td className="p-4"><select value={status} onChange={e=>onToggleReviewStatus(r.id,e.target.value)} className="bg-[#0d1838] border border-slate-700 text-white rounded-lg px-2 py-1.5"><option value="pending">Pending</option><option value="published">Published</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option></select></td></tr>}) : <tr><td colSpan={7} className="p-10 text-center text-slate-400">No reviews found.</td></tr>}</tbody></table></div></div></div>;
  }

  if (currentSubTab === 'reports') {
    const open=reports.filter(r=>String(r.status||'open').toLowerCase()!=='resolved');
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Reports & Grievance</h2><p className="text-xs text-slate-400 mt-1">Property reports remain in Supabase with their resolution status and timestamps.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr>{['Reporter','Property','Reason','Message','Date','Status','Action'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800/60">{reports.length?reports.map(r=>{const p=propertyByKey.get(`${tableFor(r.property_type)}:${r.property_id}`)||propertyByKey.get(`:${r.property_id}`);const s=studentById.get(String(r.reporter_id||''));const o=ownerById.get(String(r.reporter_id||''));const st=String(r.status||'open').toLowerCase();return <tr key={r.id}><td className="p-4 font-bold text-white">{r.reporter_name||s?.full_name||o?.full_name||'User'}</td><td className="p-4 font-bold text-white">{r.property_name||p?.name||`Property #${r.property_id}`}</td><td className="p-4 text-amber-300">{r.reason||'—'}</td><td className="p-4 text-slate-300 max-w-[360px]">{r.description||(r as any).message||'—'}</td><td className="p-4 text-slate-400">{fmtDate(r.created_at)}</td><td className="p-4"><Badge status={r.status}/></td><td className="p-4"><select value={st} onChange={async e=>{const next=e.target.value;setBusyId(r.id);try{const{error}=await supabase.from('property_reports').update({status:next,resolved_at:next==='resolved'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',r.id);if(error)throw error;onResolveReport(r.id,next);}catch(err:any){alert(err?.message||'Report update failed.')}finally{setBusyId(null);}}} disabled={busyId===r.id} className="bg-[#0d1838] border border-slate-700 text-white rounded-lg px-2 py-1.5"><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></td></tr>}) : <tr><td colSpan={7} className="p-10 text-center text-slate-400">No reports found.</td></tr>}</tbody></table></div></div><div className="text-xs text-slate-500">Open / investigating records: {open.length}</div></div>;
  }

  if (currentSubTab === 'media') {
    const upload=async()=>{if(!uploadFile||!mediaPropId){alert('Select a property and an image first.');return;}setUploading(true);try{const{data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error('Admin session not found.');const property=properties.find(p=>String(p.id)===String(mediaPropId));if(!property)throw new Error('Property not found.');const propertyTable=String((property as any)._source_table||tableFor(property.category));const ownerId=String(property.owner_id||auth.user.id);const ext=uploadFile.name.split('.').pop()?.toLowerCase()||'jpg';const safe=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;const path=`${auth.user.id}/admin/${propertyTable}/${mediaPropId}/${safe}`;const{error:storageError}=await supabase.storage.from('property-images').upload(path,uploadFile,{upsert:false,contentType:uploadFile.type||undefined});if(storageError)throw storageError;const{data:publicData}=supabase.storage.from('property-images').getPublicUrl(path);const{data:row,error:dbError}=await supabase.from('owner_property_images').insert({property_id:String(mediaPropId),property_table:propertyTable,owner_id:ownerId,image_url:publicData.publicUrl,image_type:mediaCategory.toLowerCase(),storage_path:path,is_main:false}).select('*').single();if(dbError){await supabase.storage.from('property-images').remove([path]);throw dbError;}setMedia(prev=>[row as OwnerPropertyImage,...prev]);setUploadFile(null);const input=document.getElementById('adminMediaUpload') as HTMLInputElement|null;if(input)input.value='';}catch(e:any){alert(e?.message||'Media upload failed.')}finally{setUploading(false)}};
    const remove=async(item:OwnerPropertyImage)=>{if(!window.confirm('Delete this image permanently?'))return;try{if(item.storage_path){const{error}=await supabase.storage.from('property-images').remove([String(item.storage_path)]);if(error)throw error;}const{error}=await supabase.from('owner_property_images').delete().eq('id',item.id);if(error)throw error;setMedia(prev=>prev.filter(m=>String(m.id)!==String(item.id)));}catch(e:any){alert(e?.message||'Unable to delete media.')}};
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Media & Gallery</h2><p className="text-xs text-slate-400 mt-1">Persistent Supabase Storage gallery. Uploads are stored in the existing property-images bucket.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 p-5"><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><select value={mediaPropId} onChange={e=>setMediaPropId(e.target.value)} className="bg-[#0d1838] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"><option value="">Select property</option>{properties.map(p=><option key={`${p.id}-${(p as any)._source_table||p.category}`} value={String(p.id)}>{p.name||`Property #${p.id}`} — {(p as any)._source_table||p.category}</option>)}</select><select value={mediaCategory} onChange={e=>setMediaCategory(e.target.value)} className="bg-[#0d1838] border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"><option>Room</option><option>Exterior</option><option>Food</option><option>Study Area</option><option>Bathroom</option><option>Other</option></select><input id="adminMediaUpload" type="file" accept="image/*" onChange={e=>setUploadFile(e.target.files?.[0]||null)} className="text-xs text-slate-300"/><button disabled={uploading} onClick={upload} className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center gap-2"><Upload className="w-4 h-4"/>{uploading?'Uploading...':'Upload to Gallery'}</button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{media.length?media.map(m=><div key={m.id} className="rounded-2xl overflow-hidden border border-slate-800 bg-[#081026]"><img src={m.public_url||m.url||(m as any).image_url} alt={m.file_name||'Property media'} className="w-full h-44 object-cover"/><div className="p-3 flex items-center justify-between gap-2"><div><div className="text-xs font-bold text-white">{m.category||m.image_type||'Image'}</div><div className="text-[10px] text-slate-500">{shortDate(m.created_at)}</div></div><button onClick={()=>remove(m)} className="p-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20"><Trash2 className="w-4 h-4"/></button></div></div>):<div className="col-span-full p-10 text-center text-slate-400 rounded-2xl border border-dashed border-slate-700">No gallery images found.</div>}</div></div>;
  }

  if (currentSubTab === 'featured') {
    const featured=properties.filter(p=>Boolean((p as any).featured||(p as any).is_featured));
    return <div className="space-y-6"><div><h2 className="text-2xl font-serif font-extrabold text-white">Featured Properties</h2><p className="text-xs text-slate-400 mt-1">Existing featured properties only.</p></div><div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden"><table className="w-full text-left text-xs"><thead className="bg-[#0d1838] text-amber-300"><tr><th className="p-4">Property</th><th className="p-4">Category</th><th className="p-4">Area</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-slate-800/60">{featured.length?featured.map(p=><tr key={p.id}><td className="p-4 font-bold text-white">{p.name}</td><td className="p-4 text-slate-300">{p.category}</td><td className="p-4 text-slate-300">{p.area}</td><td className="p-4"><button onClick={()=>onUnfeatureProperty(p)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">Remove feature</button></td></tr>):<tr><td colSpan={4} className="p-10 text-center text-slate-400">No featured properties.</td></tr>}</tbody></table></div></div>;
  }

  return null;
};
