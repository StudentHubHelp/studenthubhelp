import React, { useEffect, useMemo, useState } from 'react';
import { PropertyItem, PropertyType } from '../types';
import { PROPERTY_TABLE_COLUMNS, propertyConfig, supabase } from '../lib/supabase';
import { AlertCircle, Building2, Save, X } from 'lucide-react';

interface AdvancedPropertyModalProps {
  property: PropertyItem | null;
  initialType: PropertyType;
  onClose: () => void;
  onSave: (property: PropertyItem) => Promise<void>;
}

const BOOLEAN_COLUMNS = new Set([
  'verified','food_available','delivery_available','breakfast_available','lunch_available','dinner_available','jain_food','home_delivery','subscription_available','custom_meal','open_24_hours','ac_available','wifi','charging_point','locker','parking','newspaper','separate_cabin','girls_section','boys_section','power_backup','water','cctv','attached_bathroom','electricity_included','water_available','laundry','mess_available','delivery','takeaway','online_order','upi_payment','competitive_books','stationery','second_hand_books','book_rental','exam_books','school_books','college_books','ncert_books','photocopy','printing','lamination','spiral_binding','notes_available',
]);

const NUMBER_COLUMNS = new Set([
  'rating','latitude','longitude','monthly_rent','security_deposit','total_beds','available_beds','mess_charge','property_id','price','monthly_fee','delivery_charge','monthly_plan','weekly_plan','daily_plan','daily_fee','seating_capacity','available_seats',
]);

const READONLY_COLUMNS = new Set(['created_at','updated_at','last_verified','last_verified_at']);
const TEXTAREA_COLUMNS = new Set(['facilities','description','menu','rules','images','categories','room_types']);

const GROUP_DEFINITIONS: Array<{ key: string; title: string; description: string; fields: string[] }> = [
  { key: 'property', title: 'Property Details', description: 'Core identity, category, type and primary property information.', fields: ['id','name','category','type','property_id','library_type','meal_type','food_type','plan_type','cuisine','price_range','room_types','room_sharing'] },
  { key: 'location', title: 'Address & Location', description: 'Complete address, locality and map/location information.', fields: ['area','address','city','pincode','service_area','latitude','longitude','google_maps_url','nearby_coaching'] },
  { key: 'facilities', title: 'Facilities & Amenities', description: 'Facilities, services and availability options for students.', fields: ['facilities','food_available','delivery_available','breakfast_available','lunch_available','dinner_available','jain_food','home_delivery','subscription_available','custom_meal','open_24_hours','ac_available','wifi','charging_point','locker','parking','newspaper','separate_cabin','girls_section','boys_section','power_backup','water','cctv','attached_bathroom','electricity_included','water_available','laundry','mess_available','delivery','takeaway','online_order','upi_payment','competitive_books','stationery','second_hand_books','book_rental','exam_books','school_books','college_books','ncert_books','photocopy','printing','lamination','spiral_binding','notes_available'] },
  { key: 'contact', title: 'Contact & Other Details', description: 'Owner/contact details, timings, pricing, rules and descriptive information.', fields: ['phone','whatsapp','email','owner_id','owner_name','timing','timings','opening_time','closing_time','weekly_off','monthly_rent','security_deposit','mess_charge','price','monthly_fee','delivery_charge','monthly_plan','weekly_plan','daily_plan','daily_fee','seating_capacity','available_seats','description','menu','rules','classes'] },
  { key: 'media', title: 'Media', description: 'Primary image and additional property images.', fields: ['image','images'] },
  { key: 'verification', title: 'Verification & Metadata', description: 'Publishing, verification, slug and system timestamps.', fields: ['verified','status','slug','created_at','last_verified','last_verified_at','updated_at'] },
];

