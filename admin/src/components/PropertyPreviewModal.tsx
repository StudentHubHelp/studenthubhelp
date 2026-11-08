import React, { useMemo, useState } from 'react';
import { PropertyItem } from '../types';
import { propVerified, propRating } from '../lib/supabase';
import { X, Fingerprint, MapPin, Home, Clock, Star, Phone, Pencil, ShieldCheck, ChevronDown, ChevronUp, Image as ImageIcon, Info, Building2 } from 'lucide-react';

interface PropertyPreviewModalProps {
  property: PropertyItem | null;
  propertyType?: string;
  onClose: () => void;
  onOpenEditor?: (property: PropertyItem) => void;
  onEdit?: (property: PropertyItem) => void;
  onToggleVerification?: (property: PropertyItem, next: boolean) => void;
  onDelete?: (property: PropertyItem) => void;
}

const LABELS: Record<string, string> = {
  id: 'Database ID', property_id: 'Property ID', name: 'Property Name', title: 'Title',
  category: 'Category', type: 'Property Type', property_type: 'Property Type',
  business_type: 'Business Type', gender: 'Gender', room_types: 'Room Types',
  room_sharing: 'Room Sharing', area: 'Area / Locality', city: 'City', address: 'Full Address',
  full_address: 'Full Address', pincode: 'PIN Code', landmark: 'Nearby Landmark',
  nearby_coaching: 'Nearby Coaching', latitude: 'Latitude', longitude: 'Longitude',
  lat: 'Latitude', lng: 'Longitude', google_maps_url: 'Google Maps URL',
  phone: 'Contact Number', owner_phone: 'Owner Phone', whatsapp: 'WhatsApp',
  email: 'Email', owner_name: 'Owner Name', owner_id: 'Owner ID',
  price: 'Price', rent: 'Rent', monthly_rent: 'Monthly Rent', security_deposit: 'Security Deposit',
  monthly_fee: 'Monthly Fee', daily_fee: 'Daily Fee', weekly_plan: 'Weekly Plan',
  monthly_plan: 'Monthly Plan', daily_plan: 'Daily Plan', delivery_charge: 'Delivery Charge',
  mess_charge: 'Mess Charge', price_range: 'Price Range', timing: 'Timing',
  timings: 'Timings', opening_time: 'Opening Time', closing_time: 'Closing Time',
  weekly_off: 'Weekly Off', description: 'Description', details: 'Additional Details',
  facilities: 'Facilities & Amenities', rules: 'Rules', menu: 'Menu',
  meal_type: 'Meal Type', food_type: 'Food Type', plan_type: 'Plan Type',
  food_available: 'Food Available', delivery_available: 'Delivery Available',
  service_area: 'Service Area', cuisine: 'Cuisine', seating_capacity: 'Seating Capacity',
  available_seats: 'Available Seats', total_beds: 'Total Beds', available_beds: 'Available Beds',
  library_type: 'Library Type', membership: 'Membership', categories: 'Categories',
  classes: 'Classes', stationery: 'Stationery', printing: 'Printing',
  verified: 'Verified', status: 'Listing Status', featured: 'Featured',
  is_featured: 'Featured', rating: 'Rating', views: 'Views', view_count: 'View Count',
  total_views: 'Total Views', bookings: 'Bookings', booking_count: 'Booking Count',
  review_count: 'Review Count', image: 'Main Image', image_url: 'Image URL',
  images: 'Additional Images', photo: 'Photo', photo_url: 'Photo URL',
  cover_image: 'Cover Image', slug: 'Property Slug', created_at: 'Created At',
  updated_at: 'Last Updated', last_verified: 'Last Verified', last_verified_at: 'Last Verified At',
};

const SYSTEM_FIELDS = new Set(['_source_table', 'password', 'access_token', 'refresh_token']);

