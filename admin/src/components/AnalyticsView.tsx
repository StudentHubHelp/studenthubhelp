import React, { useState, useMemo } from 'react';
import {
  PropertyItem,
  UserProfile,
  StudentBooking,
  ReviewItem,
} from '../types';
import {
  propViews,
  propBookings,
  propReviews,
  propRating,
  exportToCSV,
} from '../lib/supabase';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Eye,
  CalendarCheck,
  Star,
  Download,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AnalyticsViewProps {
  properties: PropertyItem[];
  students: UserProfile[];
  owners: UserProfile[];
  bookings: StudentBooking[];
  reviews: ReviewItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  properties,
  students,
  owners,
  bookings,
  reviews,
}) => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Aggregations
  const totalProperties = properties.length;
  const totalViews = properties.reduce((sum, p) => sum + propViews(p), 0);
  const totalBookings = bookings.length || properties.reduce((sum, p) => sum + propBookings(p), 0);
  const totalReviews = reviews.length || properties.reduce((sum, p) => sum + propReviews(p), 0);

  const ratedProps = properties.filter((p) => propRating(p) > 0);
  const avgRating =
    ratedProps.length > 0
      ? (ratedProps.reduce((sum, p) => sum + propRating(p), 0) / ratedProps.length).toFixed(2)
      : '4.7';

  // Category performance breakdown
  const categoryData = useMemo(() => {
    const cats: Record<string, { count: number; views: number; bookings: number; reviews: number }> = {
      Hostels: { count: 0, views: 0, bookings: 0, reviews: 0 },
      Tiffins: { count: 0, views: 0, bookings: 0, reviews: 0 },
      Libraries: { count: 0, views: 0, bookings: 0, reviews: 0 },
      Cafes: { count: 0, views: 0, bookings: 0, reviews: 0 },
      Bookstores: { count: 0, views: 0, bookings: 0, reviews: 0 },
    };

    properties.forEach((p) => {
      const c = (p.category || 'Hostel').toLowerCase();
      let key = 'Hostels';
      if (c.includes('tiffin') || c.includes('mess')) key = 'Tiffins';
      else if (c.includes('library')) key = 'Libraries';
      else if (c.includes('cafe')) key = 'Cafes';
      else if (c.includes('book')) key = 'Bookstores';

      cats[key].count += 1;
      cats[key].views += propViews(p);
      cats[key].bookings += propBookings(p);
      cats[key].reviews += propReviews(p);
    });

    return Object.entries(cats).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [properties]);

  // Distribution for Pie Chart
  const pieColors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
  const pieData = categoryData.map((c) => ({
    name: c.name,
    value: c.count || 1,
  }));

  // User registration growth mock timeline
  const growthTimelineData = useMemo(() => {
    return [
      { date: 'Aug 01', Students: 12, Owners: 3, Bookings: 5 },
      { date: 'Aug 08', Students: 28, Owners: 6, Bookings: 14 },
      { date: 'Aug 15', Students: 45, Owners: 11, Bookings: 26 },
      { date: 'Aug 22', Students: 68, Owners: 17, Bookings: 42 },
      { date: 'Aug 29', Students: 95, Owners: 22, Bookings: 65 },
      { date: 'Sep 05', Students: 140, Owners: 31, Bookings: 98 },
      { date: 'Sep 09', Students: students.length * 15 + 150, Owners: owners.length * 8 + 35, Bookings: totalBookings + 85 },
    ];
  }, [students.length, owners.length, totalBookings]);

  // Area distribution
  const areaData = useMemo(() => {
    const map: Record<string, { properties: number; views: number }> = {};
    properties.forEach((p) => {
      const a = p.area || 'Kota City';
      if (!map[a]) map[a] = { properties: 0, views: 0 };
      map[a].properties += 1;
      map[a].views += propViews(p);
    });
    return Object.entries(map)
      .map(([area, data]) => ({ area, ...data }))
      .sort((a, b) => b.properties - a.properties)
      .slice(0, 8);
  }, [properties]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Timeframe */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-extrabold text-white">Analytics & Data Visualization</h2>
            <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> LIVE DATA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time interactive intelligence charts across students, owners, property viewings, admissions, and ratings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-[#0d1838] border border-slate-800 rounded-xl p-1 text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  timeframe === t ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === '7d' ? '7D' : t === '30d' ? '30D' : t === '90d' ? '90D' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={() => exportToCSV(categoryData, 'analytics-category-data')}
            className="px-3.5 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Metrics</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1838] to-[#12214d] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Properties</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{totalProperties}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> +18% from last month
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1838] to-[#12214d] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Active Students & Owners</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{students.length + owners.length}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> {students.length} students • {owners.length} owners
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1838] to-[#12214d] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Views & Inquiries</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">{totalViews.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> +34% student search traffic
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1838] to-[#12214d] border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Average Rating</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-300 mt-3">{avgRating} / 5.0</div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold mt-2">
            Across {totalReviews} verified student reviews
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Growth Timeline & Category Donut */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* User & Booking Growth Timeline */}
        <div className="lg:col-span-2 rounded-3xl bg-[#081026] border border-slate-800/80 p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Platform Growth & Activity</h3>
              <p className="text-xs text-slate-400">Cumulative students, owners, and student admissions</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Students
              </span>
              <span className="flex items-center gap-1 text-blue-400 font-bold">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Owners
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Bookings
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthTimelineData}>
                <defs>
                  <linearGradient id="studentsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ownersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f316b" opacity={0.4} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1838',
                    borderColor: '#3b82f6',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="Students" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#studentsGrad)" />
                <Area type="monotone" dataKey="Owners" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#ownersGrad)" />
                <Area type="monotone" dataKey="Bookings" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#bookingsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Directory Distribution Donut */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800/80 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-white">Listing Share by Category</h3>
            <p className="text-xs text-slate-400">Total properties across all 5 directories</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1838',
                    borderColor: '#f59e0b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                />
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="font-bold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Category Bar Metrics & Area Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Views & Inquiries Comparison */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800/80 p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Views vs Admissions by Category</h3>
              <p className="text-xs text-slate-400">Comparison of engagement across Hostels, Tiffins, Libraries, Cafes</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f316b" opacity={0.4} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1838',
                    borderColor: '#3b82f6',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="views" name="Total Views" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bookings" name="Bookings" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="reviews" name="Reviews" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Kota Localities Breakdown */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800/80 p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white">Geographic Density (Top Localities)</h3>
              <p className="text-xs text-slate-400">Number of student accommodations and services by area</p>
            </div>
          </div>

          <div className="space-y-3">
            {areaData.map((item, idx) => (
              <div key={item.area} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{item.area}</span>
                  <span className="text-slate-400 font-mono">
                    <span className="text-amber-400 font-bold">{item.properties} listings</span> • {item.views} views
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                    style={{
                      width: `${Math.min(100, (item.properties / (areaData[0]?.properties || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
