import React, { useState, useEffect } from 'react';
import { PropertyItem, PropertyType } from '../types';
import { propertyConfig, MASTER_TYPES, propVerified, propFeatured, propStatus, propRating } from '../lib/supabase';
import { X, Save, Building2, MapPin, Phone, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface AdvancedPropertyModalProps {
  isOpen: boolean;
  property: PropertyItem | null;
  propertyType: PropertyType;
  onClose: () => void;
  onSave: (type: PropertyType, propertyData: Partial<PropertyItem>, isNew: boolean) => Promise<void>;
}

export const AdvancedPropertyModal: React.FC<AdvancedPropertyModalProps> = ({
  isOpen,
  property,
  propertyType,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isNew = !property || !property.id;
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
        city: property.city || 'Kota',
        pincode: property.pincode || '324005',
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
        city: 'Kota',
        status: 'active',
        verified: false,
        featured: false,
        timing: propertyType === 'libraries' ? '24/7 Open' : '',
      });
    }
  }, [property, propertyType, isOpen]);

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
      await onSave(selectedType, formData, isNew);
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

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-amber-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Core Details
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <label className="text-xs font-bold text-slate-300">Property / Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Shree Krishna Deluxe Boys PG"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Category Table</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as PropertyType)}
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {MASTER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {propertyConfig[t].title} ({propertyConfig[t].category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Owner Name</label>
                <input
                  type="text"
                  value={formData.owner_name || ''}
                  onChange={(e) => handleChange('owner_name', e.target.value)}
                  placeholder="Owner's full name"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. 9829012345"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">WhatsApp Number</label>
                <input
                  type="tel"
                  value={formData.whatsapp || ''}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="WhatsApp helpline"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Official email"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Price / Rent Display</label>
                <input
                  type="text"
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="e.g. ₹8,500/mo or ₹150 for two"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Operating Hours / Timing</label>
                <input
                  type="text"
                  value={formData.timing || ''}
                  onChange={(e) => handleChange('timing', e.target.value)}
                  placeholder="e.g. 24/7 or 9:00 AM - 10:00 PM"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location & Address */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-amber-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Geographic Location
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Area / Locality *</label>
                <input
                  type="text"
                  required
                  value={formData.area || ''}
                  onChange={(e) => handleChange('area', e.target.value)}
                  placeholder="e.g. Rajeev Gandhi Nagar"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Kota"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="e.g. 324005"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-300">Full Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Complete street address and landmark"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Status, Verification, Featured */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Governance
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Listing Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="active">Active (Publicly Visible)</option>
                  <option value="pending">Pending (Under Review)</option>
                  <option value="suspended">Suspended (Hidden)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Director Verification</label>
                <select
                  value={formData.verified ? 'true' : 'false'}
                  onChange={(e) => handleChange('verified', e.target.value === 'true')}
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="false">Not Verified (Standard)</option>
                  <option value="true">Verified Badge (Director Approved)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Featured Placement</label>
                <select
                  value={formData.featured ? 'true' : 'false'}
                  onChange={(e) => handleChange('featured', e.target.value === 'true')}
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="false">Standard Listing</option>
                  <option value="true">Featured on Homepage Top</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Rating Score (0 to 5)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating ?? ''}
                  onChange={(e) => handleChange('rating', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="e.g. 4.8"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Category Specific Fields */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-amber-400">
              {config.category} Specific Information
            </h3>
            {selectedType === 'hostels' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Gender Allocation</label>
                  <input
                    type="text"
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    placeholder="Boys / Girls / Co-ed"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Room Sharing Types</label>
                  <input
                    type="text"
                    value={formData.room_types || ''}
                    onChange={(e) => handleChange('room_types', e.target.value)}
                    placeholder="Single AC, Double Sharing, Triple"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Total Beds</label>
                  <input
                    type="number"
                    value={formData.total_beds || ''}
                    onChange={(e) => handleChange('total_beds', e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Available Beds</label>
                  <input
                    type="number"
                    value={formData.available_beds || ''}
                    onChange={(e) => handleChange('available_beds', e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Food / Mess Details</label>
                  <input
                    type="text"
                    value={formData.food_available || ''}
                    onChange={(e) => handleChange('food_available', e.target.value)}
                    placeholder="e.g. Pure Veg 4 Meals Included"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Security Deposit</label>
                  <input
                    type="text"
                    value={formData.security_deposit || ''}
                    onChange={(e) => handleChange('security_deposit', e.target.value)}
                    placeholder="e.g. ₹5,000 (Refundable)"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {selectedType === 'tiffins' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Meal Type</label>
                  <input
                    type="text"
                    value={formData.meal_type || ''}
                    onChange={(e) => handleChange('meal_type', e.target.value)}
                    placeholder="Pure Veg / Jain Available"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Plan Options</label>
                  <input
                    type="text"
                    value={formData.plan_type || ''}
                    onChange={(e) => handleChange('plan_type', e.target.value)}
                    placeholder="Monthly, Daily Thali, Per Meal"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Doorstep Delivery Service Area</label>
                  <input
                    type="text"
                    value={formData.service_area || ''}
                    onChange={(e) => handleChange('service_area', e.target.value)}
                    placeholder="e.g. Within 5km radius, Vigyan Nagar, Talwandi"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {selectedType === 'libraries' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Seating Capacity</label>
                  <input
                    type="number"
                    value={formData.seating_capacity || ''}
                    onChange={(e) => handleChange('seating_capacity', e.target.value)}
                    placeholder="e.g. 120 Seats"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Membership Shifts</label>
                  <input
                    type="text"
                    value={formData.membership || ''}
                    onChange={(e) => handleChange('membership', e.target.value)}
                    placeholder="Morning (6am-2pm), Evening, Night 24/7"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Monthly Fees</label>
                  <input
                    type="text"
                    value={formData.monthly_fee || ''}
                    onChange={(e) => handleChange('monthly_fee', e.target.value)}
                    placeholder="e.g. ₹900 - ₹1400"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {selectedType === 'cafes' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Cuisine / Specialties</label>
                  <input
                    type="text"
                    value={formData.cuisine || ''}
                    onChange={(e) => handleChange('cuisine', e.target.value)}
                    placeholder="Beverages, Fast Food, Snacks, Coffee"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Seating Capacity</label>
                  <input
                    type="number"
                    value={formData.seating_capacity || ''}
                    onChange={(e) => handleChange('seating_capacity', e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}

            {selectedType === 'bookstores' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Book Categories Available</label>
                  <input
                    type="text"
                    value={formData.categories || ''}
                    onChange={(e) => handleChange('categories', e.target.value)}
                    placeholder="JEE, NEET, Foundation, UPSC, NCERT"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Stationery & Photocopy Services</label>
                  <input
                    type="text"
                    value={formData.stationery || ''}
                    onChange={(e) => handleChange('stationery', e.target.value)}
                    placeholder="Bulk Photocopy, Spiral Binding, Registers"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Facilities & Description */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-amber-400">
              Facilities & Description
            </h3>
            <div className="grid lg:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300">Facilities / Amenities / Highlights</label>
                <textarea
                  rows={4}
                  value={formData.facilities || ''}
                  onChange={(e) => handleChange('facilities', e.target.value)}
                  placeholder="e.g. WiFi, RO Mineral Water, Daily Cleaning, Biometric Security, AC"
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Comprehensive Description</label>
                <textarea
                  rows={4}
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detailed description for students and parents..."
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </form>

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