const formatLabel = (key: string) => LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const displayValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map((v) => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const parseImages = (property: PropertyItem): string[] => {
  const candidates = [property.image, property.image_url, property.photo, property.photo_url, property.cover_image];
  const raw = (property as any).images;
  if (Array.isArray(raw)) candidates.push(...raw);
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) candidates.push(...parsed);
      else candidates.push(raw);
    } catch { candidates.push(...raw.split(/[\n,]/).map((s) => s.trim())); }
  }
  return Array.from(new Set(candidates.filter((v): v is string => typeof v === 'string' && /^https?:\/\//i.test(v))));
};

const GROUPS: Array<{ title: string; keys: string[] }> = [
  { title: 'Property Identity', keys: ['id','property_id','name','title','category','type','property_type','business_type','gender','room_types','room_sharing','slug'] },
  { title: 'Address & Location', keys: ['address','full_address','area','city','pincode','landmark','nearby_coaching','latitude','longitude','lat','lng','google_maps_url','service_area'] },
  { title: 'Pricing & Plans', keys: ['price','rent','monthly_rent','security_deposit','monthly_fee','daily_fee','weekly_plan','monthly_plan','daily_plan','delivery_charge','mess_charge','price_range'] },
  { title: 'Facilities & Services', keys: ['facilities','food_available','food_type','meal_type','plan_type','delivery_available','breakfast_available','lunch_available','dinner_available','jain_food','home_delivery','subscription_available','custom_meal','open_24_hours','ac_available','wifi','charging_point','locker','parking','newspaper','separate_cabin','girls_section','boys_section','power_backup','water','cctv','attached_bathroom','electricity_included','water_available','laundry','mess_available','delivery','takeaway','online_order','upi_payment','competitive_books','stationery','second_hand_books','book_rental','exam_books','school_books','college_books','ncert_books','photocopy','printing','lamination','spiral_binding','notes_available','cuisine','seating_capacity','available_seats','total_beds','available_beds','library_type','membership','categories','classes'] },
  { title: 'Contact & Owner', keys: ['owner_name','owner_id','phone','owner_phone','whatsapp','email'] },
  { title: 'Description, Menu & Rules', keys: ['description','details','menu','rules','timing','timings','opening_time','closing_time','weekly_off'] },
  { title: 'Status & Performance', keys: ['status','verified','featured','is_featured','rating','views','view_count','total_views','bookings','booking_count','review_count','created_at','updated_at','last_verified','last_verified_at'] },
];

export const PropertyPreviewModal: React.FC<PropertyPreviewModalProps> = ({
  property, propertyType = 'hostels', onClose, onOpenEditor, onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'all-fields'>('overview');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!property) return null;

  const verified = propVerified(property);
  const title = property.name || property.title || 'Property Details';
  const phone = property.phone || property.owner_phone || '';
  const images = useMemo(() => parseImages(property), [property]);
  const allKeys = Object.keys(property).filter((key) => !SYSTEM_FIELDS.has(key) && !key.startsWith('__'));
  const assigned = new Set(GROUPS.flatMap((g) => g.keys));
  const extraKeys = allKeys.filter((key) => !assigned.has(key) && !['image','image_url','photo','photo_url','cover_image','images'].includes(key));
  const id = property.property_id || property.id || '—';

  const renderField = (key: string) => {
    const value = (property as any)[key];
    if (value === null || value === undefined || value === '') return null;
    return (
      <div key={key} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{formatLabel(key)}</div>
        <div className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{displayValue(value)}</div>
      </div>
    );
  };

  const openEditor = () => {
    if (onEdit) onEdit(property);
    else onOpenEditor?.(property);
  };

  return (
    <div className="fixed inset-0 z-[500] flex justify-end bg-slate-950/55 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={`Admin details for ${title}`} className="flex h-full w-full max-w-[min(900px,76vw)] flex-col overflow-hidden border-l border-cyan-300/20 bg-[#081321] text-white shadow-[-28px_0_90px_rgba(0,0,0,.55)] animate-in slide-in-from-right duration-200 max-md:max-w-full">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0b1a2b]/95 px-5 py-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300"><Building2 className="h-3.5 w-3.5"/> Admin Property Details</div>
            <h2 className="truncate text-xl font-extrabold text-white">{title}</h2>
            <p className="mt-1 truncate text-xs text-slate-400">ID #{id} · {String((property as any)._source_table || propertyType).replace(/_/g, ' ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={openEditor} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5"><Pencil className="h-4 w-4"/> Edit Property</button>
            <button onClick={onClose} aria-label="Close property details" className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10"><X className="h-4 w-4"/></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="border-b border-white/10 bg-gradient-to-br from-[#10253a] to-[#081321] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold text-cyan-200">{property.category || propertyType}</span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${String(property.status || '').toLowerCase() === 'active' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-200'}`}>{property.status || 'Status not set'}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold ${verified ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-slate-500/25 bg-white/5 text-slate-300'}`}><ShieldCheck className="h-3 w-3"/>{verified ? 'Verified' : 'Not verified'}</span>
              {propRating(property) > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-bold text-amber-200"><Star className="h-3 w-3 fill-current"/>{propRating(property).toFixed(1)} / 5</span>}
            </div>
            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.slice(0,5).map((src, index) => <div key={src} className={`overflow-hidden rounded-xl border border-white/10 bg-black/20 ${index === 0 ? 'col-span-2 row-span-2 sm:col-span-2' : ''}`}><img src={src} alt={`Property photo ${index+1}`} className={`h-full min-h-28 w-full object-cover ${index === 0 ? 'max-h-72' : 'max-h-36'}`} loading="lazy"/></div>)}
              </div>
            ) : (
              <div className="mt-4 flex min-h-36 items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/10 text-sm text-slate-500"><ImageIcon className="h-5 w-5"/> No property photo available in the loaded record</div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] text-slate-500">Locality</div><div className="mt-1 text-sm font-semibold text-slate-100">{property.area || 'Not provided'}</div></div>
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] text-slate-500">City</div><div className="mt-1 text-sm font-semibold text-slate-100">{property.city || 'Not provided'}</div></div>
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] text-slate-500">Contact</div><div className="mt-1 text-sm font-semibold text-slate-100">{phone || 'Not provided'}</div></div>
              <div className="rounded-xl border border-white/10 bg-white/[.035] p-3"><div className="text-[10px] text-slate-500">Rating</div><div className="mt-1 text-sm font-semibold text-slate-100">{propRating(property) > 0 ? propRating(property).toFixed(1) + ' / 5' : 'Not rated'}</div></div>
            </div>
          </section>

          <div className="sticky top-0 z-10 flex gap-2 border-b border-white/10 bg-[#091726]/95 px-5 py-3 backdrop-blur">
            <button onClick={() => setActiveTab('overview')} className={`rounded-lg px-4 py-2 text-xs font-bold ${activeTab === 'overview' ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/25' : 'text-slate-400 hover:bg-white/5'}`}>Overview</button>
            <button onClick={() => setActiveTab('all-fields')} className={`rounded-lg px-4 py-2 text-xs font-bold ${activeTab === 'all-fields' ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/25' : 'text-slate-400 hover:bg-white/5'}`}>All Database Fields ({allKeys.length})</button>
          </div>

          <div className="space-y-5 p-5">
            {activeTab === 'overview' ? (
              <>
                {GROUPS.map((group) => {
                  const fields = group.keys.filter((key) => (property as any)[key] !== null && (property as any)[key] !== undefined && (property as any)[key] !== '');
                  if (!fields.length) return null;
                  const isOpen = expanded[group.title] !== false;
                  return <section key={group.title} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]">
                    <button onClick={() => setExpanded((prev) => ({...prev, [group.title]: !isOpen}))} className="flex w-full items-center justify-between px-4 py-3 text-left"><span className="text-xs font-extrabold uppercase tracking-[.12em] text-cyan-200">{group.title} <span className="ml-1 text-slate-500">({fields.length})</span></span>{isOpen ? <ChevronUp className="h-4 w-4 text-slate-500"/> : <ChevronDown className="h-4 w-4 text-slate-500"/>}</button>
                    {isOpen && <div className="grid gap-2 border-t border-white/5 p-3 sm:grid-cols-2">{fields.map(renderField)}</div>}
                  </section>;
                })}
                {extraKeys.length > 0 && <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[.12em] text-cyan-200">Other stored details</h3><div className="grid gap-2 sm:grid-cols-2">{extraKeys.map(renderField)}</div></section>}
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-400/[.05] p-3 text-xs leading-relaxed text-slate-400"><Info className="mr-2 inline h-4 w-4 text-cyan-300"/>Only values present in this property record are shown. Missing fields are not fabricated. Use “All Database Fields” to inspect every available field.</div>
              </>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><h3 className="mb-3 text-xs font-extrabold uppercase tracking-[.12em] text-cyan-200">Complete loaded property record</h3><div className="grid gap-2 sm:grid-cols-2">{allKeys.filter((key) => !['image','image_url','photo','photo_url','cover_image','images'].includes(key)).map(renderField)}</div></section>
            )}
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#091726] px-5 py-3">
          <div className="min-w-0 text-[11px] text-slate-500"><MapPin className="mr-1 inline h-3.5 w-3.5"/>{property.address || property.full_address || property.area || 'Address not provided'}</div>
          <div className="flex shrink-0 items-center gap-2">
            {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"><Phone className="h-3.5 w-3.5"/> Call</a>}
            <button onClick={openEditor} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2 text-xs font-extrabold text-slate-950"><Pencil className="h-3.5 w-3.5"/> Edit & Save</button>
          </div>
        </footer>
      </aside>
    </div>
  );
};
