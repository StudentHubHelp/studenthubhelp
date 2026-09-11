import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Check,
  RefreshCw,
  Sliders,
  HelpCircle,
  Phone,
  Building,
  Sparkles,
  BookOpen,
  Volume2
} from 'lucide-react';
import { BotConfig } from '../types';
import { DEFAULT_BOT_CONFIG } from '../data/defaultConfig';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (newConfig: BotConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved
}) => {
  const [config, setConfig] = useState<BotConfig>({ ...DEFAULT_BOT_CONFIG });
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadServerConfig();
    }
  }, [isOpen]);

  const loadServerConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load bot config:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        setSavedSuccess(true);
        if (onConfigSaved) {
          onConfigSaved(config);
        }
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Error saving configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all bot configuration back to StudentHubHelp default settings?')) {
      setConfig({ ...DEFAULT_BOT_CONFIG });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#071a33] to-[#12365c] text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                Bot Knowledge Studio (UI Config)
              </h3>
              <p className="text-xs text-slate-300">
                Change website name, services, pricing, and bot persona live without touching code
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800 text-xs sm:text-sm">
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl flex items-center gap-2 font-bold text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              Settings saved and synchronized with Gemini 3.8 Flash backend!
            </div>
          )}

          {/* Persona & Tone */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <label className="font-bold text-slate-900 flex items-center gap-2 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Bot Tone & Persona
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'friendly', label: '😊 Friendly & Relatable', desc: 'Warm Hinglish student buddy' },
                { id: 'professional', label: '👔 Professional', desc: 'Formal counselor tone' },
                { id: 'empathetic', label: '❤️ Empathetic', desc: 'Caring & reassuring' },
                { id: 'sales_driven', label: '🚀 High Conversion', desc: 'Proactive lead collector' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setConfig({ ...config, botTone: t.id as any })}
                  className={`p-3 rounded-xl border text-left transition ${
                    config.botTone === t.id
                      ? 'bg-[#071a33] text-white border-[#071a33] shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="font-bold text-xs">{t.label}</div>
                  <div className={`text-[10px] mt-1 ${config.botTone === t.id ? 'text-slate-300' : 'text-slate-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Website Name
              </label>
              <input
                type="text"
                value={config.websiteName}
                onChange={e => setConfig({ ...config, websiteName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Industry / Category
              </label>
              <input
                type="text"
                value={config.industry}
                onChange={e => setConfig({ ...config, industry: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Director & Contact */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-4 space-y-3">
            <label className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              Director & Contact Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Director Name</span>
                <input
                  type="text"
                  value={config.directorName}
                  onChange={e => setConfig({ ...config, directorName: e.target.value })}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Phone / WhatsApp</span>
                <input
                  type="text"
                  value={config.directorPhone}
                  onChange={e => setConfig({ ...config, directorPhone: e.target.value })}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block mb-1 font-semibold">Email</span>
                <input
                  type="email"
                  value={config.directorEmail}
                  onChange={e => setConfig({ ...config, directorEmail: e.target.value })}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supported Cities / Student Hubs
            </label>
            <input
              type="text"
              value={config.primaryLocation}
              onChange={e => setConfig({ ...config, primaryLocation: e.target.value })}
              placeholder="e.g. Sikar, Kota, Jaipur, Delhi"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Custom Welcome Message (Hindi/Hinglish)
            </label>
            <textarea
              rows={2}
              value={config.welcomeMessage}
              onChange={e => setConfig({ ...config, welcomeMessage: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Injected Knowledge Base */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Custom Knowledge Injected to Gemini 3.8 Flash System Instruction</span>
              <span className="text-slate-400 font-normal text-[10px]">Real-time RAG prompt context</span>
            </label>
            <textarea
              rows={6}
              value={config.customKnowledge}
              onChange={e => setConfig({ ...config, customKnowledge: e.target.value })}
              className="w-full font-mono text-[11px] p-3 bg-slate-900 text-amber-200 border border-slate-700 rounded-xl outline-none focus:border-amber-400"
            />
          </div>

          {/* Voice Features Toggles */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.enableTTS}
                onChange={e => setConfig({ ...config, enableTTS: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Enable Text-To-Speech (Bol kar sunaye)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.enableSTT}
                onChange={e => setConfig({ ...config, enableSTT: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Enable Microphone Dictation (Speech Recognition)</span>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow transition flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save & Sync Live
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
