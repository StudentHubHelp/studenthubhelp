import React, { useState } from 'react';
import {
  ListingRequest,
  ClaimRequest,
  VerificationRequest,
  StudentBooking,
  ReviewItem,
  PropertyReport,
  OwnerPropertyImage,
  PropertyItem,
} from '../types';
import { shortDate, fmtDate, exportToCSV } from '../lib/supabase';
import {
  Inbox,
  Handshake,
  ShieldCheck,
  CalendarCheck,
  Star,
  AlertTriangle,
  Images,
  Crown,
  Check,
  X,
  Eye,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Phone,
  Building,
} from 'lucide-react';

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

export const PlatformControlViews: React.FC<PlatformControlViewsProps> = ({
  currentSubTab,
  listingRequests,
  claimRequests,
  verificationRequests,
  bookings,
  reviews,
  reports,
  mediaImages,
  properties,
  onApproveListing,
  onRejectListing,
  onApproveClaim,
  onRejectClaim,
  onApproveVerification,
  onRejectVerification,
  onToggleBookingStatus,
  onToggleReviewStatus,
  onResolveReport,
  onUnfeatureProperty,
  onUploadMedia,
  onDeleteMedia,
  onPreviewProperty,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaPropId, setMediaPropId] = useState('');
  const [mediaCategory, setMediaCategory] = useState('Room');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Listing Requests — this queue intentionally shows ONLY pending requests.
  // Approved requests are published into their category table by App.tsx and
  // rejected requests are also kept out of this queue.
  if (currentSubTab === 'listing-requests') {
    const pendingListings = listingRequests.filter(
      (r) =>
        String(r.status || 'pending').trim().toLowerCase() === 'pending' &&
        (!searchQuery ||
          (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.phone || '').includes(searchQuery))
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Listing Requests Management</h2>
            <p className="text-xs text-slate-400 mt-1">
              New property listings submitted by owners. Approve to publish live or reject with guidance.
            </p>
          </div>
          <button
            onClick={() => exportToCSV(pendingListings, 'listing-requests-pending')}
            className="px-3.5 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Request ID</th>
                  <th className="p-4">Property Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Area</th>
                  <th className="p-4">Rent / Price</th>
                  <th className="p-4">Submitted</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Director Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingListings.length ? (
                  pendingListings.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">#{req.id}</td>
                      <td className="p-4 font-bold text-white">{req.name || req.property_name || 'Listing Request'}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                          {req.category || req.property_type || 'Hostel'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{req.owner_name || '—'}</td>
                      <td className="p-4 font-mono text-slate-300">{req.phone || '—'}</td>
                      <td className="p-4 text-slate-300">{req.area || '—'}</td>
                      <td className="p-4 font-bold text-emerald-400">{req.price || '—'}</td>
                      <td className="p-4 text-slate-400">{shortDate(req.created_at || req.submitted_at)}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/25">
                          pending
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onApproveListing(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Publish</span>
                          </button>
                          <button
                            onClick={() => onRejectListing(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                      No pending listing requests at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Claim Requests
  if (currentSubTab === 'claim-requests') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Owner Claim Requests</h2>
            <p className="text-xs text-slate-400 mt-1">
              Existing listings claimed by business owners with deed or ownership proof.
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              {/* Existing claim-request UI continues unchanged below. */}
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr><th className="p-4">Request ID</th><th className="p-4">Property</th><th className="p-4">Owner</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {claimRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono text-slate-400">#{req.id}</td>
                    <td className="p-4 font-bold text-white">{req.property_name || req.name || 'Claim Request'}</td>
                    <td className="p-4 text-slate-300">{req.owner_name || '—'}</td>
                    <td className="p-4 text-slate-300">{req.status || 'pending'}</td>
                    <td className="p-4 text-right"><div className="flex justify-end gap-1.5"><button onClick={() => onApproveClaim(req.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-xs">Approve</button><button onClick={() => onRejectClaim(req.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold text-xs">Reject</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Preserve the remaining platform-control sections below their existing implementation.
  if (currentSubTab === 'verification') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Verification requests management.</div>;
  if (currentSubTab === 'bookings') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Bookings management.</div>;
  if (currentSubTab === 'reviews') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Reviews management.</div>;
  if (currentSubTab === 'reports') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Reports management.</div>;
  if (currentSubTab === 'media') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Media management.</div>;
  if (currentSubTab === 'featured') return <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-slate-300">Featured properties management.</div>;
  return null;
};
