import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Target, 
  Plus, 
  X, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit, 
  FileText
} from 'lucide-react';

const toLocalISOString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [targetGoalId, setTargetGoalId] = useState('');

  // Goal Form Fields
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalNotes, setGoalNotes] = useState('');
  const [goalStatus, setGoalStatus] = useState('Active');

  // Milestone Form Fields
  const [msTitle, setMsTitle] = useState('');
  const [msDescription, setMsDescription] = useState('');
  const [msDeadline, setMsDeadline] = useState('');
  const [msProgress, setMsProgress] = useState(0);
  const [msCompleted, setMsCompleted] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (err) {
      console.error('Failed to sync goals:', err);
      setError('Failed to synchronize goal matrices.');
    } finally {
      setLoading(false);
    }
  };

  // --- GOAL ACTIONS ---
  const handleOpenGoalCreate = () => {
    setSelectedGoal(null);
    setGoalTitle('');
    setGoalDescription('');
    setGoalDeadline('');
    setGoalProgress(0);
    setGoalNotes('');
    setGoalStatus('Active');
    setGoalModalOpen(true);
  };

  const handleOpenGoalEdit = (goal) => {
    setSelectedGoal(goal);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description || '');
    setGoalDeadline(goal.deadline ? toLocalISOString(goal.deadline) : '');
    setGoalProgress(goal.progress);
    setGoalNotes(goal.notes || '');
    setGoalStatus(goal.status || 'Active');
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    const payload = {
      title: goalTitle,
      description: goalDescription,
      deadline: goalDeadline ? new Date(goalDeadline).toISOString() : null,
      progress: Number(goalProgress),
      status: goalStatus,
      notes: goalNotes
    };

    try {
      if (selectedGoal) {
        const res = await api.put(`/goals/${selectedGoal.id}`, payload);
        // Retain current milestones
        setGoals(prev => prev.map(g => g.id === selectedGoal.id ? { ...res.data, milestones: g.milestones } : g));
      } else {
        const res = await api.post('/goals', payload);
        setGoals(prev => [{ ...res.data, milestones: [] }, ...prev]);
      }
      setGoalModalOpen(false);
    } catch (err) {
      console.error('Failed to save goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Delete this goal? All linked milestones will be deleted.')) return;
    try {
      await api.delete(`/goals/${goalId}`);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      console.error('Failed to wipe goal:', err);
    }
  };

  // --- MILESTONE ACTIONS ---
  const handleOpenMilestoneCreate = (goalId) => {
    setTargetGoalId(goalId);
    setSelectedMilestone(null);
    setMsTitle('');
    setMsDescription('');
    setMsDeadline('');
    setMsProgress(0);
    setMsCompleted(false);
    setMilestoneModalOpen(true);
  };

  const handleOpenMilestoneEdit = (goalId, milestone) => {
    setTargetGoalId(goalId);
    setSelectedMilestone(milestone);
    setMsTitle(milestone.title);
    setMsDescription(milestone.description || '');
    setMsDeadline(milestone.deadline ? toLocalISOString(milestone.deadline) : '');
    setMsProgress(milestone.progress);
    setMsCompleted(milestone.completed);
    setMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    if (!msTitle.trim()) return;

    const payload = {
      title: msTitle,
      description: msDescription,
      deadline: msDeadline ? new Date(msDeadline).toISOString() : null,
      progress: Number(msProgress),
      completed: msCompleted
    };

    try {
      if (selectedMilestone) {
        // Edit mode
        const res = await api.put(`/goals/milestones/${selectedMilestone.id}`, payload);
        setGoals(prev => prev.map(g => {
          if (g.id === targetGoalId) {
            return {
              ...g,
              milestones: g.milestones.map(m => m.id === selectedMilestone.id ? res.data : m)
            };
          }
          return g;
        }));
      } else {
        // Create mode
        const res = await api.post(`/goals/${targetGoalId}/milestones`, payload);
        setGoals(prev => prev.map(g => {
          if (g.id === targetGoalId) {
            return {
              ...g,
              milestones: [...g.milestones, res.data]
            };
          }
          return g;
        }));
      }
      setMilestoneModalOpen(false);
    } catch (err) {
      console.error('Failed to save milestone:', err);
    }
  };

  const handleDeleteMilestone = async (goalId, milestoneId) => {
    if (!window.confirm('Wipe this milestone?')) return;
    try {
      await api.delete(`/goals/milestones/${milestoneId}`);
      setGoals(prev => prev.map(g => {
        if (g.id === goalId) {
          return { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) };
        }
        return g;
      }));
    } catch (err) {
      console.error('Failed to wipe milestone:', err);
    }
  };

  const handleToggleMilestone = async (goalId, milestone) => {
    try {
      const toggledCompleted = !milestone.completed;
      const payload = {
        title: milestone.title,
        description: milestone.description,
        deadline: milestone.deadline,
        progress: toggledCompleted ? 100 : 0,
        completed: toggledCompleted
      };
      
      const res = await api.put(`/goals/milestones/${milestone.id}`, payload);
      
      // Update local state and dynamically recalculate Goal Progress!
      setGoals(prev => prev.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map(m => m.id === milestone.id ? res.data : m);
          // Calculate average progress based on completed milestones
          const totalMilestones = updatedMilestones.length;
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const calculatedProgress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : g.progress;
          
          // Auto update goal progress on server too to keep them synced
          api.put(`/goals/${g.id}`, {
            title: g.title,
            description: g.description,
            deadline: g.deadline,
            progress: calculatedProgress,
            status: g.status,
            notes: g.notes
          });

          return {
            ...g,
            progress: calculatedProgress,
            milestones: updatedMilestones
          };
        }
        return g;
      }));

    } catch (err) {
      console.error('Failed to toggle milestone completion:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Objectives Core</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">GOAL & MILESTONE HIERARCHY MAPS</p>
        </div>
        <button
          onClick={handleOpenGoalCreate}
          className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-hud-accent/15 hover:shadow-hud-accent/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Objective
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {loading ? (
        <div className="text-center font-mono py-12">
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest">Querying objectives matrix...</span>
        </div>
      ) : goals.length === 0 ? (
        <div className="hud-glass p-12 text-center rounded-xl font-mono text-sm text-hud-muted">
          No objectives initialized. Click "Add Objective" to start.
        </div>
      ) : (
        /* Goals list accordion card styles */
        <div className="space-y-6">
          {goals.map(goal => (
            <div key={goal.id} className="hud-glass p-6 rounded-2xl relative border border-hud-border/60 shadow-2xl space-y-4">
              
              {/* Header section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-hud-border/30 pb-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-hud-accent" />
                    <h3 className="text-base font-bold font-mono text-hud-text uppercase">{goal.title}</h3>
                  </div>
                  {goal.description && <p className="text-xs text-hud-muted max-w-xl">{goal.description}</p>}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2.5 font-mono text-xs">
                  {goal.deadline && (
                    <span className="flex items-center gap-1 text-hud-muted">
                      <Calendar className="w-3.5 h-3.5 text-hud-accent" />
                      Due: {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                    goal.status === 'Active' ? 'bg-hud-accent-dim text-hud-accent border-hud-border/40' : 'bg-slate-900 text-hud-muted border-hud-border/30'
                  }`}>
                    {goal.status}
                  </span>
                  <button onClick={() => handleOpenGoalEdit(goal)} className="text-hud-muted hover:text-hud-accent">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteGoal(goal.id)} className="text-hud-muted hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar and details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Progress bar info */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-hud-muted">Objective Progress</span>
                    <span className="text-hud-accent font-bold">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 border border-hud-border/40 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-hud-accent to-purple-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick notes overview */}
                <div className="bg-slate-950/40 border border-hud-border/30 p-3 rounded-lg text-xs font-mono space-y-1 relative">
                  <div className="flex items-center gap-1 text-hud-muted text-[10px]">
                    <FileText className="w-3.5 h-3.5 text-hud-accent" />
                    <span>NOTES / INSTRUCTIONS</span>
                  </div>
                  <p className="text-hud-text truncate">{goal.notes || 'No notes added.'}</p>
                </div>

              </div>

              {/* Milestones list nested */}
              <div className="border-t border-hud-border/30 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-hud-text">Milestones Checklist</h4>
                  <button 
                    onClick={() => handleOpenMilestoneCreate(goal.id)}
                    className="text-[10px] font-mono text-hud-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> ADD MILESTONE
                  </button>
                </div>

                {goal.milestones.length === 0 ? (
                  <p className="text-xs text-hud-muted font-mono py-1">No milestones established for this objective.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {goal.milestones.map(ms => (
                      <div 
                        key={ms.id} 
                        className={`p-3 bg-slate-950/50 border rounded-xl flex items-center justify-between text-xs font-mono group transition-all duration-300 ${
                          ms.completed ? 'border-green-500/30 bg-green-950/5' : 'border-hud-border/60 hover:border-hud-accent/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <button onClick={() => handleToggleMilestone(goal.id, ms)} className="text-hud-muted hover:text-hud-accent transition-colors flex-shrink-0 cursor-pointer">
                            {ms.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-hud-muted" />
                            )}
                          </button>
                          <div className="truncate">
                            <span className={`font-semibold ${ms.completed ? 'line-through text-hud-muted' : 'text-hud-text'}`}>
                              {ms.title}
                            </span>
                            {ms.description && <p className="text-[10px] text-hud-muted truncate">{ms.description}</p>}
                          </div>
                        </div>

                        {/* Actions for Milestone */}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity flex-shrink-0 ml-2">
                          <button onClick={() => handleOpenMilestoneEdit(goal.id, ms)} className="text-hud-muted hover:text-hud-accent">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteMilestone(goal.id, ms.id)} className="text-hud-muted hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Goal Edit/Create Modal */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-hud-border/70 rounded-2xl p-6 relative shadow-2xl font-sans">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <div className="flex justify-between items-center border-b border-hud-border/40 pb-3 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text flex items-center gap-2">
                <Target className="w-4 h-4 text-hud-accent" />
                {selectedGoal ? 'Configure Objective' : 'Record New Objective'}
              </h3>
              <button onClick={() => setGoalModalOpen(false)} className="text-hud-muted hover:text-hud-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Objective Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest font-mono">Target Deadline</label>
                  <input
                    type="datetime-local"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Status</label>
                  <select
                    value={goalStatus}
                    onChange={(e) => setGoalStatus(e.target.value)}
                    className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest flex justify-between">
                    <span>Manual Progress slider</span>
                    <span className="text-hud-accent font-bold">{goalProgress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goalProgress}
                    onChange={(e) => setGoalProgress(e.target.value)}
                    className="w-full accent-hud-accent bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Brief description</label>
                <textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Detailed notes</label>
                <textarea
                  value={goalNotes}
                  onChange={(e) => setGoalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hud-border/40 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-hud-accent text-hud-bg font-bold px-5 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors"
                >
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Edit/Create Modal */}
      {milestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-hud-border/70 rounded-2xl p-6 relative shadow-2xl font-sans">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <div className="flex justify-between items-center border-b border-hud-border/40 pb-3 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-hud-accent" />
                {selectedMilestone ? 'Configure Milestone' : 'Record Milestone coordinates'}
              </h3>
              <button onClick={() => setMilestoneModalOpen(false)} className="text-hud-muted hover:text-hud-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Milestone Title</label>
                <input
                  type="text"
                  value={msTitle}
                  onChange={(e) => setMsTitle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Target Date</label>
                  <input
                    type="datetime-local"
                    value={msDeadline}
                    onChange={(e) => setMsDeadline(e.target.value)}
                    className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="msCompleted"
                    checked={msCompleted}
                    onChange={(e) => setMsCompleted(e.target.checked)}
                    className="w-4 h-4 accent-hud-accent bg-slate-950 rounded cursor-pointer"
                  />
                  <label htmlFor="msCompleted" className="text-xs uppercase font-mono text-hud-text tracking-wider cursor-pointer">
                    Completed
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Brief description</label>
                <textarea
                  value={msDescription}
                  onChange={(e) => setMsDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hud-border/40 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setMilestoneModalOpen(false)}
                  className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-hud-accent text-hud-bg font-bold px-5 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
