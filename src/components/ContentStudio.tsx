import React, { useState, useEffect, useRef } from "react";
import { 
  Image as ImageIcon, 
  Trash2, 
  RotateCw, 
  RotateCcw, 
  Maximize2, 
  Sliders, 
  Sparkles, 
  Play, 
  Smartphone, 
  Tablet, 
  Monitor, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  HelpCircle, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  LayoutGrid, 
  Layers, 
  Cpu, 
  Save, 
  Undo, 
  Redo, 
  Eye, 
  ArrowLeftRight, 
  FileText, 
  Video, 
  MapPin, 
  ExternalLink,
  Settings,
  Grid,
  TrendingUp,
  Columns
} from "lucide-react";
import { uploadToImgBB } from "../lib/firebase";

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  // Dynamic Editor Properties (Can be saved to Firebase)
  rotation: number; // 0, 90, 180, 270
  scaleX: number; // 1 or -1
  scaleY: number; // 1 or -1
  crop: "free" | "1:1" | "3:4" | "16:9";
  filter: string; // "none" | "vibrant" | "warm" | "cool" | "vintage" | "cinematic" | "mono" | "premium" | "golden"
  adjustments: {
    brightness: number; // percent 100+
    contrast: number; // percent 100+
    saturation: number; // percent 100+
    blur: number; // px
    vignette: number;
    shadow: number;
    glow: number;
    sharpness: number;
    tint: string; // css color string or hex
  };
}

export type BlockType = 
  | "paragraph" 
  | "heading1" 
  | "heading2" 
  | "heading3" 
  | "quote" 
  | "callout" 
  | "caption" 
  | "image" 
  | "gallery" 
  | "media" 
  | "divider" 
  | "columns";

export interface ContentBlock {
  id: string;
  type: BlockType;
  // Content values
  text?: string;
  level?: 1 | 2 | 3;
  alignment?: "left" | "center" | "right" | "justify";
  // Layout values
  width?: "contained" | "full" | "floating" | "side";
  margin?: "none" | "small" | "medium" | "large";
  padding?: string;
  backgroundColor?: string;
  // Specific blocks data
  imageUrl?: string;
  mediaType?: "image" | "video" | "youtube" | "map" | "pdf";
  mediaLink?: string;
  galleryUrls?: string[];
  galleryLayout?: "grid" | "masonry" | "carousel" | "slideshow";
  carouselTransition?: "fade" | "slide" | "zoom" | "parallax";
  carouselAutoplay?: boolean;
  carouselDuration?: number; // seconds
  columnsData?: Array<{ id: string; blocks: ContentBlock[] }>;
}

// Preset Filters definitions
export const DESIGN_FILTERS = [
  { id: "none", name: "Natural", class: "" },
  { id: "vibrant", name: "Vibrant", class: "saturate-150 contrast-105" },
  { id: "warm", name: "Warm Amber", class: "sepia-[0.15] hue-rotate-[5deg] saturate-[1.1]" },
  { id: "cool", name: "Nordic Cool", class: "hue-rotate-[-5deg] saturate-[0.9] contrast-[1.02]" },
  { id: "vintage", name: "Retro Vintage", class: "sepia-[0.3] contrast-[0.9] brightness-[1.02]" },
  { id: "cinematic", name: "Cinematic Teal", class: "contrast-[1.1] brightness-[0.95] saturate-[1.05]" },
  { id: "mono", name: "Royal Monochromatic", class: "grayscale contrast-120" },
  { id: "premium", name: "Law Suite Gold", class: "contrast-[1.05] sepia-[0.1] saturate-[0.8] brightness-[0.98]" },
  { id: "golden", name: "Golden Hour Glow", class: "brightness-[1.05] saturate-[1.2] sepia-[0.05]" },
  { id: "professional", name: "Gavel Executive", class: "contrast-[1.08] saturate-[1.02] sepia-[0.02]" }
];

// ==========================================
// 1. UNIVERSAL MEDIA STUDIO COMPONENT
// ==========================================

interface MediaStudioProps {
  initialUrls?: string[];
  onChange: (urls: string[]) => void;
  singleMode?: boolean;
}

