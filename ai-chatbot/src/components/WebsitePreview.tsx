import React, { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  Star,
  Phone,
  CheckCircle,
  ExternalLink,
  Bookmark,
  Coffee,
  BookOpen,
  Utensils,
  Home,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { PropertyRecommendation } from '../types';

interface WebsitePreviewProps {
  onPromptChat?: (prompt: string) => void;
}

export const WebsitePreview: React.FC<WebsitePreviewProps> = ({ onPromptChat }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'hostel' | 'tiffin' | 'library' | 'cafe' | 'bookstore'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [properties, setProperties] = useState<PropertyRecommendation[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingProperties(true);
        const res = await fetch('/api/properties?all=true');
        if (!res.ok) throw new Error('Unable to load active listings.');
        const data = await res.json();
        if (!cancelled) setProperties(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) setPropertyError(err?.message || 'Unable to load active listings.');
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredProperties = properties.filter(prop => {
    const matchesCat = activeCategory === 'all' || prop.type === activeCategory;
    const matchesCity = cityFilter === 'all' || prop.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesCity && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Platform Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071a33] via-[#0b2547] to-[#12365c] text-white p-6 sm:p-10 border border-amber-400/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-400/40">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            Live Student Housing & Food Services
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Find Student <span className="text-amber-400">Hostel, PG, Tiffin &amp; Libraries</span> Across India
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Zero brokerage verified platform. Search student-friendly accommodation and mess services in Sikar (Piprali Road), Kota (Talwandi), Delhi (Mukherjee Nagar), and Jaipur.
          </p>

          {/* Search Box */}
          <div className="mt-6 bg-white p-2 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200">
            <div className="flex items-center gap-2.5 px-3 w-full sm:flex-1 text-slate-400">
              <Search className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search city, area, hostel name, or tiffin service..."
                className="w-full text-slate-900 text-xs sm:text-sm py-2 outline-none"
              />
            </div>

            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="text-xs sm:text-sm text-slate-700 bg-slate-100 font-semibold px-4 py-2.5 rounded-xl border-none outline-none w-full sm:w-auto"
            >
              <option value="all">All Cities</option>
              {Array.from(new Set(properties.map(p => p.city).filter(Boolean))).sort().map(city => (
                <option key={city} value={city.toLowerCase()}>{city}</option>
              ))}
            </select>

            <button
              type="button"
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl hover:from-amber-400 hover:to-amber-300 transition text-xs sm:text-sm shadow"
            >
              Search
            </button>
          </div>

          {/* Try Asking AI Chatbot Chips */}
          <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-slate-300">
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" /> Try asking AI Bot:
            </span>
            {[
              "Mujhe 6000 me boys hostel chahiye",
              "Piprali road girls hostel",
              "Didi ka tiffin rate kya h?",
              "24/7 AC library in Sikar"
            ].map((query, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPromptChat && onPromptChat(query)}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded-full text-[11px] text-white transition cursor-pointer"
              >
                "{query}"
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', label: 'All Services', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'hostel', label: 'Hostel & PG', icon: <Home className="w-4 h-4" /> },
          { id: 'tiffin', label: 'Tiffin & Mess', icon: <Utensils className="w-4 h-4" /> },
          { id: 'library', label: '24/7 Library', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'cafe', label: 'Student Cafes', icon: <Coffee className="w-4 h-4" /> },
          { id: 'bookstore', label: 'Book Stores', icon: <Bookmark className="w-4 h-4" /> },
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeCategory === cat.id
                ? 'bg-[#071a33] text-white shadow-md border border-[#071a33]'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Property Listings Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Live Verified Listings ({filteredProperties.length})
            </h2>
            <p className="text-xs text-slate-500">
              Active public listings from StudentHubHelp
            </p>
          </div>

          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Zero Brokerage Guaranteed
          </span>
        </div>

        {loadingProperties ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">Loading active listings...</div>
        ) : propertyError ? (
          <div className="bg-white rounded-3xl border border-rose-200 p-10 text-center text-sm text-rose-600">{propertyError}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProperties.map(prop => (
              <div
                key={prop.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-amber-400 transition flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-gradient-to-r from-[#071a33] to-[#12365c] relative p-4 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between">
                      <span className="bg-white/90 text-slate-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                        {prop.type.toUpperCase()}
                      </span>
                      {prop.badge && (
                        <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-amber-300 font-extrabold text-sm sm:text-base">{prop.price || 'Price not listed'}</div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {prop.area}{prop.area && prop.city ? ', ' : ''}{prop.city}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">{prop.name}</h3>
                      {prop.rating !== undefined && (
                        <div className="flex items-center gap-1 text-xs font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg flex-shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {prop.rating}
                        </div>
                      )}
                    </div>
                    {prop.highlights && prop.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prop.highlights.map((h, i) => (
                          <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  {prop.phone ? (
                    <a href={`tel:${prop.phone}`} className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call Owner
                    </a>
                  ) : (
                    <span className="flex-1 text-center bg-slate-100 text-slate-400 font-bold py-2.5 px-3 rounded-xl text-xs">Contact unavailable</span>
                  )}
                  <a href={prop.link} className="flex-1 text-center bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-sm">
                    View Details <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trust & Director Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
            Direct Founder Helpline
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            Director Satpal Swami - Student Services Made Simple
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Have any questions about room booking, food hygiene, or library seats? Contact our founder helpline directly via phone or WhatsApp.
          </p>
          <div className="flex items-center gap-4 text-xs sm:text-sm font-bold text-slate-800 pt-2 flex-wrap">
            <span>📞 +91 9929718264</span>
            <span>✉️ satpalswami22742@gmail.com</span>
            <span>📍 Sikar &amp; Kota, Rajasthan</span>
          </div>
        </div>

        <a
          href="tel:+919929718264"
          className="bg-[#071a33] hover:bg-[#0b2547] text-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition flex items-center gap-2 whitespace-nowrap"
        >
          <Phone className="w-4 h-4 text-amber-400" />
          Call Helpline Now
        </a>
      </div>
    </div>
  );
};
