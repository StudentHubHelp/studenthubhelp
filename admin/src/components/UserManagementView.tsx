import React, { useState, useMemo } from 'react';
import { UserProfile, PropertyItem, StudentBooking, ReviewItem } from '../types';
import { shortDate, normalizePhone, exportToCSV } from '../lib/supabase';
import {
  Users,
  GraduationCap,
  Briefcase,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Trash2,
  Plus,
  Phone,
  Mail,
  UserCheck,
  UserX,
  UserPlus,
} from 'lucide-react';

interface UserManagementViewProps {
  students: UserProfile[];
  owners: UserProfile[];
  properties: PropertyItem[];
  bookings: StudentBooking[];
  reviews: ReviewItem[];
  onOpenUserProfile: (user: UserProfile) => void;
  onEditOwner: (owner: UserProfile) => void;
  onToggleStatus: (id: string, currentlyDisabled: boolean) => void;
  onDeleteUser: (id: string) => void;
  onAddPropertyForOwner: (owner: UserProfile) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  students,
  owners,
  properties,
  bookings,
  reviews,
  onOpenUserProfile,
  onEditOwner,
  onToggleStatus,
  onDeleteUser,
  onAddPropertyForOwner,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'owners'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const allUsers = useMemo(() => {
    return [
      ...students.map((s) => ({ ...s, role: 'student' })),
      ...owners.map((o) => ({ ...o, role: 'owner' })),
    ];
  }, [students, owners]);

  // Compute metrics
  const activeCount = allUsers.filter((u) => {
    const s = String(u.status || u.account_status || 'active').toLowerCase();
    return !['disabled', 'inactive', 'blocked', 'suspended'].includes(s);
  }).length;

  const disabledCount = allUsers.length - activeCount;

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allUsers.filter((u) => {
      const matchRole =
        activeTab === 'all' ||
        (activeTab === 'students' && u.role === 'student') ||
        (activeTab === 'owners' && u.role === 'owner');

      const isUserDisabled = ['disabled', 'inactive', 'blocked', 'suspended'].includes(
        String(u.status || u.account_status || 'active').toLowerCase()
      );

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isUserDisabled) ||
        (statusFilter === 'disabled' && isUserDisabled);

      const matchQuery =
        !q ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.address || '').toLowerCase().includes(q);

      return matchRole && matchStatus && matchQuery;
    });
  }, [allUsers, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">User Management & Accounts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Director oversight for student learners, verified accommodation owners, and account governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(filteredUsers, `users-${activeTab}`)}
            className="px-4 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#081026] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{students.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Registered student profiles</div>
        </div>

        <div className="rounded-2xl bg-[#081026] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Verified Owners</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{owners.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Property & business providers</div>
        </div>

        <div className="rounded-2xl bg-[#081026] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Active Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{activeCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Healthy access status</div>
        </div>

        <div className="rounded-2xl bg-[#081026] border border-slate-800/80 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Suspended / Disabled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">{disabledCount}</div>
          <div className="text-[10px] text-rose-400/80 mt-1">Restricted from platform</div>
        </div>
      </div>

      {/* Control Bar: Sub-Tabs & Filters */}
      <div className="rounded-2xl bg-[#081026] border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Sub tabs */}
        <div className="flex bg-[#0d1838] border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'all' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Accounts ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'students' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'owners' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Owners ({owners.length})
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name, phone, email, locality..."
              className="w-full pl-9 pr-3 py-2 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Email</th>
                <th className="p-4">Locality / Address</th>
                <th className="p-4">Linked Records</th>
                <th className="p-4">Status</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length ? (
                filteredUsers.map((u) => {
                  const isOwner = u.role === 'owner';
                  const normPhone = normalizePhone(u.phone);
                  const isUserDisabled = ['disabled', 'inactive', 'blocked', 'suspended'].includes(
                    String(u.status || u.account_status || 'active').toLowerCase()
                  );

                  // Count properties or bookings
                  const linkedPropCount = properties.filter(
                    (p) =>
                      (p.owner_id && String(p.owner_id) === String(u.id)) ||
                      (normPhone && normalizePhone(p.phone) === normPhone)
                  ).length;

                  const studentBookingCount = bookings.filter(
                    (b) => String(b.student_id) === String(u.id) || (normPhone && normalizePhone(b.student_phone) === normPhone)
                  ).length;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) {
                          onOpenUserProfile(u);
                        }
                      }}
                    >
                      {/* Name & ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-bold flex items-center justify-center shrink-0">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 hover:text-amber-300 transition-colors">
                              {u.full_name || 'User Profile'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">#{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                            isOwner
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="p-4 font-mono">
                        {u.phone ? (
                          <a
                            href={`tel:${u.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-300 hover:text-amber-300 flex items-center gap-1.5"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{u.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="p-4 text-slate-300 max-w-xs truncate">
                        {u.email ? (
                          <span title={u.email}>{u.email}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="p-4 text-slate-300 max-w-xs truncate">
                        {u.address || u.city || '—'}
                      </td>

                      {/* Linked Properties / Bookings */}
                      <td className="p-4">
                        {isOwner ? (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {linkedPropCount} Listings
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                            {studentBookingCount} Bookings
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isUserDisabled
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {isUserDisabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="p-4 text-slate-400">{shortDate(u.created_at)}</td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile */}
                          <button
                            onClick={() => onOpenUserProfile(u)}
                            className="p-2 rounded-lg bg-[#0d1838] hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Owner */}
                          {isOwner && (
                            <button
                              onClick={() => onEditOwner(u)}
                              className="p-2 rounded-lg bg-[#0d1838] hover:bg-slate-700 text-blue-300 hover:text-white border border-slate-700 transition-colors"
                              title="Edit Owner Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Add Property For Owner */}
                          {isOwner && (
                            <button
                              onClick={() => onAddPropertyForOwner(u)}
                              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                              title="Add Property Listing for this Owner"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Status */}
                          <button
                            onClick={() => onToggleStatus(u.id, isUserDisabled)}
                            className={`p-2 rounded-lg border transition-colors ${
                              isUserDisabled
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                            title={isUserDisabled ? 'Enable Account' : 'Disable Account'}
                          >
                            {isUserDisabled ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    No matching student or owner accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
