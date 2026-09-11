import React, { useState, useEffect } from 'react';
import {
  Activity,
  UserCheck,
  PhoneCall,
  Mail,
  Download,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Plus,
  MessageSquare,
  Flame,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { LeadRecord, LeadStatus, SentimentType } from '../types';

interface NeedInspectorProps {
  lastDiagnosis?: any;
  lastUserQuery?: string;
  onRefreshLeads?: () => void;
}

export const NeedInspector: React.FC<NeedInspectorProps> = ({
  lastDiagnosis,
  lastUserQuery,
  onRefreshLeads
}) => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: 'Sikar',
    detectedNeed: '',
    status: 'new' as LeadStatus
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        setLeads(prev =>
          prev.map(l => (l.id === id ? { ...l, status: newStatus } : l))
        );
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleSaveNote = async (id: string) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: tempNote })
      });
      if (res.ok) {
        setLeads(prev =>
          prev.map(l => (l.id === id ? { ...l, notes: tempNote } : l))
        );
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead record?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadForm)
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewLeadForm({ name: '', phone: '', email: '', city: 'Sikar', detectedNeed: '', status: 'new' });
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  // Export Leads to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studenthubhelp_leads_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Leads to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'City', 'Detected Need', 'Status', 'Timestamp', 'Notes'];
    const rows = leads.map(l => [
      `"${l.id}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.city || ''}"`,
      `"${l.detectedNeed.replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.timestamp}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `studenthubhelp_leads_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered Leads
  const filteredLeads = leads.filter(l => {
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      l.name.toLowerCase().includes(query) ||
      l.phone.includes(query) ||
      (l.city && l.city.toLowerCase().includes(query)) ||
      l.detectedNeed.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const countNew = leads.filter(l => l.status === 'new').length;
  const countContacted = leads.filter(l => l.status === 'contacted').length;
  const countConverted = leads.filter(l => l.status === 'converted').length;
  const conversionRate = leads.length > 0 ? Math.round((countConverted / leads.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#071a33] to-[#12365c] text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5" />
            AI Telemetry & CRM Dashboard
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Live Student Need Diagnosis & Leads
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Gemini 3.8 Flash real-time intent extraction, hidden need diagnosis, mood analysis, and automated CRM lead capture without forcing tedious forms.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchLeads}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Manual Lead
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Captured Leads</div>
          <div className="text-3xl font-black text-slate-900 mt-2 flex items-baseline gap-2">
            {leads.length}
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {countNew} new
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Direct from chat conversations</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversion Rate</div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {conversionRate}%
          </div>
          <div className="text-xs text-slate-500 mt-1">{countConverted} converted student admissions</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Model Engine</div>
          <div className="text-lg font-black text-slate-900 mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Gemini 3.8 Flash
          </div>
          <div className="text-xs text-slate-500 mt-1">Structured JSON Output (Type.OBJECT)</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Contacted / In Progress</div>
          <div className="text-3xl font-black text-blue-600 mt-2">
            {countContacted}
          </div>
          <div className="text-xs text-slate-500 mt-1">Director helpline follow-ups</div>
        </div>
      </div>

      {/* Live Diagnosis Telemetry Card (Latest Turn) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              Live AI Need Diagnosis (Last Chat Turn)
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Real-time NLP Parser
          </span>
        </div>

        {lastDiagnosis ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div className="md:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Last User Query</div>
                {lastDiagnosis.primaryTopic && (
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                    🎯 Priority: {lastDiagnosis.primaryTopic}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1 italic">
                "{lastUserQuery || '6000 tak ka boys hostel chahiye'}"
              </p>

              {lastDiagnosis.topicDirectAnswer && (
                <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200/80 rounded-lg">
                  <div className="text-[10px] font-bold text-amber-900 uppercase">Direct Priority Answer:</div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {lastDiagnosis.topicDirectAnswer}
                  </div>
                </div>
              )}

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-3">Diagnosed Hidden Need</div>
              <p className="text-xs font-medium text-slate-900 mt-1">
                {lastDiagnosis.userNeedSummary || 'Searching for budget boys hostel in Sikar'}
              </p>

              {lastDiagnosis.budgetPlan && (
                <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <span className="font-bold text-emerald-900">🧮 Budget Plan Active:</span> Target ₹{lastDiagnosis.budgetPlan.targetBudget?.toLocaleString('en-IN')}/mo • Est. ₹{lastDiagnosis.budgetPlan.totalEstimated?.toLocaleString('en-IN')} ({lastDiagnosis.budgetPlan.status})
                </div>
              )}

              {lastDiagnosis.comparisonMatrix && (
                <div className="mt-2.5 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                  <span className="font-bold text-blue-900">⚖️ Comparison Matrix:</span> {lastDiagnosis.comparisonMatrix.title}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Detected Intent</div>
                <div className="text-xs font-extrabold text-blue-900 mt-0.5">
                  {lastDiagnosis.intent || 'Hostel Inquiry'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">User Sentiment</div>
                <div className="mt-0.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                    lastDiagnosis.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                    lastDiagnosis.sentiment === 'urgent' ? 'bg-rose-100 text-rose-800' :
                    lastDiagnosis.sentiment === 'frustrated' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {lastDiagnosis.sentiment?.toUpperCase() || 'CURIOUS'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Target Entities</div>
                <div className="text-xs font-medium text-slate-700 mt-0.5">
                  City: <strong>{lastDiagnosis.targetCity || 'Sikar'}</strong> | Cat: <strong>{lastDiagnosis.recommendedCategory || 'Hostel'}</strong>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Auto-Captured Lead</div>
                <div className="text-xs text-slate-700 mt-0.5">
                  {lastDiagnosis.capturedLead ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ {lastDiagnosis.capturedLead.name || 'Lead'} ({lastDiagnosis.capturedLead.phone || 'No phone'})
                    </span>
                  ) : (
                    <span className="text-slate-400">None in this message</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-400 text-xs italic">
            Chat with the floating widget to view live telemetry diagnoses and extracted needs here.
          </div>
        )}
      </div>

      {/* CRM Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search leads by name, phone, city..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['all', 'new', 'contacted', 'converted'] as const).map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                  statusFilter === status
                    ? 'bg-[#071a33] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-500 uppercase tracking-wider font-extrabold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Lead</th>
                <th className="py-3 px-4">Contact & Location</th>
                <th className="py-3 px-4">Diagnosed Requirement</th>
                <th className="py-3 px-4">Captured At</th>
                <th className="py-3 px-4">CRM Status</th>
                <th className="py-3 px-4">Notes & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length > 0 ? (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{lead.name}</div>
                      <div className="text-[11px] text-slate-400">ID: {lead.id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                          <a href={`tel:${lead.phone}`} className="hover:underline text-slate-900">
                            {lead.phone || 'No phone'}
                          </a>
                          {lead.phone && (
                            <a
                              href={`https://wa.me/91${lead.phone}?text=Hello%20${encodeURIComponent(lead.name)}%2C%20StudentHubHelp%20support%20team%20here.`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-200 transition"
                            >
                              WA
                            </a>
                          )}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {lead.email}
                          </div>
                        )}
                        <div className="text-[11px] text-amber-800 font-medium">
                          📍 {lead.city || 'Sikar'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-800 font-medium line-clamp-2">
                        {lead.detectedNeed}
                      </p>
                      <div className="flex items-center flex-wrap gap-1 mt-1">
                        {lead.primaryTopic && (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            🎯 {lead.primaryTopic}
                          </span>
                        )}
                        {lead.intent && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {lead.intent}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {lead.timestamp}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={e => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer ${
                          lead.status === 'new'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : lead.status === 'contacted'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <option value="new">🟡 New Lead</option>
                        <option value="contacted">🔵 Contacted</option>
                        <option value="converted">🟢 Converted ✓</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      {editingNoteId === lead.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempNote}
                            onChange={e => setTempNote(e.target.value)}
                            className="text-xs p-1.5 border border-slate-300 rounded-lg w-40"
                            placeholder="Add follow-up note..."
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNote(lead.id)}
                            className="bg-emerald-600 text-white p-1.5 rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => {
                              setEditingNoteId(lead.id);
                              setTempNote(lead.notes || '');
                            }}
                            className="text-slate-500 text-[11px] cursor-pointer hover:text-slate-900 line-clamp-1 italic"
                            title="Click to edit note"
                          >
                            {lead.notes || '+ Click to add note'}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(lead.id);
                                setTempNote(lead.notes || '');
                              }}
                              title="Edit Note"
                              className="p-1 hover:bg-slate-100 text-slate-500 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Delete Lead"
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No leads match your search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-lg text-slate-900 mb-1">
              Add Manual Student Lead
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter inquiry details from phone calls, WhatsApp, or direct office visits.
            </p>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.phone}
                    onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="9829XXXXXX"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    placeholder="Sikar / Kota"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  placeholder="student@gmail.com"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requirement / Need</label>
                <textarea
                  required
                  rows={3}
                  value={newLeadForm.detectedNeed}
                  onChange={e => setNewLeadForm({ ...newLeadForm, detectedNeed: e.target.value })}
                  placeholder="e.g. Looking for AC Boys Hostel in Piprali Road under 7000"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
