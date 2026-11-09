import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, MessageSquare, MessagesSquare, Users, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ChatMessage = {
  id: number;
  conversation_id: string;
  visitor_id: string;
  user_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  intent: string | null;
  category: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

type Conversation = {
  id: string;
  messages: ChatMessage[];
  lastMessage: ChatMessage;
  firstMessage: ChatMessage;
};

const PAGE_SIZE = 500;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const ChatbotView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const loadMessages = useCallback(async (reset = true) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const from = reset ? 0 : messages.length;
      const to = from + PAGE_SIZE - 1;
      const { data, error: queryError, count } = await supabase
        .from('chatbot_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (queryError) throw queryError;
      const rows = (Array.isArray(data) ? data : []) as ChatMessage[];
      setMessages(previous => reset ? rows : [...previous, ...rows]);
      setTotalCount(Number(count || 0));
      if (reset && rows.length) setSelectedId(current => current || rows[0].conversation_id);
    } catch (e: any) {
      setError(e?.message || 'Chat records could not be loaded. Check admin access and chatbot_messages RLS.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [messages.length]);

  useEffect(() => { void loadMessages(true); }, []);

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, ChatMessage[]>();
    for (const message of messages) {
      const key = message.conversation_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(message);
    }
    return Array.from(grouped.entries()).map(([id, rows]) => {
      const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return { id, messages: sorted, firstMessage: sorted[0], lastMessage: sorted[sorted.length - 1] };
    }).sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter(conversation => {
      if (roleFilter !== 'all' && !conversation.messages.some(message => message.role === roleFilter)) return false;
      if (!term) return true;
      return conversation.id.toLowerCase().includes(term)
        || conversation.messages.some(message =>
          message.content.toLowerCase().includes(term)
          || String(message.user_id || '').toLowerCase().includes(term)
          || String(message.category || '').toLowerCase().includes(term)
          || String(message.intent || '').toLowerCase().includes(term)
        );
    });
  }, [conversations, search, roleFilter]);

  useEffect(() => {
    if (selectedId && filteredConversations.some(item => item.id === selectedId)) return;
    setSelectedId(filteredConversations[0]?.id || '');
  }, [filteredConversations, selectedId]);

  const selected = conversations.find(item => item.id === selectedId) || null;
  const userMessages = messages.filter(message => message.role === 'user').length;
  const errorMessages = messages.filter(message => message.metadata?.is_error === true).length;
  const hasMore = messages.length < totalCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-extrabold">Assistant intelligence</div>
          <h2 className="text-2xl font-serif font-extrabold text-white mt-1">Chatbot Records</h2>
          <p className="text-xs text-slate-400 mt-1">Saved conversations, full message transcripts, search context and chatbot errors.</p>
        </div>
        <button onClick={() => void loadMessages(true)} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 text-xs font-bold disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh records
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <Metric icon={MessagesSquare} label="Messages loaded" value={messages.length.toLocaleString('en-IN')} />
        <Metric icon={MessageSquare} label="Conversations loaded" value={conversations.length.toLocaleString('en-IN')} />
        <Metric icon={Users} label="User messages" value={userMessages.toLocaleString('en-IN')} />
        <Metric icon={MessageSquare} label="Bot replies" value={messages.filter(message => message.role === 'assistant').length.toLocaleString('en-IN')} />
        <Metric icon={AlertTriangle} label="Bot errors" value={errorMessages.toLocaleString('en-IN')} warning={errorMessages > 0} />
      </div>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div>}

      <div className="rounded-3xl border border-slate-800 bg-[#081026] overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search message, category, intent, user ID or conversation…" className="w-full rounded-xl border border-slate-700 bg-[#0d1838] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-cyan-400/50" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)} className="rounded-xl border border-slate-700 bg-[#0d1838] px-3 py-2.5 text-xs text-white">
            <option value="all">All message types</option>
            <option value="user">User messages</option>
            <option value="assistant">Assistant replies</option>
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)] min-h-[560px]">
          <div className="border-b xl:border-b-0 xl:border-r border-slate-800 max-h-[640px] overflow-y-auto">
            <div className="px-4 py-3 text-[10px] uppercase tracking-widest font-extrabold text-slate-500">Conversations · {filteredConversations.length}</div>
            {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading chatbot records…</div> :
              filteredConversations.length ? filteredConversations.map(conversation => (
                <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full text-left p-4 border-t border-slate-800/70 transition-colors ${selectedId === conversation.id ? 'bg-cyan-400/10 border-l-2 border-l-cyan-300' : 'hover:bg-white/[0.025]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{conversation.firstMessage.user_id ? 'Signed-in user' : 'Guest visitor'}</span>
                    <span className="text-[9px] text-slate-500 shrink-0">{dateTime(conversation.lastMessage.created_at)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 truncate">{conversation.messages.find(message => message.role === 'user')?.content || 'No user message'}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[9px] px-2 py-1 rounded-full bg-slate-800 text-cyan-200">{conversation.messages.length} loaded msg</span>
                    {conversation.lastMessage.category && <span className="text-[9px] px-2 py-1 rounded-full bg-slate-800 text-slate-300">{conversation.lastMessage.category}</span>}
                    {conversation.messages.some(message => message.metadata?.is_error) && <span className="text-[9px] px-2 py-1 rounded-full bg-rose-500/10 text-rose-300">Error</span>}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-2 font-mono">{conversation.id.slice(0, 18)}…</div>
                </button>
              )) : <div className="p-8 text-center text-xs text-slate-500">No matching conversations found.</div>}
          </div>

          <div className="min-w-0 flex flex-col">
            {selected ? <>
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-white">Conversation transcript</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 break-all">{selected.id}</div>
                </div>
                <button onClick={() => setShowDetails(value => !value)} className="inline-flex items-center gap-1 text-[10px] text-cyan-200 font-bold">
                  Session details {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              {showDetails && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/30 border-b border-slate-800 text-[10px]">
                <Info label="Visitor ID" value={selected.firstMessage.visitor_id} />
                <Info label="User ID" value={selected.firstMessage.user_id || 'Guest / not signed in'} />
                <Info label="Started" value={dateTime(selected.firstMessage.created_at)} />
                <Info label="Last message" value={dateTime(selected.lastMessage.created_at)} />
              </div>}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[640px]">
                {selected.messages.map(message => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] rounded-2xl p-3 border ${message.role === 'user' ? 'bg-blue-500/10 border-blue-400/20' : 'bg-slate-900 border-slate-700'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] uppercase font-extrabold tracking-wider ${message.role === 'user' ? 'text-blue-300' : 'text-emerald-300'}`}>{message.role === 'user' ? 'Student' : 'Chatbot'}</span>
                        <span className="text-[9px] text-slate-600">{dateTime(message.created_at)}</span>
                        {message.metadata?.is_error && <span className="text-[9px] text-rose-300">Error</span>}
                      </div>
                      <div className="text-xs text-slate-200 whitespace-pre-wrap break-words">{message.content}</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.intent && <span className="text-[9px] text-slate-500">Intent: {message.intent}</span>}
                        {message.category && <span className="text-[9px] text-slate-500">Category: {message.category}</span>}
                        {message.metadata?.search_city && <span className="text-[9px] text-slate-500">City: {message.metadata.search_city}</span>}
                        {message.metadata?.search_area && <span className="text-[9px] text-slate-500">Area: {message.metadata.search_area}</span>}
                        {message.metadata?.result_count !== null && message.metadata?.result_count !== undefined && <span className="text-[9px] text-slate-500">Results: {message.metadata.result_count}</span>}
                      </div>
                      {message.metadata?.error_message && <div className="mt-2 text-[10px] text-rose-300">{message.metadata.error_message}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </> : <div className="flex-1 flex items-center justify-center text-xs text-slate-500 p-8">Select a conversation to view its transcript.</div>}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-slate-500">Showing {messages.length.toLocaleString('en-IN')} of {totalCount.toLocaleString('en-IN')} messages. Older messages load on request.</div>
          {hasMore && <button onClick={() => void loadMessages(false)} disabled={loadingMore} className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 disabled:opacity-50">{loadingMore ? 'Loading…' : 'Load older messages'}</button>}
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{ icon: any; label: string; value: string; warning?: boolean }> = ({ icon: Icon, label, value, warning }) => (
  <div className="rounded-2xl border border-slate-800 bg-[#081026] p-4">
    <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-400">{label}</span><Icon className={`w-4 h-4 ${warning ? 'text-rose-300' : 'text-cyan-300'}`} /></div>
    <div className={`text-2xl font-extrabold mt-2 ${warning ? 'text-rose-300' : 'text-white'}`}>{value}</div>
  </div>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0"><div className="text-slate-500">{label}</div><div className="text-slate-200 break-all mt-1">{value}</div></div>
);
