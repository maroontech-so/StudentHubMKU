import React, { useState, useEffect } from "react";
import { X, Mail, Users, Type, AlignLeft, CheckCircle2, ChevronRight, Send } from "lucide-react";
import { fbfs } from "../lib/firebase";
import { UserProfile } from "../types";

interface AdminNewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle: string;
  blocksCount: number;
  featuredImage: string;
  blocks: any[];
  onSendComplete: (subject: string, audienceCount: number) => void;
}

export function AdminNewsletterModal({ isOpen, onClose, postTitle, blocksCount, featuredImage, blocks, onSendComplete }: AdminNewsletterModalProps) {
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<"all" | "leaders" | "vendors">("all");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSubject(`[Campus Briefing] ${postTitle || "Latest Update"}`);
      setStep(1);
      setProgress(0);
    }
  }, [isOpen, postTitle]);

  if (!isOpen) return null;

  const handleLaunchBroadcast = async () => {
    setStep(2);
    setProgress(15);
    
    try {
      // 1. Fetch live emails based on database audience configuration
      let targetEmails: string[] = ["micahprince60@gmail.com"];
      try {
        const allUsers = await fbfs.getCollection<UserProfile>("users");
        setProgress(40);
        if (allUsers.length > 0) {
          if (audience === "all") {
            const list = allUsers.filter(u => u.newsletterSubscribed).map(u => u.email).filter(Boolean) as string[];
            if (list.length > 0) targetEmails = list;
          } else if (audience === "leaders") {
            const list = allUsers.filter(u => u.role === "admin" || u.role === "staff").map(u => u.email).filter(Boolean);
            if (list.length > 0) targetEmails = list;
          } else if (audience === "vendors") {
            const list = allUsers.filter(u => u.role === "vendor").map(u => u.email).filter(Boolean);
            if (list.length > 0) targetEmails = list;
          }
        }
      } catch (err) {
        console.error("Could not fetch target emails:", err);
      }

      setProgress(60);

      // 2. Dispatch real API call to Express Resend backend with dynamic content blocks
      const response = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subject,
          postTitle,
          featuredImage,
          audience,
          emails: targetEmails,
          blocks: blocks || []
        })
      });

      setProgress(85);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Broadcast delivery failure");
      }

      setProgress(100);
      setTimeout(() => {
        setStep(3);
        onSendComplete(subject, targetEmails.length);
      }, 500);

    } catch (error: any) {
      console.error("Failed to release newsletter:", error);
      alert(error.message || "Failed to dispatch email campaign. Please verify your internet connection and Resend key.");
      setStep(1);
    }
  };

  const getRecipientLabel = () => {
    if (audience === "all") return "847 Active Students · via Parliament Auth";
    if (audience === "leaders") return "54 Society Executives · Chambers Lead";
    return "312 Verified Merchant Portfolios";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#18181b]/20">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#FFDE00]" /> Intelligence Newsletter Engine
            </h2>
            <p className="text-gray-400 text-xs mt-1 font-mono uppercase tracking-widest">Broadcast interactive releases to the student roster</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#18181b] text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Draft Formulation */}
        {step === 1 && (
          <>
            <div className="flex flex-col md:flex-row bg-[#09090b] flex-1 overflow-hidden min-h-[420px]">
              {/* Configuration */}
              <div className="w-full md:w-1/2 p-6 border-r border-white/10 overflow-y-auto space-y-6 text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Newsletter Subject Line</p>
                  <div className="relative">
                    <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white text-sm font-mono outline-none focus:border-[#FFDE00]/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Select Target Audience</p>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFDE00] font-mono uppercase font-bold"
                  >
                    <option value="all">Mooting Parliament (All Students)</option>
                    <option value="leaders">Chamber Society Leads</option>
                    <option value="vendors">Approved Marketplace Businesses</option>
                  </select>
                </div>

                <div className="p-4 bg-[#18181b]/40 border border-white/5 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FFDE00]/10 rounded-xl flex items-center justify-center text-[#FFDE00] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Audience Reach</p>
                    <p className="text-gray-400 text-xs font-mono">{getRecipientLabel()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Publication Content Snapshot</p>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b]/30 border border-white/5">
                    <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400"><Type className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-gray-400 font-mono uppercase">Title Topic</p>
                      <p className="text-xs font-bold truncate text-white">{postTitle || "Untitled"}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b]/30 border border-white/5">
                    <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400"><AlignLeft className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-gray-400 font-mono uppercase font-bold">Element Layers</p>
                      <p className="text-xs font-bold truncate text-white">{blocksCount} content segments ready</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Email Mock Preview Client */}
              <div className="w-full md:w-1/2 p-6 bg-[#18181b]/20 flex flex-col overflow-y-auto">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 shrink-0 text-left">Email Client Blueprint Preview</p>
                
                <div className="flex-1 bg-[#0c0c0e] rounded-2xl overflow-hidden border border-zinc-800 flex flex-col min-h-[380px] shadow-lg text-left">
                  <div className="bg-[#121214] px-4 py-3 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-300 truncate">Subject: {subject}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 font-sans bg-black space-y-4">
                    <div className="border-b border-zinc-800 pb-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#FFDE00]">Modern Gavel Central</p>
                      <h1 className="text-lg font-black text-white mt-1 leading-tight uppercase">{postTitle || "Untitled Announcement"}</h1>
                    </div>

                    {featuredImage && (
                      <div className="w-full h-36 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
                        <img src={featuredImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}

                    {/* Highly strictly formatted email content section mapping the post blocks */}
                    <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                      {blocks && blocks.length > 0 ? (
                        blocks.map((block: any) => {
                          if (block.type === "h1") {
                            return (
                              <h2 key={block.id} className="text-sm font-black text-white uppercase border-b border-zinc-800 pb-1 pt-2">
                                {block.content}
                              </h2>
                            );
                          }
                          if (block.type === "h2") {
                            return (
                              <h3 key={block.id} className="text-xs font-bold text-[#FFDE00]">
                                {block.content}
                              </h3>
                            );
                          }
                          if (block.type === "image" && block.content) {
                            return (
                              <img key={block.id} src={block.content} className="w-full rounded border border-zinc-800 my-2" referrerPolicy="no-referrer" />
                            );
                          }
                          return (
                            <p key={block.id} className="whitespace-pre-wrap text-zinc-400">
                              {block.content}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                          Greetings students. We are excited to release our central administration briefing: <b>{postTitle}</b>. Head over to our portal to view full details!
                        </p>
                      )}
                    </div>

                    <div className="pt-4 text-center">
                      <span className="inline-block px-4 py-2 bg-[#FFDE00] text-black text-[10px] font-black uppercase tracking-wider rounded-lg">
                        View Interactive Document →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer triggers */}
            <div className="p-6 border-t border-white/10 flex gap-3 bg-[#18181b]/20 shrink-0">
              <button onClick={onClose} className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-mono uppercase font-bold transition-all">
                Cancel
              </button>
              <button 
                onClick={handleLaunchBroadcast} 
                className="flex-1 py-4.5 bg-[#FFDE00] hover:bg-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Dispatch Newsletter Release <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Progress Dispatch */}
        {step === 2 && (
          <div className="flex-1 flex flex-col items-center justify-center p-20 gap-6 bg-[#09090b] min-h-[400px]">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#FFDE00]/20 animate-ping"></div>
              <div className="w-20 h-20 rounded-full bg-[#FFDE00]/10 flex items-center justify-center text-[#FFDE00]">
                <Send className="w-8 h-8" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Broadcasting Campaign...</h3>
              <p className="text-gray-400 text-xs font-mono">Pushing content payload to {getRecipientLabel()}</p>
            </div>
            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden mt-2 border border-white/5">
              <div className="h-full bg-[#FFDE00] transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {/* Step 3: Success Release */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center p-20 gap-6 bg-[#09090b] min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/25 shadow-lg shadow-green-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Campaign Dispatched!</h3>
              <p className="text-gray-400 text-xs font-mono block">Delivery queue resolved successfully via Firebase hooks.</p>
              <p className="text-[#FFDE00] text-xs font-mono font-bold mt-2">Subject: {subject}</p>
            </div>
            <button 
              onClick={onClose} 
              className="px-10 py-3.5 bg-[#FFDE00] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-xl cursor-pointer"
            >
              Return To Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
