import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import api from '../services/api';
import { Calendar as CalendarIcon, Plus, X, Clock, Video, MapPin } from 'lucide-react';

const toLocalISOString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const calendarRef = useRef(null);
  const isEventClickRef = useRef(false);

  // Modal Control
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Active');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to synchronize calendar coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (selectInfo) => {
    // If this select was triggered as part of an event click bubbling, ignore it
    if (isEventClickRef.current) {
      return;
    }

    // Reset form for creation
    setSelectedEvent(null);
    setIsEditing(true); // Direct edit mode for new events
    setTitle('');
    setDescription('');
    // Format dates to YYYY-MM-DDTHH:MM local format for input type="datetime-local"
    const localStart = toLocalISOString(selectInfo.startStr);
    const localEnd = toLocalISOString(selectInfo.endStr);
    setStartTime(localStart);
    setEndTime(localEnd);
    setPriority('Medium');
    setCategory('');
    setLocation('');
    setMeetingLink('');
    setNotes('');
    setStatus('Active');
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    if (clickInfo.jsEvent) {
      clickInfo.jsEvent.preventDefault();
      clickInfo.jsEvent.stopPropagation();
    }
    // Set ref flag to block date cell select from firing
    isEventClickRef.current = true;
    setTimeout(() => {
      isEventClickRef.current = false;
    }, 100);

    const eventId = clickInfo.event.id;
    const eventData = events.find(e => e.id === eventId);
    if (eventData) {
      setSelectedEvent(eventData);
      setIsEditing(false); // Open in read-only details view first
      setTitle(eventData.title);
      setDescription(eventData.description || '');
      setStartTime(toLocalISOString(eventData.start_time));
      setEndTime(toLocalISOString(eventData.end_time));
      setPriority(eventData.priority);
      setCategory(eventData.category || '');
      setLocation(eventData.location || '');
      setMeetingLink(eventData.meeting_link || '');
      setNotes(eventData.notes || '');
      setStatus(eventData.status);
      setValidationErrors({});
      setModalOpen(true);
    }
  };

  const handleEventChange = async (changeInfo) => {
    const { event } = changeInfo;
    const dbEvent = events.find(e => e.id === event.id);
    if (!dbEvent) return;

    try {
      const updatedPayload = {
        title: dbEvent.title,
        description: dbEvent.description,
        start_time: event.start.toISOString(),
        end_time: event.end ? event.end.toISOString() : event.start.toISOString(),
        priority: dbEvent.priority,
        category: dbEvent.category,
        location: dbEvent.location,
        meeting_link: dbEvent.meeting_link,
        notes: dbEvent.notes,
        status: dbEvent.status
      };

      await api.put(`/events/${event.id}`, updatedPayload);
      // Refresh local copy
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, start_time: updatedPayload.start_time, end_time: updatedPayload.end_time } : e));
    } catch (err) {
      console.error('Failed to update event schedule:', err);
      changeInfo.revert();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Quick validation
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!startTime) errors.startTime = 'Start time is required.';
    if (!endTime) errors.endTime = 'End time is required.';
    if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
      errors.endTime = 'End time must be after start time.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const payload = {
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      priority,
      category,
      location,
      meeting_link: meetingLink,
      notes,
      status
    };

    try {
      if (selectedEvent) {
        // Edit mode
        const res = await api.put(`/events/${selectedEvent.id}`, payload);
        setEvents(prev => prev.map(e => e.id === selectedEvent.id ? res.data : e));
      } else {
        // Create mode
        const res = await api.post('/events', payload);
        setEvents(prev => [...prev, res.data]);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to commit event payload:', err);
      const serverData = err.response?.data;
      if (serverData?.details) {
        setValidationErrors(serverData.details);
      } else {
        setValidationErrors({ general: serverData?.error || 'Failed to save event coordinates.' });
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm('Confirm event deletion? This action cannot be reverted.')) return;

    try {
      await api.delete(`/events/${selectedEvent.id}`);
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to wipe event:', err);
      alert('Event deletion failed.');
    }
  };

  // Convert DB events to FullCalendar events format
  const formattedEvents = events.map(e => {
    let color = '#3b82f6'; // blue (low/medium)
    if (e.priority === 'Critical') color = '#ef4444'; // red
    else if (e.priority === 'High') color = '#f97316'; // orange

    return {
      id: e.id,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      backgroundColor: color + '33', // 20% opacity fill
      borderColor: color,
      textColor: '#e2e8f0',
      editable: true
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-hud-border/40 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-wider text-hud-text uppercase font-mono m-0 font-sans">Calendar Grid</h2>
          <p className="text-xs text-hud-muted font-mono tracking-widest mt-1">REAL-TIME SCHEDULE SYNCHRONIZATION OVERVIEW</p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setIsEditing(true);
            setTitle('');
            setDescription('');
            setStartTime(toLocalISOString(new Date()));
            setEndTime(toLocalISOString(new Date(Date.now() + 60 * 60 * 1000)));
            setPriority('Medium');
            setCategory('');
            setLocation('');
            setMeetingLink('');
            setNotes('');
            setStatus('Active');
            setValidationErrors({});
            setModalOpen(true);
          }}
          className="bg-hud-accent text-hud-bg font-extrabold uppercase font-mono text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-hud-accent/15 hover:shadow-hud-accent/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-sm font-mono">
          [CRITICAL] {error}
        </div>
      )}

      {/* Calendar container */}
      <div className="hud-glass p-6 rounded-2xl relative border border-hud-border/60 shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <span className="text-xs font-mono text-hud-accent animate-pulse uppercase tracking-widest">Warming scheduling matrices...</span>
          </div>
        ) : (
          <div className="fc-theme-custom">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={formattedEvents}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventChange}
              eventResize={handleEventChange}
              height="auto"
            />
          </div>
        )}
      </div>

      {/* Modal for View/Edit/Create */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-hud-border/70 rounded-2xl p-6 relative shadow-2xl font-sans">
            {/* Title ornament */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-hud-accent rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-hud-accent rounded-tr-lg"></div>

             <div className="flex justify-between items-center border-b border-hud-border/40 pb-3 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-hud-text flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-hud-accent" />
                {selectedEvent ? (isEditing ? 'Configure Event' : 'Event Telemetry') : 'Record New Event'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-hud-muted hover:text-hud-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {validationErrors.general && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-mono">
                    [ERROR] {validationErrors.general}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Event Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                      required
                    />
                    {validationErrors.title && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.title}</p>}
                  </div>

                  {/* Start Time */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors font-mono"
                      required
                    />
                    {(validationErrors.start_time || validationErrors.startTime) && (
                      <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.start_time || validationErrors.startTime}</p>
                    )}
                  </div>

                  {/* End Time */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">End Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors font-mono"
                      required
                    />
                    {(validationErrors.end_time || validationErrors.endTime) && (
                      <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.end_time || validationErrors.endTime}</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors font-mono"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    {validationErrors.priority && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.priority}</p>}
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Academics, Startup, Research..."
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                    />
                    {validationErrors.category && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.category}</p>}
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                    />
                    {validationErrors.location && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.location}</p>}
                  </div>

                  {/* Meeting Link */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Meeting Link</label>
                    <input
                      type="text"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://zoom.us/..."
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors"
                    />
                    {(validationErrors.meeting_link || validationErrors.meetingLink) && (
                      <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.meeting_link || validationErrors.meetingLink}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Brief Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors resize-none"
                    />
                    {validationErrors.description && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.description}</p>}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-hud-muted tracking-widest">Detailed Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950/60 border border-hud-border/60 focus:border-hud-accent rounded-lg px-3 py-2 text-hud-text text-sm outline-none transition-colors resize-none"
                    />
                    {validationErrors.notes && <p className="text-[10px] text-red-400 font-mono mt-0.5">{validationErrors.notes}</p>}
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-hud-border/40">
                  <div>
                    {selectedEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="bg-red-950/35 hover:bg-red-950/60 border border-red-500/30 text-red-400 hover:text-red-300 text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors mr-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedEvent) {
                          setIsEditing(false); // Return to details screen
                        } else {
                          setModalOpen(false);
                        }
                      }}
                      className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="bg-hud-accent text-hud-bg font-bold text-xs uppercase font-mono px-5 py-2 rounded-lg cursor-pointer hover:bg-hud-accent/80 transition-colors"
                    >
                      Save Coordinates
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Read-Only mode details screen */}
                <div className="space-y-4 font-mono text-sm text-hud-text bg-slate-950/40 border border-hud-border/40 p-4 rounded-xl">
                  <div className="flex justify-between items-start border-b border-hud-border/30 pb-2">
                    <div>
                      <h4 className="text-base font-bold text-hud-accent uppercase">{title}</h4>
                      <span className="text-[10px] text-hud-muted">ID: {selectedEvent?.id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                      priority === 'Critical' ? 'bg-red-950 text-red-400 border border-red-500/30' :
                      priority === 'High' ? 'bg-orange-950 text-orange-400 border border-orange-500/30' :
                      'bg-slate-900 text-hud-muted border border-hud-border/40'
                    }`}>
                      {priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-hud-accent" />
                      <div>
                        <p className="text-[10px] text-hud-muted uppercase">Duration</p>
                        <p className="text-xs">
                          {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {category && (
                      <div>
                        <p className="text-[10px] text-hud-muted uppercase">Category</p>
                        <p className="text-xs text-hud-accent">{category}</p>
                      </div>
                    )}

                    {location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-[10px] text-hud-muted uppercase">Location</p>
                          <p className="text-xs">{location}</p>
                        </div>
                      </div>
                    )}

                    {meetingLink && (
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-[10px] text-hud-muted uppercase">Virtual Room</p>
                          <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 underline hover:text-green-300">
                            Join Meeting
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {description && (
                    <div className="border-t border-hud-border/30 pt-3">
                      <p className="text-[10px] text-hud-muted uppercase">Description</p>
                      <p className="text-xs text-hud-text mt-1">{description}</p>
                    </div>
                  )}

                  {notes && (
                    <div className="border-t border-hud-border/30 pt-3">
                      <p className="text-[10px] text-hud-muted uppercase">Notes Log</p>
                      <p className="text-xs text-hud-text mt-1 whitespace-pre-line">{notes}</p>
                    </div>
                  )}
                </div>

                {/* Details Screen Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-hud-border/40">
                  <div>
                    {selectedEvent && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="bg-red-950/35 hover:bg-red-950/60 border border-red-500/30 text-red-400 hover:text-red-300 text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors mr-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalOpen(false);
                      }}
                      className="bg-slate-900 border border-hud-border/60 text-hud-muted hover:text-hud-text text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true); // Switch to edit view
                      }}
                      className="bg-purple-950/50 border border-purple-500/40 text-purple-400 hover:text-purple-300 text-xs uppercase font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
