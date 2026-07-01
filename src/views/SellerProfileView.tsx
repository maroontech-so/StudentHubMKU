import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { fbfs, auth, uploadToImgBB } from "../lib/firebase";
import { MarketplaceProfile, CatalogItem } from "../types";
import { 
  Store, 
  Plus, 
  Check, 
  Trash2, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Upload, 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Image as ImageIcon,
  Crown,
  X,
  Edit,
  Camera,
  Settings,
  AlertTriangle,
  ChevronRight,
  Star,
  LogOut
} from "lucide-react";

const PROMO_GRADIENTS = [
  { id: 0, name: "Yellow Gavel (Mockup Style)", classes: "from-[#FFDE00] to-[#ffae00] text-black", overlay: "bg-black/10 text-black", text: "text-black" },
  { id: 1, name: "Sunset Fire", classes: "from-amber-500 to-rose-600 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 2, name: "Cosmic Glow", classes: "from-indigo-900 via-purple-900 to-purple-800 text-white", overlay: "bg-black/35 text-white", text: "text-white" },
  { id: 3, name: "Emerald Cyber", classes: "from-emerald-600 via-teal-700 to-cyan-800 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 4, name: "Oceanic Wave", classes: "from-sky-400 to-blue-600 text-white", overlay: "bg-black/15 text-white", text: "text-white" },
  { id: 5, name: "Neon Violet", classes: "from-fuchsia-600 via-purple-700 to-pink-500 text-white", overlay: "bg-black/15 text-white", text: "text-white" },
  { id: 6, name: "Warm Amber", classes: "from-orange-400 via-amber-500 to-yellow-500 text-white", overlay: "bg-black/10 text-white", text: "text-white" },
  { id: 7, name: "Deep Crimson", classes: "from-red-700 to-neutral-900 text-white", overlay: "bg-black/30 text-white", text: "text-white" },
  { id: 8, name: "Dark Modern Gold", classes: "from-neutral-900 via-zinc-800 to-stone-900 text-white border-l-4 border-[#FFDE00]", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 9, name: "Berry Delight", classes: "from-pink-500 via-purple-500 to-indigo-500 text-white", overlay: "bg-black/20 text-white", text: "text-white" },
  { id: 10, name: "Royal Amethyst", classes: "from-violet-800 to-fuchsia-700 text-white", overlay: "bg-black/25 text-white", text: "text-white" }
];

export function SellerProfileView() {
  const { currentUser, profile, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<MarketplaceProfile | null>(null);

  // Core portfolio forms
  const [bizName, setBizName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState("Salon & Grooming");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [hours, setHours] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  // Start with 5 completely clean empty slots
  const [imageUrls, setImageUrls] = useState<string[]>(["", "", "", "", ""]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Catalogue list
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  // Modal active states
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editingCatalogIdx, setEditingCatalogIdx] = useState<number | null>(null); // null if closed, -1 if adding, index if editing
  const [isEditingPromo, setIsEditingPromo] = useState(false);

  // Temporary dialog state holders
  const [tempCatalogName, setTempCatalogName] = useState("");
  const [tempCatalogPrice, setTempCatalogPrice] = useState("");
  const [tempCatalogDesc, setTempCatalogDesc] = useState("");
  const [tempCatalogImageUrl, setTempCatalogImageUrl] = useState("");
  const [isUploadingCatalogImg, setIsUploadingCatalogImg] = useState(false);

  const [activePromoItemIdx, setActivePromoItemIdx] = useState(-1);
  const [tempPromoTag, setTempPromoTag] = useState("");
  const [tempPromoMessage, setTempPromoMessage] = useState("");
  const [tempPromoSupportive, setTempPromoSupportive] = useState("");
  const [tempPromoNoImage, setTempPromoNoImage] = useState(false);
  const [tempPromoSlot, setTempPromoSlot] = useState(0);
  const [tempPromoGradIdx, setTempPromoGradIdx] = useState(0);

  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Global toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProfileWorkspace = async () => {
    if (!auth.currentUser) {
      setLocation("/marketplace");
      return;
    }
    if (profile && profile.role === "admin") {
      setLocation("/marketplace");
      return;
    }
    
    try {
      setLoading(true);
      const list = await fbfs.getCollection<MarketplaceProfile>("marketplaceProfiles", [["uid", "==", auth.currentUser.uid]]);
      
      if (list.length > 0) {
        const p = list[0];
        setVendorProfile(p);
        
        setBizName(p.businessName || "");
        setOwnerName(p.ownerName || profile?.name || auth.currentUser.displayName || "Prince Micah");
        setCategory(p.category || "Salon & Grooming");
        setLocationText(p.location || "");
        setDescription(p.description || "");
        setContactEmail(p.contactEmail || auth.currentUser.email || "");
        setContactPhone(p.contactPhone || "");
        setWhatsappNumber(p.whatsappNumber || "");
        setHours(p.hours || "");
        setEmailNotificationsEnabled(p.emailNotificationsEnabled !== false);
        
        if (p.images && p.images.length > 0) {
          const filled = [...p.images];
          while (filled.length < 5) filled.push("");
          setImageUrls(filled);
        }
        if (p.catalog && p.catalog.length > 0) {
          setCatalogItems(p.catalog);
        }
      } else {
        // Preset values
        setBizName("");
        setOwnerName(profile?.name || auth.currentUser.displayName || "Prince Micah");
        setCategory("Salon & Grooming");
        setLocationText("");
        setDescription("");
        setContactPhone("");
        setWhatsappNumber("");
        setHours("Mon-Sat 8AM - 8PM");
        setContactEmail(auth.currentUser.email || "");
      }
    } catch (err) {
      console.error("Seller profile loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      if (profile.role === "admin") {
        setLocation("/marketplace");
        return;
      }
    }
    loadProfileWorkspace();
  }, [profile]);

  // Upload portfolio stream photos (Slots 1-5)
  const handleSlotImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIdx: number) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setUploadingIdx(slotIdx);
    try {
      const url = await uploadToImgBB(file);
      const updated = [...imageUrls];
      updated[slotIdx] = url;
      setImageUrls(updated);
      if (slotIdx === 0) {
        triggerToast("Business primary avatar assigned! This is the main image that appears in the marketplace. Deploy live by clicking 'Publish Profile Shifts'!", "success");
      } else {
         triggerToast(`Post Stream photo successfully assigned inside grid slot ${slotIdx + 1}!`);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to upload file.", "error");
    } finally {
      setUploadingIdx(null);
    }
  };

  const deleteSlotPhoto = (slotIdx: number) => {
    const updated = [...imageUrls];
    updated[slotIdx] = "";
    setImageUrls(updated);
    triggerToast(`Removed thumbnail inside slot ${slotIdx + 1}.`);
  };

  // Upload Catalog Item image inside modal editor
  const handleCatalogImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setIsUploadingCatalogImg(true);
    try {
      const url = await uploadToImgBB(file);
      setTempCatalogImageUrl(url);
      triggerToast("Catalogue item mock-up uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to upload catalogue asset.", "error");
    } finally {
      setIsUploadingCatalogImg(false);
    }
  };

  // Open modal for editing or adding catalogue highlights
  const openCatalogItemModal = (idx: number) => {
    if (idx === -1) {
      // Adding new Catalog item
      setTempCatalogName("");
      setTempCatalogPrice("");
      setTempCatalogDesc("");
      setTempCatalogImageUrl("");
      setEditingCatalogIdx(-1);
    } else {
      // Editing existing Catalog item
      const item = catalogItems[idx];
      setTempCatalogName(item.name || "");
      setTempCatalogPrice(item.price ? String(item.price) : "");
      setTempCatalogDesc(item.description || "");
      setTempCatalogImageUrl(item.imageUrl || "");
      setEditingCatalogIdx(idx);
    }
  };

  // Apply Changes for Catalogue Item modal state back into core list
  const applyCatalogItemShifts = () => {
    if (!tempCatalogName.trim() || !tempCatalogDesc.trim()) {
      triggerToast("Product Name and Offer description are required parameters.", "error");
      return;
    }

    const payload: CatalogItem = {
      name: tempCatalogName.trim(),
      description: tempCatalogDesc.trim(),
      price: tempCatalogPrice.trim() || "Check Price",
      imageUrl: tempCatalogImageUrl.trim(),
      isPromo: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].isPromo : false,
      promoTag: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].promoTag : "",
      promoMessage: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].promoMessage : "",
      supportiveMessage: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].supportiveMessage : "",
      noImage: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].noImage : false,
      promoImageSlot: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].promoImageSlot : 0,
      gradientIndex: editingCatalogIdx !== null && editingCatalogIdx >= 0 ? catalogItems[editingCatalogIdx].gradientIndex : 0,
    };

    if (editingCatalogIdx === -1) {
      // Create new
      setCatalogItems([...catalogItems, payload]);
      triggerToast(`Option "${tempCatalogName}" introduced onto catalog Highlights!`);
    } else if (editingCatalogIdx !== null && editingCatalogIdx >= 0) {
      // Save existing
      const updated = [...catalogItems];
      updated[editingCatalogIdx] = payload;
      setCatalogItems(updated);
      triggerToast(`Option "${tempCatalogName}" modified inside database.`);
    }

    setEditingCatalogIdx(null);
  };

  // Remove specific catalogue item
  const deleteCatalogItem = (idx: number) => {
    const updated = catalogItems.filter((_, i) => i !== idx);
    setCatalogItems(updated);
    triggerToast("Removed choice option from highlights reel.");
  };

  // Open Promo Campaign Editor Page
  const openPromotionModal = () => {
    const promoIdx = catalogItems.findIndex(i => !!i.isPromo);
    setActivePromoItemIdx(promoIdx);

    if (promoIdx !== -1) {
      const activeP = catalogItems[promoIdx];
      setTempPromoTag(activeP.promoTag || "#PROMO");
      setTempPromoMessage(activeP.promoMessage || "SPECIAL PRICE THIS WEEK");
      setTempPromoSupportive(activeP.supportiveMessage || "Come claim yours today; premium quality is guaranteed!");
      setTempPromoNoImage(activeP.noImage || false);
      setTempPromoSlot(activeP.promoImageSlot || 0);
      setTempPromoGradIdx(activeP.gradientIndex || 0);
    } else {
      setTempPromoTag("#PROMO");
      setTempPromoMessage("SPECIAL PRICE THIS WEEK");
      setTempPromoSupportive("Come claim yours today; premium quality is guaranteed!");
      setTempPromoNoImage(false);
      setTempPromoSlot(0);
      setTempPromoGradIdx(0);
    }

    setIsEditingPromo(true);
  };

  // Save Promotion Options inside modal back to specific catalog index
  const applyPromoCampaignShifts = () => {
    if (activePromoItemIdx === -1) {
      // Clear out all isPromo attributes in Catalog
      const cleared = catalogItems.map(item => ({ ...item, isPromo: false }));
      setCatalogItems(cleared);
      triggerToast("Inactive promotional campaigns.");
    } else {
      // Set chosen one as promoted, and save other parameters of promotion
      const updated = catalogItems.map((item, i) => {
        if (i === activePromoItemIdx) {
          return {
            ...item,
            isPromo: true,
            promoTag: tempPromoTag.trim() || "#PROMO",
            promoMessage: tempPromoMessage.trim() || "SPECIAL OFFER ACTIVE",
            supportiveMessage: tempPromoSupportive.trim() || "Grab this custom deal at our store today!",
            noImage: tempPromoNoImage,
            promoImageSlot: tempPromoSlot,
            gradientIndex: tempPromoGradIdx
          };
        }
        return { ...item, isPromo: false };
      });
      setCatalogItems(updated);
      triggerToast("Active promotional campaign loaded!");
    }

    setIsEditingPromo(null as any);
  };

  // Publish changes to Firebase Cloud database
  const handlePublishAllPortfolioChanges = async () => {
    if (!auth.currentUser) return;

    if (!bizName.trim() || !ownerName.trim() || !locationText.trim() || !description.trim()) {
      triggerToast("Business name, Proprietor name, Location text, and Business Bio are required variables.", "error");
      return;
    }

    const validImages = imageUrls.filter(url => url.trim() !== "");
    if (validImages.length === 0) {
      triggerToast("Your corporate portfolio requires at least 1 image uploaded inside the Stream!", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<MarketplaceProfile> = {
        uid: auth.currentUser.uid,
        ownerName: ownerName.trim(),
        businessName: bizName.trim(),
        category: category,
        location: locationText.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsappNumber: whatsappNumber.trim().replace(/\+/g, ""), 
        hours: hours.trim(),
        images: validImages,
        catalog: catalogItems,
        emailNotificationsEnabled: emailNotificationsEnabled,
        updatedAt: Date.now()
      };

      if (vendorProfile?.id) {
        await fbfs.updateDocById("marketplaceProfiles", vendorProfile.id, payload);
      } else {
        const freshPayload: MarketplaceProfile = {
          id: `portfolio_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          createdAt: Date.now(),
          ratings: [],
          overallRating: 5.0,
          ...payload
        } as MarketplaceProfile;
        
        await fbfs.setDocById("marketplaceProfiles", freshPayload.id, freshPayload);
        setVendorProfile(freshPayload);
      }

      triggerToast("Successfully published corporate updates to MKU Student database!");
      setLocation("/marketplace");
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to publish workspace changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const validPhotos = imageUrls.filter(u => u.trim() !== "");

  return (
    <div className="space-y-6 pt-6 pb-36 sm:pt-8 sm:pb-44 text-left w-full px-4 sm:px-6 select-none font-sans">
      
      {/* Back button */}
      <Link href="/marketplace">
        <span className="inline-flex items-center gap-2 text-gavel-muted hover:text-white text-[10px] font-mono uppercase tracking-widest font-black cursor-pointer transition-colors duration-200">
          <ArrowLeft size={11} /> Cancel & Return To Marketplace
        </span>
      </Link>

      {/* Loading state indicator */}
      {loading ? (
        <div className="w-full space-y-4 py-16 animate-pulse text-center">
          <div className="mx-auto w-10 h-10 border-4 border-gavel-yellow border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] text-gavel-muted font-mono uppercase tracking-widest">Syncing Portfolio Workspace...</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* MAIN INSTAGRAM SCREEN METAPHOR FOR MERCHANTS ACCOUNT */}
          <div className="border border-gavel-border/80 rounded-[2rem] bg-[#0c0c0e] p-6 sm:p-8 space-y-8 relative shadow-2xl">
            
            {/* Header tab banner */}
            <div className="flex items-center justify-between border-b border-gavel-border/30 pb-4">
              <span className="text-[9px] font-mono font-bold text-gavel-muted uppercase tracking-widest flex items-center gap-1.5">
                <Settings size={12} className="text-gavel-yellow" /> Interactive Portfolio Dashboard
              </span>
              <span className="text-[8px] font-mono font-bold text-gavel-yellow tracking-widest uppercase">
                Owner Mode Active
              </span>
            </div>

            {/* Instagram Style Profile Header Card */}
            <div className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                
                {/* 1. IG STORY RING WITH BRAND LOGO */}
                <div className="sm:col-span-3 flex justify-center text-center">
                  <input 
                    type="file"
                    ref={avatarInputRef}
                    onChange={(e) => handleSlotImageUpload(e, 0)}
                    accept="image/*"
                    className="hidden"
                  />
                  <div 
                    onClick={() => avatarInputRef.current?.click()}
                    className="relative shrink-0 group cursor-pointer"
                    title="Click profile photo to change Business Avatar"
                  >
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3.5px] bg-gradient-to-tr from-[#FFDE00] via-pink-500 to-purple-600 animate-pulse-subtle">
                      <div className="w-full h-full rounded-full bg-black p-[2.5px] relative overflow-hidden">
                        {validPhotos.length > 0 ? (
                          <>
                            <img 
                              src={validPhotos[0]} 
                              alt={bizName || "Service"}
                              referrerPolicy="no-referrer"
                              className="w-full h-full rounded-full object-cover group-hover:scale-105 duration-300 transition-all"
                            />
                            {/* Hover overlay indicater */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-center p-1 rounded-full">
                              <Upload size={14} className="text-gavel-yellow" />
                              <span className="text-[7.5px] font-mono text-white/95 font-black uppercase tracking-wider mt-1">Upload Photo</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex flex-col items-center justify-center text-center">
                            <Store size={22} className="text-gavel-muted/40 mb-1" />
                            <span className="text-[9px] font-mono text-gavel-yellow font-black uppercase">Click To upload</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Floating camera icon indicating direct avatar modification */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        avatarInputRef.current?.click();
                      }}
                      className="absolute bottom-1 right-1 bg-gavel-yellow hover:bg-[#FFDE00] p-1.5 rounded-full border border-black text-black cursor-pointer shadow-md transition-transform hover:scale-105 z-10 animate-bounce"
                      title="Click to update Marketplace Avatar"
                    >
                      <Camera size={11} className="stroke-[3]" />
                    </div>
                  </div>
                </div>

                {/* 2. STATS VALUES & BRAND ACTION ROW */}
                <div className="sm:col-span-9 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-start sm:justify-start">
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-none text-center sm:text-left">
                      @{bizName ? bizName.toLowerCase().replace(/[^a-z0-9]/g, "") : "untitledtrader"}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span className="px-2.5 py-0.5 rounded-full border border-[#FFDE00]/30 bg-[#FFDE00]/10 text-[#FFDE00] text-[8px] font-mono uppercase font-black tracking-widest">
                        {category}
                      </span>
                    </div>
                  </div>

                  {/* Standard Instagram layout stats bar */}
                  <div className="flex justify-around sm:justify-start gap-8 md:gap-14 text-center sm:text-left py-2 border-t border-b border-gavel-border/20">
                    <div>
                      <span className="block text-sm md:text-md font-black text-white leading-none">
                        {validPhotos.length}
                      </span>
                      <span className="text-[8px] text-gavel-muted font-mono uppercase tracking-wider font-bold">posts</span>
                    </div>
                    <div>
                      <span className="block text-sm md:text-md font-black text-white leading-none">
                        {vendorProfile?.ratings ? vendorProfile.ratings.length : 0}
                      </span>
                      <span className="text-[8px] text-gavel-muted font-mono uppercase tracking-wider font-bold">reviews</span>
                    </div>
                    <div>
                      <span className="block text-sm md:text-md font-black text-[#FFDE00] leading-none flex items-center justify-center sm:justify-start gap-0.5">
                        {vendorProfile?.overallRating ? vendorProfile.overallRating.toFixed(1) : "5.0"} <Star size={9} className="fill-gavel-yellow text-gavel-yellow" />
                      </span>
                      <span className="text-[8px] text-gavel-muted font-mono uppercase tracking-wider font-bold">satisfaction</span>
                    </div>
                  </div>

                  {/* Direct visual controllers instead of form fields */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingBrand(true)}
                      className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gavel-border hover:border-white text-gavel-muted hover:text-white bg-white/[0.01] hover:bg-white/[0.04] font-extrabold text-[9px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      <Edit size={10} /> Edit Brand Info
                    </button>
                    <button
                      onClick={() => openCatalogItemModal(-1)}
                      className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gavel-yellow hover:bg-[#FFDE00] text-black font-extrabold text-[9px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      <Plus size={10} /> Add Catalogue Highlight
                    </button>
                    <button
                      onClick={openPromotionModal}
                      className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-purple-500/30 hover:border-purple-500 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white font-extrabold text-[9px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
                    >
                      <Sparkles size={10} /> Campaign Studio
                    </button>
                  </div>

                </div>
              </div>

              {/* Bio & Information Section */}
              <div className="space-y-1.5 text-left pt-2 border-t border-gavel-border/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight uppercase">
                    {bizName || "No Business Name Configured"}
                  </h3>
                  {ownerName && (
                    <span className="text-[8.5px] font-mono text-gavel-yellow font-black uppercase tracking-wider leading-none">
                      Proprietor: {ownerName}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gavel-muted font-sans font-medium leading-relaxed whitespace-pre-wrap max-w-3xl">
                  {description || "Click 'Edit Brand Info' above to describe what products you sell, your target department, or print options."}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 text-[9px] font-mono text-gavel-muted font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-gavel-yellow" /> Location: {locationText || "Unlisted Location"}
                  </span>
                  {hours && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-[#FFDE00]" /> Info Hours: {hours}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Catalog Highlight Spheres representing active menu Highlights (IG Highlights design) */}
            <div className="py-2 space-y-3.5 text-left border-t border-gavel-border/20 pt-6">
              <div className="flex items-center justify-between border-b border-gavel-border/20 pb-2">
                <h4 className="text-[9px] font-mono text-gavel-muted uppercase tracking-widest font-black flex items-center gap-1.5">
                  <Crown size={12} className="text-[#FFDE00]" /> Highlighted Catalogues Reel
                </h4>
                <button
                  onClick={() => openCatalogItemModal(-1)}
                  className="text-[8px] font-mono text-[#FFDE00] hover:text-white font-bold uppercase transition-all flex items-center gap-1"
                >
                  [+ Add Option]
                </button>
              </div>
              
              <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-thin select-none">
                
                {/* Empty draft placeholder trigger */}
                <div 
                  onClick={() => openCatalogItemModal(-1)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full border border-dashed border-gavel-border bg-neutral-900/40 flex items-center justify-center group-hover:border-gavel-yellow/60 transition-all">
                    <Plus size={16} className="text-gavel-muted" />
                  </div>
                  <span className="text-[8.5px] font-sans text-gavel-muted font-bold tracking-tight">Create Option</span>
                </div>

                {catalogItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0 group relative">
                    
                    {/* Story ring */}
                    <div 
                      onClick={() => openCatalogItemModal(idx)}
                      className={`w-14 h-14 rounded-full p-[2px] border flex items-center justify-center cursor-pointer transition-all bg-black ${item.isPromo ? "border-purple-500" : "border-gavel-border hover:border-[#FFDE00]/70"}`}
                    >
                      <div className="w-full h-full rounded-full bg-[#111] overflow-hidden flex items-center justify-center relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <p className="text-[7.5px] font-mono text-gavel-yellow font-black truncate max-w-[40px]">
                            {item.price || "Deal"}
                          </p>
                        )}

                        {item.isPromo && (
                          <div className="absolute top-0 inset-x-0 bg-purple-500/80 text-[6px] font-mono uppercase text-white font-bold py-[1px] text-center">
                            Promo
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[8.5px] font-sans text-gavel-muted group-hover:text-white transition-colors uppercase font-black text-center truncate max-w-[65px] leading-none">
                      {item.name}
                    </span>

                    {/* Trash badge to remove option option instantly */}
                    <button
                      onClick={() => deleteCatalogItem(idx)}
                      className="absolute -top-1 -right-1 p-1 bg-black border border-gavel-border hover:border-gavel-danger hover:text-white text-gavel-muted rounded-full transition-all cursor-pointer z-10 scale-75 group"
                    >
                      <Trash2 size={9} className="group-hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Square visual Feed Stream (Portfolio images uploader) */}
            <div className="space-y-4 text-left border-t border-gavel-border/20 pt-6">
              <h4 className="text-[9px] font-mono text-gavel-muted uppercase tracking-widest font-black block border-b border-gavel-border/20 pb-2">
                Brand Stream Portfolio Grid (Post Stream)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const currentPhoto = imageUrls[idx] || "";

                  return (
                    <div 
                      key={idx}
                      className="aspect-square rounded-2xl overflow-hidden border border-gavel-border/50 bg-[#111114] relative group transition-all hover:border-[#FFDE00]"
                    >
                      {currentPhoto ? (
                        <>
                          <img 
                            src={currentPhoto} 
                            alt={`Post ${idx + 1}`} 
                            referrerPolicy="no-referrer" 
                            className="w-full h-full object-cover" 
                          />
                          
                          {/* Hover action overlay to delete or upload alternative URL */}
                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                            <span className="text-[8px] font-mono text-gavel-yellow font-black">SLOT #{idx + 1}</span>
                            
                            <button
                              onClick={() => deleteSlotPhoto(idx)}
                              className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-red-950/80 border border-red-500/30 hover:border-red-500 rounded-lg text-[8px] font-mono uppercase text-red-100 font-bold w-full transition-all cursor-pointer"
                            >
                              <Trash2 size={10} /> Delete Photo
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3.5 bg-neutral-950/40">
                          {uploadingIdx === idx ? (
                            <span className="w-5 h-5 rounded-full border-2 border-gavel-yellow border-t-transparent animate-spin"></span>
                          ) : (
                            <>
                              <ImageIcon size={18} className="text-gavel-muted/40 mb-1.5" />
                              <span className="text-[7.5px] font-mono text-gavel-muted uppercase tracking-wider font-bold mb-2">Slot #{idx + 1} Empty</span>
                              
                              <label className="text-[8.5px] font-mono uppercase bg-white/5 hover:bg-gavel-yellow hover:text-black cursor-pointer px-2 py-1 border border-white/5 hover:border-gavel-yellow rounded transition-all flex items-center gap-1">
                                <Upload size={9} /> Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleSlotImageUpload(e, idx)}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-white/[0.01] border border-gavel-border/40 rounded-xl flex items-center gap-2">
                <AlertTriangle size={12} className="text-gavel-yellow/80 shrink-0" />
                <p className="text-[9.5px] font-sans text-gavel-muted leading-relaxed font-semibold">
                  ⚠️ Note: To prevent external mock-photo leakage, your portfolio requires at least <strong>1 image upload snapshot</strong> active in Slot 1. No dead links are referenced.
                </p>
              </div>
            </div>

          </div>

          {/* ACTIVE PROMOTION BANNER MOCKUP CAMPAIGN CAROUSEL DISPLAY FOR THE TRADER */}
          {(() => {
            const activePromoIdx = catalogItems.findIndex(item => !!item.isPromo);
            if (activePromoIdx !== -1) {
              const activePromo = catalogItems[activePromoIdx];
              const grad = PROMO_GRADIENTS[activePromo.gradientIndex || 0] || PROMO_GRADIENTS[0];
              const previewCoverImg = imageUrls[activePromo.promoImageSlot || 0] || "";

              return (
                <div className="space-y-3">
                  <h4 className="text-[9px] font-mono text-gavel-yellow uppercase tracking-widest font-black flex items-center gap-1">
                    <Sparkles size={11} /> Running Promotion Campaign Live Preview
                  </h4>

                  <div className={`rounded-3xl w-full p-6 relative overflow-hidden bg-gradient-to-r flex flex-col justify-end text-left select-none border border-gavel-border/50 min-h-[170px] ${grad.classes}`}>
                    
                    {/* Background seamless mask */}
                    {!activePromo.noImage && previewCoverImg && (
                      <>
                        <div className="absolute right-0 top-0 bottom-0 w-[48%] h-full z-0">
                          <img 
                            src={previewCoverImg} 
                            alt="Mock Design" 
                            className="w-full h-full object-cover opacity-85 mix-blend-luminosity"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute inset-y-0 right-[40%] w-16 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none z-[1]"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent pointer-events-none z-[1]"></div>
                      </>
                    )}

                    <div className="relative z-10 space-y-1.5 text-left text-white max-w-lg">
                      <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-[#FFDE00] block">
                        {activePromo.promoTag || "#PROMO"} • SPECIAL ANNOUNCEMENT
                      </span>
                      <h4 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-none text-white font-mono">
                        {activePromo.promoMessage || "SPECIAL DISCOUNT"}
                      </h4>
                      <p className="text-[10px] font-semibold text-gray-200 leading-relaxed">
                        {activePromo.supportiveMessage || "Come try our student friendly rates at the studio today!"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Corporate Badge Header block moved to bottom */}
          <section className="relative rounded-2xl overflow-hidden border border-gavel-border bg-gavel-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md bg-white/[0.005] mt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none font-mono">
                  Workspace Profile Manager
                </h1>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[#FFDE00] text-[8px] font-mono uppercase font-black tracking-wider">
                  Live Creator
                </span>
              </div>
              <p className="text-gavel-muted text-xs font-medium">
                Fine-tune student portfolios through high fidelity design layouts. Update pictures, change catalog listings, and schedule pop promotions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0 font-sans">
              <button
                onClick={handlePublishAllPortfolioChanges}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gavel-yellow hover:bg-[#FFDE00] text-black font-extrabold text-[10px] sm:text-xs font-mono uppercase tracking-widest transition-all duration-300 shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer text-center w-full sm:w-auto justify-center"
              >
                {saving ? "Deploying..." : "Publish Profile Shifts"}
              </button>
              
              <button
                onClick={logout}
                className="px-6 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-600 hover:text-white border border-red-500/20 hover:border-red-500 text-red-400 font-extrabold text-[10px] sm:text-xs font-mono uppercase tracking-widest transition-all duration-300 shadow-md flex items-center gap-2 cursor-pointer text-center w-full sm:w-auto justify-center"
              >
                <LogOut size={12} /> Log Out
              </button>
            </div>
          </section>

        </div>
      )}

      {/* ==================== DIALOG 1: INTERACTIVE BRAND IDENTITY SYSTEM WRITER ==================== */}
      {isEditingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0e0e11] border border-gavel-border p-6 rounded-3xl relative text-left space-y-5">
            
            <button
              onClick={() => setIsEditingBrand(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gavel-muted hover:text-white bg-white/5 cursor-pointer hover:bg-white/10"
            >
              <X size={15} />
            </button>

            <div className="border-b border-gavel-border/30 pb-3">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <Store size={15} className="text-gavel-yellow" /> General Brand Particulars
              </h3>
            </div>

             <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laser Cuts Barber"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Proprietor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prince Micah"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Market Classification *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-2 py-2 text-[10.5px] text-white focus:outline-none focus:border-gavel-yellow/30 font-mono uppercase font-black"
                  >
                    <option value="Salon & Grooming">Salon & Grooming</option>
                    <option value="Apparel & Fashion">Apparel & Fashion</option>
                    <option value="Books & Stationeries">Books & Stationeries</option>
                    <option value="Electronics & Tech">Electronics & Tech</option>
                    <option value="Wholesale & Groceries">Wholesale & Groceries</option>
                    <option value="Beauty & Therapy">Beauty & Therapy</option>
                    <option value="Food & Catering">Food & Catering</option>
                    <option value="Baking & Cakes">Baking & Cakes</option>
                    <option value="Photography & Media">Photography & Media</option>
                    <option value="Academic Services">Academic Services</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Camp Location Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Law Block gate Ground Floor"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Phone Connection *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +254712345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">WhatsApp Line *</label>
                  <input
                    type="text"
                    required
                    placeholder="254712345678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Operational Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily 8AM - 8PM"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Direct Email</label>
                  <input
                    type="email"
                    placeholder="Direct email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 font-sans"
                  />
                </div>
              </div>

              {/* Lead Generation Email Toggle alerts */}
              <div className="p-3 bg-zinc-900/50 border border-gavel-border/50 rounded-xl flex items-center justify-between">
                <div className="text-left">
                  <p className="text-white font-bold text-xs">Profile View Alerting</p>
                  <p className="text-[9px] text-gavel-muted font-mono uppercase tracking-wide">Receive instant emails when buyers discover your brand</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gavel-yellow"></div>
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Brand Corporate Biography *</label>
                <textarea
                  required
                  placeholder="Describe your unique selling proposition, print speeds, custom tailoring options..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black border border-gavel-border/80 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-gavel-yellow/30 resize-none h-24 font-sans"
                />
              </div>
            </div>

            <button
              onClick={() => setIsEditingBrand(false)}
              className="w-full py-2.5 rounded-xl bg-gavel-yellow hover:bg-[#FFDE00] text-black font-extrabold text-[10px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
            >
              Verify & Apply Brand Changes
            </button>
          </div>
        </div>
      )}

      {/* ==================== DIALOG 2: DEDICATED CATALOG OPTION BUILDER ==================== */}
      {editingCatalogIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-[#0e0e11] border border-gavel-border p-6 rounded-3xl relative text-left space-y-5">
            
            <button
              onClick={() => setEditingCatalogIdx(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gavel-muted hover:text-white bg-white/5 cursor-pointer hover:bg-white/10"
            >
              <X size={15} />
            </button>

            <div className="border-b border-gavel-border/30 pb-3">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <Crown size={15} className="text-gavel-yellow" /> {editingCatalogIdx === -1 ? "Create Custom Catalogue Offer" : "Refactor Catalogue Offer"}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Product / Service Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Classic Shave + Dye"
                    value={tempCatalogName}
                    onChange={(e) => setTempCatalogName(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Price Tier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KSh 250"
                    value={tempCatalogPrice}
                    onChange={(e) => setTempCatalogPrice(e.target.value)}
                    className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Description Slogan *</label>
                <input
                  type="text"
                  required
                  placeholder="Summarise options included, size guides, print bindings..."
                  value={tempCatalogDesc}
                  onChange={(e) => setTempCatalogDesc(e.target.value)}
                  className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Secure custom image block to comply with CATALOGUE HAS IMAGE statement */}
              <div className="p-4 rounded-2xl border border-white/5 bg-black/40 space-y-3">
                <span className="text-[8.5px] font-mono text-gavel-yellow font-black uppercase tracking-wider block">Product Showcase Image Asset (Required)</span>
                
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border border-gavel-border overflow-hidden bg-neutral-900 shrink-0 relative flex items-center justify-center">
                    {tempCatalogImageUrl ? (
                      <img src={tempCatalogImageUrl} alt="Catalog Upload Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon size={18} className="text-gavel-muted" />
                    )}
                    {isUploadingCatalogImg && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <span className="w-3.5 h-3.5 border-2 border-gavel-yellow border-t-transparent animate-spin rounded-full"></span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] font-mono uppercase bg-white/5 hover:bg-gavel-yellow hover:text-black cursor-pointer px-3 py-1.5 border border-white/10 rounded-lg inline-flex items-center gap-1 duration-200 transition-colors">
                      <Upload size={10} /> Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCatalogImageUpload}
                      />
                    </label>

                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={applyCatalogItemShifts}
              className="w-full py-2.5 rounded-xl bg-gavel-yellow hover:bg-[#FFDE00] text-black font-extrabold text-[10px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
            >
              Verify & Inject Catalogue Highlight
            </button>
          </div>
        </div>
      )}

      {/* ==================== DIALOG 3: INTERACTIVE DEDICATED PROMOTION STUDIO ==================== */}
      {isEditingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0e0e11] border border-gavel-border p-6 rounded-3xl relative text-left space-y-5">
            
            <button
              onClick={() => setIsEditingPromo(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-gavel-muted hover:text-white bg-white/5 cursor-pointer hover:bg-white/10"
            >
              <X size={15} />
            </button>

            <div className="border-b border-gavel-border/30 pb-3">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={15} className="text-gavel-yellow animate-pulse" /> Campaign Promo Poster Studio
              </h3>
            </div>

            <div className="space-y-4">
              
              <div>
                <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Select Offer Option To Advertise *</label>
                <select
                  value={activePromoItemIdx}
                  onChange={(e) => setActivePromoItemIdx(parseInt(e.target.value))}
                  className="w-full bg-black border border-gavel-border/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono uppercase font-black"
                >
                  <option value="-1">-- DE-ACTIVATE PROMOTION (Clean Top Space) --</option>
                  {catalogItems.map((item, idx) => (
                    <option key={idx} value={idx}>
                      Option #{idx + 1}: {item.name || "(untitled)"} [{item.price || "Deal"}]
                    </option>
                  ))}
                </select>
              </div>

              {activePromoItemIdx !== -1 && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Headline Promo Badge (e.g. #MEGAOFFER)</label>
                      <input
                        type="text"
                        placeholder="e.g. #HALFPRICE"
                        value={tempPromoTag}
                        onChange={(e) => {
                          const val = e.target.value.startsWith('#') || e.target.value === "" ? e.target.value : `#${e.target.value}`;
                          setTempPromoTag(val);
                        }}
                        className="w-full bg-black border border-gavel-border/85 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Slogan Hook / Discount Slogan</label>
                      <input
                        type="text"
                        placeholder="e.g. 50% OFF FOR EVERYONE"
                        value={tempPromoMessage}
                        onChange={(e) => setTempPromoMessage(e.target.value)}
                        className="w-full bg-black border border-gavel-border/85 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Supportive Tagline / Supportive pitch line</label>
                    <input
                      type="text"
                      placeholder="e.g. Head over to our print station next to the Law gate ground floor!"
                      value={tempPromoSupportive}
                      onChange={(e) => setTempPromoSupportive(e.target.value)}
                      className="w-full bg-black border border-gavel-border/85 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-1 font-bold">Asset Presentation Backdrop</label>
                      <select
                        value={tempPromoNoImage ? "gradient" : "image"}
                        onChange={(e) => setTempPromoNoImage(e.target.value === "gradient")}
                        className="w-full bg-black border border-gavel-border/85 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="image">Showcase Selected Asset image over Blend</option>
                        <option value="gradient">Gradient Only presentation (No Graphic)</option>
                      </select>
                    </div>

                    {!tempPromoNoImage && (
                      <div>
                        <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-2 font-bold">Chosen Image Source capture</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {imageUrls.map((url, imgIdx) => {
                            const isSelected = tempPromoSlot === imgIdx;
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => setTempPromoSlot(imgIdx)}
                                className={`group relative aspect-square rounded-lg overflow-hidden border flex flex-col items-center justify-center transition-all cursor-pointer ${
                                  isSelected 
                                    ? "ring-2 ring-gavel-yellow ring-offset-2 ring-offset-[#0e0e11] border-transparent" 
                                    : "border-white/5 bg-zinc-950 hover:border-white/20"
                                }`}
                                title={`Select Photo Slot #${imgIdx + 1}`}
                              >
                                {url ? (
                                  <img 
                                    src={url} 
                                    alt={`Slot ${imgIdx + 1}`} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-[7px] font-mono font-bold text-gavel-muted text-center p-0.5">
                                    <span>Slot</span>
                                    <span>#{imgIdx + 1}</span>
                                  </div>
                                )}
                                <div className="absolute top-0.5 right-0.5 px-0.5 rounded bg-black/60 text-[6px] font-bold text-white uppercase tracking-tighter">
                                  #{imgIdx + 1}
                                </div>
                                {isSelected && (
                                  <div className="absolute inset-0 bg-gavel-yellow/20 flex items-center justify-center">
                                    <div className="bg-gavel-yellow text-black rounded-full p-0.5">
                                      <Check size={8} strokeWidth={4} />
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-gavel-muted uppercase mb-2 font-bold">Select Premium Backdrop Color Gradient Preset</label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 pb-1">
                      {PROMO_GRADIENTS.map((g) => {
                        const isSelected = tempPromoGradIdx === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setTempPromoGradIdx(g.id)}
                            className={`relative h-12 rounded-xl bg-gradient-to-r ${g.classes} flex flex-col justify-end p-1.5 transition-all text-left overflow-hidden border cursor-pointer ${
                              isSelected 
                                ? "ring-2 ring-gavel-yellow ring-offset-2 ring-offset-[#0e0e11] border-transparent scale-102" 
                                : "border-white/5 hover:border-white/20"
                            }`}
                          >
                            <span className="text-[7.5px] font-bold tracking-tight uppercase leading-none truncate w-full no-recolor drop-shadow-sm self-end">
                              {g.name}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-gavel-yellow text-black rounded-full flex items-center justify-center text-[8px] font-black shadow-md border border-black/10">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={applyPromoCampaignShifts}
              className="w-full py-2.5 rounded-xl bg-gavel-yellow hover:bg-[#FFDE00] text-black font-extrabold text-[10px] font-mono uppercase tracking-widest text-center transition-all cursor-pointer"
            >
              Verify & Inject Promo Campaign Settings
            </button>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM ACCORDING TO GUIDELINES */}
      {toast && (
        <div className="fixed top-20 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl border bg-[#0F0F0F]/90 backdrop-blur-xl shadow-2xl text-xs font-semibold max-w-sm border-gavel-border text-white animate-fade-in">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <p className="flex-1">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="text-[10px] text-gavel-muted hover:text-white ml-2">Dismiss</button>
        </div>
      )}

    </div>
  );
}
