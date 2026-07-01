import React, { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { fbfs, auth, db } from "../lib/firebase";
import { useAuth } from "../App";
import { Event, EventRegistration, EventRSVP } from "../types";
import { runTransaction, doc } from "firebase/firestore";
import { Calendar, MapPin, Clock, Users, ArrowLeft, ShieldCheck, Mail, Phone, ExternalLink, Share2 } from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";

export function EventDetailsView() {
  const [, params] = useRoute("/events/:id");
  const eventId = params ? (params as any).id : "";
  const [event, setEvent] = useState<Event | null>(null);
  const [registered, setRegistered] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | null>(null);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestGender, setGuestGender] = useState("Male");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [, setLocation] = useLocation();
  const { profile } = useAuth();

  useEffect(() => {
    if (auth.currentUser) {
      setGuestEmail(auth.currentUser.email || "");
      setGuestName(profile?.name || auth.currentUser.displayName || "");
    }
  }, [auth.currentUser, profile]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string; category: "Event" | "Bulletin" | "Portfolio" }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Event"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const loadEventDetails = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const data = await fbfs.getDocById<Event>("events", eventId);
        if (data) {
          setEvent(data);
        }

        if (auth.currentUser) {
          // Check if registered
          const collectionRegs = await fbfs.getCollection<EventRegistration>("eventRegistrations", [
            ["eventId", "==", eventId],
            ["userId", "==", auth.currentUser.uid]
          ]);
          setRegistered(collectionRegs.length > 0);

          // Check RSVP Status
          const rsvpList = await fbfs.getCollection<EventRSVP>("eventRSVPs", [
            ["eventId", "==", eventId],
            ["userId", "==", auth.currentUser.uid]
          ]);
          if (rsvpList.length > 0) {
            setRsvpStatus(rsvpList[0].status);
          }
        }
      } catch (err) {
        console.error("Error setting up details view:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEventDetails();
  }, [eventId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const isGuest = !auth.currentUser;
    const finalUserId = isGuest ? `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` : auth.currentUser!.uid;
    const finalUserName = guestName.trim();
    const finalUserEmail = guestEmail.trim();

    if (!finalUserName || !finalUserEmail) {
      triggerToast("Please provide both name and email to secure a spot.", "error");
      return;
    }

    setRegLoading(true);

    try {
      const eventRef = doc(db, "events", eventId);
      const regId = `${eventId}_${finalUserId}`;
      const regRef = doc(db, "eventRegistrations", regId);

      await runTransaction(db, async (transaction) => {
        const evSnap = await transaction.get(eventRef);
        if (!evSnap.exists()) {
          throw new Error("Assembly record does not exist.");
        }

        const evData = evSnap.data() as Event;
        const capacity = Number(evData.capacity || 0);
        const registeredCount = Number(evData.registeredCount || 0);

        if (capacity > 0 && registeredCount >= capacity) {
          throw new Error("This assembly is fully booked.");
        }

        // Write registration doc
        transaction.set(regRef, {
          id: regId,
          eventId,
          userId: finalUserId,
          userName: finalUserName,
          userEmail: finalUserEmail,
          gender: guestGender,
          customFields: formData,
          createdAt: new Date()
        });

        // Update event counts
        transaction.update(eventRef, {
          registeredCount: registeredCount + 1
        });
      });

      setRegistered(true);
      if (auth.currentUser) {
        setRsvpStatus("going");
      }
      // Reload event counts in state
      const reloadedEvent = await fbfs.getDocById<Event>("events", eventId);
      if (reloadedEvent) setEvent(reloadedEvent);
      triggerToast("Ticket successfully acquired!");
      setGuestName("");
      setGuestEmail("");
    } catch (err: any) {
      triggerToast(err.message || "Registration transaction failed.", "error");
    } finally {
      setRegLoading(false);
    }
  };

  const handleRSVP = async (status: "going" | "interested") => {
    if (!auth.currentUser) {
      setLocation("/auth");
      return;
    }
    if (!event) return;

    try {
      const rsvpId = `${eventId}_${auth.currentUser.uid}`;
      const rsvpRef = doc(db, "eventRSVPs", rsvpId);
      const eventRef = doc(db, "events", eventId);

      await runTransaction(db, async (tx) => {
        const rsvpSnap = await tx.get(rsvpRef);
        const prev = rsvpSnap.exists() ? (rsvpSnap.data() as EventRSVP).status : null;

        const goingInc = (status === "going" ? 1 : 0) - (prev === "going" ? 1 : 0);
        const intInc = (status === "interested" ? 1 : 0) - (prev === "interested" ? 1 : 0);

        tx.set(rsvpRef, {
          id: rsvpId,
          eventId,
          userId: auth.currentUser!.uid,
          status,
          createdAt: rsvpSnap.exists() ? rsvpSnap.data()!.createdAt : new Date(),
          updatedAt: new Date()
        }, { merge: true });

        // Update counts
        const updateObj: Record<string, any> = {};
        if (goingInc !== 0) updateObj.goingCount = (event.goingCount || 0) + goingInc;
        if (intInc !== 0) updateObj.interestedCount = (event.interestedCount || 0) + intInc;

        if (Object.keys(updateObj).length > 0) {
          tx.update(eventRef, updateObj);
        }
      });

      setRsvpStatus(status);
      const reloadedEvent = await fbfs.getDocById<Event>("events", eventId);
      if (reloadedEvent) setEvent(reloadedEvent);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 py-8 animate-pulse">
        <div className="p-5 rounded-3xl border border-gavel-border bg-white/[0.01] flex flex-col gap-3 h-44">
          <div className="h-4 bg-white/10 rounded w-1/4"></div>
          <div className="h-3 bg-white/5 rounded w-3/4"></div>
          <div className="h-3 bg-white/5 rounded w-1/2"></div>
        </div>
        <p className="text-[10px] text-gavel-muted font-mono uppercase tracking-widest text-center">Acquiring Seat Metadata...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-3xl font-black text-white uppercase">Assembly Missing</h2>
        <p className="text-gavel-muted max-w-sm mx-auto">This specific event roster has been archived or does not exist.</p>
        <Link href="/events" className="inline-block px-5 py-2 rounded-xl bg-gavel-yellow hover:bg-white text-black text-xs font-semibold uppercase tracking-wider cursor-pointer">
          Browse Assemblies
        </Link>
      </div>
    );
  }

  const startDateObj = new Date(event.startDate?.seconds ? event.startDate.seconds * 1000 : event.startDate);
  const remainingCapacity = event.capacity ? Number(event.capacity) - Number(event.registeredCount || 0) : null;

  return (
    <div className="space-y-10 py-6 sm:py-8 text-left w-full select-none">
      <div className="flex justify-between items-center w-full">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-gavel-muted hover:text-gavel-yellow text-xs font-mono uppercase tracking-widest font-black cursor-pointer transition-colors duration-200">
          <ArrowLeft size={14} /> Back to Assemblies
        </Link>
        <button
          onClick={() => setShareData({ isOpen: true, url: `https://studenthubmku.xyz/events/${event.id}`, title: event.title, category: "Event" })}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gavel-border bg-gavel-card hover:bg-white hover:text-black hover:border-white rounded-xl text-xs font-mono uppercase tracking-widest font-black cursor-pointer transition-colors duration-150 text-gavel-muted"
        >
          <Share2 size={13} /> Share Event
        </button>
      </div>

      <section className="relative rounded-2xl sm:rounded-[2.5rem] overflow-hidden border border-gavel-border bg-gavel-card p-4 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8 shadow-2xl">
        <div className="w-full md:w-1/2 aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 relative bg-[#1E1E1E]">
          <img src={event.coverImage} className="w-full h-full object-cover brightness-95" loading="lazy" referrerPolicy="no-referrer" alt="event" />
          <span className="absolute top-4 left-4 px-3 py-1 bg-black/80 backdrop-blur border border-white/5 rounded-xl text-xs font-mono text-gavel-yellow uppercase font-bold tracking-widest leading-none">
            {event.category}
          </span>
        </div>

        <div className="flex-1 space-y-4 pr-4">
          <span className="text-[10px] bg-gavel-purple/10 border border-gavel-purple/20 text-gavel-purple font-mono font-bold tracking-widest px-3 py-1.5 rounded-full uppercase leading-none">
            {event.eventType} Entry
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none mt-2">
            {event.title}
          </h1>
          <p className="text-gavel-muted text-xs leading-relaxed">
            {event.subtitle || "Official Court Assembly & Student Council Platform Seminar"}
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gavel-muted pt-2 uppercase">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {startDateObj.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {event.startTime || "10:00 AM"}</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0 max-w-[14px]" /> <span className="line-clamp-1">{event.venue || "Courtroom Auditorium"}</span></span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {event.registeredCount || 0} RSVPs</span>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8 items-start">
        {/* Left main content columns */}
        <div className="md:col-span-2 space-y-8">
          <div className="premium-card rounded-3xl p-8 border border-gavel-border space-y-4 text-left">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">About Assembly</h3>
            
            {(event as any).blocks ? (
              <div className="space-y-4">
                {(() => {
                  try {
                    const parsed = JSON.parse((event as any).blocks);
                    if (Array.isArray(parsed)) {
                      return parsed.map((block: any, idx: number) => {
                        switch (block.type) {
                          case "paragraph":
                            return (
                              <p key={idx} className="text-xs text-gavel-muted leading-relaxed whitespace-pre-wrap">
                                {block.text}
                              </p>
                            );
                          case "heading1":
                            return (
                              <h4 key={idx} className="text-md font-black text-white uppercase tracking-tight mt-6">
                                {block.text}
                              </h4>
                            );
                          case "heading2":
                            return (
                              <h5 key={idx} className="text-sm font-extrabold text-[#eeeeee] uppercase mt-4">
                                {block.text}
                              </h5>
                            );
                          case "heading3":
                            return (
                              <h6 key={idx} className="text-xs font-bold text-gavel-yellow uppercase tracking-wider mt-3">
                                {block.text}
                              </h6>
                            );
                          case "quote":
                            return (
                              <blockquote key={idx} className="border-l-2 border-gavel-yellow pl-4 italic text-gavel-yellow text-xs leading-relaxed">
                                "{block.text}"
                              </blockquote>
                            );
                          case "callout":
                            return (
                              <div key={idx} className="p-3.5 bg-gavel-yellow/5 border border-gavel-yellow/15 text-gavel-yellow rounded-xl text-xs font-semibold leading-relaxed">
                                {block.text}
                              </div>
                            );
                          case "image":
                            return block.imageUrl ? (
                              <img key={idx} src={block.imageUrl} className="rounded-xl border border-white/5 w-full my-4 max-h-[260px] object-cover" referrerPolicy="no-referrer" alt="" />
                            ) : null;
                          case "divider":
                            return <hr key={idx} className="border-t border-gavel-border/50 my-4" />;
                          default:
                            return null;
                        }
                      });
                    }
                  } catch (e) {
                    console.warn("Event block parse error:", e);
                  }
                  return (
                    <p className="text-gavel-muted text-sm leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-gavel-muted text-sm leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            )}
          </div>

          <div className="premium-card rounded-3xl p-8 border border-gavel-border space-y-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Organized By</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-gavel-border bg-gavel-card flex items-center justify-center font-bold font-mono text-gavel-yellow uppercase">
                {event.organizerName.charAt(0)}
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white uppercase text-sm leading-tight">{event.organizerName}</h4>
                <p className="text-[10px] text-gavel-muted font-mono uppercase tracking-widest font-bold mt-1">Sponsoring Convener</p>
              </div>
            </div>
            {(event.organizerEmail || event.organizerPhone) && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gavel-border/50 text-xs font-mono text-gavel-muted uppercase font-semibold">
                {event.organizerEmail && <span className="flex items-center gap-2"><Mail size={14} /> {event.organizerEmail}</span>}
                {event.organizerPhone && <span className="flex items-center gap-2"><Phone size={14} /> {event.organizerPhone}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Right RSVP and Ticket registers widgets */}
        <div className="space-y-6">
          <div className="premium-card rounded-3xl p-8 border border-gavel-border/85 space-y-6">
            <h3 className="text-sm font-mono text-white uppercase tracking-wider font-bold">Registration Seat Hub</h3>

            {registered ? (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl border border-green-500/10 bg-green-500/5 flex flex-col items-center gap-1.5 text-xs text-green-400 font-medium leading-relaxed uppercase font-mono">
                  <ShieldCheck size={20} className="text-green-400" /> Room Spot Secured!
                </div>
                <p className="text-xs text-gavel-muted">
                  Your entry is approved. Report to <strong className="text-white">{event.venue}</strong> around <strong className="text-white">{event.startTime || "9:45 AM"}</strong> for roll check-in.
                </p>
              </div>
            ) : remainingCapacity !== null && remainingCapacity <= 0 ? (
              <div className="p-4 rounded-2xl border border-gavel-danger/10 bg-gavel-danger/5 text-center text-xs text-gavel-danger font-medium leading-relaxed uppercase font-mono">
                Roster Fully Booked
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {remainingCapacity !== null && (
                  <div className="flex justify-between text-xs font-mono text-gavel-muted uppercase font-bold">
                    <span>Availability</span>
                    <span className="text-gavel-yellow">{remainingCapacity} Seats Left / {event.capacity} Total</span>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1.5 font-bold">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Felix Kiprop"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-[#0E0E0E] text-white border border-gavel-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gavel-yellow/30 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1.5 font-bold">
                      Email address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@gmail.com or name@student.ac.ke"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-[#0E0E0E] text-white border border-gavel-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gavel-yellow/30 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1.5 font-bold">
                      Gender *
                    </label>
                    <select
                      value={guestGender}
                      onChange={(e) => setGuestGender(e.target.value)}
                      className="w-full bg-[#0E0E0E] text-white border border-gavel-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gavel-yellow/30 font-sans cursor-pointer"
                    >
                      <option value="Male" className="bg-[#121214]">Male</option>
                      <option value="Female" className="bg-[#121214]">Female</option>
                      <option value="Prefer not to say" className="bg-[#121214]">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Optional custom fields */}
                {event.customQuestions && event.customQuestions.length > 0 && (
                  <div className="space-y-4 pt-3 border-t border-gavel-border/30">
                    <p className="text-[10px] font-mono font-bold text-gavel-yellow uppercase tracking-widest mb-2.5">
                      Information Required for entry
                    </p>
                    {event.customQuestions.map((q) => (
                      <div key={q.id} className="space-y-1.5 text-left">
                        <label className="block text-xs font-semibold text-white">
                          {q.label} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        {q.type === "checkbox" ? (
                          <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gavel-border bg-black/40 hover:bg-black/20 transition-all select-none">
                            <input
                              type="checkbox"
                              required={q.required}
                              checked={!!formData[q.id]}
                              onChange={(e) => setFormData({ ...formData, [q.id]: e.target.checked ? "Yes" : "" })}
                              className="w-4 h-4 rounded border-gavel-border bg-black accent-gavel-yellow cursor-pointer"
                            />
                            <span className="text-xs text-gavel-muted font-medium">I confirm / agree to this statement</span>
                          </label>
                        ) : (
                          <input
                            type={q.type}
                            required={q.required}
                            placeholder={q.type === "email" ? "e.g. name@student.ac.ke" : q.type === "number" ? "e.g. 12948" : "Enter answer..."}
                            value={formData[q.id] || ""}
                            onChange={(e) => setFormData({ ...formData, [q.id]: e.target.value })}
                            className="w-full bg-[#0E0E0E] text-white border border-gavel-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gavel-yellow/30 font-sans"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full bg-gavel-yellow hover:bg-white text-black font-semibold text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all duration-300 shadow-xl shadow-gavel-yellow/10 cursor-pointer"
                >
                  {regLoading ? "Securing Spot..." : "Acquire Ticket Seat"}
                </button>
              </form>
            )}

            {/* Quick RSVP Support Button */}
            <div className="pt-4 border-t border-gavel-border/50 space-y-3">
              <span className="block text-left text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider">
                Support assembly status
              </span>
              {auth.currentUser ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRSVP("going")}
                    className={`py-2 px-3 rounded-lg border text-[10px] font-mono uppercase tracking-widest font-bold cursor-pointer transition-all ${rsvpStatus === "going" ? "bg-gavel-yellow/10 border-gavel-yellow text-gavel-yellow" : "border-gavel-border text-gavel-muted hover:text-white"}`}
                  >
                    Going
                  </button>
                  <button
                    onClick={() => handleRSVP("interested")}
                    className={`py-2 px-3 rounded-lg border text-[10px] font-mono uppercase tracking-widest font-bold cursor-pointer transition-all ${rsvpStatus === "interested" ? "bg-cl-yellow/10 border-gavel-purple text-gavel-purple bg-gavel-purple/10" : "border-gavel-border text-gavel-muted hover:text-white"}`}
                  >
                    Interested
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-gavel-muted italic">
                  RSVP stats are reserved for authenticated vendors and admins. Students should secure tickets above.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl border bg-[#0F0F0F]/90 backdrop-blur-xl shadow-2xl text-xs font-medium max-w-sm border-gavel-border text-white animate-fade-in">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-gavel-danger'}`}></div>
          <p className="flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-[10px] text-gavel-muted hover:text-white ml-2">Dismiss</button>
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
