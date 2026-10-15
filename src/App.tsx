import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  lazy,
  Suspense,
} from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, fbfs } from "./lib/firebase";
import { UserProfile } from "./types";
import { HomeView } from "./views/HomeView";
import { SEO, WEBSITE_JSON_LD } from "./components/SEO";

// Lazy-load non-critical views to reduce initial bundle size and improve FCP/LCP.
// HomeView is eagerly loaded as it's the landing page and contains above-the-fold content.
const EventsView = lazy(() =>
  import("./views/EventsView").then((m) => ({ default: m.EventsView })),
);
const EventDetailsView = lazy(() =>
  import("./views/EventDetailsView").then((m) => ({
    default: m.EventDetailsView,
  })),
);
const ClubsView = lazy(() =>
  import("./views/ClubsView").then((m) => ({ default: m.ClubsView })),
);
const GalleryView = lazy(() =>
  import("./views/GalleryView").then((m) => ({ default: m.GalleryView })),
);
const MarketplaceView = lazy(() =>
  import("./views/MarketplaceView").then((m) => ({
    default: m.MarketplaceView,
  })),
);
const VaultView = lazy(() =>
  import("./views/VaultView").then((m) => ({ default: m.VaultView })),
);
const AdminView = lazy(() =>
  import("./views/AdminView").then((m) => ({ default: m.AdminView })),
);
const AuthView = lazy(() =>
  import("./views/AuthView").then((m) => ({ default: m.AuthView })),
);
const SellerProfileView = lazy(() =>
  import("./views/SellerProfileView").then((m) => ({
    default: m.SellerProfileView,
  })),
);
const TermsView = lazy(() =>
  import("./views/TermsView").then((m) => ({ default: m.TermsView })),
);
const PrivacyView = lazy(() =>
  import("./views/PrivacyView").then((m) => ({ default: m.PrivacyView })),
);
const BulletinsView = lazy(() =>
  import("./views/BulletinsView").then((m) => ({ default: m.BulletinsView })),
);

import {
  Home,
  Calendar,
  Image as ImageIcon,
  Lock,
  Store,
  ShieldAlert,
  LogOut,
  Sun,
  Moon,
  User as UserIcon,
  Compass,
  Search,
} from "lucide-react";

