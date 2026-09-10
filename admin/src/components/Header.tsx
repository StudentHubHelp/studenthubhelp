import React, { useState, useEffect, useRef } from 'react';
import { SectionTab, PropertyItem, UserProfile, ListingRequest } from '../types';
import { Search, SlidersHorizontal, RefreshCw, Bell, Globe, Shield, CheckCircle2, Star, Hotel, Utensils, BookOpen, Coffee, Store, User, Inbox } from 'lucide-react';

interface HeaderProps {
  currentTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  unreadNotifications: number;
  properties: PropertyItem[];
  students: UserProfile[];
  owners: UserProfile[];
  listingRequests: ListingRequest[];
  onOpenPropertyPreview: (prop: PropertyItem) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
  onRefresh,
  isRefreshing,
  unreadNotifications,
  properties,
  students,
  owners,
  listingRequests,
  onOpenPropertyPreview,
  onOpenUserProfile,
  onToggleMobileSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isOpenResults, setIsOpenResults] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('globalSearchInput');
        input?.focus();
        setIsOpenResults(true);
      }
      if (e.key === 'Escape') {
        setIsOpenResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close results dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsOpenResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Search results
  const getSearchResults = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q && !selectedEntity && !selectedCity && !selectedArea && !verifiedOnly) return [];

    const results: Array<{
      id: string | number;
      type: 'property' | 'user' | 'listing_request';
      category: string;
      title: string;
      subtitle: string;
      verified?: boolean;
      status?: string;
      rating?: number | null;
      original: any;
    }> = [];

    // Search properties
    if (!selectedEntity || ['hostels', 'tiffins', 'libraries', 'cafes', 'bookstores', 'properties'].includes(selectedEntity)) {
      properties.forEach((p) => {
        const titleMatch = (p.name || p.title || '').toLowerCase().includes(q);
        const areaMatch = (p.area || '').toLowerCase().includes(q) || (selectedArea ? (p.area || '').toLowerCase().includes(selectedArea.toLowerCase()) : true);
        const cityMatch = (p.city || '').toLowerCase().includes(q) || (selectedCity ? (p.city || '').toLowerCase().includes(selectedCity.toLowerCase()) : true);
        const phoneMatch = (p.phone || '').includes(q);
        const ownerMatch = (p.owner_name || '').toLowerCase().includes(q);
        const verifiedMatch = !verifiedOnly || p.verified;
        const categoryMatch = !selectedEntity || p.category?.toLowerCase() === selectedEntity.toLowerCase();

        if ((!q || titleMatch || areaMatch || cityMatch || phoneMatch || ownerMatch) && verifiedMatch && categoryMatch) {
          results.push({
            id: p.id,
            type: 'property',
            category: p.category || 'Hostel',
            title: p.name || p.title || 'Property',
            subtitle: `${p.area || 'Kota'} • ${p.phone || 'No phone'} • ${p.owner_name || 'Owner'}`,
            verified: p.verified,
            status: p.status,
            rating: p.rating,
            original: p,
          });
        }
      });
    }

    // Search users
    if (!selectedEntity || selectedEntity === 'user' || selectedEntity === 'profile') {
      [...students, ...owners].forEach((u) => {
        const nameMatch = (u.full_name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || '').includes(q);
        const addressMatch = (u.address || '').toLowerCase().includes(q);

        if (!q || nameMatch || emailMatch || phoneMatch || addressMatch) {
          results.push({
            id: u.id,
            type: 'user',
            category: u.role === 'owner' ? 'Owner' : 'Student',
            title: u.full_name || 'User Profile',
            subtitle: `${u.role?.toUpperCase()} • ${u.phone || 'No phone'} • ${u.email || 'No email'}`,
            status: u.status,
            original: u,
          });
        }
      });
    }

    // Search listing requests
    if (!selectedEntity || selectedEntity === 'listing_request') {
      listingRequests.forEach((lr) => {
        const nameMatch = (lr.name || lr.property_name || '').toLowerCase().includes(q);
        const ownerMatch = (lr.owner_name || '').toLowerCase().includes(q);
        const phoneMatch = (lr.phone || '').includes(q);
        const areaMatch = (lr.area || '').toLowerCase().includes(q);

        if (!q || nameMatch || ownerMatch || phoneMatch || areaMatch) {
          results.push({
            id: lr.id,
            type: 'listing_request',
            category: 'Listing Request',
            title: lr.name || lr.property_name || 'Request',
            subtitle: `PENDING REQUEST • ${lr.area || 'Area'} • ${lr.phone || ''}`,
            status: lr.status,
            original: lr,
          });
        }
      });
    }

    return results.slice(0, 15);
  };

  const results = getSearchResults();

  return (
    <header className="sticky top-0 z-40 bg-[#081026]/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:bg-[#14224d] transition-colors"
          title="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Global Search Bar */}
        <div ref={searchWrapRef} className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-amber-400 pointer-events-none" />
            <input
              id="globalSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpenResults(true);
              }}
              onFocus={() => setIsOpenResults(true)}
              placeholder="Search students, owners, properties, phone, email, area..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[#0d1838] border border-amber-500/30 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono border border-slate-700">
                ⌘K
              </span>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  showFilters
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Search Filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Filters Dropdown */}
          {showFilters && (
            <div className="absolute left-0 right-0 top-12 mt-2 p-3.5 rounded-2xl bg-[#081026] border border-amber-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Entity Type</label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">All Types</option>
                    <option value="hostels">Hostels / PG</option>
                    <option value="tiffins">Tiffins</option>
                    <option value="libraries">Libraries</option>
                    <option value="cafes">Cafes</option>
                    <option value="bookstores">Bookstores</option>
                    <option value="user">Students / Owners</option>
                    <option value="listing_request">Listing Requests</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Kota / Jaipur"
                    className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Area</label>
                  <input
                    type="text"
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    placeholder="e.g. Rajeev Gandhi Nagar"
                    className="w-full bg-[#0d1838] border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>Verified Only</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntity('');
                    setSelectedCity('');
                    setSelectedArea('');
                    setVerifiedOnly(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {isOpenResults && (searchQuery.trim() || showFilters) && (
            <div className="absolute left-0 right-0 top-12 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-[#081026] border border-amber-500/30 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in duration-150">
              {results.length ? (
                results.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => {
                      setIsOpenResults(false);
                      if (r.type === 'property') {
                        onOpenPropertyPreview(r.original);
                      } else if (r.type === 'user') {
                        onOpenUserProfile(r.original);
                      } else if (r.type === 'listing_request') {
                        onSelectTab('listing-requests');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 text-left transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-300 flex items-center justify-center shrink-0">
                      {r.category === 'Hostel' && <Hotel className="w-4 h-4" />}
                      {r.category === 'Tiffin' && <Utensils className="w-4 h-4" />}
                      {r.category === 'Library' && <BookOpen className="w-4 h-4" />}
                      {r.category === 'Cafe' && <Coffee className="w-4 h-4" />}
                      {r.category === 'Bookstore' && <Store className="w-4 h-4" />}
                      {r.type === 'user' && <User className="w-4 h-4" />}
                      {r.type === 'listing_request' && <Inbox className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{r.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          {r.category}
                        </span>
                        {r.verified && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                        {r.rating && (
                          <span className="text-[10px] text-amber-300 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-300" /> {r.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{r.subtitle}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No matching student, owner, or property found for "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#14224d] flex items-center justify-center transition-all cursor-pointer"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => onSelectTab('notifications')}
            className="relative w-10 h-10 rounded-xl bg-[#0d1838] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#14224d] flex items-center justify-center transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* Live Site Link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Live Site</span>
          </a>

          {/* Admin Avatar */}
          <button
            onClick={() => onSelectTab('admin')}
            className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-xl bg-[#0d1838] border border-amber-500/20 hover:border-amber-500/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs">
              SS
            </div>
            <span className="hidden md:inline-block text-xs font-bold text-slate-200">Director</span>
          </button>
        </div>
      </div>
    </header>
  );
};