const SPATIAL_EDITOR_STYLES = `
  .property-editor-spatial-overlay{
    background:radial-gradient(circle at 50% 35%,rgba(34,65,104,.22),transparent 42%),rgba(1,5,14,.82)!important;
    backdrop-filter:blur(10px) saturate(125%);-webkit-backdrop-filter:blur(10px) saturate(125%);
  }
  .property-editor-spatial-overlay::before{
    content:"";position:absolute;inset:0;pointer-events:none;opacity:.34;
    background-image:linear-gradient(rgba(91,180,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(91,180,255,.055) 1px,transparent 1px);
    background-size:42px 42px;
    mask-image:radial-gradient(ellipse at center,#000 15%,transparent 82%);
  }
  .property-editor-spatial-panel{
    position:relative!important;
    background:linear-gradient(145deg,rgba(22,35,60,.78),rgba(5,12,28,.74) 52%,rgba(4,9,20,.82))!important;
    border:1px solid rgba(255,255,255,.18)!important;
    box-shadow:0 45px 120px rgba(0,0,0,.62),0 0 70px rgba(35,119,190,.08),inset 1px 1px rgba(255,255,255,.12),inset -1px -1px rgba(0,0,0,.35)!important;
    backdrop-filter:blur(32px) saturate(135%);-webkit-backdrop-filter:blur(32px) saturate(135%);
    transform:translateZ(0);
  }
  .property-editor-spatial-panel::before{
    content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
    background:linear-gradient(120deg,rgba(255,255,255,.07),transparent 25%,transparent 68%,rgba(245,185,66,.055));
  }
  .property-editor-spatial-panel::after{
    content:"";position:absolute;left:12%;right:12%;top:0;height:1px;pointer-events:none;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.34),rgba(245,185,66,.42),transparent);
  }
  .property-editor-spatial-header{
    position:relative;z-index:1;
    background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(9,18,39,.18))!important;
    border-bottom:1px solid rgba(255,255,255,.10)!important;
    box-shadow:0 18px 35px rgba(0,0,0,.16),inset 0 1px rgba(255,255,255,.06);
  }
  .property-editor-spatial-header button{
    background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.12)!important;
    box-shadow:0 10px 24px rgba(0,0,0,.22),inset 1px 1px rgba(255,255,255,.07);
  }
  .property-editor-spatial-header button:hover{transform:translateY(-2px);border-color:rgba(245,185,66,.45)!important;}
  .property-editor-spatial-form{
    position:relative;z-index:1;
    background:linear-gradient(180deg,rgba(3,9,21,.18),rgba(2,7,17,.34));
  }
  .property-editor-spatial-form::-webkit-scrollbar{width:8px}.property-editor-spatial-form::-webkit-scrollbar-track{background:rgba(5,14,30,.38)}.property-editor-spatial-form::-webkit-scrollbar-thumb{background:rgba(245,185,66,.26);border-radius:999px}
  .property-editor-master-banner{
    position:relative;overflow:hidden;
    background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(255,255,255,.035) 48%,rgba(55,140,210,.07))!important;
    border:1px solid rgba(245,185,66,.24)!important;
    box-shadow:0 18px 42px rgba(0,0,0,.18),inset 1px 1px rgba(255,255,255,.07)!important;
  }
  .property-editor-master-banner::after{content:"";position:absolute;right:-50px;top:-65px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(245,185,66,.13),transparent 68%);pointer-events:none}
  .property-editor-spatial-section{
    position:relative;overflow:hidden;
    background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(8,17,36,.32) 50%,rgba(245,185,66,.018)),rgba(6,14,31,.52)!important;
    border:1px solid rgba(255,255,255,.12)!important;
    box-shadow:0 18px 46px rgba(0,0,0,.24),inset 1px 1px rgba(255,255,255,.065)!important;
    transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;
  }
  .property-editor-spatial-section::before{content:"";position:absolute;left:0;top:0;width:34%;height:1px;background:linear-gradient(90deg,rgba(245,185,66,.52),transparent);pointer-events:none}
  .property-editor-spatial-section:hover{border-color:rgba(255,255,255,.18)!important;box-shadow:0 24px 54px rgba(0,0,0,.28),inset 1px 1px rgba(255,255,255,.075)!important;transform:translateY(-1px)}
  .property-editor-field{position:relative}
  .property-editor-field label{display:block;letter-spacing:.01em}
  .property-editor-field input,.property-editor-field select,.property-editor-field textarea{
    background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(5,13,29,.62))!important;
    border-color:rgba(255,255,255,.12)!important;
    box-shadow:inset 1px 1px rgba(255,255,255,.045),0 8px 20px rgba(0,0,0,.12);
    transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease,background .18s ease;
  }
  .property-editor-field input:hover,.property-editor-field select:hover,.property-editor-field textarea:hover{border-color:rgba(245,185,66,.25)!important}
  .property-editor-field input:focus,.property-editor-field select:focus,.property-editor-field textarea:focus{border-color:rgba(245,185,66,.62)!important;box-shadow:0 0 0 3px rgba(245,185,66,.07),inset 1px 1px rgba(255,255,255,.07),0 12px 26px rgba(0,0,0,.18)!important;transform:translateY(-1px);outline:none}
  .property-editor-db-tag{color:rgba(148,163,184,.52)!important;letter-spacing:.02em}
  .property-editor-spatial-footer{
    position:relative;z-index:1;
    background:linear-gradient(135deg,rgba(12,23,45,.78),rgba(4,10,23,.84))!important;
    border-top:1px solid rgba(255,255,255,.11)!important;
    box-shadow:0 -18px 40px rgba(0,0,0,.22),inset 0 1px rgba(255,255,255,.05);
  }
  .property-editor-spatial-footer button[type="button"]{background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.10);box-shadow:0 10px 22px rgba(0,0,0,.20)}
  .property-editor-spatial-footer button[type="submit"]{border:1px solid rgba(255,238,181,.5)!important;background:linear-gradient(145deg,#ffe29a 0%,#f6bd4d 48%,#d98509 100%)!important;box-shadow:0 16px 36px rgba(245,158,11,.20),inset 1px 1px rgba(255,255,255,.56),inset -1px -2px rgba(107,53,4,.22)!important}
  .property-editor-spatial-footer button:hover{transform:translateY(-2px)}
  @media(max-width:767px){
    .property-editor-spatial-overlay{padding:8px!important}
    .property-editor-spatial-panel{max-height:96vh!important;border-radius:24px!important}
    .property-editor-spatial-form{padding:14px!important}
    .property-editor-spatial-section{padding:14px!important}
    .property-editor-spatial-footer{padding:12px!important}
  }
  @media(prefers-reduced-motion:reduce){.property-editor-spatial-section,.property-editor-field input,.property-editor-field select,.property-editor-field textarea,.property-editor-spatial-footer button,.property-editor-spatial-header button{transition:none!important}.property-editor-spatial-section:hover{transform:none}.property-editor-spatial-footer button:hover,.property-editor-spatial-header button:hover{transform:none}}
`;

