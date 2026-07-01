import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { auth, rtdb } from "../lib/firebase";
import { VaultPost } from "../types";
import { ref, set, push, onValue, get, runTransaction as runRtdbTransaction } from "firebase/database";
import { Lock, Flame, Heart, Sparkles, MessageSquare, X, Check, ShieldCheck, Info, HelpCircle, Search } from "lucide-react";

export function VaultView() {
  const [content, setContent] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > 2000) return;

    setSubmitLoading(true);
    try {
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const vaultRef = ref(rtdb, "vault");
      const newPostRef = push(vaultRef);

      const finalTitle = content.trim().slice(0, 45) + (content.trim().length > 45 ? "..." : "");

      const payload: VaultPost & { status?: string, adminResponse?: string } = {
        id: newPostRef.key || "",
        title: finalTitle,
        content: content.trim(),
        anonymousId: `COMRADE_${randomId}`,
        timestamp: Date.now(),
        supportCount: 0,
        authorName: "Anonymous Comrade"
      };

      await set(newPostRef, payload);

      setContent("");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (err) {
      console.error("Error submitting Vault bulletin:", err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 select-none">
      <div className="w-full max-w-md mx-auto space-y-6">
        
        {/* Brand Icon Header */}
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(124,58,237,0.1)]">
            <Lock size={20} className="text-[#a78bfa]" />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-normal font-sans">
              The Vault
            </h1>
            <p className="text-zinc-500 text-xs font-sans font-medium tracking-wide">
              Speak without consequence. We never know who you are.
            </p>
          </div>
        </div>

        {/* Input Card Console */}
        <div className="relative bg-[#0c0c0e]/90 border border-white/5 rounded-3xl p-5 shadow-2xl">
          {isSubmitted ? (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-2.5 animate-fadeIn">
              <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400">
                <Check size={18} />
              </div>
              <p className="text-white text-xs font-semibold uppercase tracking-wider font-mono">Whisper Dispatched</p>
              <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed">
                Your suggestion has slipped securely into the archive queue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitPost} className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                placeholder="Tell us something you wouldn't say in person..."
                className="w-full h-40 bg-transparent text-white text-xs placeholder-zinc-600 border-0 outline-none focus:ring-0 resize-none font-sans leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <span className="text-[10px] font-mono text-zinc-600 select-none">
                  {content.length} / 2000
                </span>

                <button
                  type="submit"
                  disabled={submitLoading || !content.trim()}
                  className="bg-[#18181c] hover:bg-[#222227] active:scale-[0.98] transition-all text-white border border-white/5 px-4 py-2 rounded-full text-xs font-mono font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                  <Lock size={12} className="text-[#a78bfa]" />
                  <span>Submit Anonymously</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Indicator Footer Badge */}
        <div className="flex items-center justify-center gap-1.5 text-zinc-600 font-sans text-[10px] tracking-wide select-none">
          <ShieldCheck size={13} className="text-[#a78bfa] opacity-80" />
          <span>End-to-End Secure • All whispering encrypted</span>
        </div>

      </div>
    </div>
  );
}
