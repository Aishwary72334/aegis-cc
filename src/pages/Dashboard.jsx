import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Calendar, 
  CheckSquare, 
  Target, 
  FileText, 
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [eventsRes, tasksRes, goalsRes, notesRes] = await Promise.all([
          api.get('/events'),
          api.get('/tasks'),
          api.get('/goals'),
          api.get('/notes')
        ]);
        setEvents(eventsRes.data);
        setTasks(tasksRes.data);
        setGoals(goalsRes.data);
        setNotes(notesRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Error synchronizing telemetry modules.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Filter computations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.start_time.startsWith(todayStr));
  
  const highPriorityTasks = tasks.filter(t => 
    t.status !== 'Completed' && t.status !== 'Cancelled' && (t.priority === 'Critical' || t.priority === 'High')
  );

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled' || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  });

  const activeGoals = goals.filter(g => g.status === 'Active');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center font-mono space-y-3">
          <div className="w-10 h-10 border-2 border-hud-border rounded-full border-t-hud-accent animate-spin mx-auto"></div>
          <p className="text-xs text-hud-accent animate-pulse tracking-widest uppercase">SYNCING TELEMETRY SYSTEMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Top Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Tactical Control</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">OPERATOR WORKSPACE TELEMETRY OVERVIEW</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-hud-accent bg-hud-accent-dim border border-hud-border px-3 py-1.5 rounded-lg">
          <Activity className="w-3.5 h-3.5 animate-spin" />
          SYSTEM STATUS: ONLINE
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Today's Schedule", val: todayEvents.length, icon: Calendar, color: "text-hud-accent", link: "/calendar" },
          { name: "Critical Priorities", val: highPriorityTasks.length, icon: AlertTriangle, color: "text-red-400", link: "/tasks" },
          { name: "Active Goals", val: activeGoals.length, icon: Target, color: "text-purple-400", link: "/goals" },
          { name: "Stored Logs", val: notes.length, icon: FileText, color: "text-green-400", link: "/notes" },
        ].map((card, idx) => (
          <Link key={idx} to={card.link} className="hud-glass hud-glass-hover p-4 rounded-xl flex items-center justify-between group relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-hud-muted">{card.name}</span>
              <p className="text-2xl font-bold font-mono text-hud-text">{card.val}</p>
            </div>
            <card.icon className={`w-8 h-8 opacity-45 group-hover:opacity-100 transition-opacity ${card.color}`} />
          </Link>
        ))}
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Side Panel - Today's Schedule & High Priority */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Today's Schedule panel */}
          <div className="hud-glass p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hud-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-hud-accent" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text">Today's Schedule</h3>
              </div>
              <Link to="/calendar" className="text-[10px] font-mono text-hud-accent hover:underline flex items-center gap-1">
                OPEN CALENDAR <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {todayEvents.length === 0 ? (
              <p className="text-xs text-hud-muted font-mono py-4">No events scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(event => (
                  <div key={event.id} className="p-3 bg-slate-950/40 border border-hud-border/60 rounded-lg flex justify-between items-center text-sm font-mono hover:border-hud-accent/50 transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-hud-text">{event.title}</span>
                      <p className="text-[10px] text-hud-muted mt-1">{event.location || 'No Location'}</p>
                    </div>
                    <div className="text-[10px] text-hud-accent flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* High Priority Tasks panel */}
          <div className="hud-glass p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hud-border/40 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-red-400" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text">Active Critical Tasks</h3>
              </div>
              <Link to="/tasks" className="text-[10px] font-mono text-hud-accent hover:underline flex items-center gap-1">
                VIEW TASKS <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {highPriorityTasks.length === 0 ? (
              <p className="text-xs text-hud-muted font-mono py-4">No critical priority items pending.</p>
            ) : (
              <div className="space-y-2">
                {highPriorityTasks.map(task => (
                  <div key={task.id} className="p-3 bg-slate-950/40 border border-hud-border/60 rounded-lg flex justify-between items-center text-sm font-mono hover:border-red-400/50 transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-hud-text">{task.title}</span>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[9px] uppercase bg-red-950 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                          {task.priority}
                        </span>
                        <span className="text-[9px] uppercase bg-slate-900 text-hud-muted border border-hud-border/40 px-1.5 py-0.5 rounded">
                          {task.status}
                        </span>
                      </div>
                    </div>
                    {task.deadline && (
                      <span className="text-[10px] text-red-400/80">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue/Deadlines panel */}
          {overdueTasks.length > 0 && (
            <div className="hud-glass p-5 rounded-xl border-red-500/20 bg-red-950/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-red-500/20 pb-3">
                <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-red-400">Overdue Protocols</h3>
              </div>
              <div className="space-y-2">
                {overdueTasks.map(task => (
                  <div key={task.id} className="p-3 bg-slate-950/60 border border-red-500/20 rounded-lg flex justify-between items-center text-sm font-mono">
                    <span className="text-xs text-red-200">{task.title}</span>
                    <span className="text-[10px] bg-red-950 text-red-400 border border-red-500/40 px-2 py-0.5 rounded uppercase tracking-wider">
                      Overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side Panel - Goals, Notes & System Log */}
        <div className="space-y-4">
          
          {/* Goal Progress Panel */}
          <div className="hud-glass p-5 rounded-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-hud-border/40 pb-3">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text">Goals Telemetry</h3>
            </div>
            
            {activeGoals.length === 0 ? (
              <p className="text-xs text-hud-muted font-mono py-4">No active objectives.</p>
            ) : (
              <div className="space-y-4">
                {activeGoals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-hud-text font-semibold truncate max-w-[150px]">{goal.title}</span>
                      <span className="text-hud-accent">{goal.progress}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-950 border border-hud-border/40 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-hud-accent to-purple-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes Panel */}
          <div className="hud-glass p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hud-border/40 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text">Recent Log Files</h3>
              </div>
              <Link to="/notes" className="text-[10px] font-mono text-hud-accent hover:underline flex items-center gap-1">
                VIEW LOGS <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-hud-muted font-mono py-4">No logged entries.</p>
            ) : (
              <div className="space-y-3">
                {notes.slice(0, 3).map(note => (
                  <div key={note.id} className="p-3 bg-slate-950/40 border border-hud-border/60 rounded-lg text-sm font-mono hover:border-green-400/50 transition-colors">
                    <Link to="/notes" className="text-xs text-hud-text hover:text-hud-accent font-semibold block truncate">
                      {note.title}
                    </Link>
                    <span className="text-[9px] text-hud-muted mt-1 block">
                      Updated: {new Date(note.updated_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Console activity log */}
          <div className="hud-glass p-5 rounded-xl border border-hud-border/30 bg-slate-950/20 space-y-3 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 border-b border-hud-border/30 pb-2 text-hud-muted">
              <TrendingUp className="w-3.5 h-3.5 text-hud-accent" />
              <span>TERMINAL TELEMETRY LOGS</span>
            </div>
            <div className="space-y-1.5 text-hud-muted/70">
              <p><span className="text-hud-accent">[INFO]</span> Auth key handshake established.</p>
              <p><span className="text-hud-accent">[INFO]</span> Realtime channel listener active.</p>
              <p><span className="text-hud-accent">[INFO]</span> Core engine temperature: 34°C.</p>
              <p><span className="text-purple-400">[SYSTEM]</span> Memory allocation optimized.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
