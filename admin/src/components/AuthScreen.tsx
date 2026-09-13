import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Fingerprint,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (email: string) => void;
}

// Passkeys are verified by Supabase Auth/WebAuthn. The authenticator keeps the
// private key on the device; this client never receives raw fingerprint/Face ID data.
const securityAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      experimental: {
        passkey: true,
      },
    },
  }
);

const ADMIN_ROLE = 'admin';

function readableAuthError(error: any): string {
  const message = String(error?.message || error || '').trim();
  const lower = message.toLowerCase();

  if (lower.includes('passkey_disabled')) {
    return 'Passkey security is not enabled in Supabase yet. Enable Authentication → Passkeys for the production project.';
  }

  if (lower.includes('not supported') || lower.includes('webauthn')) {
    return 'This browser or device does not support the required passkey security.';
  }

  if (lower.includes('cancel') || lower.includes('abort')) {
    return 'Biometric verification was cancelled. Try again.';
  }

  return message || 'Authentication failed. Please try again.';
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

  if (profileError) {
    throw new Error('Unable to verify admin access. Please try again.');
  }

  const role = String(profile?.role || '').trim().toLowerCase();
  const status = String(profile?.status || 'active').trim().toLowerCase();

  if (role !== ADMIN_ROLE || status !== 'active') {
    await client.auth.signOut();
    throw new Error('Access denied. Only an active admin account can enter the Director Control Center.');
  }

  return {
    id: userData.user.id,
    email: userData.user.email,
  };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'enroll' | 'biometric'>('login');
  const [enrolling, setEnrolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const finishLogin = async (client: typeof supabase) => {
    const admin = await verifyAdminUser(client);
    onLoginSuccess(admin.email);
  };

  const handlePasskeyLogin = async () => {
    if (!window.isSecureContext) {
      setErrorMsg('Biometric login requires HTTPS. Open the deployed StudentHubHelp Admin URL, not an insecure HTTP page.');
      return;
    }

    if (!('PublicKeyCredential' in window)) {
      setErrorMsg('Passkey / fingerprint / Face ID is not available in this browser.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg('Waiting for your device biometric security…');

    try {
      const { data, error } = await securityAuth.auth.signInWithPasskey();

      if (error) {
        throw error;
      }

      if (!data?.user?.email) {
        throw new Error('Passkey authentication returned no user account.');
      }

      await finishLogin(securityAuth);
    } catch (err: any) {
      try {
        await securityAuth.auth.signOut();
      } catch {
        // Ignore cleanup errors after a failed ceremony.
      }
      setInfoMsg(null);
      setErrorMsg(readableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data?.user?.id || !data.user.email) {
        throw new Error('Sign in did not return a valid admin account.');
      }

      // First validate that the password belongs to an active admin.
      await finishLogin(supabase);

      // NOTE: finishLogin above intentionally does not return to this function
      // until the account is verified. The existing dashboard callback can now
      // open the dashboard. Passkey enrollment is available from the biometric
      // security button below for the same authenticated admin session.
    } catch (err: any) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore cleanup errors.
      }
      setErrorMsg(readableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollPasskey = async () => {
    setEnrolling(true);
    setErrorMsg(null);
    setInfoMsg('Preparing your secure device credential…');

    try {
      const { data: sessionData, error: sessionError } = await securityAuth.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Your admin session is no longer active. Sign in with your password first.');
      }

      await verifyAdminUser(securityAuth);

      const { data, error } = await securityAuth.auth.registerPasskey();
      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error('Passkey registration did not return a credential.');
      }

      setInfoMsg('Secure biometric lock registered successfully. Your device can now use Face ID, fingerprint, Windows Hello, or its secure PIN.');
      setMode('login');
    } catch (err: any) {
      setInfoMsg(null);
      setErrorMsg(readableAuthError(err));
    } finally {
      setEnrolling(false);
    }
  };

  const openBiometric = () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setMode('biometric');
  };

  return (
    <div className="min-h-screen bg-[#050b1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-slate-800 p-8 relative shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-serif font-extrabold text-white tracking-wide">
            StudentHubHelp
          </h1>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold">
            Managing Director Control Center
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Protected by Supabase Auth and device-bound biometric security.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {mode === 'biometric' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-[#0d1838] p-5 text-center space-y-3">
              <Fingerprint className="w-12 h-12 mx-auto text-amber-400" />
              <h2 className="text-lg font-bold text-white">Device biometric lock</h2>
              <p className="text-xs leading-5 text-slate-400">
                Use the biometric or secure credential registered for StudentHubHelp. Depending on your device, this can be fingerprint, Face ID, Windows Hello, device PIN, or a security key.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {loading ? 'Verifying securely…' : 'Unlock with Face ID / Fingerprint'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800/60 disabled:opacity-60"
            >
              Back to password
            </button>
          </div>
        ) : mode === 'enroll' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center space-y-3">
              <KeyRound className="w-11 h-11 mx-auto text-amber-400" />
              <h2 className="text-lg font-bold text-white">Register this device</h2>
              <p className="text-xs leading-5 text-slate-400">
                Your device will create a cryptographic passkey. The private key stays with the device/authenticator; StudentHubHelp only uses the verified credential.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnrollPasskey}
              disabled={enrolling}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {enrolling ? 'Registering device…' : 'Register biometric lock'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              disabled={enrolling}
              className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800/60"
            >
              Back
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Director Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Director email"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Director Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your secure password"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>{loading ? 'Authenticating…' : 'Sign In as Director'}</span>
              </button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <div className="relative flex justify-center"><span className="bg-[#081026] px-3 text-[10px] uppercase tracking-widest text-slate-500">Secure access</span></div>
            </div>

            <button
              type="button"
              onClick={openBiometric}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 font-extrabold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Fingerprint className="w-4 h-4" />
              Use Face ID / Fingerprint
            </button>

            <button
              type="button"
              onClick={() => setMode('enroll')}
              className="w-full text-[11px] text-slate-500 hover:text-amber-300 transition-colors"
            >
              Register this device for biometric login
            </button>
          </>
        )}

        <p className="text-[10px] text-center text-slate-600 leading-4">
          Biometric authentication is performed by your device's secure authenticator. StudentHubHelp does not receive your raw fingerprint or Face ID data.
        </p>
      </div>
    </div>
  );
};
