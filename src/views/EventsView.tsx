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
  Loader2,
  Search,
  ArrowRight,
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";

export function Minimap({
  googleMapsLink,
  className = "w-full h-32 rounded-xl overflow-hidden border border-white/5 shadow-inner",
}: {
  googleMapsLink?: string;
  className?: string;
}) {
  return null;
}

export function EventsView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeTab, setTimeTab] = useState<"upcoming" | "past" | "registered">(
    "upcoming",
  );
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [justRegisteredEventTitle, setJustRegisteredEventTitle] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category: "Event" | "Bulletin" | "Portfolio";
  }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Event",
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regYear, setRegYear] = useState("Year 1");
  const [regGender, setRegGender] = useState("Male");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [activeCategory, setActiveCategory] = useState<string>("all");

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

  // Lock body scroll when a full-page mobile detail is open
  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedEvent]);

  const triggerToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const customEvent = e as unknown as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    window.addEventListener(
      "global-search",
      handleGlobalSearch as EventListener,
    );
    return () =>
      window.removeEventListener(
        "global-search",
        handleGlobalSearch as EventListener,
      );
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const rawEvents = await fbfs.getCollection<Event>("events");
      const activeList = rawEvents.filter(
        (e) => e.published !== false && e.status !== "cancelled",
      );
      setEvents(activeList);

      if (auth.currentUser) {
        const userRegs = await fbfs.getCollection<EventRegistration>(
          "eventRegistrations",
          [["userId", "==", auth.currentUser.uid]],
        );
        const ids = userRegs.map((r) => r.eventId);
        setRegisteredEventIds(ids);

        const filterMyRegs = activeList.filter((e) => ids.includes(e.id));
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

  useEffect(() => {
    if (events.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get("id");
      if (sharedId) {
        const matched = events.find((e) => e.id === sharedId);
        if (matched) {
          setSelectedEvent(matched);
        }
      }
    }
  }, [events]);

  const getEventTime = (e: Event) => {
    return e.startDate?.seconds
      ? e.startDate.seconds * 1000
      : new Date(e.startDate).getTime();
  };

  const runFilter = (list: Event[]) => {
    return list.filter((e) => {
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
      .filter((e) => getEventTime(e) >= now - 12 * 60 * 60 * 1000)
      .sort((a, b) => getEventTime(a) - getEventTime(b)),
  );

  const pastList = runFilter(
    events
      .filter((e) => getEventTime(e) < now - 12 * 60 * 60 * 1000)
      .sort((a, b) => getEventTime(b) - getEventTime(a)),
  );

  const myTicketsList = runFilter(registeredEvents);

  const activeDisplayList =
    timeTab === "upcoming"
      ? upcomingList
      : timeTab === "past"
        ? pastList
        : myTicketsList;

  const groupEventsByMonth = (list: Event[]) => {
    const groups: { [key: string]: Event[] } = {};
    list.forEach((e) => {
      const date = new Date(getEventTime(e));
      const monthLabel = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      if (!groups[monthLabel]) groups[monthLabel] = [];
      groups[monthLabel].push(e);
    });
    return groups;
  };

  const groupedEvents = groupEventsByMonth(activeDisplayList);

  const heroEvent =
    upcomingList.length > 0
      ? upcomingList[0]
      : events.length > 0
        ? [...events].sort((a, b) => getEventTime(b) - getEventTime(a))[0]
        : null;

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

      const computedApprovalStatus = selectedEvent.requireApproval
        ? "pending"
        : "approved";

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

        transaction.set(regRef, {
          id: regId,
          eventId,
          userId: finalUserId,
          userName: finalUserName,
          userEmail: finalUserEmail,
          yearOfStudy: regYear,
          gender: regGender,
          approvalStatus: computedApprovalStatus,
          customFields: customFields,
          createdAt: new Date(),
        });

        transaction.update(eventRef, {
          registeredCount: rCount + 1,
        });
      });

      try {
        const eventDateStr = selectedEvent.startDate?.seconds
          ? new Date(selectedEvent.startDate.seconds * 1000).toLocaleDateString(
              undefined,
              {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              },
            )
          : new Date(selectedEvent.startDate).toLocaleDateString(undefined, {
              weekday: "short",
              month: "long",
              day: "numeric",
              year: "numeric",
            });

        const fullEventDate = `${eventDateStr} @ ${
          selectedEvent.startTime || "10:00 AM"
        }`;

        const rendered = await fetchAndRenderEmailTemplate(
          "event_registration",
          {
            applicantName: finalUserName,
            applicantEmail: finalUserEmail,
            eventTitle: selectedEvent.title,
            eventDate: fullEventDate,
            eventVenue: selectedEvent.venue || "Courtroom Auditorium",
          },
        );

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
              Gender: regGender,
              ...customFields,
            },
            customSubject: rendered?.customSubject || undefined,
            customHtml: rendered?.customHtml || undefined,
          }),
        });
      } catch (mailErr) {
        console.error(
          "Non-blocking error dispatching registration email feedback:",
          mailErr,
        );
      }

      setRegisteredEventIds((prev) => [...prev, eventId]);
      await fetchAllData();

      setJustRegisteredEventTitle(selectedEvent.title);
      setSelectedEvent(null);
      setIsSuccessModalOpen(true);

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

  const filterCategories = [
    { key: "all", label: "All" },
    { key: "academic", label: "Academic" },
    { key: "moot", label: "Moot Court" },
    { key: "debate", label: "Debate" },
    { key: "career", label: "Careers" },
    { key: "social", label: "Social" },
  ];

  const categoryMatches = (e: Event) => {
    if (activeCategory === "all") return true;
    const cat = (e.category || "").toLowerCase();
    if (activeCategory === "moot") {
      return cat.includes("moot") || cat.includes("court");
    }
    if (activeCategory === "career") {
      return cat.includes("career");
    }
    return cat.includes(activeCategory);
  };

  const visibleDisplayList = activeDisplayList.filter(categoryMatches);
  const visibleGrouped = groupEventsByMonth(visibleDisplayList);

  return (
    <div
      className="events-page font-sans"
      style={{
        width: "100vw",
        maxWidth: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        marginTop: "-3rem",
        paddingTop: "3rem",
        minHeight: "100vh",
      }}
    >
      {/* =========================================================
          THEME VARIABLES
          Light is default. Dark kicks in when ancestor has .dark,
          .dark-mode, or [data-theme="dark"].
      ========================================================= */}
      <style>{`
        .events-page {
          /* LIGHT */
          --ev-bg: #ffffff;
          --ev-section-bg: #f5f7fa;
          --ev-surface: #ffffff;
          --ev-surface-2: #f5f7fa;
          --ev-text: #101828;
          --ev-text-muted: #667085;
          --ev-text-subtle: #98a2b3;
          --ev-border: #e7eaf0;
          --ev-border-hover: #cbd5e1;
          --ev-primary: #2457c5;
          --ev-primary-hover: #173d91;
          --ev-primary-text: #ffffff;
          --ev-accent: #fcdd09;
          --ev-accent-text: #111111;
          --ev-accent-soft-bg: #edf3ff;
          --ev-accent-soft-border: rgba(36, 87, 197, 0.2);
          --ev-cta-strip-bg: #173d91;
          --ev-cta-strip-text: #ffffff;
          --ev-cta-strip-muted: rgba(255, 255, 255, 0.7);
          --ev-green-soft-bg: #ecfdf3;
          --ev-green-soft-border: #bbf7d0;
          --ev-green-text: #166534;
          --ev-toast-bg: #ffffff;
          --ev-modal-bg: #ffffff;
          --ev-backdrop: rgba(0, 0, 0, 0.6);
          --ev-shadow-card: 0 18px 35px rgba(16, 24, 40, 0.06);
          --ev-shadow-hero: 0 30px 70px rgba(23, 61, 145, 0.17);

          background: var(--ev-bg);
          color: var(--ev-text);
        }

        /* DARK */
        .dark .events-page,
        .dark-mode .events-page,
        [data-theme="dark"] .events-page {
          --ev-bg: #050505;
          --ev-section-bg: #050505;
          --ev-surface: rgba(255, 255, 255, 0.05);
          --ev-surface-2: rgba(255, 255, 255, 0.08);
          --ev-text: #ffffff;
          --ev-text-muted: rgba(255, 255, 255, 0.7);
          --ev-text-subtle: rgba(255, 255, 255, 0.5);
          --ev-border: rgba(255, 255, 255, 0.1);
          --ev-border-hover: rgba(255, 255, 255, 0.3);
          --ev-primary: #fcdd09;
          --ev-primary-hover: #ffe83d;
          --ev-primary-text: #111111;
          --ev-accent: #fcdd09;
          --ev-accent-text: #111111;
          --ev-accent-soft-bg: rgba(252, 221, 9, 0.15);
          --ev-accent-soft-border: rgba(252, 221, 9, 0.3);
          --ev-cta-strip-bg: rgba(255, 255, 255, 0.05);
          --ev-cta-strip-text: #ffffff;
          --ev-cta-strip-muted: rgba(255, 255, 255, 0.6);
          --ev-green-soft-bg: rgba(34, 197, 94, 0.1);
          --ev-green-soft-border: rgba(34, 197, 94, 0.2);
          --ev-green-text: #4ade80;
          --ev-toast-bg: #111111;
          --ev-modal-bg: #111111;
          --ev-backdrop: rgba(0, 0, 0, 0.8);
          --ev-shadow-card: 0 18px 35px rgba(0, 0, 0, 0.5);
          --ev-shadow-hero: 0 30px 70px rgba(0, 0, 0, 0.5);
        }

        .events-page .ev-section {
          background: var(--ev-section-bg);
        }
      `}</style>

      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="max-w-[1280px] mx-auto px-0 lg:px-[5vw] pt-0 lg:pt-[70px] pb-0 lg:pb-[70px] grid lg:grid-cols-[1fr_.85fr] items-center gap-0 lg:gap-[70px]">
        {/* Intro copy — hidden on mobile, shown from lg up */}
        <div className="hidden lg:block max-w-[650px]">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.1em] mb-[17px]"
            style={{ color: "var(--ev-primary)" }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{ background: "var(--ev-accent)" }}
            />
            What's happening at MKU
          </div>

          <h1
            className="text-[43px] sm:text-[56px] lg:text-[72px] leading-[.98] tracking-[-3.8px] font-black max-w-[620px]"
            style={{ color: "var(--ev-text)" }}
          >
            Don't just hear{" "}
            <span style={{ color: "var(--ev-primary)" }}>about it.</span> Be
            there.
          </h1>

          <p
            className="text-[15px] leading-[1.75] max-w-[520px] mt-[22px]"
            style={{ color: "var(--ev-text-muted)" }}
          >
            Discover moot courts, academic sessions, student forums,
            competitions, networking opportunities and everything happening
            around the MKU law community.
          </p>

          <div className="flex items-center gap-2.5 mt-[27px]">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("events")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-[17px] py-3 rounded-[10px] text-xs font-bold transition-all cursor-pointer"
              style={{
                background: "var(--ev-primary)",
                color: "var(--ev-primary-text)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--ev-primary-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--ev-primary)")
              }
            >
              Explore events ↓
            </button>

            <button
              type="button"
              onClick={() => setTimeTab("registered")}
              className="px-4 py-[11px] rounded-[10px] text-xs font-bold cursor-pointer transition-colors"
              style={{
                background: "var(--ev-surface)",
                color: "var(--ev-text)",
                border: "1px solid var(--ev-border)",
              }}
            >
              My registrations
            </button>
          </div>
        </div>

        {/* Featured event card — square + edge-to-edge on mobile */}
        {heroEvent && (
          <article
            onClick={() => setSelectedEvent(heroEvent)}
            className="relative w-full aspect-square lg:aspect-auto lg:min-h-[415px] rounded-none lg:rounded-[25px] overflow-hidden cursor-pointer group"
            style={{
              background: "#111",
              boxShadow: "var(--ev-shadow-hero)",
            }}
          >
            <div
              className="absolute inset-0"
              style={
                heroEvent.coverImage
                  ? {
                      backgroundImage: `url(${heroEvent.coverImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {
                      backgroundImage:
                        'url("https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85")',
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
              }
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <span
              className="absolute top-[22px] left-[22px] px-2.5 py-[7px] rounded-[7px] text-[9px] font-extrabold uppercase tracking-[.08em]"
              style={{
                background: "var(--ev-accent)",
                color: "var(--ev-accent-text)",
              }}
            >
              {timeTab === "past" ? "Recent" : "Next up"}
            </span>

            <div className="absolute inset-0 p-[27px] flex flex-col justify-end text-white">
              <div className="flex items-center gap-3 mb-[15px]">
                <div className="w-[50px] h-[55px] rounded-[10px] overflow-hidden bg-white text-[#101828] text-center shrink-0">
                  <div
                    className="text-[8px] font-extrabold py-[5px] uppercase"
                    style={{
                      background: "var(--ev-primary)",
                      color: "var(--ev-primary-text)",
                    }}
                  >
                    {new Date(getEventTime(heroEvent))
                      .toLocaleDateString(undefined, { month: "short" })
                      .toUpperCase()}
                  </div>
                  <div className="text-[20px] leading-[30px] font-black text-[#101828]">
                    {new Date(getEventTime(heroEvent)).getDate()}
                  </div>
                </div>

                <div className="text-[10px] text-white/85">
                  <strong className="text-white">
                    {new Date(getEventTime(heroEvent)).toLocaleDateString(
                      undefined,
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </strong>
                  <br />
                  {heroEvent.startTime || "10:00 AM"} ·{" "}
                  {heroEvent.venue || "Main Campus"}
                </div>
              </div>

              <h2 className="text-[22px] sm:text-[27px] leading-[1.12] tracking-[-.9px] max-w-[500px] font-extrabold text-white">
                {heroEvent.title}
              </h2>

              <div className="flex flex-wrap gap-3 mt-[15px] text-[10px] text-white/85">
                {heroEvent.category && (
                  <span className="flex items-center gap-1.5">
                    ⚖ {heroEvent.category}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  ◉ {heroEvent.registeredCount || 0} registered
                </span>
                {heroEvent.venue && (
                  <span className="flex items-center gap-1.5">
                    📍 {heroEvent.venue}
                  </span>
                )}
              </div>

              <span
                className="inline-flex items-center gap-1.5 mt-5 px-3.5 py-2.5 rounded-[9px] text-[11px] font-extrabold w-fit"
                style={{
                  background: "#ffffff",
                  color: "var(--ev-primary)",
                }}
              >
                View event <span>→</span>
              </span>
            </div>
          </article>
        )}
      </section>

      {/* =====================================================
          EVENTS SECTION
      ===================================================== */}
      <section id="events" className="ev-section px-[5vw] pt-[72px] pb-[90px]">
        <div className="max-w-[1180px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-[30px] mb-[27px]">
            <div>
              <h2
                className="text-[28px] tracking-[-1px] font-extrabold"
                style={{ color: "var(--ev-text)" }}
              >
                {timeTab === "upcoming"
                  ? "Upcoming events"
                  : timeTab === "past"
                    ? "Past events"
                    : "My tickets"}
              </h2>
              <p
                className="text-xs mt-[5px]"
                style={{ color: "var(--ev-text-muted)" }}
              >
                {timeTab === "upcoming"
                  ? "Find something worth showing up for."
                  : timeTab === "past"
                    ? "A look back at recent assemblies."
                    : "Your reserved delegate seats."}
              </p>
            </div>

            {/* Tabs — hidden on mobile */}
            <div
              className="hidden lg:flex items-center gap-2 rounded-[10px] p-1"
              style={{
                background: "var(--ev-surface)",
                border: "1px solid var(--ev-border)",
              }}
            >
              {(
                [
                  ["upcoming", "Upcoming"],
                  ["past", "Past"],
                  ["registered", "My Tickets"],
                ] as const
              ).map(([key, label]) => {
                const active = timeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeTab(key)}
                    className="px-3.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    style={{
                      background: active ? "var(--ev-primary)" : "transparent",
                      color: active
                        ? "var(--ev-primary-text)"
                        : "var(--ev-text-muted)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters — hidden on mobile */}
          {timeTab !== "registered" && (
            <div className="hidden lg:flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 mb-[22px]">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterCategories.map((cat) => {
                  const active = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(cat.key)}
                      className="flex-none px-3 py-2 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      style={{
                        background: active
                          ? "var(--ev-primary)"
                          : "var(--ev-surface)",
                        color: active
                          ? "var(--ev-primary-text)"
                          : "var(--ev-text-muted)",
                        border: `1px solid ${
                          active ? "var(--ev-primary)" : "var(--ev-border)"
                        }`,
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <label
                className="w-full lg:w-[210px] h-[37px] flex items-center gap-1.5 rounded-[9px] px-2.5 shrink-0"
                style={{
                  background: "var(--ev-surface)",
                  border: "1px solid var(--ev-border)",
                  color: "var(--ev-text-subtle)",
                }}
              >
                <Search size={13} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search events..."
                  className="w-full border-0 outline-0 bg-transparent text-[11px]"
                  style={{ color: "var(--ev-text)" }}
                />
              </label>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center">
              <div className="flex justify-center items-center gap-2">
                <Loader2
                  className="animate-spin"
                  size={22}
                  style={{ color: "var(--ev-primary)" }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--ev-text-muted)" }}
                >
                  Loading calendar...
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-[15px]"
                    style={{
                      border: "1px solid var(--ev-border)",
                      background: "var(--ev-surface)",
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {timeTab !== "registered" && (
                <>
                  {Object.keys(visibleGrouped).length === 0 ? (
                    <div
                      className="py-16 text-center rounded-[15px] max-w-md mx-auto"
                      style={{
                        background: "var(--ev-surface)",
                        border: "1px dashed var(--ev-border)",
                      }}
                    >
                      <div
                        className="w-11 h-11 mx-auto mb-3 rounded-xl grid place-items-center"
                        style={{
                          background: "var(--ev-accent-soft-bg)",
                          color: "var(--ev-primary)",
                        }}
                      >
                        <Ticket size={18} />
                      </div>
                      <h3
                        className="text-[15px] font-extrabold"
                        style={{ color: "var(--ev-text)" }}
                      >
                        No events found
                      </h3>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        Try another category or search term.
                      </p>
                    </div>
                  ) : (
                    Object.keys(visibleGrouped).map((monthLabel) => (
                      <div key={monthLabel} className="mb-8">
                        <div
                          className="sticky top-0 z-20 backdrop-blur-md py-3 mb-4 flex justify-between items-center"
                          style={{
                            background: "var(--ev-section-bg)",
                            borderBottom: "1px solid var(--ev-border)",
                          }}
                        >
                          <h3
                            className="text-[11px] font-mono tracking-[.16em] uppercase font-extrabold"
                            style={{ color: "var(--ev-primary)" }}
                          >
                            {monthLabel}
                          </h3>
                          <span
                            className="text-[10px] px-2 py-1 rounded font-mono uppercase font-bold"
                            style={{
                              background: "var(--ev-surface)",
                              color: "var(--ev-text-muted)",
                              border: "1px solid var(--ev-border)",
                            }}
                          >
                            {visibleGrouped[monthLabel].length}{" "}
                            {visibleGrouped[monthLabel].length === 1
                              ? "Event"
                              : "Events"}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {visibleGrouped[monthLabel].map((e) => {
                            const dateObj = new Date(getEventTime(e));
                            const monthAbbr = dateObj
                              .toLocaleDateString(undefined, {
                                month: "short",
                              })
                              .toUpperCase();
                            const dayNum = dateObj.getDate();
                            const isPastEv = timeTab === "past";

                            return (
                              <div
                                key={e.id}
                                onClick={() => setSelectedEvent(e)}
                                className="flex flex-col sm:flex-row gap-5 p-4 sm:p-5 rounded-2xl transition-all duration-300 group items-start sm:items-center cursor-pointer"
                                style={{
                                  background: "var(--ev-surface)",
                                  border: "1px solid var(--ev-border)",
                                  opacity: isPastEv ? 0.7 : 1,
                                }}
                                onMouseEnter={(evt) => {
                                  evt.currentTarget.style.borderColor =
                                    "var(--ev-border-hover)";
                                  if (!isPastEv) {
                                    evt.currentTarget.style.opacity = "1";
                                    evt.currentTarget.style.boxShadow =
                                      "var(--ev-shadow-card)";
                                  }
                                }}
                                onMouseLeave={(evt) => {
                                  evt.currentTarget.style.borderColor =
                                    "var(--ev-border)";
                                  evt.currentTarget.style.opacity = isPastEv
                                    ? "0.7"
                                    : "1";
                                  evt.currentTarget.style.boxShadow = "none";
                                }}
                              >
                                <div
                                  className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 transition-colors"
                                  style={{
                                    background: "var(--ev-surface-2)",
                                    border: "1px solid var(--ev-border)",
                                  }}
                                >
                                  <span
                                    className="text-[9px] font-mono uppercase tracking-widest leading-none"
                                    style={{ color: "var(--ev-text-muted)" }}
                                  >
                                    {monthAbbr}
                                  </span>
                                  <span
                                    className="text-lg font-black leading-none mt-0.5"
                                    style={{ color: "var(--ev-text)" }}
                                  >
                                    {dayNum}
                                  </span>
                                </div>

                                <div className="flex-grow space-y-1 w-full text-left">
                                  <div className="flex justify-between items-start w-full gap-2">
                                    <h4
                                      className="text-base sm:text-lg font-extrabold transition-colors line-clamp-1"
                                      style={{ color: "var(--ev-text)" }}
                                    >
                                      {e.title}
                                    </h4>
                                    {e.eventType && (
                                      <span
                                        className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                                        style={{
                                          background: "var(--ev-surface-2)",
                                          color: "var(--ev-text-muted)",
                                          border: "1px solid var(--ev-border)",
                                        }}
                                      >
                                        {e.eventType}
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className="flex items-center gap-4 text-xs font-medium"
                                    style={{ color: "var(--ev-text-muted)" }}
                                  >
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      <Clock size={12} />{" "}
                                      {e.startTime || "10:00 AM"}
                                    </span>
                                    <span className="flex items-center gap-1.5 truncate">
                                      <MapPin size={12} className="shrink-0" />{" "}
                                      <span className="truncate">
                                        {e.venue || "Campus Auditorium"}
                                      </span>
                                    </span>
                                  </div>

                                  {e.description && (
                                    <p
                                      className="text-xs line-clamp-2 mt-1.5 leading-relaxed max-w-2xl"
                                      style={{
                                        color: "var(--ev-text-muted)",
                                      }}
                                    >
                                      {e.description}
                                    </p>
                                  )}
                                </div>

                                <span
                                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold shrink-0"
                                  style={{ color: "var(--ev-primary)" }}
                                >
                                  View <ArrowRight size={13} />
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {timeTab === "registered" && (
                <div className="space-y-6">
                  {!currentUser ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 space-y-4 max-w-sm mx-auto">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                        style={{
                          background: "var(--ev-surface-2)",
                          border: "1px solid var(--ev-border)",
                        }}
                      >
                        <Ticket
                          className="w-8 h-8"
                          style={{ color: "var(--ev-text-muted)" }}
                        />
                      </div>
                      <h3
                        className="text-xl font-extrabold"
                        style={{ color: "var(--ev-text)" }}
                      >
                        Your Tickets
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        Sign in to access your reserved event seats and digital
                        entry tickets.
                      </p>
                      <Link href="/auth?redirect=/events">
                        <span
                          className="inline-block mt-4 font-extrabold text-xs tracking-widest uppercase px-6 py-3 rounded-full transition-colors shadow-lg cursor-pointer"
                          style={{
                            background: "var(--ev-primary)",
                            color: "var(--ev-primary-text)",
                          }}
                        >
                          Sign In
                        </span>
                      </Link>
                    </div>
                  ) : myTicketsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 space-y-4 max-w-sm mx-auto">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                        style={{
                          background: "var(--ev-accent-soft-bg)",
                          border: "1px solid var(--ev-accent-soft-border)",
                        }}
                      >
                        <Ticket
                          className="w-8 h-8"
                          style={{ color: "var(--ev-primary)" }}
                        />
                      </div>
                      <h3
                        className="text-xl font-extrabold"
                        style={{ color: "var(--ev-text)" }}
                      >
                        No Upcoming Tickets
                      </h3>
                      <p
                        className="text-sm"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        You haven't reserved any delegate seats yet. Explore the
                        upcoming feeds to register!
                      </p>
                      <button
                        type="button"
                        onClick={() => setTimeTab("upcoming")}
                        className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        style={{
                          background: "var(--ev-surface)",
                          color: "var(--ev-text)",
                          border: "1px solid var(--ev-border)",
                        }}
                      >
                        Browse Events
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <h3
                        className="text-xl font-extrabold uppercase tracking-tight"
                        style={{ color: "var(--ev-text)" }}
                      >
                        Active Registrations ({myTicketsList.length})
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myTicketsList.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-3xl p-5 flex items-center justify-between shadow-sm transition-all"
                            style={{
                              background: "var(--ev-surface)",
                              border: "1px solid var(--ev-border)",
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{
                                  background: "var(--ev-green-soft-bg)",
                                  border:
                                    "1px solid var(--ev-green-soft-border)",
                                }}
                              >
                                <Check
                                  className="w-6 h-6"
                                  style={{ color: "var(--ev-green-text)" }}
                                />
                              </div>
                              <div className="text-left">
                                <h4
                                  className="font-extrabold text-sm sm:text-base line-clamp-1"
                                  style={{ color: "var(--ev-text)" }}
                                >
                                  {item.title}
                                </h4>
                                <p
                                  className="text-[10px] font-mono uppercase tracking-wider mt-0.5"
                                  style={{ color: "var(--ev-green-text)" }}
                                >
                                  RSVP Seats Secured
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedEvent(item)}
                              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer shrink-0"
                              style={{
                                background: "var(--ev-surface-2)",
                                color: "var(--ev-text)",
                                border: "1px solid var(--ev-border)",
                              }}
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

              <div
                className="max-w-[1180px] mx-auto mt-[70px] rounded-[18px] px-7 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
                style={{
                  background: "var(--ev-cta-strip-bg)",
                  color: "var(--ev-cta-strip-text)",
                  border: "1px solid transparent",
                }}
              >
                <div>
                  <h3 className="text-[17px] tracking-[-.3px] font-extrabold">
                    Have something happening?
                  </h3>
                  <p
                    className="text-[11px] mt-1"
                    style={{ color: "var(--ev-cta-strip-muted)" }}
                  >
                    Clubs, class representatives and student organisers can
                    submit events for the community.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex-none px-3.5 py-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer w-full md:w-auto"
                  style={{
                    background: "var(--ev-accent)",
                    color: "var(--ev-accent-text)",
                    border: 0,
                  }}
                >
                  Submit an event
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer
        className="px-[5vw] py-9 flex flex-col md:flex-row md:justify-between md:items-center gap-5 text-[11px]"
        style={{
          borderTop: "1px solid var(--ev-border)",
          color: "var(--ev-text-subtle)",
        }}
      >
        <div>
          © 2026{" "}
          <strong style={{ color: "var(--ev-text-muted)" }}>
            StudentHub MKU
          </strong>
        </div>
        <div className="flex gap-5">
          <a href="#" className="hover:opacity-80 transition-opacity">
            About
          </a>
          <a href="#" className="hover:opacity-80 transition-opacity">
            Privacy
          </a>
          <a href="#" className="hover:opacity-80 transition-opacity">
            Contact
          </a>
        </div>
      </footer>

      {/* =====================================================
          TOAST
      ===================================================== */}
      {toast && (
        <div
          className="fixed top-24 right-6 z-[200] max-w-sm p-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all"
          style={{
            background: "var(--ev-toast-bg)",
            border: `1px solid ${
              toast.type === "success"
                ? "var(--ev-green-soft-border)"
                : "#fecaca"
            }`,
            color:
              toast.type === "success" ? "var(--ev-green-text)" : "#dc2626",
          }}
        >
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p className="text-xs font-bold">{toast.message}</p>
        </div>
      )}

      {/* =====================================================
          DETAIL VIEW — full page on mobile, modal on desktop
      ===================================================== */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-stretch sm:items-end sm:justify-center p-0 sm:p-6 sm:pb-0"
          style={{ background: "var(--ev-backdrop)" }}
        >
          {/* Backdrop click-to-close (desktop only) */}
          <div
            className="hidden sm:block absolute inset-0 cursor-pointer"
            onClick={() => setSelectedEvent(null)}
          />

          <div
            className="relative z-10 w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden rounded-none sm:rounded-3xl"
            style={{
              background: "var(--ev-modal-bg)",
              border: "none",
            }}
          >
            {/* Header rail */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-14 shrink-0"
              style={{
                background: "var(--ev-modal-bg)",
                borderBottom: "1px solid var(--ev-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                style={{
                  background: "var(--ev-surface-2)",
                  color: "var(--ev-text)",
                }}
                aria-label="Back"
              >
                <X size={18} />
              </button>

              <span
                className="text-[11px] font-bold truncate max-w-[60%]"
                style={{ color: "var(--ev-text-muted)" }}
              >
                {selectedEvent.title}
              </span>

              <button
                type="button"
                onClick={() =>
                  setShareData({
                    isOpen: true,
                    url: `https://studenthubmku.xyz/events?id=${selectedEvent.id}`,
                    title: selectedEvent.title,
                    category: "Event",
                  })
                }
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                style={{
                  background: "var(--ev-surface-2)",
                  color: "var(--ev-text)",
                }}
                aria-label="Share"
              >
                <Share2 size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 text-left">
              {isRegistering ? (
                /* ===========================================
                    REGISTRATION FORM
                    All fields visible + scrollable. Submit is
                    the last item in the flow (no fixed bar).
                =========================================== */
                <div className="space-y-5 px-5 sm:px-10 py-6 sm:py-8">
                  <div
                    className="flex items-center gap-3.5 pb-5"
                    style={{ borderBottom: "1px solid var(--ev-border)" }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: "var(--ev-accent-soft-bg)",
                        border: "1px solid var(--ev-accent-soft-border)",
                        color: "var(--ev-primary)",
                      }}
                    >
                      <Ticket size={20} />
                    </div>
                    <div>
                      <h3
                        className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight"
                        style={{ color: "var(--ev-text)" }}
                      >
                        Register for event
                      </h3>
                      <p
                        className="text-[10px] font-mono uppercase tracking-wider mt-1"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        {selectedEvent.title}
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleRsvpSubmission}
                    className="space-y-5 pb-6"
                  >
                    {/* Full Names */}
                    <div className="space-y-1.5">
                      <label
                        className="block text-[10px] font-mono uppercase font-bold tracking-wider"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        Full Names *
                      </label>
                      <input
                        type="text"
                        placeholder="Your full legal name"
                        value={regName}
                        onChange={(ev) => setRegName(ev.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                        style={{
                          background: "var(--ev-surface-2)",
                          border: "1px solid var(--ev-border)",
                          color: "var(--ev-text)",
                        }}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label
                        className="block text-[10px] font-mono uppercase font-bold tracking-wider"
                        style={{ color: "var(--ev-text-muted)" }}
                      >
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. name@student.mku.ac.ke"
                        value={regEmail}
                        onChange={(ev) => setRegEmail(ev.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                        style={{
                          background: "var(--ev-surface-2)",
                          border: "1px solid var(--ev-border)",
                          color: "var(--ev-text)",
                        }}
                        required
                      />
                    </div>

                    {/* Year + Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label
                          className="block text-[10px] font-mono uppercase font-bold tracking-wider"
                          style={{ color: "var(--ev-text-muted)" }}
                        >
                          Year of Study *
                        </label>
                        <select
                          value={regYear}
                          onChange={(ev) => setRegYear(ev.target.value)}
                          className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none cursor-pointer"
                          style={{
                            background: "var(--ev-surface-2)",
                            border: "1px solid var(--ev-border)",
                            color: "var(--ev-text)",
                          }}
                        >
                          <option value="Year 1">Year 1 (Freshman)</option>
                          <option value="Year 2">Year 2 (Sophomore)</option>
                          <option value="Year 3">Year 3 (Junior)</option>
                          <option value="Year 4">Year 4 (Senior)</option>
                          <option value="Postgraduate">Postgraduate</option>
                          <option value="Representative/Guest">
                            Representative / Other
                          </option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          className="block text-[10px] font-mono uppercase font-bold tracking-wider"
                          style={{ color: "var(--ev-text-muted)" }}
                        >
                          Gender *
                        </label>
                        <select
                          value={regGender}
                          onChange={(ev) => setRegGender(ev.target.value)}
                          className="w-full rounded-xl px-3 py-3 text-sm focus:outline-none cursor-pointer"
                          style={{
                            background: "var(--ev-surface-2)",
                            border: "1px solid var(--ev-border)",
                            color: "var(--ev-text)",
                          }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Custom questions */}
                    {selectedEvent.customQuestions &&
                      selectedEvent.customQuestions.length > 0 && (
                        <div
                          className="space-y-5 pt-5"
                          style={{
                            borderTop: "1px solid var(--ev-border)",
                          }}
                        >
                          <p
                            className="text-[10px] font-mono uppercase tracking-widest font-bold"
                            style={{ color: "var(--ev-text-muted)" }}
                          >
                            Additional requirements
                          </p>
                          {selectedEvent.customQuestions.map((q) => (
                            <div key={q.id} className="space-y-1.5">
                              <label
                                className="block text-xs font-semibold"
                                style={{ color: "var(--ev-text)" }}
                              >
                                {q.label}{" "}
                                {q.required && (
                                  <span className="text-red-500">*</span>
                                )}
                              </label>

                              {q.type === "checkbox" ? (
                                <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
                                  <input
                                    type="checkbox"
                                    checked={customFields[q.label] === "Yes"}
                                    onChange={(ev) =>
                                      setCustomFields((prev) => ({
                                        ...prev,
                                        [q.label]: ev.target.checked
                                          ? "Yes"
                                          : "No",
                                      }))
                                    }
                                    className="w-5 h-5 rounded"
                                    style={{
                                      border: "1px solid var(--ev-border)",
                                      background: "var(--ev-surface-2)",
                                      accentColor: "var(--ev-primary)",
                                    }}
                                    required={q.required}
                                  />
                                  <span
                                    className="text-xs"
                                    style={{
                                      color: "var(--ev-text-muted)",
                                    }}
                                  >
                                    Yes, confirm and agree
                                  </span>
                                </label>
                              ) : (
                                <input
                                  type={q.type}
                                  placeholder="Enter response"
                                  value={customFields[q.label] || ""}
                                  onChange={(ev) =>
                                    setCustomFields((prev) => ({
                                      ...prev,
                                      [q.label]: ev.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                                  style={{
                                    background: "var(--ev-surface-2)",
                                    border: "1px solid var(--ev-border)",
                                    color: "var(--ev-text)",
                                  }}
                                  required={q.required}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Submit — flows after the last field */}
                    <div
                      className="pt-5 space-y-3"
                      style={{ borderTop: "1px solid var(--ev-border)" }}
                    >
                      <button
                        type="submit"
                        disabled={rsvpLoading}
                        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        style={{
                          background: "var(--ev-primary)",
                          color: "var(--ev-primary-text)",
                        }}
                      >
                        {rsvpLoading ? (
                          <>
                            <Loader2
                              className="animate-spin"
                              size={14}
                              strokeWidth={2.5}
                            />{" "}
                            Registering...
                          </>
                        ) : selectedEvent.requireApproval ? (
                          "Submit RSVP Request"
                        ) : (
                          "Secure Delegate Pass"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRegistering(false)}
                        className="w-full py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                        style={{
                          background: "transparent",
                          color: "var(--ev-text-muted)",
                          border: "1px solid var(--ev-border)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* ===========================================
                    EVENT DETAILS
                =========================================== */
                <>
                  <div className="w-full h-56 sm:h-72 relative bg-black">
                    <img
                      src={
                        selectedEvent.coverImage ||
                        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop"
                      }
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt="cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, var(--ev-modal-bg) 0%, transparent 45%)",
                      }}
                    />
                  </div>

                  <div className="px-5 sm:px-10 -mt-12 relative z-10 space-y-6 pb-8">
                    <div>
                      <span
                        className="text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: "var(--ev-accent-soft-bg)",
                          color: "var(--ev-primary)",
                          border: "1px solid var(--ev-accent-soft-border)",
                        }}
                      >
                        {selectedEvent.category || "Student Symposium"}
                      </span>

                      <h2
                        className="text-2xl sm:text-3xl font-black leading-tight mb-4 tracking-tight mt-3"
                        style={{ color: "var(--ev-text)" }}
                      >
                        {selectedEvent.title}
                      </h2>

                      <div
                        className="rounded-2xl p-5 space-y-4 text-xs"
                        style={{
                          background: "var(--ev-surface-2)",
                          border: "1px solid var(--ev-border)",
                          color: "var(--ev-text-muted)",
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "var(--ev-surface)",
                              border: "1px solid var(--ev-border)",
                              color: "var(--ev-primary)",
                            }}
                          >
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p
                              className="font-semibold leading-tight"
                              style={{ color: "var(--ev-text)" }}
                            >
                              {new Date(
                                getEventTime(selectedEvent),
                              ).toLocaleDateString(undefined, {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[11px] mt-1">
                              {selectedEvent.startTime || "10:00 AM"}
                              {selectedEvent.endTime
                                ? ` - ${selectedEvent.endTime}`
                                : " EAT"}
                            </p>
                          </div>
                        </div>

                        <div
                          className="h-px w-full"
                          style={{ background: "var(--ev-border)" }}
                        />

                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "var(--ev-surface)",
                              border: "1px solid var(--ev-border)",
                              color: "var(--ev-primary)",
                            }}
                          >
                            <MapPin size={18} />
                          </div>
                          <div className="flex-1">
                            <p
                              className="font-semibold leading-tight"
                              style={{ color: "var(--ev-text)" }}
                            >
                              {selectedEvent.venue ||
                                (selectedEvent.isExternal
                                  ? "Zoom / Form Registration Link"
                                  : "Campus Courtroom Auditorium")}
                            </p>
                            {selectedEvent.googleMapsLink && (
                              <a
                                href={selectedEvent.googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-[11px] block mt-1.5 flex items-center gap-1 font-medium"
                                style={{ color: "var(--ev-primary)" }}
                              >
                                📍 View location on maps ↗
                              </a>
                            )}
                            <span className="text-[11px] block mt-1">
                              {selectedEvent.eventType || "physical"} assembly
                            </span>
                          </div>
                        </div>

                        {selectedEvent.organizerName && (
                          <>
                            <div
                              className="h-px w-full"
                              style={{ background: "var(--ev-border)" }}
                            />
                            <div className="flex items-start gap-4">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                  background: "var(--ev-surface)",
                                  border: "1px solid var(--ev-border)",
                                }}
                              >
                                <span
                                  className="text-[10px] font-mono font-bold"
                                  style={{ color: "var(--ev-primary)" }}
                                >
                                  BY
                                </span>
                              </div>
                              <div>
                                <p
                                  className="font-semibold leading-tight"
                                  style={{ color: "var(--ev-text)" }}
                                >
                                  {selectedEvent.organizerName}
                                </p>
                                <span className="text-[11px] block mt-1">
                                  Convener & host
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3
                        className="text-xs font-mono font-bold uppercase tracking-widest mb-3 pb-2"
                        style={{
                          color: "var(--ev-text-muted)",
                          borderBottom: "1px solid var(--ev-border)",
                        }}
                      >
                        About this event
                      </h3>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: "var(--ev-text)" }}
                      >
                        {selectedEvent.description ||
                          "Official council and academic representative symposium setup designed to synchronize the MKU Law Student community."}
                      </p>
                    </div>

                    {/* Action section — inline, not fixed */}
                    <div
                      className="pt-5 space-y-3"
                      style={{ borderTop: "1px solid var(--ev-border)" }}
                    >
                      <div>
                        <p
                          className="text-[10px] font-mono uppercase tracking-wider font-bold"
                          style={{ color: "var(--ev-text-subtle)" }}
                        >
                          Access Pass Status
                        </p>
                        <p
                          className="font-bold text-base mt-1"
                          style={{ color: "var(--ev-text)" }}
                        >
                          {selectedEvent.isExternal
                            ? "External Registration Link"
                            : selectedEvent.unlimited
                              ? "Unlimited access"
                              : selectedEvent.capacity
                                ? `Limit ${selectedEvent.capacity} seats`
                                : "Delegate access"}
                        </p>
                      </div>

                      {selectedEvent.isExternal ? (
                        <a
                          href={selectedEvent.meetingLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          style={{
                            background: "var(--ev-primary)",
                            color: "var(--ev-primary-text)",
                          }}
                        >
                          Fill Registration Form ↗
                        </a>
                      ) : registeredEventIds.includes(selectedEvent.id) ? (
                        <div className="space-y-2">
                          <div
                            className="w-full py-3 rounded-xl text-sm text-center"
                            style={{
                              background: "var(--ev-green-soft-bg)",
                              color: "var(--ev-green-text)",
                              border: "1px solid var(--ev-green-soft-border)",
                            }}
                          >
                            Registered & Pass Secured
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setJustRegisteredEventTitle(selectedEvent.title);
                              setSelectedEvent(null);
                              setIsSuccessModalOpen(true);
                            }}
                            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                            style={{
                              background: "var(--ev-surface)",
                              color: "var(--ev-text)",
                              border: "1px solid var(--ev-border)",
                            }}
                          >
                            <Ticket size={15} /> View E-Pass
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsRegistering(true)}
                          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                          style={{
                            background: "var(--ev-primary)",
                            color: "var(--ev-primary-text)",
                          }}
                        >
                          Register for Pass
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SUCCESS MODAL
      ===================================================== */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-md cursor-pointer"
            style={{ background: "var(--ev-backdrop)" }}
            onClick={() => setIsSuccessModalOpen(false)}
          />

          <div
            className="rounded-[2rem] p-8 w-full max-w-sm relative z-10 text-center"
            style={{
              background: "var(--ev-modal-bg)",
              border: "1px solid var(--ev-green-soft-border)",
              boxShadow: "0 0 50px rgba(34,197,94,0.15)",
            }}
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30 text-white">
              <Check className="stroke-[3]" size={30} />
            </div>

            <h2
              className="text-2xl font-black tracking-tight mb-2"
              style={{ color: "var(--ev-text)" }}
            >
              You're going!
            </h2>
            <p
              className="text-xs font-mono font-bold uppercase tracking-wider mb-6"
              style={{ color: "var(--ev-green-text)" }}
            >
              Delegate Register Confirmed
            </p>

            <div
              className="rounded-2xl p-5 text-left mb-6 relative overflow-hidden"
              style={{
                background: "var(--ev-surface-2)",
                border: "1px solid var(--ev-border)",
              }}
            >
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-r-full"
                style={{
                  background: "var(--ev-modal-bg)",
                  borderRight: "1px solid var(--ev-border)",
                  borderTop: "1px solid var(--ev-border)",
                  borderBottom: "1px solid var(--ev-border)",
                }}
              />
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-l-full"
                style={{
                  background: "var(--ev-modal-bg)",
                  borderLeft: "1px solid var(--ev-border)",
                  borderTop: "1px solid var(--ev-border)",
                  borderBottom: "1px solid var(--ev-border)",
                }}
              />

              <div className="pl-3.5 pr-3.5">
                <span
                  className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold block mb-1"
                  style={{ color: "var(--ev-primary)" }}
                >
                  MKU GAVEL DELEGATE
                </span>
                <h4
                  className="font-bold text-sm line-clamp-2 tracking-tight leading-snug"
                  style={{ color: "var(--ev-text)" }}
                >
                  {justRegisteredEventTitle || "Campus Symposium"}
                </h4>

                <div
                  className="flex justify-between items-end mt-6 pt-4"
                  style={{ borderTop: "1px solid var(--ev-border)" }}
                >
                  <div>
                    <span
                      className="text-[8px] font-mono uppercase tracking-widest block"
                      style={{ color: "var(--ev-text-subtle)" }}
                    >
                      Delegate Holder
                    </span>
                    <span
                      className="text-xs font-semibold mt-0.5 block"
                      style={{ color: "var(--ev-text)" }}
                    >
                      {currentUser?.displayName ||
                        currentUser?.email?.split("@")[0] ||
                        "Verified Student"}
                    </span>
                  </div>
                  <QrCode
                    size={36}
                    className="stroke-[1.5]"
                    style={{ color: "var(--ev-text-subtle)" }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setTimeTab("registered");
              }}
              className="w-full text-sm font-semibold tracking-wider py-3.5 rounded-xl transition-colors cursor-pointer"
              style={{
                background: "var(--ev-primary)",
                color: "var(--ev-primary-text)",
              }}
            >
              View My Tickets
            </button>
          </div>
        </div>
      )}

      {shareData.isOpen && (
        <ShareDialog
          isOpen={shareData.isOpen}
          onClose={() => setShareData((prev) => ({ ...prev, isOpen: false }))}
          url={shareData.url}
          title={shareData.title}
          category={shareData.category}
        />
      )}
    </div>
  );
}
