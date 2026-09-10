import React, { useState } from 'react';
import {
  AreaItem,
  AdminNotification,
  AdminActivityLog,
  SystemSetting,
  PropertyItem,
} from '../types';
import { fmtDate, shortDate, exportToCSV } from '../lib/supabase';
import {
  MapPin,
  Plus,
  Bell,
  CheckCircle,
  History,
  Sliders,
  Tags,
  UserCheck,
  Shield,
  Key,
  Phone,
  Mail,
  Download,
  Hotel,
  Utensils,
  BookOpen,
  Coffee,
  Store,
  Edit,
  Save,
} from 'lucide-react';

interface IntelligenceViewsProps {
  currentSubTab:
    | 'areas'
    | 'notifications'
    | 'activity'
    | 'settings'
    | 'categories'
    | 'admin';
  areas: AreaItem[];
  notifications: AdminNotification[];
  activityLogs: AdminActivityLog[];
  settings: SystemSetting[];
  properties: PropertyItem[];
  onAddArea: (name: string, city: string) => Promise<void>;
  onEditArea: (id: string | number, name: string) => Promise<void>;
  onMarkNotificationRead: (id: string | number) => void;
  onMarkAllNotificationsRead: () => void;
  onUpdateSetting: (key: string, value: string) => Promise<void>;
  onUpdatePassword: (newPass: string) => Promise<void>;
}

