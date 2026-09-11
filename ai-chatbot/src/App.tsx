import React, { useState } from 'react';
import {
  Globe,
  Activity,
  Sliders,
  Code,
  Sparkles,
  Phone,
  Shield,
  Layers,
  HelpCircle
} from 'lucide-react';
import { WebsitePreview } from './components/WebsitePreview';
import { NeedInspector } from './components/NeedInspector';
import { ConfigModal } from './components/ConfigModal';
import { EmbedCodeModal } from './components/EmbedCodeModal';
import { ChatWidget } from './components/ChatWidget';
import { BotConfig } from './types';
import { DEFAULT_BOT_CONFIG } from './data/defaultConfig';

export default function App() {
  const [activeTab, setActiveTab] = useState<'preview' | 'telemetry'>('preview');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [currentBotConfig, setCurrentBotConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);

  // Shared telemetry state
  const [lastDiagnosis, setLastDiagnosis] = useState<any>(null);
  const [lastUserQuery, setLastUserQuery] = useState<string>('');

  const handleDiagnosisUpdate = (diagnosis: any, userMsg: string) => {
    setLastDiagnosis(diagnosis);
    setLastUserQuery(userMsg);
  };

  const handlePromptFromPreview = (prompt: string) => {
    // If user clicks a test chip on website preview, send into chatbot or trigger notification
    const chatInput = document.querySelector('input[placeholder*="Type in Hindi"]') as HTMLInputElement;
    if (chatInput) {
      chatInput.value = prompt;
      chatInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Professional Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#071a33] text-white border-b border-amber-400/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg flex items-center justify-center font-black text-[#071a33] text-base">
              SH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  StudentHubHelp
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                  AI Chatbot &amp; CRM Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                Director Satpal Swami Helpline: +91 9929718264
              </p>
            </div>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Website &amp; Chatbot</span>
              <span className="md:hidden">Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Need Inspector &amp; CRM</span>
              <span className="md:hidden">CRM</span>
            </button>
          </div>

          {/* Studio Tools Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              title="Open Bot Knowledge Studio"
              className="bg-white/10 hover:bg-white/20 text-white p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Bot Knowledge Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmbedModalOpen(true)}
              title="1-Click Embed Code Generator"
              className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">1-Click Embed</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {activeTab === 'preview' ? (
          <WebsitePreview onPromptChat={handlePromptFromPreview} />
        ) : (
          <NeedInspector
            lastDiagnosis={lastDiagnosis}
            lastUserQuery={lastUserQuery}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#071a33] text-slate-400 text-xs py-6 border-t border-slate-800 text-center space-y-1 mt-auto">
        <p className="font-semibold text-slate-200">
          StudentHubHelp — India's Premier Student Housing &amp; Educational Services Discovery Platform
        </p>
        <p>
          Director: <strong>SATPAL SWAMI</strong> • Phone: +91 9929718264 • Email: satpalswami22742@gmail.com
        </p>
        <p className="text-[11px] text-slate-500">
          Powered by Google Gemini 3.8 Flash • Strict JSON Schema • Multi-lingual NLP &amp; Real-time Lead CRM
        </p>
      </footer>

      {/* Floating AI Chatbot Widget (Always available across tabs) */}
      <ChatWidget
        onDiagnosisUpdate={handleDiagnosisUpdate}
        initialOpen={true}
      />

      {/* Knowledge Studio Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigSaved={cfg => setCurrentBotConfig(cfg)}
      />

      {/* 1-Click Embed Code Modal */}
      <EmbedCodeModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
      />
    </div>
  );
}
