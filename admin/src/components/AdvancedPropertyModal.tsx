import React, { useState, useEffect } from 'react';
import { PropertyItem, PropertyType } from '../types';
import { propertyConfig, MASTER_TYPES, propVerified, propFeatured, propStatus, propRating, PROPERTY_TABLE_COLUMNS } from '../lib/supabase';
import { X, Save, Building2, MapPin, Phone, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface AdvancedPropertyModalProps {
  property: PropertyItem | null;
  initialType: PropertyType;
  onClose: () => void;
  onSave: (property: PropertyItem) => Promise<void>;
}

export const AdvancedPropertyModal: React.FC<AdvancedPropertyModalProps> = ({
  property,
  initialType,
  onClose,
  onSave,
}) => {
  const isNew = !property || !property.id;
  const propertyType = initialType;
  const config = propertyConfig[propertyType] || propertyConfig.hostels;

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedType, setSelectedType] = useState<PropertyType>(propertyType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedType(propertyType);
    if (property) {
      setFormData({
        ...property,
        name: property.name || property.title || '',
        category: property.category || propertyConfig[propertyType].category,
        business_type: property.type || property.property_type || property.business_type || '',
        owner_name: property.owner_name || '',
        owner_id: property.owner_id || '',
        phone: property.phone || property.owner_phone || '',
        whatsapp: property.whatsapp || '',
        email: property.email || '',
        area: property.area || '',
        city: property.city || '',
        pincode: property.pincode || '',
        address: property.address || property.full_address || '',
        status: propStatus(property),
        verified: propVerified(property),
        featured: propFeatured(property),
        rating: propRating(property) || '',
        price: property.price || property.rent || property.monthly_rent || '',
        timing: property.timing || property.opening_time || '',
        facilities: property.facilities || '',
        description: property.description || property.details || '',
        // category specifics
        room_types: property.room_types || '',
        gender: property.gender || '',
        room_sharing: property.room_sharing || '',
        total_beds: property.total_beds || '',
        available_beds: property.available_beds || '',
        food_available: property.food_available || '',
        food_type: property.food_type || '',
        rules: property.rules || '',
        meal_type: property.meal_type || '',
        plan_type: property.plan_type || '',
        delivery_available: property.delivery_available || '',
        service_area: property.service_area || '',
        cuisine: property.cuisine || '',
        seating_capacity: property.seating_capacity || '',
        monthly_fee: property.monthly_fee || '',
        membership: property.membership || '',
        open_24_hours: property.open_24_hours || '',
        categories: property.categories || '',
        stationery: property.stationery || '',
        printing: property.printing || '',
      });
    } else {
      setFormData({
        category: propertyConfig[propertyType].category,
        city: '',
        status: '',
        verified: false,
        featured: false,
        timing: '',
      });
    }
  }, [property, propertyType]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.area || !formData.address) {
      setError('Please fill in required fields (Name, Phone, Area, and Address).');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const next = { ...(property || {}), ...formData, category: formData.category || config.category } as PropertyItem;
      if (!next.id) next.id = selectedType === 'bookstores' ? String(Date.now()) : `prop-${Date.now()}`;
      await onSave(next);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#081026] text-white font-sans animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0a1430]/90 backdrop-blur shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {isNew ? 'New Property Creation' : 'Master Property Editor'}
            </div>
            <h2 className="text-xl font-bold mt-1 text-slate-100">
              {isNew ? `Add New ${config.singular}` : formData.name || 'Edit Property'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Table: <span className="text-amber-300 font-mono">{selectedType}</span> • Direct live Supabase synchronization
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Exact Supabase schema form */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Exact Supabase Table Columns</div>
              <p className="text-xs text-slate-400 mt-1">{selectedType} table ke actual columns hi Master Editor aur Add Property dono me use hote hain.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROPERTY_TABLE_COLUMNS[selectedType].map((field) => {
                const value = formData[field];
                const isBoolean = ['verified','food_available','delivery_available','breakfast_available','lunch_available','dinner_available','jain_food','home_delivery','subscription_available','custom_meal','open_24_hours','ac_available','wifi','charging_point','locker','parking','newspaper','separate_cabin','girls_section','boys_section','power_backup','water','cctv','attached_bathroom','electricity_included','water_available','laundry','mess_available','delivery','takeaway','online_order','upi_payment','competitive_books','stationery','second_hand_books','book_rental','exam_books','school_books','college_books','ncert_books','photocopy','printing','lamination','spiral_binding','notes_available'].includes(field);
                const isNumber = ['rating','latitude','longitude','monthly_rent','security_deposit','total_beds','available_beds','mess_charge','property_id','price','monthly_fee','delivery_charge','monthly_plan','weekly_plan','daily_plan','daily_fee','seating_capacity','available_seats'].includes(field);
                const isReadonly = ['created_at','updated_at','last_verified','last_verified_at'].includes(field);
                const label = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const displayValue = Array.isArray(value) ? value.join(', ') : value ?? '';
                const required = selectedType === 'bookstores' && ['name','category','area','address','phone'].includes(field);
                return (
                  <div key={field} className={['description','facilities','menu','rules','images','categories'].includes(field) ? 'sm:col-span-2 lg:col-span-3' : ''}>
                    <label className="text-xs font-bold text-slate-300">{label}{field === 'id' ? ' (auto for new)' : required ? ' *' : ''}</label>
                    {isBoolean ? (
                      <select value={value === true ? 'true' : value === false ? 'false' : ''} disabled={isReadonly} onChange={(e) => handleChange(field, e.target.value === '' ? null : e.target.value === 'true')} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"><option value="">NULL / Not set</option><option value="true">TRUE</option><option value="false">FALSE</option></select>
                    ) : field === 'status' ? (
                      <select value={value ?? ''} onChange={(e) => handleChange(field, e.target.value)} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white"><option value="">NULL / Not set</option><option value="active">active</option><option value="pending">pending</option><option value="suspended">suspended</option><option value="rejected">rejected</option></select>
                    ) : ['description','facilities','menu','rules','images','categories'].includes(field) ? (
                      <textarea rows={3} value={displayValue} readOnly={isReadonly} onChange={(e) => handleChange(field, e.target.value)} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400" />
                    ) : (
                      <input type={isNumber ? 'number' : 'text'} step={field === 'rating' ? '0.1' : 'any'} value={displayValue} readOnly={isReadonly} required={required} onChange={(e) => handleChange(field, isNumber && e.target.value !== '' ? Number(e.target.value) : e.target.value)} className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400" />
                    )}
                    <div className="text-[10px] text-slate-600 mt-0.5">DB: {field}</div>
                  </div>
                );
              })}
            </div>
          </div>
        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0a1430]/90 backdrop-blur flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>Saving to Supabase...</>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Property Live
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
