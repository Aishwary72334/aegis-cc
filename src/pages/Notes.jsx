import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Tag, 
  Search, 
  Save, 
  FolderGit2
} from 'lucide-react';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected note state
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [projectId, setProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotesAndProjects();
  }, []);

  const fetchNotesAndProjects = async () => {
    try {
      setLoading(true);
      const [notesRes, projectsRes] = await Promise.all([
        api.get('/notes'),
        api.get('/projects')
      ]);
      setNotes(notesRes.data);
      setProjects(projectsRes.data);
      
      // Auto select first note if available
      if (notesRes.data.length > 0) {
        handleSelectNote(notesRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to sync logs:', err);
      setError('Failed to synchronize log databases.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content || '');
    setTagsInput(note.tags ? note.tags.join(', ') : '');
    setProjectId(note.project_id || '');
  };

  const handleCreateNew = async () => {
    try {
      const payload = {
        title: 'New Log Entry',
        content: '',
        tags: [],
        project_id: null
      };
      const res = await api.post('/notes', payload);
      setNotes(prev => [res.data, ...prev]);
      handleSelectNote(res.data);
    } catch (err) {
      console.error('Failed to initialize note:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    try {
      setSaving(true);
      const parsedTags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const payload = {
        title,
        content,
        tags: parsedTags,
        project_id: projectId || null
      };

      const res = await api.put(`/notes/${selectedNote.id}`, payload);
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? res.data : n));
      setSelectedNote(res.data);
    } catch (err) {
      console.error('Failed to save note:', err);
      alert('Error saving log.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm('Permanently wipe this log entry?')) return;

    try {
      await api.delete(`/notes/${selectedNote.id}`);
      const remainingNotes = notes.filter(n => n.id !== selectedNote.id);
      setNotes(remainingNotes);
      
      if (remainingNotes.length > 0) {
        handleSelectNote(remainingNotes[0]);
      } else {
        setSelectedNote(null);
        setTitle('');
        setContent('');
        setTagsInput('');
        setProjectId('');
      }
    } catch (err) {
      console.error('Failed to wipe note:', err);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const query = searchQuery.toLowerCase();
    const titleMatch = n.title.toLowerCase().includes(query);
    const contentMatch = n.content && n.content.toLowerCase().includes(query);
    const tagsMatch = n.tags && n.tags.some(tag => tag.toLowerCase().includes(query));
    return titleMatch || contentMatch || tagsMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0">Secure Logs</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">PERSONAL WORKSPACE DIARY & CODE NOTES</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-hud-accent/15 hover:shadow-hud-accent/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Log Entry
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {loading ? (
        <div className="text-center font-mono py-12">
          <span className="text-xs text-hud-accent animate-pulse uppercase tracking-widest">Querying log indices...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[450px]">
          
          {/* Left panel: Log Index List */}
          <div className="hud-glass rounded-2xl flex flex-col overflow-hidden border border-hud-border/60">
            {/* Search filter */}
            <div className="p-4 border-b border-hud-border/40 flex items-center gap-2 bg-slate-950/40">
              <Search className="w-4 h-4 text-hud-muted" />
              <input
                type="text"
                placeholder="Query log indices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-hud-text font-mono placeholder-hud-muted/50 outline-none"
              />
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto divide-y divide-hud-border/30">
              {filteredNotes.length === 0 ? (
                <p className="text-xs text-hud-muted font-mono p-4 text-center">No logs found matching query.</p>
              ) : (
                filteredNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`p-4 font-mono text-left cursor-pointer transition-all duration-200 hover:bg-slate-900/35 relative ${
                      selectedNote?.id === note.id ? 'bg-hud-accent-dim/10 border-l-2 border-l-hud-accent' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <span className="text-xs font-bold text-hud-text truncate block">{note.title}</span>
                    <p className="text-[10px] text-hud-muted truncate mt-1">
                      {note.content ? note.content.substring(0, 80) : 'Empty content log.'}
                    </p>
                    
                    <div className="flex justify-between items-center mt-2.5 text-[9px] text-hud-muted">
                      <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                      {note.tags && note.tags.length > 0 && (
                        <span className="text-[8px] bg-slate-900 border border-hud-border/40 px-1 py-0.2 rounded">
                          {note.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Editor */}
          <div className="lg:col-span-2 hud-glass rounded-2xl flex flex-col overflow-hidden border border-hud-border/60">
            {selectedNote ? (
              <div className="flex-1 flex flex-col h-full bg-slate-950/20">
                {/* Editor Header controls */}
                <div className="p-4 border-b border-hud-border/40 flex flex-wrap justify-between items-center gap-3 bg-slate-950/40 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-hud-accent" />
                    <span className="text-hud-muted">LOG EDITOR</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-hud-accent text-hud-bg font-extrabold uppercase px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors hover:bg-hud-accent/80"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? 'Writing...' : 'Save Log'}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-red-400 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Wipe Log
                    </button>
                  </div>
                </div>

                {/* Editor fields */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto flex flex-col">
                  {/* Title Input */}
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-mono text-hud-muted tracking-widest">Entry Heading</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title of log..."
                      className="w-full bg-slate-950/60 border border-hud-border/50 focus:border-hud-accent rounded-lg px-4 py-2 text-hud-text text-sm font-mono font-bold outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tags */}
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-mono text-hud-muted tracking-widest flex items-center gap-1">
                        <Tag className="w-3 h-3 text-hud-accent" /> Associated Tags
                      </label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="research, startup, personal"
                        className="w-full bg-slate-950/60 border border-hud-border/50 focus:border-hud-accent rounded-lg px-4 py-2 text-hud-text text-xs font-mono outline-none transition-colors"
                      />
                    </div>

                    {/* Linked Project */}
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-mono text-hud-muted tracking-widest flex items-center gap-1">
                        <FolderGit2 className="w-3 h-3 text-purple-400" /> Linked Project
                      </label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full bg-slate-950/60 border border-hud-border/50 focus:border-hud-accent rounded-lg px-4 py-2.5 text-hud-text text-xs font-mono outline-none transition-colors cursor-pointer"
                      >
                        <option value="">No Project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Body text area */}
                  <div className="space-y-1 flex-1 flex flex-col">
                    <label className="block text-[9px] uppercase font-mono text-hud-muted tracking-widest">Workspace Content Logger</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Begin logging thoughts, codes, or journal updates here..."
                      className="w-full flex-1 bg-slate-950/60 border border-hud-border/50 focus:border-hud-accent rounded-lg p-4 text-hud-text text-sm font-mono outline-none resize-none min-h-[200px]"
                    />
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[300px] text-hud-muted font-mono text-xs">
                SELECT A SYSTEM LOG OR INITIALIZE A NEW ENTRY TO BEGIN.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
