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

  // Silently refresh dashboard telemetry data
  const fetchDashboardData = async () => {
    try {
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
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    init();
  }, []);

  // Timezone helper to get local date string YYYY-MM-DD
  const getLocalDateString = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString(new Date());

  // Filter computations
  const todayEvents = events.filter(e => e.start_time.startsWith(todayStr));

  // Today's & Overdue Tasks due up to the end of today
  const todayTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    if (!t.deadline) return false;
    const taskDeadlineStr = getLocalDateString(new Date(t.deadline));
    return taskDeadlineStr <= todayStr;
  });

  // Smart priority escalation/de-escalation based on deadline and estimated duration
  const getDynamicPriority = (task) => {
    if (!task.deadline) return task.priority;

    const now = new Date();
    const deadline = new Date(task.deadline);
    const diffTime = deadline - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (task.status === 'Completed' || task.status === 'Cancelled') {
      return task.priority;
    }

    // Convert estimated duration (in minutes) to days
    const estDays = (task.estimated_duration || 0) / (60 * 24);

    // Safety buffer: at least 1 day for Critical, 2 days for High
    const criticalThreshold = Math.max(1, estDays);
    const highThreshold = Math.max(2, estDays * 2);

    if (task.priority === 'Critical' || task.priority === 'High') {
      if (diffDays <= criticalThreshold) {
        return 'Critical';
      } else if (diffDays <= highThreshold) {
        return 'High';
      } else {
        return 'Medium';
      }
    }

    return task.priority;
  };

  const getPriorityBadgeStyles = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-950/60 text-red-400 border-red-500/30';
      case 'High':
        return 'bg-amber-950/60 text-amber-400 border-amber-500/30';
      case 'Medium':
        return 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-900/60 text-hud-muted border-hud-border/40';
    }
  };

  // Sort tasks by deadline (nearest first, no deadline at the bottom)
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return dateA - dateB;
  });

  // Active Critical Tasks: filtered by stored high/critical priority, sorted by nearest deadline
  const highPriorityTasks = sortedTasks.filter(t => 
    t.status !== 'Completed' && t.status !== 'Cancelled' && (t.priority === 'Critical' || t.priority === 'High')
  );

  const overdueTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled' || !t.deadline) return false;
    return new Date(t.deadline) < new Date();
  });

  const activeGoals = goals.filter(g => g.status === 'Active');

  // Handle task complete toggle
  const handleToggleTaskComplete = async (task) => {
    try {
      const newStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      const updatePayload = {
        title: task.title,
        description: task.description || null,
        priority: task.priority,
        status: newStatus,
        deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
        estimated_duration: task.estimated_duration || 0,
        actual_duration: task.actual_duration || 0,
        project_id: task.project_id || null,
        tags: task.tags || [],
        user_id: task.user_id
      };

      await api.put(`/tasks/${task.id}`, updatePayload);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to toggle task status:', err);
      setError('Failed to update task telemetry.');
    }
  };

  // Quick reschedule task to tomorrow
  const handleShiftToTomorrow = async (task) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const updatePayload = {
        title: task.title,
        description: task.description || null,
        priority: task.priority,
        status: task.status,
        deadline: tomorrow.toISOString(),
        estimated_duration: task.estimated_duration || 0,
        actual_duration: task.actual_duration || 0,
        project_id: task.project_id || null,
        tags: task.tags || [],
        user_id: task.user_id
      };

      await api.put(`/tasks/${task.id}`, updatePayload);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to reschedule task:', err);
      setError('Failed to reschedule task.');
    }
  };

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
          { name: "Today's Agenda", val: todayEvents.length + todayTasks.length, icon: Calendar, color: "text-hud-accent", link: "/calendar" },
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
          
          {/* Today's Schedule & To-Dos panel */}
          <div className="hud-glass p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hud-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-hud-accent" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text">Today's Schedule & Tasks</h3>
              </div>
              <Link to="/calendar" className="text-[10px] font-mono text-hud-accent hover:underline flex items-center gap-1">
                OPEN CALENDAR <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Split layout: Left for Events, Right for Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Today's Events */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-hud-accent font-semibold border-b border-hud-accent/10 pb-1 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-hud-accent animate-pulse"></span>
                  Events Schedule
                </h4>
                {todayEvents.length === 0 ? (
                  <p className="text-xs text-hud-muted font-mono py-2">No events scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {todayEvents.map(event => (
                      <div key={event.id} className="p-2.5 bg-slate-950/40 border border-hud-border/40 hover:border-hud-accent/40 rounded-lg flex justify-between items-center text-xs font-mono transition-all">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-hud-text truncate">{event.title}</p>
                          <p className="text-[9px] text-hud-muted mt-0.5 truncate">{event.location || 'No Location'}</p>
                        </div>
                        <div className="text-[9px] text-hud-accent shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's To-Do List */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold border-b border-purple-500/10 pb-1 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></span>
                  Daily Checklist
                </h4>
                {todayTasks.length === 0 ? (
                  <p className="text-xs text-hud-muted font-mono py-2">No active tasks due today.</p>
                ) : (
                  <div className="space-y-2">
                    {todayTasks.map(task => (
                      <div key={task.id} className="p-2.5 bg-slate-950/40 border border-hud-border/40 hover:border-purple-500/30 rounded-lg flex justify-between items-center text-xs font-mono transition-all">
                        <div className="flex items-center gap-2 pr-2 min-w-0">
                          {/* Checkbox to complete task */}
                          <input
                            type="checkbox"
                            checked={task.status === 'Completed'}
                            onChange={() => handleToggleTaskComplete(task)}
                            className="w-3.5 h-3.5 rounded border-hud-border/60 bg-slate-950 text-hud-accent focus:ring-hud-accent/30 cursor-pointer"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-hud-text truncate block">
                              {task.title}
                            </span>
                            <span className="text-[8px] text-hud-muted uppercase tracking-widest block mt-0.5">
                              {task.estimated_duration ? `${task.estimated_duration}m` : '0m'} est • {getDynamicPriority(task)}
                            </span>
                          </div>
                        </div>

                        {/* Shift to Tomorrow Button */}
                        <button
                          title="Shift to Tomorrow"
                          onClick={() => handleShiftToTomorrow(task)}
                          className="p-1 rounded bg-slate-900 border border-hud-border/40 text-hud-muted hover:text-hud-accent hover:border-hud-accent/60 transition-all cursor-pointer shrink-0"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                {highPriorityTasks.map(task => {
                  const dynPriority = getDynamicPriority(task);
                  const badgeStyles = getPriorityBadgeStyles(dynPriority);
                  
                  return (
                    <div key={task.id} className="p-3 bg-slate-950/40 border border-hud-border/60 rounded-lg flex justify-between items-center text-sm font-mono hover:border-hud-accent/30 transition-colors">
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-semibold text-hud-text truncate block">{task.title}</span>
                        <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                          <span className={`text-[8px] uppercase border px-1.5 py-0.5 rounded ${badgeStyles}`}>
                            {dynPriority}
                          </span>
                          <span className="text-[8px] uppercase bg-slate-900 text-hud-muted border border-hud-border/40 px-1.5 py-0.5 rounded">
                            {task.status}
                          </span>
                          {task.estimated_duration > 0 && (
                            <span className="text-[8px] text-hud-muted flex items-center gap-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-hud-border/40">
                              <Clock className="w-2.5 h-2.5" /> {task.estimated_duration}m
                            </span>
                          )}
                        </div>
                      </div>
                      {task.deadline && (
                        <span className="text-[10px] text-hud-muted shrink-0">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overdue/Deadlines panel */}
          {overdueTasks.length > 0 && (
            <div className="hud-glass p-5 rounded-xl border border-red-500/20 bg-red-950/10 space-y-4">
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
