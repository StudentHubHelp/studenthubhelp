import React, { useRef, useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Fingerprint,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (email: string) => void;
}

const securityAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    experimental: { passkey: true },
  },
});

const ADMIN_ROLE = 'admin';

function readableAuthError(error: any): string {
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();
  if (lower.includes('passkey_disabled')) {
    return 'Passkey login is currently disabled in Supabase. Password login is still available.';
  }
  if (lower.includes('not supported') || lower.includes('webauthn')) {
    return 'This browser or device does not support passkey / biometric login.';
  }
  if (lower.includes('cancel') || lower.includes('abort')) {
    return 'Biometric verification was cancelled. Try again.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) return 'Too many attempts. Please wait and try again.';
  if (lower.includes('invalid') || lower.includes('incorrect') || lower.includes('credentials')) return 'Email or password is incorrect.';
  return 'Authentication failed. Please try again.';
}

async function verifyAdminUser(client: typeof supabase) {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.id || !userData.user.email) {
    throw new Error('Unable to verify the signed-in account.');
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw new Error('Unable to verify admin access. Please try again.');

  const role = String(profile?.role || '').trim().toLowerCase();
  const status = String(profile?.status || 'active').trim().toLowerCase();
  if (role !== ADMIN_ROLE || status !== 'active') {
    await client.auth.signOut();
    throw new Error('Access denied. Only an active admin account can enter the Director Control Center.');
  }

  return { id: userData.user.id, email: userData.user.email };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [mfaMode, setMfaMode] = useState<'none' | 'enroll' | 'challenge'>('none');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const authClientRef = useRef<typeof supabase>(supabase);

  const finishAdminLogin = async (client: typeof supabase, emailAddress?: string) => {
    const admin = await verifyAdminUser(client);
    setMfaMode('none');
    setMfaCode('');
    setMfaFactorId('');
    setMfaQr('');
    setMfaSecret('');
    setInfoMsg('Authentication successful. Opening the Director Control Center…');
    onLoginSuccess(emailAddress || admin.email);
  };

  const completeLogin = async (client: typeof supabase, emailAddress?: string) => {
    const admin = await verifyAdminUser(client);

    const { data: aal, error: aalError } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw new Error('Unable to verify the administrator security level.');

    const factors = await client.auth.mfa.listFactors();
    if (factors.error) throw new Error('Unable to verify administrator MFA status.');

    const verifiedTotp = (factors.data?.totp || []).find((factor: any) => factor.status === 'verified');

    if (verifiedTotp) {
      if (aal?.currentLevel === 'aal2') {
        await finishAdminLogin(client, emailAddress || admin.email);
        return;
      }

      const challenge = await client.auth.mfa.challenge({ factorId: verifiedTotp.id });
      if (challenge.error) throw new Error('Unable to start MFA verification.');
      setMfaFactorId(verifiedTotp.id);
      setMfaMode('challenge');
      setMfaCode('');
      setInfoMsg('Enter the 6-digit code from your authenticator app.');
      return;
    }

    const enrolled = await client.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'StudentHubHelp Director',
    });
    if (enrolled.error) throw new Error('Unable to start MFA setup. Please try again.');
    setMfaFactorId(enrolled.data.id);
    setMfaQr(enrolled.data.totp.qr_code);
    setMfaSecret(enrolled.data.totp.secret);
    setMfaMode('enroll');
    setMfaCode('');
    setInfoMsg('MFA is required for the Director account. Scan the QR code and enter the 6-digit code.');
  };

  const verifyMfa = async () => {
    if (!mfaFactorId || !/^\\d{6}$/.test(mfaCode)) {
      setErrorMsg('Enter the 6-digit authenticator code.');
      return;
    }

    setMfaBusy(true);
    setErrorMsg(null);
    try {
      const client = authClientRef.current;
      const challenge = await client.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw new Error('Unable to start MFA verification.');

      const verified = await client.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaCode,
      });
      if (verified.error) throw new Error('The authenticator code is incorrect or expired.');

      await client.auth.refreshSession();
      await finishAdminLogin(client);
    } catch (err: any) {
      setErrorMsg(err?.message || 'MFA verification failed. Please try again.');
    } finally {
      setMfaBusy(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    authClientRef.current = supabase;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!data?.session || !data.user?.email) throw new Error('Sign in did not return a valid admin session.');

      // PASSWORD IS ONE COMPLETE LOGIN METHOD.
      // Do not force a second biometric/passkey step after password login.
      await completeLogin(supabase, data.user.email);
    } catch (err: any) {
      try { await supabase.auth.signOut(); } catch { /* cleanup only */ }
      setErrorMsg(readableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!window.isSecureContext) {
      setErrorMsg('Biometric/passkey login requires HTTPS.');
      return;
    }
    if (!('PublicKeyCredential' in window)) {
      setErrorMsg('Passkey / fingerprint / Face ID is not available in this browser.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    authClientRef.current = securityAuth;
    setInfoMsg('Waiting for Face ID, fingerprint, Windows Hello, device PIN, or your registered passkey…');
    try {
      const { data, error } = await securityAuth.auth.signInWithPasskey();
      if (error) throw error;
      if (!data?.user?.email) throw new Error('Passkey authentication returned no user account.');
      await completeLogin(securityAuth, data.user.email);
    } catch (err: any) {
      try { await securityAuth.auth.signOut(); } catch { /* cleanup only */ }
      setInfoMsg(null);
      setErrorMsg(readableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (mfaMode !== 'none') {
    return (
      <div className="min-h-screen bg-[#050b1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-slate-800 p-8 relative shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-8 h-8 text-slate-950" />
            </div>
            <h1 className="text-2xl font-serif font-extrabold text-white">Director MFA</h1>
            <p className="text-xs text-slate-400">
              {mfaMode === 'enroll'
                ? 'Set up your authenticator app. MFA is required before entering the Director Control Center.'
                : 'Enter the code from your authenticator app to continue.'}
            </p>
          </div>
          {errorMsg && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex gap-2 items-start"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}
          {infoMsg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{infoMsg}</span></div>}
          {mfaMode === 'enroll' && (
            <div className="space-y-4">
              {mfaQr && <div className="bg-white rounded-2xl p-4 flex justify-center"><img src={mfaQr} alt="Authenticator QR code" className="w-56 h-56" /></div>}
              <p className="text-[10px] text-slate-500 break-all">Manual setup key: {mfaSecret}</p>
            </div>
          )}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
            placeholder="6-digit authenticator code"
            className="w-full px-4 py-3 bg-[#0d1838] border border-slate-700 rounded-xl text-sm text-white tracking-[0.35em] text-center focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={verifyMfa}
            disabled={mfaBusy || mfaCode.length !== 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {mfaMode === 'enroll' ? 'Enable MFA & Continue' : 'Verify MFA & Continue'}
          </button>
          <button
            type="button"
            onClick={async () => { try { await securityAuth.auth.signOut(); await supabase.auth.signOut(); } finally { setMfaMode('none'); setMfaCode(''); setInfoMsg(null); } }}
            className="w-full text-xs text-slate-500 hover:text-white"
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-slate-800 p-8 relative shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-serif font-extrabold text-white tracking-wide">StudentHubHelp</h1>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">Managing Director Control Center</p>
          <p className="text-xs text-slate-400 mt-1">Choose one secure login method: Director password OR device-bound passkey.</p>
        </div>

        {errorMsg && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex gap-2 items-start"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}
        {infoMsg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{infoMsg}</span></div>}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Director Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Director email" autoComplete="username" className="w-full pl-9 pr-3 py-2.5 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Director Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your secure password" autoComplete="current-password" className="w-full pl-9 pr-3 py-2.5 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Signing in securely…' : 'Sign In with Password'}
          </button>
        </form>

        <div className="relative py-1"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div><div className="relative flex justify-center"><span className="bg-[#081026] px-3 text-[10px] uppercase tracking-widest text-slate-500">OR</span></div></div>

        <button type="button" onClick={handlePasskeyLogin} disabled={loading} className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
          {loading ? 'Verifying…' : 'Sign In with Face ID / Fingerprint'}
        </button>

        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-[10px] leading-4 text-slate-500">
          Passkey login uses WebAuthn. Your fingerprint or Face ID stays inside the device authenticator; StudentHubHelp receives only the cryptographic authentication result.
        </div>
      </div>
    </div>
  );
};