export const IntelligenceViews: React.FC<IntelligenceViewsProps> = ({
  currentSubTab,
  areas,
  notifications,
  activityLogs,
  settings,
  properties,
  onAddArea,
  onEditArea,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onUpdateSetting,
  onUpdatePassword,
}) => {
  // Area Modal State
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCity, setNewAreaCity] = useState('Kota');

  // Password State
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [updatingPass, setUpdatingPass] = useState(false);

  // Settings State
  const [editingSetting, setEditingSetting] = useState<{ key: string; value: string } | null>(null);

  // Handle Area Submit
  const handleAddAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    await onAddArea(newAreaName.trim(), newAreaCity);
    setNewAreaName('');
    setShowAddAreaModal(false);
  };

  // Handle Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setPassMessage({ text: 'Passwords do not match.', success: false });
      return;
    }
    if (newPass.length < 8) {
      setPassMessage({ text: 'Password must be at least 8 characters long.', success: false });
      return;
    }
    try {
      setUpdatingPass(true);
      await onUpdatePassword(newPass);
      setPassMessage({ text: 'Password updated successfully in Supabase Auth.', success: true });
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassMessage({ text: err?.message || 'Password update failed', success: false });
    } finally {
      setUpdatingPass(false);
    }
  };

  // Areas Management
  if (currentSubTab === 'areas') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Areas & Localities</h2>
            <p className="text-xs text-slate-400 mt-1">
              Standardized coaching and student residential areas in Kota, Jaipur, and surrounding zones.
            </p>
          </div>
          <button
            onClick={() => setShowAddAreaModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Locality</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Locality / Area Name</th>
                  <th className="p-4">City</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Live Properties</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {areas.length ? (
                  areas.map((a) => {
                    const count = properties.filter(
                      (p) => (p.area || '').toLowerCase() === (a.name || a.area_name || '').toLowerCase()
                    ).length;
                    return (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{a.name || a.area_name}</span>
                        </td>
                        <td className="p-4 text-slate-300">{a.city || 'Kota'}</td>
                        <td className="p-4 text-slate-300">{a.state || 'Rajasthan'}</td>
                        <td className="p-4">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {count} listings
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            {a.status || 'active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              const newName = prompt('Enter new locality name:', a.name || a.area_name || '');
                              if (newName) onEditArea(a.id, newName.trim());
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No standardized areas configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Area Modal */}
        {showAddAreaModal && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddAreaModal(false);
            }}
          >
            <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-amber-500/30 p-6 text-white space-y-4 shadow-2xl">
              <h3 className="font-bold text-lg text-white">Add New Standardized Locality</h3>
              <form onSubmit={handleAddAreaSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Area / Locality Name *</label>
                  <input
                    type="text"
                    required
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="e.g. Coral Park"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">City</label>
                  <input
                    type="text"
                    value={newAreaCity}
                    onChange={(e) => setNewAreaCity(e.target.value)}
                    placeholder="Kota"
                    className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAreaModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-extrabold"
                  >
                    Save Area
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Notifications Log
  if (currentSubTab === 'notifications') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Admin Notifications Log</h2>
            <p className="text-xs text-slate-400 mt-1">
              Notifications are shown only when a real notification source is connected.
            </p>
          </div>
          <button
            onClick={onMarkAllNotificationsRead}
            className="px-4 py-2 rounded-xl bg-[#0d1838] hover:bg-[#14224d] border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        </div>

        <div className="space-y-3">
          {notifications.length ? (
            notifications.map((n) => {
              const isUnread = String(n.status || 'unread').toLowerCase() === 'unread';
              return (
                <div
                  key={n.id}
                  onClick={() => onMarkNotificationRead(n.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-[#0d1838] border-amber-500/40 shadow-lg'
                      : 'bg-[#081026] border-slate-800/80 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isUnread ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                      <h4 className="font-bold text-sm text-white">{n.title || 'System Notification'}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isUnread
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isUnread ? 'Unread' : 'Read'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5">{n.message || n.body || ''}</p>
                  <div className="text-[10px] text-slate-500 mt-2 font-mono">{fmtDate(n.created_at)}</div>
                </div>
              );
            })
          ) : (
            <div className="p-8 rounded-3xl bg-[#081026] border border-slate-800 text-center text-slate-400 text-xs">
              No real notifications available.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Activity & Audit Trail
  if (currentSubTab === 'activity') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-white">Activity & Audit Trail</h2>
            <p className="text-xs text-slate-400 mt-1">
              Historical immutable records of Director changes, approvals, and status toggles.
            </p>
          </div>
          <button
            onClick={() => exportToCSV(activityLogs, 'activity-logs')}
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
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity Type</th>
                  <th className="p-4">Entity ID</th>
                  <th className="p-4">Director / Admin</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activityLogs.length ? (
                  activityLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-white">{log.action || 'update'}</td>
                      <td className="p-4 text-slate-300">{log.entity_type || '—'}</td>
                      <td className="p-4 font-mono text-slate-400">{log.entity_id || '—'}</td>
                      <td className="p-4 text-slate-300">{log.admin_email || 'Director Admin'}</td>
                      <td className="p-4 text-slate-400">{fmtDate(log.created_at)}</td>
                      <td className="p-4 max-w-xs truncate text-[11px] font-mono text-slate-400">
                        {log.new_value ? JSON.stringify(log.new_value) : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No admin activity logs found.
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

  // System Settings
  if (currentSubTab === 'settings') {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">System Settings & Policies</h2>
          <p className="text-xs text-slate-400 mt-1">
            Live configurations stored in Supabase table <code className="text-amber-400 font-mono">system_settings</code>.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {settings.map((s) => (
            <div key={s.key || s.setting_key} className="rounded-2xl bg-[#081026] border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 font-mono">{s.key || s.setting_key}</span>
                <button
                  onClick={() => setEditingSetting({ key: String(s.key || s.setting_key), value: String(s.value || '') })}
                  className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                  title="Edit Setting"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-sm font-bold text-white break-all">{s.value || 'Not configured'}</div>
              {s.description && <p className="text-[11px] text-slate-400">{s.description}</p>}
            </div>
          ))}
        </div>

        {/* Edit Setting Dialog */}
        {editingSetting && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingSetting(null);
            }}
          >
            <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-amber-500/30 p-6 text-white space-y-4 shadow-2xl">
              <h3 className="font-bold text-lg text-white">Edit Setting: {editingSetting.key}</h3>
              <div>
                <label className="text-xs font-bold text-slate-300">Setting Value</label>
                <input
                  type="text"
                  value={editingSetting.value}
                  onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                  className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSetting(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateSetting(editingSetting.key, editingSetting.value);
                    setEditingSetting(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-extrabold"
                >
                  Save Setting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Category Config
  if (currentSubTab === 'categories') {
    const categories = [
      { name: 'Hostels & PGs', type: 'hostels', icon: Hotel, count: properties.filter((p) => (p.category || '').toLowerCase().includes('hostel')).length, fields: 'Rent, Room Sharing, Beds, Food Included, AC/Cooler, Biometric Security' },
      { name: 'Tiffin & Mess Services', type: 'tiffins', icon: Utensils, count: properties.filter((p) => (p.category || '').toLowerCase().includes('tiffin')).length, fields: 'Pure Veg Meals, Monthly Delivery Plans, Service Radius, Menu' },
      { name: '24/7 Study Libraries', type: 'libraries', icon: BookOpen, count: properties.filter((p) => (p.category || '').toLowerCase().includes('library')).length, fields: 'Seating Capacity, AC, High-Speed Optical Fiber WiFi, 24 Hours Open' },
      { name: 'Student Cafes', type: 'cafes', icon: Coffee, count: properties.filter((p) => (p.category || '').toLowerCase().includes('cafe')).length, fields: 'Cuisine, Seating, Snacks, Kulhad Chai, Power Charging Sockets' },
      { name: 'Bookstores & Stationery', type: 'bookstores', icon: Store, count: properties.filter((p) => (p.category || '').toLowerCase().includes('book')).length, fields: 'JEE/NEET Coaching Material, Reference Books, Spiral Binding, Xerox' },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Category Configurations</h2>
          <p className="text-xs text-slate-400 mt-1">
            Category-specific fields and administrative controls for student directories.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => {
            const IconComponent = c.icon;
            return (
              <div key={c.type} className="rounded-3xl bg-[#081026] border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-amber-300">
                    {c.count} Listings
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{c.name}</h3>
                <p className="text-xs text-slate-400">{c.fields}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Director Admin Profile & Security
  if (currentSubTab === 'admin') {
    return (
      <div className="space-y-6 max-w-3xl animate-in fade-in duration-200">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-white">Director Profile & Security</h2>
          <p className="text-xs text-slate-400 mt-1">
            Account controls, verified administrative credentials, and Supabase Auth encryption.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0a1838] to-[#0d224e] border border-amber-500/30 p-7 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-serif font-extrabold text-2xl shadow-xl">
                SS
              </div>
              <div>
                <h3 className="text-2xl font-serif font-extrabold text-white">SATPAL SWAMI</h3>
                <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mt-0.5">
                  Managing Director — StudentHubHelp
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              SUPABASE ADMIN ROLE
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
            <div className="bg-[#081026] p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" /> Phone
              </div>
              <div className="text-slate-200 font-mono mt-1">+91 99297 18264</div>
            </div>

            <div className="bg-[#081026] p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 font-bold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" /> Email
              </div>
              <div className="text-slate-200 mt-1 truncate">satpalswami22742@gmail.com</div>
            </div>

            <div className="bg-[#081026] p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> Headquarters
              </div>
              <div className="text-slate-200 mt-1">Kota / Jaipur Directory</div>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="rounded-3xl bg-[#081026] border border-slate-800 p-7 shadow-xl space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" /> Update Director Password
          </h3>
          <p className="text-xs text-slate-400">
            This updates the password securely in Supabase Auth (<code className="text-amber-300 font-mono">supabase.auth.updateUser</code>).
          </p>

          {passMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold border ${
                passMessage.success
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {passMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300">New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Re-type new password"
                className="w-full mt-1 bg-[#0d1838] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPass}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all"
            >
              {updatingPass ? 'Updating Supabase Password...' : 'Update Supabase Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};
