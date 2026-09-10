import React from 'react';
import { UserProfile, PropertyItem, StudentBooking, ReviewItem } from '../types';
import { fmtDate, normalizePhone } from '../lib/supabase';
import { X, User, Phone, Mail, MapPin, Calendar, Building, BookOpen, Star, ShieldCheck, Ban, CheckCircle, Trash2 } from 'lucide-react';

interface UserProfileModalProps {
  user: UserProfile | null;
  properties: PropertyItem[];
  bookings: StudentBooking[];
  reviews: ReviewItem[];
  onClose: () => void;
  onToggleStatus: (id: string, currentlyDisabled: boolean) => void;
  onDeleteUser: (id: string) => void;
  onViewProperty: (property: PropertyItem) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  properties,
  bookings,
  reviews,
  onClose,
  onToggleStatus,
  onDeleteUser,
  onViewProperty,
}) => {
  if (!user) return null;

  const role = user.role || 'user';
  const isOwner = role.toLowerCase() === 'owner';
  const status = user.status || user.account_status || 'active';
  const isDisabled = ['disabled', 'inactive', 'blocked', 'suspended'].includes(status.toLowerCase());
  const phone = user.phone || '';
  const email = user.email || '';
  const normPhone = normalizePhone(phone);

  // Match properties for owner
  const matchedProperties = (properties || []).filter((p) => {
    return (
      (p.owner_id && String(p.owner_id) === String(user.id)) ||
      (normPhone && normalizePhone(p.phone) === normPhone)
    );
  });

  // Match bookings and reviews for student
  const userBookings = (bookings || []).filter((b) => {
    return String(b.student_id) === String(user.id) || (normPhone && normalizePhone(b.student_phone) === normPhone);
  });

  const userReviews = (reviews || []).filter((r) => {
    return String(r.student_id) === String(user.id) || String(r.student_name).toLowerCase() === String(user.full_name).toLowerCase();
  });

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-700/60 bg-[#081026] text-white p-6 font-sans animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{user.full_name || 'User Profile'}</h3>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isOwner
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {role}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isDisabled
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isDisabled ? 'Disabled' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: #{user.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contact info grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 my-5">
          <div className="bg-[#0d1838] border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Phone
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1">{phone || '—'}</div>
          </div>
          <div className="bg-[#0d1838] border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Mail className="w-3.5 h-3.5 text-amber-400" /> Email
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate" title={email}>{email || '—'}</div>
          </div>
          <div className="bg-[#0d1838] border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Location
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">{user.address || user.city || 'Kota, Rajasthan'}</div>
          </div>
          <div className="bg-[#0d1838] border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Joined
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1">{fmtDate(user.created_at)}</div>
          </div>
        </div>

        {/* Role-specific section */}
        {isOwner ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Building className="w-4 h-4" /> Connected Properties ({matchedProperties.length})
              </h4>
              <span className="text-[11px] text-slate-400">Matched by Owner ID & Phone</span>
            </div>
            {matchedProperties.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {matchedProperties.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => {
                      onClose();
                      onViewProperty(prop);
                    }}
                    className="bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-sm text-slate-200 group-hover:text-amber-300 transition-colors">
                        {prop.name || 'Property'}
                      </h5>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {prop.category || 'Hostel'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {prop.area || 'Kota'} • {prop.phone || 'No phone'}
                    </div>
                    {prop.price && (
                      <div className="text-xs font-bold text-emerald-400 mt-2">
                        {String(prop.price)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#0d1838] border border-slate-800 text-center text-xs text-slate-400">
                No active property listings currently linked to this owner's phone ({phone || 'none'}).
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" /> Bookings & Admissions ({userBookings.length})
              </h4>
              {userBookings.length ? (
                <div className="space-y-2">
                  {userBookings.map((b) => (
                    <div key={b.id} className="bg-[#0d1838] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-200">{b.property_name || 'Property Admission'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Duration: {b.duration || 'Semester'} • Start: {fmtDate(b.joined_date || b.start_date || b.created_at)}
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {b.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0d1838] border border-slate-800 text-xs text-slate-400">
                  No property bookings on record.
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-2">
                <Star className="w-4 h-4" /> Reviews Given ({userReviews.length})
              </h4>
              {userReviews.length ? (
                <div className="space-y-2">
                  {userReviews.map((r) => (
                    <div key={r.id} className="bg-[#0d1838] border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-200">{r.property_name || 'Listing Review'}</span>
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" /> {r.rating || 5} / 5
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 italic">"{r.review || r.comment || 'Helpful place'}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#0d1838] border border-slate-800 text-xs text-slate-400">
                  No public reviews submitted yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-800">
          <div className="flex gap-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call User
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Send Email
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onToggleStatus(user.id, isDisabled)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isDisabled
                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
              }`}
            >
              {isDisabled ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" /> Enable Account
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" /> Disable Account
                </>
              )}
            </button>

            <button
              onClick={() => onDeleteUser(user.id)}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
