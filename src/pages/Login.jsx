import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('[AEGIS Login Error]', err);
      let msg = 'Invalid credentials.';
      if (err) {
        if (typeof err === 'string') {
          msg = err;
        } else if (err.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err.error_description && typeof err.error_description === 'string') {
          msg = err.error_description;
        } else {
          try {
            const str = JSON.stringify(err);
            msg = str === '{}' ? (err.toString ? err.toString() : str) : str;
          } catch {
            msg = 'An unknown error occurred.';
          }
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hud-bg flex items-center justify-center p-4 font-sans hud-scanline-effect">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-hud-accent opacity-5 rounded-full filter blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 opacity-5 rounded-full filter blur-[100px]"></div>

      <div className="w-full max-w-md hud-glass p-8 rounded-2xl relative border border-hud-border shadow-2xl">
        {/* Futuristic Corner Ornaments */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-hud-accent rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-hud-accent rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-hud-accent rounded-br-lg"></div>

        {/* Title / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-hud-accent-dim rounded-xl flex items-center justify-center border border-hud-border mb-3 shadow-lg shadow-hud-accent/10">
            <Shield className="w-6 h-6 text-hud-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-hud-text tracking-wider uppercase hud-glow-text m-0">AEGIS</h1>
          <p className="text-sm text-hud-muted mt-1 font-mono tracking-widest">Personal Command Center</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono flex items-center">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-ping"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-mono text-hud-muted">System Username (Email)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="operator@aegis.secure"
              className="w-full bg-slate-950/50 border border-hud-border focus:border-hud-accent rounded-lg px-4 py-3 text-hud-text font-mono text-sm placeholder-hud-muted/50 outline-none transition-all duration-300 shadow-inner focus:shadow-hud-accent/10"
            />
          </div>

          {/* Password field */}
          <div className="space-y-2 relative">
            <div className="flex justify-between items-center">
              <label className="block text-xs uppercase tracking-widest font-mono text-hud-muted">Access Key</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-950/50 border border-hud-border focus:border-hud-accent rounded-lg pl-4 pr-12 py-3 text-hud-text font-mono text-sm placeholder-hud-muted/50 outline-none transition-all duration-300 shadow-inner focus:shadow-hud-accent/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-hud-muted hover:text-hud-accent transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden group bg-gradient-to-r from-hud-accent/80 to-purple-600/80 hover:from-hud-accent hover:to-purple-500 text-hud-bg font-extrabold uppercase py-3.5 rounded-lg transition-all duration-300 shadow-lg shadow-hud-accent/10 hover:shadow-hud-accent/30 font-mono tracking-widest text-sm flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-hud-bg border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Initiate Session'
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-hud-border/40 pt-6">
          <p className="text-xs text-hud-muted font-mono">
            New operator?{' '}
            <Link to="/signup" className="text-hud-accent hover:text-hud-accent/80 transition-colors ml-1 font-semibold underline decoration-hud-accent/40 hover:decoration-hud-accent">
              Request Authorization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
