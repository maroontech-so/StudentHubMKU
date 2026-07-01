import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  Twitter, 
  Send as TelegramIcon, 
  Facebook, 
  Linkedin, 
  Share2 
} from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  category: "Event" | "Bulletin" | "Portfolio";
  customMessage?: string;
}

export function ShareDialog({ isOpen, onClose, url, title, category, customMessage }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Formulate a beautiful, personalized invite message for our student community
  const getPreFilledMessage = () => {
    if (customMessage) return customMessage;
    
    switch (category) {
      case "Event":
        return `📢 MKU Law Hub: Don't miss this upcoming event! Check out "${title}" and secure your delegate seat here: ${url}`;
      case "Bulletin":
        return `📰 MKU Law Hub: New official publication released! Read the bulletin for "${title}" here: ${url}`;
      case "Portfolio":
        return `🚀 Support our very own student enterprises! View the business portfolio of "${title}" on Student Bazaar: ${url}`;
      default:
        return `🔗 Check this out on the MKU Law Student Hub: ${title} - ${url}`;
    }
  };

  const shareText = getPreFilledMessage();
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  // Social options
  const shareLinks = [
    {
      name: "WhatsApp",
      icon: <MessageSquare size={18} className="text-white" />,
      color: "bg-[#25D366] hover:bg-[#20ba59]",
      url: `https://api.whatsapp.com/send?text=${encodedText}`
    },
    {
      name: "Twitter / X",
      icon: <Twitter size={18} className="text-white" />,
      color: "bg-black hover:bg-neutral-900 border border-white/10",
      url: `https://twitter.com/intent/tweet?text=${encodedText}`
    },
    {
      name: "Telegram",
      icon: <TelegramIcon size={18} className="text-white" />,
      color: "bg-[#0088cc] hover:bg-[#0077b3]",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText.replace(url, ""))}`
    },
    {
      name: "Facebook",
      icon: <Facebook size={18} className="text-white" />,
      color: "bg-[#1877F2] hover:bg-[#1566d4]",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={18} className="text-white" />,
      color: "bg-[#0966C2] hover:bg-[#0855a3]",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div 
        id="share-backdrop"
        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === "share-backdrop") {
            onClose();
          }
        }}
      >
        <motion.div
          id="share-dialog-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="w-full max-w-md bg-[#0e0e11] border border-[#ffde00]/15 rounded-3xl p-6 shadow-2xl relative select-none text-left"
        >
          {/* Close Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gavel-yellow/10 flex items-center justify-center border border-gavel-yellow/20">
                <Share2 size={15} className="text-[#FFDE00]" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                Share {category}
              </h3>
            </div>
            <button
              id="share-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 border border-white/5 text-gavel-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-6 pt-5">
            {/* Custom Message Summary Box */}
            <div className="bg-[#050505] rounded-2xl p-4 border border-white/5 space-y-2">
              <span className="text-[9px] font-mono text-[#FFDE00] uppercase tracking-wider font-bold">
                Pre-formatted Custom Message
              </span>
              <p className="text-xs text-gavel-muted font-sans font-medium leading-relaxed italic line-clamp-3">
                "{shareText}"
              </p>
            </div>

            {/* Shares Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-gavel-muted uppercase tracking-wider font-semibold block">
                Choose sharing channel
              </span>
              <div className="flex flex-col gap-2">
                {shareLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3.5 px-4.5 py-3 rounded-2xl ${link.color} text-white transition-all text-xs font-mono font-bold uppercase tracking-wider shadow-sm cursor-pointer`}
                  >
                    <span className="shrink-0">{link.icon}</span>
                    <span>Share on {link.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Copy Field */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <label 
                htmlFor="share-link-input"
                className="block text-[10px] font-mono text-gavel-muted uppercase tracking-wider font-semibold"
              >
                Or copy permalink
              </label>
              <div className="flex bg-black hover:border-white/10 border border-white/5 rounded-2xl p-1.5 items-center">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={url}
                  className="bg-transparent border-0 text-[11px] font-mono text-gavel-muted select-all px-3 py-1.5 focus:outline-none flex-1 min-w-0"
                />
                <button
                  id="share-copy-btn"
                  onClick={handleCopyLink}
                  className={`px-4.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow ${copied ? "bg-[#25D366] text-black" : "bg-[#FFDE00] hover:bg-white text-black"}`}
                >
                  {copied ? (
                    <>
                      <Check size={11} strokeWidth={3} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
