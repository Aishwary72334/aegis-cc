import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FolderGit2, 
  Plus, 
  X, 
  Trash2, 
  Edit2
} from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Control
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to sync projects:', err);
      setError('Failed to sync project modules.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedProject(null);
    setName('');
    setDescription('');
    setStatus('Active');
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setStatus(project.status || 'Active');
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationErrors({});

    const errors = {};
    if (!name.trim()) errors.name = 'Project name is required.';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = {
      name,
      description,
      status
    };

    try {
      if (selectedProject) {
        // Edit mode
        const res = await api.put(`/projects/${selectedProject.id}`, payload);
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? res.data : p));
      } else {
        // Create mode
        const res = await api.post('/projects', payload);
        setProjects(prev => [res.data, ...prev]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to save project payload:', err);
      setError('Project operation failed.');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Wipe this project? Association links in other modules will be removed.')) return;

    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Project Console</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">OPERATOR SUB-SYSTEM WORKSPACES</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-hud-accent/15 hover:shadow-hud-accent/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {loading ? (
        <div className="text-center font-mono py-12">
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest">Querying workspace modules...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="hud-glass p-12 text-center rounded-xl font-mono text-sm text-hud-muted">
          No project workspaces initialized. Click "Create Project" to setup.
        </div>
      ) : (
        /* Projects grid card layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} className="hud-glass p-5 rounded-2xl relative border border-hud-border/60 shadow-2xl flex flex-col justify-between space-y-4">
              
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-hud-accent animate-pulse" />
                    <h3 className="font-semibold font-mono text-sm uppercase text-hud-text truncate max-w-[150px]">
                      {project.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono border ${
                    project.status === 'Active' ? 'bg-hud-accent-dim text-hud-accent border-hud-border/40' : 'bg-slate-900 text-hud-muted border-hud-border/30'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {project.description ? (
                  <p className="text-xs text-hud-muted font-mono leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-xs text-hud-muted/40 font-mono italic">No description logs found.</p>
                )}
              </div>

              {/* Actions footer */}
              <div className="flex justify-between items-center border-t border-hud-border/30 pt-3 text-[10px] font-mono text-hud-muted">
                <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(project)} className="text-hud-muted hover:text-hud-accent flex items-center gap-0.5 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="text-hud-muted hover:text-red-400 flex items-center gap-0.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Wipe
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-hud-border/70 rounded-2xl p-6 relative shadow-2xl font-sans">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>

            <div className="flex justify-between items-center border-b border-hud-border/40 pb-3 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-hud-accent" />
                {selectedProject ? 'Configure Project' : 'Initialize Workspace Project'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-hud-muted hover:text-hud-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none"
                  required
                />
                {validationErrors.name && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.name}</p>}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none font-mono"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest font-mono">Workspace description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-hud-border/40 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-hud-accent text-hud-bg font-bold px-5 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors"
                >
                  Save Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
