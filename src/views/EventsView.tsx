import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { fbfs, auth, db } from "../lib/firebase";
import { Event, EventRegistration } from "../types";
import { runTransaction, doc } from "firebase/firestore";
import { fetchAndRenderEmailTemplate } from "../utils/emailHelper";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Share2, 
  X, 
  Check, 
  Ticket, 
  QrCode, 
  Loader2
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";

export function Minimap({ googleMapsLink, className = "w-full h-32 rounded-xl overflow-hidden border border-white/5 shadow-inner" }: { googleMapsLink?: string, className?: string }) {
  return null;
}

export function EventsView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeTab, setTimeTab] = useState<"upcoming" | "past" | "registered">("upcoming");
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Registration and Authentication simulation states
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [justRegisteredEventTitle, setJustRegisteredEventTitle] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Share Modal State
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string; category: "Event" | "Bulletin" | "Portfolio" }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Event"
  });

  // Dynamic Full Registration Form states supporting Year of study and other admin configured fields
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regYear, setRegYear] = useState("Year 1");
  const [regGender, setRegGender] = useState("Male");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedEvent) {
      setIsRegistering(false);
      setRegName(currentUser?.displayName || "");
      setRegEmail(currentUser?.email || "");
      setRegYear("Year 1");
      setRegGender("Male");
      setCustomFields({});
    }
  }, [selectedEvent, currentUser]);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen to search events
  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const customEvent = e as unknown as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    window.addEventListener("global-search", handleGlobalSearch as EventListener);
    return () => window.removeEventListener("global-search", handleGlobalSearch as EventListener);
  }, []);

  // Fetch all active published events and registrations
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const rawEvents = await fbfs.getCollection<Event>("events");
      // filter safe active items
      const activeList = rawEvents.filter(e => e.published !== false && e.status !== "cancelled");
      setEvents(activeList);

      if (auth.currentUser) {
        const userRegs = await fbfs.getCollection<EventRegistration>("eventRegistrations", [
          ["userId", "==", auth.currentUser.uid]
        ]);
        const ids = userRegs.map(r => r.eventId);
        setRegisteredEventIds(ids);

        const filterMyRegs = activeList.filter(e => ids.includes(e.id));
        setRegisteredEvents(filterMyRegs);
      } else {
        setRegisteredEventIds([]);
        setRegisteredEvents([]);
      }
    } catch (err) {
      console.error("Error loading events lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentUser]);

  // Check for shared event id in query parameters
  useEffect(() => {
    if (events.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get("id");
      if (sharedId) {
        const matched = events.find(e => e.id === sharedId);
        if (matched) {
          setSelectedEvent(matched);
        }
      }
    }
  }, [events]);

  // Date Parsing helper
  const getEventTime = (e: Event) => {
    return e.startDate?.seconds ? e.startDate.seconds * 1000 : new Date(e.startDate).getTime();
  };

  // Filter events based on active tab and search query
  const runFilter = (list: Event[]) => {
    return list.filter(e => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const mTitle = e.title?.toLowerCase().includes(q);
        const mCat = e.category?.toLowerCase().includes(q);
        const mVenue = e.venue?.toLowerCase().includes(q);
        if (!mTitle && !mCat && !mVenue) return false;
      }
      return true;
    });
  };

  const now = Date.now();

  const upcomingList = runFilter(
    events
      .filter(e => getEventTime(e) >= now - 12 * 60 * 60 * 1000)
      .sort((a, b) => getEventTime(a) - getEventTime(b))
  );

  const pastList = runFilter(
    events
      .filter(e => getEventTime(e) < now - 12 * 60 * 60 * 1000)
      .sort((a, b) => getEventTime(b) - getEventTime(a))
  );

  const myTicketsList = runFilter(registeredEvents);

  const activeDisplayList = 
    timeTab === "upcoming" ? upcomingList :
    timeTab === "past" ? pastList :
    myTicketsList;

  // Group events by Month dynamically
  const groupEventsByMonth = (list: Event[]) => {
    const groups: { [key: string]: Event[] } = {};
    list.forEach(e => {
      const date = new Date(getEventTime(e));
      const monthLabel = date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!groups[monthLabel]) groups[monthLabel] = [];
      groups[monthLabel].push(e);
    });
    return groups;
  };

  const groupedEvents = groupEventsByMonth(activeDisplayList);

  const handleRsvpSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const isGuest = !currentUser;
    const finalUserId = isGuest 
      ? `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` 
      : currentUser!.uid;

    const finalUserName = regName.trim();
    const finalUserEmail = regEmail.trim();

    if (!finalUserName || !finalUserEmail) {
      triggerToast("Delegate name and email address are mandatory.", "error");
      return;
    }

    setRsvpLoading(true);
    try {
      const eventId = selectedEvent.id;
      const eventRef = doc(db, "events", eventId);
      const regId = `${eventId}_${finalUserId}`;
      const regRef = doc(db, "eventRegistrations", regId);

      const computedApprovalStatus = selectedEvent.requireApproval ? 'pending' : 'approved';

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(eventRef);
        if (!snap.exists()) {
          throw new Error("Assembly record does not exist.");
        }

        const data = snap.data() as Event;
        const cap = Number(data.capacity || 0);
        const rCount = Number(data.registeredCount || 0);

        if (cap > 0 && rCount >= cap) {
          throw new Error("This assembly is fully booked.");
        }

        // Write registration doc
        transaction.set(regRef, {
          id: regId,
          eventId,
          userId: finalUserId,
          userName: finalUserName,
          userEmail: finalUserEmail,
          yearOfStudy: regYear,
          gender: regGender,
          approvalStatus: computedApprovalStatus,
          customFields: customFields, // custom responses
          createdAt: new Date()
        });

        // Update counts
        transaction.update(eventRef, {
          registeredCount: rCount + 1
        });
      });

      // TRIGGER EMAIL DISPATCH ON EXPRESS BACKEND!
      try {
        const eventDateStr = selectedEvent.startDate?.seconds 
          ? new Date(selectedEvent.startDate.seconds * 1000).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
          : new Date(selectedEvent.startDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
        
        const fullEventDate = `${eventDateStr} @ ${selectedEvent.startTime || "10:00 AM"}`;
        
        const rendered = await fetchAndRenderEmailTemplate("event_registration", {
          applicantName: finalUserName,
          applicantEmail: finalUserEmail,
          eventTitle: selectedEvent.title,
          eventDate: fullEventDate,
          eventVenue: selectedEvent.venue || "Courtroom Auditorium"
        });

        await fetch("/api/send-event-registration-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicantEmail: finalUserEmail,
            applicantName: finalUserName,
            eventTitle: selectedEvent.title,
            eventDate: fullEventDate,
            eventVenue: selectedEvent.venue || "Courtroom Auditorium",
            customFields: {
              "Year of Study": regYear,
              "Gender": regGender,
              ...customFields
            },
            customSubject: rendered?.customSubject || undefined,
            customHtml: rendered?.customHtml || undefined
          })
        });
      } catch (mailErr) {
        console.error("Non-blocking error dispatching registration email feedback:", mailErr);
      }

      // Update local state
      setRegisteredEventIds(prev => [...prev, eventId]);
      await fetchAllData();

      // Open dynamic success dialog
      setJustRegisteredEventTitle(selectedEvent.title);
      setSelectedEvent(null);
      setIsSuccessModalOpen(true);

      // Reset guest variables
      setRegName("");
      setRegEmail("");
      setRegYear("Year 1");
      setRegGender("Male");
      setCustomFields({});
      setIsRegistering(false);
    } catch (err: any) {
      triggerToast(err.message || "Registration failed. Try again.", "error");
    } finally {
      setRsvpLoading(false);
    }
  };

  const triggerClipboardShare = (eUrl: string) => {
    navigator.clipboard.writeText(eUrl);
    triggerToast("Event link copied to clipboard!");
  };

  return (
    <div className="relative min-h-[80vh] w-full select-none text-left font-sans pb-40">
      
      {/* Background Decorative Ambient Blobs exactly matching HTML template */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-radial from-violet-500/10 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-radial from-yellow-500/5 to-transparent rounded-full blur-[80px] pointer-events-none -z-10 animate-blob" />
      
      {/* Active toast popup */}
      {toast && (
        <div className={`fixed top-24 right-6 z-[200] max-w-sm p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all duration-300 ${toast.type === "success" ? "bg-[#121212] border-green-500/30 text-green-400" : "bg-[#121212] border-red-500/30 text-red-400"}`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-green-500" : "bg-red-500"} animate-pulse`}></div>
          <p className="text-xs font-mono font-bold">{toast.message}</p>
        </div>
      )}

      {/* Main Container Header */}
      <section className="space-y-6 pt-6">
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight uppercase">Events</h1>
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-8 border-b border-white/10 font-sans font-bold text-sm">
          <button 
            type="button"
            onClick={() => setTimeTab("upcoming")}
            className={`pb-4 transition-colors cursor-pointer relative ${
              timeTab === "upcoming" 
                ? "text-gavel-yellow border-b-2 border-gavel-yellow font-bold" 
                : "text-gavel-muted hover:text-white border-b-2 border-transparent"
            }`}
          >
            Upcoming
          </button>
          
          <button 
            type="button"
            onClick={() => setTimeTab("past")}
            className={`pb-4 transition-colors cursor-pointer relative ${
              timeTab === "past" 
                ? "text-gavel-yellow border-b-2 border-gavel-yellow font-bold" 
                : "text-gavel-muted hover:text-white border-b-2 border-transparent"
            }`}
          >
            Past
          </button>
          
          <button 
            type="button"
            onClick={() => setTimeTab("registered")}
            className={`pb-4 transition-colors cursor-pointer relative ${
              timeTab === "registered" 
                ? "text-gavel-yellow border-b-2 border-gavel-yellow font-bold" 
                : "text-gavel-muted hover:text-white border-b-2 border-transparent"
            }`}
          >
            My Tickets
          </button>
        </div>
      </section>

      {/* Loader UI */}
      {loading ? (
        <div className="space-y-8 py-16 text-center">
          <div className="flex justify-center items-center gap-2">
            <Loader2 className="animate-spin text-gavel-yellow" size={24} />
            <span className="text-xs font-mono text-gavel-muted uppercase tracking-wider font-bold">Synchronizing Node Calendar...</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-30">
            {[1, 2, 3].map(item => (
              <div key={item} className="p-5 rounded-3xl border border-white/5 bg-[#121212]/80 h-32 flex items-center" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          
          {/* TAB 1: UPCOMING & TAB 2: PAST */}
          {timeTab !== "registered" && (
            <>
              {Object.keys(groupedEvents).length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl max-w-md mx-auto bg-black/20">
                  <Ticket className="text-gavel-muted mx-auto mb-3" size={24} />
                  <p className="text-gavel-muted text-xs font-mono uppercase tracking-widest font-black">No records available</p>
                  <p className="text-xs text-gavel-muted mt-2">Adjust search terms or visit again later for symposium schedules.</p>
                </div>
              ) : (
                Object.keys(groupedEvents).map(monthLabel => (
                  <div key={monthLabel} className="space-y-6">
                    {/* Sticky Period/Month Header Panel */}
                    <div className="sticky top-16 z-20 bg-[#050505]/90 backdrop-blur-md py-4 border-b border-white/10 flex justify-between items-center sm:mx-0">
                      <h3 className="text-xs font-mono tracking-widest text-[#FFDE00] uppercase font-bold">{monthLabel}</h3>
                      <span className="text-[10px] text-gavel-muted bg-white/5 px-2 py-1 rounded border border-white/5 font-mono uppercase font-black">
                        {groupedEvents[monthLabel].length} {groupedEvents[monthLabel].length === 1 ? "Event" : "Events"}
                      </span>
                    </div>

                    {/* Timeline List of Luma-style card elements */}
                    <div className="space-y-3">
                      {groupedEvents[monthLabel].map(e => {
                        const dateObj = new Date(getEventTime(e));
                        const monthAbbr = dateObj.toLocaleDateString(undefined, { month: "short" });
                        const dayNum = dateObj.toLocaleDateString(undefined, { day: "numeric" });
                        const isPastEv = timeTab === "past";

                        return (
                          <div 
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className={`flex flex-col sm:flex-row gap-5 p-4 sm:p-5 rounded-3xl border transition-all duration-300 group items-start sm:items-center cursor-pointer ${
                              isPastEv 
                                ? "bg-[#121212]/30 border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-[#1a1a1a]/80"
                                : "bg-[#121212]/80 border-white/5 hover:border-white/15 hover:bg-[#1a1a1a]"
                            }`}
                          >
                            {/* Left-aligned elegant Luma Date Block */}
                            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border transition-colors shrink-0 shadow-inner group-hover:bg-[#FFDE00] group-hover:border-[#FFDE00] ${
                              isPastEv
                                ? "bg-[#1a1a1a]/50 border-white/5" 
                                : "bg-[#1a1a1a] border-white/10"
                            }`}>
                              <span className="text-[9px] text-gavel-muted font-mono uppercase tracking-widest group-hover:text-black leading-none">{monthAbbr}</span>
                              <span className="text-lg font-black text-white group-hover:text-black leading-none mt-0.5">{dayNum}</span>
                            </div>

                            {/* Center title and contextual tags */}
                            <div className="flex-grow space-y-1 w-full text-left">
                              <div className="flex justify-between items-start w-full">
                                <h4 className="text-base sm:text-lg font-extrabold text-white group-hover:text-gavel-yellow transition-colors line-clamp-1">
                                  {e.title}
                                </h4>
                                {e.eventType && (
                                  <span className="bg-white/5 text-gavel-muted text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-white/5 shrink-0 ml-2">
                                    {e.eventType}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-gavel-muted font-sans font-medium">
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <Clock size={12} /> {e.startTime || "10:00 AM"}
                                </span>
                                <span className="flex items-center gap-1.5 truncate">
                                  <MapPin size={12} className="shrink-0" /> <span className="truncate">{e.venue || "Campus Auditorium"}</span>
                                </span>
                              </div>

                              {e.description && (
                                <p className="text-xs text-gavel-muted line-clamp-2 mt-1.5 leading-relaxed font-sans max-w-xl">
                                  {e.description}
                                </p>
                              )}
                            </div>


                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* TAB 3: REGISTERED TICKETS */}
          {timeTab === "registered" && (
            <div className="space-y-6">
              {!currentUser ? (
                <div className="flex flex-col items-center justify-center text-center py-24 space-y-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-2">
                    <Ticket className="w-8 h-8 text-gavel-muted" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Your Tickets</h3>
                  <p className="text-sm text-gavel-muted">Sign in with Google or student credentials to access all dynamic event reservations and digital entry tickets instantly.</p>
                  <Link href="/auth?redirect=/events">
                    <span className="inline-block mt-4 bg-white hover:bg-gray-250 text-black font-extrabold text-xs tracking-widest uppercase px-6 py-3 rounded-full transition-colors shadow-lg cursor-pointer">
                      Sign In To System
                    </span>
                  </Link>
                </div>
              ) : myTicketsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 space-y-4 max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-full bg-gavel-purple/10 flex items-center justify-center border border-gavel-purple/20 mb-2">
                    <Ticket className="w-8 h-8 text-gavel-purple" />
                  </div>
                  <h3 className="text-xl font-bold text-white">No Upcoming Tickets</h3>
                  <p className="text-sm text-gavel-muted">You haven't reserved any upcoming symposium delegate seats yet. Explore the upcoming feeds to register!</p>
                  <button 
                    type="button"
                    onClick={() => setTimeTab("upcoming")}
                    className="mt-4 bg-[#1a1a1a] border border-white/10 hover:bg-white hover:text-black hover:border-white text-white px-6 py-2.5 rounded-full text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Browse Symposiums
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Registrations ({myTicketsList.length})</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myTicketsList.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-gavel-card border border-white/15 rounded-3xl p-5 flex items-center justify-between shadow-xl relative overflow-hidden group hover:border-[#FFDE00]/30 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-inner">
                            <Check className="w-6 h-6 text-green-400" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-white font-extrabold text-sm sm:text-base line-clamp-1">{item.title}</h4>
                            <p className="text-green-400 text-[10px] font-mono uppercase tracking-wider mt-0.5">RSVP Seats Secured</p>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => setSelectedEvent(item)}
                          className="bg-[#1a1a1a] hover:bg-white hover:text-black border border-white/10 px-4 py-2 rounded-xl text-xs font-mono font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
                        >
                          View E-Pass
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================== */}
      {/* 4. DETAIL MODAL DIALOG (Luma Style Overlay) */}
      {/* ========================================== */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 pb-0 select-none">
          {/* Backdrop Mask */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer" 
            onClick={() => setSelectedEvent(null)}
          />
          
          <div className="bg-[#121214] sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] relative z-10 flex flex-col overflow-hidden shadow-2xl animate-slide-up">
            
            {/* Upper Right Action Rails */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <button 
                type="button"
                onClick={() => setShareData({
                  isOpen: true,
                  url: `https://studenthubmku.xyz/events?id=${selectedEvent.id}`,
                  title: selectedEvent.title,
                  category: "Event"
                })}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <Share2 size={16} />
              </button>
              <button 
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Container Panel */}
            <div className="overflow-y-auto flex-grow pb-28 text-left">
              {isRegistering ? (
                /* Dynamic Full Registration Form Screen */
                <div className="space-y-6 px-6 sm:px-10 py-8 animate-fade-in">
                  <div className="flex items-center gap-3.5 mb-2 border-b border-white/5 pb-5">
                    <div className="w-11 h-11 rounded-xl bg-gavel-yellow/10 flex items-center justify-center shrink-0 border border-gavel-yellow/20">
                      <Ticket className="text-[#FFDE00]" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">Assemble Attendance Register</h3>
                      <p className="text-[10px] text-gavel-muted font-mono uppercase tracking-wider mt-1.5">For: {selectedEvent.title}</p>
                    </div>
                  </div>

                  <form onSubmit={handleRsvpSubmission} className="space-y-5">
                    {/* Full Name field */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-mono text-[#FFDE00] uppercase font-black tracking-wider">Full Names *</label>
                      <input 
                        type="text"
                        placeholder="Your full legal name"
                        value={regName}
                        onChange={(ev) => setRegName(ev.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FFDE00] transition-colors"
                        required
                      />
                    </div>

                    {/* Email address field */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-mono text-[#FFDE00] uppercase font-black tracking-wider">Email Address (Personal or Student) *</label>
                      <input 
                        type="email"
                        placeholder="e.g. name@gmail.com or name@student.mku.ac.ke"
                        value={regEmail}
                        onChange={(ev) => setRegEmail(ev.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FFDE00] transition-colors"
                        required
                      />
                    </div>

                    {/* Class/Study Demographics select fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono text-[#FFDE00] uppercase font-black tracking-wider">Year of Study *</label>
                        <select 
                          value={regYear}
                          onChange={(ev) => setRegYear(ev.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00] transition-colors cursor-pointer"
                        >
                          <option value="Year 1" className="bg-[#121214]">Year 1 (Freshman)</option>
                          <option value="Year 2" className="bg-[#121214]">Year 2 (Sophomore)</option>
                          <option value="Year 3" className="bg-[#121214]">Year 3 (Junior)</option>
                          <option value="Year 4" className="bg-[#121214]">Year 4 (Senior)</option>
                          <option value="Postgraduate" className="bg-[#121214]">Postgraduate</option>
                          <option value="Representative/Guest" className="bg-[#121214]">Representative / Other</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="block text-[10px] font-mono text-[#FFDE00] uppercase font-black tracking-wider">Gender Demographics *</label>
                        <select 
                          value={regGender}
                          onChange={(ev) => setRegGender(ev.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00] transition-colors cursor-pointer"
                        >
                          <option value="Male" className="bg-[#121214]">Male</option>
                          <option value="Female" className="bg-[#121214]">Female</option>
                          <option value="Prefer not to say" className="bg-[#121214]">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    {/* Admin custom configured question fields if any exist */}
                    {selectedEvent.customQuestions && selectedEvent.customQuestions.length > 0 && (
                      <div className="space-y-5 pt-4 border-t border-white/5 text-left">
                        <p className="text-[10px] font-mono text-gavel-muted uppercase tracking-widest font-black mb-1">Additional Host requirements</p>
                        {selectedEvent.customQuestions.map((q) => (
                          <div key={q.id} className="space-y-1.5">
                            <label className="block text-[10.5px] font-sans text-gray-300 font-bold">
                              {q.label} {q.required && <span className="text-red-400">*</span>}
                            </label>
                            
                            {q.type === 'checkbox' ? (
                              <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
                                <input 
                                  type="checkbox" 
                                  checked={customFields[q.label] === "Yes"}
                                  onChange={(ev) => setCustomFields(prev => ({ ...prev, [q.label]: ev.target.checked ? "Yes" : "No" }))}
                                  className="w-5 h-5 rounded border-white/10 bg-black accent-[#FFDE00]"
                                  required={q.required}
                                />
                                <span className="text-xs text-gavel-muted">Yes, confirm and agree</span>
                              </label>
                            ) : (
                              <input 
                                type={q.type} 
                                placeholder={`Enter response`}
                                value={customFields[q.label] || ""}
                                onChange={(ev) => setCustomFields(prev => ({ ...prev, [q.label]: ev.target.value }))}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FFDE00] transition-colors"
                                required={q.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dynamic Action Buttons in Form */}
                    <div className="flex gap-3 pt-6 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={() => setIsRegistering(false)}
                        className="flex-1 bg-white/5 border border-white/10 text-gray-300 hover:bg-white hover:text-black py-3.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={rsvpLoading}
                        className="flex-1 bg-[#FFDE00] hover:bg-white text-black font-extrabold text-xs font-mono tracking-widest uppercase py-3.5 rounded-xl transition-colors shadow-lg shadow-[#FFDE00]/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {rsvpLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={13} strokeWidth={3} /> Registering...
                          </>
                        ) : (
                          selectedEvent.requireApproval ? "Submit RSVP Request" : "Secure Delegate Pass"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Event Image Banner with Gradient overlay */}
                  <div className="w-full h-60 sm:h-72 relative bg-black">
                    <img 
                      src={selectedEvent.coverImage || "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop"} 
                      className="w-full h-full object-cover opacity-90"
                      referrerPolicy="no-referrer"
                      alt="cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/35 to-transparent pointer-events-none" />
                  </div>

                  {/* Text Info Layout Fields */}
                  <div className="px-6 sm:px-10 -mt-12 relative z-10 space-y-6">
                    <div>
                      <span className="bg-gavel-yellow/10 border border-gavel-yellow/20 text-[#FFDE00] text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap animate-pulse">
                        {selectedEvent.category || "Student Symposium"}
                      </span>
                      
                      <h2 className="text-2xl sm:text-3.5xl font-black text-white leading-tight mb-4 uppercase tracking-tight mt-3">
                        {selectedEvent.title}
                      </h2>
                      
                      {/* Calendar details badge */}
                      <div className="bg-[#1a1a1c] border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg text-xs font-mono uppercase text-gray-300">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-gavel-yellow">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-white font-bold leading-none mt-1">
                              {new Date(getEventTime(selectedEvent)).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-gavel-muted text-[10px] tracking-wider mt-1.5">
                              {selectedEvent.startTime || "10:00 AM"}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : " EAT"}
                            </p>
                          </div>
                        </div>

                        <div className="h-px bg-white/5 w-full" />

                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 text-gavel-purple">
                            <MapPin size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold leading-none mt-1">
                              {selectedEvent.venue || (selectedEvent.isExternal ? "Zoom / Form Registration Link" : "Campus Courtroom Auditorium")}
                            </p>
                            {selectedEvent.googleMapsLink && (
                              <a 
                                href={selectedEvent.googleMapsLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#FFDE00] hover:underline text-[10px] block mt-1 tracking-wide font-sans flex items-center gap-1 font-bold"
                              >
                                📍 View location on maps ↗
                              </a>
                            )}
                            <span className="text-[10px] text-gavel-muted tracking-wider block mt-1.5">{selectedEvent.eventType || "physical"} Campus assembly</span>
                          </div>
                        </div>

                        {selectedEvent.organizerName && (
                          <>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                                <span className="text-[10px] font-mono font-black text-[#FFDE00]">BY</span>
                              </div>
                              <div>
                                <p className="text-white font-bold leading-none mt-1">
                                  {selectedEvent.organizerName}
                                </p>
                                <span className="text-[10px] text-gavel-muted tracking-wider block mt-1.5 font-sans font-bold">Convener & host</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>



                    {/* Event Description Section */}
                    <div>
                      <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">About Assembly</h3>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">
                        {selectedEvent.description || "Official council and academic representative symposium setup designed to synchronize the MKU Law Student community."}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Foot CTA Panel containing RSVP forms inline */}
            {!isRegistering && (
              <div className="absolute bottom-0 w-full bg-[#161618]/95 backdrop-blur-xl border-t border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20">
                <div className="text-left shrink-0">
                  <p className="text-[9px] text-gavel-muted font-mono uppercase tracking-widest font-bold">Access Pass Status</p>
                  <p className="text-white font-black text-base uppercase mt-0.5">
                    {selectedEvent.isExternal ? "External Registration Link" : selectedEvent.unlimited ? "Unlimited access" : selectedEvent.capacity ? `Limit ${selectedEvent.capacity} seats` : "Delegate access"}
                  </p>
                </div>

                <div className="flex-1 max-w-md">
                  {selectedEvent.isExternal ? (
                    <div className="flex justify-end">
                      <a 
                        href={selectedEvent.meetingLink || "#"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-[#FFDE00] hover:bg-white text-black font-extrabold text-[10px] font-mono tracking-widest uppercase px-6 py-4 rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,222,0,0.25)] w-full sm:w-auto text-center"
                      >
                        Fill Registration Form ↗
                      </a>
                    </div>
                  ) : registeredEventIds.includes(selectedEvent.id) ? (
                    <div className="flex items-center gap-2 text-green-400 font-bold justify-end">
                      <span className="p-1 px-3.5 py-2 hover:bg-white/5 border border-white/10 rounded-xl bg-white/[0.02] text-[10px] font-mono uppercase tracking-widest">
                        Registered & Pass Secured
                      </span>
                      <button 
                        type="button"
                        onClick={() => {
                          setJustRegisteredEventTitle(selectedEvent.title);
                          setSelectedEvent(null);
                          setIsSuccessModalOpen(true);
                        }}
                        className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Ticket size={14} /> View E-Pass
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={() => setIsRegistering(true)}
                        className="bg-[#FFDE00] hover:bg-white text-black font-extrabold text-[10px] font-mono tracking-widest uppercase px-8 py-3.5 rounded-full transition-colors shrink-0 shadow-[0_0_15px_rgba(255,222,0,0.2)] cursor-pointer inline-flex items-center gap-2 justify-center w-full sm:w-auto"
                      >
                        Register for Pass
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. RSVP SUCCESS / TICKET popup             */}
      {/* ========================================== */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-pointer" 
            onClick={() => setIsSuccessModalOpen(false)}
          />
          
          <div className="bg-green-500/15 border border-green-500/30 rounded-[2rem] p-8 w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(34,197,94,0.15)] text-center animate-slide-up">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30 text-black">
              <Check className="stroke-[3]" size={30} />
            </div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">You're going!</h2>
            <p className="text-green-400 text-xs font-mono font-bold uppercase tracking-wider mb-6">Delegate Register Confirmed</p>
            
            {/* Elegant physical-looking Ticket card strip */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 text-left mb-6 relative overflow-hidden shadow-2xl">
              {/* Ticket side-notches */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 bg-black rounded-r-full border-r border-y border-white/10" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 bg-black rounded-l-full border-l border-y border-white/10" />
              
              <div className="pl-3.5 pr-3.5">
                <span className="text-[9px] text-[#FFDE00] font-mono uppercase tracking-[0.2em] font-black block mb-1">MKU GAVEL DELEGATE</span>
                <h4 className="text-white font-extrabold text-sm line-clamp-2 uppercase tracking-tight leading-snug">
                  {justRegisteredEventTitle || "Campus Symposium"}
                </h4>
                
                <div className="flex justify-between items-end mt-6 pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[8px] text-gavel-muted font-mono uppercase tracking-widest block">Delegate Holder</span>
                    <span className="text-white text-xs font-bold font-sans mt-0.5 block">{currentUser?.displayName || currentUser?.email?.split("@")[0] || "Verified Student"}</span>
                  </div>
                  <QrCode size={36} className="text-white/45 stroke-[1.5]" />
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setTimeTab("registered");
              }}
              className="w-full bg-white hover:bg-gray-250 text-black font-extrabold text-xs font-mono tracking-widest uppercase py-3.5 rounded-xl transition-colors shadow-lg cursor-pointer"
            >
              View My Tickets
            </button>
          </div>
        </div>
      )}

      {shareData.isOpen && (
        <ShareDialog
          isOpen={shareData.isOpen}
          onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
          url={shareData.url}
          title={shareData.title}
          category={shareData.category}
        />
      )}

    </div>
  );
}