// Auth Context
interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    setGlobalSearch("");
    window.dispatchEvent(new CustomEvent("global-search", { detail: "" }));
    // Close profile dropdown on route change
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    // Sync theme on mount/route shifts
    const savedTheme =
      (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(savedTheme);

    if (location === "/admin") {
      document.documentElement.classList.add("dark");
      document.body.classList.remove("light-mode");
    } else {
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
      document.body.classList.toggle("light-mode", savedTheme === "light");
    }
  }, [location]);

  // Sync theme changes when toggled
  useEffect(() => {
    if (location === "/admin") {
      document.documentElement.classList.add("dark");
      document.body.classList.remove("light-mode");
    } else {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.body.classList.toggle("light-mode", theme === "light");
    }
  }, [theme, location]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const userProf = await fbfs.getDocById<UserProfile>(
        "users",
        auth.currentUser.uid,
      );
      if (userProf) setProfile(userProf);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let userProf = await fbfs.getDocById<UserProfile>("users", user.uid);

          if (!userProf) {
            const newProfile: Partial<UserProfile> = {
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Vendor",
              email: user.email || "",
              avatar:
                user.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "Vendor")}&background=121212&color=FFDE00`,
              role: "vendor",
              active: true,
              createdAt: new Date(),
              lastActive: new Date(),
            };
            await fbfs.setDocById("users", user.uid, newProfile);
            userProf = { id: user.uid, ...newProfile } as UserProfile;
          }
          setProfile(userProf);
        } catch (err) {
          console.error("Error setting up user profile:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await auth.signOut();
    setLocation("/");
    window.location.reload();
  };

  const profileToProvide = profile;

  /* =========================================================
     PER-ROUTE SEO METADATA
  ========================================================= */
  const routeSEO: Record<
    string,
    {
      title: string;
      description: string;
      keywords: string;
      path: string;
      jsonLd?: Record<string, any> | Record<string, any>[];
      noIndex?: boolean;
    }
  > = {
    "/": {
      title:
        "StudentHub MKU — Mount Kenya University School of Law Student Portal",
      description:
        "StudentHub is the official student portal for Mount Kenya University School of Law. Browse campus events, student marketplace, clubs, gallery, official bulletins, and the anonymous Vault.",
      keywords:
        "MKU, Mount Kenya University, student portal, law school, campus events, student marketplace, moot court, clubs, gallery, student news, Kenya university",
      path: "/",
      jsonLd: WEBSITE_JSON_LD,
    },
    "/bulletins": {
      title: "Campus Pulse — News & Updates | StudentHub MKU",
      description:
        "Stay updated with the latest news, announcements, and campus bulletins from Mount Kenya University School of Law — official releases, spotlights, and student updates.",
      keywords:
        "MKU bulletins, campus news, student updates, MKU announcements, law school news Kenya, campus pulse",
      path: "/bulletins",
    },
    "/events": {
      title: "Campus Events | StudentHub MKU",
      description:
        "Discover and RSVP to upcoming events at Mount Kenya University School of Law — moot courts, networking summits, society meetings, and student activities.",
      keywords:
        "MKU events, campus activities, moot court, law school events, student events Kenya, RSVP events",
      path: "/events",
    },
    "/clubs": {
      title: "Student Clubs & Societies | StudentHub MKU",
      description:
        "Explore student clubs and societies at Mount Kenya University School of Law — advocacy guilds, human rights groups, and special interest societies.",
      keywords:
        "MKU clubs, student societies, moot court society, law student clubs, university societies Kenya",
      path: "/clubs",
    },
    "/gallery": {
      title: "Campus Gallery | StudentHub MKU",
      description:
        "Explore photographs, stories, and moments from Mount Kenya University School of Law campus life — student events, moot courts, and everyday campus moments.",
      keywords:
        "MKU gallery, campus photos, law school photography, student life Kenya, campus memories",
      path: "/gallery",
    },
    "/marketplace": {
      title: "Student Marketplace | StudentHub MKU",
      description:
        "Buy, sell, and trade around the Mount Kenya University School of Law campus. Student merchants, services, textbooks, and campus deals.",
      keywords:
        "MKU marketplace, student marketplace Kenya, campus buying selling, student businesses, university market",
      path: "/marketplace",
    },
    "/marketplace/seller": {
      title: "Seller Portfolio | StudentHub MKU",
      description:
        "Manage your student merchant portfolio on StudentHub MKU — business profile, catalog, promotions, and campus customer outreach.",
      keywords:
        "MKU seller, student vendor, campus business, student entrepreneur Kenya, marketplace seller",
      path: "/marketplace/seller",
    },
    "/vault": {
      title: "Anonymous Vault | StudentHub MKU",
      description:
        "Share complaints, ideas, suggestions, and campus feedback anonymously on the StudentHub MKU Vault — fully anonymous, secure, and moderated.",
      keywords:
        "MKU vault, anonymous feedback, student complaints, campus suggestions, anonymous student forum",
      path: "/vault",
    },
    "/terms": {
      title: "Terms of Agreement | StudentHub MKU",
      description:
        "Read the official StudentHub MKU platform terms of agreement, merchant conduct standards, and student data protection statements.",
      keywords:
        "StudentHub terms, MKU terms of service, platform guidelines, student data protection",
      path: "/terms",
    },
    "/privacy": {
      title: "Privacy Policy | StudentHub MKU",
      description:
        "StudentHub MKU privacy policy — how we collect, use, and protect student data under Mount Kenya University School of Law privacy guidelines.",
      keywords:
        "StudentHub privacy, MKU privacy policy, student data protection, data usage policy",
      path: "/privacy",
    },
    "/auth": {
      title: "Sign In | StudentHub MKU",
      description:
        "Sign in or create your StudentHub MKU account — access the student portal, marketplace, events, and campus community.",
      keywords:
        "MKU login, student portal sign in, MKU student account, studenthub registration",
      path: "/auth",
    },
    "/admin": {
      title: "Admin Console | StudentHub MKU",
      description:
        "Executive administration console for StudentHub MKU — manage events, marketplace, gallery, bulletins, and student data.",
      keywords:
        "MKU admin, student portal administration, MKU executive console",
      path: "/admin",
      noIndex: true,
    },
  };

  const seo = routeSEO[location] || routeSEO["/"];

  /* Determine if current route needs full-bleed layout (no shell padding) */
  const isFullBleed =
    location === "/admin" ||
    location === "/gallery" ||
    location.startsWith("/bulletins");

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile: profileToProvide,
        loading,
        logout,
        refreshProfile,
      }}
    >
      <SEO
        title={seo.title}
        description={seo.description}
        path={seo.path}
        keywords={seo.keywords}
        jsonLd={seo.jsonLd}
        noIndex={seo.noIndex}
      />
      <div className="relative min-h-screen selections overflow-x-hidden flex flex-col pb-32">
        {/* Background Canvas aesthetics */}
        <div className="bg-noise"></div>
        <div className="bg-layer"></div>
        <div className="bg-gradient-overlay"></div>
        <div className="blob-1"></div>
        <div className="blob-2"></div>

        {/* =========================================================
            FLOATING ACTION CONTROLS (Top-Right)
        ========================================================= */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          {/* Theme Switch Control */}
          {location !== "/admin" && (
            <button
              onClick={toggleTheme}
              className="
                flex items-center justify-center w-11 h-11 rounded-xl
                border transition-all duration-300 cursor-pointer shadow-lg active:scale-95 shrink-0
                bg-white border-[#dce4ef] text-[#475467] hover:bg-[#eef3f9] hover:text-[#172033]
                dark:bg-[#0c0c0e] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white
              "
              title="Toggle visual theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          {/* Profile dropdown OR Sign In button */}
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="
                  flex items-center gap-2 p-1.5 pr-3 rounded-xl
                  border transition-all duration-300 cursor-pointer shadow-lg active:scale-98 min-h-[44px]
                  bg-white border-[#dce4ef] hover:border-[#2457c5]/40
                  dark:bg-[#0c0c0e] dark:border-white/10 dark:hover:border-[#fcdd09]/30
                "
                title="Open profile menu"
                aria-expanded={menuOpen}
              >
                <img
                  src={
                    profile.avatar ||
                    `https://ui-avatars.com/api/?name=${profile.name}`
                  }
                  alt="Avatar"
                  className="w-7 h-7 rounded-lg object-cover border border-[#dce4ef] dark:border-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden sm:flex flex-col text-left pointer-events-none select-none">
                  <span className="text-[10px] font-black text-[#2457c5] dark:text-[#fcdd09] uppercase tracking-widest leading-none font-mono">
                    {profile.role}
                  </span>
                </div>
              </button>

              {menuOpen && (
                <div
                  className="
                    absolute right-0 mt-3 w-64 rounded-2xl p-3.5 shadow-2xl space-y-3 text-left z-50
                    animate-fade-in backdrop-blur-2xl
                    bg-white border border-[#dce4ef]
                    dark:bg-[#0c0c0e]/95 dark:border-white/10
                  "
                >
                  {/* Account Metadata card */}
                  <div className="px-1 py-1 border-b pb-2.5 border-[#edf0f5] dark:border-white/5">
                    <p className="text-xs font-black truncate uppercase font-mono tracking-tight text-[#172033] dark:text-white">
                      {profile.name}
                    </p>
                    <p className="text-[10px] truncate mt-0.5 leading-none text-[#667085] dark:text-white/60">
                      {profile.email}
                    </p>
                  </div>

                  {/* Menu options mapped based on roles constraint */}
                  <div className="space-y-1">
                    {profile.role === "admin" ? (
                      <>
                        <Link href="/admin">
                          <span
                            onClick={() => setMenuOpen(false)}
                            className="
                              flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wider
                              text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                              dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                            "
                          >
                            Admin Dashboard
                          </span>
                        </Link>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/admin");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wider
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Account Settings
                        </div>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/admin");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wider
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Profile Control
                        </div>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/admin");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wider
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Notifications
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href="/marketplace/seller">
                          <span
                            onClick={() => setMenuOpen(false)}
                            className="
                              flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wide
                              text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                              dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                            "
                          >
                            Vendor Portfolio
                          </span>
                        </Link>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/marketplace/seller");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wide
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Account Settings
                        </div>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/marketplace/seller");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wide
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Profile Settings
                        </div>
                        <div
                          onClick={() => {
                            setMenuOpen(false);
                            setLocation("/marketplace/seller");
                          }}
                          className="
                            flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono uppercase tracking-wide
                            text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5]
                            dark:text-white/80 dark:hover:bg-[#fcdd09] dark:hover:text-black
                          "
                        >
                          Notifications
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sign out */}
                  <div className="border-t pt-2 border-[#edf0f5] dark:border-white/5">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="
                        w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black rounded-xl transition-all duration-300 cursor-pointer text-left font-mono uppercase tracking-wider
                        text-red-600 hover:bg-red-50
                        dark:text-red-400 dark:hover:bg-red-500/10
                      "
                    >
                      <LogOut size={13} /> Close Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            location.startsWith("/marketplace") && (
              <Link href="/auth">
                <span className="px-5 py-2.5 rounded-xl bg-[#fcdd09] hover:bg-[#FFDE00] hover:scale-103 duration-300 text-black font-extrabold text-[10px] sm:text-xs tracking-widest uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center shrink-0">
                  Sign In
                </span>
              </Link>
            )
          )}
        </div>

        {/* =========================================================
            DYNAMIC ROUTE CONTAINER
        ========================================================= */}
        <main
          className={`flex-grow w-full ${
            isFullBleed ? "px-0 pt-0 sm:pt-0" : "px-4 sm:px-12 pt-12 sm:pt-14"
          }`}
        >
          {loading ? (
            <div className="space-y-6 max-w-4xl mx-auto py-12 animate-pulse w-full">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-[#e1e7ef] dark:border-white/10 bg-white/[0.4] dark:bg-white/[0.01] flex flex-col justify-between h-40"
                >
                  <div className="space-y-3">
                    <div className="h-4 rounded w-1/4 bg-black/5 dark:bg-white/10"></div>
                    <div className="h-3 rounded w-3/4 bg-black/5 dark:bg-white/5"></div>
                    <div className="h-3 rounded w-1/2 bg-black/5 dark:bg-white/5"></div>
                  </div>
                  <div className="h-6 rounded w-1/6 bg-black/5 dark:bg-white/5"></div>
                </div>
              ))}
              <div className="text-center pt-2">
                <p className="text-[#667085] dark:text-white/50 font-mono text-[10px] tracking-widest uppercase">
                  AUTHORIZING SESSION STATE ...
                </p>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="space-y-6 max-w-4xl mx-auto py-12 animate-pulse w-full">
                  <div className="p-6 rounded-2xl border border-[#e1e7ef] dark:border-white/10 bg-white/[0.4] dark:bg-white/[0.01] flex flex-col justify-between h-40">
                    <div className="space-y-3">
                      <div className="h-4 rounded w-1/4 bg-black/5 dark:bg-white/10"></div>
                      <div className="h-3 rounded w-3/4 bg-black/5 dark:bg-white/5"></div>
                      <div className="h-3 rounded w-1/2 bg-black/5 dark:bg-white/5"></div>
                    </div>
                    <div className="h-6 rounded w-1/6 bg-black/5 dark:bg-white/5"></div>
                  </div>
                </div>
              }
            >
              <Switch>
                <Route path="/" component={HomeView} />
                <Route path="/auth" component={AuthView} />
                <Route path="/bulletins" component={BulletinsView} />
                <Route path="/events" component={EventsView} />
                <Route path="/events/:id" component={EventDetailsView} />
                <Route path="/clubs" component={ClubsView} />
                <Route path="/gallery" component={GalleryView} />
                <Route path="/marketplace" component={MarketplaceView} />
                <Route
                  path="/marketplace/seller"
                  component={SellerProfileView}
                />
                <Route path="/terms" component={TermsView} />
                <Route path="/privacy" component={PrivacyView} />
                <Route path="/vault" component={VaultView} />
                <Route path="/admin" component={AdminView} />
                <Route>
                  <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
                    <h1 className="text-8xl font-black text-[#fcdd09] tracking-tighter">
                      404
                    </h1>
                    <p className="max-w-md text-[#667085] dark:text-white/60">
                      The modern path you seek is currently locked or does not
                      exist.
                    </p>
                    <Link
                      href="/"
                      className="px-5 py-2.5 rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 text-sm text-[#344054] dark:text-white/70 hover:text-[#172033] dark:hover:text-white hover:border-[#2457c5]/30 transition-all cursor-pointer"
                    >
                      Return to Student Hub
                    </Link>
                  </div>
                </Route>
              </Switch>
            </Suspense>
          )}
        </main>

        {/* =========================================================
            FLOATING BOTTOM NAVIGATOR
            Medium rounded corners, centered, mobile-friendly spacing
        ========================================================= */}
        {location !== "/admin" && (
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100vw-24px)]">
            <div
              className="
                backdrop-blur-xl
                rounded-2xl
                px-4 sm:px-6
                py-2.5
                flex items-center justify-center
                gap-4 sm:gap-8
                shadow-[0_10px_40px_rgba(0,0,0,0.4)]
                border
                bg-white/95 border-[#dce4ef]
                dark:bg-[#0a0a0b]/90 dark:border-[#ffde00]/15 dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)]
              "
            >
              <Link href="/">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <Home
                    size={18}
                    className={
                      location === "/"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location === "/"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Home
                  </span>
                  {location === "/" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/bulletins">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <Compass
                    size={18}
                    className={
                      location.startsWith("/bulletins")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location.startsWith("/bulletins")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Pulse
                  </span>
                  {location.startsWith("/bulletins") && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/marketplace">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <Store
                    size={18}
                    className={
                      location.startsWith("/marketplace")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location.startsWith("/marketplace")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Market
                  </span>
                  {location.startsWith("/marketplace") && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/events">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <Calendar
                    size={18}
                    className={
                      location.startsWith("/events")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location.startsWith("/events")
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Events
                  </span>
                  {location.startsWith("/events") && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/gallery">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <ImageIcon
                    size={18}
                    className={
                      location === "/gallery"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location === "/gallery"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Gallery
                  </span>
                  {location === "/gallery" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/vault">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group min-w-[44px] min-h-[44px] justify-center">
                  <Lock
                    size={18}
                    className={
                      location === "/vault"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }
                  />
                  <span
                    className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${
                      location === "/vault"
                        ? "text-[#2457c5] dark:text-[#FFDE00]"
                        : "text-[#98a2b3] dark:text-[#71717a] group-hover:text-[#172033] dark:group-hover:text-white"
                    }`}
                  >
                    Vault
                  </span>
                  {location === "/vault" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#2457c5] dark:bg-[#FFDE00]" />
                  )}
                </span>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
