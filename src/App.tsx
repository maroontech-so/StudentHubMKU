import React, { createContext, useContext, useEffect, useState } from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, fbfs } from "./lib/firebase";
import { UserProfile } from "./types";
import { HomeView } from "./views/HomeView";
import { EventsView } from "./views/EventsView";
import { EventDetailsView } from "./views/EventDetailsView";
import { ClubsView } from "./views/ClubsView";
import { GalleryView } from "./views/GalleryView";
import { MarketplaceView } from "./views/MarketplaceView";
import { VaultView } from "./views/VaultView";
import { AdminView } from "./views/AdminView";
import { AuthView } from "./views/AuthView";
import { SellerProfileView } from "./views/SellerProfileView";
import { TermsView } from "./views/TermsView";

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
  Search
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
  refreshProfile: async () => {}
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
  }, [location]);

  useEffect(() => {
    // Sync theme on mount/route shifts
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" || "dark";
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
      const userProf = await fbfs.getDocById<UserProfile>("users", auth.currentUser.uid);
      if (userProf) setProfile(userProf);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create profile
        try {
          let userProf = await fbfs.getDocById<UserProfile>("users", user.uid);

          if (!userProf) {
            // Auto create base vendor profile if doesn't exist
            const newProfile: Partial<UserProfile> = {
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Vendor",
              email: user.email || "",
              avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "Vendor")}&background=121212&color=FFDE00`,
              role: "vendor",
              active: true,
              createdAt: new Date(),
              lastActive: new Date()
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

  return (
    <AuthContext.Provider value={{ currentUser, profile: profileToProvide, loading, logout, refreshProfile }}>
      <div className="relative min-h-screen selections overflow-x-hidden flex flex-col pb-32">
        {/* Background Canvas aesthetics */}
        <div className="bg-noise"></div>
        <div className="bg-layer"></div>
        <div className="bg-gradient-overlay"></div>
        <div className="blob-1"></div>
        <div className="blob-2"></div>

        {/* Floating Search Bar removed to avoid look-and-feel issues as requested */}

        {/* Floating Action Controls in high-contrast top-right alignment */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          {/* Theme Switch Control */}
          {location !== "/admin" && (
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-gavel-border bg-gavel-card hover:bg-[#EEF5FB] hover:text-black dark:hover:bg-white/5 dark:hover:text-white text-gavel-muted transition-all duration-300 cursor-pointer shadow-lg active:scale-95 shrink-0"
              title="Toggle visual theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          {/* Profile collapsible dropdown or Sign In control */}
          {profile ? (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-gavel-border bg-gavel-card hover:border-[#00417E] dark:hover:border-gavel-yellow/30 transition-all duration-300 cursor-pointer shadow-lg active:scale-98"
                title="Collapse user workspace index"
              >
                <img 
                  src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.name}`} 
                  alt="Avatar" 
                  className="w-7 h-7 rounded-lg object-cover border border-gavel-border shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden sm:flex flex-col text-left pointer-events-none select-none">
                  <span className="text-[10px] font-black text-gavel-yellow uppercase tracking-widest leading-none font-mono">{profile.role}</span>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-gavel-border bg-[#0a0a0b]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-2xl p-3.5 shadow-2xl space-y-3 text-left z-50 animate-fade-in text-white">
                  {/* Account Metadata card */}
                  <div className="px-1 py-1 border-b border-gavel-border/50 pb-2.5">
                    <p className="text-xs font-black truncate text-white dark:text-white uppercase font-mono tracking-tight">{profile.name}</p>
                    <p className="text-[10px] text-gavel-muted truncate mt-0.5 leading-none">{profile.email}</p>
                  </div>

                  {/* Menu options mapped based on roles constraint */}
                  <div className="space-y-1">
                    {profile.role === "admin" ? (
                      <>
                        <Link href="/admin">
                          <span onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wider">
                            Admin Dashboard
                          </span>
                        </Link>
                        <div onClick={() => { setMenuOpen(false); setLocation("/admin"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wider">
                          Account Settings
                        </div>
                        <div onClick={() => { setMenuOpen(false); setLocation("/admin"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wider">
                          Profile Control
                        </div>
                        <div onClick={() => { setMenuOpen(false); setLocation("/admin"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wider">
                          Notifications
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href="/marketplace/seller">
                          <span onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wide">
                            Vendor Portfolio
                          </span>
                        </Link>
                        <div onClick={() => { setMenuOpen(false); setLocation("/marketplace/seller"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wide">
                          Account Settings
                        </div>
                        <div onClick={() => { setMenuOpen(false); setLocation("/marketplace/seller"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wide">
                          Profile Settings
                        </div>
                        <div onClick={() => { setMenuOpen(false); setLocation("/marketplace/seller"); }} className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-[#00417E] dark:hover:bg-gavel-yellow hover:text-white dark:hover:text-black transition-all cursor-pointer font-mono uppercase tracking-wide">
                          Notifications
                        </div>
                      </>
                    )}
                  </div>

                  {/* Private signout actions bounds */}
                  <div className="border-t border-gavel-border/50 pt-2 bg-transparent">
                    <button 
                      onClick={() => { setMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 cursor-pointer text-left font-mono uppercase tracking-wider"
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
                <span className="px-5 py-2.5 rounded-xl bg-gavel-yellow hover:bg-[#FFDE00] hover:scale-103 duration-300 selection:bg-none text-black font-extrabold text-[10px] sm:text-xs tracking-widest uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center shrink-0">
                  Sign In
                </span>
              </Link>
            )
          )}
        </div>

        {/* Dynamic Route Container */}
        <main className={`flex-grow w-full ${location === "/admin" || location === "/gallery" ? "px-0 pt-0 sm:pt-0" : "px-4 sm:px-12 pt-12 sm:pt-14"}`}>
          {loading ? (
            <div className="space-y-6 max-w-4xl mx-auto py-12 animate-pulse w-full">
              {/* Modern grayish skeleton cards loader */}
              {[1, 2].map((i) => (
                <div key={i} className="p-6 rounded-2xl border border-gavel-border bg-white/[0.01] flex flex-col justify-between h-40">
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                    <div className="h-3 bg-white/5 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-white/5 rounded w-1/6"></div>
                </div>
              ))}
              <div className="text-center pt-2">
                <p className="text-gavel-muted font-mono text-[10px] tracking-widest uppercase">AUTHORIZING SESSION STATE ...</p>
              </div>
            </div>
          ) : (
            <Switch>
              <Route path="/" component={HomeView} />
              <Route path="/auth" component={AuthView} />
              <Route path="/events" component={EventsView} />
              <Route path="/events/:id" component={EventDetailsView} />
              <Route path="/clubs" component={ClubsView} />
              <Route path="/gallery" component={GalleryView} />
              <Route path="/marketplace" component={MarketplaceView} />
              <Route path="/marketplace/seller" component={SellerProfileView} />
              <Route path="/terms" component={TermsView} />
              <Route path="/vault" component={VaultView} />
              <Route path="/admin" component={AdminView} />
              <Route>
                <div className="flex flex-col items-center justify-center p-16 text-center gap-4">
                  <h1 className="text-8xl font-black text-gavel-yellow tracking-tighter">404</h1>
                  <p className="text-gavel-muted max-w-md">The modern path you seek is currently locked or does not exist.</p>
                  <Link href="/" className="px-5 py-2.5 rounded-xl border border-gavel-border bg-[#0E0E0E] text-sm text-gavel-muted hover:text-white hover:border-white/20 transition-all cursor-pointer">
                    Return to Student Hub
                  </Link>
                </div>
              </Route>
            </Switch>
          )}
        </main>

        {/* Floating Bottom Navigator for Premium Experience */}
        {location !== "/admin" && (
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
            <div className="bg-[#0a0a0b]/90 backdrop-blur-xl border border-[#ffde00]/15 rounded-3xl px-6 py-2.5 flex items-center justify-center gap-6 sm:gap-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
              <Link href="/">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group">
                  <Home size={18} className={location === "/" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"} />
                  <span className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${location === "/" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"}`}>
                    Home
                  </span>
                  {location === "/" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/marketplace">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group">
                  <Store size={18} className={location.startsWith("/marketplace") ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"} />
                  <span className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${location.startsWith("/marketplace") ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"}`}>
                    Market
                  </span>
                  {location.startsWith("/marketplace") && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/events">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group">
                  <Calendar size={18} className={location.startsWith("/events") ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"} />
                  <span className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${location.startsWith("/events") ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"}`}>
                    Events
                  </span>
                  {location.startsWith("/events") && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/gallery">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group">
                  <ImageIcon size={18} className={location === "/gallery" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"} />
                  <span className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${location === "/gallery" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"}`}>
                    Gallery
                  </span>
                  {location === "/gallery" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFDE00]" />
                  )}
                </span>
              </Link>

              <Link href="/vault">
                <span className="flex flex-col items-center cursor-pointer transition-all duration-200 relative group">
                  <Lock size={18} className={location === "/vault" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"} />
                  <span className={`text-[10px] font-sans font-medium tracking-tight mt-0.5 ${location === "/vault" ? "text-[#FFDE00]" : "text-[#71717a] group-hover:text-white"}`}>
                    Vault
                  </span>
                  {location === "/vault" && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#FFDE00]" />
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
