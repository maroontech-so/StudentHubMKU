import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { fbfs, auth } from "../lib/firebase";
import { MarketplaceProfile, CatalogItem, BusinessRating, PromotionItem } from "../types";
import { useAuth } from "../App";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { fetchAndRenderEmailTemplate } from "../utils/emailHelper";
import { 
  Store, 
  Search, 
  Check, 
  Star, 
  MapPin, 
  Clock, 
  HelpCircle, 
  LogIn, 
  Sparkles, 
  UserPlus, 
  MessageSquare, 
  Phone, 
  X, 
  ChevronRight, 
  User as UserIcon,
  Crown,
  Heart,
  Image as ImageIcon,
  Share2
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";

// 11 Custom Premium Gradients and Banner Styles for Promotion Blocks
const PROMO_GRADIENTS = [
  { id: 0, name: "Yellow Gavel (Mockup Style)", classes: "from-[#FFDE00] to-[#ffae00] text-black", overlay: "bg-black/10 text-black", text: "text-black" },
  { id: 1, name: "Sunset Fire", classes: "from-amber-500 to-rose-600 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 2, name: "Cosmic Glow", classes: "from-indigo-900 via-purple-900 to-purple-800 text-white", overlay: "bg-black/35 text-white", text: "text-white" },
  { id: 3, name: "Emerald Cyber", classes: "from-emerald-600 via-teal-700 to-cyan-800 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 4, name: "Oceanic Wave", classes: "from-sky-400 to-blue-600 text-white", overlay: "bg-black/15 text-white", text: "text-white" },
  { id: 5, name: "Neon Violet", classes: "from-fuchsia-600 via-purple-700 to-pink-500 text-white", overlay: "bg-black/15 text-white", text: "text-white" },
  { id: 6, name: "Warm Amber", classes: "from-orange-400 via-amber-500 to-yellow-500 text-white", overlay: "bg-black/10 text-white", text: "text-white" },
  { id: 7, name: "Deep Crimson", classes: "from-red-700 to-neutral-900 text-white", overlay: "bg-black/30 text-white", text: "text-white" },
  { id: 8, name: "Dark Modern Gold", classes: "from-neutral-900 via-zinc-800 to-stone-900 text-white border-l-4 border-[#FFDE00]", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 9, name: "Berry Delight", classes: "from-pink-500 via-purple-500 to-indigo-500 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 10, name: "Royal Amethyst", classes: "from-violet-800 to-fuchsia-700 text-white", overlay: "bg-black/25 text-white", text: "text-white" }
];

// Initial premium hardcoded mock listings are removed to load ONLY actual Firestore records
const SEED_PROFILES: MarketplaceProfile[] = [];

export function MarketplaceView() {
  const { currentUser, profile, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Primary list state
  const [businesses, setBusinesses] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    window.addEventListener("global-search", handleGlobalSearch);
    return () => window.removeEventListener("global-search", handleGlobalSearch);
  }, []);

  // Detailed Modal state
  const [selectedBiz, setSelectedBiz] = useState<MarketplaceProfile | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Share Modal State
  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string; category: "Event" | "Bulletin" | "Portfolio" }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Portfolio"
  });

  // Auth Overlay state
  const [authRequiredReason, setAuthRequiredReason] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Interactive Live Rating state
  const [userRating, setUserRating] = useState<number>(5);
  const [userReview, setUserReview] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Promotions Carousel state
  const [promoIdx, setPromoIdx] = useState(0);

  const allPromotions = React.useMemo(() => {
    const list: Array<{ 
      promo: {
        id: string;
        title: string;
        description: string;
        discountText: string;
        imageUrl?: string;
        isPromo: boolean;
        promoTag: string;
        promoMessage: string;
        supportiveMessage: string;
        noImage?: boolean;
        promoImageSlot?: number;
        gradientIndex?: number;
      }; 
      biz: MarketplaceProfile;
    }> = [];

    businesses.forEach(biz => {
      // 1. Scan catalog for flagged items
      if (biz.catalog && Array.isArray(biz.catalog)) {
        biz.catalog.forEach((item, idx) => {
          if (item.isPromo) {
            list.push({
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
      
      // 2. Also keep backward compatibility with explicit promotions array if no catalog promos are marked
      const hasCatalogPromo = list.some(item => item.biz.id === biz.id);
      if (!hasCatalogPromo && biz.promotions && biz.promotions.length > 0) {
        biz.promotions.forEach(p => {
          if (p.active) {
            list.push({
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

    return [...list].sort(() => Math.random() - 0.5);
  }, [businesses]);

  const nextPromo = () => {
    if (allPromotions.length <= 1) return;
    setPromoIdx(prev => (prev + 1) % allPromotions.length);
  };

  const prevPromo = () => {
    if (allPromotions.length <= 1) return;
    setPromoIdx(prev => (prev - 1 + allPromotions.length) % allPromotions.length);
  };

  useEffect(() => {
    if (allPromotions.length <= 1) return;
    const interval = setInterval(() => {
      setPromoIdx(prev => (prev + 1) % allPromotions.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [allPromotions.length]);

  // Global toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const fetched = await fbfs.getCollection<MarketplaceProfile>("marketplaceProfiles");
      setBusinesses(fetched);
    } catch (err) {
      console.error("Bazaar portfolio load error:", err);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  // Synchronize shared portfolio via query parameter inside MarketplaceView.tsx
  useEffect(() => {
    if (businesses.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedId = urlParams.get("id");
      if (sharedId) {
        const matched = businesses.find(b => b.id === sharedId);
        if (matched) {
          setSelectedBiz(matched);
        }
      }
    }
  }, [businesses]);

  // Filter logic
  const filteredBusinesses = businesses.filter(biz => {
    // Category check
    if (categoryFilter !== "all" && biz.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    // Search check
    if (searchTerm.trim() !== "") {
      const s = searchTerm.toLowerCase();
      const matchBizName = biz.businessName?.toLowerCase().includes(s);
      const matchOwner = biz.ownerName?.toLowerCase().includes(s);
      const matchLoc = biz.location?.toLowerCase().includes(s);
      const matchDesc = biz.description?.toLowerCase().includes(s);
      
      if (!matchBizName && !matchOwner && !matchLoc && !matchDesc) {
        return false;
      }
    }
    return true;
  });

  // Open detailing modal helper
  const handleOpenProfile = (biz: MarketplaceProfile) => {
    setSelectedBiz(biz);
    setActiveImageIdx(0);
    setUserReview("");
    setUserRating(5);

    // If vendor has profile view alerting enabled, trigger instant lead mailshot
    if (biz.emailNotificationsEnabled !== false && biz.contactEmail) {
      console.log(`[Marketplace] Alerting active vendor ${biz.businessName} of profile discovery view...`);
      
      const triggerAlert = async () => {
        try {
          const rendered = await fetchAndRenderEmailTemplate("marketplace_lead", {
            vendorName: biz.ownerName || "Business Owner",
            businessName: biz.businessName
          });

          await fetch("/api/alert-vendor", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              vendorEmail: biz.contactEmail,
              vendorName: biz.ownerName || "Business Owner",
              businessName: biz.businessName,
              customSubject: rendered?.customSubject || undefined,
              customHtml: rendered?.customHtml || undefined
            })
          });
        } catch (err) {
          console.error("Vendor alert failure during profile view hook:", err);
        }
      };

      triggerAlert();
    }
  };

  // Live rating submit action
  const handleRateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;

    if (!currentUser) {
      setAuthRequiredReason("Kindly log in or register a Student Shopper Profile to rate local campus enterprises!");
      return;
    }

    setRatingLoading(true);
    try {
      const feedback: BusinessRating = {
        userId: currentUser.uid,
        userName: profile?.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Student Reviewer",
        rating: userRating,
        review: userReview.trim(),
        timestamp: Date.now()
      };

      const updatedRatings = [feedback, ...(selectedBiz.ratings || [])];
      
      // Remove duplicate review by same user to prevent spamming
      const uniqueRatings = updatedRatings.filter((value, index, self) =>
        self.findIndex(v => v.userId === value.userId) === index
      );

      // Re-calculate average rating
      const sum = uniqueRatings.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / uniqueRatings.length).toFixed(1));

      const updatedBiz: Partial<MarketplaceProfile> = {
        ratings: uniqueRatings,
        overallRating: avg
      };

      // Firestore push
      await fbfs.setDocById("marketplaceProfiles", selectedBiz.id, updatedBiz, true);
      
      // Feedback inside the UI
      const indexToUpdate = businesses.findIndex(b => b.id === selectedBiz.id);
      if (indexToUpdate > -1) {
        const fullUpdated = { ...businesses[indexToUpdate], ...updatedBiz } as MarketplaceProfile;
        const copyList = [...businesses];
        copyList[indexToUpdate] = fullUpdated;
        setBusinesses(copyList);
        setSelectedBiz(fullUpdated);
      }

      setUserReview("");
      triggerToast("Thank you for supporting student businesses! Your rating has been cast.");
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to lock in your review. Please try again.", "error");
    } finally {
      setRatingLoading(false);
    }
  };

  // Auth handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        triggerToast("Welcome back to Student Bazaar!");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        
        // Auto create base profile
        const newProfile = {
          uid: cred.user.uid,
          name: authName.trim() || authEmail.split("@")[0],
          email: authEmail,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authName.trim() || authEmail.split("@")[0])}&background=020617&color=FFDE00`,
          role: "vendor",
          active: true,
          createdAt: new Date(),
          lastActive: new Date()
        };
        await fbfs.setDocById("users", cred.user.uid, newProfile);
        triggerToast("Account configured successfully!");
      }

      // Close auth dialog
      setAuthRequiredReason(null);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");

      // Trigger hot refresh
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Failed to authenticate.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-1 pb-6 text-left w-full select-none">
      
      {/* 1. ELEGANT CLASSIC HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gavel-border/30">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white dark:text-white uppercase font-sans">
            Student Bazaar
          </h1>
          <p className="text-gavel-muted text-xs font-mono uppercase tracking-wider mt-1">
            Student Enterprises, Products & Exclusive Marketplace Deals
          </p>
        </div>
      </div>

      {/* 1.5 PROMOTIONS DEAL CAROUSEL - THE FIRST KEY ADVERT TO HIT */}
      {allPromotions.length > 0 && (
        <section className="relative rounded-2xl sm:rounded-[3rem] overflow-hidden border border-gavel-border/80 bg-[#09090b] p-0 flex flex-col justify-end min-h-[220px] sm:min-h-[280px] shadow-2xl select-none">
          <AnimatePresence mode="wait">
            {(() => {
              const promo = allPromotions[promoIdx].promo;
              const biz = allPromotions[promoIdx].biz;
              const grad = PROMO_GRADIENTS[promo.gradientIndex !== undefined ? promo.gradientIndex : 0] || PROMO_GRADIENTS[0];
              const featuredImg = promo.imageUrl || biz.images?.[promo.promoImageSlot || 0] || biz.images?.[0] || "";

              return (
                <motion.div
                  key={promoIdx}
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
                      <button
                        onClick={() => {
                          setSelectedBiz(biz);
                          setActiveImageIdx(0);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-black hover:bg-gavel-yellow text-gavel-yellow hover:text-black hover:border-gavel-yellow font-black text-[9px] uppercase tracking-widest transition-all duration-300 shadow border border-gavel-yellow/30 cursor-pointer text-center"
                      >
                        Visit
                      </button>
                      
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
          {allPromotions.length > 1 && (
            <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
              <button 
                onClick={prevPromo}
                className="text-white hover:text-gavel-yellow cursor-pointer transition-colors text-[10px] font-mono font-bold px-1"
                title="Previous Deal"
              >
                ←
              </button>
              
              <div className="flex gap-1 px-1">
                {allPromotions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPromoIdx(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${promoIdx === idx ? "w-4.5 bg-gavel-yellow" : "bg-white/20"}`}
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
        </section>
      )}

      {/* 2. LIVE SEARCH & RAIL CATEGORIES */}
      <section className="w-full">
        <div className="flex overflow-x-auto gap-1.5 py-2 scroll-smooth hide-scroll border-b border-gavel-border/30">
          {[
            { id: "all", label: "All Shops" },
            { id: "Salon & Grooming", label: "Grooming" },
            { id: "Apparel & Fashion", label: "Apparel" },
            { id: "Books & Stationeries", label: "Stationery" },
            { id: "Electronics & Tech", label: "Tech" },
            { id: "Wholesale & Groceries", label: "Groceries" },
            { id: "Beauty & Therapy", label: "Beauty" },
            { id: "Food & Catering", label: "Food" },
            { id: "Baking & Cakes", label: "Bakes" },
            { id: "Photography & Media", label: "Media" },
            { id: "Academic Services", label: "Academic" },
            { id: "Others", label: "Others" }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest cursor-pointer transition-all shrink-0 ${categoryFilter.toLowerCase() === cat.id.toLowerCase() ? "bg-gavel-yellow text-black" : "border border-gavel-border text-gavel-muted hover:text-white"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 3. ACTIVE PORTFOLIOS GRID */}
      <section className="space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-gavel-border/50">
          <span className="text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={12} className="text-gavel-yellow" /> ENTERPRISE STREAM LISTINGS
          </span>
          <span className="text-[10px] font-mono text-gavel-muted font-bold">{filteredBusinesses.length} Business Portfolios Listed</span>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 rounded-2xl border border-gavel-border bg-white/[0.01] animate-pulse h-96 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="aspect-video w-full rounded-xl bg-white/10"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-white/5 rounded w-2/3"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-10 bg-white/5 rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-gavel-border/50 rounded-2xl max-w-sm mx-auto bg-[#09090b]/40">
            <HelpCircle size={24} className="text-gavel-muted mx-auto mb-2.5 opacity-60" />
            <p className="text-gavel-muted text-xs font-mono uppercase tracking-widest font-black">No Businesses Found</p>
            <p className="text-xs text-gavel-muted mt-2">Adjust search tags or register the very first enterprise today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {filteredBusinesses.map(biz => {
              const mainBgImage = biz.images && biz.images.length > 0 
                ? biz.images[0] 
                : "";
              const formattedDate = new Date(biz.createdAt || Date.now()).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              // Starting price indicator for previewing
              const startingCost = biz.catalog && biz.catalog.length > 0 
                ? biz.catalog[0].price 
                : "Active Portfolio";

              return (
                <div 
                  key={biz.id} 
                  onClick={() => handleOpenProfile(biz)}
                  className="premium-card rounded-2xl sm:rounded-[2rem] border border-gavel-border/80 bg-gavel-card flex flex-col justify-between group h-full cursor-pointer hover:border-gavel-yellow/30 hover:shadow-xl transition-all duration-300 overflow-hidden text-left relative"
                >
                  <div className="space-y-2">
                    {/* Featured Cover Area designed exactly like the Phone screenshots */}
                    <div className="aspect-square w-full overflow-hidden border-b border-gavel-border/40 relative bg-[#090a0f] flex items-center justify-center">
                      {mainBgImage ? (
                        <img 
                          src={mainBgImage} 
                          alt={biz.businessName} 
                          loading="lazy" 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover group-hover:scale-105 duration-500 transition-all pointer-events-none" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-gavel-card flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden group-hover:scale-105 duration-500 transition-all">
                          <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                            <svg className="w-32 h-32 text-[#FFDE00]" viewBox="0 0 100 100" fill="currentColor">
                              <path d="M50,15 L78,24 C78,50 64,72 50,82 C36,72 22,50 22,24 Z" />
                            </svg>
                          </div>
                          <span className="text-3xl font-black text-[#FFDE00]/25 font-mono tracking-widest uppercase">
                            {biz.businessName ? biz.businessName.substring(0, 2) : "BZ"}
                          </span>
                          <span className="text-[7.5px] font-mono text-gavel-muted uppercase tracking-widest font-black mt-2 block">
                            No Portrait Uploaded
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
                        <span className="px-2 py-0.5 bg-black/85 backdrop-blur-md border border-white/5 rounded text-[7px] min-[400px]:text-[8px] font-mono text-gavel-yellow uppercase font-black tracking-wider leading-none">
                          {biz.category}
                        </span>
                      </div>

                      {/* Floating heart icon on top-right resembling Phone 2 screen */}
                      <button 
                        type="button" 
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-gavel-yellow hover:scale-110 active:scale-95 duration-200 cursor-pointer z-10"
                        title="Add to wishlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerToast(`Added ${biz.businessName} to your favorites!`);
                        }}
                      >
                        <Heart size={10} className="fill-gavel-yellow text-gavel-yellow" />
                      </button>

                      {biz.overallRating && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-2 py-0.5 bg-black/90 backdrop-blur-md border border-gavel-yellow/20 rounded text-[7px] min-[400px]:text-[8px] font-mono text-gavel-yellow font-bold leading-none">
                          <Star size={8} className="fill-gavel-yellow text-gavel-yellow" />
                          <span>{biz.overallRating}</span>
                        </div>
                      )}
                    </div>

                    <div className="px-3 sm:px-5 pb-1 space-y-1 sm:space-y-1.5">
                      <div className="space-y-0.5">
                        <span className="text-[7.5px] font-mono text-gavel-yellow font-black uppercase tracking-widest block leading-none">
                          COMRADE VENTURE
                        </span>
                        <h3 className="font-extrabold text-white uppercase text-[10px] sm:text-xs tracking-tight line-clamp-1 group-hover:text-[#FFDE00] transition-colors leading-tight">
                          {biz.businessName}
                        </h3>
                        <p className="text-gavel-muted text-[10px] line-clamp-2 leading-relaxed font-sans font-medium">
                          {biz.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-[8.5px] font-mono text-gavel-muted uppercase font-bold border-t border-gavel-border/30">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin size={9} className="text-gavel-yellow shrink-0" />
                          <span className="truncate">{biz.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mx-3 sm:mx-5 mb-3 sm:mb-5 mt-2 p-2 bg-white/[0.02] border border-gavel-border/40 rounded-xl flex items-center justify-between group-hover:bg-[#FFDE00]/5 hover:border-[#FFDE00]/30 transition-all">
                    <span className="text-[8.5px] font-mono text-[#FFDE00] font-black uppercase tracking-wider leading-none block">
                      {startingCost}
                    </span>
                    <span className="flex items-center gap-0.5 text-[8.5px] font-mono text-gavel-muted group-hover:text-white transition-colors uppercase font-bold">
                      View <ChevronRight size={10} className="group-hover:translate-x-0.5 duration-200 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. MODAL POPUP: DETAILED PROFILE VIEW (PRODUCT SLIDE-OVER METAPHOR) */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0a0a0c] border border-gavel-border/80 p-5 sm:p-8 relative shadow-2xl space-y-8 text-left">
            
            {/* Close & Share button rails */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-20">
              <button
                type="button"
                onClick={() => setShareData({
                  isOpen: true,
                  url: `https://studenthubmku.xyz/marketplace?id=${selectedBiz.id}`,
                  title: selectedBiz.businessName,
                  category: "Portfolio"
                })}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gavel-muted hover:text-white hover:bg-[#FFDE00] hover:text-black hover:border-[#FFDE00] transition-all cursor-pointer"
                title="Share Portfolio"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={() => setSelectedBiz(null)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-gavel-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Amazon-style Bento Header: Gallery (Left) & Core Info / Cart (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10 pb-8 border-b border-gavel-border/40">
              
              {/* Left Column: Heavy Product Image Showcase & Media Reel */}
              <div className="md:col-span-6 space-y-4">
                <div className="aspect-video sm:aspect-square w-full rounded-2xl overflow-hidden border border-gavel-border bg-black relative">
                  {selectedBiz.images && selectedBiz.images.length > 0 && selectedBiz.images[activeImageIdx] ? (
                    <img 
                      src={selectedBiz.images[activeImageIdx]} 
                      alt={`${selectedBiz.businessName} catalog`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-4">
                      <Store size={40} className="text-gavel-yellow/20 mb-2" />
                      <span className="text-xs font-mono text-gavel-muted uppercase tracking-widest font-black">No Brand Photo Added</span>
                    </div>
                  )}

                  {/* Rating Tag Overlaid on Image */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1 bg-black/85 backdrop-blur-md rounded-full border border-gavel-yellow/35 text-[10px] font-mono text-gavel-yellow font-bold">
                    <Star size={10} className="fill-gavel-yellow text-gavel-yellow" />
                    <span>{selectedBiz.overallRating ? selectedBiz.overallRating.toFixed(1) : "5.0"} Rating</span>
                  </div>

                  {/* Category overlay */}
                  <span className="absolute bottom-3 right-3 px-3 py-1 bg-black/85 backdrop-blur-md rounded-lg border border-white/5 text-[9px] font-mono text-white/80 font-bold uppercase tracking-wider">
                    {selectedBiz.category}
                  </span>
                </div>

                {/* Thumbnails list */}
                {selectedBiz.images && selectedBiz.images.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                    {selectedBiz.images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${activeImageIdx === idx ? "border-gavel-yellow scale-95" : "border-gavel-border/60 hover:border-white/40"}`}
                      >
                        <img src={img} alt="Thumb" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Business Stats Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/[0.02] border border-gavel-border/40 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-mono text-gavel-muted uppercase font-bold block mb-0.5">Location</span>
                    <span className="text-xs text-white uppercase font-black truncate block">📍 {selectedBiz.location}</span>
                  </div>
                  <div className="bg-white/[0.02] border border-gavel-border/40 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-mono text-gavel-muted uppercase font-bold block mb-0.5">Operating Hours</span>
                    <span className="text-xs text-gavel-yellow uppercase font-black truncate block">⏰ {selectedBiz.hours || "Flexitime"}</span>
                  </div>
                  <div className="bg-white/[0.02] border border-gavel-border/40 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-mono text-gavel-muted uppercase font-bold block mb-0.5">Proprietor</span>
                    <span className="text-xs text-white uppercase font-black truncate block">👤 {selectedBiz.ownerName}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Amazon-style Buy/Contact Box, Meta details & Description */}
              <div className="md:col-span-6 flex flex-col justify-between space-y-6 sm:space-y-8">
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gavel-yellow font-black">Authorized Student Merchant</span>
                    <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none animate-pulse-subtle">
                      {selectedBiz.businessName}
                    </h1>
                  </div>

                  {/* Rating Stars Bar */}
                  <div className="flex items-center gap-2 border-b border-gavel-border/30 pb-3">
                    <div className="flex text-gavel-yellow">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          className={`fill-current ${Math.round(selectedBiz.overallRating || 5) >= star ? "text-gavel-yellow" : "text-zinc-700"}`} 
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-gavel-muted font-bold uppercase">
                      ({selectedBiz.ratings ? selectedBiz.ratings.length : 0} verified reviews)
                    </span>
                  </div>

                  {/* Premium Brand Intro & Bio Description */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-mono text-gavel-muted uppercase tracking-widest font-black">About the Merchant</h3>
                    <p className="text-sm text-gavel-muted font-sans leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedBiz.description}
                    </p>
                  </div>
                </div>

                {/* Real-time Order Action Box */}
                <div className="bg-[#111115] border border-gavel-border/80 rounded-2xl p-5 space-y-4 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-mono text-gavel-muted uppercase font-black tracking-widest block">Primary Booking/Order Line</span>
                    <p className="text-lg font-black text-[#FFDE00] font-mono lowercase">@{selectedBiz.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <a
                      href={`https://wa.me/${selectedBiz.whatsappNumber || selectedBiz.contactPhone}?text=${encodeURIComponent(`Hi ${selectedBiz.ownerName}, I saw your business "${selectedBiz.businessName}" on the MKU Law Hub. I'm interested in viewing your products/services!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebd53] text-black font-extrabold text-[11px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer shadow-lg shadow-[#25D366]/10"
                    >
                      <MessageSquare size={13} className="fill-black text-black" /> Contact WhatsApp
                    </a>
                    <a
                      href={`tel:${selectedBiz.contactPhone || selectedBiz.whatsappNumber}`}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gavel-border hover:border-white text-gavel-muted hover:text-white bg-white/[0.02] hover:bg-white/[0.05] font-extrabold text-[11px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      <Phone size={13} /> Call Merchant
                    </a>
                  </div>

                  <p className="text-[8.5px] text-gavel-muted font-mono uppercase tracking-wider text-center">
                    🔒 Safeguarded exchange coordinated directly with student proprietor.
                  </p>
                </div>

              </div>
            </div>

            {/* Well-arranged Amazon-style Product Catalogue Listings */}
            <div className="space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-gavel-border/40 pb-3 font-mono">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Crown size={15} className="text-[#FFDE00]" /> Product Catalog Listings
                </h3>
                <span className="text-[10px] text-gavel-muted font-bold uppercase">{selectedBiz.catalog ? selectedBiz.catalog.length : 0} items for sale</span>
              </div>

              {selectedBiz.catalog && selectedBiz.catalog.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedBiz.catalog.map((item, idx) => {
                    const itemPromoImg = item.imageUrl || selectedBiz.images?.[item.promoImageSlot || 0] || selectedBiz.images?.[0] || "";

                    return (
                      <div 
                        key={idx} 
                        className="bg-[#0f0f12] border border-gavel-border/70 rounded-2xl overflow-hidden flex flex-col justify-between h-full hover:border-[#FFDE00]/40 hover:shadow-xl transition-all duration-300 group"
                      >
                        <div className="space-y-3.5">
                          {/* Catalogue image container */}
                          <div className="aspect-video w-full overflow-hidden bg-black relative border-b border-gavel-border/40">
                            {itemPromoImg ? (
                              <img 
                                src={itemPromoImg} 
                                alt={item.name} 
                                className="w-full h-full object-cover group-hover:scale-105 duration-500 transition-all pointer-events-none" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-zinc-950 flex flex-col items-center justify-center p-4">
                                <ImageIcon size={22} className="text-gavel-muted/40 mb-1" />
                                <span className="text-[7.5px] font-mono text-gavel-muted uppercase tracking-wider font-bold">Catalogue Item Gallery</span>
                              </div>
                            )}

                            {/* Promotional Banner integration */}
                            {item.isPromo && (
                              <div className="absolute top-2 left-2 flex flex-col gap-1">
                                <span className="px-2 py-0.5 bg-gavel-yellow border border-gavel-yellow rounded text-[7px] font-mono text-black uppercase font-black tracking-wider leading-none">
                                  {item.promoTag || "#PROMO"}
                                </span>
                              </div>
                            )}

                            {/* Item Price Tier strictly styled as high-contrast Amazon price badge */}
                            <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/95 backdrop-blur-md border border-gavel-yellow/30 rounded font-mono text-[10px] text-gavel-yellow font-black leading-none uppercase">
                              {item.price || "Check Price"}
                            </div>
                          </div>

                          <div className="px-5 pb-2 py-0.5 space-y-1.5 text-left">
                            <h4 className="font-extrabold text-white text-xs uppercase tracking-tight group-hover:text-gavel-yellow transition-colors leading-tight line-clamp-1 font-sans">
                              {item.name}
                            </h4>
                            <p className="text-gavel-muted text-[10.5px] line-clamp-2 leading-relaxed font-sans font-medium">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Order/Contact action specifically for this catalog item */}
                        <div className="px-5 pb-5 pt-2">
                          <a
                            href={`https://wa.me/${selectedBiz.whatsappNumber || selectedBiz.contactPhone}?text=${encodeURIComponent(`Hi ${selectedBiz.ownerName}, I saw your product "${item.name}" listed under your "${selectedBiz.businessName}" profile catalog (priced at ${item.price || "specified offer"}) on MKU Law Hub. Is this option active and available?`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-[#FFDE00] border border-gavel-border/80 hover:border-[#FFDE00] text-gavel-muted hover:text-black font-extrabold text-[9px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
                          >
                            <MessageSquare size={10} className="fill-current" /> Contact Seller About Item
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center bg-white/[0.01] border border-dashed border-gavel-border/30 rounded-2xl">
                  <p className="text-xs text-gavel-muted font-mono uppercase tracking-widest font-black">No Catalog Items Provided Yet</p>
                  <p className="text-xs text-gavel-muted mt-1.5 font-sans">This enterprise resides as a custom consultant portfolio.</p>
                </div>
              )}
            </div>

            {/* Rating Section & Feedback */}
            <div className="pt-8 border-t border-gavel-border/30 grid md:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Live Rating Submit form (Enforces Rating requirement) */}
              <div className="md:col-span-5 bg-white/[0.01] border border-gavel-border p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Star size={14} className="fill-gavel-yellow text-gavel-yellow" /> Rate This Business
                </h3>

                <form onSubmit={handleRateBusiness} className="space-y-3.5 font-sans">
                  <div>
                    <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1 font-bold">
                      Grade of Satisfaction
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserRating(star)}
                          className="p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Star 
                            size={20} 
                            className={`${userRating >= star ? "fill-gavel-yellow text-gavel-yellow" : "text-gavel-border hover:text-white"}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-mono text-white pl-2 font-bold">{userRating} / 5 Stars</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1 font-bold">
                      Review Description (Optional)
                    </label>
                    <textarea
                      placeholder="Comment on their speed, haircut quality, print binding precision..."
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      className="w-full bg-[#111114] border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/40 resize-none h-16 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ratingLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FFDE00] hover:bg-white text-black font-extrabold text-xs uppercase tracking-widest cursor-pointer transition-all duration-300 shadow-md"
                  >
                    {ratingLoading ? "Casting..." : "Submit My Rating"}
                  </button>
                </form>
              </div>

              {/* Right Column: Existing reviews */}
              <div className="md:col-span-7 space-y-4 text-left font-sans">
                <h3 className="text-xs font-mono font-bold text-gavel-muted uppercase tracking-widest border-b border-gavel-border/30 pb-1.5 flex justify-between items-center">
                  <span>Student Review Feed</span>
                  <span>{selectedBiz.ratings ? selectedBiz.ratings.length : 0} cataloged reviews</span>
                </h3>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                  {(selectedBiz.ratings || []).map((r, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-gavel-border/50 bg-[#08080a] space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-gavel-muted uppercase leading-none font-sans">
                        <span className="font-extrabold text-white text-[11px] flex items-center gap-1.5 leading-none">
                          <UserIcon size={12} className="text-gavel-yellow" /> {r.userName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5 text-gavel-yellow font-bold">
                            <Star size={10} className="fill-gavel-yellow text-gavel-yellow" /> {r.rating}
                          </span>
                          <span>•</span>
                          <span>{new Date(r.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {r.review && (
                        <p className="text-xs text-gavel-muted leading-normal italic font-sans font-medium">
                          "{r.review}"
                        </p>
                      )}
                    </div>
                  ))}

                  {(!selectedBiz.ratings || selectedBiz.ratings.length === 0) && (
                    <div className="py-6 text-center border border-dashed border-gavel-border/60 rounded-xl bg-white/[0.005]">
                      <p className="text-gavel-muted text-xs font-sans">No reviews recorded yet. Be the first to supporting the trader!</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. INLINE AUTH OVERLAY POPUP */}
      {authRequiredReason && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fade-in">
          <div className="premium-card max-w-md w-full p-8 rounded-3xl border border-gavel-border relative bg-gavel-bg">
            <button
              onClick={() => setAuthRequiredReason(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-gavel-muted hover:text-white hover:bg-white/5 transition-all text-sm cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gavel-yellow/10 border border-gavel-yellow/20 flex items-center justify-center mx-auto text-gavel-yellow">
                <Store size={22} />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Marketplace Account Required</h2>
              <p className="text-xs text-gavel-muted leading-relaxed font-sans font-medium">
                {authRequiredReason}
              </p>
            </div>

            {authError && (
              <div className="p-3 mb-4 rounded-xl border border-gavel-danger/20 bg-gavel-danger/10 text-gavel-danger text-[11px] font-sans">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 font-sans text-left">
              {!isLogin && (
                <div>
                  <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1 font-bold">
                    Full Student Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prince Micah"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-[#111] border border-gavel-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gavel-yellow/40"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1 font-bold">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@student.mku.ac.ke"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#111] border border-gavel-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gavel-yellow/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider mb-1 font-bold">
                  Secure Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#111] border border-gavel-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gavel-yellow/40"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-gavel-yellow hover:bg-white text-black font-extrabold text-xs uppercase tracking-widest cursor-pointer transition-all duration-300"
              >
                {authLoading ? "Authorizing..." : isLogin ? "Access Marketplace Account" : "Register Shopper/Vendor Account"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gavel-border/30 text-center text-[10px] font-mono uppercase tracking-wider text-gavel-muted">
              {isLogin ? (
                <p>
                  No marketplace account yet?{" "}
                  <button onClick={() => setIsLogin(false)} className="text-gavel-yellow underline font-bold cursor-pointer">
                    Join as Shopper
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{" "}
                  <button onClick={() => setIsLogin(true)} className="text-gavel-yellow underline font-bold cursor-pointer">
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl border bg-[#0F0F0F]/90 backdrop-blur-xl shadow-2xl text-xs font-medium max-w-sm border-gavel-border text-white animate-fade-in font-sans">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
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
