import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { fbfs, auth, uploadToImgBB } from "../lib/firebase";
import { MarketplaceProfile, CatalogItem } from "../types";
import {
  Store,
  Plus,
  Trash2,
  ArrowLeft,
  Upload,
  MapPin,
  Phone,
  Image as ImageIcon,
  Camera,
  Settings,
  X,
  Check,
  Sparkles,
  AlertTriangle,
  Star,
  LogOut,
  ChevronRight,
  Palette,
} from "lucide-react";

/* =========================================================
   GRADIENT PRESETS (mirrors MarketplaceView for consistency)
========================================================= */

const GRADIENT_PRESETS = [
  {
    id: 0,
    name: "Yellow",
    css: "linear-gradient(100deg, #FFDE00 0%, #ffae00 100%)",
    text: "#111111",
  },
  {
    id: 1,
    name: "Sunset",
    css: "linear-gradient(100deg, #f59e0b 0%, #e11d48 100%)",
    text: "#ffffff",
  },
  {
    id: 2,
    name: "Cosmic",
    css: "linear-gradient(100deg, #312e81 0%, #6b21a8 60%, #7e22ce 100%)",
    text: "#ffffff",
  },
  {
    id: 3,
    name: "Emerald",
    css: "linear-gradient(100deg, #059669 0%, #0f766e 50%, #155e75 100%)",
    text: "#ffffff",
  },
  {
    id: 4,
    name: "Oceanic",
    css: "linear-gradient(100deg, #38bdf8 0%, #2563eb 100%)",
    text: "#ffffff",
  },
  {
    id: 5,
    name: "Neon",
    css: "linear-gradient(100deg, #db2777 0%, #9333ea 50%, #ec4899 100%)",
    text: "#ffffff",
  },
  {
    id: 6,
    name: "Amber",
    css: "linear-gradient(100deg, #fb923c 0%, #f59e0b 50%, #eab308 100%)",
    text: "#ffffff",
  },
  {
    id: 7,
    name: "Crimson",
    css: "linear-gradient(100deg, #b91c1c 0%, #171717 100%)",
    text: "#ffffff",
  },
  {
    id: 8,
    name: "Midnight",
    css: "linear-gradient(100deg, #171717 0%, #27272a 50%, #1c1917 100%)",
    text: "#ffffff",
  },
  {
    id: 9,
    name: "Berry",
    css: "linear-gradient(100deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
    text: "#ffffff",
  },
  {
    id: 10,
    name: "Amethyst",
    css: "linear-gradient(100deg, #6d28d9 0%, #a21caf 100%)",
    text: "#ffffff",
  },
];

const CATEGORIES = [
  "Salon & Grooming",
  "Apparel & Fashion",
  "Books & Stationeries",
  "Electronics & Tech",
  "Wholesale & Groceries",
  "Beauty & Therapy",
  "Food & Catering",
  "Baking & Cakes",
  "Photography & Media",
  "Academic Services",
  "Others",
];

/* =========================================================
   COMPONENT
========================================================= */

