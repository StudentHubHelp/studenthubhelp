/**
 * StudentHubHelp AI Chatbot - 1-Click Embeddable Widget
 * Uses the secure Supabase Edge Function backend.
 */
(function () {
  if (window.StudentHubHelpChatbotLoaded) return;
  window.StudentHubHelpChatbotLoaded = true;

  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const defaultApiUrl = 'https://idurlccrarznnnqixxsd.supabase.co/functions/v1/studenthubhelp-chat';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ucWl4eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA';
  const apiUrl = currentScript?.getAttribute('data-api-url') || defaultApiUrl;
  const chatEndpoint = apiUrl.includes('/functions/v1/') ? apiUrl : `${apiUrl}/api/chat`;
  const primaryColor = currentScript?.getAttribute('data-color') || '#071a33';
  const accentColor = currentScript?.getAttribute('data-accent') || '#d7a63d';
  const position = currentScript?.getAttribute('data-position') || 'right';

  const container = document.createElement('div');
  container.id = 'shh-chatbot-container';
  container.style.cssText = `position:fixed;bottom:24px;${position === 'left' ? 'left:24px;' : 'right:24px;'}z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;

  const launcher = document.createElement('button');
  launcher.id = 'shh-chatbot-launcher';
  launcher.setAttribute('aria-label', 'Open StudentHubHelp AI Assistant');
  launcher.style.cssText = `width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${primaryColor},#0f2c52);border:2px solid ${accentColor};box-shadow:0 10px 25px rgba(7,26,51,.35);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:transform .25s ease,box-shadow .25s ease;outline:none;`;
  launcher.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#22c55e;border-radius:50%;border:2px solid white;"></span>`;

  const chatWindow = document.createElement('div');
  chatWindow.id = 'shh-chatbot-window';
  chatWindow.style.cssText = `display:none;width:380px;height:600px;max-width:calc(100vw - 32px);max-height:calc(100vh - 100px);background:#fff;border-radius:20px;box-shadow:0 20px 50px rgba(7,26,51,.25);border:1px solid rgba(7,26,51,.12);flex-direction:column;overflow:hidden;margin-bottom:16px;animation:shhSlideUp .3s cubic-bezier(.16,1,.3,1);`;

  const header = document.createElement('div');
  header.style.cssText = `background:linear-gradient(135deg,${primaryColor},#0b2547);color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${accentColor};`;
  header.innerHTML = `<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:10px;background:${accentColor};display:flex;align-items:center;justify-content:center;color:${primaryColor};font-weight:900;font-size:14px;">SH</div><div><div style="font-weight:800;font-size:15px;letter-spacing:-.2px;">StudentHubHelp AI</div><div style="font-size:11px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span> 24/7 Live Student Support</div></div></div><button id="shh-close-btn" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;padding:4px;">&times;</button>`;

  const messagesArea = document.createElement('div');
  messagesArea.id = 'shh-messages';
  messagesArea.style.cssText = `flex:1;overflow-y:auto;padding:16px;background:#f8fafc;display:flex;flex-direction:column;gap:12px;`;

  const inputArea = document.createElement('div');
  inputArea.style.cssText = `padding:12px 16px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center;`;
  inputArea.innerHTML = `<input type="text" id="shh-input" placeholder="Hindi, English ya Hinglish me poochein..." style="flex:1;border:1px solid #cbd5e1;border-radius:12px;padding:10px 14px;font-size:13.5px;outline:none;font-family:inherit;" /><button id="shh-send-btn" style="background:${accentColor};color:${primaryColor};border:none;border-radius:12px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>`;

  chatWindow.appendChild(header);
  chatWindow.appendChild(messagesArea);
  chatWindow.appendChild(inputArea);
  container.appendChild(chatWindow);
  container.appendChild(launcher);
  document.body.appendChild(container);

  const styleTag = document.createElement('style');
  styleTag.innerHTML = '@keyframes shhSlideUp{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}';
  document.head.appendChild(styleTag);

  let history = [];

  function addMessage(text, isBot = false, followUps = []) {
    const msg = document.createElement('div');
    msg.style.cssText = `align-self:${isBot ? 'flex-start' : 'flex-end'};background:${isBot ? '#fff' : primaryColor};color:${isBot ? '#1e293b' : '#fff'};border:1px solid ${isBot ? '#e2e8f0' : 'transparent'};border-radius:14px;padding:10px 14px;font-size:13px;line-height:1.55;max-width:85%;box-shadow:0 2px 6px rgba(0,0,0,.04);white-space:pre-wrap;`;
    msg.textContent = text;
    messagesArea.appendChild(msg);
    if (followUps && followUps.length) {
      const chipsContainer = document.createElement('div');
      chipsContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
      followUps.forEach(chip => {
        const chipBtn = document.createElement('button');
        chipBtn.textContent = chip;
        chipBtn.style.cssText = 'background:#f1f5f9;border:1px solid #cbd5e1;border-radius:999px;padding:5px 10px;font-size:11px;color:#334155;cursor:pointer;';
        chipBtn.onclick = () => { document.getElementById('shh-input').value = chip; sendMessage(); };
        chipsContainer.appendChild(chipBtn);
      });
      messagesArea.appendChild(chipsContainer);
    }
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  addMessage('Namaste! Main StudentHubHelp ka Smart Assistant hoon. Sikar, Kota, Delhi me Hostel, Tiffin ya Library chahiye?', true, [
    'Piprali Road par Hostel dikhao',
    'Monthly Tiffin rate kya hai?',
    'Director contact number'
  ]);

  async function sendMessage() {
    const input = document.getElementById('shh-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage(text, false);
    history.push({ role: 'user', text });

    const typingIndicator = document.createElement('div');
    typingIndicator.textContent = 'Typing...';
    typingIndicator.style.cssText = 'color:#64748b;font-size:12px;margin-left:8px;font-style:italic;';
    messagesArea.appendChild(typingIndicator);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    try {
      const res = await fetch(chatEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ message: text, history })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Chat request failed');
      typingIndicator.remove();
      addMessage(data.reply || 'Thank you for your message.', true, data.suggestedFollowUps);
      history.push({ role: 'model', text: data.reply || '' });
    } catch (err) {
      typingIndicator.remove();
      addMessage('AI service is temporarily unavailable. Please try again in a moment.', true);
    }
  }

  launcher.addEventListener('click', () => {
    const isOpen = chatWindow.style.display === 'flex';
    chatWindow.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) document.getElementById('shh-input').focus();
  });
  document.getElementById('shh-close-btn').addEventListener('click', () => { chatWindow.style.display = 'none'; });
  document.getElementById('shh-send-btn').addEventListener('click', sendMessage);
  document.getElementById('shh-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
})();