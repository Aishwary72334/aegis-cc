import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { BarChart3, Activity, Clock, CheckCircle2, Target } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to sync analytics:', err);
      setError('Telemetry aggregation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center font-mono space-y-3">
          <div className="w-10 h-10 border-2 border-hud-border rounded-full border-t-hud-accent animate-spin mx-auto"></div>
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest block">Compiling telemetry charts...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
        [CRITICAL] {error || 'Telemetry data unavailable.'}
      </div>
    );
  }

  const { summary, statusDistribution, priorityDistribution, weeklyActivity } = data;

  // Chart theme colors
  const STATUS_COLORS = {
    'Completed': '#34c759',  // Green
    'In Progress': '#00f2ff', // Neon Cyan
    'Waiting': '#ffcc00',     // Yellow/Amber
    'Blocked': '#f97316',     // Orange
    'To Do': '#64748b',       // Slate Gray
    'Cancelled': '#ef4444'    // Red
  };

  const PRIORITY_COLORS = {
    'Critical': '#ef4444',
    'High': '#f97316',
    'Medium': '#8b5cf6',
    'Low': '#64748b'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Diagnostics Board</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">OPERATOR PRODUCTIVITY TELEMETRIES</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-hud-accent bg-hud-accent-dim border border-hud-border px-3 py-1.5 rounded-lg">
          <Activity className="w-3.5 h-3.5" />
          DIAGNOSTIC STATUS: READY
        </div>
      </div>

      {/* Grid of aggregated numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Task Completion Rate", val: `${summary.completionRate}%`, sub: `${summary.completedTasks} / ${summary.totalTasks} Done`, icon: CheckCircle2, color: "text-green-400" },
          { name: "Average Goal Alignment", val: `${summary.averageGoalProgress}%`, sub: `${summary.totalGoals} Goals tracked`, icon: Target, color: "text-purple-400" },
          { name: "Estimated Time Matrix", val: `${summary.timeTelemetry.estimated}m`, sub: "Scheduled total duration", icon: Clock, color: "text-hud-accent" },
          { name: "Actual Duration Matrix", val: `${summary.timeTelemetry.actual}m`, sub: `Efficiency ratio: ${summary.timeTelemetry.ratio}x`, icon: Clock, color: "text-orange-400" },
        ].map((card, idx) => (
          <div key={idx} className="hud-glass p-5 rounded-xl space-y-1.5 font-mono">
            <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase tracking-widest text-hud-muted">{card.name}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-hud-text">{card.val}</p>
            <span className="text-[9px] text-hud-muted tracking-wider block">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly activity BarChart */}
        <div className="hud-glass p-5 rounded-2xl border border-hud-border/60 shadow-2xl space-y-4">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-hud-accent" /> Task Completion Volume (Last 7 Days)
          </h3>
          <div className="h-64 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity}>
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090b11', borderColor: 'rgba(0, 242, 255, 0.2)', color: '#e2e8f0' }}
                  labelClassName="font-bold text-hud-accent"
                />
                <Bar dataKey="completed" fill="#00f2ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status PieChart */}
        <div className="hud-glass p-5 rounded-2xl border border-hud-border/60 shadow-2xl space-y-4">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-hud-accent" /> Tasks Status Distribution
          </h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-around font-mono text-[10px]">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#090b11', borderColor: 'rgba(0, 242, 255, 0.2)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2.5 text-xs text-hud-muted mt-4 md:mt-0">
              {statusDistribution.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] || '#64748b' }}></span>
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority distribution PieChart */}
        <div className="hud-glass p-5 rounded-2xl border border-hud-border/60 shadow-2xl space-y-4 lg:col-span-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-400" /> Tasks Priority Distribution
          </h3>
          <div className="h-64 flex flex-col md:flex-row items-center justify-around font-mono text-[10px]">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDistribution.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#090b11', borderColor: 'rgba(0, 242, 255, 0.2)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-4 text-xs text-hud-muted mt-4 md:mt-0">
              {priorityDistribution.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: PRIORITY_COLORS[entry.name] || '#64748b' }}></span>
                  <span>{entry.name} Priority: <strong className="text-hud-text">{entry.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
