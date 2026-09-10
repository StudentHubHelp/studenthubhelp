import React, { useState, useEffect } from 'react';
import { UserProfile, PropertyType } from '../types';
import { propertyConfig, MASTER_TYPES } from '../lib/supabase';
import { X, Save, Plus, UserCheck } from 'lucide-react';

interface OwnerEditModalProps {
  isOpen: boolean;
  owner: UserProfile | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<UserProfile>) => Promise<void>;
  onAddPropertyForOwner: (owner: UserProfile, propertyType: PropertyType) => void;
}

export const OwnerEditModal: React.FC<OwnerEditModalProps> = ({
  isOpen,
  owner,
  onClose,
  onSave,
  onAddPropertyForOwner,
}) => {
  if (!isOpen || !owner) return null;

  const [fullName, setFullName] = useState(owner.full_name || '');
  const [phone, setPhone] = useState(owner.phone || '');
  const [email, setEmail] = useState(owner.email || '');
  const [address, setAddress] = useState(owner.address || '');
  const [property, setProperty] = useState(owner.property || '');
  const [propertyType, setPropertyType] = useState<PropertyType>('hostels');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(owner.full_name || '');
    setPhone(owner.phone || '');
    setEmail(owner.email || '');
    setAddress(owner.address || '');
    setProperty(owner.property || '');
  }, [owner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Owner name and phone are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(owner.id, {
        full_name: fullName,
        phone,
        email: email || undefined,
        address: address || undefined,
        property: property || undefined,
        role: 'owner',
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to update owner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#081026] text-white p-6 font-sans animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Owner Management
            </div>
            <h3 className="text-xl font-bold text-white mt-1">Edit Owner Information</h3>
            <p className="text-xs text-slate-400 mt-0.5">Name, phone, email, address, and connected businesses</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Owner Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300">Residential Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300">Property / Business Name</label>
              <input
                type="text"
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                placeholder="e.g. Shree Krishna Deluxe Boys PG"
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Owner Live'}
            </button>
          </div>
        </form>

        {/* Quick Add Property for this owner */}
        <div className="border-t border-slate-800 pt-5 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-white">Add Live Property for this Owner</h4>
              <p className="text-xs text-slate-400">The owner's contact info will be prefilled automatically</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {MASTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {propertyConfig[t].category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddPropertyForOwner(owner, propertyType);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Property
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
