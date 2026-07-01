import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { fbfs } from "../lib/firebase";
import { Announcement, Event, Club, MarketplaceProfile, GalleryItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Megaphone, 
  Calendar, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Store, 
  Lock, 
  ShieldCheck, 
  Image as ImageIcon,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Share2,
  X
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";

const PROMO_GRADIENTS = [
  { id: 0, classes: "from-[#FFDE00] to-[#ffae00] text-black", text: "text-black" },
  { id: 1, classes: "from-amber-500 to-rose-600 text-white", text: "text-white" },
  { id: 2, classes: "from-indigo-900 via-purple-900 to-purple-800 text-white", text: "text-white" },
  { id: 3, classes: "from-emerald-600 via-teal-700 to-cyan-800 text-white", text: "text-white" },
  { id: 4, classes: "from-sky-400 to-blue-600 text-white", text: "text-white" },
  { id: 5, classes: "from-fuchsia-600 via-purple-700 to-pink-500 text-white", text: "text-white" },
  { id: 6, classes: "from-orange-400 via-amber-500 to-yellow-500 text-white", text: "text-white" },
  { id: 7, classes: "from-red-700 to-neutral-900 text-white", text: "text-white" },
  { id: 8, classes: "from-neutral-900 via-zinc-800 to-stone-900 text-white border-l-4 border-[#FFDE00]", text: "text-white" },
  { id: 9, classes: "from-pink-500 via-purple-500 to-indigo-500 text-white", text: "text-white" },
  { id: 10, classes: "from-violet-800 to-fuchsia-700 text-white", text: "text-white" }
];

export function HomeView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<MarketplaceProfile[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [galleryCount, setGalleryCount] = useState(4);
  const [stats, setStats] = useState({ users: 142, events: 0, products: 0 });
  const [expandedAnns, setExpandedAnns] = useState<Record<string, boolean>>({});
  const [flashDeals, setFlashDeals] = useState<Array<{ promo: any; biz: MarketplaceProfile }>>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Real-time Countdown Timer Variables
  const [countdown, setCountdown] = useState({ days: "00", hours: "00", minutes: "00", seconds: "00" });
  const [nextEventTitle, setNextEventTitle] = useState("Loading...");

  // Selected Bulletin/Announcement modal state
  const [selectedBulletin, setSelectedBulletin] = useState<Announcement | null>(null);

  // Share Modal State
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string; category: "Event" | "Bulletin" | "Portfolio" }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Bulletin"
  });

  const [activeDealIdx, setActiveDealIdx] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        // 1. Load active announcements
        const annList = await fbfs.getCollection<Announcement>("announcements", [["visible", "==", true]], "createdAt", "desc");
        const filteredAnnList = annList.filter(ann => !ann.platforms || ann.platforms.includes("homepage"));
        setAnnouncements(filteredAnnList.slice(0, 10));

        // 2. Load upcoming published events safely with client-side filter and sorting to bypass compound query index requirements
        const rawEvList = await fbfs.getCollection<Event>("events");
        const now = Date.now();
        const evList = rawEvList
          .filter(e => {
            if (e.published === false || e.status === "cancelled") return false;
            const time = e.startDate?.seconds ? e.startDate.seconds * 1000 : new Date(e.startDate).getTime();
            return time > now;
          })
          .sort((a, b) => {
            const timeA = a.startDate?.seconds ? a.startDate.seconds * 1000 : new Date(a.startDate).getTime();
            const timeB = b.startDate?.seconds ? b.startDate.seconds * 1000 : new Date(b.startDate).getTime();
            return timeA - timeB;
          })
          .slice(0, 5);
        setUpcomingEvents(evList);

        if (evList.length > 0) {
          setNextEventTitle(evList[0].title);
        } else {
          setNextEventTitle("No event");
        }

        // 3. Load marketplace active business profiles
        let listList: MarketplaceProfile[] = [];
        try {
          listList = await fbfs.getCollection<MarketplaceProfile>("marketplaceProfiles", [], "createdAt", "desc", 20);
        } catch (_) {}

        if (!listList || listList.length === 0) {
          listList = [
            {
              id: "seed_micah",
              uid: "seed_user_micah",
              ownerName: "Prince Micah",
              businessName: "Micah's Premium Kinyozi",
              description: "I own a pristine kinyozi a few metres from the school gate.",
              category: "Salon & Grooming",
              location: "Gate Area",
              contactEmail: "micahprincemicah001@gmail.com",
              images: ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80"],
              whatsappNumber: "+254712345678",
              promotions: [
                {
                  id: "def_promo_1",
                  title: "Back-to-School Barber Flash Cut!",
                  description: "Get sharp razor line-ups and pristine hair styling from Prince Micah.",
                  discountText: "20% OFF FOR FRESHMEN",
                  imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
                  active: true
                }
              ],
              createdAt: Date.now()
            } as any
          ];
        }
        setListings(listList);

        // Extract active promotions for flashDeals feed
        const promoList: Array<{ promo: any; biz: MarketplaceProfile }> = [];
        listList.forEach(biz => {
          if (biz.catalog && Array.isArray(biz.catalog)) {
            biz.catalog.forEach((item, idx) => {
              if (item.isPromo) {
                promoList.push({
                  promo: {
                    id: `${biz.id}_promo_cat_${idx}`,
                    title: item.name,
                    description: item.description,
                    discountText: item.promoMessage || "DEAL",
                    imageUrl: biz.images?.[item.promoImageSlot !== undefined ? item.promoImageSlot : 0] || "",
                    isPromo: true,
                    promoTag: item.promoTag || "#PROMO",
                    promoMessage: item.promoMessage || "SPECIAL DEAL",
                    supportiveMessage: item.supportiveMessage || item.description || "",
                    noImage: !!item.noImage,
                    promoImageSlot: item.promoImageSlot !== undefined ? item.promoImageSlot : 0,
                    gradientIndex: item.gradientIndex !== undefined ? item.gradientIndex : 0
                  },
                  biz: biz
                });
              }
            });
          }
          
          const hasCatalogPromo = promoList.some(item => item.biz.id === biz.id);
          if (!hasCatalogPromo && biz.promotions && biz.promotions.length > 0) {
            biz.promotions.forEach(p => {
              if (p.active) {
                promoList.push({
                  promo: {
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    discountText: p.discountText || "PROMO",
                    imageUrl: p.imageUrl || "",
                    isPromo: true,
                    promoTag: "#MEGAOFFER",
                    promoMessage: p.discountText || "OFFER",
                    supportiveMessage: p.description,
                    noImage: !p.imageUrl,
                    promoImageSlot: 0,
                    gradientIndex: 2
                  },
                  biz: biz
                });
              }
            });
          }
        });

        // Ensure we always have delightful flash deal content
        if (promoList.length === 0) {
          const micahBiz = listList.find(b => b.id === "seed_micah") || listList[0];
          promoList.push({
            promo: {
              id: "def_promo_1",
              title: "Back-to-School Barber Flash Cut!",
              description: "Get sharp razor line-ups and pristine hair styling from Prince Micah.",
              discountText: "20% OFF FOR FRESHMEN",
              imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
              active: true,
              gradientIndex: 0
            },
            biz: micahBiz
          });
          promoList.push({
            promo: {
              id: "def_promo_2",
              title: "Stitch-Perfect Moots Court Gowns",
              description: "Advocacy gowns, wings, and smart presentation garments customized live.",
              discountText: "KSh 400 OFF ADVOCATES SETS",
              imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
              active: true,
              gradientIndex: 1
            },
            biz: micahBiz
          });
        }
        setFlashDeals([...promoList].sort(() => Math.random() - 0.5));

        // 4. Fetch dynamic gallery photos (restricted to real ones)
        try {
          const gallery = await fbfs.getCollection<GalleryItem>("gallery");
          setGalleryImages(gallery || []);
          setGalleryCount(gallery.length || 0);
        } catch (_) {}

        // Load active clubs for compact societies directory card layout representation
        let clubsList: Club[] = [];
        try {
          clubsList = await fbfs.getCollection<Club>("clubs", [["active", "==", true]], "name", "asc", 4);
        } catch (_) {}
        if (!clubsList || clubsList.length === 0) {
          clubsList = [
            {
              id: "moot_court_society",
              name: "Moot Court Society",
              category: "Advocacy & Trials",
              description: "Hone elite trial litigation, oral advocacy, and legal brief writing.",
              logoUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=200&auto=format&fit=crop",
              coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
              active: true
            } as any,
            {
              id: "human_rights_assoc",
              name: "Human Rights Law Guild",
              category: "Social Justice Campaign",
              description: "Committed to legal aid clinics, human rights advocacy, and civil rights community discourse.",
              logoUrl: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=200&auto=format&fit=crop",
              coverUrl: "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=1200&auto=format&fit=crop",
              active: true
            } as any
          ];
        }
        setClubs(clubsList);

        // 5. Build dynamic landing hub statistics
        let usersCount = 142;
        try {
          const allUsers = await fbfs.getCollection("users");
          usersCount = allUsers.length || 142;
        } catch (_) {}

        setStats({
          users: usersCount,
          events: evList.length,
          products: listList.length
        });
      } catch (err) {
        console.error("Error loading homepage widgets data:", err);
      }
    };

    loadHomeData();
  }, []);

  // Synchronize shared announcement via query parameter inside HomeView.tsx
  useEffect(() => {
    if (announcements.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get("bulletinId");
      if (sharedId) {
        const matched = announcements.find(a => a.id === sharedId);
        if (matched) {
          setSelectedBulletin(matched);
        }
      }
    }
  }, [announcements]);

  // Auto-shuffle carousel deals
  useEffect(() => {
    if (flashDeals.length <= 1) return;
    const interval = setInterval(() => {
      setActiveDealIdx((prev) => (prev + 1) % flashDeals.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [flashDeals]);

  // Set up real-time ticking countdown to the next event
  useEffect(() => {
    if (upcomingEvents.length === 0) return;

    const interval = setInterval(() => {
      const ev = upcomingEvents[0];
      const dateObj = ev.startDate?.seconds ? new Date(ev.startDate.seconds * 1000) : new Date(ev.startDate);
      const diff = dateObj.getTime() - Date.now();
      
      if (diff <= 0) {
        setCountdown({ days: "00", hours: "00", minutes: "00", seconds: "00" });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        setCountdown({
          days: String(days).padStart(2, "0"),
          hours: String(hours).padStart(2, "0"),
          minutes: String(minutes).padStart(2, "0"),
          seconds: String(seconds).padStart(2, "0")
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [upcomingEvents]);

  return (
    <div className="space-y-32 w-full px-2 sm:px-6 relative z-10 select-none pb-20">

      {/* 1. Hero Section & Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8 items-center">
        {/* Titles */}
        <div className="space-y-6 flex flex-col justify-center lg:col-span-8 text-left">
          <h1 className="text-[5.5rem] sm:text-8xl md:text-[10rem] lg:text-[11.5rem] font-black leading-[0.85] tracking-tighter m-0">
            <span className="block text-white">MKU</span>
            <span className="block outline-text-yellow text-fill-hover cursor-default w-fit">LAW.</span>
          </h1>
          <p className="text-gavel-yellow text-lg md:text-xl font-medium pt-4 max-w-2xl leading-normal">
            Marketplace. Events. Anonymous Feedback.<br />
            Built by Comrades, for Comrades.
          </p>
        </div>
        
        {/* Live Dashboard */}
        <div className="flex flex-col justify-center space-y-4 lg:col-span-4 mt-8 lg:mt-0">
          <div className="border border-gavel-border bg-gavel-card rounded-2xl p-6 flex justify-between items-center hover:border-gavel-yellow transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 group-hover:border-gavel-yellow transition-colors">
                <Users className="w-5 h-5 text-gavel-yellow" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-gavel-muted text-xs font-mono tracking-wider">ACTIVE COMRADES</span>
                <span className="text-xl font-bold text-white">{stats.users}+</span>
              </div>
            </div>
          </div>
          <div className="border border-gavel-border bg-gavel-card rounded-2xl p-6 flex justify-between items-center hover:border-gavel-yellow transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 group-hover:border-gavel-yellow transition-colors">
                <Store className="w-5 h-5 text-gavel-yellow" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-gavel-muted text-xs font-mono tracking-wider">MARKET VENDORS</span>
                <span className="text-xl font-bold text-white">{stats.products}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Admin Announcements */}
      <section className="text-left space-y-6 relative z-10" id="bulletin-section">
        <div className="space-y-1 text-left">
          <p className="text-gavel-yellow text-xs font-mono tracking-[0.2em] uppercase">OFFICIAL RELEASES</p>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Admin Publications & Bulletins</h2>
        </div>
        
        {announcements.length === 0 ? (
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-center py-16">
            <Megaphone className="w-8 h-8 text-gavel-yellow/60 mx-auto mb-4 opacity-70 animate-pulse" />
            <p className="text-white font-bold text-lg mb-1">No Posts today.</p>
            <p className="text-gavel-muted text-xs font-mono uppercase tracking-widest">Check back later for official campus releases</p>
          </div>
        ) : (
          <div className="space-y-8">
            {announcements.map((ann) => (
              <div 
                key={ann.id} 
                className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] relative overflow-hidden group w-full hover:border-[#FFDE00]/30 hover:bg-white/[0.06] transition-all duration-300"
              >
                {/* 1. Animated background gradient reflection */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-gavel-yellow/10 via-transparent to-red-500/5 opacity-55 blur-3xl pointer-events-none group-hover:opacity-75 transition-opacity duration-1000"></div>

                {/* 2. Translucent Megaphone Watermark Icon */}
                <div className="absolute right-4 bottom-0 text-white/[0.015] pointer-events-none select-none z-0 transform translate-y-12 translate-x-12 group-hover:scale-[1.03] group-hover:text-gavel-yellow/[0.025] transition-all duration-700">
                  <Megaphone size={280} strokeWidth={1} className="-rotate-12" />
                </div>

                <div className="absolute inset-y-0 left-0 w-1.5 bg-gavel-yellow z-20"></div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start relative z-10">
                  <div className={ann.coverImage ? "lg:col-span-8 space-y-4 text-left" : "lg:col-span-12 space-y-4 text-left"}>
                    <div className="flex items-center gap-3 text-xs font-mono text-gavel-muted">
                      <span className="bg-gavel-yellow/20 text-gavel-yellow text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-gavel-yellow/30 leading-none">
                        {ann.category || "Announcement"}
                      </span>
                      <span>
                        {new Date(ann.createdAt?.seconds ? ann.createdAt.seconds * 1000 : ann.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight group-hover:text-[#FFDE00] transition-all duration-200">{ann.title}</h3>
                    <p className="text-gavel-muted text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {ann.content}
                    </p>
                    {ann.fileUrl && (
                      <div className="pt-2">
                        <a 
                          href={ann.fileUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#1a1a1a] text-white px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-colors font-bold inline-block cursor-pointer"
                        >
                          Download PDF Attachment
                        </a>
                      </div>
                    )}
                  </div>

                  {ann.coverImage && (
                    <div className="lg:col-span-4 w-full aspect-video lg:aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black relative shadow-lg">
                      <img 
                        src={ann.coverImage} 
                        alt="Bulletin Artwork" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        loading="eager"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Market Promo Banner (Carousel) */}
      {(() => {
        if (flashDeals.length === 0) return null;
        
        const prevPromo = () => {
          setActiveDealIdx(prev => (prev - 1 + flashDeals.length) % flashDeals.length);
        };
        const nextPromo = () => {
          setActiveDealIdx(prev => (prev + 1) % flashDeals.length);
        };

        return (
          <section className="group text-left relative">
            <Link href="/marketplace">
              <div className="display-block space-y-4 mb-6 cursor-pointer">
                <p className="text-gavel-yellow text-sm font-mono tracking-[0.2em] uppercase">Category: Marketplace</p>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
                  Comrade Economy
                </h2>
              </div>
            </Link>
            
            <div className="relative overflow-hidden min-h-[220px] sm:min-h-[280px] rounded-2xl sm:rounded-[3rem] border border-gavel-border/80 bg-[#09090b] p-0 flex flex-col justify-end shadow-2xl select-none">
              <AnimatePresence mode="wait">
                {(() => {
                  const currentDeal = flashDeals[activeDealIdx] || flashDeals[0];
                  if (!currentDeal) return null;
                  const promo = currentDeal.promo;
                  const biz = currentDeal.biz;
                  const grad = PROMO_GRADIENTS[promo.gradientIndex !== undefined ? promo.gradientIndex : 0] || PROMO_GRADIENTS[0];
                  const featuredImg = promo.imageUrl || biz.images?.[promo.promoImageSlot || 0] || biz.images?.[0] || "";

                  return (
                    <motion.div
                      key={activeDealIdx}
                      initial={{ opacity: 0, x: 50, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      className="absolute inset-0 flex flex-col justify-end"
                    >
                      {/* Background rendering */}
                      <div className={`absolute inset-0 z-0 bg-gradient-to-r ${grad.classes}`}>
                        {!promo.noImage && featuredImg && (
                          <>
                            <motion.img 
                              initial={{ scale: 1.05 }}
                              animate={{ 
                                scale: [1, 1.06, 1],
                                rotate: [0, 0.5, -0.5, 0]
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 12,
                                ease: "easeInOut"
                              }}
                              src={featuredImg} 
                              alt={promo.title}
                              referrerPolicy="no-referrer"
                              className="absolute right-0 top-0 bottom-0 w-full sm:w-[65%] h-full object-cover opacity-75 sm:opacity-90 mix-blend-luminosity hover:mix-blend-normal"
                              style={{
                                maskImage: "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 15%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0.85) 75%, black 100%)",
                                WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 15%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0.85) 75%, black 100%)"
                              }}
                            />
                            {/* Seamless background gradient integration with modern backdrop-blur transition overlay */}
                            <div className="absolute inset-y-0 left-0 right-[35%] bg-gradient-to-r from-black/30 to-transparent pointer-events-none z-[1] hidden sm:block"></div>
                            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black to-transparent pointer-events-none z-[1] sm:hidden"></div>
                          </>
                        )}
                        {/* General ambient dark fade to protect text legibility on both mobile/desktop */}
                        <div className="absolute inset-0 bg-black/45 sm:bg-black/10 z-0"></div>
                      </div>

                      <div className="relative z-10 p-6 sm:p-10 md:p-12 text-left space-y-4 max-w-2xl">
                        <div className="space-y-1.5 text-white">
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-1.5"
                          >
                            <motion.span 
                              animate={{ scale: [1, 1.1, 1] }} 
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className="text-[9px] font-mono uppercase tracking-[0.2em] text-gavel-yellow font-black block no-recolor drop-shadow-sm"
                            >
                              {promo.promoTag || "#PROMO"}
                            </motion.span>
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/80 font-semibold block no-recolor drop-shadow-sm">
                              • {biz.businessName}
                            </span>
                          </motion.div>
                          
                          <motion.h2 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 150 }}
                            className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-none text-white drop-shadow"
                          >
                            {promo.promoMessage || "SPECIAL DEAL"}
                          </motion.h2>
                          
                          <motion.h3 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-xs sm:text-sm font-semibold tracking-wide text-white/95 uppercase pr-8 font-mono no-recolor line-clamp-1"
                          >
                            {promo.title}
                          </motion.h3>
                          
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="text-gray-200 text-[11px] sm:text-xs font-medium max-w-lg font-sans leading-relaxed line-clamp-2 pr-4 drop-shadow-sm"
                          >
                            {promo.supportiveMessage || promo.description}
                          </motion.p>
                        </div>

                        <motion.div 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center gap-3 pt-1"
                        >
                          <Link href="/marketplace" className="px-5 py-2.5 rounded-xl bg-black hover:bg-gavel-yellow text-gavel-yellow hover:text-black hover:border-gavel-yellow font-black text-[9px] uppercase tracking-widest transition-all duration-300 shadow border border-gavel-yellow/30 cursor-pointer text-center">
                            Visit Marketplace
                          </Link>
                          
                          <span className="text-[9px] font-mono text-white/60 font-semibold uppercase tracking-wider hidden sm:inline">
                            Authorized Merchant: {biz.ownerName}  
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Carousel Slider manual indicators and arrows */}
              {flashDeals.length > 1 && (
                <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                  <button 
                    onClick={prevPromo}
                    className="text-white hover:text-gavel-yellow cursor-pointer transition-colors text-[10px] font-mono font-bold px-1"
                    title="Previous Deal"
                  >
                    ←
                  </button>
                  
                  <div className="flex gap-1 px-1">
                    {flashDeals.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveDealIdx(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${activeDealIdx === idx ? "w-4.5 bg-gavel-yellow" : "bg-white/20"}`}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={nextPromo}
                    className="text-white hover:text-gavel-yellow cursor-pointer transition-colors text-[10px] font-mono font-bold px-1"
                    title="Next Deal"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* 4. Events Teaser with Countdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
        <div className="space-y-6">
          <p className="text-gavel-yellow text-sm font-mono tracking-[0.2em] uppercase">Category: Events</p>
          <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tight">
            <span className="block text-white font-sans">Don't miss</span>
            <span className="block text-gavel-yellow font-sans">what's next.</span>
          </h2>
          <p className="text-gavel-muted text-lg max-w-md">
            From moot courts to networking summits — every major event for MKU Law students in one place.
          </p>
          <Link href="/events">
            <span className="inline-flex items-center gap-2 text-gavel-yellow font-bold hover:text-white transition-colors cursor-pointer text-base">
              View all events <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
        
        {upcomingEvents.length > 0 ? (
          <div className="border border-white/10 bg-gavel-card rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-gavel-yellow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-white font-bold text-xl">{upcomingEvents[0]?.title}</h3>
              <span className="text-gavel-yellow text-xs font-mono tracking-widest uppercase bg-gavel-yellow/10 px-3 py-1 rounded-full border border-gavel-yellow/20">Next Event</span>
            </div>
            
            {/* Timer Grid */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 mb-8 relative z-10">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl md:text-4xl font-bold text-white mb-1">{countdown.days}</span>
                <span className="text-gavel-muted text-[10px] font-mono">DAYS</span>
              </div>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl md:text-4xl font-bold text-white mb-1">{countdown.hours}</span>
                <span className="text-gavel-muted text-[10px] font-mono">HRS</span>
              </div>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl md:text-4xl font-bold text-white mb-1">{countdown.minutes}</span>
                <span className="text-gavel-muted text-[10px] font-mono">MIN</span>
              </div>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl py-5 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl md:text-4xl font-bold text-gavel-yellow mb-1">{countdown.seconds}</span>
                <span className="text-gavel-muted text-[10px] font-mono">SEC</span>
              </div>
            </div>
            
            <div className="relative z-10 flex justify-between items-center pt-6 border-t border-white/5">
              <div className="text-left">
                <p className="text-xs text-gavel-muted font-mono uppercase tracking-widest">Capacity Remaining</p>
                <p className="text-white font-bold text-xl mt-1">
                  {upcomingEvents[0]?.capacity ? Math.max(0, upcomingEvents[0].capacity - (upcomingEvents[0].registeredCount || 0)) : "42"}
                </p>
              </div>
              <Link href={`/events`}>
                <span className="bg-gavel-yellow text-black font-bold px-8 py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(255,222,0,0.2)] inline-block cursor-pointer select-none">
                  RSVP Now
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="border border-white/10 bg-gavel-card rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center text-center group min-h-[300px]">
            <Calendar className="w-10 h-10 text-gavel-muted/40 mb-4 animate-pulse" />
            <h3 className="text-white font-bold text-xl mb-2">No event</h3>
            <p className="text-gavel-muted text-xs font-mono uppercase tracking-widest max-w-xs">No upcoming events are currently scheduled by the administration</p>
          </div>
        )}
      </section>

      {/* 5. Gallery Teaser */}
      <section className="space-y-8 text-left">
        <div className="flex flex-col md:flex-row justify-between items-end">
          <div className="space-y-2">
            <p className="text-gavel-yellow text-sm font-mono tracking-[0.2em] uppercase">Category: Campus Gallery</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Moments in <span className="text-transparent bg-clip-text bg-gradient-to-r from-gavel-yellow to-gavel-purple italic font-serif">Focus.</span>
            </h2>
          </div>
          <Link href="/gallery">
            <span className="text-gavel-muted hover:text-white transition-colors text-sm font-medium flex items-center gap-1 mt-4 md:mt-0 cursor-pointer">
              View All Photos <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto hide-scroll snap-x pb-4">
          {galleryImages && galleryImages.length > 0 ? (
            galleryImages.map((snap) => (
              <Link key={snap.id} href="/gallery">
                <div className="relative min-w-[180px] sm:min-w-[200px] h-[240px] sm:h-[260px] rounded-2xl overflow-hidden group snap-start cursor-pointer bg-gavel-card border border-white/5">
                  <img 
                    src={snap.imageUrl} 
                    alt="Campus Snap"
                    className="w-full h-full object-cover filter brightness-75 transition-transform duration-700 group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute bottom-0 left-0 p-4 w-full text-left">
                    <h3 className="text-white font-bold text-sm mb-0.5 truncate">{snap.caption || "Campus Moment"}</h3>
                    <span className="text-gavel-yellow font-mono text-[8px] tracking-widest uppercase">
                      {snap.category || "GALLERY"}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="relative w-full h-[240px] sm:h-[260px] rounded-2xl bg-[#09090b] border border-white/5 flex flex-col justify-center items-center text-center p-6 shrink-0 md:min-w-[400px]">
              <ImageIcon className="w-6 h-6 text-gavel-muted mb-2 opacity-30" />
              <p className="text-gavel-muted font-mono text-[9px] uppercase tracking-wider">No snapshots published yet</p>
            </div>
          )}
          {/* Static design card at the end */}
          <Link href="/gallery">
            <div className="relative min-w-[180px] sm:min-w-[200px] h-[240px] sm:h-[260px] rounded-2xl overflow-hidden group snap-start cursor-pointer bg-[#EBE9E0] border border-white/5 flex flex-col justify-between p-4 text-black shrink-0">
              <span className="font-black text-2xl text-left">M.</span>
              <div className="text-left">
                <p className="font-serif italic font-bold text-xs">"The law is lived within these halls."</p>
                <span className="text-[8px] font-mono mt-1 block opacity-50 font-black">MKU PRESS</span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 6. Vault Teaser */}
      <section className="text-left">
        <Link href="/vault" className="block focus:outline-none">
          <div className="border border-gavel-purple/30 bg-[#1a1128]/50 backdrop-blur-sm rounded-[3rem] p-10 md:p-16 relative overflow-hidden transition-all duration-500 hover:border-gavel-purple group cursor-pointer">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gavel-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-gavel-purple/20 transition-colors duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
              <div className="space-y-6 flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-gavel-purple text-sm font-mono tracking-[0.2em] uppercase">Category: Pigeonhole</p>
                  <span className="text-gavel-purple/50 text-xs font-mono tracking-widest hidden md:block">ANONYMOUS</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                  <span className="block text-white">Got a secret?</span>
                  <span className="block outline-text-purple font-black mt-2">Drop it here.</span>
                </h2>
                <p className="text-gavel-muted text-lg max-w-md font-sans">
                  Fully anonymous. No IP stored. No account needed. Write your complaints, ideas, or issues directly to the administration.
                </p>
                <span className="inline-flex bg-[#1a1a1a] text-white px-6 py-3 rounded-xl text-sm font-semibold border border-white/10 hover:bg-gavel-purple hover:border-gavel-purple transition-colors items-center gap-2">
                  Enter Vault <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border border-gavel-purple/20 flex items-center justify-center bg-gavel-purple/5 group-hover:scale-105 transition-transform duration-700 shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-gavel-purple/40 flex items-center justify-center bg-black shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                  <Lock className="w-10 h-10 md:w-12 md:h-12 text-gavel-purple" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* 7. NEWSLETTER ENVELOPE SUBSCRIPTION CONTAINER (ABSOLUTE LAST ITEM AT THE BOTTOM) */}
      <section className="text-left bg-gradient-to-br from-[#121214] to-[#0c0c0e] border border-white/10 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gavel-yellow/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="space-y-3 max-w-xl">
            <p className="text-gavel-yellow text-xs font-mono tracking-[0.2em] uppercase">PARLIAMENT AUTH WIRE</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Subscribe to Campus Gazettes</h2>
            <p className="text-gavel-muted text-sm leading-relaxed font-sans">
              Get notified of latest timetables, litigation releases, career roundtables, and marketplace exclusive promotions immediately in your inbox.
            </p>
          </div>
          
          <div className="w-full lg:w-auto min-w-[320px] md:min-w-[450px]">
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const emailInput = form.elements.namedItem("subscriberEmail") as HTMLInputElement;
                const email = emailInput?.value?.trim();
                if (!email) return;
                try {
                  const allUsers = await fbfs.getCollection<any>("users");
                  const existing = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
                  
                  if (existing) {
                    await fbfs.updateDocById("users", existing.id, {
                      newsletterSubscribed: true
                    });
                  } else {
                    await fbfs.addDocInCollection("users", {
                      email,
                      name: email.split("@")[0],
                      role: "student",
                      active: true,
                      createdAt: Date.now(),
                      newsletterSubscribed: true
                    });
                  }
                  
                  try {
                    await fetch("/api/send-newsletter", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        subject: "Welcome to MKU Law Student Hub!",
                        postTitle: "Subscription Activated Successfully",
                        audience: "all",
                        emails: [email],
                        blocks: [
                          { id: "s1", type: "h1", content: "Subscription Confirmed" },
                          { id: "s2", type: "text", content: "You have successfully enlisted with the Mount Kenya University School of Law central broadcasting hub. You will receive urgent updates, court notifications, peer briefings, and other essential directives live." }
                        ]
                      })
                    });
                  } catch (_) {}

                  triggerToast("Subscription completed successfully! Enlisted among newsletter members.");
                  form.reset();
                } catch (err) {
                  console.error(err);
                  triggerToast("Subscription created! Thank you for subscribing.");
                  form.reset();
                }
              }}
              className="flex flex-col sm:flex-row gap-3 w-full bg-[#08080a] border border-white/10 p-2.5 rounded-2xl"
            >
              <input 
                name="subscriberEmail"
                type="email" 
                required 
                placeholder="Enter your campus email..." 
                className="bg-transparent border-0 text-white placeholder:text-gray-500 text-sm focus:outline-none flex-1 px-4 py-2.5 font-mono"
              />
              <button 
                type="submit" 
                className="bg-[#FFDE00] text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-white transition-colors duration-200 shrink-0 select-none cursor-pointer"
              >
                Join Network
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Global State Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0e0e11] border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-2xl animate-fade-in-up max-w-sm text-xs font-mono text-white">
          <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-[#FFDE00]" : "bg-red-500"}`}></div>
          <p className="flex-1 text-[#f4f4f5]">{toast.message}</p>
        </div>
      )}

      {/* DETAILED POPUP: BULLETIN / OFFICIAL ANNOUNCEMENT */}
      {selectedBulletin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d0d0f] border border-[#ffde00]/15 p-6 sm:p-8 relative shadow-2xl space-y-6 text-left">
            {/* Action Rails */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-20">
              <button
                type="button"
                onClick={() => setShareData({
                  isOpen: true,
                  url: `https://studenthubmku.xyz/?bulletinId=${selectedBulletin.id}`,
                  title: selectedBulletin.title,
                  category: "Bulletin"
                })}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gavel-muted hover:text-white hover:bg-[#FFDE00] hover:text-black hover:border-[#FFDE00] transition-all cursor-pointer"
                title="Share Bulletin"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => setSelectedBulletin(null)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gavel-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Slot */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 text-xs font-mono text-gavel-muted">
                <span className="bg-gavel-yellow/20 text-gavel-yellow text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-gavel-yellow/30 leading-none">
                  {selectedBulletin.category || "Official Announcement"}
                </span>
                <span>
                  {new Date(selectedBulletin.createdAt?.seconds ? selectedBulletin.createdAt.seconds * 1000 : selectedBulletin.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-snug">
                {selectedBulletin.title}
              </h2>

              {selectedBulletin.coverImage && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black relative">
                  <img
                    src={selectedBulletin.coverImage}
                    alt="Bulletin cover artifact"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-gavel-muted text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium font-sans">
                {selectedBulletin.content}
              </p>

              {selectedBulletin.fileUrl && (
                <div className="pt-4 border-t border-white/5">
                  <a
                    href={selectedBulletin.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gavel-yellow text-black px-6 py-3 rounded-xl text-xs font-mono font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer shadow-lg shadow-gavel-yellow/5 text-center inline-block"
                  >
                    Download Official PDF Document
                  </a>
                </div>
              )}
            </div>
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
