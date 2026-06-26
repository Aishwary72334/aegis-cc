import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Shield, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  Target, 
  FileText, 
  FolderGit2, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Cpu,
  Radio,
  Server
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(localStorage.getItem('activeWorkspaceId') || user?.id || '');

  useEffect(() => {
    if (user) {
      api.get('/profile/delegates')
        .then((res) => {
          setWorkspaces(res.data.workspaces || []);
        })
        .catch((err) => {
          console.error('Failed to sync workspaces:', err);
        });
    }
  }, [user]);

  const handleWorkspaceChange = (e) => {
    const newId = e.target.value;
    if (newId === user?.id) {
      localStorage.removeItem('activeWorkspaceId');
    } else {
      localStorage.setItem('activeWorkspaceId', newId);
    }
    setActiveWorkspaceId(newId);
    window.location.reload();
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('activeWorkspaceId');
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Notes', path: '/notes', icon: FileText },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-hud-bg text-hud-text flex font-sans overflow-hidden">
      {/* Background HUD Scanlines & ambient glows */}
      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none hud-scanline-effect opacity-30 z-0"></div>

      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/80 backdrop-blur-xl border-r border-hud-border transition-transform duration-300 md:translate-x-0 md:static md:flex md:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-6 border-b border-hud-border justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-hud-accent animate-pulse" />
            <span className="font-mono tracking-widest text-lg font-bold text-hud-text">AEGIS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-hud-muted hover:text-hud-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info / Clearance level */}
        <div className="p-4 border-b border-hud-border bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-hud-accent-dim border border-hud-border flex items-center justify-center font-mono text-hud-accent text-sm font-semibold">
              OP
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-hud-muted font-mono tracking-wider truncate uppercase">{user?.email}</p>
              {activeWorkspaceId !== user?.id ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 font-mono uppercase bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                  Shared View
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-hud-accent font-mono uppercase bg-hud-accent-dim px-2 py-0.5 rounded border border-hud-border/40 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-hud-accent animate-ping"></span>
                  Secure Session
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        {workspaces.length > 0 && (
          <div className="px-4 py-3 border-b border-hud-border bg-slate-950/40">
            <label className="block text-[9px] uppercase font-mono text-hud-muted tracking-widest mb-1.5">
              Active Workspace
            </label>
            <select
              value={activeWorkspaceId}
              onChange={handleWorkspaceChange}
              className="w-full bg-slate-950/80 border border-hud-border/60 hover:border-hud-accent/60 focus:border-hud-accent rounded px-2.5 py-1.5 text-hud-text font-mono text-xs cursor-pointer outline-none transition-colors"
            >
              <option value={user?.id}>My Workspace</option>
              {workspaces.map((ws) => (
                <option key={ws.owner_id} value={ws.owner_id}>
                  {ws.owner?.full_name || ws.owner?.email} ({ws.access_role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-mono transition-all duration-300 border ${
                    isActive
                      ? 'bg-hud-accent-dim border-hud-accent text-hud-accent font-semibold shadow-[0_0_10px_rgba(0,242,255,0.05)]'
                      : 'border-transparent text-hud-muted hover:text-hud-text hover:bg-slate-900/50 hover:border-hud-border/50'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* System Telemetry (Tony Stark style) */}
        <div className="p-4 border-t border-hud-border bg-slate-950/30 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-hud-muted">
            <div className="flex items-center gap-1"><Cpu className="w-3 h-3 text-hud-accent" /> ENGINE</div>
            <span className="text-hud-accent">SECURE</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-hud-muted">
            <div className="flex items-center gap-1"><Radio className="w-3 h-3 text-purple-400" /> SYS LATENCY</div>
            <span className="text-purple-400">0.02ms</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-hud-muted">
            <div className="flex items-center gap-1"><Server className="w-3 h-3 text-green-400" /> SUPABASE</div>
            <span className="text-green-400">CONNECTED</span>
          </div>
        </div>

        {/* Logout Area */}
        <div className="p-4 border-t border-hud-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-950/60 border border-red-500/25 hover:border-red-500/50 text-red-400 py-2.5 rounded-lg text-sm font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Terminate
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header for Mobile */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-hud-border bg-slate-950/40 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-hud-accent animate-pulse" />
            <span className="font-mono tracking-widest text-lg font-bold">AEGIS</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-hud-text hover:text-hud-accent">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Dashboard Pane */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
