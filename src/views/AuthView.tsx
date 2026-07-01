import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, fbfs } from "../lib/firebase";
import { UserProfile } from "../types";
import { ShieldCheck, ArrowRight, Chrome, Mail, Heart, ShieldAlert, CheckCircle2, Lock } from "lucide-react";

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;
        const profile = await fbfs.getDocById<UserProfile>("users", user.uid);
        if (profile && profile.role !== "vendor" && profile.role !== "admin" && profile.role !== "student") {
          await auth.signOut();
          throw new Error("Portal access is restricted to verified campus representatives. Please verify your legal credential status.");
        }
        setLocation("/");
      } else {
        // Sign up
        if (!name.trim()) {
          throw new Error("Full name is required");
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        // Custom update display name
        await updateProfile(user, { displayName: name });

        // Create profile document
        const newProfile: any = {
          id: user.uid,
          uid: user.uid,
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=121212&color=FFDE00`,
          course,
          year,
          createdAt: new Date(),
          lastActive: new Date(),
          role: "vendor",
          active: true,
          newsletterSubscribed // Opt-in value stored in database
        };
        await fbfs.setDocById("users", user.uid, newProfile);
        setLocation("/");
      }
    } catch (err: any) {
      console.error(err);
      let msg = "An unexpected error occurred.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email address is already in use.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password must be at least 6 characters.";
      } else if (err.code === "auth/invalid-credential") {
        msg = "Incorrect register credentials or invalid email address.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Standard Google login flow with creation backup
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      const user = userCred.user;

      // Verify or setup profile
      const existingProfile = await fbfs.getDocById<UserProfile>("users", user.uid);
      if (!existingProfile) {
        const newProfile: any = {
          id: user.uid,
          uid: user.uid,
          name: user.displayName || "Google Law Scholar",
          email: user.email || "",
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "Scholar")}&background=121212&color=FFDE00`,
          course: "General Law Cohort",
          year: "1",
          createdAt: new Date(),
          lastActive: new Date(),
          role: "vendor", // standard default credential scope
          active: true,
          newsletterSubscribed: true
        };
        await fbfs.setDocById("users", user.uid, newProfile);
      }
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication index protocol error occurred during Google Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] bg-[#09090b] flex flex-col lg:grid lg:grid-cols-12 text-left selection:bg-[#FFDE00] selection:text-black antialiased py-6 sm:py-0">
      
      {/* 1. INTRODUCTORY BRAND SIDE SPLIT PANEL (Lg screens only for pristine layouts) */}
      <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-black via-[#0d0d0f] to-[#121214] border-r border-white/5 flex-col justify-between p-12 text-left select-none rounded-3xl m-3 min-h-[600px]">
        
        {/* Glow ambient anchors */}
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-[#FFDE00]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-12 w-80 h-80 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFDE00] animate-pulse" />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FFDE00]">MKU GAVEL INTERACTIVE</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-tight">
            Advocacy <br />& Enterprise.
          </h1>
          <p className="text-xs text-gray-400 font-sans font-medium leading-relaxed max-w-sm mt-3">
            Mount Kenya University School of Law central executive system. Aligning scholar listings, moot judicial coordinate panels, and merchant portfolios in one sovereign ledger.
          </p>
        </div>

        {/* Feature anchors */}
        <div className="space-y-6 my-10 max-w-sm pr-4">
          <div className="flex gap-4 items-start">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-mono font-black text-[#FFDE00]">Ⅰ</span>
            </div>
            <div>
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Central Sovereign Complaint Vault</h4>
              <p className="text-[11px] text-gray-400 font-sans font-medium leading-relaxed mt-1">
                File motions, open parliament suggestion boxes, and direct official suggestions straight to administration nodes.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-mono font-black text-[#FFDE00]">Ⅱ</span>
            </div>
            <div>
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-white">Verified Commercial Market</h4>
              <p className="text-[11px] text-gray-400 font-sans font-medium leading-relaxed mt-1">
                Post textbooks, lawyer robes, stationery, and student services to active law parliament shoppers.
              </p>
            </div>
          </div>
        </div>

        {/* Footnote stamp */}
        <div className="border-t border-white/5 pt-6 text-[10px] font-mono uppercase tracking-wider text-gray-500">
          MKU LAW PARLIAMENT • EST 2026 GENERAL ASSEMBLY
        </div>
      </div>

      {/* 2. REVOLUTIONARY CARD LOGIN WINDOW PANEL */}
      <div className="flex-grow lg:col-span-7 flex items-center justify-center px-4 sm:px-12 py-4">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#0c0c0e] border border-white/10 shadow-2xl relative">
          
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#FFDE00]/10 rounded-full blur-xl pointer-events-none" />

          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              {isLogin ? "Executive Sign In" : "Become Partner Merchant"}
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-2 uppercase tracking-wider">
              {isLogin ? "Authorized credentials verification portal" : "Register a seller portal account today"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 font-medium leading-relaxed flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Social Sign In (Google Option) */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs uppercase font-extrabold py-3 px-4 rounded-xl transition-all cursor-pointer select-none"
            >
              <Chrome size={15} className="text-[#FFDE00]" />
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black">OR HUB SECURE MAIL</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
          </div>

          {/* Custom Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-black">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Felix Kiprop"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 transition-all font-sans font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-black">
                      Course Pathway
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LLB Law"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 transition-all font-sans font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-black">
                      Year of Study
                    </label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 transition-all font-sans font-medium cursor-pointer"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-black">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="representative@mku.ac.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#141418] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 transition-all font-sans font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-black">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#141418] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/50 transition-all"
              />
            </div>

            {/* Newsletter Subscription and T&C Agreement on registration */}
            {!isLogin && (
              <div className="space-y-3 pt-2 text-left">
                {/* 1. Newsletter opt-in */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newsletterSubscribed}
                    onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                    className="mt-0.5 rounded accent-[#FFDE00] bg-black border-white/10 text-black cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 leading-snug font-sans font-medium">
                    Subscribe to the Gavel newsletter stream for immediate campus merchant updates and buyer stats.
                  </span>
                </label>

                {/* 2. T&C Hyperlink Integration */}
                <div className="text-[10.5px] text-gray-400 leading-snug font-sans font-medium hover:text-white transition-colors border-t border-white/5 pt-2.5">
                  By clicking Create Profile below, you accept our official Mt. Kenya School of Law{" "}
                  <Link href="/terms">
                    <span className="text-[#FFDE00] hover:underline font-extrabold cursor-pointer">
                      Terms of Agreement
                    </span>
                  </Link>{" "}
                  and conduct requirements.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFDE00] hover:bg-yellow-400 text-black font-mono text-xs uppercase font-black py-4 px-4 rounded-xl cursor-pointer tracking-widest transition-all duration-300 shadow-xl shadow-[#FFDE00]/10 flex items-center justify-center gap-2 mt-4"
            >
              <Lock size={13} className="fill-current text-black" />
              <span>{loading ? "Authenticating..." : isLogin ? "Access Portal Node" : "Confirm and Create Profile"}</span>
            </button>
          </form>

          {/* Switch screens CTA link */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-gray-400 font-sans font-medium">
              {isLogin ? "New Representative or Campus Merchant?" : "Already possess Gavel credentials?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#FFDE00] hover:underline bg-transparent border-none cursor-pointer p-0 font-extrabold uppercase font-mono text-[10px] tracking-wider ml-1"
              >
                {isLogin ? "Create Profile" : "Sign In"}
              </button>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
