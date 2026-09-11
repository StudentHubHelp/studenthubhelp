import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Phone,
  ArrowUpRight,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  CheckCircle2,
  Minimize2,
  Maximize2,
  MapPin,
  Target,
  Navigation,
  Calculator,
  Scale
} from 'lucide-react';
import { ChatMessage, ChatApiResponse, SentimentType } from '../types';
import { BudgetPlannerCard } from './BudgetPlannerCard';
import { ComparisonMatrixCard } from './ComparisonMatrixCard';

const CHAT_API_URL =
  (import.meta as any).env?.VITE_CHAT_API_URL ||
  'https://idurlccrarznnnqixxsd.supabase.co/functions/v1/studenthubhelp-chat';
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

interface ChatWidgetProps {
  onDiagnosisUpdate?: (diagnosis: any, userMessage: string) => void;
  onLeadCaptured?: (lead: any) => void;
  initialOpen?: boolean;
}

const QUICK_TOPICS = [
  { label: 'Monthly Budget Planner', query: 'Mera monthly student budget plan banao', topic: 'Student Monthly Budget Planner' },
  { label: 'Compare Active Hostels', query: 'Mere city me active hostels compare karo', topic: 'Live Hostel Comparison' },
  { label: 'Find Hostels', query: 'Mere liye active hostels dikhao', topic: 'Hostel Discovery' },
  { label: 'Find Tiffin', query: 'Active tiffin services dikhao', topic: 'Tiffin Discovery' },
  { label: 'Find Jain Food', query: 'Active Jain food tiffin services dikhao', topic: 'Jain Food Discovery' },
  { label: 'Find Libraries', query: 'Active libraries dikhao', topic: 'Library Discovery' },
  { label: 'Girls Hostel Safety', query: 'Active girls hostel listings me available safety details batao', topic: 'Girls Hostel Safety' },
  { label: 'Budget Options', query: 'Mere budget ke according active listings dikhao', topic: 'Budget Discovery' },
  { label: 'Contact Support', query: 'StudentHubHelp support contact details batao', topic: 'Support' },
  { label: 'Search by Area', query: 'Mere area ke active listings dikhao', topic: 'Area Discovery' },
];

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  onDiagnosisUpdate,
  onLeadCaptured,
  initialOpen = true
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentLeadAlert, setRecentLeadAlert] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    try { return crypto.randomUUID(); } catch { return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1', sender: 'bot',
      text: 'Namaste! Main StudentHubHelp AI Assistant hoon.\n\nAap hostel, tiffin, library, cafe, bookstore, area, budget ya support ke baare me pooch sakte hain. Listing recommendations live active data par based hongi.\n\nAap kis topic se start karna chahte hain?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      diagnosis: { intent: 'Welcome / Onboarding', primaryTopic: 'Student Accommodation & Services Discovery', topicDirectAnswer: 'Aapka requested topic pehle handle kiya jayega.', topicPriorityReason: 'Initial onboarding guidance with Topic Priority enabled.', userNeedSummary: 'Initial student guidance with full AI topic priority.', sentiment: 'positive', suggestedFollowUps: ['Active hostels dikhao','Active tiffin services dikhao','Active libraries dikhao','Support details batao'] }
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { if (isOpen) { scrollToBottom(); setUnreadCount(0); } }, [messages, isOpen]);
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition(); recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'hi-IN';
      recognition.onresult = (event: any) => { const transcript = event.results[0][0].transcript; setInputText(prev => prev ? `${prev} ${transcript}` : transcript); setIsListening(false); };
      recognition.onerror = () => setIsListening(false); recognition.onend = () => setIsListening(false); recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) { alert('Browser voice recognition is not supported in this browser. Please use Chrome, Edge or Safari.'); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); } else { try { recognitionRef.current.start(); setIsListening(true); } catch { setIsListening(false); } }
  };
  const speakText = (text: string) => {
    if (!isSpeakingEnabled || !window.speechSynthesis) return; window.speechSynthesis.cancel();
    const plainText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\n+/g, '. '); const utterance = new SpeechSynthesisUtterance(plainText); utterance.rate = 1; utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices(); const preferredVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices.find(v => v.lang.includes('en')) || voices[0]; if (preferredVoice) utterance.voice = preferredVoice; window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string, topicOverride?: string) => {
    const text = (textToSend || inputText).trim(); if (!text || isLoading) return; const topicToPrioritize = topicOverride || activeTopic;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMessage]); setInputText(''); setIsLoading(true);
    try {
      const history = messages.slice(-6).map(m => ({ role: m.sender === 'user' ? ('user' as const) : ('model' as const), text: m.text }));
      if (!SUPABASE_ANON_KEY) throw new Error('Missing VITE_SUPABASE_ANON_KEY. Add the public Supabase anon/publishable key to the Vite build environment.');
      const controller = new AbortController(); const timeoutId = window.setTimeout(() => controller.abort(), 20000); let res: Response;
      try {
        res = await fetch(CHAT_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ message: text, history, preferredTopic: topicToPrioritize, sessionId }), signal: controller.signal });
      } finally { window.clearTimeout(timeoutId); }
      if (!res.ok) { let detail = ''; try { const errorBody = await res.json(); detail = errorBody?.error || errorBody?.message || ''; } catch {} throw new Error(detail || `Chat request failed (${res.status})`); }
      const data: ChatApiResponse = await res.json(); if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Chat backend returned an invalid response.');
      const botMessage: ChatMessage = { id: `bot-${Date.now()}`, sender: 'bot', text: data.reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), diagnosis: { intent: data.intent, primaryTopic: data.primaryTopic, topicDirectAnswer: data.topicDirectAnswer, topicPriorityReason: data.topicPriorityReason, userNeedSummary: data.userNeedSummary, sentiment: data.sentiment as SentimentType, suggestedFollowUps: data.suggestedFollowUps || [] }, recommendedProperties: data.recommendedProperties || data.recommendations || [], budgetPlan: data.budgetPlan, comparisonMatrix: data.comparisonMatrix };
      setMessages(prev => [...prev, botMessage]); if (!isOpen) setUnreadCount(prev => prev + 1); if (data.capturedLead) { setRecentLeadAlert('Lead captured from this conversation.'); onLeadCaptured?.(data.capturedLead); } onDiagnosisUpdate?.(botMessage.diagnosis, text); setActiveTopic(null); speakText(data.reply);
    } catch (err: any) { setMessages(prev => [...prev, { id: `bot-error-${Date.now()}`, sender: 'bot', text: err?.name === 'AbortError' ? 'The response took too long. Please try again.' : (err?.message || 'Chat service is temporarily unavailable.'), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); }
    finally { setIsLoading(false); }
  };
  const handleQuickTopic = (topic: typeof QUICK_TOPICS[number]) => { setActiveTopic(topic.topic); void handleSendMessage(topic.query, topic.topic); };
  const handleFollowUp = (text: string) => void handleSendMessage(text);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSendMessage(); } };
  const clearConversation = () => { setMessages([]); setRecentLeadAlert(null); setActiveTopic(null); };
  const renderPropertyCard = (property: any, index: number) => { const detailUrl = property?.detailsUrl; return <div key={`${property?.id || property?.name || 'property'}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2"><div className="flex items-start justify-between gap-2"><div><div className="font-bold text-slate-900 text-sm">{property?.name || 'Active listing'}</div><div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{[property?.area, property?.city].filter(Boolean).join(', ') || 'Location not listed'}</div></div>{property?.verified && <span className="text-[10px] font-bold text-emerald-700">Verified</span>}</div><div className="grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-slate-400">Price</span><div className="font-bold text-slate-700">{property?.price ?? 'Not listed'}</div></div><div><span className="text-slate-400">Rating</span><div className="font-bold text-slate-700">{property?.rating ?? 'Not listed'}</div></div></div><div className="flex gap-2">{detailUrl && <a href={detailUrl} className="flex-1 text-center px-2.5 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold">View details</a>}{property?.mapsUrl && <a href={property.mapsUrl} target="_blank" rel="noreferrer" className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold"><Navigation className="w-3.5 h-3.5" /></a>}</div></div>; };

  return <div className="relative">
    <AnimatePresence>{!isOpen && <motion.button initial={{scale:.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.85,opacity:0}} onClick={()=>setIsOpen(true)} className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-2xl flex items-center justify-center border-2 border-white/80" aria-label="Open StudentHubHelp AI Chatbot"><MessageSquare className="w-6 h-6" />{unreadCount>0&&<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}</motion.button>}</AnimatePresence>
    <AnimatePresence>{isOpen && <motion.div initial={{opacity:0,y:20,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:.97}} className={`${isExpanded?'w-[min(760px,calc(100vw-2rem))] h-[min(760px,calc(100vh-2rem))]':'w-[min(420px,calc(100vw-2rem))] h-[min(700px,calc(100vh-2rem))]'} rounded-[28px] overflow-hidden bg-white shadow-2xl border border-slate-200 flex flex-col`}>
      <div className="bg-gradient-to-br from-[#071a38] to-[#0c2a55] text-white p-4 border-b border-amber-400/50"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">SH</div><div className="min-w-0"><div className="font-extrabold text-base">StudentHubHelp AI</div><div className="text-[11px] text-slate-300">Live listing assistant</div></div></div><div className="flex items-center gap-1"><button onClick={()=>setIsSpeakingEnabled(v=>!v)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Toggle voice">{isSpeakingEnabled?<Volume2 className="w-4 h-4"/>:<VolumeX className="w-4 h-4"/>}</button><button onClick={()=>setIsExpanded(v=>!v)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Resize chat">{isExpanded?<Minimize2 className="w-4 h-4"/>:<Maximize2 className="w-4 h-4"/>}</button><button onClick={()=>setIsOpen(false)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Minimize chatbot"><X className="w-4 h-4"/></button></div></div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-300"><span className="w-2 h-2 rounded-full bg-emerald-400"/> Live Supabase data · Gemini AI</div></div>
      <div className="px-3 py-2 bg-[#07152f] border-b border-slate-700 overflow-x-auto flex gap-2">{QUICK_TOPICS.map(topic=><button key={topic.label} onClick={()=>handleQuickTopic(topic)} className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold">{topic.label}</button>)}</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">{recentLeadAlert&&<div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-3 py-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>{recentLeadAlert}</div>}{messages.map(m=><div key={m.id} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}><div className={`${m.sender==='user'?'bg-slate-900 text-white':'bg-white text-slate-800 border border-slate-200'} max-w-[90%] rounded-2xl px-3.5 py-3 shadow-sm`}><div className="flex items-center gap-2 text-[10px] font-bold mb-1 opacity-70">{m.sender==='user'?<User className="w-3 h-3"/>:<Bot className="w-3 h-3"/>}{m.sender==='user'?'You':'StudentHubHelp AI'}<span className="ml-auto">{m.timestamp}</span></div><div className="text-sm whitespace-pre-wrap leading-6">{m.text}</div>{m.diagnosis?.primaryTopic&&m.sender==='bot'&&<div className="mt-2 text-[10px] rounded-lg bg-amber-50 text-amber-800 border border-amber-200 p-2"><b>Topic:</b> {m.diagnosis.primaryTopic}</div>}{m.recommendedProperties?.length>0&&<div className="mt-3 space-y-2">{m.recommendedProperties.map(renderPropertyCard)}</div>}{m.budgetPlan&&<div className="mt-3"><BudgetPlannerCard plan={m.budgetPlan}/></div>}{m.comparisonMatrix&&<div className="mt-3"><ComparisonMatrixCard matrix={m.comparisonMatrix}/></div>}{m.diagnosis?.suggestedFollowUps?.length>0&&m.sender==='bot'&&<div className="mt-3 flex flex-wrap gap-2">{m.diagnosis.suggestedFollowUps.slice(0,4).map((f:string)=><button key={f} onClick={()=>handleFollowUp(f)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold">{f}</button>)}</div>}</div></div>)}{isLoading&&<div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500">AI is checking live listings…</div></div>}<div ref={messagesEndRef}/></div>
      <div className="border-t border-slate-200 bg-white p-3"><div className="flex gap-2 items-center"><button onClick={toggleSpeechRecognition} className={`w-11 h-11 rounded-xl border flex items-center justify-center ${isListening?'bg-rose-50 border-rose-300 text-rose-600':'bg-slate-50 border-slate-200 text-slate-600'}`} aria-label="Voice input">{isListening?<MicOff className="w-5 h-5"/>:<Mic className="w-5 h-5"/>}</button><input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type any topic (Hostel, Tiffin, Library, Rates)..." className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"/><button onClick={()=>void handleSendMessage()} disabled={isLoading||!inputText.trim()} className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center disabled:opacity-50" aria-label="Send message"><Send className="w-5 h-5"/></button></div><div className="flex items-center justify-between mt-2 text-[10px] text-slate-400"><span>Live listing support</span><button onClick={clearConversation} className="flex items-center gap-1 hover:text-slate-700"><RotateCcw className="w-3 h-3"/> Clear chat</button></div></div>
    </motion.div>}</AnimatePresence>
  </div>;
};
