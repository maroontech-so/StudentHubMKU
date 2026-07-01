import React, { useState, useEffect } from "react";
import { X, Share2, Check, Link } from "lucide-react";

interface AdminSeoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  image: string;
  onSave: (data: { title: string; description: string; image: string }) => void;
}

export function AdminSeoModal({ isOpen, onClose, title: initialTitle, description: initialDesc, image: initialImage, onSave }: AdminSeoModalProps) {
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDesc || "");
  const [image, setImage] = useState(initialImage || "");
  const [platform, setPlatform] = useState<"whatsapp" | "linkedin" | "twitter">("whatsapp");

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");
      setDescription(initialDesc || "");
      setImage(initialImage || "");
    }
  }, [isOpen, initialTitle, initialDesc, initialImage]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#18181b]/20">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Share2 className="w-5 h-5 text-[#FFDE00]" /> SEO & Social Share Preview
            </h2>
            <p className="text-gray-400 text-xs mt-1 font-mono uppercase tracking-widest">Customize how your post appears when shared online</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#18181b] text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
          
          {/* Left: Metadata Form */}
          <div className="w-full md:w-1/2 p-6 border-r border-white/10 overflow-y-auto space-y-6 text-left">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">SEO Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-[#FFDE00]/50 transition-colors"
              />
              <p className={`text-[10px] mt-2 text-right ${title.length > 60 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                {title.length} / 60
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Meta Description</label>
              <textarea 
                rows={4} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#FFDE00]/50 transition-colors resize-none"
              />
              <p className={`text-[10px] mt-2 text-right ${description.length > 160 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                {description.length} / 160
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">Share Image URL</label>
              <input 
                type="url" 
                value={image} 
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#18181b]/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none focus:border-[#FFDE00]/50 transition-colors"
              />
              <p className="text-xs text-gray-400/60 mt-2 font-semibold">Recommended size: 1200x630 pixels</p>
            </div>

            <button 
              onClick={() => onSave({ title, description, image })} 
              className="w-full py-4 bg-[#FFDE00] text-black font-black rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Metadata
            </button>
          </div>

          {/* Right: Mock Previews */}
          <div className="w-full md:w-1/2 p-6 bg-[#18181b]/20 flex flex-col overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 text-left">Platform Live Preview</p>
            <div className="flex bg-black p-1 rounded-xl gap-1 mb-8">
              {(["whatsapp", "linkedin", "twitter"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${platform === p ? "bg-white/10 text-white border border-white/10" : "text-gray-400 hover:text-white"}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center flex-1">
              
              {/* WhatsApp Mock */}
              {platform === "whatsapp" && (
                <div className="w-full max-w-[325px] text-left">
                  <div className="bg-[#dcf8c6] p-4 rounded-xl shadow-md relative">
                    <div className="absolute -left-2 top-3 w-4 h-4 bg-[#dcf8c6] rotate-45"></div>
                    <div className="bg-white rounded-lg overflow-hidden border border-black/5 shadow-sm">
                      {image && (
                        <div className="h-[170px] bg-gray-200 overflow-hidden relative">
                          <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="p-3 bg-[#f0f2f5]">
                        <h4 className="font-bold text-black text-sm truncate">{title || "Post Title"}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-snug">{description || "Description goes here..."}</p>
                        <p className="text-[9px] text-[#FFDE00] font-mono mt-2 uppercase font-bold tracking-wider">moderngavel.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LinkedIn Mock */}
              {platform === "linkedin" && (
                <div className="w-full max-w-[380px] text-left">
                  <div className="bg-white rounded-md border border-gray-300 overflow-hidden shadow-sm">
                    {image && (
                      <div className="h-[200px] bg-gray-100 overflow-hidden">
                        <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="p-3 bg-[#f3f2ef]">
                      <h4 className="font-bold text-black text-sm truncate">{title || "Post Title"}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">moderngavel.com</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Twitter Mock */}
              {platform === "twitter" && (
                <div className="w-full max-w-[380px] text-left">
                  <div className="bg-black rounded-2xl border border-zinc-800 overflow-hidden shadow-md">
                    {image && (
                      <div className="h-[190px] bg-zinc-900 border-b border-zinc-800 overflow-hidden">
                        <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="p-3 bg-black">
                      <h4 className="font-bold text-white text-[14px] truncate">{title || "Post Title"}</h4>
                      <p className="text-[13px] text-gray-400 line-clamp-2 mt-0.5 leading-snug">{description || "Description goes here..."}</p>
                      <p className="text-[13px] text-gray-500 mt-2 flex items-center gap-1">
                        <Link className="w-3.5 h-3.5 text-gray-400" /> moderngavel.com
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
