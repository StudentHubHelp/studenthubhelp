import React from 'react';
import { PropertyItem } from '../types';
import { propVerified, propRating } from '../lib/supabase';
import { X, Fingerprint, MapPin, Home, Clock, Star, Phone, Eye } from 'lucide-react';

interface PropertyPreviewModalProps {
  property: PropertyItem | null;
  propertyType?: string;
  onClose: () => void;
  onOpenEditor?: (property: PropertyItem) => void;
}

export const PropertyPreviewModal: React.FC<PropertyPreviewModalProps> = ({
  property,
  propertyType = 'hostels',
  onClose,
  onOpenEditor,
}) => {
  if (!property) return null;

  const isVerified = propVerified(property);
  const title = property.name || property.title || 'Student Accommodation';
  
  // Clean property ID
  let propId = property.property_id || property.slug || property.id || '1000000361';
  if (typeof propId === 'string' && propId.length > 12) {
    const numericPart = propId.replace(/[^0-9]/g, '');
    propId = numericPart.length >= 6 ? numericPart.slice(0, 10) : propId.slice(0, 10);
  }

  // Category Tag
  const categoryTag =
    property.room_types ||
    property.gender ||
    property.category ||
    (propertyType === 'hostels' ? 'Student PG / Hostel' :
     propertyType === 'tiffins' ? 'Tiffin & Mess' :
     propertyType === 'libraries' ? 'Study Library' :
     propertyType === 'cafes' ? 'Student Cafe' : 'Bookstore');

  // Realistic banner images tailored to the category
  const bannerMap: Record<string, string> = {
    hostels: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
    tiffins: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    libraries: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    cafes: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    bookstores: 'https://images.unsplash.com/photo-1507842229451-79b1be886a20?auto=format&fit=crop&w=800&q=80',
  };

  const bannerImg =
    property.image ||
    property.photo ||
    property.image_url ||
    bannerMap[propertyType] ||
    bannerMap.hostels;

  const phone = property.phone || property.owner_phone || '';
  const area = property.area || 'Kota Central';
  const address = property.address || property.full_address || `${area}, Kota, Rajasthan`;
  const timing = property.timing || property.opening_time || 'Open 24 hours / All days';
  const ratingValue = propRating(property);
  const rating = ratingValue > 0 ? ratingValue.toFixed(1) : '4.5';
  const callHref = phone ? `tel:${phone}` : undefined;

  return (
    <div
      id="shPropertyPopup"
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[400px] rounded-[28px] overflow-hidden shadow-2xl transition-all border border-slate-200 font-sans animate-in zoom-in-95 duration-200"
        style={{ background: '#ffffff', color: '#0f172a' }}
      >
        {/* TOP HERO BANNER */}
        <div className="relative w-full h-52 bg-slate-950 overflow-hidden">
          <img
            src={bannerImg}
            alt={title}
            className="w-full h-full object-cover transition-transform hover:scale-105 duration-700"
            loading="eager"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = bannerMap.hostels;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/65 pointer-events-none" />

          {/* Top-Left Badge (Category) */}
          <div className="absolute top-3.5 left-3.5">
            <span
              className="text-[11px] font-extrabold px-3.5 py-1.5 rounded-full shadow-md tracking-wide"
              style={{ background: '#ffffff', color: '#0f172a' }}
            >
              {categoryTag}
            </span>
          </div>

          {/* Top-Right Badge (ID) */}
          <div className="absolute top-3.5 right-3.5">
            <span
              className="text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md border border-white/20 text-white"
              style={{ background: 'rgba(15,23,42,0.88)' }}
            >
              ID #{propId}
            </span>
          </div>

          {/* Bottom-Left Badge (Verified) */}
          <div className="absolute bottom-3.5 left-3.5">
            {isVerified ? (
              <span
                className="text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md inline-flex items-center gap-1.5"
                style={{ background: '#16834b' }}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Verified Listing
              </span>
            ) : (
              <span
                className="text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md inline-flex items-center gap-1.5"
                style={{ background: '#d97706' }}
              >
                <Clock className="w-3 h-3 text-white" />
                Under Review
              </span>
            )}
          </div>
        </div>

        {/* CARD BODY DETAILS */}
        <div className="p-6 space-y-3.5 text-left" style={{ background: '#ffffff', color: '#0f172a' }}>
          {/* Property Name & Close X */}
          <div className="flex items-start justify-between gap-3">
            <h2
              className="text-[22px] font-extrabold leading-snug tracking-tight line-clamp-2"
              style={{ color: '#0f172a' }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-xs transition hover:bg-slate-200 shrink-0"
              style={{ background: '#f1f5f9', color: '#64748b' }}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Property ID Line */}
          <div
            className="flex items-center gap-2 font-bold text-xs"
            style={{ color: '#2563eb' }}
          >
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span>Property ID: #{propId}</span>
          </div>

          {/* Area Line */}
          <div
            className="flex items-center gap-2 font-bold text-xs"
            style={{ color: '#b45309' }}
          >
            <MapPin className="w-4 h-4 text-[#d97706] shrink-0" />
            <span>{area}</span>
          </div>

          {/* Full Address Line */}
          <div
            className="flex items-start gap-2.5 text-xs leading-relaxed"
            style={{ color: '#64748b' }}
          >
            <Home className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{address}</span>
          </div>

          {/* Timing Line */}
          <div
            className="flex items-center gap-2.5 text-xs"
            style={{ color: '#64748b' }}
          >
            <Clock className="w-4 h-4 shrink-0 text-slate-400" />
            <span>{timing}</span>
          </div>

          {/* Rating Badge & Price */}
          <div className="pt-1 flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl border"
              style={{
                background: '#fef9c3',
                borderColor: '#fef08a',
                color: '#854d0e',
              }}
            >
              <Star className="w-3.5 h-3.5 fill-[#eab308] text-[#eab308]" />
              <span>{rating} / 5</span>
            </span>

            {property.price && (
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
                {String(property.price)}
              </span>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenEditor) onOpenEditor(property);
              }}
              className="w-full py-3.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition hover:bg-slate-800 cursor-pointer"
              style={{ background: '#0a192f', color: '#ffffff' }}
            >
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </button>

            <a
              href={callHref || '#'}
              onClick={(e) => {
                if (!phone) {
                  e.preventDefault();
                  alert('Phone number not available for this listing');
                }
              }}
              className="w-full py-3.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition hover:bg-slate-200 text-center"
              style={{
                background: '#f1f5f9',
                color: '#1e293b',
                textDecoration: 'none',
              }}
            >
              <Phone className="w-4 h-4" />
              <span>{phone ? 'Call Owner' : 'No Phone'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
