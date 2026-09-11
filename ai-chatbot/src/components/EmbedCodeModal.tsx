import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Layers,
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';

interface EmbedCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'html' | 'wordpress' | 'shopify' | 'webflow'>('html');
  const [primaryColor, setPrimaryColor] = useState('#071a33');
  const [accentColor, setAccentColor] = useState('#d7a63d');
  const [position, setPosition] = useState<'right' | 'left'>('right');

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://studenthubhelp.github.io';
  const embedScript = `<script src="${currentHost}/widget.js" data-api-url="${currentHost}" data-color="${primaryColor}" data-accent="${accentColor}" data-position="${position}" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#071a33] to-[#12365c] text-white p-5 flex items-center justify-between border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                1-Click Embed Code Generator
              </h3>
              <p className="text-xs text-slate-300">
                Add this chatbot to StudentHubHelp, WordPress, Shopify, or any custom website
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800 text-xs sm:text-sm">
          {/* Customization Options */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              🎨 Widget Appearance & Positioning
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Primary Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-700">{primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Accent Gold Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-700">{accentColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Screen Position
                </label>
                <select
                  value={position}
                  onChange={e => setPosition(e.target.value as any)}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none font-semibold"
                >
                  <option value="right">Bottom Right (Recommended)</option>
                  <option value="left">Bottom Left</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generated Code Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Copy this single script tag:
              </span>
              <span className="text-[11px] text-slate-400">Zero setup • Works everywhere</span>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-amber-300 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800 shadow-inner leading-relaxed select-all">
                {embedScript}
              </pre>

              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-950" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Integration Guide Tabs */}
          <div>
            <div className="text-xs font-bold text-slate-900 mb-2">
              Step-by-Step Installation Guides:
            </div>

            <div className="flex gap-2 border-b border-slate-200 pb-2 mb-3">
              {[
                { id: 'html', label: 'HTML / Static Site' },
                { id: 'wordpress', label: 'WordPress / Elementor' },
                { id: 'shopify', label: 'Shopify Store' },
                { id: 'webflow', label: 'Webflow / Wix' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlatform(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    platform === tab.id
                      ? 'bg-[#071a33] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed">
              {platform === 'html' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Apne website ke HTML file me jaayen (jaise <code>index.html</code>, <code>pg-finder.html</code> ya <code>footer.html</code>).</li>
                  <li>Closing <code>&lt;/body&gt;</code> tag se theek pehle upar diya gaya code paste karein.</li>
                  <li>File save karein aur page reload karein — chatbot widget turant live dikhne lagega!</li>
                </ol>
              )}

              {platform === 'wordpress' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>WordPress Admin Dashboard me login karein.</li>
                  <li><strong>Plugins &gt; Add New</strong> me jakar <em>"WPCode"</em> ya <em>"Insert Headers and Footers"</em> install karein.</li>
                  <li><strong>Code Snippets &gt; Header &amp; Footer</strong> me jaakar <strong>Footer</strong> section me ye script paste karein aur Save karein.</li>
                  <li>Aapki poori WordPress website par 24/7 AI chatbot activate ho jayega!</li>
                </ol>
              )}

              {platform === 'shopify' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Shopify Admin me <strong>Online Store &gt; Themes</strong> par click karein.</li>
                  <li>Current theme ke <strong>Actions (...) &gt; Edit code</strong> chunein.</li>
                  <li><code>theme.liquid</code> file open karein aur <code>&lt;/body&gt;</code> tag se upar code paste karein.</li>
                  <li>Save karein!</li>
                </ol>
              )}

              {platform === 'webflow' && (
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Project Settings me jaakar <strong>Custom Code</strong> tab open karein.</li>
                  <li><strong>Footer Code</strong> box ke andar ye script paste karein.</li>
                  <li>Publish changes karein!</li>
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
