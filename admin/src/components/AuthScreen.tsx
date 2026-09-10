import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMsg(error.message || 'Sign in failed.');
          return;
        }

        if (data?.user?.id && data?.user?.email) {
          // IMPORTANT: Only profiles with role = "admin" may enter the dashboard.
          // Any valid student/owner login is immediately signed out.
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, status')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            await supabase.auth.signOut();
            setErrorMsg('Unable to verify admin access. Please try again.');
            return;
          }

          const role = String(profile?.role || '').trim().toLowerCase();
          const status = String(profile?.status || 'active').trim().toLowerCase();

          if (role !== 'admin' || status !== 'active') {
            await supabase.auth.signOut();
            setErrorMsg('Access denied. Only active admin accounts can sign in here.');
            return;
          }

          onLoginSuccess(data.user.email);
          return;
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };
return (
    <div className="min-h-screen bg-[#050b1a] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow & aesthetic lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-[#081026] border border-slate-800 p-8 relative shadow-2xl space-y-6">
        {/* Brand Header */}
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
            Sign in to access real-time user management, analytics graphs, and directory listings.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Director Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="satpalswami22742@gmail.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password or use 1-click access"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0d1838] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Director'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
