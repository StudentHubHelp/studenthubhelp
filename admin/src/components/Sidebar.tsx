import React from 'react';
import { SectionTab } from '../types';
import {
  PieChart,
  LineChart,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  Hotel,
  Utensils,
  BookOpen,
  Coffee,
  Store,
  Inbox,
  Handshake,
  AlertOctagon,
  ShieldCheck,
  CalendarCheck,
  Star,
  AlertTriangle,
  Images,
  Crown,
  MapPin,
  Bell,
  History,
  Sliders,
  Tags,
  UserCheck,
  Power,
} from 'lucide-react';

interface SidebarProps {
  currentTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  badges: {
    listingRequests: number;
    claimRequests: number;
    unverifiedProperties: number;
    verificationRequests: number;
    bookings: number;
    reviews: number;
    reports: number;
  };
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  badges,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItemClass = (tab: SectionTab) => {
    const isActive = currentTab === tab;
    return `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
      isActive
        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
    }`;
  };

  const badgeClass = 'text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25';

  const content = (
    <aside className="w-64 h-full max-h-screen bg-[#07132c] border-r border-amber-500/20 flex flex-col overflow-hidden select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/90 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-serif font-black text-lg shadow-md shadow-amber-500/20">
          SH
        </div>
        <div>
          <div className="font-serif font-extrabold text-sm tracking-wide bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            StudentHubHelp
          </div>
          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            DIRECTOR ONLINE
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="p-3 space-y-1 text-xs font-medium flex-1 overflow-y-auto custom-scrollbar">
        {/* Core Overview */}
        <button
          onClick={() => {
            onSelectTab('overview');
            onCloseMobile();
          }}
          className={navItemClass('overview')}
        >
          <span className="flex items-center gap-2.5">
            <PieChart className="w-4 h-4 text-amber-400" />
            <span>Overview Dashboard</span>
          </span>
        </button>

        {/* Analytics & Data Visualization (Prominently Highlighted) */}
        <button
          onClick={() => {
            onSelectTab('analytics');
            onCloseMobile();
          }}
          className={navItemClass('analytics')}
        >
          <span className="flex items-center gap-2.5">
            <LineChart className="w-4 h-4 text-amber-400" />
            <span className="flex items-center gap-1.5">
              Analytics & Graphs
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">PRO</span>
            </span>
          </span>
        </button>

        {/* User Management Hub */}
        <button
          onClick={() => {
            onSelectTab('user-management');
            onCloseMobile();
          }}
          className={navItemClass('user-management')}
        >
          <span className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-amber-400" />
            <span>User Management</span>
          </span>
        </button>

        <button
          onClick={() => {
            onSelectTab('students');
            onCloseMobile();
          }}
          className={navItemClass('students')}
        >
          <span className="flex items-center gap-2.5 pl-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <span>Students</span>
          </span>
        </button>

        <button
          onClick={() => {
            onSelectTab('owners');
            onCloseMobile();
          }}
          className={navItemClass('owners')}
        >
          <span className="flex items-center gap-2.5 pl-2">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>Owners</span>
          </span>
        </button>

        {/* Directory Groups */}
        <div className="pt-3 mt-3 border-t border-slate-800">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold px-3 py-1">
            Directory & Listings
          </div>

          <button
            onClick={() => {
              onSelectTab('properties');
              onCloseMobile();
            }}
            className={navItemClass('properties')}
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>All Properties</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('hostels');
              onCloseMobile();
            }}
            className={navItemClass('hostels')}
          >
            <span className="flex items-center gap-2.5">
              <Hotel className="w-4 h-4 text-amber-400" />
              <span>Hostels & PGs</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('tiffins');
              onCloseMobile();
            }}
            className={navItemClass('tiffins')}
          >
            <span className="flex items-center gap-2.5">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>Tiffin & Mess</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('libraries');
              onCloseMobile();
            }}
            className={navItemClass('libraries')}
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>24/7 Libraries</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('cafes');
              onCloseMobile();
            }}
            className={navItemClass('cafes')}
          >
            <span className="flex items-center gap-2.5">
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Student Cafes</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('bookstores');
              onCloseMobile();
            }}
            className={navItemClass('bookstores')}
          >
            <span className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Bookstores</span>
            </span>
          </button>
        </div>

        {/* Platform Control */}
        <div className="pt-3 mt-3 border-t border-slate-800">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold px-3 py-1">
            Platform Operations
          </div>

          <button
            onClick={() => {
              onSelectTab('listing-requests');
              onCloseMobile();
            }}
            className={navItemClass('listing-requests')}
          >
            <span className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-amber-400" />
              <span>Listing Requests</span>
            </span>
            {badges.listingRequests > 0 && <span className={badgeClass}>{badges.listingRequests}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('claim-requests');
              onCloseMobile();
            }}
            className={navItemClass('claim-requests')}
          >
            <span className="flex items-center gap-2.5">
              <Handshake className="w-4 h-4 text-amber-400" />
              <span>Claim Requests</span>
            </span>
            {badges.claimRequests > 0 && <span className={badgeClass}>{badges.claimRequests}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('unverified-properties');
              onCloseMobile();
            }}
            className={navItemClass('unverified-properties')}
          >
            <span className="flex items-center gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Unverified Queue</span>
            </span>
            {badges.unverifiedProperties > 0 && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
                {badges.unverifiedProperties}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              onSelectTab('verification');
              onCloseMobile();
            }}
            className={navItemClass('verification')}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Verification Center</span>
            </span>
            {badges.verificationRequests > 0 && <span className={badgeClass}>{badges.verificationRequests}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('bookings');
              onCloseMobile();
            }}
            className={navItemClass('bookings')}
          >
            <span className="flex items-center gap-2.5">
              <CalendarCheck className="w-4 h-4 text-amber-400" />
              <span>Bookings / Admissions</span>
            </span>
            {badges.bookings > 0 && <span className={badgeClass}>{badges.bookings}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('reviews');
              onCloseMobile();
            }}
            className={navItemClass('reviews')}
          >
            <span className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Reviews Moderation</span>
            </span>
            {badges.reviews > 0 && <span className={badgeClass}>{badges.reviews}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('reports');
              onCloseMobile();
            }}
            className={navItemClass('reports')}
          >
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Reports & Grievance</span>
            </span>
            {badges.reports > 0 && <span className={badgeClass}>{badges.reports}</span>}
          </button>

          <button
            onClick={() => {
              onSelectTab('media');
              onCloseMobile();
            }}
            className={navItemClass('media')}
          >
            <span className="flex items-center gap-2.5">
              <Images className="w-4 h-4 text-amber-400" />
              <span>Media & Gallery</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('featured');
              onCloseMobile();
            }}
            className={navItemClass('featured')}
          >
            <span className="flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Featured Listings</span>
            </span>
          </button>
        </div>

        {/* Intelligence & Settings */}
        <div className="pt-3 mt-3 border-t border-slate-800">
          <div className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold px-3 py-1">
            System & Settings
          </div>

          <button
            onClick={() => {
              onSelectTab('areas');
              onCloseMobile();
            }}
            className={navItemClass('areas')}
          >
            <span className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Areas & Locations</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('notifications');
              onCloseMobile();
            }}
            className={navItemClass('notifications')}
          >
            <span className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notifications Log</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('activity');
              onCloseMobile();
            }}
            className={navItemClass('activity')}
          >
            <span className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-amber-400" />
              <span>Activity & Audit Trail</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('settings');
              onCloseMobile();
            }}
            className={navItemClass('settings')}
          >
            <span className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>System Settings</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('categories');
              onCloseMobile();
            }}
            className={navItemClass('categories')}
          >
            <span className="flex items-center gap-2.5">
              <Tags className="w-4 h-4 text-amber-400" />
              <span>Category Config</span>
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('admin');
              onCloseMobile();
            }}
            className={navItemClass('admin')}
          >
            <span className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Director Security</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <button
          onClick={onLogout}
          className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Power className="w-4 h-4" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <div className="hidden md:block shrink-0">{content}</div>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-[600] flex md:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseMobile();
          }}
        >
          <div className="w-72 h-full animate-in slide-in-from-left duration-200">{content}</div>
        </div>
      )}
    </>
  );
};
