import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  CheckSquare, 
  Plus, 
  X, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Grid, 
  List,
  Edit2
} from 'lucide-react';

const toLocalISOString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View settings
  const [viewType, setViewType] = useState('kanban'); // 'kanban' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal settings
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('To Do');
  const [deadline, setDeadline] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [actualDuration, setActualDuration] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchTasksAndProjects();
  }, []);

  const fetchTasksAndProjects = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects')
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error('Failed to sync tasks:', err);
      setError('Failed to sync task modules.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedTask(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStatus('To Do');
    setDeadline('');
    setEstimatedDuration(0);
    setActualDuration(0);
    setProjectId('');
    setTagsInput('');
    setValidationErrors({});
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline ? toLocalISOString(task.deadline) : '');
    setEstimatedDuration(task.estimated_duration || 0);
    setActualDuration(task.actual_duration || 0);
    setProjectId(task.project_id || '');
    setTagsInput(task.tags ? task.tags.join(', ') : '');
    setValidationErrors({});
    setIsEditing(false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Parse tags (comma separated)
    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const payload = {
      title,
      description,
      priority,
      status,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      estimated_duration: Number(estimatedDuration),
      actual_duration: Number(actualDuration),
      project_id: projectId || null,
      tags: parsedTags
    };

    try {
      if (selectedTask) {
        // Edit mode
        const res = await api.put(`/tasks/${selectedTask.id}`, payload);
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? res.data : t));
      } else {
        // Create mode
        const res = await api.post('/tasks', payload);
        setTasks(prev => [res.data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to commit task payload:', err);
      setError('Task update failed.');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Wiping task failed.');
    }
  };

  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      const payload = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: newStatus,
        deadline: task.deadline,
        estimated_duration: task.estimated_duration,
        actual_duration: task.actual_duration,
        project_id: task.project_id,
        tags: task.tags
      };
      const res = await api.put(`/tasks/${task.id}`, payload);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch (err) {
      console.error('Quick status update failed:', err);
    }
  };

  // Filter tasks logic
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Kanban Columns
  const kanbanColumns = [
    { title: 'To Do', status: 'To Do', color: 'border-t-hud-muted bg-slate-950/20' },
    { title: 'In Progress', status: 'In Progress', color: 'border-t-hud-accent bg-hud-accent-dim/5' },
    { title: 'Waiting / Blocked', status: 'Waiting', alternative: 'Blocked', color: 'border-t-orange-400 bg-orange-950/5' },
    { title: 'Completed', status: 'Completed', color: 'border-t-green-400 bg-green-950/5' }
  ];

  const getTasksForColumn = (column) => {
    return filteredTasks.filter(t => 
      t.status === column.status || (column.alternative && t.status === column.alternative)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Task Ledger</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">OPERATOR TASK TRACKING & DURATIONS</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-hud-accent/15 hover:shadow-hud-accent/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {/* Filter and View Selector Area */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        {/* Search */}
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Query task title or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-4 py-2 text-hud-text text-sm font-mono outline-none transition-colors"
          />
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-950/90 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm font-mono outline-none cursor-pointer"
          >
            <option value="ALL">Priority: ALL</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950/90 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm font-mono outline-none cursor-pointer"
          >
            <option value="ALL">Status: ALL</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Blocked">Blocked</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* View Switcher buttons */}
        <div className="flex bg-slate-950 border border-hud-border/60 rounded-lg p-0.5 justify-self-end w-full md:w-auto">
          <button
            onClick={() => setViewType('kanban')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewType === 'kanban' ? 'bg-hud-accent text-hud-bg font-bold' : 'text-hud-muted hover:text-hud-text'
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Board
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewType === 'list' ? 'bg-hud-accent text-hud-bg font-bold' : 'text-hud-muted hover:text-hud-text'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Ledger
          </button>
        </div>
      </div>

      {/* Main Task View Grid */}
      {loading ? (
        <div className="text-center font-mono py-12">
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest">Querying task nodes...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="hud-glass p-12 text-center rounded-xl font-mono text-sm text-hud-muted">
          No tasks found matching current filters.
        </div>
      ) : viewType === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kanbanColumns.map((col, idx) => {
            const columnTasks = getTasksForColumn(col);
            return (
              <div key={idx} className={`hud-glass border-t-2 ${col.color} p-4 rounded-xl flex flex-col min-h-[400px]`}>
                <div className="flex justify-between items-center border-b border-hud-border/40 pb-2 mb-4 font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="text-hud-text">{col.title}</span>
                  <span className="bg-slate-900 border border-hud-border/40 px-2 py-0.5 rounded text-[10px] text-hud-accent">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {columnTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="p-3 bg-slate-950/60 border border-hud-border/50 hover:border-hud-accent/40 rounded-lg text-sm font-mono space-y-2 group transition-all duration-300 relative"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-hud-text hover:text-hud-accent cursor-pointer truncate" onClick={() => handleOpenEdit(task)}>
                          {task.title}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button onClick={() => handleOpenEdit(task)} className="text-hud-muted hover:text-hud-accent">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(task.id)} className="text-hud-muted hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-[10px] text-hud-muted line-clamp-2">{task.description}</p>
                      )}

                      {/* Tag list */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="text-[8px] bg-slate-900 border border-hud-border/30 px-1 py-0.2 rounded text-hud-muted">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-hud-border/20 pt-2 text-[9px] text-hud-muted">
                        <span className={`px-1.5 py-0.2 rounded border ${
                          task.priority === 'Critical' ? 'bg-red-950/50 text-red-400 border-red-500/25' :
                          task.priority === 'High' ? 'bg-orange-950/50 text-orange-400 border-orange-500/25' :
                          task.priority === 'Medium' ? 'bg-slate-900 text-purple-400 border-purple-500/25' :
                          'bg-slate-900 text-hud-muted border-hud-border/40'
                        }`}>
                          {task.priority}
                        </span>

                        {task.deadline && (
                          <span className="flex items-center gap-0.5 text-hud-accent/70">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Quick status selector */}
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                        className="w-full bg-slate-900 text-hud-muted border border-hud-border/30 hover:border-hud-accent/50 text-[9px] rounded px-1 py-0.5 cursor-pointer outline-none mt-2 transition-colors font-mono"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting">Waiting</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* LEDGER/LIST VIEW */
        <div className="hud-glass rounded-xl overflow-hidden border border-hud-border/60 shadow-2xl">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-hud-border text-hud-muted uppercase tracking-wider text-[10px]">
                <th className="p-4">Task Name</th>
                <th className="p-4">Clearance/Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Est / Act (m)</th>
                <th className="p-4">Target Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr key={task.id} className="border-b border-hud-border/40 hover:bg-slate-900/30 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-hud-text">{task.title}</div>
                    {task.description && <div className="text-[10px] text-hud-muted mt-1 max-w-sm truncate">{task.description}</div>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                      task.priority === 'Critical' ? 'bg-red-950 text-red-400 border-red-500/30' :
                      task.priority === 'High' ? 'bg-orange-950 text-orange-400 border-orange-500/30' :
                      task.priority === 'Medium' ? 'bg-slate-900 text-purple-400 border-purple-500/30' :
                      'bg-slate-900 text-hud-muted border-hud-border/40'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] uppercase text-hud-text">{task.status}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-hud-muted">{task.estimated_duration || 0}m</span>
                    <span className="mx-1 text-hud-accent">/</span>
                    <span className={task.actual_duration > task.estimated_duration ? 'text-red-400' : 'text-green-400'}>
                      {task.actual_duration || 0}m
                    </span>
                  </td>
                  <td className="p-4">
                    {task.deadline ? (
                      <span className="flex items-center gap-1 text-hud-text">
                        <Calendar className="w-3.5 h-3.5 text-hud-accent" />
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-hud-muted">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="bg-slate-900 hover:bg-slate-800 border border-hud-border/60 hover:border-hud-accent/60 text-hud-muted hover:text-hud-accent px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-red-400 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Wipe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-hud-border/70 rounded-2xl p-6 relative shadow-2xl">
            {/* Corner ornaments */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-hud-accent rounded-tr-lg"></div>

            <div className="flex justify-between items-center border-b border-hud-border/40 pb-3 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-hud-accent" />
                {selectedTask ? (isEditing ? 'Configure Task Coordinates' : 'Task Telemetry') : 'Initialize Task Entry'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-hud-muted hover:text-hud-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isEditing ? (
              <div className="space-y-4 font-sans">
                <div className="space-y-4 font-mono text-sm text-hud-text bg-slate-950/40 border border-hud-border/40 p-4 rounded-xl">
                  <div className="flex justify-between items-start border-b border-hud-border/30 pb-2">
                    <div>
                      <h4 className="text-base font-bold text-hud-accent uppercase">{title}</h4>
                      <span className="text-[10px] text-hud-muted">ID: {selectedTask?.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                        priority === 'Critical' ? 'bg-red-950 text-red-400 border-red-500/30' :
                        priority === 'High' ? 'bg-orange-950 text-orange-400 border border-orange-500/30' :
                        priority === 'Medium' ? 'bg-slate-900 text-purple-400 border border-purple-500/30' :
                        'bg-slate-900 text-hud-muted border-hud-border/40'
                      }`}>
                        {priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                        status === 'Completed' ? 'bg-green-950 text-green-400 border border-green-500/30' :
                        status === 'In Progress' ? 'bg-hud-accent-dim text-hud-accent border-hud-border/40' :
                        status === 'Waiting' || status === 'Blocked' ? 'bg-orange-950 text-orange-400 border border-orange-500/30' :
                        'bg-slate-900 text-hud-muted border-hud-border/30'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-hud-accent" />
                        <div>
                          <p className="text-[10px] text-hud-muted uppercase">Target Deadline</p>
                          <p className="text-xs">
                            {new Date(deadline).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {projects.find(p => p.id === projectId) && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-[10px] text-hud-muted uppercase">Linked Project</p>
                          <p className="text-xs text-blue-400">
                            {projects.find(p => p.id === projectId)?.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {(estimatedDuration > 0 || actualDuration > 0) && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-[10px] text-hud-muted uppercase">Duration Metrics</p>
                          <p className="text-xs">
                            Estimated: <span className="text-hud-accent font-bold">{estimatedDuration}m</span> | Actual: <span className={Number(actualDuration) > Number(estimatedDuration) ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{actualDuration}m</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {tagsInput && (
                    <div className="border-t border-hud-border/30 pt-3">
                      <p className="text-[10px] text-hud-muted uppercase">Tags</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {tagsInput.split(',').map((tag, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-900 border border-hud-border/40 px-2 py-0.5 rounded text-hud-muted">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {description && (
                    <div className="border-t border-hud-border/30 pt-3">
                      <p className="text-[10px] text-hud-muted uppercase">Description</p>
                      <p className="text-xs text-hud-text mt-1 whitespace-pre-line">{description}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-hud-border/40 font-mono text-xs">
                  <div>
                    {selectedTask && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTask.id)}
                        className="bg-red-950/35 hover:bg-red-950/60 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        Wipe Task
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-purple-950/50 border border-purple-500/40 text-purple-400 hover:text-purple-300 text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4 font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Title */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Task Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                      required
                    />
                    {validationErrors.title && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.title}</p>}
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Target Deadline */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Target Deadline</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    />
                  </div>

                  {/* Project selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Linked Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    >
                      <option value="">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estimated Duration */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-hud-accent" /> Estimated duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    />
                  </div>

                  {/* Actual Duration */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-green-400" /> Actual duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={actualDuration}
                      onChange={(e) => setActualDuration(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    />
                  </div>

                  {/* Tags (comma separated) */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Tags (comma-separated list)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="startup, film, academia"
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest font-mono">Detailed description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors resize-none"
                    />
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-hud-border/40 font-mono text-xs">
                  <div>
                    {selectedTask && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTask.id)}
                        className="bg-red-950/35 hover:bg-red-950/60 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        Wipe Task
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedTask) {
                          setIsEditing(false); // Go back to read-only view
                        } else {
                          setModalOpen(false);
                        }
                      }}
                      className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-hud-accent text-hud-bg font-bold px-5 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors"
                    >
                      Save Coordinates
                    </button>
                  </div>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