export function SellerProfileView() {
  const { currentUser, profile, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<MarketplaceProfile | null>(
    null,
  );

  // Brand info
  const [bizName, setBizName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [hours, setHours] = useState("");

  // Portfolio images (5 slots)
  const [imageUrls, setImageUrls] = useState<string[]>(["", "", "", "", ""]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Catalog
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  // Modal states
  const [showBrandEditor, setShowBrandEditor] = useState(false);
  const [editingCatalogIdx, setEditingCatalogIdx] = useState<number | null>(
    null,
  );
  const [showPromoStudio, setShowPromoStudio] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Catalog editor temp state
  const [tempName, setTempName] = useState("");
  const [tempPrice, setTempPrice] = useState("");
  const [tempDesc, setTempDesc] = useState("");
  const [tempImage, setTempImage] = useState("");
  const [uploadingCatalogImg, setUploadingCatalogImg] = useState(false);

  // Promo studio temp state
  const [promoItemIdx, setPromoItemIdx] = useState(-1);
  const [promoTag, setPromoTag] = useState("#PROMO");
  const [promoMessage, setPromoMessage] = useState("SPECIAL OFFER");
  const [promoSupportive, setPromoSupportive] = useState("");
  const [promoNoImage, setPromoNoImage] = useState(false);
  const [promoSlot, setPromoSlot] = useState(0);
  const [promoGradient, setPromoGradient] = useState(0);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const triggerToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

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
      const list = await fbfs.getCollection<MarketplaceProfile>(
        "marketplaceProfiles",
        [["uid", "==", auth.currentUser.uid]],
      );

      if (list.length > 0) {
        const p = list[0];
        setVendorProfile(p);
        setBizName(p.businessName || "");
        setOwnerName(
          p.ownerName ||
            profile?.name ||
            auth.currentUser.displayName ||
            "Vendor",
        );
        setCategory(p.category || CATEGORIES[0]);
        setLocationText(p.location || "");
        setDescription(p.description || "");
        setContactEmail(p.contactEmail || auth.currentUser.email || "");
        setContactPhone(p.contactPhone || "");
        setWhatsappNumber(p.whatsappNumber || "");
        setHours(p.hours || "");

        if (p.images && p.images.length > 0) {
          const filled = [...p.images];
          while (filled.length < 5) filled.push("");
          setImageUrls(filled);
        }
        if (p.catalog && p.catalog.length > 0) {
          setCatalogItems(p.catalog);
        }
      } else {
        setOwnerName(profile?.name || auth.currentUser.displayName || "Vendor");
        setContactEmail(auth.currentUser.email || "");
      }
    } catch (err) {
      console.error("Seller profile loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role === "admin") {
      setLocation("/marketplace");
      return;
    }
    loadProfileWorkspace();
  }, [profile]);

  /* =======================================================
     IMAGE UPLOADS
  ======================================================= */

  const handleSlotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slotIdx: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(slotIdx);
    try {
      const url = await uploadToImgBB(file);
      const updated = [...imageUrls];
      updated[slotIdx] = url;
      setImageUrls(updated);
      triggerToast(
        slotIdx === 0
          ? "Primary avatar updated — publish to make it live."
          : `Photo ${slotIdx + 1} uploaded.`,
      );
    } catch (err: any) {
      triggerToast(err.message || "Upload failed.", "error");
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleCatalogImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCatalogImg(true);
    try {
      const url = await uploadToImgBB(file);
      setTempImage(url);
      triggerToast("Product image uploaded.");
    } catch (err: any) {
      triggerToast(err.message || "Upload failed.", "error");
    } finally {
      setUploadingCatalogImg(false);
    }
  };

  const deleteSlotPhoto = (slotIdx: number) => {
    const updated = [...imageUrls];
    updated[slotIdx] = "";
    setImageUrls(updated);
  };

  /* =======================================================
     CATALOG CRUD
  ======================================================= */

  const openCatalogEditor = (idx: number) => {
    if (idx === -1) {
      setTempName("");
      setTempPrice("");
      setTempDesc("");
      setTempImage("");
      setEditingCatalogIdx(-1);
    } else {
      const item = catalogItems[idx];
      setTempName(item.name || "");
      setTempPrice(item.price ? String(item.price) : "");
      setTempDesc(item.description || "");
      setTempImage(item.imageUrl || "");
      setEditingCatalogIdx(idx);
    }
  };

  const saveCatalogItem = () => {
    if (!tempName.trim() || !tempDesc.trim()) {
      triggerToast("Name and description are required.", "error");
      return;
    }

    const existing =
      editingCatalogIdx !== null && editingCatalogIdx >= 0
        ? catalogItems[editingCatalogIdx]
        : null;

    const payload: CatalogItem = {
      name: tempName.trim(),
      description: tempDesc.trim(),
      price: tempPrice.trim() || "Contact for price",
      imageUrl: tempImage.trim(),
      isPromo: existing?.isPromo || false,
      promoTag: existing?.promoTag || "",
      promoMessage: existing?.promoMessage || "",
      supportiveMessage: existing?.supportiveMessage || "",
      noImage: existing?.noImage || false,
      promoImageSlot: existing?.promoImageSlot ?? 0,
      gradientIndex: existing?.gradientIndex ?? 0,
    };

    if (editingCatalogIdx === -1) {
      setCatalogItems([...catalogItems, payload]);
      triggerToast("Product added.");
    } else if (editingCatalogIdx !== null && editingCatalogIdx >= 0) {
      const updated = [...catalogItems];
      updated[editingCatalogIdx] = payload;
      setCatalogItems(updated);
      triggerToast("Product updated.");
    }

    setEditingCatalogIdx(null);
  };

  const deleteCatalogItem = (idx: number) => {
    setCatalogItems(catalogItems.filter((_, i) => i !== idx));
    triggerToast("Product removed.");
  };

  /* =======================================================
     PROMO STUDIO
  ======================================================= */

  const openPromoStudio = () => {
    const promoIdx = catalogItems.findIndex((i) => !!i.isPromo);
    setPromoItemIdx(promoIdx);

    if (promoIdx !== -1) {
      const p = catalogItems[promoIdx];
      setPromoTag(p.promoTag || "#PROMO");
      setPromoMessage(p.promoMessage || "SPECIAL OFFER");
      setPromoSupportive(p.supportiveMessage || "");
      setPromoNoImage(p.noImage || false);
      setPromoSlot(p.promoImageSlot ?? 0);
      setPromoGradient(p.gradientIndex ?? 0);
    } else {
      setPromoTag("#PROMO");
      setPromoMessage("SPECIAL OFFER");
      setPromoSupportive("");
      setPromoNoImage(false);
      setPromoSlot(0);
      setPromoGradient(0);
    }

    setShowPromoStudio(true);
  };

  const savePromo = () => {
    if (promoItemIdx === -1) {
      setCatalogItems(
        catalogItems.map((item) => ({ ...item, isPromo: false })),
      );
      triggerToast("Promotion deactivated.");
    } else {
      const updated = catalogItems.map((item, i) => {
        if (i === promoItemIdx) {
          return {
            ...item,
            isPromo: true,
            promoTag: promoTag.trim() || "#PROMO",
            promoMessage: promoMessage.trim() || "SPECIAL OFFER",
            supportiveMessage: promoSupportive.trim() || item.description,
            noImage: promoNoImage,
            promoImageSlot: promoSlot,
            gradientIndex: promoGradient,
          };
        }
        return { ...item, isPromo: false };
      });
      setCatalogItems(updated);
      triggerToast("Promotion saved.");
    }
    setShowPromoStudio(false);
  };

  /* =======================================================
     PUBLISH TO FIRESTORE
  ======================================================= */

  const handlePublish = async () => {
    if (!auth.currentUser) return;

    if (
      !bizName.trim() ||
      !ownerName.trim() ||
      !locationText.trim() ||
      !description.trim()
    ) {
      triggerToast("Please fill in all required fields.", "error");
      return;
    }

    const validImages = imageUrls.filter((url) => url.trim() !== "");
    if (validImages.length === 0) {
      triggerToast("Add at least one portfolio image.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<MarketplaceProfile> = {
        uid: auth.currentUser.uid,
        ownerName: ownerName.trim(),
        businessName: bizName.trim(),
        category,
        location: locationText.trim(),
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        whatsappNumber: whatsappNumber.trim().replace(/\+/g, ""),
        hours: hours.trim(),
        images: validImages,
        catalog: catalogItems,
        updatedAt: Date.now(),
      };

      if (vendorProfile?.id) {
        await fbfs.updateDocById(
          "marketplaceProfiles",
          vendorProfile.id,
          payload,
        );
      } else {
        const freshPayload: MarketplaceProfile = {
          id: `portfolio_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          createdAt: Date.now(),
          ratings: [],
          overallRating: 5.0,
          ...payload,
        } as MarketplaceProfile;

        await fbfs.setDocById(
          "marketplaceProfiles",
          freshPayload.id,
          freshPayload,
        );
        setVendorProfile(freshPayload);
      }

      triggerToast("Portfolio published successfully!");
      setTimeout(() => setLocation("/marketplace"), 800);
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Publish failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE ACCOUNT
  ======================================================= */

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    setDeleting(true);
    try {
      // 1. Delete the marketplace profile doc from Firestore
      if (vendorProfile?.id) {
        await fbfs.deleteDocById("marketplaceProfiles", vendorProfile.id);
      }

      // 2. Delete the user profile document
      await fbfs.deleteDocById("users", auth.currentUser.uid);

      // 3. Sign out from Firebase auth
      await auth.signOut();

      triggerToast("Vendor account deleted.");

      // 4. Redirect after a short delay so the toast is visible
      setTimeout(() => {
        setLocation("/marketplace");
        window.location.reload();
      }, 700);
    } catch (err: any) {
      console.error("Delete account failed:", err);
      triggerToast(err.message || "Failed to delete account.", "error");
      setDeleting(false);
    }
  };

  const validPhotos = imageUrls.filter((u) => u.trim() !== "");
  const promoItem = catalogItems.find((item) => item.isPromo) || null;

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <div
        className="seller-page"
        style={{
          width: "100vw",
          maxWidth: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          marginTop: "-3rem",
          paddingTop: "20px",
          minHeight: "100vh",
        }}
      >
        <style>{`
          .seller-page {
            --sp-bg: #eef3f9;
            --sp-surface: #ffffff;
            --sp-surface-2: #f6f8fc;
            --sp-text: #101828;
            --sp-muted: #667085;
            --sp-subtle: #98a2b3;
            --sp-border: #dce4ef;
            --sp-primary: #2457c5;
            --sp-primary-text: #ffffff;
            --sp-accent: #fcdd09;
            --sp-danger: #dc2626;
            --sp-shadow: 0 4px 20px rgba(25, 53, 95, 0.06);
          }

          .dark .seller-page,
          .dark-mode .seller-page,
          [data-theme="dark"] .seller-page {
            --sp-bg: #050505;
            --sp-surface: rgba(255, 255, 255, 0.05);
            --sp-surface-2: rgba(255, 255, 255, 0.08);
            --sp-text: #ffffff;
            --sp-muted: rgba(255, 255, 255, 0.65);
            --sp-subtle: rgba(255, 255, 255, 0.45);
            --sp-border: rgba(255, 255, 255, 0.1);
            --sp-primary: #fcdd09;
            --sp-primary-text: #111111;
            --sp-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          }

          main:has(.seller-page) { padding: 0 !important; }
        `}</style>

        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{
              borderColor: "var(--sp-border)",
              borderTopColor: "var(--sp-primary)",
            }}
          />
          <p
            className="text-xs uppercase tracking-widest font-mono"
            style={{ color: "var(--sp-muted)" }}
          >
            Loading portfolio...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="seller-page"
      style={{
        width: "100vw",
        maxWidth: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        marginTop: "-3rem",
        paddingTop: "20px",
        minHeight: "100vh",
        background: "var(--sp-bg)",
        color: "var(--sp-text)",
        paddingBottom: "130px",
        overflowX: "hidden",
      }}
    >
      <style>{`
        .seller-page {
          --sp-bg: #eef3f9;
          --sp-surface: #ffffff;
          --sp-surface-2: #f6f8fc;
          --sp-text: #101828;
          --sp-muted: #667085;
          --sp-subtle: #98a2b3;
          --sp-border: #dce4ef;
          --sp-primary: #2457c5;
          --sp-primary-text: #ffffff;
          --sp-accent: #fcdd09;
          --sp-danger: #dc2626;
          --sp-shadow: 0 4px 20px rgba(25, 53, 95, 0.06);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .dark .seller-page,
        .dark-mode .seller-page,
        [data-theme="dark"] .seller-page {
          --sp-bg: #050505;
          --sp-surface: rgba(255, 255, 255, 0.05);
          --sp-surface-2: rgba(255, 255, 255, 0.08);
          --sp-text: #ffffff;
          --sp-muted: rgba(255, 255, 255, 0.65);
          --sp-subtle: rgba(255, 255, 255, 0.45);
          --sp-border: rgba(255, 255, 255, 0.1);
          --sp-primary: #fcdd09;
          --sp-primary-text: #111111;
          --sp-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        main:has(.seller-page) {
          padding: 0 !important;
        }

        .sp-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .sp-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--sp-muted);
          font-family: ui-monospace, monospace;
          transition: color 0.2s;
          cursor: pointer;
        }

        .sp-back:hover {
          color: var(--sp-text);
        }

        .sp-card {
          background: var(--sp-surface);
          border: 1px solid var(--sp-border);
          border-radius: 20px;
          box-shadow: var(--sp-shadow);
          overflow: hidden;
        }

        .sp-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px 24px 28px;
          text-align: center;
        }

        .sp-avatar-wrap {
          position: relative;
          width: 108px;
          height: 108px;
          flex-shrink: 0;
        }

        .sp-avatar-ring {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          padding: 3px;
          background: linear-gradient(
            135deg,
            var(--sp-accent) 0%,
            #db2777 50%,
            #6d28d9 100%
          );
          cursor: pointer;
        }

        .sp-avatar-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--sp-bg);
          padding: 3px;
          overflow: hidden;
          position: relative;
        }

        .sp-avatar-inner img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s;
        }

        .sp-avatar-ring:hover .sp-avatar-inner img {
          transform: scale(1.05);
        }

        .sp-avatar-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.3s;
          gap: 4px;
        }

        .sp-avatar-ring:hover .sp-avatar-overlay {
          opacity: 1;
        }

        .sp-avatar-overlay span {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .sp-avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--sp-muted);
        }

        .sp-avatar-placeholder span {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sp-camera-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--sp-primary);
          color: var(--sp-primary-text);
          display: grid;
          place-items: center;
          border: 3px solid var(--sp-bg);
          cursor: pointer;
          transition: transform 0.2s;
          z-index: 2;
        }

        .sp-camera-badge:hover {
          transform: scale(1.1);
        }

        .sp-biz-name {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .sp-biz-category {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: var(--sp-surface-2);
          color: var(--sp-primary);
          border: 1px solid var(--sp-border);
        }

        .sp-biz-bio {
          margin: 0;
          max-width: 560px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--sp-muted);
          white-space: pre-wrap;
        }

        .sp-hero-stats {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
          padding-top: 12px;
          border-top: 1px solid var(--sp-border);
          width: 100%;
          max-width: 400px;
          margin-top: 8px;
        }

        .sp-stat {
          text-align: center;
          flex: 1;
          min-width: 70px;
        }

        .sp-stat strong {
          display: block;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .sp-stat span {
          display: block;
          margin-top: 2px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--sp-muted);
        }

        .sp-stat.star strong {
          color: var(--sp-accent);
          display: inline-flex;
          align-items: center;
          gap: 3px;
          justify-content: center;
        }

        .sp-biz-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          justify-content: center;
          font-size: 11px;
          color: var(--sp-muted);
          padding-top: 6px;
        }

        .sp-biz-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .sp-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
          padding-top: 16px;
          width: 100%;
        }

        .sp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          font-family: ui-monospace, monospace;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          cursor: pointer;
          border: 1px solid var(--sp-border);
          background: var(--sp-surface);
          color: var(--sp-text);
          transition: all 0.15s;
          white-space: nowrap;
        }

        .sp-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(25, 53, 95, 0.08);
        }

        .sp-btn.primary {
          background: var(--sp-primary);
          color: var(--sp-primary-text);
          border-color: var(--sp-primary);
        }

        .sp-btn.danger {
          color: var(--sp-danger);
          border-color: rgba(220, 38, 38, 0.25);
        }

        .sp-btn.danger:hover {
          background: rgba(220, 38, 38, 0.08);
        }

        .sp-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .sp-section {
          margin-top: 20px;
        }

        .sp-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--sp-border);
        }

        .sp-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--sp-muted);
          font-family: ui-monospace, monospace;
        }

        .sp-section-body {
          padding: 20px;
        }

        .sp-photo-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        @media (max-width: 640px) {
          .sp-photo-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .sp-photo {
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          background: var(--sp-surface-2);
          border: 1px solid var(--sp-border);
          transition: border-color 0.2s;
        }

        .sp-photo:hover {
          border-color: var(--sp-primary);
        }

        .sp-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sp-photo-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--sp-muted);
          cursor: pointer;
          transition: background 0.2s;
        }

        .sp-photo-empty:hover {
          background: var(--sp-surface);
        }

        .sp-photo-empty span {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sp-photo-delete {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          display: grid;
          place-items: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          border: 0;
        }

        .sp-photo:hover .sp-photo-delete {
          opacity: 1;
        }

        .sp-photo-delete:hover {
          background: var(--sp-danger);
        }

        .sp-catalog-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .sp-catalog-item {
          border: 1px solid var(--sp-border);
          border-radius: 14px;
          overflow: hidden;
          background: var(--sp-surface);
          cursor: pointer;
          transition: all 0.2s;
        }

        .sp-catalog-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(25, 53, 95, 0.1);
          border-color: var(--sp-primary);
        }

        .sp-catalog-img {
          aspect-ratio: 4 / 3;
          background: var(--sp-surface-2);
          display: grid;
          place-items: center;
          color: var(--sp-muted);
          overflow: hidden;
        }

        .sp-catalog-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sp-catalog-body {
          padding: 10px 12px;
        }

        .sp-catalog-body strong {
          display: block;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--sp-text);
        }

        .sp-catalog-body span {
          display: block;
          margin-top: 2px;
          font-size: 10px;
          color: var(--sp-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sp-catalog-price {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--sp-border);
        }

        .sp-catalog-price strong {
          font-size: 12px;
          font-weight: 900;
          color: var(--sp-primary);
        }

        .sp-catalog-badge {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 6px;
          border-radius: 6px;
          background: var(--sp-accent);
          color: #111;
        }

        .sp-preview {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          min-height: 140px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 6px;
          color: white;
          margin-top: 10px;
        }

        .sp-preview-tag {
          display: inline-flex;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: rgba(252, 221, 9, 0.95);
          color: #111;
          width: fit-content;
        }

        .sp-preview h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.1;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }

        .sp-preview p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
          max-width: 500px;
        }

        .sp-empty {
          padding: 40px 20px;
          text-align: center;
          border: 1px dashed var(--sp-border);
          border-radius: 14px;
        }

        .sp-empty strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
          color: var(--sp-text);
        }

        .sp-empty p {
          margin: 0;
          font-size: 11px;
          color: var(--sp-muted);
        }

        .sp-publish-bar {
          position: sticky;
          bottom: 24px;
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding: 0 20px;
        }

        .sp-publish-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: var(--sp-primary);
          color: var(--sp-primary-text);
          border: none;
          cursor: pointer;
          font-family: ui-monospace, monospace;
          box-shadow: 0 12px 32px rgba(36, 87, 197, 0.3);
          transition: all 0.2s;
        }

        .sp-publish-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(36, 87, 197, 0.4);
        }

        .sp-publish-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .sp-modal-bg {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(8, 18, 35, 0.7);
          backdrop-filter: blur(8px);
          display: grid;
          place-items: center;
          padding: 16px;
          overflow-y: auto;
        }

        .sp-modal {
          width: 100%;
          max-width: 500px;
          background: var(--sp-surface);
          border: 1px solid var(--sp-border);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .sp-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--sp-border);
          flex-shrink: 0;
        }

        .sp-modal-head h3 {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: ui-monospace, monospace;
          color: var(--sp-text);
        }

        .sp-modal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--sp-surface-2);
          border: none;
          color: var(--sp-muted);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sp-modal-close:hover {
          background: var(--sp-border);
          color: var(--sp-text);
        }

        .sp-modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sp-modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .sp-modal-foot {
          padding: 16px 20px;
          border-top: 1px solid var(--sp-border);
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        .sp-field {
          margin-bottom: 16px;
        }

        .sp-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: ui-monospace, monospace;
          color: var(--sp-muted);
        }

        .sp-input,
        .sp-textarea,
        .sp-select {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--sp-border);
          background: var(--sp-surface-2);
          color: var(--sp-text);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .sp-input:focus,
        .sp-textarea:focus,
        .sp-select:focus {
          border-color: var(--sp-primary);
          box-shadow: 0 0 0 4px rgba(36, 87, 197, 0.1);
        }

        .sp-textarea {
          min-height: 100px;
          resize: vertical;
          line-height: 1.6;
        }

        .sp-select {
          cursor: pointer;
        }

        .sp-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        @media (max-width: 480px) {
          .sp-grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .sp-grad-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .sp-grad-option {
          aspect-ratio: 2;
          border-radius: 8px;
          cursor: pointer;
          border: 2px solid transparent;
          position: relative;
          transition: transform 0.15s;
        }

        .sp-grad-option:hover {
          transform: scale(1.03);
        }

        .sp-grad-option.selected {
          border-color: var(--sp-text);
          box-shadow: 0 0 0 2px var(--sp-bg) inset;
        }

        .sp-grad-option span {
          position: absolute;
          bottom: 3px;
          left: 4px;
          font-size: 7px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
          color: white;
        }

        .sp-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: var(--sp-surface);
          border: 1px solid var(--sp-border);
          border-radius: 14px;
          box-shadow: 0 20px 50px rgba(20, 42, 82, 0.2);
          font-size: 12px;
          font-weight: 600;
          color: var(--sp-text);
          max-width: calc(100vw - 32px);
          animation: sp-slide-up 0.3s ease-out;
        }

        @keyframes sp-slide-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .sp-toast-dot {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #22c55e;
        }

        .sp-toast-dot.error {
          background: var(--sp-danger);
        }

        .sp-img-preview {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          overflow: hidden;
          background: var(--sp-surface-2);
          border: 1px solid var(--sp-border);
          display: grid;
          place-items: center;
          color: var(--sp-muted);
          flex-shrink: 0;
        }

        .sp-img-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sp-upload-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      {/* Back button */}
      <Link href="/marketplace">
        <span className="sp-back">
          <ArrowLeft size={12} /> Back to Marketplace
        </span>
      </Link>

      {/* Container */}
      <div className="sp-container">
        {/* ==================================================
            HERO — Brand identity
        ================================================== */}

        <section className="sp-card sp-hero">
          <input
            type="file"
            ref={avatarInputRef}
            onChange={(e) => handleSlotUpload(e, 0)}
            accept="image/*"
            style={{ display: "none" }}
          />

          <div className="sp-avatar-wrap">
            <div
              className="sp-avatar-ring"
              onClick={() => avatarInputRef.current?.click()}
            >
              <div className="sp-avatar-inner">
                {validPhotos.length > 0 ? (
                  <>
                    <img src={validPhotos[0]} alt={bizName || "Avatar"} />
                    <div className="sp-avatar-overlay">
                      <Camera size={18} />
                      <span>Change</span>
                    </div>
                  </>
                ) : (
                  <div className="sp-avatar-placeholder">
                    <Store size={22} />
                    <span>Add photo</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="sp-camera-badge"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Change avatar"
            >
              <Camera size={13} />
            </button>
          </div>

          <div>
            <h1 className="sp-biz-name">{bizName || "Untitled Business"}</h1>
            <span className="sp-biz-category" style={{ marginTop: 8 }}>
              {category}
            </span>
          </div>

          <p className="sp-biz-bio">
            {description ||
              "Add a short description about your business, services, or products. Click Edit to get started."}
          </p>

          {(locationText || hours || contactPhone) && (
            <div className="sp-biz-meta">
              {locationText && (
                <span>
                  <MapPin size={11} /> {locationText}
                </span>
              )}
              {hours && <span>🕒 {hours}</span>}
              {contactPhone && (
                <span>
                  <Phone size={11} /> {contactPhone}
                </span>
              )}
            </div>
          )}

          <div className="sp-hero-stats">
            <div className="sp-stat">
              <strong>{validPhotos.length}</strong>
              <span>Photos</span>
            </div>
            <div className="sp-stat">
              <strong>{catalogItems.length}</strong>
              <span>Products</span>
            </div>
            <div className="sp-stat">
              <strong>{vendorProfile?.ratings?.length || 0}</strong>
              <span>Reviews</span>
            </div>
            <div className="sp-stat star">
              <strong>
                {vendorProfile?.overallRating?.toFixed(1) || "5.0"}{" "}
                <Star size={12} fill="currentColor" />
              </strong>
              <span>Rating</span>
            </div>
          </div>

          <div className="sp-actions">
            <button
              type="button"
              className="sp-btn"
              onClick={() => setShowBrandEditor(true)}
            >
              <Settings size={13} /> Edit brand
            </button>

            <button
              type="button"
              className="sp-btn"
              onClick={() => openCatalogEditor(-1)}
            >
              <Plus size={13} /> Add product
            </button>

            <button type="button" className="sp-btn" onClick={openPromoStudio}>
              <Sparkles size={13} /> Promo studio
            </button>
          </div>
        </section>

        {/* ==================================================
            PHOTO STREAM
        ================================================== */}

        <section className="sp-card sp-section" style={{ marginTop: 20 }}>
          <header className="sp-section-header">
            <div className="sp-section-title">
              <ImageIcon size={12} /> Portfolio stream
            </div>
            <span
              style={{
                fontSize: 10,
                color: "var(--sp-muted)",
                fontFamily: "ui-monospace, monospace",
                fontWeight: 800,
              }}
            >
              {validPhotos.length} / 5
            </span>
          </header>

          <div className="sp-section-body">
            <div className="sp-photo-grid">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="sp-photo">
                  {url ? (
                    <>
                      <img src={url} alt={`Slot ${idx + 1}`} />
                      <button
                        type="button"
                        className="sp-photo-delete"
                        onClick={() => deleteSlotPhoto(idx)}
                        aria-label={`Delete photo ${idx + 1}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  ) : (
                    <label className="sp-photo-empty">
                      {uploadingIdx === idx ? (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                          style={{
                            borderColor: "var(--sp-border)",
                            borderTopColor: "var(--sp-primary)",
                          }}
                        />
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Slot {idx + 1}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleSlotUpload(e, idx)}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            {validPhotos.length === 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--sp-surface-2)",
                  fontSize: 11,
                  color: "var(--sp-muted)",
                }}
              >
                <AlertTriangle size={13} />
                <span>Upload at least 1 photo to publish your portfolio.</span>
              </div>
            )}
          </div>
        </section>

        {/* ==================================================
            CATALOG
        ================================================== */}

        <section className="sp-card sp-section">
          <header className="sp-section-header">
            <div className="sp-section-title">
              <Store size={12} /> Products & services
            </div>
            <button
              type="button"
              className="sp-btn"
              style={{ padding: "6px 12px", fontSize: 10 }}
              onClick={() => openCatalogEditor(-1)}
            >
              <Plus size={11} /> Add
            </button>
          </header>

          <div className="sp-section-body">
            {catalogItems.length === 0 ? (
              <div className="sp-empty">
                <strong>No products yet</strong>
                <p>Add your first product or service to get started.</p>
              </div>
            ) : (
              <div className="sp-catalog-list">
                {catalogItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="sp-catalog-item"
                    onClick={() => openCatalogEditor(idx)}
                  >
                    <div className="sp-catalog-img">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} />
                      ) : (
                        <ImageIcon size={20} />
                      )}
                    </div>

                    <div className="sp-catalog-body">
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>

                      <div className="sp-catalog-price">
                        <strong>{item.price || "Contact"}</strong>
                        {item.isPromo && (
                          <span className="sp-catalog-badge">Promo</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ==================================================
            PROMO PREVIEW
        ================================================== */}

        {promoItem && (
          <section className="sp-card sp-section">
            <header className="sp-section-header">
              <div className="sp-section-title">
                <Sparkles size={12} /> Active promotion
              </div>
              <button
                type="button"
                className="sp-btn"
                style={{ padding: "6px 12px", fontSize: 10 }}
                onClick={openPromoStudio}
              >
                <Palette size={11} /> Edit
              </button>
            </header>

            <div className="sp-section-body">
              <div
                className="sp-preview"
                style={{
                  background:
                    GRADIENT_PRESETS[promoItem.gradientIndex || 0].css,
                  color: GRADIENT_PRESETS[promoItem.gradientIndex || 0].text,
                }}
              >
                {!promoItem.noImage &&
                  imageUrls[promoItem.promoImageSlot || 0] && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "50%",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={imageUrls[promoItem.promoImageSlot || 0]}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.85,
                          mixBlendMode: "luminosity",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to right, currentColor 0%, transparent 60%)",
                          opacity: 0.4,
                        }}
                      />
                    </div>
                  )}

                <div style={{ position: "relative", zIndex: 2 }}>
                  <div className="sp-preview-tag">
                    {promoItem.promoTag || "#PROMO"}
                  </div>
                  <h3 style={{ color: "inherit" }}>
                    {promoItem.promoMessage || "SPECIAL OFFER"}
                  </h3>
                  <p style={{ color: "inherit", opacity: 0.9 }}>
                    {promoItem.supportiveMessage || promoItem.description}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            PUBLISH BAR
        ================================================== */}

        <div className="sp-publish-bar">
          <button
            type="button"
            className="sp-publish-btn"
            onClick={handlePublish}
            disabled={saving}
          >
            {saving ? "Publishing..." : "Publish portfolio"}
            <ChevronRight size={14} />
          </button>
        </div>

        {/* ==================================================
            DANGER ZONE — Account controls
        ================================================== */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            paddingTop: 24,
            paddingBottom: 12,
          }}
        >
          <button type="button" className="sp-btn" onClick={logout}>
            <LogOut size={12} /> Log out
          </button>

          <button
            type="button"
            className="sp-btn danger"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={12} /> Delete account
          </button>
        </div>
      </div>

      {/* ==================================================
          BRAND EDITOR MODAL
      ================================================== */}

      {showBrandEditor && (
        <div
          className="sp-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBrandEditor(false);
          }}
        >
          <div className="sp-modal">
            <header className="sp-modal-head">
              <h3>Edit brand</h3>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => setShowBrandEditor(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="sp-modal-body">
              <div className="sp-field">
                <label>Business name *</label>
                <input
                  className="sp-input"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Laser Cuts Barber"
                />
              </div>

              <div className="sp-grid-2">
                <div className="sp-field">
                  <label>Owner name *</label>
                  <input
                    className="sp-input"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="sp-field">
                  <label>Category *</label>
                  <select
                    className="sp-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sp-field">
                <label>Location *</label>
                <input
                  className="sp-input"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Gate Area, next to law block"
                />
              </div>

              <div className="sp-grid-2">
                <div className="sp-field">
                  <label>Phone</label>
                  <input
                    className="sp-input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+254..."
                  />
                </div>

                <div className="sp-field">
                  <label>WhatsApp</label>
                  <input
                    className="sp-input"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="254..."
                  />
                </div>
              </div>

              <div className="sp-grid-2">
                <div className="sp-field">
                  <label>Email</label>
                  <input
                    className="sp-input"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="sp-field">
                  <label>Hours</label>
                  <input
                    className="sp-input"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="e.g. Mon–Sat 8AM–8PM"
                  />
                </div>
              </div>

              <div className="sp-field">
                <label>Description *</label>
                <textarea
                  className="sp-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your business, products, and what makes you unique..."
                />
              </div>
            </div>

            <footer className="sp-modal-foot">
              <button
                type="button"
                className="sp-btn"
                onClick={() => setShowBrandEditor(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-btn primary"
                onClick={() => {
                  setShowBrandEditor(false);
                  triggerToast("Brand updated. Publish to save.");
                }}
              >
                <Check size={13} /> Apply
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================
          CATALOG EDITOR MODAL
      ================================================== */}

      {editingCatalogIdx !== null && (
        <div
          className="sp-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCatalogIdx(null);
          }}
        >
          <div className="sp-modal">
            <header className="sp-modal-head">
              <h3>
                {editingCatalogIdx === -1 ? "Add product" : "Edit product"}
              </h3>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => setEditingCatalogIdx(null)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="sp-modal-body">
              <div className="sp-grid-2">
                <div className="sp-field">
                  <label>Name *</label>
                  <input
                    className="sp-input"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. Classic Fade + Dye"
                  />
                </div>

                <div className="sp-field">
                  <label>Price</label>
                  <input
                    className="sp-input"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    placeholder="e.g. KSh 300"
                  />
                </div>
              </div>

              <div className="sp-field">
                <label>Description *</label>
                <textarea
                  className="sp-textarea"
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  placeholder="What's included, size guides, materials..."
                />
              </div>

              <div className="sp-field">
                <label>Product image</label>
                <div className="sp-upload-row">
                  <div className="sp-img-preview">
                    {tempImage ? (
                      <img src={tempImage} alt="Preview" />
                    ) : uploadingCatalogImg ? (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{
                          borderColor: "var(--sp-border)",
                          borderTopColor: "var(--sp-primary)",
                        }}
                      />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                  </div>

                  <label className="sp-btn" style={{ cursor: "pointer" }}>
                    <Upload size={12} /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleCatalogImageUpload}
                    />
                  </label>

                  {tempImage && (
                    <button
                      type="button"
                      className="sp-btn danger"
                      onClick={() => setTempImage("")}
                      style={{ padding: "10px" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <footer className="sp-modal-foot">
              {editingCatalogIdx >= 0 && (
                <button
                  type="button"
                  className="sp-btn danger"
                  onClick={() => {
                    deleteCatalogItem(editingCatalogIdx);
                    setEditingCatalogIdx(null);
                  }}
                  style={{ marginRight: "auto" }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
              <button
                type="button"
                className="sp-btn"
                onClick={() => setEditingCatalogIdx(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-btn primary"
                onClick={saveCatalogItem}
              >
                <Check size={13} /> Save
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================
          PROMO STUDIO MODAL
      ================================================== */}

      {showPromoStudio && (
        <div
          className="sp-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPromoStudio(false);
          }}
        >
          <div className="sp-modal" style={{ maxWidth: 560 }}>
            <header className="sp-modal-head">
              <h3>Promo studio</h3>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => setShowPromoStudio(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="sp-modal-body">
              <div className="sp-field">
                <label>Which product to promote?</label>
                <select
                  className="sp-select"
                  value={promoItemIdx}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setPromoItemIdx(idx);
                    if (idx >= 0) {
                      const item = catalogItems[idx];
                      setPromoTag(item.promoTag || "#PROMO");
                      setPromoMessage(item.promoMessage || "SPECIAL OFFER");
                      setPromoSupportive(
                        item.supportiveMessage || item.description,
                      );
                      setPromoNoImage(item.noImage || false);
                      setPromoSlot(item.promoImageSlot ?? 0);
                      setPromoGradient(item.gradientIndex ?? 0);
                    }
                  }}
                >
                  <option value={-1}>— Deactivate promotion —</option>
                  {catalogItems.map((item, idx) => (
                    <option key={idx} value={idx}>
                      {item.name || `Product ${idx + 1}`} ·{" "}
                      {item.price || "Contact"}
                    </option>
                  ))}
                </select>
              </div>

              {promoItemIdx !== -1 && (
                <>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label>Tag</label>
                      <input
                        className="sp-input"
                        value={promoTag}
                        onChange={(e) =>
                          setPromoTag(
                            e.target.value.startsWith("#") ||
                              e.target.value === ""
                              ? e.target.value
                              : `#${e.target.value}`,
                          )
                        }
                        placeholder="#MEGAOFFER"
                      />
                    </div>

                    <div className="sp-field">
                      <label>Headline</label>
                      <input
                        className="sp-input"
                        value={promoMessage}
                        onChange={(e) => setPromoMessage(e.target.value)}
                        placeholder="e.g. 30% OFF"
                      />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label>Supporting text</label>
                    <input
                      className="sp-input"
                      value={promoSupportive}
                      onChange={(e) => setPromoSupportive(e.target.value)}
                      placeholder="Extra context for your customers..."
                    />
                  </div>

                  <div className="sp-field">
                    <label>Backdrop style</label>
                    <select
                      className="sp-select"
                      value={promoNoImage ? "gradient" : "image"}
                      onChange={(e) =>
                        setPromoNoImage(e.target.value === "gradient")
                      }
                    >
                      <option value="gradient">Gradient only</option>
                      <option value="image">With product image</option>
                    </select>
                  </div>

                  {!promoNoImage && (
                    <div className="sp-field">
                      <label>Which photo to showcase?</label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: 6,
                        }}
                      >
                        {imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPromoSlot(idx)}
                            style={{
                              aspectRatio: 1,
                              borderRadius: 10,
                              overflow: "hidden",
                              border:
                                promoSlot === idx
                                  ? "2px solid var(--sp-primary)"
                                  : "1px solid var(--sp-border)",
                              background: "var(--sp-surface-2)",
                              cursor: "pointer",
                              padding: 0,
                              position: "relative",
                            }}
                          >
                            {url ? (
                              <img
                                src={url}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "grid",
                                  placeItems: "center",
                                  color: "var(--sp-muted)",
                                  fontSize: 9,
                                  fontWeight: 800,
                                }}
                              >
                                {idx + 1}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="sp-field">
                    <label>Backdrop color</label>
                    <div className="sp-grad-grid">
                      {GRADIENT_PRESETS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className={`sp-grad-option ${
                            promoGradient === g.id ? "selected" : ""
                          }`}
                          style={{ background: g.css }}
                          onClick={() => setPromoGradient(g.id)}
                          aria-label={g.name}
                        >
                          <span style={{ color: g.text }}>{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <footer className="sp-modal-foot">
              <button
                type="button"
                className="sp-btn"
                onClick={() => setShowPromoStudio(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-btn primary"
                onClick={savePromo}
              >
                <Check size={13} /> Save promotion
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================
          DELETE CONFIRM MODAL
      ================================================== */}

      {showDeleteConfirm && (
        <div
          className="sp-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div className="sp-modal" style={{ maxWidth: 440 }}>
            <header className="sp-modal-head">
              <h3 style={{ color: "var(--sp-danger)" }}>Delete account</h3>
              <button
                type="button"
                className="sp-modal-close"
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                <X size={16} />
              </button>
            </header>

            <div className="sp-modal-body">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  marginBottom: 16,
                }}
              >
                <AlertTriangle
                  size={18}
                  style={{
                    color: "var(--sp-danger)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--sp-text)",
                      marginBottom: 4,
                    }}
                  >
                    This action cannot be undone
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "var(--sp-muted)",
                    }}
                  >
                    Deleting your vendor account will permanently remove:
                  </p>
                </div>
              </div>

              <ul
                style={{
                  margin: "0 0 16px",
                  padding: "0 0 0 20px",
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: "var(--sp-muted)",
                }}
              >
                <li>Your business profile and portfolio photos</li>
                <li>All products, services, and promotions</li>
                <li>Any pending leads or communications</li>
                <li>Your StudentHub user account</li>
              </ul>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--sp-text)",
                  fontWeight: 600,
                }}
              >
                Are you absolutely sure you want to continue?
              </p>
            </div>

            <footer className="sp-modal-foot">
              <button
                type="button"
                className="sp-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sp-btn danger"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete account"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================
          TOAST
      ================================================== */}

      {toast && (
        <div className="sp-toast">
          <span
            className={`sp-toast-dot ${toast.type === "error" ? "error" : ""}`}
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default SellerProfileView;