export function MediaStudio({ initialUrls = [], onChange, singleMode = false }: MediaStudioProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from props
  useEffect(() => {
    if (initialUrls.length > 0 && images.length === 0) {
      setImages(initialUrls.map((url, i) => ({
        id: `img_${i}_${Date.now()}`,
        url,
        name: `Asset ${i + 1}`,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        crop: "free",
        filter: "none",
        adjustments: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          vignette: 0,
          shadow: 0,
          glow: 0,
          sharpness: 100,
          tint: "transparent"
        }
      })));
    }
  }, [initialUrls]);

  // Report changes
  const reportUrls = (updated: MediaItem[]) => {
    onChange(updated.map(img => img.url));
  };

  const currentImage = images[selectedIdx];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setUploading(true);
    const newItems: MediaItem[] = [];

    for (const f of files) {
      try {
        const url = await uploadToImgBB(f);
        newItems.push({
          id: `img_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
          url,
          name: f.name,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          crop: "free",
          filter: "none",
          adjustments: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            vignette: 0,
            shadow: 0,
            glow: 0,
            sharpness: 100,
            tint: "transparent"
          }
        });
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    if (newItems.length > 0) {
      const merged = singleMode ? newItems.slice(0, 1) : [...images, ...newItems];
      setImages(merged);
      setSelectedIdx(merged.length - 1);
      reportUrls(merged);
    }
    setUploading(false);
  };

  const handleUpdateImage = (changes: Partial<MediaItem>) => {
    if (!currentImage) return;
    const updated = [...images];
    updated[selectedIdx] = { ...currentImage, ...changes };
    setImages(updated);
    reportUrls(updated);
  };

  const handleUpdateAdjustment = (key: keyof MediaItem["adjustments"], value: any) => {
    if (!currentImage) return;
    const updated = [...images];
    updated[selectedIdx] = {
      ...currentImage,
      adjustments: {
        ...currentImage.adjustments,
        [key]: value
      }
    };
    setImages(updated);
    reportUrls(updated);
  };

  const handleOneClickEnhance = () => {
    if (!currentImage) return;
    // Boost contrast, color correct slightly warmth and raise color depth
    const updated = [...images];
    updated[selectedIdx] = {
      ...currentImage,
      filter: "vibrant",
      adjustments: {
        ...currentImage.adjustments,
        brightness: 105,
        contrast: 110,
        saturation: 115,
        sharpness: 115,
        shadow: 10
      }
    };
    setImages(updated);
    reportUrls(updated);
  };

  const handleDeleteImage = (idx: number) => {
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    setSelectedIdx(Math.max(0, idx - 1));
    reportUrls(updated);
  };

  // Helper values to compile style of current editor display
  const getFilterStyle = (img: MediaItem) => {
    const adj = img.adjustments;
    let cssFilters = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) blur(${adj.blur}px)`;
    
    // Custom filter presets
    const activePreset = DESIGN_FILTERS.find(f => f.id === img.filter);
    if (activePreset?.id === "vibrant") cssFilters += " saturate(130%) contrast(105%)";
    if (activePreset?.id === "warm") cssFilters += " sepia(15%) saturate(110%) hue-rotate(5deg)";
    if (activePreset?.id === "cool") cssFilters += " saturate(90%) hue-rotate(-5deg) contrast(102%)";
    if (activePreset?.id === "vintage") cssFilters += " sepia(30%) contrast(90%) brightness(102%)";
    if (activePreset?.id === "cinematic") cssFilters += " contrast(110%) brightness(95%) saturate(105%)";
    if (activePreset?.id === "mono") cssFilters += " grayscale(100%) contrast(120%)";
    if (activePreset?.id === "premium") cssFilters += " contrast(105%) sepia(10%) saturate(80%) brightness(98%)";
    if (activePreset?.id === "golden") cssFilters += " brightness(105%) saturate(120%) sepia(5%)";
    if (activePreset?.id === "professional") cssFilters += " contrast(108%) saturate(102%) sepia(2%)";

    return {
      filter: cssFilters,
      transform: `rotate(${img.rotation}deg) scale(${img.scaleX}, ${img.scaleY})`,
      transition: "filter 0.15s ease-out, transform 0.15s ease-out",
      boxShadow: adj.glow > 0 ? `0 0 ${adj.glow}px rgba(255, 222, 0, 0.4)` : "none",
    };
  };

  return (
    <div className="bg-[#0A0A0B] border border-gavel-border rounded-3xl overflow-hidden shadow-2xl space-y-0 text-left">
      {/* Upper action Header */}
      <div className="bg-[#0F0F11] px-6 py-4 border-b border-gavel-border flex justify-between items-center">
        <div>
          <h4 className="text-xs font-mono font-bold uppercase text-white tracking-widest flex items-center gap-2">
            <ImageIcon size={14} className="text-gavel-yellow" /> UNIVERSAL MEDIA STUDIO
          </h4>
          <p className="text-[10px] text-gavel-muted uppercase font-mono mt-0.5">Studio-grade graphics compilation & corrections</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-gavel-yellow hover:bg-white text-black font-mono font-bold text-[9px] uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow"
          >
            {uploading ? "Uploading..." : <><Plus size={10} /> Add Graphics</>}
          </button>
          <input
            type="file"
            multiple={!singleMode}
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 min-h-[420px] divide-y lg:divide-y-0 lg:divide-x divide-gavel-border">
        {/* Core Canvas stage - Left col (large viewport) */}
        <div className="lg:col-span-8 bg-[#040405] p-6 flex flex-col justify-between select-none relative overflow-hidden">
          {uploading && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-gavel-yellow border-t-transparent animate-spin"></div>
              <p className="text-[10px] font-mono text-gavel-yellow uppercase tracking-widest animate-pulse">Hosting assets into legal CDN cloud...</p>
            </div>
          )}

          {currentImage ? (
            <>
              {/* Visual Frame */}
              <div className="flex-grow flex items-center justify-center min-h-[280px] relative">
                {/* Crop boundary guide overlay */}
                <div className={`relative max-w-full max-h-[280px] rounded-xl overflow-hidden bg-black/50 border border-gavel-border/30 ${
                  currentImage.crop === "1:1" ? "aspect-square w-[240px]" :
                  currentImage.crop === "3:4" ? "aspect-[3/4] w-[210px]" :
                  currentImage.crop === "16:9" ? "aspect-video w-[320px]" : ""
                }`}>
                  <img
                    src={currentImage.url}
                    alt={currentImage.name}
                    style={getFilterStyle(currentImage)}
                    className="max-w-full max-h-full object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                  {currentImage.adjustments.vignette > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none" 
                      style={{
                        boxShadow: `inset 0 0 ${currentImage.adjustments.vignette * 1.5}px rgba(0,0,0,0.9)`
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Status footer information */}
              <div className="mt-4 pt-4 border-t border-gavel-border/30 flex justify-between items-center text-[9px] font-mono text-gavel-muted uppercase tracking-wider">
                <span>{currentImage.name} ({currentImage.crop.toUpperCase()} CROP)</span>
                <span className="text-gavel-yellow">Filter: {currentImage.filter}</span>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center min-h-[280px] gap-3 text-center text-gavel-muted">
              <ImageIcon size={32} className="opacity-20 stroke-[1.5]" />
              <p className="text-[10px] uppercase tracking-widest font-mono">Media workspace vacant</p>
              <p className="text-[9px] max-w-xs leading-normal">Drag and drop high-resolution JPG or PNG photographs to start the editing suite.</p>
            </div>
          )}
        </div>

        {/* Adjustments Panel - Right col */}
        <div className="lg:col-span-4 bg-[#0A0A0C] p-6 space-y-6 overflow-y-auto max-h-[480px]">
          {currentImage ? (
            <>
              {/* Image Toolbar Tools */}
              <div className="space-y-4">
                <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider">Image Transformations</span>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateImage({ rotation: (currentImage.rotation - 90 + 360) % 360 })}
                    className="p-2 border border-gavel-border rounded-xl bg-[#0F0F11] hover:text-gavel-yellow transition-all flex justify-center text-white cursor-pointer"
                    title="Rotate Left"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateImage({ rotation: (currentImage.rotation + 90) % 360 })}
                    className="p-2 border border-gavel-border rounded-xl bg-[#0F0F11] hover:text-gavel-yellow transition-all flex justify-center text-white cursor-pointer"
                    title="Rotate Right"
                  >
                    <RotateCw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateImage({ scaleX: currentImage.scaleX * -1 })}
                    className="p-2 border border-gavel-border rounded-xl bg-[#0F0F11] hover:text-gavel-yellow transition-all flex justify-center text-white cursor-pointer"
                    title="Flip Horizontal"
                  >
                    <ArrowLeftRight size={12} className="rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateImage({ scaleY: currentImage.scaleY * -1 })}
                    className="p-2 border border-gavel-border rounded-xl bg-[#0F0F11] hover:text-gavel-yellow transition-all flex justify-center text-white cursor-pointer"
                    title="Flip Vertical"
                  >
                    <ArrowLeftRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={handleOneClickEnhance}
                    className="p-2 border border-gavel-yellow/30 bg-gavel-yellow/10 text-gavel-yellow hover:bg-gavel-yellow hover:text-black rounded-xl transition-all flex justify-center cursor-pointer"
                    title="One-click Smart Auto Enhance"
                  >
                    <Sparkles size={12} />
                  </button>
                </div>
              </div>

              {/* Crop Aspect ratio controls */}
              <div className="space-y-3">
                <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider">Aspect Ratio crop</span>
                <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono font-bold uppercase">
                  {["free", "1:1", "3:4", "16:9"].map(aspect => (
                    <button
                      key={aspect}
                      type="button"
                      onClick={() => handleUpdateImage({ crop: aspect as any })}
                      className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${currentImage.crop === aspect ? "bg-gavel-yellow/10 border-gavel-yellow text-gavel-yellow" : "border-gavel-border bg-[#0F0F11] text-gavel-muted hover:text-white"}`}
                    >
                      {aspect}
                    </button>
                  ))}
                </div>
              </div>

              {/* Professional Filters */}
              <div className="space-y-3">
                <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider">Visual filters</span>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono uppercase">
                  {DESIGN_FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleUpdateImage({ filter: f.id })}
                      className={`py-1.5 px-2.5 rounded-lg text-left border transition-all truncate cursor-pointer ${currentImage.filter === f.id ? "bg-gavel-yellow/10 border-gavel-yellow text-gavel-yellow font-bold" : "border-gavel-border bg-[#0F0F11] text-gavel-muted hover:text-white"}`}
                    >
                      • {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine sliders effects adjust */}
              <div className="space-y-4 pt-2 border-t border-gavel-border/30">
                <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Manual Adjustments</span>
                  <Sliders size={10} className="text-gavel-yellow" />
                </span>

                {/* Sliders loop */}
                {[
                  { label: "Brightness", key: "brightness", min: 50, max: 150, unit: "%" },
                  { label: "Contrast", key: "contrast", min: 50, max: 150, unit: "%" },
                  { label: "Saturation", key: "saturation", min: 0, max: 200, unit: "%" },
                  { label: "Blur Radius", key: "blur", min: 0, max: 10, unit: "px" },
                  { label: "Vignette Frame", key: "vignette", min: 0, max: 100, unit: "%" },
                  { label: "Asset Glow Shadow", key: "glow", min: 0, max: 40, unit: "px" }
                ].map(slider => (
                  <div key={slider.key} className="space-y-1 text-left">
                    <div className="flex justify-between text-[9px] font-mono text-gavel-muted uppercase font-bold">
                      <span>{slider.label}</span>
                      <span className="text-white">{(currentImage.adjustments as any)[slider.key]}{slider.unit}</span>
                    </div>
                    <input
                      type="range"
                      min={slider.min}
                      max={slider.max}
                      value={(currentImage.adjustments as any)[slider.key]}
                      onChange={(e) => handleUpdateAdjustment(slider.key as any, Number(e.target.value))}
                      className="w-full accent-gavel-yellow bg-[#141416] h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-xs text-gavel-muted font-mono leading-relaxed">No asset focused yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Multi-Image List Carousel manager (bottom bar) */}
      {!singleMode && images.length > 0 && (
        <div className="bg-[#0F0F11] border-t border-gavel-border px-6 py-4 space-y-3">
          <span className="block text-[9px] font-mono font-bold text-gavel-muted uppercase tracking-wider">Multi-Image Filmstrip (Carousel Manager)</span>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <div 
                key={img.id}
                onClick={() => setSelectedIdx(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border cursor-pointer transition-all flex-shrink-0 group ${selectedIdx === idx ? "border-gavel-yellow ring-2 ring-gavel-yellow/20" : "border-gavel-border hover:border-white/50"}`}
              >
                <img 
                  src={img.url} 
                  className="w-full h-full object-cover" 
                  alt={img.name}
                  referrerPolicy="no-referrer"
                />
                {/* Visual Delete shortcut */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(idx);
                  }}
                  className="absolute bottom-1 right-1 p-1 bg-black/80 hover:bg-gavel-danger text-gavel-muted hover:text-white rounded-md transition-opacity duration-150"
                  title="Remove asset"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ==========================================
// 2. UNIVERSAL BLOCK-BASED EDITOR COMPONENT
// ==========================================

interface BlockEditorProps {
  initialBlocks?: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  onSave?: () => Promise<void>;
}

export function BlockContentEditor({ initialBlocks = [], onChange, onSave }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [splitWorkspace, setSplitWorkspace] = useState(true);
  const [history, setHistory] = useState<ContentBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [toast, setToast] = useState<string | null>(null);

  // Initialize from props
  useEffect(() => {
    if (initialBlocks.length > 0 && blocks.length === 0) {
      setBlocks(initialBlocks);
    } else if (blocks.length === 0) {
      // Default placeholder block
      setBlocks([
        { id: "intro_para", type: "paragraph", text: "Click to write some elegant litigation descriptions or assembly briefs..." }
      ]);
    }
  }, [initialBlocks]);

  // Handle reporting
  const updateBlocksState = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);

    // Save state to History to make Draft undoable
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newBlocks)));
    // Keep max 20 versions
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const triggerAlertToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setBlocks(JSON.parse(JSON.stringify(history[prevIdx])));
      onChange(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setBlocks(JSON.parse(JSON.stringify(history[nextIdx])));
      onChange(history[nextIdx]);
    }
  };

  // Block creation tools
  const handleAddBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: `block_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      type,
      text: type === "paragraph" ? "Write secondary brief details here..." :
            type === "heading1" ? "HEADING HEADER 1" :
            type === "heading2" ? "HEADING MODULE 2" :
            type === "heading3" ? "HEADING SUBSECTION 3" :
            type === "quote" ? "Gavel Quote: A legal professional lives for honor." :
            type === "callout" ? "Moot Deadline: Roster closes this Friday!" : "",
      alignment: "left",
      width: "contained",
      imageUrl: type === "image" ? "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop" : "",
      galleryUrls: type === "gallery" ? [
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop"
      ] : [],
      galleryLayout: "grid"
    };
    updateBlocksState([...blocks, newBlock]);
  };

  const handleUpdateBlock = (id: string, value: Partial<ContentBlock>) => {
    const updated = blocks.map(b => b.id === id ? { ...b, ...value } : b);
    updateBlocksState(updated);
  };

  const handleDuplicateBlock = (b: ContentBlock) => {
    const freshBlock: ContentBlock = { 
      ...JSON.parse(JSON.stringify(b)), 
      id: `block_dup_${Math.random().toString(36).substring(2, 9)}_${Date.now()}` 
    };
    const idx = blocks.findIndex(x => x.id === b.id);
    const updated = [...blocks];
    updated.splice(idx + 1, 0, freshBlock);
    updateBlocksState(updated);
  };

  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) {
      triggerAlertToast("Visual sheets require at least one baseline paragraph block.");
      return;
    }
    const updated = blocks.filter(b => b.id !== id);
    updateBlocksState(updated);
  };

  const handleMoveBlock = (idx: number, dir: "up" | "down") => {
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === blocks.length - 1) return;

    const updated = [...blocks];
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    updateBlocksState(updated);
  };

  return (
    <div className="bg-[#080809] border border-gavel-border rounded-3xl overflow-hidden shadow-2xl flex flex-col text-left font-sans">
      {/* Upper command rail */}
      <div className="bg-[#0F0F12] border-b border-gavel-border px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gavel-yellow font-mono text-[10px] uppercase tracking-widest font-extrabold animate-pulse">
            <Layers size={14} /> UNIVERSAL VISUAL BLOCK BUILDER
          </div>
          <p className="text-[10px] text-gavel-muted uppercase font-mono">Build rich layouts visually — Notion, Canva, other layouts combined</p>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Split switch */}
          <button
            type="button"
            onClick={() => setSplitWorkspace(!splitWorkspace)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-[9px] font-mono uppercase font-bold tracking-wider cursor-pointer duration-200 ${splitWorkspace ? "bg-gavel-purple/15 border-gavel-purple text-gavel-purple" : "border-gavel-border text-gavel-muted hover:text-white"}`}
          >
            <ArrowLeftRight size={10} /> {splitWorkspace ? "Dismiss Split Preview" : "Split Live Preview"}
          </button>

          {/* Device indicators */}
          {splitWorkspace && (
            <div className="flex bg-black p-1 rounded-xl border border-gavel-border gap-1">
              {[
                { id: "desktop", icon: <Monitor size={10} /> },
                { id: "tablet", icon: <Tablet size={10} /> },
                { id: "mobile", icon: <Smartphone size={10} /> }
              ].map(dev => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => setPreviewDevice(dev.id as any)}
                  className={`p-1.5 rounded-lg text-white transition-all cursor-pointer ${previewDevice === dev.id ? "bg-gavel-yellow text-black font-bold scale-105" : "text-gavel-muted hover:text-white"}`}
                >
                  {dev.icon}
                </button>
              ))}
            </div>
          )}

          {/* History */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-gavel-muted hover:text-white disabled:opacity-20 transition-all border border-gavel-border bg-black rounded-lg cursor-pointer"
              title="Undo Action"
            >
              <Undo size={10} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-gavel-muted hover:text-white disabled:opacity-20 transition-all border border-gavel-border bg-black rounded-lg cursor-pointer"
              title="Redo Action"
            >
              <Redo size={10} />
            </button>
          </div>

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-4 py-1.5 bg-gavel-yellow hover:bg-white text-black font-mono font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow cursor-pointer flex items-center gap-1"
            >
              <Save size={10} /> Publish Content
            </button>
          )}
        </div>
      </div>

      {/* Primary Split Workspace */}
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gavel-border bg-[#050506]">
        
        {/* Workspace Canvas (Left Column) */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[620px]">
          <div className="flex justify-between items-center pb-2 border-b border-gavel-border/30">
            <span className="text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider flex items-center gap-1"><FileText size={12} /> Construct Layout sheet</span>
            <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-gavel-yellow/10 text-gavel-yellow uppercase font-bold">Auto Saving...</span>
          </div>

          {/* Render Blocks Editor Loop */}
          <div className="space-y-4">
            {blocks.map((block, idx) => (
              <div 
                key={block.id}
                className="group relative p-4 rounded-2xl border border-gavel-border/50 bg-[#0B0B0C] hover:border-gavel-yellow/30 transition-all text-left space-y-3"
              >
                {/* Block Controls toolbar hover absolute */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[#121215] border border-gavel-border p-1 rounded-lg transition-opacity duration-150 z-20">
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(idx, "up")}
                    className="p-1 hover:text-gavel-yellow text-gavel-muted"
                    title="Move block up"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(idx, "down")}
                    className="p-1 hover:text-gavel-yellow text-gavel-muted"
                    title="Move block down"
                  >
                    <ChevronDown size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateBlock(block)}
                    className="p-1 hover:text-gavel-yellow text-gavel-muted"
                    title="Duplicate block"
                  >
                    <Copy size={10} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="p-1 hover:text-gavel-danger text-gavel-muted"
                    title="Delete block"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>

                {/* Block Title/Badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-gavel-muted uppercase tracking-wider">
                    {block.type.toUpperCase()} BLOCK
                  </span>
                </div>

                {/* Render Dynamic Block Content Inputs based on Block Type */}
                {/* 1. Paragraph (Rich text layout context) */}
                {block.type === "paragraph" && (
                  <textarea
                    value={block.text}
                    onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
                    className="w-full bg-[#111] border border-gavel-border rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gavel-yellow/20"
                    placeholder="Enter litigation description..."
                    rows={Math.max(3, Math.ceil((block.text?.length || 0) / 75))}
                  />
                )}

                {/* 2. Heading Levels */}
                {(block.type === "heading1" || block.type === "heading2" || block.type === "heading3") && (
                  <input
                    type="text"
                    value={block.text}
                    onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
                    className={`w-full bg-[#111] border border-gavel-border rounded-xl px-4 py-2.5 text-white font-black uppercase tracking-tight focus:outline-none focus:border-gavel-yellow/20 ${block.type === 'heading1' ? 'text-sm' : block.type === 'heading2' ? 'text-xs' : 'text-[11px]'}`}
                    placeholder="Enter section title details..."
                  />
                )}

                {/* 3. Quote */}
                {block.type === "quote" && (
                  <div className="border-l-2 border-gavel-yellow pl-4">
                    <textarea
                      value={block.text}
                      onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
                      className="w-full bg-[#111] border border-gavel-border rounded-xl px-4 py-3 text-xs italic text-gavel-yellow focus:outline-none"
                      placeholder="Write noble legal proverb..."
                    />
                  </div>
                )}

                {/* 4. Callout Alert info */}
                {block.type === "callout" && (
                  <div className="bg-gavel-yellow/5 border border-gavel-yellow/20 rounded-xl p-3">
                    <textarea
                      value={block.text}
                      onChange={(e) => handleUpdateBlock(block.id, { text: e.target.value })}
                      className="w-full bg-transparent border-none text-xs text-gavel-yellow font-medium focus:outline-none"
                      placeholder="Write alert or roster deadline summaries..."
                    />
                  </div>
                )}

                {/* 5. Image Block URL config */}
                {block.type === "image" && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={block.imageUrl}
                      onChange={(e) => handleUpdateBlock(block.id, { imageUrl: e.target.value })}
                      className="w-full bg-[#111] border border-gavel-border rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none"
                      placeholder="Asset Image URL (https://...)"
                    />
                    <div className="flex bg-black p-1 rounded-xl gap-2 border border-gavel-border max-w-sm">
                      {["contained", "full", "floating"].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleUpdateBlock(block.id, { width: sz as any })}
                          className={`flex-1 py-1 rounded text-[8px] font-mono uppercase font-bold ${block.width === sz ? "bg-gavel-yellow text-black" : "text-gavel-muted hover:text-white"}`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Gallery URLs arrays block */}
                {block.type === "gallery" && (
                  <div className="space-y-3">
                    <textarea
                      value={block.galleryUrls?.join("\n")}
                      onChange={(e) => handleUpdateBlock(block.id, { galleryUrls: e.target.value.split("\n").filter(Boolean) })}
                      className="w-full bg-[#111] border border-gavel-border rounded-xl px-4 py-2 text-[10px] font-mono text-gavel-muted focus:outline-none h-16"
                      placeholder="Multi-image assets list URL on separate lines..."
                    />
                    <div className="flex bg-black p-1 rounded-xl gap-2 border border-gavel-border max-w-sm">
                      {["grid", "masonry", "carousel", "slideshow"].map(layout => (
                        <button
                          key={layout}
                          type="button"
                          onClick={() => handleUpdateBlock(block.id, { galleryLayout: layout as any })}
                          className={`flex-1 py-1 rounded text-[8px] font-mono uppercase font-bold ${block.galleryLayout === layout ? "bg-gavel-yellow text-black" : "text-gavel-muted hover:text-white"}`}
                        >
                          {layout}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Divider spacing line */}
                {block.type === "divider" && (
                  <div className="py-2 flex items-center justify-between border-t border-dashed border-gavel-border/80">
                    <span className="text-[10px] font-mono text-gavel-muted uppercase tracking-widest font-semibold">Visual dividing line spacer</span>
                  </div>
                )}

                {/* 8. Split Column drag placeholder */}
                {block.type === "columns" && (
                  <div className="p-3 border border-dashed border-gavel-purple/30 bg-gavel-purple/5 rounded-xl text-center space-y-1">
                    <span className="text-[9px] font-mono text-gavel-purple font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Columns size={12} /> DUAL-COLUMN LAYOUT BLOCK
                    </span>
                    <p className="text-[8px] text-gavel-muted uppercase">Combines blocks inside separate visual grids internally</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Core Block Addition Panel */}
          <div className="mt-8 pt-6 border-t border-gavel-border/30 space-y-3">
            <span className="block text-[10px] font-mono font-bold text-gavel-muted uppercase tracking-wider">Inject layout component block</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "paragraph", label: "Paragraph brief", icon: <FileText size={10} /> },
                { type: "heading1", label: "Section Title", icon: <Heading1 size={10} /> },
                { type: "heading2", label: "Heading level 2", icon: <Heading2 size={10} /> },
                { type: "quote", label: "Proverb Quote", icon: <Quote size={10} /> },
                { type: "callout", label: "Notice Alert", icon: <Sparkles size={10} /> },
                { type: "image", label: "Illustration asset", icon: <ImageIcon size={10} /> },
                { type: "gallery", label: "Masonry Carousel", icon: <Grid size={10} /> },
                { type: "divider", label: "Dividing Line", icon: <Layers size={10} /> }
              ].map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddBlock(item.type as BlockType)}
                  className="p-2.5 border border-gavel-border bg-[#0B0B0D] hover:border-gavel-yellow/30 text-white hover:text-gavel-yellow rounded-xl text-[9px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 justify-start"
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Side-by-Side Preview (Right Column) */}
        {splitWorkspace && (
          <div className="p-6 bg-black flex flex-col h-[620px] items-center justify-center overflow-y-auto">
            {/* Live Frame simulation container */}
            <div className={`border border-gavel-border rounded-3xl bg-[#09090A] shadow-2xl relative transition-all duration-300 ${
              previewDevice === "mobile" ? "w-[300px] h-[520px] h-scrollbar" :
              previewDevice === "tablet" ? "w-[420px] h-[540px] h-scrollbar" :
              "w-full h-full h-scrollbar"
            }`}>
              
              {/* Inner screen frame viewport */}
              <div className="p-6 overflow-y-auto h-full text-left space-y-8">
                {/* Simulated cover header */}
                <div className="space-y-2 border-b border-gavel-border/30 pb-4">
                  <span className="text-[9px] font-mono text-gavel-yellow uppercase font-bold tracking-widest flex items-center gap-1">
                    <Eye size={10} /> Live Assembler View
                  </span>
                  <p className="text-[8px] font-mono text-gavel-muted uppercase">Real-time dynamic litigation rendering simulator</p>
                </div>

                {/* Real-time Renderer block sequence loop */}
                <div className="space-y-6">
                  {blocks.map((block) => {
                    switch (block.type) {
                      case "paragraph":
                        return (
                          <p key={block.id} className="text-xs text-gavel-muted leading-relaxed font-sans text-left whitespace-pre-wrap">
                            {block.text}
                          </p>
                        );
                      case "heading1":
                        return (
                          <h1 key={block.id} className="text-xl font-black text-white uppercase tracking-tight text-left">
                            {block.text}
                          </h1>
                        );
                      case "heading2":
                        return (
                          <h2 key={block.id} className="text-base font-extrabold text-[#eeeeee] uppercase tracking-normal text-left">
                            {block.text}
                          </h2>
                        );
                      case "heading3":
                        return (
                          <h3 key={block.id} className="text-xs font-bold text-gavel-yellow uppercase tracking-wider text-left">
                            {block.text}
                          </h3>
                        );
                      case "quote":
                        return (
                          <blockquote key={block.id} className="border-l-2 border-gavel-yellow/60 pl-4 py-1 italic text-gavel-yellow text-xs font-serif leading-relaxed text-left">
                            "{block.text}"
                          </blockquote>
                        );
                      case "callout":
                        return (
                          <div key={block.id} className="p-4 rounded-xl border border-gavel-yellow/20 bg-gavel-yellow-[0.03] bg-gavel-yellow/5 text-gavel-yellow text-[11px] font-semibold leading-relaxed tracking-wide text-left flex items-start gap-2">
                            <Sparkles size={12} className="mt-0.5 flex-shrink-0 animate-pulse text-gavel-yellow" />
                            <span>{block.text}</span>
                          </div>
                        );
                      case "image":
                        return block.imageUrl ? (
                          <div key={block.id} className={`rounded-2xl overflow-hidden border border-gavel-border/45 ${
                            block.width === "full" ? "w-full" : "max-w-[85%] mx-auto"
                          }`}>
                            <img src={block.imageUrl} className="w-full object-cover" alt="visual sheet" referrerPolicy="no-referrer" />
                          </div>
                        ) : null;
                      case "gallery":
                        return block.galleryUrls && block.galleryUrls.length > 0 ? (
                          <div key={block.id} className="grid grid-cols-2 gap-2">
                            {block.galleryUrls.map((url, i) => (
                              <div key={i} className="rounded-xl overflow-hidden border border-gavel-border/30 aspect-video">
                                <img src={url} className="w-full h-full object-cover" alt="Sub assembly" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        ) : null;
                      case "divider":
                        return (
                          <hr key={block.id} className="border-t border-gavel-border/40 my-6" />
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-10 right-10 bg-gavel-yellow text-black font-semibold uppercase text-[10px] font-mono tracking-widest px-4 py-2.5 rounded-xl shadow-2xl z-50 animate-fade-in animate-pulse border border-black/10">
          {toast}
        </div>
      )}
    </div>
  );
}
