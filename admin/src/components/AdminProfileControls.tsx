import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, UserCircle, Fingerprint, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const securityAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, experimental: { passkey: true } },
});

export const AdminProfileControls: React.FC = () => {
  const [profileId, setProfileId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const loadAdminProfile = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Admin session not found.');
      const user = authData.user;
      setProfileId(user.id);
      setProfileEmail(user.email || '');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, address, email, role, status')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      setProfileName(profile?.full_name || '');
      setProfilePhone(profile?.phone || '');
      setProfileAddress(profile?.address || '');
      if (profile?.email) setProfileEmail(profile.email);

      const { data: keys, error: keyError } = await securityAuth.auth.passkey.list();
      if (!keyError) setPasskeys(keys || []);
      else if (!String(keyError.message || '').toLowerCase().includes('disabled')) throw keyError;
    } catch (e: any) {
      setProfileMessage(e?.message || 'Unable to load Admin Profile.');
    }
  };

  useEffect(() => { void loadAdminProfile(); }, []);

  const saveProfile = async () => {
    if (!profileId) return;
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: profileName.trim() || null,
        phone: profilePhone.trim() || null,
        address: profileAddress.trim() || null,
        email: profileEmail.trim() || null,
      }).eq('id', profileId);
      if (error) throw error;
      setProfileMessage('Admin Profile details saved to Supabase.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Unable to save Admin Profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const registerDevice = async () => {
    setPasskeyLoading(true);
    setProfileMessage(null);
    try {
      if (!window.isSecureContext || !('PublicKeyCredential' in window)) {
        throw new Error('Passkey registration requires a supported HTTPS browser/device.');
      }
      const { data: sessionData, error: sessionError } = await securityAuth.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error('Admin session is not available.');
      const { data, error } = await securityAuth.auth.registerPasskey();
      if (error) throw error;
      if (!data?.id) throw new Error('No passkey credential was returned.');
      const { data: keys } = await securityAuth.auth.passkey.list();
      setPasskeys(keys || []);
      await supabase.from('admin_profiles').upsert({ id: profileId, email: profileEmail, passkey_registered: true }, { onConflict: 'id' });
      setProfileMessage('Device biometric/passkey registered successfully. The private key remains in your device authenticator.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Passkey registration failed.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const renamePasskey = async (key: any) => {
    const name = window.prompt('Passkey name:', key.friendly_name || 'My device');
    if (!name?.trim()) return;
    setPasskeyLoading(true);
    try {
      const { error } = await securityAuth.auth.passkey.update({ passkeyId: key.id, friendlyName: name.trim() });
      if (error) throw error;
      const { data } = await securityAuth.auth.passkey.list();
      setPasskeys(data || []);
      setProfileMessage('Passkey name updated.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Unable to rename passkey.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const removePasskey = async (key: any) => {
    if (!window.confirm('Remove this device passkey? You can register it again later from Admin Profile.')) return;
    setPasskeyLoading(true);
    try {
      const { error } = await securityAuth.auth.passkey.delete({ passkeyId: key.id });
      if (error) throw error;
      const { data } = await securityAuth.auth.passkey.list();
      setPasskeys(data || []);
      await supabase.from('admin_profiles').upsert({ id: profileId, email: profileEmail, passkey_registered: (data || []).length > 0 }, { onConflict: 'id' });
      setProfileMessage('Passkey removed from this admin account.');
    } catch (e: any) {
      setProfileMessage(e?.message || 'Unable to remove passkey.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-[#081026] border border-amber-500/30 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><UserCircle className="w-6 h-6 text-amber-400" /><h2 className="text-2xl font-serif font-extrabold text-white">Admin Profile</h2></div>
            <p className="text-xs text-slate-400 mt-1">Director account details and complete device biometric / passkey control.</p>
          </div>
          <button onClick={() => void loadAdminProfile()} className="px-3 py-2 rounded-xl bg-[#0d1838] border border-slate-700 text-slate-200 text-xs font-bold"><RefreshCw className="w-3.5 h-3.5 inline mr-1" />Refresh</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block"><span className="text-[10px] font-bold text-slate-400">Admin Name</span><input value={profileName} onChange={e => setProfileName(e.target.value)} className="mt-1.5 w-full bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white" placeholder="Director name" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-400">Email</span><input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="mt-1.5 w-full bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white" placeholder="Admin email" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-400">Phone</span><input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className="mt-1.5 w-full bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white" placeholder="Phone" /></label>
          <label className="block"><span className="text-[10px] font-bold text-slate-400">Address</span><input value={profileAddress} onChange={e => setProfileAddress(e.target.value)} className="mt-1.5 w-full bg-[#0d1838] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white" placeholder="Address" /></label>
        </div>
        <button onClick={() => void saveProfile()} disabled={profileSaving} className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold"><Save className="w-3.5 h-3.5 inline mr-1" />{profileSaving ? 'Saving…' : 'Save Admin Profile'}</button>

        <div className="rounded-2xl border border-slate-800 bg-[#0d1838] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><Fingerprint className="w-5 h-5 text-amber-400" /><h3 className="font-extrabold text-white">Face ID / Fingerprint / Passkey</h3></div><p className="text-[10px] text-slate-400 mt-1">One optional login method. The website never stores raw fingerprint or Face ID data.</p></div>
            <button onClick={() => void registerDevice()} disabled={passkeyLoading} className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />{passkeyLoading ? 'Registering…' : 'Register device'}</button>
          </div>
          {passkeys.length ? <div className="space-y-2">{passkeys.map((key) => <div key={key.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-700 bg-[#081026]"><div><div className="text-xs font-bold text-white">{key.friendly_name || 'Registered device'}</div><div className="text-[10px] text-slate-500">Registered {key.created_at ? new Date(key.created_at).toLocaleString('en-IN') : '—'}{key.last_used_at ? ` • Last used ${new Date(key.last_used_at).toLocaleString('en-IN')}` : ''}</div></div><div className="flex gap-2"><button onClick={() => void renamePasskey(key)} disabled={passkeyLoading} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-bold">Rename</button><button onClick={() => void removePasskey(key)} disabled={passkeyLoading} className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-bold"><Trash2 className="w-3 h-3 inline mr-1" />Remove</button></div></div>)}</div> : <div className="p-4 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">No device passkey registered for this admin account. Register one here when Passkeys are enabled in Supabase.</div>}
          {profileMessage && <div className="text-xs text-slate-300 bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{profileMessage}</div>}
        </div>
      </section>
    </div>
  );
};
