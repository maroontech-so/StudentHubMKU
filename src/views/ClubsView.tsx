import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { fbfs, auth, db } from "../lib/firebase";
import { Club, ClubMembership, Event } from "../types";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useAuth } from "../App";
import { 
  Compass, 
  Sparkles, 
  Check, 
  Plus, 
  Users, 
  Landmark, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight, 
  Trophy, 
  Scale, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Grid, 
  Image as ImageIcon, 
  ChevronRight, 
  ExternalLink, 
  Download, 
  ShieldAlert, 
  Bookmark, 
  FolderOpen
} from "lucide-react";

export function ClubsView() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<string[]>([]); // list of clubIds joined by current user
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const customEvent = e as unknown as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    window.addEventListener("global-search", handleGlobalSearch as EventListener);
    return () => window.removeEventListener("global-search", handleGlobalSearch as EventListener);
  }, []);

  const filteredClubs = clubs.filter(c => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.category?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    );
  });

  // Selected tab: "societies" (Guild Directory) or "moot" (Moot Court Central)
  const [currentTab, setCurrentTab] = useState<"societies" | "moot">("societies");

  // Selected club website mini-site view state
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  // Club website navigation tab
  const [clubSubTab, setClubSubTab] = useState<"whatwedo" | "achievements" | "leaders" | "activities" | "gallery">("whatwedo");

  // Selected Competition detail view state
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // Load clubs from Db, and fallback on beautiful high quality mock defaults
  const [socialEvents, setSocialEvents] = useState<Event[]>([]);

  const defaultClubsList: Club[] = [
    {
      id: "moot_court_society",
      name: "Moot Court Society",
      category: "Advocacy & Trials",
      description: "Hone elite trial litigation, oral advocacy, and legal brief writing. We represent the university in prestigious national and continental moot competitions.",
      logoUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=200&auto=format&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
      leadership: [
        { name: "Dean Prince Micah", role: "Chambers Presiding Director", email: "micahprincemicah001@gmail.com" },
        { name: "Beatrice Wanjiru", role: "Chief Registrar & Memorial Coordinator", email: "beatrice.w@hub.mku.ac.ke" },
        { name: "Brian Kiptoo", role: "Master of Court & Lead Coach", email: "kiptoo.b@hub.mku.ac.ke" }
      ],
      active: true,
      createdAt: new Date()
    },
    {
      id: "human_rights_assoc",
      name: "Human Rights Law Guild",
      category: "Social Justice Campaign",
      description: "Committed to legal aid clinics, human rights advocacy, and civil rights community discourse. Empowering the vulnerable through legal literacy.",
      logoUrl: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=200&auto=format&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=1200&auto=format&fit=crop",
      leadership: [
        { name: "Faith Maina", role: "President of the Guild" },
        { name: "Dennis Otieno", role: "Legal Clinic Director" }
      ],
      active: true,
      createdAt: new Date()
    },
    {
      id: "adr_mediation_council",
      name: "ADR & Mediation Council",
      category: "Conflict Resolution",
      description: "Exploring alternatives to standard court procedures. Specializing in arbitration, family mediation, commercial dispute resolution, and community peace building.",
      logoUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=200&auto=format&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1200&auto=format&fit=crop",
      leadership: [
        { name: "Amos Mutua", role: "Chief Arbitrator" },
        { name: "Lydia Kemunto", role: "Secretariat Liaison" }
      ],
      active: true,
      createdAt: new Date()
    },
    {
      id: "ip_tech_guild",
      name: "IP & Tech Law Society",
      category: "Emerging Paradigms",
      description: "Navigating the legal frontiers of AI, cyber law, copyright, patents, and software licensing. Bridging software creators with modern policy formulation.",
      logoUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop",
      coverUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
      leadership: [
        { name: "Caleb Omondi", role: "Guild Pioneer Convenor" },
        { name: "Mercy Chelagat", role: "Research Associate" }
      ],
      active: true,
      createdAt: new Date()
    }
  ];

  // Static rich metadata for societies to tell their "stories" elegantly
  const clubStories: Record<string, {
    whatWeDo: string[];
    achievements: string[];
    gallery: string[];
    activities: Array<{ title: string; date: string; time: string; venue: string; desc: string }>;
  }> = {
    moot_court_society: {
      whatWeDo: [
        "Conduct weekly intensive simulation mock trial hearings in the main campus courthouse chambers.",
        "Provide thorough tutorials on writing legal memorials, skeletons, and case binders.",
        "Facilitate direct workshops with registered High Court advocates, judges, and law professors.",
        "Train members on standard courtroom protocols, formal pleadings style, and spontaneous rebuttals.",
        "Host internal selelction moots twice a year to recruit the elite varsity moot representations."
      ],
      achievements: [
        "🏆 Champion Oralists: Winner of the National Humanitarian Law Moot Tournament 2025.",
        "🏆 Best Memorial: Ranked 1st overall in Written Submissions at the East African Regional Moot 2024.",
        "🎒 Global Delegates: Selected to represent Kenya at the International Court of Justice Moot Prep in The Hague (June 2026).",
        "⚖️ Alumni Network: Over 45 former members currently serving as key court clerks, state prosecutors, and partners in major corporate law firms."
      ],
      activities: [
        { title: "Weekly Court Simulation", date: "Every Wednesday", time: "04:30 PM", venue: "Main Courtroom A", desc: "Simulation based on constitutional law petitions. Compulsory for Year 3 and 4 mooter tracks." },
        { title: "Memorial Mastery Workshop", date: "Thursday, June 18, 2026", time: "02:00 PM", venue: "Lecture Hall 4B", desc: "A comprehensive analysis on structuring state responses, framing issues, and compiling citations." }
      ],
      gallery: [
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop"
      ]
    },
    human_rights_assoc: {
      whatWeDo: [
        "Establish community Legal Aid Clinics offering legal counsel and advisory literacy to surrounding populations.",
        "Host campus Human Rights Symposiums addressing contemporary topics like gender equity, land rights, and state accountability.",
        "Collaborate with Amnesty International, Law Society of Kenya (LSK), and civil rights NGOs.",
        "Draft policy recommendations and litigation support material for high-profile pro-bono cases."
      ],
      achievements: [
        "⚖️ Legal Clinic Outreach: Assisted over 340 individuals with pro-bono document formulation in 2025.",
        "📜 Human Rights Index: Published a bi-annual Student Digest tracking legislative bills and liberties updates.",
        "🌱 Eco Advocacy: Organized MKU Environmental Justice March, driving safe disposal policies in regional councils."
      ],
      activities: [
        { title: "Weekend Commuity Clinic Session", date: "Saturday, June 20, 2026", time: "09:00 AM", venue: "Thika Community Hall", desc: "Volunteer-led intake session offering layout consultations and brief advisory drafts." },
        { title: "Amnesty Guest Lecture", date: "Tuesday, June 23, 2026", time: "11:00 AM", venue: "Chambers Library", desc: "A discourse highlighting public interest litigation in Africa, led by Amnesty Senior Legal Counsel." }
      ],
      gallery: [
        "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600&auto=format&fit=crop"
      ]
    },
    adr_mediation_council: {
      whatWeDo: [
        "Introduce mediation mechanics to resolve corporate contract breaches and marital separations outside trials.",
        "Train delegates in the Harvard Negotiation Project methodology.",
        "Conduct simulated commercial arbitration tribunals featuring industrial expert mediators.",
        "Establish mock neighborhood dispute resolution councils on alternative policy applications."
      ],
      achievements: [
        "🤝 National Runners-Up: Finished 2nd overall at the National Mediation Champions League 2025.",
        "📜 Accredited Counselors: Secured 12 professional arbitration certifications for top final-year grads."
      ],
      activities: [
        { title: "Mediation Simulation Practice", date: "Every Monday", time: "05:00 PM", venue: "Annex Library Level 2", desc: "Mock arbitration simulating land lease disputes. Great for mastering conciliatory style." }
      ],
      gallery: [
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600&auto=format&fit=crop"
      ]
    },
    ip_tech_guild: {
      whatWeDo: [
        "Audit state policies concerning tech startups, copyright disputes, software plagiarism, and artificial intelligence safety.",
        "Organize Hackathons connecting computer science engineers with intellectual property counsel fellows.",
        "Draft mock patent and trademark registrations covering upcoming software inventions."
      ],
      achievements: [
        "💻 AI Legislation Brief: Submitted an educational policy memo on Generative AI regulation guidelines to parliament.",
        "🛡️ IP Literacy Drive: Empowered 12 student startups at MKU Tech Hub to trademark their names securely."
      ],
      activities: [
        { title: "Smart Contracts Debate", date: "Friday, June 19, 2026", time: "03:00 PM", venue: "Main Lecture Theater", desc: "Exploring the legally binding criteria of blockchain transactions and smart contract algorithms." }
      ],
      gallery: [
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop"
      ]
    }
  };

  // Dedicated Moot Court Area Database
  const mootCourtCompetitions = [
    {
      id: "comp_1",
      title: "Annual MKU Internal Moot Selection",
      brief: "The premier internal contest to recruit the varsity litigation squad representing the school globally.",
      overview: "An annual tournament open to LLB law students from Year 2 to Year 4. The competition centers on the complex interaction between Constitutional Law rights, digital surveillance bills, and national privacy protocols. Winners form the elite primary squad representing the university at continent-wide assemblies.",
      date: "September 12 - 14, 2026",
      schedule: [
        { time: "Day 1, 09:00 AM", event: "General Preliminaries (Round 1 & 2)", venue: "Chamber Rooms 1-6" },
        { time: "Day 1, 02:00 PM", event: "Quarter-Final Hearings", venue: "Annex Library Chambers" },
        { time: "Day 2, 10:00 AM", event: "Semi-Final Advocacy Showdown", venue: "Main Moots Courthouse" },
        { time: "Day 3, 02:00 PM", event: "Grand Finals & Keynote Dean Awards", venue: "Main Auditorium" }
      ],
      participants: [
        { teamName: "Chamber Team Alpha", advocates: "Alex Mutua & Beatrice Wanjiru", position: "Petitioner" },
        { teamName: "Guild Orators Beta", advocates: "Caleb Omondi & Lydia Kemunto", position: "Respondent" },
        { teamName: "Barristers Alliance", advocates: "Dennis Otieno & Mercy Chelagat", position: "Petitioner" },
        { teamName: "Amicus Curiae Track", advocates: "Faith Maina & Brian Kiptoo", position: "Respondent" }
      ],
      results: "🏆 Grand Champions: Chamber Team Alpha (Alex Mutua & Beatrice Wanjiru)\n🥈 Runners-Up: Guild Orators Beta\n🎙 Best Oralist Award: Beatrice Wanjiru",
      gallery: [
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600&auto=format&fit=crop"
      ]
    },
    {
      id: "comp_2",
      title: "Law Society of Kenya (LSK) Regional Moot",
      brief: "A fierce inter-university clash addressing State Accountability and Public Interest Litigation.",
      overview: "The regional qualifiers for regional chapters. Universities across Kenya field their elite moot delegates to duel in front of real Court of Appeal and High Court Justices. Focus areas: administrative law, human rights petitions, and maritime environmental laws.",
      date: "October 18 - 20, 2026",
      schedule: [
        { time: "Oct 18, 08:30 AM", event: "Team briefing & Memorial draw", venue: "Nairobi Law Society Head Complex" },
        { time: "Oct 19, 09:00 AM", event: "Oral rounds, Rounds 1-4", venue: "Milimani Law Court Chambers" },
        { time: "Oct 20, 02:00 PM", event: "Regional Final Round", venue: "Milimani Ceremonial Hall" }
      ],
      participants: [
        { teamName: "MKU Varsity Squad A", advocates: "Alex Mutua & Beatrice Wanjiru", position: "Petitioner" },
        { teamName: "MKU Varsity Squad B", advocates: "Dennis Otieno & Mercy Chelagat", position: "Respondent" }
      ],
      results: "⚠️ Schedule Pending: Event commences in October 2026. Roster rosters verified.",
      gallery: [
        "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=600&auto=format&fit=crop"
      ]
    }
  ];

  const mootingTeams = [
    { team: "MKU Varsity A", lineage: "Prestige Litigation Team", counselors: ["Dean Prince Micah", "Beatrice Wanjiru"], research: "Emily Atieno", achievements: "National Champion 2025, Regional Best Memorial Award" },
    { team: "Chambers Guild B", lineage: "Academic Moot Development", counselors: ["Brian Kiptoo", "Dennis Otieno"], research: "Clara Chebet", achievements: "National Quarterfinalist, 2024" }
  ];

  const trainingResources = [
    { title: "Memorial Submission Blueprint", size: "4.2 MB", desc: "A flawless standard skeleton layout detailing state petitions, font margins, formatting, and OSCOLA citations.", fileUrl: "#" },
    { title: "Oralist Plea Arguments Guide", size: "1.8 MB", desc: "Tips on formal court etiquettes, addressing the bench, handling intrusive justice interventions, and rebuttal structure.", fileUrl: "#" },
    { title: "Humanitarian Law Case Dossier", size: "12.4 MB", desc: "Collection of landmark ICJ judgments, treaties, and custom protocols for the upcoming 2026 National Moot competition.", fileUrl: "#" }
  ];

  const mootAchievements = [
    { title: "🏆 Champion Trophy", year: "2025", tournament: "National Humanitarian Law Moot", description: "Defeated 14 premier universities to claim the undisputed champion trophy." },
    { title: "🏅 Best Oralist Special Award", year: "2024", tournament: "East African Law Council Assembly", description: "Dean Prince Micah ranked overall best speaker out of 84 regional advocates." },
    { title: "📄 Outstanding Scholarly Memorial", year: "2024", tournament: "Regional Moot Prep in Arusha", description: "Our written brief scored an unprecedented 94.6% grade from the council deans." }
  ];

  const loadClubsAndMemberships = async () => {
    try {
      setLoading(true);
      const activeClubs = await fbfs.getCollection<Club>("clubs", [["active", "==", true]], "name", "asc");
      
      // Combine Firestore data with defaults to ensure we always have an absolute visual playground
      const unifiedClubs = [...activeClubs];
      defaultClubsList.forEach(df => {
        if (!unifiedClubs.some(c => c.id === df.id || c.name.toLowerCase() === df.name.toLowerCase())) {
          unifiedClubs.push(df);
        }
      });
      setClubs(unifiedClubs);

      // Fetch dynamic active assemblies
      const evs = await fbfs.getCollection<Event>("events", [["published", "==", true], ["status", "==", "active"]]);
      setSocialEvents(evs);

      if (auth.currentUser) {
        // Query user's memberships from DB
        const memberDocs = await fbfs.getCollection<ClubMembership>("clubMemberships", [["userId", "==", auth.currentUser.uid]]);
        setMemberships(memberDocs.map(m => m.clubId));
      }
    } catch (err) {
      console.error("Error setting up societies directory:", err);
      // Fallback on standard database array
      setClubs(defaultClubsList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubsAndMemberships();
  }, []);

  const handleJoinLeave = async (clubId: string) => {
    if (!auth.currentUser) {
      setLocation("/auth");
      return;
    }

    setActionLoading(clubId);
    try {
      const isJoined = memberships.includes(clubId);

      if (isJoined) {
        // Leave club - finds and deletes document
        const q = query(collection(db, "clubMemberships"), where("clubId", "==", clubId), where("userId", "==", auth.currentUser.uid));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();

        setMemberships(prev => prev.filter(id => id !== clubId));
      } else {
        // Join club - add document
        const newMembership: ClubMembership = {
          id: `${clubId}_${auth.currentUser.uid}`,
          clubId,
          userId: auth.currentUser.uid,
          userName: profile?.name || auth.currentUser.displayName || "Student Partner",
          joinedAt: new Date()
        };
        await fbfs.setDocById("clubMemberships", newMembership.id, newMembership);

        setMemberships(prev => [...prev, clubId]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handler for custom actions like "Download" templates simulation
  const simulateAction = (msg: string) => {
    alert(msg + " \n[Draft memorial template successfully unlocked internally! Click download to save standard layout.]");
  };

  return (
    <div className="space-y-8 py-6 text-left w-full px-2 sm:px-6 select-none">
      <div className="bg-noise"></div>

      {/* 1. ELEGANT CLASSIC HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gavel-border/30">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#FFDE00] uppercase block">
            THE CAMPUS CONSTELLATION
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white dark:text-white uppercase font-sans mt-1">
            Societies & advocacy
          </h1>
        </div>

        {/* Custom Dual Switch Selector at the Top */}
        <div className="flex bg-[#0d0d10]/95 backdrop-blur border border-white/5 rounded-2xl p-1 shrink-0 w-full md:w-auto">
          <button
            onClick={() => { setCurrentTab("societies"); setSelectedClubId(null); setSelectedCompId(null); }}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer ${currentTab === "societies" ? "bg-[#FFDE00] text-black shadow-lg" : "text-gavel-muted hover:text-white"}`}
          >
            <Compass size={13} className="inline mr-1.5" /> Guilds
          </button>
          <button
            onClick={() => { setCurrentTab("moot"); setSelectedClubId(null); setSelectedCompId(null); }}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-mono font-extrabold uppercase tracking-wider transition-all cursor-pointer ${currentTab === "moot" ? "bg-[#FFDE00] text-black shadow-lg" : "text-gavel-muted hover:text-white"}`}
          >
            <Scale size={13} className="inline mr-1.5" /> Moot Court
          </button>
        </div>
      </div>

      {/* RENDER VIEW TAB 1: STUDENT CLUBS & GUILDS DIRECTORY */}
      {currentTab === "societies" && (
        <div className="space-y-8">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-8 animate-fade-in">
              {[1, 2].map(item => (
                <div key={item} className="p-8 rounded-[2rem] border border-gavel-border bg-white/[0.01] animate-pulse h-80 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0"></div>
                      <div className="space-y-2 w-full">
                        <div className="h-4 bg-white/10 rounded w-1/3"></div>
                        <div className="h-3 bg-white/5 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="h-3 bg-white/5 rounded w-full"></div>
                      <div className="h-3 bg-white/5 rounded w-5/6"></div>
                    </div>
                  </div>
                  <div className="h-10 bg-white/5 rounded w-full mt-4"></div>
                </div>
              ))}
            </div>
          ) : !selectedClubId ? (
            // GRID DIRECTORY OF SOCIETIES
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredClubs.length === 0 ? (
                <div className="col-span-2 py-16 text-center border border-dashed border-gavel-border/30 rounded-3xl max-w-sm mx-auto w-full">
                  <p className="text-gavel-muted text-xs font-mono uppercase tracking-widest font-bold">No Hub Matches</p>
                  <p className="text-xs text-gavel-muted mt-2">Try adjusting your search criteria.</p>
                </div>
              ) :
                filteredClubs.map(club => {
                  const joined = memberships.includes(club.id);
                  return (
                  <div 
                    key={club.id} 
                    className="premium-card rounded-[2rem] border border-white/5 bg-[#0a0a0c]/80 p-6 md:p-8 flex flex-col justify-between hover:border-[#FFDE00]/15 group transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <img 
                            src={club.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=111&color=FFDE00`} 
                            alt={club.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-2xl border border-white/5 object-cover bg-neutral-900"
                          />
                          <div className="text-left">
                            <h3 className="font-extrabold text-[#ffffff] uppercase leading-tight text-lg group-hover:text-[#FFDE00] transition-colors">{club.name}</h3>
                            <span className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-wider bg-[#FFDE00]/10 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                              {club.category || "Legal Guild"}
                            </span>
                          </div>
                        </div>

                        {joined && (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-[9px] font-mono text-green-400 font-bold uppercase leading-none">
                            <Check size={11} className="stroke-[3]" /> Linked
                          </div>
                        )}
                      </div>

                      <p className="text-gavel-muted text-xs leading-relaxed text-left line-clamp-3">
                        {club.description}
                      </p>

                      {club.leadership && club.leadership.length > 0 && (
                        <div className="pt-4 border-t border-white/5 text-left">
                          <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider mb-2.5">Guild Directors</span>
                          <div className="flex flex-col gap-1.5 text-xs text-gavel-muted">
                            {club.leadership.slice(0, 2).map((lead, idx) => (
                              <div key={idx} className="flex justify-between font-medium">
                                <span className="text-white text-xs">{lead.name}</span>
                                <span className="font-mono text-[9px] uppercase font-bold text-gavel-muted">{lead.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                      {/* Clicking the text details opens the full premium story-book miniwebsite! */}
                      <button
                        onClick={() => { setSelectedClubId(club.id); setClubSubTab("whatwedo"); }}
                        className="text-[11px] font-mono font-extrabold uppercase text-[#FFDE00] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer leading-none"
                      >
                        Enter Mini-Site <ArrowRight size={12} className="stroke-[2]" />
                      </button>

                      <button
                        onClick={() => handleJoinLeave(club.id)}
                        disabled={actionLoading === club.id}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-mono font-extrabold uppercase tracking-wider cursor-pointer duration-300 transition-all select-none ${joined ? "border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white" : "border border-white/5 bg-[#0e0e0e]/80 text-[#cccccc] hover:text-white hover:border-white/20"}`}
                      >
                        {actionLoading === club.id ? "Working..." : joined ? "Leave Academy" : "Join Circle"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // FULL IMMERSIVE MINI-WEBSITE STORY FOR THE SELECTED SOCIETY
            (() => {
              const currentClub = clubs.find(c => c.id === selectedClubId);
              if (!currentClub) return null;
              
              const storyDetails = clubStories[currentClub.id] || {
                whatWeDo: [currentClub.description],
                achievements: ["🏆 Accredited Active Campus organization.", "🌱 Active legal aid participant."],
                activities: [{ title: "General Member Assembly", date: "Monthly", time: "05:00 PM", venue: "TBD", desc: "Interactive brief review of activities and research tracks." }],
                gallery: ["https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop"]
              };

              const isJoined = memberships.includes(currentClub.id);

              return (
                <div className="space-y-8 animate-fade-in relative text-left">
                  {/* Back tracking button */}
                  <button 
                    onClick={() => setSelectedClubId(null)}
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#FFDE00] hover:text-white uppercase tracking-wider transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/5 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back to Catalogues
                  </button>

                  {/* Society Custom Large Immersive Cover Header */}
                  <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#050505] p-8 md:p-12 lg:p-16 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                    <div 
                      className="absolute inset-0 opacity-10 bg-cover bg-center grayscale pointer-events-none"
                      style={{ backgroundImage: `url('${currentClub.coverUrl || "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200"}'` }}
                    />

                    <div className="flex-1 space-y-6 relative z-10">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <img 
                          src={currentClub.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentClub.name)}`} 
                          alt={currentClub.name}
                          className="w-16 h-16 rounded-2xl border border-white/5 object-cover bg-black"
                        />
                        <div className="text-center sm:text-left">
                          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight uppercase tracking-tight">{currentClub.name}</h1>
                          <p className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-widest mt-1.5">{currentClub.category} • EST. 2024</p>
                        </div>
                      </div>
                      <p className="text-gavel-muted text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">{currentClub.description}</p>
                    </div>

                    <div className="relative z-10 shrink-0 text-center space-y-3">
                      <button
                        onClick={() => handleJoinLeave(currentClub.id)}
                        disabled={actionLoading === currentClub.id}
                        className={`w-full sm:w-auto px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl cursor-pointer ${isJoined ? "bg-[#331111] border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white shadow-red-900/10" : "bg-[#FFDE00] text-black hover:bg-white shadow-gavel-yellow/10"}`}
                      >
                        {actionLoading === currentClub.id ? "Working..." : isJoined ? "Leave Society" : "Join Society Membership"}
                      </button>
                      <p className="text-[10px] font-mono text-gavel-muted font-bold tracking-tight">Active Members: {isJoined ? "143 (You inside)" : "142 Active"}</p>
                    </div>
                  </div>

                  {/* MINI-WEBSITE PRIMARY TAB ENGINE BAR */}
                  <div className="flex overflow-x-auto gap-2 pb-1 bg-black/40 border border-white/5 p-1.5 rounded-2xl">
                    {[
                      { id: "whatwedo", label: "What We Do", icon: <Compass size={12} /> },
                      { id: "achievements", label: "Achievements & Laurels", icon: <Trophy size={12} /> },
                      { id: "leaders", label: "Executive Leadership", icon: <Users size={12} /> },
                      { id: "activities", label: "Upcoming Assemblies", icon: <Calendar size={12} /> },
                      { id: "gallery", label: "Media Album", icon: <ImageIcon size={12} /> }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setClubSubTab(sub.id as any)}
                        className={`px-4.5 py-2.5 rounded-xl text-xs font-mono uppercase font-black tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${clubSubTab === sub.id ? "bg-white/10 text-white border border-white/10" : "text-gavel-muted hover:text-white"}`}
                      >
                        {sub.icon}
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {/* SUBTAB CONTENT OUTPUTS */}
                  <div className="premium-card p-6 sm:p-8 rounded-[1.8rem] border border-white/5 bg-[#0a0a0c]/70 text-left">
                    
                    {/* SUBTAB: WHAT WE DO (Story & block elements) */}
                    {clubSubTab === "whatwedo" && (
                      <div className="space-y-6">
                        <div className="space-y-2 pb-3 border-b border-white/5">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Focus & Core Objectives</h3>
                          <p className="text-xs text-gavel-muted">The core operational mandate and simulation exercises for {currentClub.name}.</p>
                        </div>
                        <ul className="space-y-4">
                          {storyDetails.whatWeDo.map((item, idx) => (
                            <li key={idx} className="flex gap-3.5 items-start">
                              <span className="w-6 h-6 shrink-0 rounded-lg bg-[#FFDE00]/10 border border-[#FFDE00]/15 text-[#FFDE00] flex items-center justify-center font-bold text-xs font-mono mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-gavel-muted mt-0.5 leading-relaxed font-sans font-medium">{item}</p>
                            </li>
                          ))}
                        </ul>

                        <div className="p-5 mt-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 max-w-2xl">
                          <span className="text-[10px] font-mono text-[#FFDE00] font-black tracking-wider">MEMBER COMMITTMENT:</span>
                          <p className="text-xs text-gavel-muted leading-relaxed font-sans">
                            Members are required to commit to at least two simulated mooting trials or campaign exercises per semester, completing a research submission folder alongside senior guides.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB: ACHIEVEMENTS */}
                    {clubSubTab === "achievements" && (
                      <div className="space-y-6">
                        <div className="space-y-2 pb-3 border-b border-white/5">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Society Laurels & Merits</h3>
                          <p className="text-xs text-gavel-muted">Milestones and competitive decorations won by {currentClub.name} delegacy.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          {storyDetails.achievements.map((ach, idx) => (
                            <div key={idx} className="p-5 rounded-2xl border border-white/5 bg-black/40 text-left relative overflow-hidden group hover:border-[#FFDE00]/10 duration-200">
                              <p className="text-xs text-[#dddddd] font-sans font-extrabold leading-relaxed uppercase tracking-tight">{ach}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SUBTAB: LEADERS */}
                    {clubSubTab === "leaders" && (
                      <div className="space-y-6">
                        <div className="space-y-2 pb-3 border-b border-white/5">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Presiding Board of Directors</h3>
                          <p className="text-xs text-gavel-muted">Experienced student coordinators overseeing moot trials and structural administration.</p>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-6">
                          {currentClub.leadership?.map((lead, idx) => (
                            <div key={idx} className="p-5 rounded-2xl border border-white/5 bg-black/60 text-left space-y-4 relative overflow-hidden group hover:border-[#FFDE00]/5 duration-200">
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-mono text-[#FFDE00] font-bold uppercase tracking-widest">{lead.role || "Director"}</span>
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">{lead.name}</h4>
                              </div>
                              {lead.email && (
                                <p className="text-[10px] font-mono text-gavel-muted border-t border-white/5 pt-2 flex items-center gap-1.5 select-all hover:text-white duration-200 cursor-pointer">
                                  <Mail size={10} /> {lead.email}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SUBTAB: ACTIVITIES */}
                    {clubSubTab === "activities" && (
                      <div className="space-y-6">
                        <div className="space-y-2 pb-3 border-b border-white/5">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Active Assembly Calendars</h3>
                          <p className="text-xs text-gavel-muted">Upcoming simulated dispute sessions or forums with available seats.</p>
                        </div>

                        {storyDetails.activities.length === 0 ? (
                          <p className="text-xs font-mono text-gavel-muted">No scheduled activities listed.</p>
                        ) : (
                          <div className="space-y-4">
                            {storyDetails.activities.map((act, idx) => (
                              <div key={idx} className="p-5 rounded-2xl border border-[#ffde00]/10 bg-black/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="space-y-1.5 text-left max-w-xl">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-[#FFDE00]/10 border border-[#FFDE00]/20 text-[9px] font-mono text-[#FFDE00] font-bold">ASSEMBLY SECURE</span>
                                    <span className="text-xs text-white font-extrabold uppercase tracking-tight">{act.title}</span>
                                  </div>
                                  <p className="text-xs text-gavel-muted leading-relaxed font-sans">{act.desc}</p>
                                </div>

                                <div className="shrink-0 font-mono text-[10px] space-y-1 sm:text-right text-gavel-muted border-l sm:border-l-0 sm:border-r border-white/5 pl-3 sm:pl-0 sm:pr-3">
                                  <p className="text-white font-bold">{act.date}</p>
                                  <p>{act.time}</p>
                                  <p className="text-[#FFDE00] uppercase font-bold">{act.venue}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUBTAB: GALLERY */}
                    {clubSubTab === "gallery" && (
                      <div className="space-y-6">
                        <div className="space-y-2 pb-3 border-b border-white/5">
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Visual Chamber Logbooks</h3>
                          <p className="text-xs text-gavel-muted">Photographic evidence of ongoing trial simulations and council deliberations.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                          {storyDetails.gallery.map((img, idx) => (
                            <div key={idx} className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 bg-neutral-900 group relative">
                              <img src={img} alt="" className="w-full h-full object-cover brightness-75 group-hover:scale-105 group-hover:brightness-100 transition-all duration-500" />
                              <span className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 text-[8px] font-mono text-white tracking-widest uppercase rounded">CHAMBERS VOL.{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* RENDER VIEW TAB 2: DEDICATED MOOT COURT CENTRAL AREA */}
      {currentTab === "moot" && (
        <div className="space-y-10 animate-fade-in text-left">
          
          {/* Spotlight banner inside Moot Court Area */}
          <div className="rounded-3xl border border-dashed border-white/10 p-6 md:p-8 bg-[#0a0614]/80 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-48 h-48 bg-[#FFDE00]/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="space-y-2 relative z-10 flex-1">
              <span className="text-[10px] font-mono uppercase bg-[#FFDE00]/10 border border-[#FFDE00]/20 text-[#FFDE00] px-2.5 py-1 rounded-md font-bold inline-block">
                ★ Dedicated Moot Arena
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Mock Competitions & Counsel Lineups</h2>
              <p className="text-xs text-gavel-muted leading-relaxed max-w-2xl">
                The absolute focal point of MKU Law students. Access schedule, teams roster, training resources database, mock trial guides, and real-time outcomes.
              </p>
            </div>
            <div className="shrink-0 flex gap-2 relative z-10">
              <button 
                onClick={() => simulateAction("Opening sample memorial skeleton PDF files...")} 
                className="px-5 py-3 rounded-lg border border-white/5 bg-[#121215]/80 text-white font-mono text-xs uppercase hover:bg-white/5 cursor-pointer flex items-center gap-1.5 duration-200"
              >
                <FileText size={14} /> Brief Memorial Form
              </button>
            </div>
          </div>

          {!selectedCompId ? (
            // MASTER SUB-BLOCK SECTIONS OF MOOT COURT CENTRAL
            <div className="space-y-12">
              
              {/* SECTION A: MOOT TOURNAMENTS & SELECTIONS */}
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-wider">SECTION 01</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Moot Registrations & Contests</h3>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {mootCourtCompetitions.map(comp => (
                    <div key={comp.id} className="premium-card p-6 rounded-[1.8rem] border border-white/5 bg-[#0a0a0c]/80 flex flex-col justify-between h-full hover:border-[#FFDE00]/10 duration-200">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-gavel-muted uppercase font-bold">{comp.date}</span>
                          <span className="px-2.5 py-0.5 rounded bg-[#FFDE00]/10 text-[#FFDE00] text-[8px] font-mono uppercase font-black tracking-widest">ACTIVE TOURNAMENT</span>
                        </div>
                        <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug">{comp.title}</h4>
                        <p className="text-xs text-gavel-muted leading-relaxed font-sans font-medium">{comp.brief}</p>
                      </div>

                      <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between gap-4">
                        <button
                          onClick={() => setSelectedCompId(comp.id)}
                          className="text-xs font-mono font-extrabold text-[#FFDE00] hover:text-white uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer leading-none"
                        >
                          Chamber Details <ArrowRight size={12} />
                        </button>
                        <span className="text-[9px] font-mono text-gavel-muted uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded">Roster Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: TRAINING & DOWNLOADABLE MEMORIAL BRIEF TEMPLATES */}
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Visual block 1: Training list */}
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2 text-left">
                    <span className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-wider">SECTION 02</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Litigation Training & Files</h3>
                  </div>

                  <div className="space-y-3">
                    {trainingResources.map((res, i) => (
                      <div key={i} className="p-4 rounded-xl border border-white/5 bg-[#0d0d10]/60 flex items-start gap-3 hover:border-white/10 duration-150">
                        <div className="p-2 rounded-lg bg-white/5 text-[#FFDE00] shrink-0">
                          <Bookmark size={14} />
                        </div>
                        <div className="space-y-1.5 text-left flex-1 min-w-0">
                          <div className="flex justify-between items-center bg-transparent">
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate pr-2">{res.title}</h4>
                            <span className="text-[9px] font-mono text-gavel-muted uppercase shrink-0">{res.size}</span>
                          </div>
                          <p className="text-[11px] text-gavel-muted leading-relaxed">{res.desc}</p>
                          <button
                            onClick={() => simulateAction(`Downloading ${res.title}...`)}
                            className="inline-flex items-center gap-1 text-[9px] font-mono text-[#FFDE00] hover:text-white uppercase font-bold tracking-widest mt-1.5 cursor-pointer"
                          >
                            <Download size={10} /> Unlock brief PDF template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual block 2: Live court achievements & trophy ledger */}
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-2 text-left">
                    <span className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-wider">SECTION 03</span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Varsity Achievements</h3>
                  </div>

                  <div className="space-y-3">
                    {mootAchievements.map((ach, i) => (
                      <div key={i} className="p-4 rounded-xl border border-purple-500/10 bg-[#0d091a]/40 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/5 text-purple-400 shrink-0">
                          <Trophy size={14} />
                        </div>
                        <div className="space-y-1 text-left flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight">{ach.title}</h4>
                            <span className="text-[9px] font-mono text-[#FFDE00] font-black">{ach.year}</span>
                          </div>
                          <span className="text-[9px] font-mono text-gavel-muted uppercase block font-bold">{ach.tournament}</span>
                          <p className="text-[11px] text-gavel-muted leading-relaxed font-sans">{ach.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* SECTION C: ADVOCATE TEAM MATRICES LOUNGE */}
              <div className="space-y-4 text-left">
                <div className="border-b border-white/5 pb-2">
                  <span className="text-[10px] font-mono font-bold text-[#FFDE00] uppercase tracking-wider">SECTION 04</span>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Active Counsel Roster Lineups</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {mootingTeams.map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-white/5 bg-black/60 relative overflow-hidden text-left space-y-4">
                      <div className="space-y-1 bg-transparent">
                        <span className="text-[9px] font-mono text-[#FFDE00] uppercase font-bold">{item.lineage}</span>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.team}</h4>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <span className="text-[9px] font-mono text-gavel-muted uppercase block font-bold">Rostered Advocates</span>
                        <div className="flex flex-wrap gap-2">
                          {item.counselors.map((c, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] text-white font-medium uppercase tracking-tight">
                              ⚖️ {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-[10px] text-gavel-muted flex justify-between bg-transparent pt-2 border-t border-white/5">
                        <span>Research Assistant:</span>
                        <span className="font-semibold text-white uppercase">{item.research}</span>
                      </div>

                      <div className="text-[10px] text-[#FFDE00] pt-1">
                        🎖 <span className="text-gavel-muted font-mono uppercase text-[9px]">Track Record:</span> {item.achievements}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            // INDIVIDUAL COMPETITION PAGE - OVERVIEW, SCHEDULE, PARTICIPANTS, RESULTS, GALLERY
            (() => {
              const comp = mootCourtCompetitions.find(c => c.id === selectedCompId);
              if (!comp) return null;

              return (
                <div className="space-y-8 animate-fade-in text-left">
                  {/* Back tracking button */}
                  <button 
                    onClick={() => setSelectedCompId(null)}
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#FFDE00] hover:text-white uppercase tracking-wider transition-all bg-white/5 px-4 py-2 rounded-xl border border-white/5 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back to Moots Home
                  </button>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#FFDE00] font-black uppercase tracking-widest">TOURNAMENT BOARD FILES</span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight">{comp.title}</h1>
                    <p className="text-xs text-gavel-muted uppercase">Venue Assembly Dates: {comp.date}</p>
                  </div>

                  {/* Complete interactive 4-grid bento sheets representing: Overview, Schedule, Participants, Results */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    
                    {/* Panel 1: Overview */}
                    <div className="premium-card p-6 rounded-3xl border border-white/5 bg-[#0a0a0c]/80 text-left space-y-4 h-full">
                      <div className="pb-2.5 border-b border-white/5">
                        <span className="text-[10px] font-mono text-[#FFDE00] font-bold block uppercase">Chamber Board File</span>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">CASE BRIEF & OUTLINE</h4>
                      </div>
                      <p className="text-xs text-gavel-muted leading-relaxed font-sans font-medium">{comp.overview}</p>

                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                        <span className="text-[10px] font-mono text-[#FFDE00] uppercase font-bold">Judiciary Bench Panelists:</span>
                        <p className="text-[11px] text-gavel-muted leading-relaxed font-sans">
                          Presided over by Hon. Justice Prof. Micah Dean, together with distinguished LSK Court Arbitrators and Visiting Lecturers.
                        </p>
                      </div>
                    </div>

                    {/* Panel 2: Interactive Schedule */}
                    <div className="premium-card p-6 rounded-3xl border border-white/5 bg-[#0a0a0c]/80 text-left space-y-4 h-full">
                      <div className="pb-2.5 border-b border-white/5">
                        <span className="text-[10px] font-mono text-[#FFDE00] font-bold block uppercase">Assembly Sessions</span>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">CHAMBER COURT SCHEDULE</h4>
                      </div>
                      
                      <div className="space-y-3.5">
                        {comp.schedule.map((sch, sIdx) => (
                          <div key={sIdx} className="flex justify-between items-start gap-3 text-xs leading-normal">
                            <span className="text-[10px] font-mono text-[#FFDE00] font-bold bg-[#FFDE00]/10 border border-[#FFDE00]/20 px-2 py-0.5 rounded uppercase font-black shrink-0 whitespace-nowrap">{sch.time}</span>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-white font-extrabold uppercase tracking-tight truncate">{sch.event}</p>
                              <p className="text-[10px] text-gavel-muted uppercase">{sch.venue}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Panel 3: Participants */}
                    <div className="premium-card p-6 rounded-3xl border border-white/5 bg-[#0a0a0c]/80 text-left space-y-4 h-full">
                      <div className="pb-2.5 border-b border-white/5">
                        <span className="text-[10px] font-mono text-[#FFDE00] font-bold block uppercase">Rostered Lineups</span>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">CONTESTANT ADVOCATES</h4>
                      </div>

                      <div className="space-y-3">
                        {comp.participants.map((part, pIdx) => (
                          <div key={pIdx} className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center gap-3">
                            <div className="text-left">
                              <h5 className="text-xs font-bold text-white uppercase tracking-tight leading-tight">{part.teamName}</h5>
                              <p className="text-[10px] text-gavel-muted mt-0.5">{part.advocates}</p>
                            </div>

                            <span className={`px-2 py-0.5 text-[9px] font-mono uppercase font-black rounded ${part.position === "Petitioner" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                              {part.position}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Panel 4: Results */}
                    <div className="premium-card p-6 rounded-3xl border border-white/5 bg-[#0a0a0c]/80 text-left space-y-4 h-full">
                      <div className="pb-2.5 border-b border-white/5">
                        <span className="text-[10px] font-mono text-[#FFDE00] font-bold block uppercase">Championship Outcomes</span>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">TOURNAMENT DECISION RESULTS</h4>
                      </div>

                      <div className="p-4 bg-yellow-500/5 border border-[#ffde00]/15 rounded-2xl whitespace-pre-line text-xs font-semibold text-white leading-relaxed font-sans">
                        {comp.results}
                      </div>
                    </div>

                  </div>

                  {/* Panel 5: Gallery */}
                  <div className="premium-card p-6 sm:p-8 rounded-[1.8rem] border border-white/5 bg-[#0a0a0c]/80 text-left space-y-6">
                    <div className="pb-2">
                      <span className="text-[10px] font-mono text-[#FFDE00] font-bold block uppercase">Photographic Vault</span>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">HEARING CHRONICLE ALBUM</h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-6">
                      {comp.gallery.map((img, index) => (
                        <div key={index} className="aspect-[16/9] rounded-2xl overflow-hidden border border-white/5 bg-neutral-900">
                          <img src={img} alt="" className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 hover:scale-102 transition-all duration-300" />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })()
          )}

        </div>
      )}

    </div>
  );
}
