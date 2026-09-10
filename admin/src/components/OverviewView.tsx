import React from 'react';
import { SectionTab, PropertyItem, UserProfile, ListingRequest, ClaimRequest, VerificationRequest, StudentBooking, ReviewItem, PropertyReport } from '../types';
import { propViews, propBookings, propRating, propVerified, propStatus, fmtDate } from '../lib/supabase';
import {
  Users,
  GraduationCap,
  Briefcase,
  Hotel,
  Utensils,
  BookOpen,
  Coffee,
  Store,
  Building,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Handshake,
  ShieldCheck,
  CalendarCheck,
  Star,
  Eye,
  TrendingUp,
  Activity,
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface OverviewViewProps {
  onSelectTab: (tab: SectionTab) => void;
  properties: PropertyItem[];
  students: UserProfile[];
  owners: UserProfile[];
  listingRequests: ListingRequest[];
  claimRequests: ClaimRequest[];
  verificationRequests: VerificationRequest[];
  bookings: StudentBooking[];
  reviews: ReviewItem[];
  reports: PropertyReport[];
  dbConnected: boolean;
  adminEmail: string;
  lastSync: string;
  onOpenPropertyPreview: (property: PropertyItem) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onSelectTab,
  properties,
  students,
  owners,
  listingRequests,
  claimRequests,
  verificationRequests,
  bookings,
  reviews,
  reports,
  dbConnected,
  adminEmail,
  lastSync,
  onOpenPropertyPreview,
}) => {
  // Counts
  // IMPORTANT:
  // Category is not reliable for identifying the source table.
  // For example, hostel categories can be "Boy PG", "Girls", etc.
  // The normalized property object contains _source_table, which
  // directly identifies the real Supabase source table.

  const getSourceTable = (p: PropertyItem) =>
    String((p as any)._source_table || '').trim().toLowerCase();

  const hostels = properties.filter(
    (p) => getSourceTable(p) === 'hostels'
  );

  const tiffins = properties.filter(
    (p) => getSourceTable(p) === 'tiffins'
  );

  const libraries = properties.filter(
    (p) => getSourceTable(p) === 'libraries'
  );

  const cafes = properties.filter(
    (p) => getSourceTable(p) === 'cafes'
  );

  const bookstores = properties.filter(
    (p) => getSourceTable(p) === 'bookstores'
  );

  const pendingListings = listingRequests.filter(
    (r) => (r.status || 'pending').toLowerCase() === 'pending'
  ).length;

  const pendingClaims = claimRequests.filter(
    (c) => (c.status || 'pending').toLowerCase() === 'pending'
  ).length;

  const pendingVerifications = verificationRequests.filter(
    (v) => (v.status || 'pending').toLowerCase() === 'pending'
  ).length;

  const pendingBookings = bookings.filter(
    (b) => (b.status || 'active').toLowerCase() === 'pending'
  ).length;

  const pendingReports = reports.filter(
    (rp) => (rp.status || 'investigating').toLowerCase() !== 'resolved'
  ).length;

  const pendingTotal =
    pendingListings +
    pendingClaims +
    pendingVerifications +
    pendingBookings +
    pendingReports;

  const totalViews = properties.reduce(
    (sum, p) => sum + propViews(p),
    0
  );

  const totalBookings = bookings.length;
  const totalReviews = reviews.length;

  // Top Performing Properties
  const mostViewed = [...properties]
    .sort((a, b) => propViews(b) - propViews(a))
    .slice(0, 4);

  const mostBooked = [...properties]
    .sort((a, b) => propBookings(b) - propBookings(a))
    .slice(0, 4);

  const highestRated = [...properties]
    .filter((p) => propRating(p) > 0)
    .sort((a, b) => propRating(b) - propRating(a))
    .slice(0, 4);

  // Smart Alerts
  const unverifiedActive = properties.filter(
    (p) => !propVerified(p) && propStatus(p) === 'active'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-extrabold text-white">
              Director Control Center
            </h2>

            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Live Supabase
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            StudentHubHelp • Kota & Jaipur Student Services Directory Management
          </p>
        </div>

        <button
          onClick={() => onSelectTab('analytics')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <TrendingUp className="w-4 h-4" />
          <span>View Analytics Dashboard</span>
        </button>
      </div>

      {/* Directory Category KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

        <div
          onClick={() => onSelectTab('students')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Students
            </span>
            <GraduationCap className="w-4 h-4 text-blue-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {students.length}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('owners')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Owners
            </span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {owners.length}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('hostels')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Hostels & PG
            </span>
            <Hotel className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {hostels.length}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('tiffins')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Tiffins
            </span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {tiffins.length}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('libraries')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Libraries
            </span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {libraries.length}
          </div>
        </div>

        <div
          onClick={() => onSelectTab('cafes')}
          className="rounded-2xl bg-[#081026] hover:bg-[#0d1838] border border-slate-800 hover:border-amber-500/30 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Cafes
            </span>
            <Coffee className="w-4 h-4 text-rose-400" />
          </div>

          <div className="text-2xl font-extrabold text-white mt-2 group-hover:text-amber-300 transition-colors">
            {cafes.length}
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="rounded-3xl bg-[#081026] border border-slate-800 p-5 shadow-lg">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          System Live Health & Infrastructure
        </h3>

        <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs">
          <div className="bg-[#0d1838] rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400">Database Engine</span>

            <div className="flex items-center gap-1.5 mt-1 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />

              <span
                className={
                  dbConnected
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }
              >
                {dbConnected
                  ? 'Supabase Postgres Connected'
                  : 'Syncing Live Engine...'}
              </span>
            </div>
          </div>

          <div className="bg-[#0d1838] rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400">
              Authenticated Director
            </span>

            <div className="text-white mt-1 font-bold truncate">
              {adminEmail}
            </div>
          </div>

          <div className="bg-[#0d1838] rounded-xl p-3 border border-slate-800">
            <span className="text-slate-400">
              Last Real-time Sync
            </span>

            <div className="text-slate-200 mt-1 font-mono">
              {lastSync || 'Just now'}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Pending Operations */}
      <div className="rounded-3xl bg-[#081026] border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Actionable Pending Operations
            </h3>

            <p className="text-xs text-slate-400">
              Items requiring Director review and approval
            </p>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border ${
              pendingTotal > 0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {pendingTotal > 0
              ? `${pendingTotal} Action Items`
              : 'All Caught Up'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onSelectTab('listing-requests')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-amber-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <Inbox className="w-4 h-4 text-amber-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {pendingListings}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-amber-300">
              Listing Requests
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              New hostels & tiffins
            </div>
          </button>

          <button
            onClick={() => onSelectTab('claim-requests')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-amber-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <Handshake className="w-4 h-4 text-blue-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                {pendingClaims}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-blue-300">
              Claim Requests
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              Owner ownership proofs
            </div>
          </button>

          <button
            onClick={() => onSelectTab('unverified-properties')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-rose-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <ShieldCheck className="w-4 h-4 text-rose-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {unverifiedActive.length}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-rose-300">
              Unverified Queue
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              Active without badge
            </div>
          </button>

          <button
            onClick={() => onSelectTab('verification')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-amber-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <ShieldCheck className="w-4 h-4 text-amber-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {pendingVerifications}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-amber-300">
              Verification Center
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              Document verification
            </div>
          </button>

          <button
            onClick={() => onSelectTab('bookings')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-emerald-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {totalBookings}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-emerald-300">
              Bookings Engine
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              Active admissions
            </div>
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className="rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-rose-500/40 p-3.5 text-left transition-all group"
          >
            <div className="flex justify-between items-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />

              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {pendingReports}
              </span>
            </div>

            <div className="text-xs font-bold text-white mt-2 group-hover:text-rose-300">
              Reports / Grievance
            </div>

            <div className="text-[10px] text-slate-400 mt-0.5">
              Student complaints
            </div>
          </button>
        </div>
      </div>

      {/* Top Performing & Smart Alerts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Top Performing Listings */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Top Performing Properties
            </h3>

            <button
              onClick={() => onSelectTab('properties')}
              className="text-xs text-amber-300 hover:text-white flex items-center gap-1 font-bold"
            >
              <span>All Listings</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {highestRated.map((prop) => (
              <div
                key={prop.id}
                onClick={() => onOpenPropertyPreview(prop)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#0d1838] hover:bg-[#14224d] border border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                    {prop.name || 'Property'}
                  </div>

                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {prop.area || '—'} • {prop.category || '—'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {propRating(prop)} / 5
                  </span>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {propViews(prop)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Admin Alerts */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800 p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Smart Director Alerts
          </h3>

          <div className="space-y-2.5 text-xs">

            {unverifiedActive.length > 0 && (
              <div
                onClick={() => onSelectTab('unverified-properties')}
                className="p-3.5 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 text-slate-200 hover:bg-amber-500/15 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />

                  <span>
                    <strong>
                      {unverifiedActive.length} active listings
                    </strong>{' '}
                    are currently unverified. Inspect and approve badges.
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
            )}

            {pendingListings > 0 && (
              <div
                onClick={() => onSelectTab('listing-requests')}
                className="p-3.5 rounded-2xl bg-blue-500/10 border-l-4 border-blue-500 text-slate-200 hover:bg-blue-500/15 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-blue-400 shrink-0" />

                  <span>
                    <strong>
                      {pendingListings} new listing requests
                    </strong>{' '}
                    await Director approval before appearing live.
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
              </div>
            )}

            {pendingClaims > 0 && (
              <div
                onClick={() => onSelectTab('claim-requests')}
                className="p-3.5 rounded-2xl bg-purple-500/10 border-l-4 border-purple-500 text-slate-200 hover:bg-purple-500/15 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Handshake className="w-4 h-4 text-purple-400 shrink-0" />

                  <span>
                    <strong>
                      {pendingClaims} ownership claim requests
                    </strong>{' '}
                    submitted by property managers.
                  </span>
                </div>

                <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />
              </div>
            )}

            <div
              onClick={() => onSelectTab('analytics')}
              className="p-3.5 rounded-2xl bg-emerald-500/10 border-l-4 border-emerald-500 text-slate-200 hover:bg-emerald-500/15 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />

                <span>
                  Real-time database sync is operational. Student admission engine active.
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
