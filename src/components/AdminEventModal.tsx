import React, { useState, useEffect } from "react";
import { X, MapPin, Link as LinkIcon, Image as ImageIcon, UploadCloud, Check, Plus, Trash2 } from "lucide-react";
import { Event, CustomQuestion } from "../types";
import { uploadToImgBB } from "../lib/firebase";

interface AdminEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: Event | null;
  targetDate: string; // "YYYY-MM-DD"
  onSave: (payload: Partial<Event>) => void;
  onDelete?: (eventId: string) => void;
}

export function AdminEventModal({ isOpen, onClose, selectedEvent, targetDate, onSave, onDelete }: AdminEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("academic");
  const [venue, setVenue] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [rsvpEnabled, setRsvpEnabled] = useState(false);
  const [seats, setSeats] = useState("60");
  const [registrationStatus, setRegistrationStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  
  const [uploading, setUploading] = useState(false);

  // Added states for mandatory event specifications matching Luma layout
  const [date, setDate] = useState(targetDate);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [organizerName, setOrganizerName] = useState("MKU Law Faculty");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [isExternalEvent, setIsExternalEvent] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Optional minimap states
  const [includeMap, setIncludeMap] = useState(false);
  const [locationSourceType, setLocationSourceType] = useState<"preset" | "custom">("preset");

  const MAP_PRESETS = [
    { name: "Moot Court Chamber, MKU Thika", query: "Moot Court Chamber, Mt. Kenya University, Thika" },
    { name: "MKU School of Law Library, Thika", query: "School of Law Library, Mt. Kenya University, Thika" },
    { name: "Graduation Pavilion, MKU", query: "Graduation Pavilion, Mt. Kenya University, Thika" },
    { name: "Student Union Plaza, MKU", query: "Student Union Plaza, Mt. Kenya University, Thika" },
    { name: "Academic Hall A, MKU", query: "Academic Hall A, Mt. Kenya University, Thika" },
    { name: "MKU Main Campus, Thika", query: "Mt. Kenya University Main Campus Thika" },
  ];

  const formatDateToInput = (d: any): string => {
    if (!d) return "";
    const dateObj = d.seconds ? new Date(d.seconds * 1000) : new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (isOpen) {
      setErrorText("");
      if (selectedEvent) {
        setTitle(selectedEvent.title || "");
        setDescription(selectedEvent.description || "");
        setCategory(selectedEvent.category || "academic");
        setVenue(selectedEvent.venue || "");
        setLink(selectedEvent.meetingLink || "");
        setImage(selectedEvent.coverImage || "");
        setRsvpEnabled(!selectedEvent.unlimited);
        setSeats(selectedEvent.capacity ? String(selectedEvent.capacity) : "60");
        setRegistrationStatus(selectedEvent.status === "cancelled" ? "CLOSED" : "OPEN");
        setCustomQuestions(selectedEvent.customQuestions || []);
        
        // Load the stored mandatory properties
        const preStartDate = formatDateToInput(selectedEvent.startDate);
        setDate(preStartDate || targetDate);
        setStartTime(selectedEvent.startTime || "10:00");
        setEndTime(selectedEvent.endTime || "12:00");
        setOrganizerName(selectedEvent.organizerName || "MKU Law Faculty");
        
        const preMapsLink = selectedEvent.googleMapsLink || "";
        setGoogleMapsLink(preMapsLink);
        setIncludeMap(!!preMapsLink);
        const isPreset = MAP_PRESETS.some(p => p.query === preMapsLink || p.name === preMapsLink);
        setLocationSourceType(isPreset ? "preset" : "custom");

        setIsExternalEvent(!!selectedEvent.isExternal);
        setRequireApproval(!!selectedEvent.requireApproval);
      } else {
        setTitle("");
        setDescription("");
        setCategory("academic");
        setVenue("");
        setLink("");
        setImage("");
        setRsvpEnabled(false);
        setSeats("60");
        setRegistrationStatus("OPEN");
        setCustomQuestions([]);
        
        // Default properties for new event
        setDate(targetDate);
        setStartTime("10:00");
        setEndTime("12:00");
        setOrganizerName("MKU Law Faculty");
        setGoogleMapsLink("");
        setIncludeMap(false);
        setLocationSourceType("preset");
        setIsExternalEvent(false);
        setRequireApproval(false);
      }
    }
  }, [isOpen, selectedEvent, targetDate]);

  if (!isOpen) return null;

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToImgBB(file);
      setImage(url);
    } catch (err) {
      console.error("Local file upload error inside Event Modal:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (!title.trim()) {
      setErrorText("An Event Title is strictly mandatory.");
      return;
    }

    if (!isExternalEvent) {
      if (!date) {
        setErrorText("Event Date is mandatory! Every standard event must have a specified date.");
        return;
      }
      if (!startTime) {
        setErrorText("Event Start Time is mandatory! Every standard event must have a defined timeline.");
        return;
      }
      if (!endTime) {
        setErrorText("Event End Time is mandatory! Every standard event must have an end time.");
        return;
      }
      if (!organizerName.trim()) {
        setErrorText("Organizer Host Name is mandatory! Comrades must know who is hosting the event.");
        return;
      }
      if (!venue.trim()) {
        setErrorText("Venue description / Chamber location is mandatory! Comrades must know where the event is physically taking place.");
        return;
      }
      if (includeMap && !googleMapsLink.trim()) {
        setErrorText("You enabled the Interactive Minimap. Please enter a location query or select a preset location.");
        return;
      }
    } else {
      if (!link.trim()) {
        setErrorText("An External Form RSVP / registration URL is required for virtual links!");
        return;
      }
    }

    const [yr, mo, dy] = date.split("-").map(Number);
    const localDate = new Date(yr, mo - 1, dy, 0, 0, 0);

    const payload: Partial<Event> = {
      title: title.trim(),
      description: description.trim(),
      category,
      venue: isExternalEvent ? "" : venue.trim(),
      meetingLink: link.trim(),
      coverImage: image.trim(),
      unlimited: isExternalEvent ? true : !rsvpEnabled,
      capacity: (!isExternalEvent && rsvpEnabled) ? Number(seats) || 60 : undefined,
      status: registrationStatus === "OPEN" ? "active" : "cancelled",
      customQuestions: isExternalEvent ? [] : customQuestions,
      
      // Added mandatory specifications
      startDate: localDate,
      endDate: localDate,
      startTime: isExternalEvent ? "" : startTime,
      endTime: isExternalEvent ? "" : endTime,
      organizerName: isExternalEvent ? "External Event" : organizerName.trim(),
      googleMapsLink: (isExternalEvent || !includeMap) ? "" : googleMapsLink.trim(),
      isExternal: isExternalEvent,
      eventType: isExternalEvent ? 'virtual' : 'physical',
      requireApproval: !isExternalEvent && requireApproval
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={handleFormSubmit} className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div>
            <h2 className="text-xl font-black uppercase text-white">{selectedEvent ? "Manage Assembly Event" : "Create Event Assembly"}</h2>
            <p className="text-[#FFDE00] text-xs font-mono mt-1 uppercase tracking-wider">{targetDate}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 text-left">
          
          {errorText && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3.5 rounded-2xl text-xs font-mono mb-6 leading-relaxed flex items-start gap-2.5 shadow-xl animate-fade-in-up">
              <span className="text-sm">⚠️</span>
              <div className="flex-grow">
                <span className="font-bold uppercase block mb-1 text-rose-400">Required Logistics Missing</span>
                {errorText}
              </div>
            </div>
          )}
          
          {/* Form Type Selection Segment */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Event Registration Mode</label>
            <div className="bg-[#18181b]/60 border border-white/5 rounded-2xl p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setIsExternalEvent(false)}
                className={`flex-grow py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  !isExternalEvent 
                    ? "bg-[#FFDE00] text-black shadow-lg" 
                    : "text-gray-400 hover:text-white hover:bg-white/5 bg-transparent"
                }`}
              >
                Standard RSVP Assembly
              </button>
              <button
                type="button"
                onClick={() => setIsExternalEvent(true)}
                className={`flex-grow py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  isExternalEvent 
                    ? "bg-[#FFDE00] text-black shadow-lg" 
                    : "text-gray-400 hover:text-white hover:bg-white/5 bg-transparent"
                }`}
              >
                External Link Form
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed font-mono uppercase tracking-wider">
              {!isExternalEvent 
                ? "💡 Mandatory: Specify date, times, host, location, and Google Maps location like Luma."
                : "💡 Exception Mode: Only the event title and external registration URL (Google Forms / Zoom) are required."}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Event Title *</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Moot Court Finals 2026"
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFDE00]/50 transition-colors text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
            <textarea 
              rows={3} 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed brief about the event..."
              className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#FFDE00]/50 transition-colors text-xs resize-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
              >
                <option value="academic">Academic / Lectures</option>
                <option value="moot">Moot Court Societies</option>
                <option value="career">Career & Placement</option>
                <option value="social">Social Gatherings</option>
                <option value="webinar">Online Seminar</option>
              </select>
            </div>

            {/* Event Host / convener: required for standard events */}
            {!isExternalEvent ? (
              <div>
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Event Host / Convener *
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. MKU Law Faculty"
                  value={organizerName} 
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-[#18181b]/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFDE00]/50 text-xs font-semibold"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2 opacity-50">
                  Event Host / Convener
                </label>
                <input 
                  type="text" 
                  disabled
                  placeholder="N/A (External registration form exception)"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-gray-500 text-xs font-semibold"
                />
              </div>
            )}
          </div>

          {/* Conditional inputs based on selected Registration Mode */}
          {!isExternalEvent ? (
            <>
              {/* Date & Time block (when, what time) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Event Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">Start Time *</label>
                  <input 
                    type="time" 
                    required 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">End Time *</label>
                  <input 
                    type="time" 
                    required 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                  />
                </div>
              </div>

              {/* Physical Locations and Google Maps (where, map like luma) */}
              <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MapPin size={10} className="text-[#FFDE00]" /> Venue / Chamber Location *
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Main Moot Court Chambers Auditorium"
                    value={venue} 
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-[#18181b]/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFDE00]/50 text-xs font-semibold"
                  />
                </div>

                {/* Optional Google Map selection option */}
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={includeMap}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIncludeMap(checked);
                        if (checked && !googleMapsLink) {
                          // Default to first preset on check
                          setGoogleMapsLink(MAP_PRESETS[0].query);
                          setLocationSourceType("preset");
                        }
                      }}
                      className="w-4 h-4 rounded border-white/10 bg-black accent-[#FFDE00]"
                    />
                    <span className="text-[11px] font-mono hover:text-white text-gray-300 font-bold uppercase tracking-wider">Embed Interactive Minimap Location PIN (Optional)</span>
                  </label>

                  {includeMap && (
                    <div className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-4 animate-fade-in text-left">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSourceType("preset");
                            setGoogleMapsLink(MAP_PRESETS[0].query);
                          }}
                          className={`text-[10px] uppercase tracking-wider font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            locationSourceType === "preset"
                              ? "bg-[#FFDE00]/10 border-[#FFDE00] text-[#FFDE00]"
                              : "border-white/5 hover:border-white/10 text-gray-400"
                          }`}
                        >
                          Chamber Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationSourceType("custom");
                            setGoogleMapsLink("");
                          }}
                          className={`text-[10px] uppercase tracking-wider font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            locationSourceType === "custom"
                              ? "bg-[#FFDE00]/10 border-[#FFDE00] text-[#FFDE00]"
                              : "border-white/5 hover:border-white/10 text-gray-400"
                          }`}
                        >
                          Custom Search Query
                        </button>
                      </div>

                      {locationSourceType === "preset" ? (
                        <div>
                          <label className="block text-[9px] font-mono text-gray-500 uppercase font-black mb-1.5">Select a campus preset chamber</label>
                          <select
                            value={googleMapsLink}
                            onChange={(e) => setGoogleMapsLink(e.target.value)}
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                          >
                            {MAP_PRESETS.map((p) => (
                              <option key={p.query} value={p.query}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] font-mono text-gray-500 uppercase font-black mb-1.5">Enter Map pin query / search expression</label>
                          <input
                            type="text"
                            placeholder="e.g. Mount Kenya University Thika, or Thika Law Courts"
                            value={googleMapsLink}
                            onChange={(e) => setGoogleMapsLink(e.target.value)}
                            className="w-full bg-[#18181b]/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50"
                          />
                        </div>
                      )}


                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* External link input only */
            <div className="bg-[#FFDE00]/5 border border-[#FFDE00]/20 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <LinkIcon size={10} /> Google Forms / External RSVP Form Link *
                </label>
                <input 
                  type="url" 
                  required 
                  placeholder="e.g. https://forms.gle/..."
                  value={link} 
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-[#18181b]/30 border border-[#FFDE00]/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFDE00]/50 text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                💡 Students clicking "Register" on the symposium directory will be immediately redirected to this link to fill out the external reservation form. Local RSVP seating capacity limits and custom registration fields will be skipped.
              </p>
            </div>
          )}

          {/* Cov Photo Snap upload */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ImageIcon size={10} className="text-[#FFDE00]" /> Event Cover Artwork Image
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-24 h-24 rounded-xl border border-white/10 bg-black/40 overflow-hidden shrink-0 flex items-center justify-center relative text-gray-500">
                {image ? (
                  <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <ImageIcon size={20} />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full border-2 border-[#FFDE00] border-t-transparent animate-spin"></span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/10 hover:border-[#FFDE00]/40 rounded-xl hover:bg-white/5 cursor-pointer text-white transition-all text-center">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLocalFileUpload} />
                  <UploadCloud size={20} className="text-[#FFDE00] mb-1.5" />
                  <span className="text-xs font-semibold text-white">Upload Flyer / Cover Artwork</span>
                  <span className="text-[10px] text-gray-500 mt-1 uppercase font-mono tracking-wider">Device storage image format</span>
                </label>
              </div>
            </div>
          </div>

          {/* RSVP and Registration Options (Only for standard interactive calendar events) */}
          {!isExternalEvent && (
            <>
              {/* RSVP configuration */}
              <div className="bg-[#18181b]/20 border border-white/5 rounded-2xl p-5 space-y-4">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rsvpEnabled} 
                    onChange={(e) => setRsvpEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-white/10 bg-black accent-[#FFDE00] mt-0.5"
                  />
                  <div>
                    <p className="font-bold text-white text-sm">Limit Audience Seating (RSVP Track)</p>
                    <p className="text-[11px] text-gray-400 leading-snug mt-0.5">Maintain limits on seats for physical workshop capacity safety guidelines.</p>
                  </div>
                </label>

                {rsvpEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 animate-fade-in text-left">
                    <div>
                      <label className="block text-[9.5px] font-mono text-gray-400 uppercase font-black mb-1.5">Max Seat Capacity</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 100" 
                        value={seats} 
                        onChange={(e) => setSeats(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-mono text-gray-400 uppercase font-black mb-1.5">Registration Status</label>
                      <button 
                        type="button"
                        onClick={() => setRegistrationStatus(prev => prev === "OPEN" ? "CLOSED" : "OPEN")}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border cursor-pointer ${registrationStatus === "OPEN" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}
                      >
                        {registrationStatus}
                      </button>
                    </div>
                  </div>
                )}

                <div className="h-px bg-white/5 w-full my-3" />

                <label className="flex items-start gap-3.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={requireApproval} 
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="w-5 h-5 rounded border-white/10 bg-black accent-[#FFDE00] mt-0.5"
                  />
                  <div>
                    <p className="font-bold text-white text-sm">Require Direct Admin Approval</p>
                    <p className="text-[11px] text-gray-400 leading-snug mt-0.5">If checked, applicants are initially listed as 'pending' until approved in the event management logs.</p>
                  </div>
                </label>
              </div>

              {/* Custom RSVP Fields questions (Dynamic Form Builder) */}
              <div className="bg-[#18181b]/20 border border-white/5 rounded-2xl p-5 space-y-5 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-sm">Custom Registration Form Fields</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Define custom questions to collect precise student information upon registration RSVP.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ: CustomQuestion = {
                        id: `q_${Date.now()}`,
                        label: "",
                        type: "text",
                        required: true
                      };
                      setCustomQuestions([...customQuestions, newQ]);
                    }}
                    className="flex items-center gap-1 text-[10px] sm:text-xs font-mono font-bold bg-[#FFDE00]/10 border border-[#FFDE00]/30 hover:bg-[#FFDE00] hover:text-black transition-all text-[#FFDE00] px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    <Plus size={12} /> Add Field
                  </button>
                </div>

                {customQuestions.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-white/5 rounded-xl text-gray-500 text-[11px]">
                    No custom questions configured. Only standard Name and Email fields will be requested.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customQuestions.map((q, idx) => (
                      <div key={q.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-black/30 p-3 sm:p-4 rounded-xl border border-white/5">
                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            placeholder="Question label (e.g. Matriculation ID)"
                            value={q.label}
                            onChange={(e) => {
                              const updated = [...customQuestions];
                              updated[idx].label = e.target.value;
                              setCustomQuestions(updated);
                            }}
                            className="w-full bg-[#18181b]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const updated = [...customQuestions];
                              updated[idx].type = e.target.value as any;
                              setCustomQuestions(updated);
                            }}
                            className="bg-[#18181b] border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white cursor-pointer"
                          >
                            <option value="text">Short Text</option>
                            <option value="number">Number</option>
                            <option value="email">Email Address</option>
                            <option value="checkbox">Checkbox (Yes/No)</option>
                          </select>

                          <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => {
                                const updated = [...customQuestions];
                                updated[idx].required = e.target.checked;
                                setCustomQuestions(updated);
                              }}
                              className="rounded border-white/10 bg-black accent-[#FFDE00] w-4 h-4"
                            />
                            <span className="text-[10px] font-mono text-gray-400 uppercase">Req</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = customQuestions.filter((_, i) => i !== idx);
                              setCustomQuestions(updated);
                            }}
                            className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-lg hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                            title="Remove question field"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between gap-3 shrink-0">
          {selectedEvent && onDelete && (
            <button 
              type="button" 
              onClick={() => onDelete(selectedEvent.id)}
              className="px-5 py-3.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-mono uppercase font-black transition-colors cursor-pointer"
            >
              Delete Event
            </button>
          )}
          <div className="flex gap-2.5 ml-auto">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-mono uppercase font-bold transition-all cursor-pointer bg-black/20"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3.5 rounded-xl bg-[#FFDE00] text-black font-extrabold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-lg shadow-black/40"
            >
              <Check size={14} /> Save Assembly Event
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