function labelFor(field: string) { return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function displayValue(value: any) { if (Array.isArray(value)) return value.join(', '); if (value === null || value === undefined) return ''; return String(value); }
function normalizeInputValue(field: string, value: string) {
  if (BOOLEAN_COLUMNS.has(field)) return value === '' ? null : value === 'true';
  if (NUMBER_COLUMNS.has(field)) return value === '' ? null : Number(value);
  if (field === 'room_types') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return value;
}
function makeTextPropertyId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `property-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
async function makeBookstorePropertyId() {
  const { data, error } = await supabase.from('bookstores').select('id').order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`Unable to prepare bookstore ID: ${error.message}`);
  const currentMax = Number(data?.id || 0);
  return Math.max(currentMax + 1, 1);
}

export const AdvancedPropertyModal: React.FC<AdvancedPropertyModalProps> = ({ property, initialType, onClose, onSave }) => {
  const selectedType = initialType;
  const columns = PROPERTY_TABLE_COLUMNS[selectedType] || PROPERTY_TABLE_COLUMNS.hostels;
  const config = propertyConfig[selectedType];
  const isNew = !property || property.id === undefined || property.id === null || property.id === '';
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, any> = {};
    for (const field of columns) next[field] = property ? (property as any)[field] ?? null : null;
    if (!property) next.category = config.category;
    setFormData(next);
    setError(null);
  }, [property, selectedType]);

  const groups = useMemo(() => {
    const used = new Set<string>();
    return GROUP_DEFINITIONS.map((group) => {
      const fields = group.fields.filter((field) => columns.includes(field));
      fields.forEach((field) => used.add(field));
      return { ...group, fields };
    }).filter((group) => group.fields.length > 0).concat([
      { key: 'other', title: 'Other Details', description: 'Any remaining database fields are kept here so no live field is lost from the Master Editor.', fields: columns.filter((field) => !used.has(field)) },
    ]).filter((group) => group.fields.length > 0);
  }, [columns]);

  const handleChange = (field: string, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!formData.name || !formData.phone || !formData.area || !formData.address) {
      setError('Required: name, phone, area and address.');
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, any> = {};
      for (const field of columns) {
        if (READONLY_COLUMNS.has(field)) continue;
        if (field === 'id' && isNew) continue;
        if (Object.prototype.hasOwnProperty.call(formData, field)) payload[field] = formData[field];
      }

      // New records need a row ID for the database public-ID/entity-key trigger.
      // Insert directly here; existing records continue through the shared update path.
      if (isNew) {
        payload.id = selectedType === 'bookstores' ? await makeBookstorePropertyId() : makeTextPropertyId();
        const { data, error: insertError } = await supabase.from(selectedType).insert(payload).select().single();
        if (insertError) throw new Error(insertError.message);
        if (!data) throw new Error('Property was inserted but Supabase returned no row.');
        await onSave({ ...(data as PropertyItem), _source_table: selectedType } as PropertyItem);
      } else {
        await onSave({ ...payload, _source_table: selectedType } as PropertyItem);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="property-editor-spatial-overlay fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{SPATIAL_EDITOR_STYLES}</style>
      <div className="property-editor-spatial-panel relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#081026] text-white">
        <div className="property-editor-spatial-header p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0a1430] shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{isNew ? 'Add Property' : 'Master Property Editor'}</div>
            <h2 className="text-xl font-bold mt-1">{isNew ? `Add New ${config.singular}` : formData.name || 'Edit Property'}</h2>
            <p className="text-xs text-slate-400 mt-1">Live Supabase table: <span className="text-amber-300 font-mono">{selectedType}</span> · {columns.length} exact DB columns</p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <form
          id="property-master-editor-form"
          onSubmit={handleSubmit}
          className="property-editor-spatial-form flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-5 sm:p-7 space-y-6"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable', scrollBehavior: 'auto', willChange: 'scroll-position', contain: 'layout paint' }}
        >
          {error && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
          <div className="property-editor-master-banner rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Master Data Entry</div><p className="text-xs text-slate-400 mt-1">Fields are grouped for faster and cleaner property data entry. Every exact live database field remains available in the appropriate section.</p></div>

          {groups.map((group) => (
            <section key={group.key} className="property-editor-spatial-section rounded-2xl border border-slate-800 bg-[#0a1430]/70 p-4 sm:p-5">
              <div className="mb-4"><h3 className="text-sm sm:text-base font-extrabold text-white">{group.title}</h3><p className="text-[11px] text-slate-500 mt-1">{group.description}</p></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.fields.map((field) => {
                  const value = formData[field];
                  const isBoolean = BOOLEAN_COLUMNS.has(field);
                  const isNumber = NUMBER_COLUMNS.has(field);
                  const isReadonly = READONLY_COLUMNS.has(field);
                  const isTextarea = TEXTAREA_COLUMNS.has(field);
                  const required = ['name','phone','area','address'].includes(field);
                  const valueForInput = displayValue(value);
                  const isGeneratedId = field === 'id' && isNew;
                  const isGeneratedPublicId = field === 'property_id' && isNew;
                  return (
                    <div key={field} className={`property-editor-field ${isTextarea ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
                      <label className="text-xs font-bold text-slate-300">{labelFor(field)}{isGeneratedId ? ' (auto-generated)' : isGeneratedPublicId ? ' (auto-generated)' : required ? ' *' : ''}</label>
                      {isBoolean ? (
                        <select value={value === true ? 'true' : value === false ? 'false' : ''} disabled={isReadonly} onChange={(e) => handleChange(field, normalizeInputValue(field, e.target.value))} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-sm text-white"><option value="">NULL / Not set</option><option value="true">TRUE</option><option value="false">FALSE</option></select>
                      ) : isTextarea ? (
                        <textarea rows={3} value={valueForInput} readOnly={isReadonly} onChange={(e) => handleChange(field, normalizeInputValue(field, e.target.value))} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400" />
                      ) : (
                        <input type={isNumber ? 'number' : 'text'} step={field === 'rating' ? '0.1' : 'any'} value={valueForInput} readOnly={isReadonly || isGeneratedId || isGeneratedPublicId} required={required} onChange={(e) => handleChange(field, normalizeInputValue(field, e.target.value))} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                      )}
                      <div className="property-editor-db-tag text-[10px] text-slate-600 mt-0.5">DB: {field}{isGeneratedId || isGeneratedPublicId ? ' · system generated' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </form>

        <div className="property-editor-spatial-footer p-4 sm:p-5 border-t border-slate-800 bg-[#0a1430] flex items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">Cancel</button>
          <button type="submit" form="property-master-editor-form" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-2 disabled:opacity-50">{saving ? 'Saving to Supabase...' : <><Save className="w-4 h-4" /> Save Property Live</>}</button>
        </div>
      </div>
    </div>
  );
};
