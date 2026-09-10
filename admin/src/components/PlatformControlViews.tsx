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

  // Listing Requests
  if (currentSubTab === 'listing-requests') {
    const pendingListings = listingRequests.filter(
      (r) =>
        !searchQuery ||
        (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.phone || '').includes(searchQuery)
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
            onClick={() => exportToCSV(listingRequests, 'listing-requests')}
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
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            (req.status || 'pending') === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : (req.status || 'pending') === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {req.status || 'pending'}
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
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Claim ID</th>
                  <th className="p-4">Property Name</th>
                  <th className="p-4">Claimant Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Claim Message</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {claimRequests.length ? (
                  claimRequests.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">#{c.id}</td>
                      <td className="p-4 font-bold text-white">{c.property_name || 'Property'}</td>
                      <td className="p-4 text-slate-200">{c.claimant_name || 'Claimant'}</td>
                      <td className="p-4 font-mono">{c.phone || '—'}</td>
                      <td className="p-4 text-slate-300">{c.email || '—'}</td>
                      <td className="p-4 text-slate-300 max-w-xs truncate">{c.message || 'Owner verified proof'}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          {c.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onApproveClaim(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onRejectClaim(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      No ownership claim requests pending.
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

  // Verification Center
  if (currentSubTab === 'verification') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Verification Center</h2>
          <p className="text-xs text-slate-400 mt-1">
            Physical and documentary verification queue for trusted badge issuance.
          </p>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Request ID</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Table</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {verificationRequests.length ? (
                  verificationRequests.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">#{v.id}</td>
                      <td className="p-4 font-bold text-white">{v.property_name || 'Property'}</td>
                      <td className="p-4 text-slate-200">{v.owner_name || '—'}</td>
                      <td className="p-4 text-slate-400 font-mono">{v.property_table || 'hostels'}</td>
                      <td className="p-4 text-slate-400">{shortDate(v.created_at)}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          {v.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onApproveVerification(v.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs"
                          >
                            Verify Badge
                          </button>
                          <button
                            onClick={() => onRejectVerification(v.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No verification requests waiting.
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

  // Bookings / Admissions
  if (currentSubTab === 'bookings') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Student Bookings & Admissions</h2>
            <p className="text-xs text-slate-400 mt-1">
              Active student enrollments and room reservations across Kota hostels & study libraries.
            </p>
          </div>
          <button
            onClick={() => exportToCSV(bookings, 'bookings')}
            className="px-3.5 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Bookings</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Left Date</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookings.length ? (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-amber-400 font-bold">{b.id}</td>
                      <td className="p-4 font-bold text-white">{b.student_name || 'Student'}</td>
                      <td className="p-4 text-slate-200">{b.property_name || 'Accommodation'}</td>
                      <td className="p-4 text-slate-300">{b.owner_name || '—'}</td>
                      <td className="p-4 text-slate-300">{shortDate(b.joined_date || b.booking_date || b.created_at)}</td>
                      <td className="p-4 text-slate-400">{shortDate(b.left_date)}</td>
                      <td className="p-4 text-emerald-400 font-medium">{b.duration || 'Semester'}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            b.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {b.status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onToggleBookingStatus(b.id, b.status === 'active' ? 'cancelled' : 'active')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          {b.status === 'active' ? 'Cancel' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      No student booking records found.
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

  // Reviews Moderation
  if (currentSubTab === 'reviews') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Reviews & Feedback Moderation</h2>
          <p className="text-xs text-slate-400 mt-1">
            Director moderation for ratings and comments submitted by student residents.
          </p>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Review ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Feedback Comment</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reviews.length ? (
                  reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">#{r.id}</td>
                      <td className="p-4 font-bold text-white">{r.student_name || 'Student'}</td>
                      <td className="p-4 text-slate-200">{r.property_name || 'Property'}</td>
                      <td className="p-4 font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> {r.rating || 5} ★
                      </td>
                      <td className="p-4 text-slate-300 max-w-md italic">"{r.review || r.comment || 'Helpful'}"</td>
                      <td className="p-4 text-slate-400">{shortDate(r.created_at)}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            r.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {r.status || 'published'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onToggleReviewStatus(r.id, r.status === 'published' ? 'hidden' : 'published')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          {r.status === 'published' ? 'Hide' : 'Publish'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      No reviews found.
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

  // Reports & Grievance
  if (currentSubTab === 'reports') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Reports & Student Grievances</h2>
          <p className="text-xs text-slate-400 mt-1">
            Issues or concerns reported regarding accommodations, hygiene, or security.
          </p>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Report ID</th>
                  <th className="p-4">Reporter</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Reason / Complaint</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.length ? (
                  reports.map((rp) => (
                    <tr key={rp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono text-slate-400">#{rp.id}</td>
                      <td className="p-4 font-bold text-white">{rp.reporter_name || 'Student'}</td>
                      <td className="p-4 text-slate-200">{rp.property_name || 'Property'}</td>
                      <td className="p-4 text-rose-300 font-medium">{rp.reason || 'General Issue'}</td>
                      <td className="p-4 text-slate-400">{shortDate(rp.created_at)}</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          {rp.status || 'investigating'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onResolveReport(rp.id, 'resolved')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
                        >
                          Resolve Complaint
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No grievance reports on file.
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

  // Media / Gallery
  if (currentSubTab === 'media') {
    const handleUploadSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mediaPropId || !uploadFile) {
        alert('Please provide Property ID and choose an image file.');
        return;
      }
      try {
        setUploading(true);
        await onUploadMedia(mediaPropId, uploadFile, mediaCategory);
        setUploadFile(null);
        alert('Image successfully uploaded to property-images bucket.');
      } catch (err: any) {
        alert(err?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Media & Gallery Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Supabase Storage Bucket: <code className="text-amber-400 font-mono">property-images</code>
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800 p-6 shadow-xl">
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-400" /> Upload New Property Image
          </h3>

          <form onSubmit={handleUploadSubmit} className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Property ID *</label>
              <input
                type="text"
                required
                value={mediaPropId}
                onChange={(e) => setMediaPropId(e.target.value)}
                placeholder="e.g. hst-001 or 1000000361"
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Image Category</label>
              <select
                value={mediaCategory}
                onChange={(e) => setMediaCategory(e.target.value)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="Room">Room Interior</option>
                <option value="Building">Building Exterior</option>
                <option value="Mess">Mess / Dining Hall</option>
                <option value="Bathroom">Attached Bathroom</option>
                <option value="Study">Study Hall / Library</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Image File *</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2 text-xs text-slate-300"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading to Storage...' : 'Upload Image'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Gallery Grid */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800 p-6 shadow-xl">
          <h3 className="font-bold text-sm text-white mb-4">Uploaded Images ({mediaImages.length})</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mediaImages.map((img) => (
              <div key={img.id} className="rounded-2xl bg-[#0d1838] border border-slate-800 overflow-hidden group">
                <div className="h-40 bg-slate-950 overflow-hidden relative">
                  <img
                    src={img.public_url || img.url}
                    alt="Gallery"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 text-white">
                    {img.category || 'Room'}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="text-xs text-slate-400 truncate">Property: #{img.property_id}</div>
                  <button
                    onClick={() => onDeleteMedia(img.id)}
                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                    title="Delete Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Featured Properties
  if (currentSubTab === 'featured') {
    const featuredList = properties.filter((p) => p.featured || p.is_featured);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Featured Properties</h2>
          <p className="text-xs text-slate-400 mt-1">
            Top prioritized accommodations displayed prominently on student search portals.
          </p>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Property</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Area</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {featuredList.length ? (
                  featuredList.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>{f.name || 'Property'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                          {f.category || 'Hostel'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{f.owner_name || '—'}</td>
                      <td className="p-4 font-mono text-slate-300">{f.phone || '—'}</td>
                      <td className="p-4 text-slate-300">{f.area || '—'}</td>
                      <td className="p-4 text-amber-400 font-bold">{f.rating || 4.8} ★</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onPreviewProperty(f)}
                            className="px-3 py-1.5 rounded-lg bg-[#0d1838] hover:bg-[#14224d] text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => onUnfeatureProperty(f)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold"
                          >
                            Remove Feature
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No featured properties currently assigned.
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

  return null;
};
