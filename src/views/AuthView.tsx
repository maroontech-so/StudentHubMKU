import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, fbfs } from "../lib/firebase";
import { UserProfile } from "../types";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowRight,
  ShieldAlert,
  Check,
  Mail,
} from "lucide-react";

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");

  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [, setLocation] = useLocation();

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setResetSent(false);
    setLoading(true);

    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        const user = userCred.user;

        const profile = await fbfs.getDocById<UserProfile>("users", user.uid);

        if (
          profile &&
          profile.role !== "vendor" &&
          profile.role !== "admin" &&
          profile.role !== "student"
        ) {
          await auth.signOut();

          throw new Error(
            "Your account does not currently have permission to access StudentHub.",
          );
        }

        setLocation("/");
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }

        const userCred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );

        const user = userCred.user;

        await updateProfile(user, {
          displayName: name.trim(),
        });

        const newProfile: any = {
          id: user.uid,
          uid: user.uid,
          name: name.trim(),
          email: email.trim(),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name.trim(),
          )}&background=2457c5&color=ffffff`,
          course: course.trim(),
          year,
          createdAt: new Date(),
          lastActive: new Date(),
          role: "vendor",
          active: true,
          newsletterSubscribed,
        };

        await fbfs.setDocById("users", user.uid, newProfile);

        setLocation("/");
      }
    } catch (err: any) {
      console.error(err);

      let message = "Something went wrong. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        message = "This email address is already in use.";
      } else if (err.code === "auth/weak-password") {
        message = "Password must be at least 6 characters.";
      } else if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        message = "The email or password is incorrect.";
      } else if (err.code === "auth/user-not-found") {
        message = "No account was found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.code === "auth/popup-closed-by-user") {
        message = "Google sign-in was cancelled.";
      } else if (err.code === "auth/popup-blocked") {
        message =
          "Your browser blocked the Google sign-in window. Please allow popups and try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many attempts. Please wait a moment and try again.";
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setResetSent(false);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const userCred = await signInWithPopup(auth, provider);
      const user = userCred.user;

      const existingProfile = await fbfs.getDocById<UserProfile>(
        "users",
        user.uid,
      );

      if (!existingProfile) {
        const displayName = user.displayName || "StudentHub Scholar";

        const newProfile: any = {
          id: user.uid,
          uid: user.uid,
          name: displayName,
          email: user.email || "",
          avatar:
            user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              displayName,
            )}&background=2457c5&color=ffffff`,
          course: "General Law Cohort",
          year: "1",
          createdAt: new Date(),
          lastActive: new Date(),
          role: "vendor",
          active: true,
          newsletterSubscribed: true,
        };

        await fbfs.setDocById("users", user.uid, newProfile);
      }

      setLocation("/");
    } catch (err: any) {
      console.error(err);

      let message = "Unable to continue with Google. Please try again.";

      if (err.code === "auth/popup-closed-by-user") {
        message = "Google sign-in was cancelled.";
      } else if (err.code === "auth/popup-blocked") {
        message =
          "Your browser blocked the Google sign-in window. Please allow popups and try again.";
      } else if (err.code === "auth/account-exists-with-different-credential") {
        message =
          "An account already exists with this email using another sign-in method.";
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetSent(false);

    if (!email.trim()) {
      setError("Enter your email address first, then select Forgot password.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      console.error(err);

      let message = "Unable to send the password reset email.";

      if (err.code === "auth/user-not-found") {
        message = "No account was found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        auth-page
        flex
        items-center
        justify-center
        px-4
        py-8
        sm:px-6
        lg:px-8
        bg-[#eef3f9]
        relative
        overflow-hidden
      "
      style={{
        /* Full-bleed escape hatch — breaks out of the shell's padded
           <main class="px-4 sm:px-12 pt-12 sm:pt-14"> so the auth page
           fills the viewport edge-to-edge, exactly like the marketplace. */
        width: "100vw",
        maxWidth: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        marginTop: "-3rem",
        paddingTop: "calc(3rem + 2rem)",
        paddingBottom: "6rem",
        minHeight: "100vh",
      }}
    >
      {/* Architectural background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.42]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(36,87,197,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(36,87,197,0.08) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#2457c5]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#fcdd09]/10 blur-3xl" />
      </div>

      {/* Main authentication shell */}
      <div
        className="
          relative
          z-10
          w-full
          max-w-[1120px]
          min-h-[650px]
          overflow-hidden
          rounded-[28px]
          bg-white
          border
          border-[#dbe3ef]
          shadow-[0_30px_80px_rgba(22,45,80,0.14)]
          grid
          grid-cols-1
          lg:grid-cols-[0.92fr_1.08fr]
        "
      >
        {/* =========================================================
            LEFT BRAND PANEL
           ========================================================= */}
        <div
          className="
            relative
            hidden
            lg:flex
            flex-col
            justify-between
            overflow-hidden
            bg-[#2457c5]
            text-white
            p-12
          "
        >
          {/* Decorative architecture */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />

            <div className="absolute -right-32 -top-32 w-[420px] h-[420px] rounded-full border border-white/10" />
            <div className="absolute -right-16 -top-16 w-[290px] h-[290px] rounded-full border border-white/10" />

            <div className="absolute bottom-[-180px] left-[-120px] w-[430px] h-[430px] rounded-full bg-[#173d91]/60 blur-2xl" />

            <div className="absolute right-10 bottom-10 w-20 h-20 rounded-full border border-white/10" />
            <div className="absolute right-[78px] bottom-[78px] w-5 h-5 rounded-full bg-[#fcdd09]" />
          </div>

          {/* Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-[#fcdd09]
                  text-[#101010]
                  flex
                  items-center
                  justify-center
                  font-black
                  text-sm
                  shadow-lg
                "
              >
                SH
              </div>

              <div>
                <div className="font-black text-sm tracking-tight">
                  STUDENTHUB
                </div>

                <div className="text-[9px] font-semibold tracking-[0.18em] text-white/65 uppercase">
                  Mount Kenya University
                </div>
              </div>
            </div>
          </div>

          {/* Main message */}
          <div className="relative z-10 max-w-[430px]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fcdd09]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/80">
                Campus platform
              </span>
            </div>

            <h1 className="text-[46px] leading-[1.02] font-black tracking-[-0.045em]">
              Your campus.
              <br />
              <span className="text-[#fcdd09]">One place.</span>
            </h1>

            <p className="mt-6 text-sm leading-6 text-white/72 max-w-[390px]">
              Stay connected to the student community, discover campus
              opportunities, access resources, and keep everything you need
              within StudentHub.
            </p>

            {/* Feature list */}
            <div className="mt-9 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Check size={15} strokeWidth={2.5} />
                </div>

                <span className="text-sm text-white/85">
                  Campus community & events
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Check size={15} strokeWidth={2.5} />
                </div>

                <span className="text-sm text-white/85">
                  Student marketplace & services
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Check size={15} strokeWidth={2.5} />
                </div>

                <span className="text-sm text-white/85">
                  Law resources & academic tools
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <div className="h-px bg-white/10 mb-5" />

            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/45">
              <span>StudentHub MKU</span>
              <span>2026</span>
            </div>
          </div>
        </div>

        {/* =========================================================
            RIGHT AUTH PANEL
           ========================================================= */}
        <div className="relative flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-[440px]">
            {/* Mobile branding */}
            <div className="lg:hidden flex items-center gap-3 mb-9">
              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-[#2457c5]
                  text-white
                  flex
                  items-center
                  justify-center
                  font-black
                  text-sm
                "
              >
                SH
              </div>

              <div>
                <div className="font-black text-sm tracking-tight text-[#111827]">
                  STUDENTHUB
                </div>

                <div className="text-[9px] font-semibold tracking-[0.15em] text-[#64748b] uppercase">
                  Mount Kenya University
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#2457c5] mb-3">
                Student access
              </div>

              <h2 className="text-[34px] leading-tight font-black tracking-[-0.04em] text-[#111827]">
                {isLogin ? "Welcome back." : "Create your account."}
              </h2>

              <p className="mt-2.5 text-sm leading-6 text-[#64748b]">
                {isLogin
                  ? "Sign in to continue to your StudentHub account."
                  : "Join StudentHub and connect with your campus community."}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="
                  mb-5
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3.5
                  text-sm
                  text-red-700
                "
              >
                <ShieldAlert size={17} className="shrink-0 mt-0.5" />

                <span className="leading-5">{error}</span>
              </div>
            )}

            {/* Password reset success */}
            {resetSent && (
              <div
                className="
                  mb-5
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3.5
                  text-sm
                  text-emerald-700
                "
              >
                <Mail size={17} className="shrink-0 mt-0.5" />

                <span className="leading-5">
                  Password reset instructions have been sent to your email.
                </span>
              </div>
            )}

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="
                w-full
                h-[52px]
                rounded-xl
                border
                border-[#d7dee8]
                bg-white
                hover:bg-[#f8faff]
                text-[#202124]
                flex
                items-center
                justify-center
                gap-3
                text-sm
                font-semibold
                transition-all
                duration-200
                hover:-translate-y-[1px]
                active:translate-y-0
                disabled:opacity-50
                disabled:cursor-not-allowed
                shadow-sm
              "
            >
              {/* Official Google G */}
              <span
                className="
                  w-5
                  h-5
                  shrink-0
                  flex
                  items-center
                  justify-center
                "
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.73-.07-1.43-.2-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.26z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.5c2.63 0 4.84-.87 6.45-2.37l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.52A9.75 9.75 0 0 0 12 21.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.58A5.86 5.86 0 0 1 6.23 12c0-.55.1-1.08.31-1.58V7.9H3.29A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.1l3.25-2.52z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.39c1.43 0 2.71.49 3.72 1.46l2.78-2.78C16.84 3.46 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.71 5.4l3.25 2.52C7.31 8.11 9.46 6.39 12 6.39z"
                  />
                </svg>
              </span>

              <span>{loading ? "Connecting..." : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-[#e5eaf0]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                or continue with email
              </span>

              <div className="h-px flex-1 bg-[#e5eaf0]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Registration fields */}
              {!isLogin && (
                <>
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="
                        block
                        mb-2
                        text-xs
                        font-semibold
                        text-[#334155]
                      "
                    >
                      Full name
                    </label>

                    <input
                      id="auth-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="
                        w-full
                        h-[50px]
                        rounded-xl
                        border
                        border-[#d7dee8]
                        bg-white
                        px-4
                        text-sm
                        text-[#111827]
                        placeholder:text-[#94a3b8]
                        outline-none
                        transition
                        focus:border-[#2457c5]
                        focus:ring-4
                        focus:ring-[#2457c5]/10
                      "
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="auth-course"
                        className="
                          block
                          mb-2
                          text-xs
                          font-semibold
                          text-[#334155]
                        "
                      >
                        Course
                      </label>

                      <input
                        id="auth-course"
                        type="text"
                        placeholder="e.g. LLB"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="
                          w-full
                          h-[50px]
                          rounded-xl
                          border
                          border-[#d7dee8]
                          bg-white
                          px-4
                          text-sm
                          text-[#111827]
                          placeholder:text-[#94a3b8]
                          outline-none
                          transition
                          focus:border-[#2457c5]
                          focus:ring-4
                          focus:ring-[#2457c5]/10
                        "
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-year"
                        className="
                          block
                          mb-2
                          text-xs
                          font-semibold
                          text-[#334155]
                        "
                      >
                        Year of study
                      </label>

                      <select
                        id="auth-year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="
                          w-full
                          h-[50px]
                          rounded-xl
                          border
                          border-[#d7dee8]
                          bg-white
                          px-4
                          text-sm
                          text-[#111827]
                          outline-none
                          transition
                          focus:border-[#2457c5]
                          focus:ring-4
                          focus:ring-[#2457c5]/10
                          cursor-pointer
                        "
                      >
                        <option value="">Select year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="auth-email"
                  className="
                    block
                    mb-2
                    text-xs
                    font-semibold
                    text-[#334155]
                  "
                >
                  Email address
                </label>

                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full
                    h-[50px]
                    rounded-xl
                    border
                    border-[#d7dee8]
                    bg-white
                    px-4
                    text-sm
                    text-[#111827]
                    placeholder:text-[#94a3b8]
                    outline-none
                    transition
                    focus:border-[#2457c5]
                    focus:ring-4
                    focus:ring-[#2457c5]/10
                  "
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="auth-password"
                    className="
                      text-xs
                      font-semibold
                      text-[#334155]
                    "
                  >
                    Password
                  </label>

                  {isLogin && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="
                        text-xs
                        font-semibold
                        text-[#2457c5]
                        hover:underline
                        disabled:opacity-50
                      "
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      w-full
                      h-[50px]
                      rounded-xl
                      border
                      border-[#d7dee8]
                      bg-white
                      px-4
                      pr-12
                      text-sm
                      text-[#111827]
                      placeholder:text-[#94a3b8]
                      outline-none
                      transition
                      focus:border-[#2457c5]
                      focus:ring-4
                      focus:ring-[#2457c5]/10
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      w-8
                      h-8
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      text-[#94a3b8]
                      hover:text-[#334155]
                      transition
                    "
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Registration agreement */}
              {!isLogin && (
                <div className="pt-1 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletterSubscribed}
                      onChange={(e) =>
                        setNewsletterSubscribed(e.target.checked)
                      }
                      className="
                        mt-0.5
                        w-4
                        h-4
                        rounded
                        border-[#cbd5e1]
                        accent-[#2457c5]
                        cursor-pointer
                      "
                    />

                    <span className="text-xs leading-5 text-[#64748b]">
                      Keep me updated with relevant StudentHub announcements,
                      events and campus opportunities.
                    </span>
                  </label>

                  <p className="text-xs leading-5 text-[#64748b]">
                    By creating an account, you agree to the StudentHub{" "}
                    <Link href="/terms">
                      <span className="font-semibold text-[#2457c5] hover:underline cursor-pointer">
                        Terms of Agreement
                      </span>
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  group
                  w-full
                  h-[52px]
                  mt-2
                  rounded-xl
                  bg-[#2457c5]
                  hover:bg-[#1f4cab]
                  text-white
                  flex
                  items-center
                  justify-center
                  gap-2.5
                  text-sm
                  font-bold
                  transition-all
                  duration-200
                  hover:-translate-y-[1px]
                  active:translate-y-0
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  shadow-[0_8px_20px_rgba(36,87,197,0.18)]
                "
              >
                {loading ? (
                  <>
                    <span
                      className="
                        w-4
                        h-4
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                        animate-spin
                      "
                    />

                    <span>
                      {isLogin ? "Signing you in..." : "Creating account..."}
                    </span>
                  </>
                ) : (
                  <>
                    <LockKeyhole size={16} />

                    <span>
                      {isLogin
                        ? "Sign in to StudentHub"
                        : "Create StudentHub account"}
                    </span>

                    <ArrowRight
                      size={16}
                      className="
                        transition-transform
                        duration-200
                        group-hover:translate-x-0.5
                      "
                    />
                  </>
                )}
              </button>
            </form>

            {/* Switch auth mode */}
            <div className="mt-7 text-center">
              <p className="text-sm text-[#64748b]">
                {isLogin
                  ? "Don't have a StudentHub account?"
                  : "Already have a StudentHub account?"}{" "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="
                    font-bold
                    text-[#2457c5]
                    hover:underline
                  "
                >
                  {isLogin ? "Create account" : "Sign in"}
                </button>
              </p>
            </div>

            {/* Security note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[#94a3b8]">
              <LockKeyhole size={12} />
              <span>Secure authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthView;

