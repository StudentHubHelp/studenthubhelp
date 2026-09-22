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
  CalendarDays,
  AlertTriangle,
  Images,
  Crown,
  MapPin,
  Bell,
  History,
  Sliders,
  Tags,
  Power,
  Bot,
  User
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
    appointments: number;
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
  onCloseMobile
}) => {
  const navItemClass = (tab: SectionTab) => {
    const isActive = currentTab === tab;

    return `group relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[12px] font-bold tracking-[0.01em] transition-all duration-200 ease-out overflow-hidden ${
      isActive
        ? 'bg-gradient-to-r from-blue-500/18 via-blue-500/10 to-cyan-400/5 text-white border border-blue-400/30 shadow-[0_8px_26px_rgba(37,99,235,0.12)]'
        : 'text-slate-300/95 hover:text-white hover:bg-blue-500/[0.055] border border-transparent'
    }`;
  };

  const badgeClass =
    'text-[9px] leading-none font-extrabold px-1.5 py-1 rounded-full bg-blue-500/10 text-cyan-300 border border-cyan-400/20';

  const item = (
    tab: SectionTab,
    label: string,
    Icon: any,
    badge?: number
  ) => (
    <button
      onClick={() => {
        onSelectTab(tab);
        onCloseMobile();
      }}
      className={navItemClass(tab)}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/[0.055] text-cyan-300/90 transition-all duration-200 group-hover:bg-blue-500/10 group-hover:text-cyan-200">
          <Icon className="w-[15px] h-[15px]" strokeWidth={1.9} />
        </span>
        <span className="truncate">{label}</span>
      </span>

      {badge && badge > 0 ? (
        <span className={badgeClass}>{badge}</span>
      ) : null}

      {currentTab === tab && (
        <span className="pointer-events-none absolute left-0 top-1/2 h-5/6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-600 shadow-[0_0_14px_rgba(56,189,248,0.75)]" />
      )}
    </button>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div className="pt-3 mt-3 border-t border-blue-200/[0.07]">
      <div className="text-[9px] uppercase tracking-[0.19em] text-slate-500 font-extrabold px-3 pb-2">
        {title}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );

  const content = (
    <aside
      className={`fixed inset-y-0 left-0 z-[600] w-[min(82vw,292px)] md:static md:z-auto md:w-[272px] h-screen max-h-screen shrink-0 bg-[#07132c] border border-blue-400/[0.13] flex flex-col overflow-hidden select-none transform transition-transform duration-200 ease-out ${
        isOpenMobile
          ? 'translate-x-0'
          : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="px-4 py-4 border-b border-blue-200/[0.08] flex items-center gap-3 shrink-0">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-400 text-white flex items-center justify-center font-serif font-black text-lg shadow-[0_8px_24px_rgba(37,99,235,0.24)] ring-1 ring-cyan-200/10">
          SH
        </div>

        <div className="min-w-0">
          <div className="font-serif font-extrabold text-[15px] tracking-wide bg-gradient-to-r from-blue-200 via-sky-200 to-cyan-300 bg-clip-text text-transparent truncate">
            StudentHubHelp
          </div>

          <div className="text-[9px] text-emerald-400 font-bold tracking-wide flex items-center gap-1.5 mt-0.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
            DIRECTOR ONLINE
          </div>
        </div>
      </div>

      <nav className="px-3 py-3 text-xs font-medium flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {item('overview', 'Overview Dashboard', PieChart)}
          {item('analytics', 'Analytics & Graphs', LineChart)}
          {item('user-management', 'User Management', Users)}
          {item('students', 'Students', GraduationCap)}
          {item('owners', 'Owners', Briefcase)}
          {item('partners', 'Partner Network', Handshake)}
        </div>

        {section('AI & Automation',
          <>
            {item('admin-profile', 'Admin Profile', User)}
            {item('chatbot-crm', 'AI Chatbot & CRM', Bot)}
          </>
        )}

        {section('Directory & Listings',
          <>
            {item('properties', 'All Properties', Building2)}
            {item('suspended-properties', 'Suspended Properties', AlertTriangle)}
            {item('hostels', 'Hostels & PGs', Hotel)}
            {item('tiffins', 'Tiffin & Mess', Utensils)}
            {item('libraries', '24/7 Libraries', BookOpen)}
            {item('cafes', 'Student Cafes', Coffee)}
            {item('bookstores', 'Bookstores', Store)}
          </>
        )}

        {section('Platform Operations',
          <>
            {item('listing-requests', 'Listing Requests', Inbox, badges.listingRequests)}
            {item('claim-requests', 'Claim Requests', Handshake, badges.claimRequests)}
            {item('unverified-properties', 'Unverified Queue', AlertOctagon, badges.unverifiedProperties)}
            {item('verification', 'Verification Center', ShieldCheck, badges.verificationRequests)}
            {item('bookings', 'Bookings / Admissions', CalendarCheck, badges.bookings)}
            {item('appointments', 'Appointments', CalendarDays, badges.appointments)}
            {item('reviews', 'Reviews Moderation', Star, badges.reviews)}
            {item('reports', 'Reports & Grievance', AlertTriangle, badges.reports)}
            {item('media', 'Media & Gallery', Images)}
            {item('featured', 'Featured Listings', Crown)}
          </>
        )}

        {section('System & Settings',
          <>
            {item('areas', 'Areas & Locations', MapPin)}
            {item('notifications', 'Notifications Log', Bell)}
            {item('activity', 'Activity & Audit Trail', History)}
            {item('settings', 'System Settings', Sliders)}
            {item('categories', 'Category Config', Tags)}
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-blue-200/[0.08] shrink-0 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 hover:bg-blue-500/[0.055] border border-transparent transition-all duration-200"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/40 text-slate-400 group-hover:text-cyan-300">
            <Power className="w-[15px] h-[15px]" strokeWidth={1.9} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {content}

      {isOpenMobile && (
        <div
          className="fixed inset-0 z-[500] bg-black/60 md:hidden"
          onClick={onCloseMobile}
        />
      )}
    </>
  );
};
