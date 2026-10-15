import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { fbfs, auth } from "../lib/firebase";
import { Bulletin } from "../types";
import {
  Newspaper,
  Search,
  Clock,
  Eye,
  Heart,
  Flame,
  Share2,
  ArrowLeft,
  Pin,
  TrendingUp,
  Sparkles,
  Bookmark,
  X,
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";
import { motion, AnimatePresence } from "motion/react";

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; accent: string; label: string }
> = {
  news: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    accent: "#3b82f6",
    label: "News",
  },
  updates: {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    accent: "#8b5cf6",
    label: "Updates",
  },
  announcements: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    accent: "#f59e0b",
    label: "Announcements",
  },
  events: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    accent: "#10b981",
    label: "Events",
  },
  alerts: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    accent: "#ef4444",
    label: "Alerts",
  },
  spotlight: {
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
    accent: "#ec4899",
    label: "Spotlight",
  },
};

export function BulletinsView() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [filteredBulletins, setFilteredBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(
    null,
  );
  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category: "Bulletin";
  }>({ isOpen: false, url: "", title: "", category: "Bulletin" });

  const [, setLocation] = useLocation();

  const [userReactions, setUserReactions] = useState<Record<string, string[]>>(
    {},
  );

  // Load bulletins
  useEffect(() => {
    const loadBulletins = async () => {
      try {
        setLoading(true);
        const allBulletins = await fbfs.getCollection<Bulletin>(
          "bulletins",
          [],
          "createdAt",
          "desc",
        );

        const publishedBulletins = (allBulletins || []).filter(
          (b) => b.isPublished !== false,
        );

        setBulletins(publishedBulletins);
      } catch (err) {
        console.error("Error loading bulletins:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBulletins();
  }, []);

  // Filter bulletins based on search and category
  useEffect(() => {
    let filtered = [...bulletins];

    if (activeCategory !== "all") {
      filtered = filtered.filter((b) => b.category === activeCategory);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title?.toLowerCase().includes(query) ||
          b.content?.toLowerCase().includes(query) ||
          b.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    setFilteredBulletins(filtered);
  }, [bulletins, searchTerm, activeCategory]);

  // Handle global search
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };
    window.addEventListener("global-search", handleGlobalSearch);
    return () =>
      window.removeEventListener("global-search", handleGlobalSearch);
  }, []);

  const handleReaction = async (
    bulletinId: string,
    reaction: "likes" | "fires" | "hearts",
  ) => {
    if (!auth.currentUser) return;

    const currentReactions = userReactions[bulletinId] || [];
    const hasReacted = currentReactions.includes(reaction);

    setUserReactions((prev) => ({
      ...prev,
      [bulletinId]: hasReacted
        ? currentReactions.filter((r) => r !== reaction)
        : [...currentReactions, reaction],
    }));

    try {
      const bulletin = bulletins.find((b) => b.id === bulletinId);
      if (bulletin) {
        const currentCount = bulletin.reactions?.[reaction] || 0;
        const newCount = hasReacted
          ? Math.max(0, currentCount - 1)
          : currentCount + 1;

        await fbfs.updateDocById("bulletins", bulletinId, {
          [`reactions.${reaction}`]: newCount,
        });

        setBulletins((prev) =>
          prev.map((b) =>
            b.id === bulletinId
              ? {
                  ...b,
                  reactions: {
                    ...b.reactions,
                    [reaction]: newCount,
                  },
                }
              : b,
          ),
        );
      }
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  const handleShare = (bulletin: Bulletin) => {
    const url = `${window.location.origin}/bulletins?id=${bulletin.id}`;
    setShareData({
      isOpen: true,
      url,
      title: bulletin.title,
      category: "Bulletin",
    });
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const categories = [
    { id: "all", label: "All", icon: <Sparkles size={14} /> },
    { id: "news", label: "News", icon: <Newspaper size={14} /> },
    { id: "updates", label: "Updates", icon: <TrendingUp size={14} /> },
    {
      id: "announcements",
      label: "Announcements",
      icon: <Bookmark size={14} />,
    },
    { id: "events", label: "Events", icon: <Clock size={14} /> },
    { id: "alerts", label: "Alerts", icon: <Flame size={14} /> },
    { id: "spotlight", label: "Spotlight", icon: <Heart size={14} /> },
  ];

  return (
    <div className="bulletins-page-wrapper">
      <style>{`
        /* =========================================================
           BULLETINS PAGE — FULL-BLEED, THEME-AWARE, TOP-MARGIN 20px
        ========================================================= */

        /* Full-viewport shell that escapes the app's padded <main>. */
        .bulletins-page-wrapper {
          /* Cancel the shell's horizontal padding by making this a full-bleed
             block. The parent <main> has px-4 sm:px-12 — we override via
             negative margins that exactly match 100vw - 100%. */
          position: relative;
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);

          /* Cancel the shell's top padding (pt-12 = 3rem / sm:pt-14 = 3.5rem)
             and then add our own small 20px top margin. */
          margin-top: -3rem;         /* cancel base pt-12 */
          padding-top: 20px;         /* our small top gap */

          min-height: 100vh;
          padding-bottom: 110px;
          overflow-x: hidden;

          background: var(--bp-bg);
          color: var(--bp-text);

          /* LIGHT THEME (default) */
          --bp-bg: #eef3f9;
          --bp-surface: #ffffff;
          --bp-surface-2: #f6f8fc;
          --bp-text: #101828;
          --bp-text-muted: #667085;
          --bp-text-subtle: #98a2b3;
          --bp-border: #dce4ef;
          --bp-border-hover: #cbd5e1;
          --bp-primary: #2457c5;
          --bp-primary-hover: #173d91;
          --bp-primary-text: #ffffff;
          --bp-accent: #fcdd09;
          --bp-shadow-card: 0 8px 28px rgba(25, 53, 95, 0.06);
          --bp-shadow-hover: 0 18px 45px rgba(25, 53, 95, 0.12);
        }

        @media (min-width: 640px) {
          .bulletins-page-wrapper {
            margin-top: -3.5rem;   /* cancel sm:pt-14 */
            padding-top: 20px;     /* keep our small top gap */
          }
        }

        /* DARK THEME */
        .dark .bulletins-page-wrapper,
        .dark-mode .bulletins-page-wrapper,
        [data-theme="dark"] .bulletins-page-wrapper {
          --bp-bg: #050505;
          --bp-surface: rgba(255, 255, 255, 0.05);
          --bp-surface-2: rgba(255, 255, 255, 0.08);
          --bp-text: #ffffff;
          --bp-text-muted: rgba(255, 255, 255, 0.7);
          --bp-text-subtle: rgba(255, 255, 255, 0.5);
          --bp-border: rgba(255, 255, 255, 0.1);
          --bp-border-hover: rgba(255, 255, 255, 0.3);
          --bp-primary: #fcdd09;
          --bp-primary-hover: #ffe83d;
          --bp-primary-text: #111111;
          --bp-shadow-card: 0 8px 28px rgba(0, 0, 0, 0.5);
          --bp-shadow-hover: 0 18px 45px rgba(0, 0, 0, 0.7);
        }

        /* Hero gradient — blue in light, near-black in dark */
        .bulletins-page-wrapper .bp-hero-bg {
          background: linear-gradient(135deg, #173d91 0%, #2457c5 50%, #173d91 100%);
        }
        .dark .bulletins-page-wrapper .bp-hero-bg,
        .dark-mode .bulletins-page-wrapper .bp-hero-bg,
        [data-theme="dark"] .bulletins-page-wrapper .bp-hero-bg {
          background: linear-gradient(135deg, #0a0a0c 0%, #111114 50%, #0a0a0c 100%);
        }

        /* Scrollbar-hide util */
        .bulletins-page-wrapper .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .bulletins-page-wrapper .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Line clamp util */
        .bulletins-page-wrapper .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Remove shell padding when this page is active.
           Belt-and-braces — works even where :has() is unsupported. */
        main:has(.bulletins-page-wrapper) {
          padding: 0 !important;
        }
      `}</style>

      {/* =====================================================
          HERO SECTION
      ===================================================== */}
      <section className="relative overflow-hidden rounded-b-[28px] sm:rounded-b-[40px] bp-hero-bg">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#fcdd09]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#fcdd09]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14 sm:pb-20">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium mb-6 cursor-pointer transition-colors">
              <ArrowLeft size={16} />
              Back to Home
            </span>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Newspaper size={28} className="text-[#fcdd09]" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                Campus <span className="text-[#fcdd09]">Pulse</span>
              </h1>
              <p className="text-white/70 mt-1">
                What's happening around MKU right now
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">
                {bulletins.length}
              </span>
              <span className="text-white/60 text-sm">Stories</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">
                {bulletins.filter((b) => b.isPinned).length}
              </span>
              <span className="text-white/60 text-sm">Pinned</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">
                {new Set(bulletins.map((b) => b.category)).size}
              </span>
              <span className="text-white/60 text-sm">Categories</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STICKY SEARCH + FILTER BAR
      ===================================================== */}
      <section
        className="sticky top-0 z-30 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--bp-bg) 92%, transparent)",
          borderBottom: "1px solid var(--bp-border)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "var(--bp-text-subtle)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search bulletins, news, updates..."
              className="w-full pl-11 pr-10 py-3.5 rounded-xl outline-none transition-all"
              style={{
                background: "var(--bp-surface)",
                border: "1px solid var(--bp-border)",
                color: "var(--bp-text)",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                style={{ color: "var(--bp-text-subtle)" }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    background: isActive
                      ? "var(--bp-primary)"
                      : "var(--bp-surface)",
                    color: isActive
                      ? "var(--bp-primary-text)"
                      : "var(--bp-text-muted)",
                    border: `1px solid ${
                      isActive ? "var(--bp-primary)" : "var(--bp-border)"
                    }`,
                    boxShadow: isActive
                      ? "0 4px 14px rgba(36, 87, 197, 0.25)"
                      : "none",
                  }}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          BULLETINS FEED
      ===================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-6 animate-pulse"
                style={{
                  background: "var(--bp-surface)",
                  border: "1px solid var(--bp-border)",
                }}
              >
                <div className="flex gap-4">
                  <div
                    className="w-24 h-24 rounded-xl"
                    style={{ background: "var(--bp-surface-2)" }}
                  />
                  <div className="flex-1 space-y-3">
                    <div
                      className="h-4 rounded w-1/4"
                      style={{ background: "var(--bp-surface-2)" }}
                    />
                    <div
                      className="h-6 rounded w-3/4"
                      style={{ background: "var(--bp-surface-2)" }}
                    />
                    <div
                      className="h-4 rounded w-full"
                      style={{ background: "var(--bp-surface-2)" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredBulletins.length === 0 ? (
          <div className="text-center py-20">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--bp-surface-2)" }}
            >
              <Newspaper
                size={32}
                style={{ color: "var(--bp-text-subtle)" }}
              />
            </div>
            <h3
              className="text-xl font-bold mb-2"
              style={{ color: "var(--bp-text)" }}
            >
              No bulletins found
            </h3>
            <p
              className="max-w-md mx-auto"
              style={{ color: "var(--bp-text-muted)" }}
            >
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search term.`
                : "No bulletins have been published yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredBulletins.map((bulletin, index) => {
                const catColor =
                  CATEGORY_COLORS[bulletin.category] || CATEGORY_COLORS.news;
                const reactions = bulletin.reactions || {
                  likes: 0,
                  fires: 0,
                  hearts: 0,
                };
                const userReacts = userReactions[bulletin.id] || [];

                return (
                  <motion.article
                    key={bulletin.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-2xl overflow-hidden transition-all cursor-pointer"
                    style={{
                      background: "var(--bp-surface)",
                      border: bulletin.isPinned
                        ? "1px solid rgba(252, 221, 9, 0.5)"
                        : `1px solid var(--bp-border)`,
                      boxShadow: "var(--bp-shadow-card)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "var(--bp-shadow-hover)";
                      e.currentTarget.style.borderColor = bulletin.isPinned
                        ? "rgba(252, 221, 9, 0.8)"
                        : "var(--bp-border-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "var(--bp-shadow-card)";
                      e.currentTarget.style.borderColor = bulletin.isPinned
                        ? "rgba(252, 221, 9, 0.5)"
                        : "var(--bp-border)";
                    }}
                    onClick={() => setSelectedBulletin(bulletin)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      {bulletin.imageUrl && (
                        <div className="sm:w-48 sm:flex-shrink-0 h-48 sm:h-auto relative overflow-hidden">
                          <img
                            src={bulletin.imageUrl}
                            alt={bulletin.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          {bulletin.isPinned && (
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-[#fcdd09] text-[#173d91] text-[10px] font-black flex items-center gap-1">
                              <Pin size={10} />
                              PINNED
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 p-5 sm:p-6">
                        {/* Meta row */}
                        <div className="flex items-center gap-3 mb-3">
                          {!bulletin.imageUrl && bulletin.isPinned && (
                            <span className="px-2 py-0.5 rounded-lg bg-[#fcdd09] text-[#173d91] text-[10px] font-black flex items-center gap-1">
                              <Pin size={10} />
                              PINNED
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${catColor.bg} ${catColor.text}`}
                          >
                            {catColor.label}
                          </span>
                          <span
                            className="text-[11px] flex items-center gap-1"
                            style={{ color: "var(--bp-text-subtle)" }}
                          >
                            <Clock size={11} />
                            {formatTimeAgo(bulletin.createdAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-lg sm:text-xl font-bold mb-2 line-clamp-2 transition-colors"
                          style={{ color: "var(--bp-text)" }}
                        >
                          {bulletin.title}
                        </h3>

                        {/* Content preview */}
                        <p
                          className="text-sm line-clamp-2 mb-4"
                          style={{ color: "var(--bp-text-muted)" }}
                        >
                          {bulletin.content}
                        </p>

                        {/* Tags */}
                        {bulletin.tags && bulletin.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {bulletin.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 rounded-lg text-[10px] font-medium"
                                style={{
                                  background: "var(--bp-surface-2)",
                                  color: "var(--bp-text-muted)",
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div
                          className="flex items-center justify-between pt-4"
                          style={{
                            borderTop: "1px solid var(--bp-border)",
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(bulletin.id, "likes");
                              }}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                userReacts.includes("likes")
                                  ? "text-blue-500"
                                  : ""
                              }`}
                              style={
                                !userReacts.includes("likes")
                                  ? { color: "var(--bp-text-subtle)" }
                                  : {}
                              }
                            >
                              <Heart
                                size={14}
                                fill={
                                  userReacts.includes("likes")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                              {reactions.likes || 0}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(bulletin.id, "fires");
                              }}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                userReacts.includes("fires")
                                  ? "text-orange-500"
                                  : ""
                              }`}
                              style={
                                !userReacts.includes("fires")
                                  ? { color: "var(--bp-text-subtle)" }
                                  : {}
                              }
                            >
                              <Flame
                                size={14}
                                fill={
                                  userReacts.includes("fires")
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                              {reactions.fires || 0}
                            </button>

                            <div
                              className="flex items-center gap-1.5 text-xs"
                              style={{ color: "var(--bp-text-subtle)" }}
                            >
                              <Eye size={14} />
                              {bulletin.views || 0}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(bulletin);
                            }}
                            className="p-2 rounded-lg transition-colors cursor-pointer"
                            style={{ color: "var(--bp-text-subtle)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color =
                                "var(--bp-primary)";
                              e.currentTarget.style.background =
                                "var(--bp-surface-2)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color =
                                "var(--bp-text-subtle)";
                              e.currentTarget.style.background =
                                "transparent";
                            }}
                          >
                            <Share2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* =====================================================
          FULL BULLETIN MODAL
      ===================================================== */}
      <AnimatePresence>
        {selectedBulletin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setSelectedBulletin(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
              style={{ background: "var(--bp-surface)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header image */}
              {selectedBulletin.imageUrl && (
                <div className="relative h-56 sm:h-72">
                  <img
                    src={selectedBulletin.imageUrl}
                    alt={selectedBulletin.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <button
                    type="button"
                    onClick={() => setSelectedBulletin(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>

                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-[#173d91]">
                      {CATEGORY_COLORS[selectedBulletin.category]?.label ||
                        "News"}
                    </span>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-6 sm:p-8">
                {!selectedBulletin.imageUrl && (
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        CATEGORY_COLORS[selectedBulletin.category]?.bg
                      } ${
                        CATEGORY_COLORS[selectedBulletin.category]?.text
                      }`}
                    >
                      {CATEGORY_COLORS[selectedBulletin.category]?.label ||
                        "News"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBulletin(null)}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                      style={{
                        background: "var(--bp-surface-2)",
                        color: "var(--bp-text-muted)",
                      }}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                <h2
                  className="text-2xl sm:text-3xl font-black mb-4 leading-tight"
                  style={{ color: "var(--bp-text)" }}
                >
                  {selectedBulletin.title}
                </h2>

                <div
                  className="flex flex-wrap items-center gap-4 text-sm mb-6"
                  style={{ color: "var(--bp-text-muted)" }}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(selectedBulletin.createdAt).toLocaleDateString(
                      undefined,
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} />
                    {selectedBulletin.views || 0} views
                  </span>
                </div>

                <div className="max-w-none">
                  {selectedBulletin.content
                    .split("\n")
                    .map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="leading-relaxed mb-4"
                        style={{ color: "var(--bp-text-muted)" }}
                      >
                        {paragraph}
                      </p>
                    ))}
                </div>

                {selectedBulletin.tags &&
                  selectedBulletin.tags.length > 0 && (
                    <div
                      className="flex flex-wrap gap-2 mt-6 pt-6"
                      style={{ borderTop: "1px solid var(--bp-border)" }}
                    >
                      {selectedBulletin.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{
                            background: "var(--bp-surface-2)",
                            color: "var(--bp-text-muted)",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                <div
                  className="flex items-center justify-between mt-8 pt-6"
                  style={{ borderTop: "1px solid var(--bp-border)" }}
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleReaction(selectedBulletin.id, "likes")
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        (
                          userReactions[selectedBulletin.id] || []
                        ).includes("likes")
                          ? "bg-blue-500 text-white"
                          : ""
                      }`}
                      style={
                        !(userReactions[selectedBulletin.id] || []).includes(
                          "likes",
                        )
                          ? {
                              background: "var(--bp-surface-2)",
                              color: "var(--bp-text-muted)",
                            }
                          : {}
                      }
                    >
                      <Heart size={16} />
                      {selectedBulletin.reactions?.likes || 0}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleReaction(selectedBulletin.id, "fires")
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        (
                          userReactions[selectedBulletin.id] || []
                        ).includes("fires")
                          ? "bg-orange-500 text-white"
                          : ""
                      }`}
                      style={
                        !(userReactions[selectedBulletin.id] || []).includes(
                          "fires",
                        )
                          ? {
                              background: "var(--bp-surface-2)",
                              color: "var(--bp-text-muted)",
                            }
                          : {}
                      }
                    >
                      <Flame size={16} />
                      {selectedBulletin.reactions?.fires || 0}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShare(selectedBulletin)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                    style={{
                      background: "var(--bp-primary)",
                      color: "var(--bp-primary-text)",
                    }}
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Dialog */}
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

export default BulletinsView;
