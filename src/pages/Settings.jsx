import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  Download, 
  Trash2, 
  User,
  Check,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { logout, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Update States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Delete safety checks
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Access Delegation States
  const [delegates, setDelegates] = useState([]);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateRole, setDelegateRole] = useState('Viewer');
  const [delSaving, setDelSaving] = useState(false);
  const [delSuccess, setDelSuccess] = useState('');
  const [delError, setDelError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchDelegates();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile');
      setProfile(res.data);
      setFullName(res.data.full_name || '');
    } catch (err) {
      console.error('Failed to load profile settings:', err);
      setErrorMsg('Failed to sync profile coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDelegates = async () => {
    try {
      const res = await api.get('/profile/delegates');
      setDelegates(res.data.delegates || []);
    } catch (err) {
      console.error('Failed to sync delegates:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSaving(true);

    try {
      const res = await api.put('/profile', { full_name: fullName });
      setProfile(res.data);
      setSuccessMsg('Profile coordinates updated successfully.');
    } catch (err) {
      console.error('Failed to update profile settings:', err);
      setErrorMsg('Profile update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSuccess(false);
    setPwError('');
    
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }

    setPwSaving(true);
    try {
      await updatePassword(newPassword);
      setPwSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change protocol failed:', err);
      setPwError(err.message || 'Password update failed.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleAddDelegate = async (e) => {
    e.preventDefault();
    setDelSuccess('');
    setDelError('');
    if (!delegateEmail.trim()) return;

    setDelSaving(true);
    try {
      const res = await api.post('/profile/delegates', {
        email: delegateEmail.trim().toLowerCase(),
        role: delegateRole
      });
      setDelegates(prev => [...prev, res.data]);
      setDelegateEmail('');
      setDelegateRole('Viewer');
      setDelSuccess('Access granted to operator.');
    } catch (err) {
      console.error('Failed to add delegate:', err);
      setDelError(err.response?.data?.error || 'Delegation protocol failed.');
    } finally {
      setDelSaving(false);
    }
  };

  const handleRevokeDelegate = async (id) => {
    if (!window.confirm('Revoke access for this delegate? They will instantly lose access to your workspace.')) return;
    try {
      await api.delete(`/profile/delegates/${id}`);
      setDelegates(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to revoke delegate:', err);
      alert('Revocation failed.');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/profile/export', { responseType: 'blob' });
      // Create download anchor link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'aegis_data_export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export data logs:', err);
      alert('Data export protocol failed.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'TERMINATE') return;
    try {
      const res = await api.delete('/profile');
      alert(res.data.message);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to terminate account:', err);
      setErrorMsg('Wipe protocol failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center font-mono space-y-3">
          <div className="w-10 h-10 border-2 border-hud-border rounded-full border-t-hud-accent animate-spin mx-auto"></div>
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest block">Accessing terminal preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Settings Console</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">OPERATOR PREFERENCES & SECURITIES</p>
        </div>
        <SettingsIcon className="w-6 h-6 text-hud-accent animate-spin" style={{ animationDuration: '8s' }} />
      </div>

      {successMsg && (
        <div className="p-4 rounded-lg bg-green-950/40 border border-green-500/30 text-green-400 text-sm font-mono flex items-center">
          <Check className="w-4 h-4 mr-2" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: General Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User profile parameters */}
          <div className="hud-glass p-6 rounded-2xl border border-hud-border/60 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text border-b border-hud-border/30 pb-3 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-hud-accent" /> Profile Identity
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email (Read Only) */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Username (Email)</label>
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full bg-slate-950/60 border border-hud-border/30 rounded-lg px-3 py-2 text-hud-muted text-sm font-mono cursor-not-allowed outline-none"
                  />
                </div>

                {/* Role (Read Only) */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Clearance Status</label>
                  <input
                    type="text"
                    value={profile?.role || 'Owner'}
                    disabled
                    className="w-full bg-slate-950/60 border border-hud-border/30 rounded-lg px-3 py-2 text-hud-accent text-sm font-mono uppercase tracking-wider cursor-not-allowed outline-none font-bold"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Full Name / Operator Alias</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-slate-950/40 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors shadow-lg shadow-hud-accent/15"
                >
                  {saving ? 'Updating...' : 'Update Coordinates'}
                </button>
              </div>
            </form>
          </div>

          {/* Security / Password update card */}
          <div className="hud-glass p-6 rounded-2xl border border-hud-border/60 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text border-b border-hud-border/30 pb-3 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-hud-accent" /> Security Protocol (Change Password)
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/40 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/40 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                  />
                </div>
              </div>

              {pwSuccess && (
                <p className="text-xs text-green-400 font-mono flex items-center gap-1.5 mt-2">
                  <Check className="w-3.5 h-3.5 text-green-400" /> Password update complete.
                </p>
              )}

              {pwError && (
                <p className="text-xs text-red-400 font-mono mt-2">
                  [ERROR] {pwError}
                </p>
              )}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors shadow-lg shadow-hud-accent/15"
                >
                  {pwSaving ? 'Updating...' : 'Commit New Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Access Delegation Protocols */}
          <div className="hud-glass p-6 rounded-2xl border border-hud-border/60 shadow-2xl relative space-y-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text border-b border-hud-border/30 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-hud-accent" /> Access Delegation Protocols
            </h3>
            
            <p className="text-xs text-hud-muted font-mono leading-relaxed">
              Grant other registered operators access to view or modify this workspace. Authorized delegates can switch to your workspace from their sidebar.
            </p>

            <form onSubmit={handleAddDelegate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Delegate Email */}
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Delegate Email Address</label>
                  <input
                    type="email"
                    value={delegateEmail}
                    onChange={(e) => setDelegateEmail(e.target.value)}
                    required
                    placeholder="operator@email.com"
                    className="w-full bg-slate-950/40 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                  />
                </div>

                {/* Clearance level */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Clearance Level</label>
                  <select
                    value={delegateRole}
                    onChange={(e) => setDelegateRole(e.target.value)}
                    className="w-full bg-slate-950/40 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                  >
                    <option value="Viewer">Viewer (Read Only)</option>
                    <option value="Assistant">Assistant (Schedule/Edit)</option>
                    <option value="Manager">Manager (Full CRUD)</option>
                  </select>
                </div>
              </div>

              {delSuccess && (
                <p className="text-xs text-green-400 font-mono flex items-center gap-1.5 mt-2">
                  <Check className="w-3.5 h-3.5 text-green-400" /> {delSuccess}
                </p>
              )}

              {delError && (
                <p className="text-xs text-red-400 font-mono mt-2">
                  [ERROR] {delError}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={delSaving}
                  className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors shadow-lg shadow-hud-accent/15"
                >
                  {delSaving ? 'Granting...' : 'Grant Access'}
                </button>
              </div>
            </form>

            {/* Active Delegates List */}
            <div className="pt-4 border-t border-hud-border/30">
              <h4 className="font-mono text-xs font-bold uppercase text-hud-text tracking-wider mb-3">Active Workspace Delegates</h4>
              {delegates.length === 0 ? (
                <p className="text-xs text-hud-muted font-mono italic">No delegates currently authorized.</p>
              ) : (
                <div className="space-y-2">
                  {delegates.map((d) => (
                    <div key={d.id} className="flex justify-between items-center bg-slate-950/30 border border-hud-border/40 p-3 rounded-xl font-mono text-xs">
                      <div>
                        <p className="text-hud-text font-semibold">{d.member?.full_name || 'N/A'}</p>
                        <p className="text-[10px] text-hud-muted">{d.member?.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[9px] uppercase border border-hud-border/50 bg-slate-900 text-hud-accent">
                          {d.access_role}
                        </span>
                        <button
                          onClick={() => handleRevokeDelegate(d.id)}
                          className="text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Portability exports */}
          <div className="hud-glass p-6 rounded-2xl border border-hud-border/60 shadow-2xl relative space-y-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text border-b border-hud-border/30 pb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-green-400" /> Data Portability Protocols
            </h3>
            <p className="text-xs text-hud-muted font-mono leading-relaxed">
              Export all files, events, tasks, goals, projects, and security profile details saved on this personal operating system in a raw JSON container.
            </p>
            <button
              onClick={handleExportData}
              className="bg-slate-900 border border-hud-border/60 hover:border-green-400/60 text-hud-muted hover:text-green-400 font-bold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" /> Trigger Export JSON
            </button>
          </div>

        </div>

        {/* Right Side: Sensitive Actions (Destructive) */}
        <div className="space-y-6">
          
          {/* Deletion module */}
          <div className="hud-glass p-6 rounded-2xl border border-red-500/25 bg-red-950/5 shadow-2xl relative space-y-4">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500 rounded-tl-lg"></div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-red-400 border-b border-red-500/20 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" /> Security Override / Wipe
            </h3>
            
            <p className="text-xs text-red-200/80 font-mono leading-relaxed">
              This triggers a complete database purge. All active logs, task ledgers, objectives, schedule events, and security identities will be deleted.
            </p>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-red-400 font-bold uppercase font-mono text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" /> Initiate Wipe Sequence
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] uppercase font-mono text-red-400 tracking-wider">
                  Type <strong className="text-red-200 underline">TERMINATE</strong> to confirm deletion:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="TERMINATE"
                  className="w-full bg-slate-950/60 border border-red-500/30 focus:border-red-500 rounded-lg px-3 py-2 text-red-400 text-sm font-mono outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteInput('');
                    }}
                    className="flex-1 bg-slate-900 border border-hud-border/60 text-hud-muted font-mono text-xs py-2 rounded-lg cursor-pointer"
                  >
                    Abort
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'TERMINATE'}
                    className={`flex-1 font-mono text-xs py-2 rounded-lg text-white font-bold transition-all cursor-pointer ${
                      deleteInput === 'TERMINATE' ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20' : 'bg-red-950/40 text-red-500/40 cursor-not-allowed border border-red-500/20'
                    }`}
                  >
                    Confirm Wipe
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
