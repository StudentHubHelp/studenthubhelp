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
  ExternalLink,
  Target,
  Navigation,
  Calculator,
  Scale
} from 'lucide-react';
import { ChatMessage, ChatApiResponse, SentimentType, PropertyRecommendation } from '../types';
import { BudgetPlannerCard } from './BudgetPlannerCard';
import { ComparisonMatrixCard } from './ComparisonMatrixCard';

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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'Namaste! 🙏 Main StudentHubHelp ka Ultra Advance AI Assistant hoon.\n\n**Topic Priority Engine Active**: Aap jis bhi topic (Hostel, Tiffin, 24/7 Library, Area, Budget ya Owner contact) ke baare me puchenge, main usko **FIRST PRIORITY** dekar instant direct answer, verified rate aur Google Maps location provide karunga.\n\nAapko kis topic ki jankari chahiye?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      diagnosis: {
        intent: 'Welcome / Onboarding',
        primaryTopic: 'Student Accommodation & Services Discovery',
        topicDirectAnswer: 'India\'s #1 zero-brokerage verified student discovery platform with 24/7 support.',
        topicPriorityReason: 'Initial onboarding guidance with Topic Priority enabled.',
        userNeedSummary: 'Initial student guidance with full AI topic priority.',
        sentiment: 'positive',
        suggestedFollowUps: [
          'Piprali Road Boys Hostels',
          'Tiffin monthly subscription charge',
          '24/7 AC Library in Sikar',
          'Director Satpal Swami Helpline'
        ],
        recommendedCategory: 'hostel',
        targetCity: 'Sikar'
      }
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Speech Recognition Setup (Hindi + English NLP)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'hi-IN'; // Supports Hindi, Hinglish and English mixed speech

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert("Browser voice recognition is not supported in this browser. Please use Chrome, Edge or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  // Text-To-Speech Output
  const speakText = (text: string) => {
    if (!isSpeakingEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    // Strip markdown formatting for voice
    const plainText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Find Hindi or Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) ||
      voices.find(v => v.lang.includes('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string, topicOverride?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const topicToPrioritize = topicOverride || activeTopic;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Format chat history
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          preferredTopic: topicToPrioritize
        })
      });

      if (!res.ok) {
        throw new Error('Server returned an error');
      }

      const data: ChatApiResponse = await res.json();

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagnosis: {
          intent: data.intent,
          primaryTopic: data.primaryTopic,
          topicDirectAnswer: data.topicDirectAnswer,
          topicPriorityReason: data.topicPriorityReason,
          userNeedSummary: data.userNeedSummary,
          sentiment: data.sentiment,
          suggestedFollowUps: data.suggestedFollowUps || [],
          capturedLead: data.capturedLead,
          recommendations: data.recommendations,
          budgetPlan: data.budgetPlan,
          comparisonMatrix: data.comparisonMatrix,
          isFallback: data.isFallback
        }
      };

      setMessages(prev => [...prev, botMessage]);

      if (data.primaryTopic) {
        setActiveTopic(data.primaryTopic);
      }

      // Notify parent telemetry components
      if (onDiagnosisUpdate) {
        onDiagnosisUpdate(botMessage.diagnosis, text);
      }

      // If a lead was extracted from conversation
      if (data.capturedLead && data.capturedLead.phone) {
        if (onLeadCaptured) {
          onLeadCaptured(data.capturedLead);
        }
        setRecentLeadAlert(`🎉 Contact number ${data.capturedLead.phone} captured! Director Satpal Swami's team will contact you.`);
        setTimeout(() => setRecentLeadAlert(null), 7000);
      }

      // Speak answer if TTS is active
      if (isSpeakingEnabled) {
        speakText(data.reply);
      }

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Namaste! Main aapki sahayata ke liye tayyar hoon. Aap direct hamare Director **Satpal Swami** ji se WhatsApp ya Call par baat kar sakte hain: **+91 9929718264**.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagnosis: {
          intent: 'Direct Contact Fallback',
          primaryTopic: 'Director Satpal Swami Direct Helpline',
          topicDirectAnswer: 'Call or WhatsApp Director Satpal Swami at +91 9929718264 for instant zero-brokerage support.',
          userNeedSummary: 'Direct support inquiry',
          sentiment: 'neutral',
          suggestedFollowUps: ['Sikar Boys Hostel', 'Tiffin delivery rate', 'WhatsApp par chat karein']
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, feedback: type } : msg))
    );
  };

  const handleResetChat = () => {
    window.speechSynthesis?.cancel();
    setActiveTopic(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: 'Chat restart ho gaya hai! 🙏 Batayein, aaj kis topic ko sabse pehle priority dein? (Piprali Road Hostel, Tiffin/Khana, 24/7 Library ya Director Helpline)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        diagnosis: {
          intent: 'Chat Reset',
          primaryTopic: 'Fresh Topic Prioritization',
          topicDirectAnswer: 'Ready to prioritize your exact inquired topic immediately.',
          userNeedSummary: 'Fresh student conversation',
          sentiment: 'positive',
          suggestedFollowUps: [
            'Piprali Road Boys Hostels',
            'Daily Tiffin Service Price',
            '24/7 AC Library Seat Booking',
            'Director Contact Number'
          ]
        }
      }
    ]);
  };

  const getSentimentBadge = (sentiment?: SentimentType) => {
    switch (sentiment) {
      case 'positive':
        return <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">😊 Positive</span>;
      case 'urgent':
        return <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">🔥 Urgent</span>;
      case 'frustrated':
        return <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">😟 Need Support</span>;
      case 'curious':
        return <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">🔍 Inquiring</span>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            className="hidden sm:flex items-center gap-2.5 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-amber-500/30 backdrop-blur-md cursor-pointer hover:border-amber-400 transition"
            onClick={() => setIsOpen(true)}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                Topic Priority AI Active
              </div>
              <div className="text-slate-300 text-[11px]">Direct Answer 24/7 • Zero Brokerage</div>
            </div>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle StudentHubHelp AI Chat"
          className="relative w-15 h-15 rounded-full bg-gradient-to-br from-[#071a33] via-[#0b2547] to-[#143a68] text-white shadow-2xl flex items-center justify-center border-2 border-amber-400/80 hover:shadow-amber-500/20 focus:outline-none transition"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-amber-300" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6 text-amber-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-[11px] font-black flex items-center justify-center border-2 border-white shadow">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>

      {/* Floating Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[720px] h-[calc(100vh-80px)] max-h-[850px]'
                : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[440px] h-[calc(100vh-90px)] max-h-[670px]'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#071a33] via-[#0b2547] to-[#12365c] text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-amber-400 relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md flex items-center justify-center font-black text-slate-950 text-sm">
                    SH
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#071a33] rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                      StudentHubHelp AI
                    </h3>
                    <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Target className="w-3 h-3 text-amber-400" /> Topic Priority
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Immediate factual answers for whatever you ask first
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTopic('Student Monthly Budget Planner');
                    handleSendMessage('Mera monthly student budget plan control karo aur complete expense breakdown calculate karke do', 'Student Monthly Budget Planner');
                  }}
                  title="Open Monthly Budget Planner"
                  className="px-2 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-[10px] font-extrabold border border-amber-400/40 transition flex items-center gap-1"
                >
                  <Calculator className="w-3 h-3" />
                  <span className="hidden sm:inline">Budget</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTopic('Advance Hostel Comparison');
                    handleSendMessage('Mere liye do active hostel listings ka advance side-by-side comparison karo', 'Advance Hostel Comparison');
                  }}
                  title="Open Advance Hostel Comparison"
                  className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-400 text-blue-300 hover:text-slate-950 text-[10px] font-extrabold border border-blue-400/40 transition flex items-center gap-1"
                >
                  <Scale className="w-3 h-3" />
                  <span className="hidden sm:inline">Compare</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)}
                  title={isSpeakingEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
                  className={`p-2 rounded-xl transition ${
                    isSpeakingEnabled ? 'text-amber-300 hover:bg-white/10' : 'text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {isSpeakingEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset conversation"
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse" : "Expand window"}
                  className="hidden sm:block p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Topic Priority Selector Bar */}
            <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-amber-400 font-bold flex items-center gap-1 flex-shrink-0 text-[10px] uppercase tracking-wider pr-1 border-r border-slate-700">
                <Target className="w-3 h-3" /> Priority Topics:
              </span>
              {QUICK_TOPICS.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveTopic(t.topic);
                    handleSendMessage(t.query, t.topic);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 border flex-shrink-0 ${
                    activeTopic === t.topic
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-xs'
                      : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Notification Banner when Lead is automatically captured */}
            <AnimatePresence>
              {recentLeadAlert && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center gap-2 shadow-inner"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{recentLeadAlert}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Scroll Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 text-slate-800">
              {messages.map((msg, index) => {
                const isBot = msg.sender === 'bot';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[94%] sm:max-w-[88%]">
                      {isBot && (
                        <div className="w-7 h-7 rounded-xl bg-[#071a33] text-amber-300 flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-bold">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isBot
                            ? 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-sm'
                            : 'bg-gradient-to-br from-[#071a33] to-[#12365c] text-white rounded-br-sm'
                        }`}
                      >
                        {/* FIRST PRIORITY TOPIC HIGHLIGHT BANNER */}
                        {isBot && msg.diagnosis?.primaryTopic && (
                          <div className="mb-2.5 p-2 bg-gradient-to-r from-amber-50 via-amber-100/40 to-transparent border-l-3 border-amber-500 rounded-r-xl">
                            <div className="flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-900 uppercase tracking-wide">
                                <Target className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                First Priority: {msg.diagnosis.primaryTopic}
                              </span>
                              {msg.diagnosis.sentiment && getSentimentBadge(msg.diagnosis.sentiment)}
                            </div>
                            {msg.diagnosis.topicDirectAnswer && (
                              <div className="text-[11px] font-semibold text-slate-900 mt-1 leading-snug">
                                ⚡ {msg.diagnosis.topicDirectAnswer}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Intent Badges */}
                        {isBot && msg.diagnosis && !msg.diagnosis.primaryTopic && (
                          <div className="flex items-center flex-wrap gap-1.5 mb-2 pb-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                              {msg.diagnosis.intent}
                            </span>
                            {getSentimentBadge(msg.diagnosis.sentiment)}
                            {msg.diagnosis.isFallback && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">
                                Smart Fallback Active
                              </span>
                            )}
                          </div>
                        )}

                        {/* Main Message Text (Supports Line Breaks) */}
                        <div className="whitespace-pre-wrap font-normal">
                          {msg.text}
                        </div>

                        {/* Property Recommendations if any */}
                        {isBot && msg.diagnosis?.recommendations && msg.diagnosis.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                            <div className="text-[11px] font-bold text-amber-700 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Topic Priority Verified Matches:
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">Zero Brokerage</span>
                            </div>
                            {msg.diagnosis.recommendations.map(prop => (
                              <div
                                key={prop.id}
                                className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 hover:border-amber-400/80 transition flex flex-col gap-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-xs text-slate-900">{prop.name}</div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                      {prop.area}, {prop.city}
                                    </div>
                                    {prop.landmark && (
                                      <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                                        📍 {prop.landmark}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex-shrink-0">
                                    {prop.price}
                                  </span>
                                </div>

                                {prop.matchReason && (
                                  <div className="text-[10px] bg-amber-50/80 border border-amber-200/60 rounded px-2 py-0.5 text-amber-900 font-medium">
                                    🎯 {prop.matchReason}
                                  </div>
                                )}

                                {prop.highlights && (
                                  <div className="text-[10px] text-slate-600 flex flex-wrap gap-1 mt-0.5">
                                    {prop.highlights.slice(0, 2).map((h, i) => (
                                      <span key={i} className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                                        ✓ {h}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-200/60 flex-wrap">
                                  <a
                                    href={`tel:${prop.phone || '+919929718264'}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600" /> Call Owner
                                  </a>

                                  {prop.mapsUrl && (
                                    <a
                                      href={prop.mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg transition"
                                    >
                                      <Navigation className="w-3 h-3 text-blue-600" /> Google Maps
                                    </a>
                                  )}

                                  <a
                                    href={prop.link || '#'}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg transition ml-auto"
                                  >
                                    View <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Interactive Student Monthly Budget Planner Widget */}
                        {isBot && msg.diagnosis?.budgetPlan && (
                          <BudgetPlannerCard
                            initialPlan={msg.diagnosis.budgetPlan}
                            onRecalculate={(amt) => handleSendMessage(`Mera monthly budget ₹${amt} hai, student monthly budget plan calculate karo`, 'Student Monthly Budget Planner')}
                            onSendQuery={(query) => handleSendMessage(query, 'Student Monthly Budget Planner')}
                          />
                        )}

                        {/* Advance Multi-Option Comparison Matrix Widget */}
                        {isBot && msg.diagnosis?.comparisonMatrix && (
                          <ComparisonMatrixCard
                            matrix={msg.diagnosis.comparisonMatrix}
                            onSelectOption={(opt) => handleSendMessage(`${opt} ki seat booking process aur owner contact dijiye`, 'Advance Hostel Comparison')}
                            onSendQuery={(query) => handleSendMessage(query, 'Advance Hostel Comparison')}
                          />
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1">
                          <span>{msg.timestamp}</span>

                          {/* Thumbs up/down feedback for bot message */}
                          {isBot && (
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, 'up')}
                                title="Helpful"
                                className={`p-1 rounded hover:bg-slate-100 transition ${
                                  msg.feedback === 'up' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, 'down')}
                                title="Needs Improvement"
                                className={`p-1 rounded hover:bg-slate-100 transition ${
                                  msg.feedback === 'down' ? 'text-rose-600 font-bold' : 'text-slate-400'
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isBot && (
                        <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-bold">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Follow-up Question Chips */}
                    {isBot && index === messages.length - 1 && msg.diagnosis?.suggestedFollowUps && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 ml-9 max-w-[90%]">
                        {msg.diagnosis.suggestedFollowUps.map((chip, chipIndex) => (
                          <button
                            key={chipIndex}
                            type="button"
                            onClick={() => handleSendMessage(chip)}
                            className="bg-white border border-amber-300/80 hover:border-amber-500 hover:bg-amber-50 text-slate-700 hover:text-amber-950 px-2.5 py-1 rounded-full text-xs font-medium shadow-xs transition flex items-center gap-1 text-left"
                          >
                            <span className="text-amber-500 text-[10px]">✦</span> {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing Loader */}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <div className="w-7 h-7 rounded-xl bg-[#071a33] text-amber-300 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px] text-slate-500 font-medium ml-1">
                      {activeTopic ? `Analyzing topic: "${activeTopic}"...` : "StudentHubHelp AI topic prioritize kar raha hai..."}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input & Voice Controls */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Dictation (Speech to Text) */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Listening... click to stop" : "Speak in Hindi or English (Voice Search)"}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition flex-shrink-0 ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening... boliye (e.g. 6000 me boys hostel)"
                      : "Type any topic (Hostel, Tiffin, Library, Rates)..."
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:from-amber-400 hover:to-amber-300 transition flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Free verified support • Zero brokerage</span>
                <span className="flex items-center gap-1">
                  Director Helpline: <strong className="text-slate-600">+91 9929718264</strong>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

