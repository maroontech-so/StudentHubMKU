import React, { useState, useEffect } from "react";
import { fbfs, auth } from "../lib/firebase";
import { GalleryItem, GalleryAlbum } from "../types";
import { useAuth } from "../App";
import { uploadToImgBB } from "../lib/firebase";
import { Image as ImageIcon, Plus, Check, Compass, FolderClosed, Grid2X2, Sparkles, X, ChevronLeft, ChevronRight, Info } from "lucide-react";

interface LightboxOverlayProps {
  lightboxItem: GalleryItem;
  lightboxIndex: number;
  displayItems: GalleryItem[];
  albums: GalleryAlbum[];
  onNavigate: (direction: "next" | "prev") => void;
  onClose: () => void;
}

function LightboxOverlay({
  lightboxItem,
  lightboxIndex,
  displayItems,
  albums,
  onNavigate,
  onClose
}: LightboxOverlayProps) {
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNavigate("next");
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      onNavigate("next");
    } else if (diff < -50) {
      onNavigate("prev");
    }
  };

  const assignedAlb = albums.find(a => a.id === lightboxItem.albumId);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top action bar: simple, transparent, thin, no margins */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-6 py-6 flex items-center justify-between z-30 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs font-mono tracking-widest text-[#FFDE00] font-black uppercase">
            {assignedAlb ? assignedAlb.name : (lightboxItem.category || "CAMPUS PHOTO")}
          </span>
          <span className="text-[10px] font-mono text-white/40 tracking-wider">
            {lightboxIndex + 1} / {displayItems.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full border border-white/10 bg-black/40 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer pointer-events-auto shadow-lg"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Image Container: Full height and width, fully responsive, zero margin constraints */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
        
        {/* Left Arrow Button for wider screens or touch */}
        <button
          onClick={() => onNavigate("prev")}
          className="absolute left-6 z-30 p-3 rounded-full border border-white/10 bg-black/40 hover:bg-white hover:text-black hover:border-white text-white transition-all duration-300 hidden md:flex items-center justify-center cursor-pointer shadow-lg"
          title="Previous Image"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Right Arrow Button for wider screens or touch */}
        <button
          onClick={() => onNavigate("next")}
          className="absolute right-6 z-30 p-3 rounded-full border border-white/10 bg-black/40 hover:bg-white hover:text-black hover:border-white text-white transition-all duration-300 hidden md:flex items-center justify-center cursor-pointer shadow-lg"
          title="Next Image"
        >
          <ChevronRight size={24} />
        </button>

        {/* Swipe Tap Areas for mobile / clickable edges */}
        <div 
          onClick={() => onNavigate("prev")}
          className="absolute left-0 top-0 bottom-0 w-[20%] z-25 cursor-w-resize md:hidden"
        />
        <div 
          onClick={() => onNavigate("next")}
          className="absolute right-0 top-0 bottom-0 w-[20%] z-25 cursor-e-resize md:hidden"
        />

        {/* Image wrapper: occupies all available height and width */}
        <div className="w-full h-full flex items-center justify-center p-0">
          <img
            src={lightboxItem.imageUrl}
            alt={lightboxItem.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain pointer-events-none select-none transition-all duration-500 animate-fade-in"
          />
        </div>
      </div>

      {/* Bottom text overlay: completely elegant, simple and fading into black, no cards/boxes */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-8 px-6 text-left z-20 pointer-events-none select-text">
        <div className="max-w-4xl mx-auto space-y-2 pointer-events-auto">
          {lightboxItem.title && (
            <h2 className="text-lg md:text-2xl font-sans font-extrabold text-white uppercase tracking-tight leading-snug">
              {lightboxItem.title}
            </h2>
          )}
          {lightboxItem.description && (
            <p className="text-white/75 text-xs md:text-sm leading-relaxed max-w-3xl font-medium">
              {lightboxItem.description}
            </p>
          )}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[9px] font-mono text-white/40 uppercase tracking-widest">
            <span>By Operator: <strong className="text-white">{lightboxItem.uploaderName}</strong></span>
            {lightboxItem.uploadedAt && (
              <span>• {new Date(lightboxItem.uploadedAt?.seconds ? lightboxItem.uploadedAt.seconds * 1000 : lightboxItem.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GalleryView() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"feed" | "albums">("feed");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [isInCoverLanding, setIsInCoverLanding] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Album Creation form states
  const [albumCreateOpen, setAlbumCreateOpen] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [albumTopic, setAlbumTopic] = useState("");
  const [albumLoading, setAlbumLoading] = useState(false);

  // Photo form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("campus");
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Lightbox index state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { profile } = useAuth();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const items = await fbfs.getCollection<GalleryItem>("gallery", [["visible", "==", true]], "uploadedAt", "desc");
      setGallery(items);
    } catch (err) {
      console.error("Error setting up student life gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlbums = async () => {
    try {
      setAlbumsLoading(true);
      const items = await fbfs.getCollection<GalleryAlbum>("gallery_albums", [], "createdAt", "desc");
      setAlbums(items || []);
    } catch (err) {
      console.error("Error setting up albums stream:", err);
    } finally {
      setAlbumsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    loadAlbums();
  }, []);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || profile?.role !== "admin") {
      triggerToast("Only authorized Admins can establish collection albums.", "error");
      return;
    }
    if (!albumName.trim() || !albumTopic.trim()) {
      triggerToast("Please supply the Album title & overarching Topic name.", "error");
      return;
    }

    setAlbumLoading(true);
    try {
      const payload: Partial<GalleryAlbum> = {
        name: albumName.trim(),
        description: albumDescription.trim(),
        topic: albumTopic.trim(),
        createdAt: new Date()
      };

      await fbfs.addDocInCollection("gallery_albums", payload);
      setAlbumCreateOpen(false);
      setAlbumName("");
      setAlbumDescription("");
      setAlbumTopic("");
      triggerToast(`Topic Album "${albumName}" cataloged successfully!`);
      await loadAlbums();
    } catch (err: any) {
      triggerToast(err.message || "Failed to catalog new Album topic", "error");
    } finally {
      setAlbumLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      triggerToast("Authenticate to publish imagery.", "error");
      return;
    }
    if (files.length === 0) {
      triggerToast("Please select at least one photograph to upload", "error");
      return;
    }

    setUploadLoading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        
        // 1. Upload individual file object directly to ImgBB
        const cloudUrl = await uploadToImgBB(fileObj);

        // 2. Save document payload to Firestore
        const payload: Partial<GalleryItem> = {
          title: files.length > 1 && title.trim() 
            ? `${title.trim()} (${i + 1}/${files.length})` 
            : title.trim() || fileObj.name.split(".")[0],
          description,
          imageUrl: cloudUrl,
          category,
          featured: false,
          visible: true,
          uploadedBy: auth.currentUser.uid,
          uploaderName: profile?.name || auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "University Comrade",
          uploadedAt: new Date()
        };

        if (uploadAlbumId) {
          payload.albumId = uploadAlbumId;
        }

        await fbfs.addDocInCollection("gallery", payload);
      }

      setUploadOpen(false);
      setTitle("");
      setDescription("");
      setUploadAlbumId("");
      setCategory("campus");
      setFiles([]);
      
      triggerToast(`Successfully uploaded ${files.length} images to the public archives!`);
      await loadPhotos();
    } catch (err: any) {
      triggerToast(err.message || "An error occurred during photograph sync", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  // Filter items. Under ALL (feed), let is display everything. Under Collections, filter by selectedAlbumId.
  const displayItems = React.useMemo(() => {
    let result = gallery;
    if (viewMode === "feed") {
      if (categoryFilter !== "all") {
        result = result.filter(item => item.category.toLowerCase() === categoryFilter.toLowerCase());
      }
    } else if (viewMode === "albums") {
      if (selectedAlbumId) {
        result = result.filter(item => item.albumId === selectedAlbumId);
      } else {
        return [];
      }
    }
    return result;
  }, [gallery, viewMode, categoryFilter, selectedAlbumId]);

  // Current open lightbox item helper
  const lightboxItem = lightboxIndex !== null ? displayItems[lightboxIndex] : null;

  const navigateLightbox = (direction: "next" | "prev") => {
    if (lightboxIndex === null || displayItems.length <= 1) return;
    if (direction === "next") {
      setLightboxIndex((lightboxIndex + 1) % displayItems.length);
    } else {
      setLightboxIndex((lightboxIndex - 1 + displayItems.length) % displayItems.length);
    }
  };

  return (
    <div className="space-y-0 pt-0 pb-32 sm:pb-40 text-left scroll-fade-in relative w-full px-0">
      {/* 1. TOP NAV BAR: Glassmorphic rectangular tab on the left only accommodating the size of the 2 buttons, plus admin actions aligned on top corner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 select-none z-30">
        <div className="flex bg-[#0d0d10]/75 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl items-center gap-1 w-fit">
          <button
            onClick={() => {
              setViewMode("feed");
              setSelectedAlbumId(null);
              setIsInCoverLanding(false);
            }}
            className={`px-4 py-2 rounded-lg text-xs uppercase font-mono tracking-widest transition-all cursor-pointer ${
              viewMode === "feed" && !selectedAlbumId
                ? "bg-gavel-yellow text-black font-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => {
              setViewMode("albums");
              setSelectedAlbumId(null);
              setIsInCoverLanding(false);
            }}
            className={`px-4 py-2 rounded-lg text-xs uppercase font-mono tracking-widest transition-all cursor-pointer ${
              viewMode === "albums" || selectedAlbumId
                ? "bg-gavel-yellow text-black font-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Collections
          </button>
        </div>

        {profile?.role === "admin" && (
          <div className="flex items-center gap-2 select-none w-full sm:w-auto shrink-0">
            <button
              onClick={() => setAlbumCreateOpen(true)}
              className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 font-extrabold text-[10px] font-mono uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-center text-white"
            >
              <FolderClosed size={13} /> Create Album
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="px-4 py-2 rounded-xl bg-gavel-yellow border border-gavel-yellow text-black hover:bg-[#FFDE00] font-extrabold text-[10px] font-mono uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0"
            >
              <Plus size={13} /> Add Imagery
            </button>
          </div>
        )}
      </div>

      {/* 2. ALL IMAGES TAB CONTENT (Continuous borders system with zero margins and padding) */}
      {viewMode === "feed" && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 animate-pulse w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="border border-white/10 bg-white/[0.01] h-60 w-full" />
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-20 text-center border-t border-b border-dashed border-white/10 w-full">
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest font-bold">Archives Empty</p>
              <p className="text-xs text-gray-400 mt-2">No photographs recorded inside this gallery segment.</p>
            </div>
          ) : (
            /* PROFESSIONAL MOSAIC PEBBLE EFFECT - BORDERS ON IMAGES, NO MARGINS AND PADDING, JUST LAYOUT */
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-0 space-y-0 w-full">
              {displayItems.map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setLightboxIndex(idx);
                  }}
                  className="break-inside-avoid bg-black border border-white/10 p-0 hover:border-gavel-yellow/60 group transition-all duration-300 relative cursor-zoom-in overflow-hidden"
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.title || "Campus snap"} 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-101 transition-all duration-500 block" 
                  />
                  {/* Subtle hover detail block fading on background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end text-left">
                    <span className="text-[8px] font-mono font-bold text-gavel-yellow uppercase tracking-widest mb-1">{item.category || "CAMPUS LIFE"}</span>
                    <h3 className="text-xs font-extrabold text-white uppercase tracking-tight line-clamp-1">{item.title || "Campus Photograph"}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 3. COLLECTIONS ARCHIVE HUB */}
      {viewMode === "albums" && !selectedAlbumId && (
        <div className="w-full">
          {albumsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 animate-pulse w-full">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-56 bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className="py-20 text-center border-t border-b border-dashed border-white/10 w-full">
              <FolderClosed size={32} className="text-gray-500 mx-auto opacity-50 mb-3" />
              <p className="text-gray-500 text-xs font-mono uppercase tracking-widest font-bold">No collections yet</p>
              <p className="text-xs text-gray-400 mt-2">The administrators have not classified any photos into structured collection directories.</p>
            </div>
          ) : (
            /* CLOSELY LINED PHOTO COLLAGE FOR DIRECTORIES */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 w-full">
              {albums.map(album => {
                const albumPhotos = gallery.filter(item => item.albumId === album.id);
                const coverImage = albumPhotos.length > 0 ? albumPhotos[0].imageUrl : "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop";
                
                return (
                  <div
                    key={album.id}
                    onClick={() => {
                      setSelectedAlbumId(album.id);
                      setIsInCoverLanding(true);
                    }}
                    className="relative aspect-[4/3] w-full overflow-hidden cursor-pointer border border-white/10 group bg-black"
                  >
                    <img
                      src={coverImage}
                      alt={album.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-103 opacity-60"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/35 transition-all"></div>
                    <div className="relative z-10 text-center px-4 space-y-1 h-full flex flex-col justify-center items-center">
                      <h3 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider font-sans group-hover:text-gavel-yellow transition-all duration-300">
                        {album.name}
                      </h3>
                      <p className="text-[9px] font-mono tracking-widest text-white/70 uppercase">
                        {album.topic || "Collection"}
                      </p>
                      <p className="text-[8px] font-mono text-gavel-yellow uppercase tracking-widest pt-1.5">
                        {albumPhotos.length} IMAGES
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. COVER LANDING CONTAINER (Image 1 replica: clean, fullscreen, view gallery trigger) */}
      {viewMode === "albums" && selectedAlbumId && isInCoverLanding && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col justify-center items-center overflow-hidden animate-fade-in">
          {/* Faint elegant close back pointer */}
          <button
            onClick={() => {
              setSelectedAlbumId(null);
              setIsInCoverLanding(false);
            }}
            className="absolute top-6 left-6 z-50 px-4 py-2 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer bg-black/40 backdrop-blur"
          >
            <ChevronLeft size={14} /> Back to Collections
          </button>

          {(() => {
            const currentAlb = albums.find(a => a.id === selectedAlbumId);
            const albumPhotos = gallery.filter(item => item.albumId === selectedAlbumId);
            const coverImage = albumPhotos.length > 0 ? albumPhotos[0].imageUrl : "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop";
            
            return (
              currentAlb && (
                <>
                  {/* Immersive Background cover */}
                  <div className="absolute inset-0 select-none pointer-events-none">
                    <img
                      src={coverImage}
                      alt={currentAlb.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-25"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80"></div>
                  </div>

                  {/* Centered Cover typography & View Gallery action */}
                  <div className="relative z-10 text-center space-y-4 px-6 max-w-4xl select-none">
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-sans tracking-[0.1em] font-extrabold text-white uppercase leading-tight">
                      {currentAlb.name}
                    </h1>
                    {currentAlb.description && (
                      <p className="text-xs sm:text-sm font-mono tracking-widest text-[#FFDE00]/90 uppercase">
                        {currentAlb.description}
                      </p>
                    )}
                    <div className="pt-6">
                      <button
                        onClick={() => {
                          setIsInCoverLanding(false);
                          setLightboxIndex(0);
                        }}
                        className="px-8 py-3 bg-transparent border border-white hover:bg-white hover:text-black text-white font-mono text-xs uppercase tracking-[0.2em] transition-all duration-300 rounded cursor-pointer leading-none"
                      >
                        VIEW GALLERY
                      </button>
                    </div>
                  </div>

                  {/* Photographer / Bottom tag credit */}
                  <div className="absolute bottom-10 left-0 right-0 text-center select-none">
                    <p className="text-[9px] sm:text-[10px] font-mono tracking-[0.35em] text-white/50 uppercase leading-none">
                      {currentAlb.topic || "STUDENT LIFE ARCHIVES"}
                    </p>
                  </div>
                </>
              )
            );
          })()}
        </div>
      )}

      {/* 6. IMMERSIVE LIGHTBOX ACCUMULATION LAYER */}
      {lightboxIndex !== null && lightboxItem && (
        <LightboxOverlay
          lightboxItem={lightboxItem}
          lightboxIndex={lightboxIndex}
          displayItems={displayItems}
          albums={albums}
          onNavigate={navigateLightbox}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* 7. POPUP MODEL: CREATE FOLDER ALBUM */}
      {albumCreateOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-8 rounded-[2rem] premium-card backdrop-blur-3xl shadow-2xl relative border border-white/5 text-left bg-[#0c0c0e]">
            <button
              onClick={() => setAlbumCreateOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Create Archive Album</h2>
              <p className="text-gray-500 text-xs font-mono tracking-wide uppercase mt-1">Classify visual arrays by academic topic</p>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Album Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moot Court Finals 2026"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFDE00]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Topic / Subheading / Cover tag
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kady Kamah Photograph"
                  value={albumTopic}
                  onChange={(e) => setAlbumTopic(e.target.value)}
                  className="w-full bg-black/40 border border-[#FFDE00]/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Description / Subtitle
                </label>
                <textarea
                  placeholder="Provide context or date (e.g. SEPTEMBER 3RD, 2025)..."
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none h-24 resize-none focus:border-[#FFDE00]/40"
                />
              </div>

              <button
                type="submit"
                disabled={albumLoading}
                className="w-full bg-gavel-yellow hover:bg-[#FFDE00] text-black font-semibold text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all duration-300 mt-4 cursor-pointer font-bold"
              >
                {albumLoading ? "Establishing Album..." : "Establish Topic Album"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. POPUP MODEL: POST MULTIPLE IMAGE ASSETS */}
      {uploadOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-8 rounded-[2rem] premium-card backdrop-blur-3xl shadow-2xl relative border border-white/5 text-left bg-[#0c0c0e]">
            <button
              onClick={() => setUploadOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Post Campus Items</h2>
              <p className="text-gray-500 text-xs font-mono tracking-wide uppercase mt-1">Append photographs to the public shared log</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Base Image Title (Sequential tags will be added)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MKU Law Moot Selection Finalists"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFDE00]/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Brief story description
                </label>
                <textarea
                  placeholder="Outline the legal topics discussed, date, or event coordinates..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none h-24 resize-none focus:border-[#FFDE00]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                    Category Classification
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white uppercase font-mono tracking-wider focus:outline-none cursor-pointer"
                  >
                    <option value="campus">Campus life</option>
                    <option value="events">Events Commences</option>
                    <option value="social">Social arrays</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                    Assign to Album (Optional)
                  </label>
                  <select
                    value={uploadAlbumId}
                    onChange={(e) => setUploadAlbumId(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white uppercase font-mono tracking-wider focus:outline-none cursor-pointer"
                  >
                    <option value="">No Associated Album</option>
                    {albums.map(alb => (
                      <option key={alb.id} value={alb.id}>{alb.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                  Choose Photographs (Multi-file upload enabled)
                </label>
                <input
                  type="file"
                  required
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      const selectedFiles = Array.from(e.target.files);
                      setFiles(selectedFiles);
                    } else {
                      setFiles([]);
                    }
                  }}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-mono file:font-bold file:uppercase file:bg-gavel-yellow file:text-black hover:file:bg-white file:cursor-pointer cursor-pointer"
                />
                {files.length > 0 && (
                  <p className="text-[10px] font-mono text-gavel-yellow uppercase mt-2 font-bold tracking-wider">
                    {files.length} Photo{files.length > 1 ? "s" : ""} selected to upload
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full bg-gavel-yellow hover:bg-white text-black font-semibold text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all duration-300 mt-4 cursor-pointer font-bold"
              >
                {uploadLoading ? "Uploading to roll..." : "Upload Campus Artwork"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Elegant minimalist feedback toasts */}
      {toast && (
        <div className="fixed top-20 right-6 z-55 flex items-center gap-2 px-4 py-3 rounded-2xl border bg-[#0F0F0F]/90 backdrop-blur-xl shadow-2xl text-xs font-medium max-w-sm border-white/10 text-white animate-fade-in">
          <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}></div>
          <p className="flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-[10px] text-gray-400 hover:text-white ml-2">Dismiss</button>
        </div>
      )}
    </div>
  );
}
