import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { fbfs, auth } from "../lib/firebase";
import {
  MarketplaceProfile,
  CatalogItem,
  BusinessRating,
  PromotionItem,
} from "../types";
import { useAuth } from "../App";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { fetchAndRenderEmailTemplate } from "../utils/emailHelper";
import { ShareDialog } from "../components/ShareDialog";
import {
  Search,
  Store,
  X,
  Phone,
  Mail,
  Share2,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  User as UserIcon,
  LogIn,
  UserPlus,
} from "lucide-react";

/* =========================================================
   MARKETPLACE VIEW
========================================================= */

type MarketplaceItem = {
  business: MarketplaceProfile;
  item: CatalogItem;
  itemIndex: number;
  image: string;
};

type Campaign = {
  business: MarketplaceProfile;
  item?: CatalogItem;
  promotion?: PromotionItem;
  image: string;
  title: string;
  description: string;
  discountText: string;
  tag: string;
};

/* =========================================================
   VENDOR GRADIENT PRESETS
========================================================= */

const VENDOR_GRADIENTS: Record<number, string> = {
  0: "linear-gradient(100deg, #FFDE00 0%, #ffae00 100%)",
  1: "linear-gradient(100deg, #f59e0b 0%, #e11d48 100%)",
  2: "linear-gradient(100deg, #312e81 0%, #6b21a8 60%, #7e22ce 100%)",
  3: "linear-gradient(100deg, #059669 0%, #0f766e 50%, #155e75 100%)",
  4: "linear-gradient(100deg, #38bdf8 0%, #2563eb 100%)",
  5: "linear-gradient(100deg, #db2777 0%, #9333ea 50%, #ec4899 100%)",
  6: "linear-gradient(100deg, #fb923c 0%, #f59e0b 50%, #eab308 100%)",
  7: "linear-gradient(100deg, #b91c1c 0%, #171717 100%)",
  8: "linear-gradient(100deg, #171717 0%, #27272a 50%, #1c1917 100%)",
  9: "linear-gradient(100deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
  10: "linear-gradient(100deg, #6d28d9 0%, #a21caf 100%)",
};

const VENDOR_TEXT_COLORS: Record<number, string> = {
  0: "#111111",
  1: "#ffffff",
  2: "#ffffff",
  3: "#ffffff",
  4: "#ffffff",
  5: "#ffffff",
  6: "#ffffff",
  7: "#ffffff",
  8: "#ffffff",
  9: "#ffffff",
  10: "#ffffff",
};

/* =========================================================
   HELPERS
========================================================= */

function getInitials(value?: string) {
  if (!value) return "SH";

  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getImage(business: MarketplaceProfile, item?: CatalogItem) {
  if (item?.imageUrl) {
    return item.imageUrl;
  }

  if (
    item?.promoImageSlot !== undefined &&
    business.images?.[item.promoImageSlot]
  ) {
    return business.images[item.promoImageSlot];
  }

  return business.images?.[0] || "";
}

function getPrice(item?: CatalogItem) {
  if (!item?.price) {
    return "Contact seller";
  }

  if (typeof item.price === "number") {
    return `KSh ${item.price.toLocaleString()}`;
  }

  return String(item.price).startsWith("KSh")
    ? String(item.price)
    : `KSh ${item.price}`;
}

function getCreatedTime(value: any) {
  if (!value) return 0;

  if (value?.seconds) {
    return value.seconds * 1000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function toContactList(value: string | string[] | undefined | null): string[] {
  if (!value) return [];

  const raw = Array.isArray(value) ? value : String(value).split(/[,;\n]+/);

  const cleaned = raw.map((entry) => String(entry).trim()).filter(Boolean);

  return Array.from(new Set(cleaned));
}

/* =========================================================
   GUEST DEVICE ID
   Persists a stable anonymous identity for guest reviewers
   so they can't double-review and can edit their own review.
========================================================= */

function getGuestDeviceId(): string {
  const KEY = "sh_guest_reviewer_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `guest_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return `guest_${Date.now().toString(36)}`;
  }
}

/**
 * Determine the campaign's gradient from the vendor's chosen index.
 */
function getCampaignGradient(campaign: Campaign | null): string {
  if (!campaign) {
    return "linear-gradient(100deg, #0f172a 0%, #1e293b 50%, #334155 100%)";
  }

  const itemGradIdx = (campaign.item as any)?.gradientIndex;
  if (typeof itemGradIdx === "number" && VENDOR_GRADIENTS[itemGradIdx]) {
    return VENDOR_GRADIENTS[itemGradIdx];
  }

  const promoGradIdx = (campaign.promotion as any)?.gradientIndex;
  if (typeof promoGradIdx === "number" && VENDOR_GRADIENTS[promoGradIdx]) {
    return VENDOR_GRADIENTS[promoGradIdx];
  }

  return "linear-gradient(100deg, #0f172a 0%, #1e293b 50%, #334155 100%)";
}

function getCampaignTextColor(campaign: Campaign | null): string {
  if (!campaign) return "#ffffff";

  const idx =
    (campaign.item as any)?.gradientIndex ??
    (campaign.promotion as any)?.gradientIndex;

  if (typeof idx === "number" && VENDOR_TEXT_COLORS[idx]) {
    return VENDOR_TEXT_COLORS[idx];
  }

  return "#ffffff";
}

/* =========================================================
   OFFICIAL WHATSAPP GLYPH
========================================================= */

function WhatsAppIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.05 4.91A10.42 10.42 0 0 0 12.04 2c-5.76 0-10.44 4.68-10.44 10.44 0 1.84.48 3.63 1.39 5.21L1.5 22.5l4.98-1.3a10.4 10.4 0 0 0 5.55 1.6h.01c5.75 0 10.43-4.68 10.43-10.44 0-2.79-1.08-5.41-3.03-7.39Zm-7.01 16.05h-.01a8.65 8.65 0 0 1-4.4-1.2l-.32-.19-3.26.85.87-3.18-.2-.33a8.62 8.62 0 0 1-1.32-4.6c0-4.78 3.89-8.66 8.68-8.66 2.32 0 4.5.9 6.14 2.54a8.6 8.6 0 0 1 2.54 6.13c0 4.78-3.89 8.64-8.72 8.64Zm4.76-6.48c-.26-.13-1.54-.76-1.78-.85-.24-.09-.42-.13-.59.13-.17.26-.68.85-.84 1.03-.15.17-.31.19-.57.06-.26-.13-1.1-.4-2.09-1.29-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.06-.13-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45-.15-.01-.33-.01-.5-.01-.17 0-.46.07-.7.33-.24.26-.92.9-.92 2.2 0 1.29.94 2.54 1.07 2.72.13.17 1.85 2.83 4.49 3.96.63.27 1.12.43 1.5.55.63.2 1.21.17 1.66.1.5-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.24-.17-.5-.3Z" />
    </svg>
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function MarketplaceView() {
  const { currentUser, profile } = useAuth();
  const [, setLocation] = useLocation();

  const [businesses, setBusinesses] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [campaignIndex, setCampaignIndex] = useState(0);

  const [selectedBusiness, setSelectedBusiness] =
    useState<MarketplaceProfile | null>(null);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [authRequiredReason, setAuthRequiredReason] = useState<string | null>(
    null,
  );
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [userRating, setUserRating] = useState(5);
  const [userReview, setUserReview] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category: "Event" | "Bulletin" | "Portfolio";
  }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Portfolio",
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const triggerToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  /* =======================================================
     LOAD FIRESTORE DATA
  ======================================================= */

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      const fetched = await fbfs.getCollection<MarketplaceProfile>(
        "marketplaceProfiles",
      );
      const clean = (fetched || []).filter(
        (business) => business && business.id && business.businessName,
      );
      setBusinesses(clean);
    } catch (error) {
      console.error("Marketplace data loading failed:", error);
      setBusinesses([]);
      triggerToast("Unable to load marketplace listings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  /* =======================================================
     GLOBAL SEARCH SUPPORT
  ======================================================= */

  useEffect(() => {
    const handleGlobalSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSearchTerm(customEvent.detail || "");
    };

    window.addEventListener("global-search", handleGlobalSearch);
    return () => {
      window.removeEventListener("global-search", handleGlobalSearch);
    };
  }, []);

  /* =======================================================
     FLATTEN ACTUAL CATALOG ITEMS
  ======================================================= */

  const marketplaceItems = useMemo<MarketplaceItem[]>(() => {
    const result: MarketplaceItem[] = [];

    businesses.forEach((business) => {
      if (!business.catalog || !Array.isArray(business.catalog)) {
        return;
      }

      business.catalog.forEach((item, itemIndex) => {
        result.push({
          business,
          item,
          itemIndex,
          image: getImage(business, item),
        });
      });
    });

    return result.sort(
      (a, b) =>
        getCreatedTime(b.business.createdAt) -
        getCreatedTime(a.business.createdAt),
    );
  }, [businesses]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return marketplaceItems;
    }

    return marketplaceItems.filter(({ business, item }) => {
      const searchable = [
        item.name,
        item.description,
        item.price,
        item.promoTag,
        item.promoMessage,
        business.businessName,
        business.ownerName,
        business.category,
        business.location,
        business.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [marketplaceItems, searchTerm]);

  const isSearching = searchTerm.trim().length > 0;

  /* =======================================================
     CAMPAIGNS
  ======================================================= */

  const campaigns = useMemo<Campaign[]>(() => {
    const result: Campaign[] = [];

    businesses.forEach((business) => {
      if (business.catalog && Array.isArray(business.catalog)) {
        business.catalog.forEach((item) => {
          if (!item.isPromo) return;

          const image = getImage(business, item);

          result.push({
            business,
            item,
            image,
            title: item.name || "Special campaign",
            description:
              item.supportiveMessage ||
              item.description ||
              "Special offer available on StudentHub MKU.",
            discountText: item.promoMessage || item.promoTag || "SPECIAL OFFER",
            tag: item.promoTag || "CAMPAIGN",
          });
        });
      }

      if (business.promotions && Array.isArray(business.promotions)) {
        business.promotions.forEach((promotion) => {
          if (!promotion.active) return;

          const alreadyExists = result.some(
            (campaign) =>
              campaign.business.id === business.id &&
              campaign.title === promotion.title,
          );

          if (alreadyExists) return;

          result.push({
            business,
            promotion,
            image: promotion.imageUrl || business.images?.[0] || "",
            title: promotion.title,
            description: promotion.description || "",
            discountText: promotion.discountText || "SPECIAL OFFER",
            tag: "CAMPAIGN",
          });
        });
      }
    });

    return result;
  }, [businesses]);

  /* =======================================================
     CAMPAIGN ROTATION
  ======================================================= */

  useEffect(() => {
    if (campaigns.length <= 1) return;

    const interval = window.setInterval(() => {
      setCampaignIndex((previous) => (previous + 1) % campaigns.length);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [campaigns.length]);

  /* =======================================================
     OPEN BUSINESS / PRODUCT
  ======================================================= */

  const openBusiness = (business: MarketplaceProfile) => {
    setSelectedBusiness(business);
    setSelectedItem(null);
    setSelectedItemIndex(-1);
    setActiveImageIndex(0);
    setUserRating(5);
    setUserReview("");

    if (business.emailNotificationsEnabled !== false && business.contactEmail) {
      const triggerVendorAlert = async () => {
        try {
          const rendered = await fetchAndRenderEmailTemplate(
            "marketplace_lead",
            {
              vendorName: business.ownerName || "Business Owner",
              businessName: business.businessName,
            },
          );

          await fetch("/api/alert-vendor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendorEmail: business.contactEmail,
              vendorName: business.ownerName || "Business Owner",
              businessName: business.businessName,
              customSubject: rendered?.customSubject || undefined,
              customHtml: rendered?.customHtml || undefined,
            }),
          });
        } catch (error) {
          console.error("Vendor alert failed:", error);
        }
      };

      triggerVendorAlert();
    }
  };

  const openItem = (
    business: MarketplaceProfile,
    item: CatalogItem,
    itemIndex: number,
  ) => {
    setSelectedBusiness(business);
    setSelectedItem(item);
    setSelectedItemIndex(itemIndex);
    setActiveImageIndex(0);
    setUserRating(5);
    setUserReview("");
  };

  const closeDetail = () => {
    setSelectedBusiness(null);
    setSelectedItem(null);
    setSelectedItemIndex(-1);
    setActiveImageIndex(0);
  };

  /* =======================================================
     CURRENT DETAIL IMAGE
  ======================================================= */

  const detailImages = useMemo(() => {
    if (!selectedBusiness) return [];
    const images = selectedBusiness.images || [];
    return images.filter(Boolean);
  }, [selectedBusiness]);

  const detailImage = selectedItem
    ? getImage(selectedBusiness!, selectedItem)
    : detailImages[activeImageIndex] || detailImages[0] || "";

  /* =======================================================
     MORE FROM SELLER
  ======================================================= */

  const sellerItems = useMemo(() => {
    if (!selectedBusiness) return [];
    return selectedBusiness.catalog || [];
  }, [selectedBusiness]);

  /* =======================================================
     CONTACT URLS
  ======================================================= */

  const whatsappNumbers = useMemo(
    () =>
      toContactList(
        (selectedBusiness as any)?.whatsappNumber ??
          (selectedBusiness as any)?.whatsappNumbers ??
          selectedBusiness?.contactPhone,
      ),
    [selectedBusiness],
  );

  const phoneNumbers = useMemo(
    () =>
      toContactList(
        (selectedBusiness as any)?.contactPhone ??
          (selectedBusiness as any)?.contactPhones ??
          selectedBusiness?.whatsappNumber,
      ),
    [selectedBusiness],
  );

  const emailAddresses = useMemo(
    () =>
      toContactList(
        (selectedBusiness as any)?.contactEmail ??
          (selectedBusiness as any)?.contactEmails,
      ),
    [selectedBusiness],
  );

  const buildWhatsAppHref = (rawNumber: string) => {
    const digits = rawNumber.replace(/\D/g, "");
    if (!digits) return "#";

    return `https://wa.me/${digits}?text=${encodeURIComponent(
      selectedItem
        ? `Hi ${selectedBusiness?.ownerName}, I saw "${selectedItem.name}" on StudentHub MKU and I'm interested in it.`
        : `Hi ${selectedBusiness?.ownerName}, I found "${selectedBusiness?.businessName}" on StudentHub MKU and would like to know more about your business.`,
    )}`;
  };

  const buildCallHref = (rawNumber: string) => {
    const clean = rawNumber.replace(/\s/g, "");
    return clean ? `tel:${clean}` : "#";
  };

  const buildEmailHref = (address: string) =>
    `mailto:${address}?subject=${encodeURIComponent(
      selectedItem
        ? `Inquiry: ${selectedItem.name} — StudentHub MKU`
        : `Inquiry: ${selectedBusiness?.businessName} — StudentHub MKU`,
    )}`;

  /* =======================================================
     SHARE
  ======================================================= */

  const handleShare = () => {
    if (!selectedBusiness) return;

    const url = `${window.location.origin}/marketplace?id=${encodeURIComponent(
      selectedBusiness.id,
    )}`;

    setShareData({
      isOpen: true,
      url,
      title: selectedItem?.name || selectedBusiness.businessName,
      category: "Portfolio",
    });
  };

  /* =======================================================
     RATING — works for authed + guest
  ======================================================= */

  const handleRateBusiness = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedBusiness) return;

    if (!userReview.trim()) {
      triggerToast("Please write a short review before submitting.", "error");
      return;
    }

    setRatingLoading(true);

    try {
      const isAuthed = !!currentUser;
      const reviewerId = isAuthed ? currentUser!.uid : getGuestDeviceId();

      const reviewerName = isAuthed
        ? profile?.name ||
          currentUser!.displayName ||
          currentUser!.email?.split("@")[0] ||
          "Student"
        : "Guest Student";

      const feedback: BusinessRating = {
        userId: reviewerId,
        userName: reviewerName,
        rating: userRating,
        review: userReview.trim(),
        timestamp: Date.now(),
      };

      const existingRatings = selectedBusiness.ratings || [];

      const combined = [
        feedback,
        ...existingRatings.filter((r) => r.userId !== reviewerId),
      ];

      const total = combined.reduce(
        (sum, rating) => sum + Number(rating.rating || 0),
        0,
      );

      const average = combined.length
        ? Number((total / combined.length).toFixed(1))
        : 0;

      const update: Partial<MarketplaceProfile> = {
        ratings: combined,
        overallRating: average,
      };

      await fbfs.setDocById(
        "marketplaceProfiles",
        selectedBusiness.id,
        update,
        true,
      );

      setBusinesses((previous) =>
        previous.map((business) =>
          business.id === selectedBusiness.id
            ? { ...business, ...update }
            : business,
        ),
      );

      setSelectedBusiness((previous) =>
        previous ? { ...previous, ...update } : null,
      );

      setUserReview("");
      setUserRating(5);

      triggerToast(
        isAuthed
          ? "Thanks for your review!"
          : "Thanks for your review! Sign in later to edit it.",
      );
    } catch (error) {
      console.error("Rating submission failed:", error);
      triggerToast("Unable to submit your review.", "error");
    } finally {
      setRatingLoading(false);
    }
  };

  /* =======================================================
     AUTH
  ======================================================= */

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        triggerToast("Welcome back.");
      } else {
        const credential = await createUserWithEmailAndPassword(
          auth,
          authEmail,
          authPassword,
        );

        const name = authName.trim() || authEmail.split("@")[0];

        await fbfs.setDocById("users", credential.user.uid, {
          uid: credential.user.uid,
          name,
          email: authEmail,
          role: "vendor",
          active: true,
          createdAt: Date.now(),
          lastActive: Date.now(),
        });

        triggerToast("Account created successfully.");
      }

      setAuthRequiredReason(null);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setAuthError("");
    } catch (error: any) {
      console.error("Marketplace authentication failed:", error);
      setAuthError(error?.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  /* =======================================================
     CURRENT CAMPAIGN
  ======================================================= */

  const currentCampaign = campaigns.length
    ? campaigns[campaignIndex % campaigns.length]
    : null;

  const campaignGradient = getCampaignGradient(currentCampaign);
  const campaignTextColor = getCampaignTextColor(currentCampaign);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="studenthub-marketplace">
      <style>{`
        .studenthub-marketplace {
          --mk-bg: #eef3f9;
          --mk-surface: #ffffff;
          --mk-surface-soft: #f6f8fc;
          --mk-text: #101828;
          --mk-muted: #697586;
          --mk-blue: #2457c5;
          --mk-blue-dark: #173d91;
          --mk-yellow: #fcdd09;
          --mk-green: #25d366;
          --mk-border: #dce4ef;
          --mk-shadow: 0 12px 35px rgba(25, 53, 95, 0.07);
          --mk-shadow-hover: 0 18px 45px rgba(25, 53, 95, 0.12);

          width: 100vw;
          max-width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);

          margin-top: -3rem;
          padding-top: 20px;

          min-height: 100vh;
          background: var(--mk-bg);
          color: var(--mk-text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;

          padding-bottom: 130px;
          overflow-x: hidden;
        }

        @media (min-width: 640px) {
          .studenthub-marketplace {
            margin-top: -3.5rem;
            padding-top: 20px;
          }
        }

        .dark .studenthub-marketplace,
        .dark-mode .studenthub-marketplace,
        [data-theme="dark"] .studenthub-marketplace {
          --mk-bg: #050505;
          --mk-surface: rgba(255, 255, 255, 0.05);
          --mk-surface-soft: rgba(255, 255, 255, 0.08);
          --mk-text: #ffffff;
          --mk-muted: rgba(255, 255, 255, 0.65);
          --mk-border: rgba(255, 255, 255, 0.1);
          --mk-blue: #fcdd09;
          --mk-blue-dark: #ffe83d;
          --mk-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
          --mk-shadow-hover: 0 18px 45px rgba(0, 0, 0, 0.6);
        }

        .mk-app {
          width: 100%;
          margin: 0;
          padding: 0 28px 70px;
        }

        .mk-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 0 18px;
        }

        .mk-header-search {
          flex: 1 1 auto;
          max-width: 560px;
          margin: 0 auto;
          height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          background: var(--mk-surface);
          border: 1px solid var(--mk-border);
          border-radius: 999px;
          transition: .2s ease;
          box-shadow: var(--mk-shadow);
        }

        .mk-header-search:focus-within {
          border-color: var(--mk-blue);
          box-shadow: 0 0 0 4px rgba(36, 87, 197, 0.1);
        }

        .mk-header-search svg {
          color: var(--mk-muted);
          flex-shrink: 0;
        }

        .mk-header-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--mk-text);
          font-size: 13px;
          font-family: inherit;
        }

        .mk-header-search input::placeholder {
          color: var(--mk-muted);
        }

        .mk-header-clear {
          border: 0;
          background: transparent;
          padding: 4px;
          color: var(--mk-muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          border-radius: 50%;
          transition: .15s ease;
        }

        .mk-header-clear:hover {
          background: var(--mk-surface-soft);
          color: var(--mk-text);
        }

        .mk-page-intro {
          padding: 6px 0 22px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 40px;
        }

        .mk-intro-left {
          flex: 1;
          min-width: 280px;
        }

        .mk-intro-right {
          flex: 1.2;
          max-width: 620px;
          margin-bottom: 5px;
        }

        .mk-page-intro h1 {
          margin: 0;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1;
          letter-spacing: -.055em;
          font-weight: 900;
          color: var(--mk-text);
        }

        .mk-page-intro p {
          margin: 0;
          color: var(--mk-muted);
          font-size: 13px;
          line-height: 1.65;
        }

        .mk-campaign {
          margin-top: 8px;
          min-height: 264px;
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          color: #ffffff;
          box-shadow: 0 24px 60px rgba(20, 48, 110, 0.28);
          isolation: isolate;
          transition: background .4s ease;
        }

        .mk-campaign-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 36px 36px;
          opacity: .55;
          pointer-events: none;
        }

        .mk-campaign-circle {
          position: absolute;
          width: 560px;
          height: 560px;
          right: -200px;
          top: -270px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 50%;
          pointer-events: none;
        }

        .mk-campaign-image {
          position: absolute;
          inset: 0 0 0 35%;
          width: 65%;
          height: 100%;
          object-fit: cover;
          opacity: .82;
          mix-blend-mode: luminosity;
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0,0,0,.1) 15%,
            rgba(0,0,0,.4) 38%,
            rgba(0,0,0,.9) 75%,
            black 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            rgba(0,0,0,.1) 15%,
            rgba(0,0,0,.4) 38%,
            rgba(0,0,0,.9) 75%,
            black 100%
          );
        }

        .mk-campaign-content {
          position: relative;
          z-index: 3;
          min-height: 264px;
          padding: 32px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
        }

        .mk-campaign-copy {
          max-width: 650px;
        }

        .mk-campaign-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          margin-bottom: 10px;
          border-radius: 7px;
          background: rgba(252,221,9,.98);
          color: #151515;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .mk-campaign-tag::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #111;
        }

        .mk-campaign-copy h2 {
          margin: 0 0 10px;
          font-size: clamp(26px, 3.4vw, 42px);
          line-height: 1.02;
          letter-spacing: -.05em;
          text-shadow: 0 4px 24px rgba(0,0,0,.25);
        }

        .mk-campaign-copy p {
          margin: 0;
          max-width: 550px;
          color: rgba(255,255,255,.85);
          font-size: 13px;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mk-campaign-business {
          margin-top: 10px;
          color: rgba(255,255,255,.7);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
        }

        .mk-campaign-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 11px 18px;
          border: 0;
          border-radius: 12px;
          background: var(--mk-yellow);
          color: #171717;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          transition: .2s ease;
        }

        .mk-campaign-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(252,221,9,.35);
        }

        .mk-campaign-stat {
          flex-shrink: 0;
          min-width: 190px;
          padding: 22px 24px;
          border-left: 1px solid rgba(255,255,255,.2);
          text-align: right;
        }

        .mk-campaign-stat strong {
          display: block;
          font-size: 26px;
          letter-spacing: -.03em;
          line-height: 1.1;
          font-weight: 900;
          text-transform: uppercase;
        }

        .mk-campaign-stat span {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.7);
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .mk-campaign-controls {
          position: absolute;
          z-index: 5;
          right: 25px;
          bottom: 24px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mk-campaign-control {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 50%;
          background: rgba(0,0,0,.25);
          color: white;
          cursor: pointer;
          transition: .2s ease;
        }

        .mk-campaign-control:hover {
          background: rgba(0,0,0,.45);
        }

        .mk-campaign-dots {
          display: flex;
          gap: 4px;
          margin: 0 6px;
        }

        .mk-campaign-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,.35);
          transition: .2s ease;
        }

        .mk-campaign-dot.active {
          width: 17px;
          border-radius: 999px;
          background: var(--mk-yellow);
        }

        .mk-section {
          margin-top: 34px;
        }

        .mk-section-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-bottom: 13px;
        }

        .mk-section-title {
          margin: 0;
          font-size: 18px;
          letter-spacing: -.025em;
          font-weight: 850;
          color: var(--mk-text);
        }

        .mk-section-description {
          margin-top: 3px;
          color: var(--mk-muted);
          font-size: 11px;
        }

        .mk-section-link {
          color: var(--mk-blue);
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .mk-search-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          border-radius: 14px;
          background: var(--mk-surface);
          border: 1px solid var(--mk-border);
          box-shadow: var(--mk-shadow);
        }

        .mk-search-banner-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .mk-search-banner-text strong {
          font-size: 13px;
          font-weight: 800;
          color: var(--mk-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mk-search-banner-text span {
          font-size: 11px;
          color: var(--mk-muted);
        }

        .mk-search-clear {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          background: var(--mk-surface-soft);
          border: 1px solid var(--mk-border);
          color: var(--mk-text);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: .15s ease;
        }

        .mk-search-clear:hover {
          background: var(--mk-blue);
          color: #fff;
          border-color: var(--mk-blue);
        }

        .mk-market-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }

        .mk-market-card {
          min-width: 0;
          background: var(--mk-surface);
          border: 1px solid var(--mk-border);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: transform .2s ease, box-shadow .2s ease,
            border-color .2s ease;
        }

        .mk-market-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--mk-shadow-hover);
          border-color: rgba(36,87,197,.35);
        }

        .dark .mk-market-card:hover,
        .dark-mode .mk-market-card:hover,
        [data-theme="dark"] .mk-market-card:hover {
          border-color: rgba(252,221,9,.4);
        }

        .mk-card-image {
          height: 145px;
          position: relative;
          overflow: hidden;
          background: var(--mk-surface-soft);
        }

        .mk-card-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform .35s ease;
        }

        .mk-market-card:hover .mk-card-image img {
          transform: scale(1.045);
        }

        .mk-card-no-image {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: var(--mk-muted);
        }

        .mk-card-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 5px 7px;
          border-radius: 6px;
          background: var(--mk-yellow);
          color: #171717;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .mk-card-body {
          padding: 11px;
        }

        .mk-card-type {
          color: var(--mk-blue);
          font-size: 8px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .mk-card-title {
          margin-top: 5px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mk-text);
        }

        .mk-card-price {
          margin-top: 5px;
          font-size: 12px;
          font-weight: 850;
          color: var(--mk-text);
        }

        .mk-card-meta {
          margin-top: 4px;
          color: var(--mk-muted);
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mk-card-seller {
          margin-top: 9px;
          padding-top: 8px;
          border-top: 1px solid var(--mk-border);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mk-seller-dot {
          width: 19px;
          height: 19px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--mk-blue);
          color: white;
          font-size: 7px;
          font-weight: 800;
        }

        .mk-seller-name {
          min-width: 0;
          color: var(--mk-muted);
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mk-business-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .mk-business-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid var(--mk-border);
          background: var(--mk-surface);
          border-radius: 14px;
          cursor: pointer;
          transition: .2s ease;
        }

        .mk-business-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--mk-shadow);
        }

        .mk-business-image {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 11px;
          overflow: hidden;
          background: var(--mk-surface-soft);
          display: grid;
          place-items: center;
          color: var(--mk-muted);
        }

        .mk-business-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mk-business-info {
          min-width: 0;
        }

        .mk-business-info strong {
          display: block;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--mk-text);
        }

        .mk-business-info span {
          display: block;
          margin-top: 4px;
          color: var(--mk-muted);
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mk-detail-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          background: rgba(10,20,38,.55);
          backdrop-filter: blur(8px);
        }

        .mk-detail-panel {
          width: min(1100px, 100%);
          max-height: 94vh;
          overflow-y: auto;
          background: var(--mk-surface);
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -20px 70px rgba(0,0,0,.18);
        }

        .mk-detail-top {
          position: sticky;
          top: 0;
          z-index: 5;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 22px;
          background: var(--mk-surface);
          backdrop-filter: blur(15px);
          border-bottom: 1px solid var(--mk-border);
        }

        .mk-detail-top span {
          color: var(--mk-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .mk-close {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid var(--mk-border);
          border-radius: 50%;
          background: var(--mk-surface);
          color: var(--mk-text);
          cursor: pointer;
        }

        .mk-detail-content {
          padding: 25px;
        }

        .mk-detail-hero {
          display: grid;
          grid-template-columns: .95fr 1.05fr;
          gap: 30px;
        }

        .mk-detail-main-image {
          height: 360px;
          overflow: hidden;
          border-radius: 17px;
          background: var(--mk-surface-soft);
        }

        .mk-detail-main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mk-no-detail-image {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: var(--mk-muted);
        }

        .mk-detail-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mk-detail-type {
          color: var(--mk-blue);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .mk-detail-title {
          margin: 8px 0 0;
          font-size: clamp(27px,4vw,42px);
          line-height: 1;
          letter-spacing: -.05em;
          font-weight: 900;
          color: var(--mk-text);
        }

        .mk-detail-price {
          margin-top: 14px;
          font-size: 21px;
          font-weight: 850;
          color: var(--mk-text);
        }

        .mk-detail-description {
          margin-top: 13px;
          max-width: 530px;
          color: var(--mk-muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .mk-detail-location {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--mk-muted);
          font-size: 11px;
        }

        .mk-contact {
          margin-top: 22px;
          padding: 18px;
          background: var(--mk-surface-soft);
          border: 1px solid var(--mk-border);
          border-radius: 16px;
        }

        .mk-contact-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--mk-muted);
        }

        .mk-contact-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .mk-contact-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--mk-border);
          border-radius: 12px;
          background: var(--mk-surface);
          color: var(--mk-text);
          text-decoration: none;
          transition: .15s ease;
        }

        .mk-contact-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(25,53,95,.08);
        }

        .mk-contact-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: white;
        }

        .mk-contact-icon.whatsapp { background: var(--mk-green); }
        .mk-contact-icon.call { background: var(--mk-blue); }
        .mk-contact-icon.email { background: #475569; }

        .mk-contact-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .mk-contact-text small {
          color: var(--mk-muted);
          font-size: 9px;
          text-transform: uppercase;
        }

        .mk-contact-text strong {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mk-share-row {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
        }

        .mk-share {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          border: 1px solid var(--mk-border);
          border-radius: 11px;
          background: var(--mk-surface);
          color: var(--mk-text);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .mk-seller-profile {
          margin-top: 30px;
          padding-top: 25px;
          border-top: 1px solid var(--mk-border);
        }

        .mk-seller-profile-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mk-large-avatar {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--mk-blue);
          color: white;
          font-size: 12px;
          font-weight: 850;
        }

        .mk-seller-profile h3 {
          margin: 0;
          font-size: 14px;
          color: var(--mk-text);
        }

        .mk-seller-profile p {
          margin: 4px 0 0;
          color: var(--mk-muted);
          font-size: 10px;
        }

        .mk-seller-items {
          margin-top: 28px;
        }

        .mk-seller-items h3 {
          margin: 0 0 12px;
          font-size: 16px;
          color: var(--mk-text);
        }

        .mk-seller-item-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
        }

        .mk-mini-item {
          overflow: hidden;
          border: 1px solid var(--mk-border);
          border-radius: 12px;
          background: var(--mk-surface);
          cursor: pointer;
        }

        .mk-mini-item-image {
          height: 125px;
          overflow: hidden;
          background: var(--mk-surface-soft);
        }

        .mk-mini-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mk-mini-item-body {
          padding: 9px;
        }

        .mk-mini-item-body strong {
          display: block;
          font-size: 10px;
          color: var(--mk-text);
        }

        .mk-mini-item-body span {
          display: block;
          margin-top: 4px;
          color: var(--mk-muted);
          font-size: 9px;
        }

        .mk-rating-section {
          margin-top: 30px;
          padding-top: 25px;
          border-top: 1px solid var(--mk-border);
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 25px;
        }

        .mk-rating-box,
        .mk-review-box {
          padding: 18px;
          background: var(--mk-surface-soft);
          border: 1px solid var(--mk-border);
          border-radius: 16px;
        }

        .mk-rating-box h3,
        .mk-review-box h3 {
          margin: 0 0 15px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--mk-text);
        }

        .mk-stars {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
        }

        .mk-star-button {
          border: 0;
          padding: 2px;
          background: transparent;
          color: #b9c2cf;
          cursor: pointer;
        }

        .mk-star-button.active {
          color: #eab308;
        }

        .mk-rating-textarea {
          width: 100%;
          min-height: 90px;
          resize: vertical;
          border: 1px solid var(--mk-border);
          border-radius: 10px;
          background: var(--mk-surface);
          color: var(--mk-text);
          padding: 10px;
          font-size: 11px;
          outline: none;
          font-family: inherit;
        }

        .mk-rating-submit {
          width: 100%;
          margin-top: 9px;
          padding: 11px;
          border: 0;
          border-radius: 10px;
          background: var(--mk-blue);
          color: white;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .dark .mk-rating-submit,
        .dark-mode .mk-rating-submit,
        [data-theme="dark"] .mk-rating-submit {
          color: #111111;
        }

        .mk-rating-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mk-review-list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mk-review {
          padding: 11px;
          border: 1px solid var(--mk-border);
          border-radius: 10px;
          background: var(--mk-surface);
        }

        .mk-review-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
          color: var(--mk-text);
        }

        .mk-review-name {
          font-weight: 800;
        }

        .mk-review-rating {
          display: flex;
          align-items: center;
          gap: 3px;
          color: #ca8a04;
        }

        .mk-review-text {
          margin: 7px 0 0;
          color: var(--mk-muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .mk-auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(8,18,35,.72);
          backdrop-filter: blur(10px);
        }

        .mk-auth-panel {
          width: min(420px,100%);
          padding: 25px;
          background: var(--mk-surface);
          border-radius: 20px;
          box-shadow: 0 30px 90px rgba(0,0,0,.3);
        }

        .mk-auth-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .mk-auth-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--mk-surface-soft);
          color: var(--mk-blue);
        }

        .mk-auth-close {
          border: 0;
          background: transparent;
          color: var(--mk-muted);
          cursor: pointer;
        }

        .mk-auth-panel h2 {
          margin: 16px 0 5px;
          font-size: 20px;
          letter-spacing: -.03em;
          color: var(--mk-text);
        }

        .mk-auth-panel p {
          margin: 0;
          color: var(--mk-muted);
          font-size: 11px;
          line-height: 1.6;
        }

        .mk-auth-form {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .mk-auth-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border: 1px solid var(--mk-border);
          border-radius: 10px;
          outline: none;
          font-size: 12px;
          color: var(--mk-text);
          background: var(--mk-surface-soft);
          font-family: inherit;
        }

        .mk-auth-input:focus {
          border-color: var(--mk-blue);
        }

        .mk-auth-submit {
          height: 42px;
          border: 0;
          border-radius: 10px;
          background: var(--mk-blue);
          color: white;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .dark .mk-auth-submit,
        .dark-mode .mk-auth-submit,
        [data-theme="dark"] .mk-auth-submit {
          color: #111111;
        }

        .mk-auth-toggle {
          margin-top: 15px;
          padding-top: 14px;
          border-top: 1px solid var(--mk-border);
          text-align: center;
          color: var(--mk-muted);
          font-size: 10px;
        }

        .mk-auth-toggle button {
          border: 0;
          background: transparent;
          color: var(--mk-blue);
          font-weight: 800;
          cursor: pointer;
        }

        .mk-empty {
          padding: 55px 20px;
          text-align: center;
          border: 1px dashed var(--mk-border);
          border-radius: 16px;
          background: var(--mk-surface);
        }

        .mk-empty-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 10px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--mk-surface-soft);
          color: var(--mk-muted);
          border: 1px solid var(--mk-border);
        }

        .mk-empty strong {
          display: block;
          font-size: 13px;
          color: var(--mk-text);
        }

        .mk-empty p {
          margin: 5px auto 0;
          max-width: 420px;
          color: var(--mk-muted);
          font-size: 11px;
          line-height: 1.6;
        }

        .mk-toast {
          position: fixed;
          right: 20px;
          top: 20px;
          z-index: 300;
          max-width: 360px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 15px;
          background: var(--mk-surface);
          border: 1px solid var(--mk-border);
          border-radius: 12px;
          box-shadow: 0 18px 45px rgba(20,42,82,.15);
          font-size: 11px;
          color: var(--mk-text);
        }

        .mk-toast-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #22c55e;
        }

        .mk-toast-dot.error {
          background: #ef4444;
        }

        @media (max-width: 1200px) {
          .mk-market-grid {
            grid-template-columns: repeat(4, minmax(0,1fr));
          }
          .mk-business-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 900px) {
          .mk-campaign {
            min-height: 228px;
          }
          .mk-campaign-content {
            min-height: 228px;
            padding: 26px 34px;
          }
          .mk-campaign-stat {
            min-width: 145px;
          }
          .mk-rating-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .mk-app {
            padding-left: 16px;
            padding-right: 16px;
          }

          .mk-header {
            gap: 12px;
            padding: 6px 0 14px;
          }

          .mk-header-search {
            height: 44px;
            max-width: 100%;
          }

          .mk-page-intro {
            display: block;
            padding: 4px 0 18px;
          }

          .mk-intro-right {
            max-width: none;
            margin-top: 15px;
            margin-bottom: 0;
          }

          .mk-campaign {
            min-height: 234px;
            border-radius: 20px;
          }

          .mk-campaign-image {
            inset: 0;
            width: 100%;
            opacity: .5;
            mask-image: none;
            -webkit-mask-image: none;
          }

          .mk-campaign-content {
            min-height: 234px;
            padding: 22px 24px;
            display: block;
          }

          .mk-campaign-copy h2 {
            font-size: clamp(28px, 8vw, 38px);
          }

          .mk-campaign-stat {
            margin-top: 24px;
            padding: 16px 0 0;
            border-left: 0;
            border-top: 1px solid rgba(255,255,255,.18);
            text-align: left;
          }

          .mk-campaign-stat strong {
            font-size: 22px;
          }

          .mk-market-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 9px;
          }

          .mk-card-image {
            height: 150px;
          }

          .mk-business-grid {
            grid-template-columns: 1fr;
          }

          .mk-detail-hero {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .mk-detail-main-image {
            height: 280px;
          }

          .mk-seller-item-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 430px) {
          .mk-page-intro h1 {
            font-size: 34px;
          }

          .mk-page-intro p {
            font-size: 12px;
          }

          .mk-campaign-copy h2 {
            font-size: 27px;
          }

          .mk-card-image {
            height: 125px;
          }

          .mk-card-body {
            padding: 9px;
          }

          .mk-card-title {
            font-size: 11px;
          }

          .mk-card-price {
            font-size: 11px;
          }

          .mk-card-meta {
            font-size: 8px;
          }

          .mk-detail-content {
            padding: 17px;
          }
        }
      `}</style>

      <div className="mk-app">
        <header className="mk-header">
          <Link href="/" className="mk-logo">
            <div className="mk-logo-mark">S</div>
            <span style={{ display: "none" }}>StudentHub</span>
          </Link>

          <div className="mk-header-search">
            <Search size={16} />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="text"
              autoComplete="off"
              placeholder="Search StudentHub marketplace..."
              aria-label="Search StudentHub marketplace"
            />

            {searchTerm && (
              <button
                type="button"
                className="mk-header-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </header>

        {isSearching ? (
          <section className="mk-section" style={{ marginTop: 8 }}>
            <div className="mk-search-banner">
              <div className="mk-search-banner-text">
                <strong>Results for &ldquo;{searchTerm.trim()}&rdquo;</strong>
                <span>
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1 ? "listing" : "listings"} found
                </span>
              </div>

              <button
                type="button"
                className="mk-search-clear"
                onClick={() => setSearchTerm("")}
              >
                <X size={13} />
                Clear search
              </button>
            </div>

            {loading ? (
              <div className="mk-empty">
                <div className="mk-empty-icon">
                  <Store size={20} />
                </div>
                <strong>Loading marketplace</strong>
                <p>Fetching current products from StudentHub.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="mk-empty">
                <div className="mk-empty-icon">
                  <Search size={20} />
                </div>
                <strong>No listings found</strong>
                <p>Try another product, business, category or location.</p>
              </div>
            ) : (
              <div className="mk-market-grid">
                {filteredItems.map(({ business, item, itemIndex, image }) => (
                  <article
                    key={`${business.id}-${itemIndex}-${item.name}`}
                    className="mk-market-card"
                    onClick={() => openItem(business, item, itemIndex)}
                  >
                    <div className="mk-card-image">
                      {image ? (
                        <img
                          src={image}
                          alt={item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="mk-card-no-image">
                          <ImageIcon size={23} />
                        </div>
                      )}

                      {item.isPromo && (
                        <span className="mk-card-badge">
                          {item.promoTag || "Offer"}
                        </span>
                      )}
                    </div>

                    <div className="mk-card-body">
                      <div className="mk-card-type">{business.category}</div>
                      <div className="mk-card-title">{item.name}</div>
                      <div className="mk-card-price">{getPrice(item)}</div>
                      <div className="mk-card-meta">{business.location}</div>

                      <div className="mk-card-seller">
                        <div className="mk-seller-dot">
                          {getInitials(business.businessName)}
                        </div>
                        <div className="mk-seller-name">
                          {business.businessName}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mk-page-intro">
              <div className="mk-intro-left">
                <h1>MARKETPLACE</h1>
              </div>

              <div className="mk-intro-right">
                <p>
                  Discover books, electronics, accommodation, services and
                  essentials curated by fellow students and businesses around
                  MKU. Safely discover and connect within the campus community.
                </p>
              </div>
            </section>

            <section
              className="mk-campaign"
              style={{ background: campaignGradient }}
            >
              {currentCampaign?.image && (
                <img
                  className="mk-campaign-image"
                  src={currentCampaign.image}
                  alt={currentCampaign.title}
                  referrerPolicy="no-referrer"
                />
              )}

              <div className="mk-campaign-grid" />
              <div className="mk-campaign-circle" />

              <div className="mk-campaign-content">
                {currentCampaign ? (
                  <>
                    <div className="mk-campaign-copy">
                      <div className="mk-campaign-tag">
                        {currentCampaign.tag || "CAMPAIGN"}
                      </div>

                      <h2 style={{ color: campaignTextColor }}>
                        {currentCampaign.title}
                      </h2>

                      <p>{currentCampaign.description}</p>

                      <div className="mk-campaign-business">
                        Offered by {currentCampaign.business.businessName}
                        {currentCampaign.business.location
                          ? ` · ${currentCampaign.business.location}`
                          : ""}
                      </div>

                      <button
                        type="button"
                        className="mk-campaign-cta"
                        onClick={() => {
                          if (currentCampaign.item) {
                            openItem(
                              currentCampaign.business,
                              currentCampaign.item,
                              currentCampaign.business.catalog?.indexOf(
                                currentCampaign.item,
                              ) ?? -1,
                            );
                          } else {
                            openBusiness(currentCampaign.business);
                          }
                        }}
                      >
                        View campaign
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="mk-campaign-stat">
                      <strong>{currentCampaign.discountText || "OFFER"}</strong>
                      <span>Current campaign</span>
                    </div>
                  </>
                ) : (
                  <div className="mk-campaign-copy">
                    <div className="mk-campaign-tag">StudentHub MKU</div>

                    <h2>What MKU is buying, selling & building.</h2>

                    <p>
                      Student businesses, products and services appear here when
                      vendors publish them through StudentHub.
                    </p>

                    <button
                      type="button"
                      className="mk-campaign-cta"
                      onClick={() =>
                        document
                          .getElementById("around-campus")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Explore listings
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {campaigns.length > 1 && (
                <div className="mk-campaign-controls">
                  <button
                    type="button"
                    className="mk-campaign-control"
                    onClick={() =>
                      setCampaignIndex(
                        (previous) =>
                          (previous - 1 + campaigns.length) % campaigns.length,
                      )
                    }
                    aria-label="Previous campaign"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <div className="mk-campaign-dots">
                    {campaigns.slice(0, 6).map((campaign, index) => (
                      <button
                        key={`${campaign.business.id}-${index}`}
                        type="button"
                        className={`mk-campaign-dot ${
                          index === campaignIndex ? "active" : ""
                        }`}
                        onClick={() => setCampaignIndex(index)}
                        aria-label={`Campaign ${index + 1}`}
                        style={{ border: 0, padding: 0, cursor: "pointer" }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="mk-campaign-control"
                    onClick={() =>
                      setCampaignIndex(
                        (previous) => (previous + 1) % campaigns.length,
                      )
                    }
                    aria-label="Next campaign"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </section>

            <section className="mk-section" id="around-campus">
              <div className="mk-section-head">
                <div>
                  <h2 className="mk-section-title">Around campus</h2>

                  <div className="mk-section-description">
                    Recently listed on StudentHub
                  </div>
                </div>

                <span className="mk-section-link">
                  {filteredItems.length} listings
                </span>
              </div>

              {loading ? (
                <div className="mk-empty">
                  <div className="mk-empty-icon">
                    <Store size={20} />
                  </div>
                  <strong>Loading marketplace</strong>
                  <p>Fetching current products from StudentHub.</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="mk-empty">
                  <div className="mk-empty-icon">
                    <Search size={20} />
                  </div>
                  <strong>No listings yet</strong>
                  <p>
                    StudentHub has no marketplace catalog items published yet.
                  </p>
                </div>
              ) : (
                <div className="mk-market-grid">
                  {filteredItems.map(({ business, item, itemIndex, image }) => (
                    <article
                      key={`${business.id}-${itemIndex}-${item.name}`}
                      className="mk-market-card"
                      onClick={() => openItem(business, item, itemIndex)}
                    >
                      <div className="mk-card-image">
                        {image ? (
                          <img
                            src={image}
                            alt={item.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="mk-card-no-image">
                            <ImageIcon size={23} />
                          </div>
                        )}

                        {item.isPromo && (
                          <span className="mk-card-badge">
                            {item.promoTag || "Offer"}
                          </span>
                        )}
                      </div>

                      <div className="mk-card-body">
                        <div className="mk-card-type">{business.category}</div>
                        <div className="mk-card-title">{item.name}</div>
                        <div className="mk-card-price">{getPrice(item)}</div>
                        <div className="mk-card-meta">{business.location}</div>

                        <div className="mk-card-seller">
                          <div className="mk-seller-dot">
                            {getInitials(business.businessName)}
                          </div>
                          <div className="mk-seller-name">
                            {business.businessName}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mk-section">
              <div className="mk-section-head">
                <div>
                  <h2 className="mk-section-title">Businesses around MKU</h2>
                  <div className="mk-section-description">
                    Student-owned businesses and local services
                  </div>
                </div>

                <span className="mk-section-link">
                  {businesses.length} businesses
                </span>
              </div>

              {businesses.length === 0 ? (
                <div className="mk-empty">
                  <div className="mk-empty-icon">
                    <Store size={20} />
                  </div>
                  <strong>No businesses yet</strong>
                  <p>Published marketplace businesses will appear here.</p>
                </div>
              ) : (
                <div className="mk-business-grid">
                  {businesses.map((business) => (
                    <article
                      key={business.id}
                      className="mk-business-card"
                      onClick={() => openBusiness(business)}
                    >
                      <div className="mk-business-image">
                        {business.images?.[0] ? (
                          <img
                            src={business.images[0]}
                            alt={business.businessName}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Store size={20} />
                        )}
                      </div>

                      <div className="mk-business-info">
                        <strong>{business.businessName}</strong>
                        <span>
                          {business.category}
                          {" · "}
                          {business.location}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* DETAIL PANEL */}
      {selectedBusiness && (
        <div
          className="mk-detail-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDetail();
            }
          }}
        >
          <div className="mk-detail-panel">
            <div className="mk-detail-top">
              <span>StudentHub Marketplace</span>

              <button
                type="button"
                className="mk-close"
                onClick={closeDetail}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mk-detail-content">
              <div className="mk-detail-hero">
                <div>
                  <div className="mk-detail-main-image">
                    {detailImage ? (
                      <img
                        src={detailImage}
                        alt={
                          selectedItem?.name || selectedBusiness.businessName
                        }
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="mk-no-detail-image">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>

                  {!selectedItem && detailImages.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 8,
                        overflowX: "auto",
                      }}
                    >
                      {detailImages.map((image, index) => (
                        <button
                          key={`${selectedBusiness.id}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          style={{
                            width: 58,
                            height: 48,
                            flexShrink: 0,
                            overflow: "hidden",
                            padding: 0,
                            border:
                              index === activeImageIndex
                                ? "2px solid var(--mk-blue)"
                                : "1px solid var(--mk-border)",
                            borderRadius: 8,
                            background: "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <img
                            src={image}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mk-detail-info">
                  <div className="mk-detail-type">
                    {selectedItem ? selectedBusiness.category : "Business"}
                  </div>

                  <h2 className="mk-detail-title">
                    {selectedItem
                      ? selectedItem.name
                      : selectedBusiness.businessName}
                  </h2>

                  {selectedItem && (
                    <div className="mk-detail-price">
                      {getPrice(selectedItem)}
                    </div>
                  )}

                  <p className="mk-detail-description">
                    {selectedItem
                      ? selectedItem.description
                      : selectedBusiness.description}
                  </p>

                  <div className="mk-detail-location">
                    <MapPin size={13} />
                    <span>{selectedBusiness.location}</span>
                  </div>

                  {selectedBusiness.hours && (
                    <div className="mk-detail-location">
                      <Clock size={13} />
                      <span>{selectedBusiness.hours}</span>
                    </div>
                  )}

                  <div className="mk-contact">
                    <h4 className="mk-contact-title">Contact seller</h4>

                    <div className="mk-contact-list">
                      {whatsappNumbers.map((number, index) => (
                        <a
                          key={`wa-${index}-${number}`}
                          href={buildWhatsAppHref(number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mk-contact-btn"
                        >
                          <span className="mk-contact-icon whatsapp">
                            <WhatsAppIcon size={18} />
                          </span>

                          <span className="mk-contact-text">
                            <small>
                              WhatsApp
                              {whatsappNumbers.length > 1
                                ? ` ${index + 1}`
                                : ""}
                            </small>
                            <strong>{number}</strong>
                          </span>
                        </a>
                      ))}

                      {phoneNumbers.map((number, index) => (
                        <a
                          key={`call-${index}-${number}`}
                          href={buildCallHref(number)}
                          className="mk-contact-btn"
                        >
                          <span className="mk-contact-icon call">
                            <Phone size={18} />
                          </span>

                          <span className="mk-contact-text">
                            <small>
                              Call
                              {phoneNumbers.length > 1 ? ` ${index + 1}` : ""}
                            </small>
                            <strong>{number}</strong>
                          </span>
                        </a>
                      ))}

                      {emailAddresses.map((address, index) => (
                        <a
                          key={`email-${index}-${address}`}
                          href={buildEmailHref(address)}
                          className="mk-contact-btn"
                        >
                          <span className="mk-contact-icon email">
                            <Mail size={18} />
                          </span>

                          <span className="mk-contact-text">
                            <small>
                              Email
                              {emailAddresses.length > 1 ? ` ${index + 1}` : ""}
                            </small>
                            <strong>{address}</strong>
                          </span>
                        </a>
                      ))}
                    </div>

                    <div className="mk-share-row">
                      <button
                        type="button"
                        className="mk-share"
                        onClick={handleShare}
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SELLER */}
              <div className="mk-seller-profile">
                <div className="mk-seller-profile-head">
                  <div className="mk-large-avatar">
                    {getInitials(selectedBusiness.businessName)}
                  </div>

                  <div>
                    <h3>{selectedBusiness.businessName}</h3>
                    <p>{selectedBusiness.ownerName || "StudentHub seller"}</p>
                  </div>
                </div>
              </div>

              {/* MORE FROM SELLER */}
              <div className="mk-seller-items">
                <h3>
                  {selectedItem
                    ? "More from this seller"
                    : "Products & services"}
                </h3>

                {sellerItems.length > 0 ? (
                  <div className="mk-seller-item-grid">
                    {sellerItems.map((item, index) => (
                      <div
                        key={`${selectedBusiness.id}-${index}`}
                        className="mk-mini-item"
                        onClick={() => openItem(selectedBusiness, item, index)}
                      >
                        <div className="mk-mini-item-image">
                          {getImage(selectedBusiness, item) ? (
                            <img
                              src={getImage(selectedBusiness, item)}
                              alt={item.name}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "grid",
                                placeItems: "center",
                                color: "var(--mk-muted)",
                              }}
                            >
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>

                        <div className="mk-mini-item-body">
                          <strong>{item.name}</strong>
                          <span>{getPrice(item)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mk-empty">
                    <div className="mk-empty-icon">
                      <Store size={20} />
                    </div>
                    <strong>No catalog items</strong>
                    <p>
                      This business has not published individual catalog items
                      yet.
                    </p>
                  </div>
                )}
              </div>

              {/* RATINGS — works for authed + guest */}
              <div className="mk-rating-section">
                <div className="mk-rating-box">
                  <h3>Rate this business</h3>

                  {(() => {
                    const myReviewerId = currentUser
                      ? currentUser.uid
                      : getGuestDeviceId();
                    const myExistingReview = (
                      selectedBusiness.ratings || []
                    ).find((r) => r.userId === myReviewerId);

                    return (
                      <>
                        {myExistingReview && (
                          <div
                            style={{
                              padding: 10,
                              marginBottom: 12,
                              borderRadius: 10,
                              background: "var(--mk-surface)",
                              border: "1px solid var(--mk-border)",
                              fontSize: 11,
                              color: "var(--mk-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Star size={11} fill="#eab308" color="#eab308" />
                            <span>
                              You already reviewed this —{" "}
                              <strong style={{ color: "var(--mk-text)" }}>
                                {myExistingReview.rating}/5
                              </strong>
                              . Submitting again will update it.
                            </span>
                          </div>
                        )}

                        <form onSubmit={handleRateBusiness}>
                          <div className="mk-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className={`mk-star-button ${
                                  userRating >= star ? "active" : ""
                                }`}
                                onClick={() => setUserRating(star)}
                                aria-label={`${star} star${
                                  star === 1 ? "" : "s"
                                }`}
                              >
                                <Star
                                  size={19}
                                  fill={
                                    userRating >= star ? "currentColor" : "none"
                                  }
                                />
                              </button>
                            ))}
                          </div>

                          <textarea
                            className="mk-rating-textarea"
                            placeholder={
                              currentUser
                                ? "Share your experience..."
                                : "Share your experience (sign in not required)..."
                            }
                            value={userReview}
                            onChange={(event) =>
                              setUserReview(event.target.value)
                            }
                          />

                          <button
                            type="submit"
                            className="mk-rating-submit"
                            disabled={ratingLoading || !userReview.trim()}
                          >
                            {ratingLoading
                              ? "Submitting..."
                              : currentUser
                                ? "Submit review"
                                : "Submit as guest"}
                          </button>

                          {!currentUser && (
                            <p
                              style={{
                                marginTop: 8,
                                fontSize: 10,
                                color: "var(--mk-muted)",
                                textAlign: "center",
                                lineHeight: 1.5,
                              }}
                            >
                              Reviews are public. Consider{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  setAuthRequiredReason(
                                    "Sign in to submit reviews with your name attached.",
                                  )
                                }
                                style={{
                                  background: "transparent",
                                  border: 0,
                                  color: "var(--mk-blue)",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  fontSize: 10,
                                  padding: 0,
                                }}
                              >
                                signing in
                              </button>{" "}
                              to use your real name.
                            </p>
                          )}
                        </form>
                      </>
                    );
                  })()}
                </div>

                <div className="mk-review-box">
                  <h3>Student reviews</h3>

                  <div className="mk-review-list">
                    {(selectedBusiness.ratings || []).map((review, index) => (
                      <div
                        className="mk-review"
                        key={`${review.userId}-${index}`}
                      >
                        <div className="mk-review-head">
                          <span className="mk-review-name">
                            <UserIcon
                              size={11}
                              style={{
                                verticalAlign: "middle",
                                marginRight: 4,
                              }}
                            />
                            {review.userName}
                            {review.userId?.startsWith("guest_") && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 8,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  background: "var(--mk-surface-soft)",
                                  color: "var(--mk-muted)",
                                }}
                              >
                                Guest
                              </span>
                            )}
                          </span>

                          <span className="mk-review-rating">
                            <Star size={10} fill="currentColor" />
                            {review.rating}
                          </span>
                        </div>

                        {review.review && (
                          <p className="mk-review-text">
                            &ldquo;{review.review}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}

                    {(selectedBusiness.ratings || []).length === 0 && (
                      <div className="mk-empty">
                        <div className="mk-empty-icon">
                          <Star size={19} />
                        </div>
                        <strong>No reviews yet</strong>
                        <p>Be the first student to review this business.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTH OVERLAY */}
      {authRequiredReason && (
        <div className="mk-auth-overlay">
          <div className="mk-auth-panel">
            <div className="mk-auth-head">
              <div className="mk-auth-icon">
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
              </div>

              <button
                type="button"
                className="mk-auth-close"
                onClick={() => setAuthRequiredReason(null)}
              >
                <X size={18} />
              </button>
            </div>

            <h2>Marketplace account required</h2>
            <p>{authRequiredReason}</p>

            {authError && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 9,
                  background: "rgba(190, 18, 60, 0.1)",
                  color: "#be123c",
                  fontSize: 10,
                }}
              >
                {authError}
              </div>
            )}

            <form className="mk-auth-form" onSubmit={handleAuthSubmit}>
              {!isLogin && (
                <input
                  className="mk-auth-input"
                  type="text"
                  required
                  placeholder="Full name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                />
              )}

              <input
                className="mk-auth-input"
                type="email"
                required
                placeholder="Email address"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />

              <input
                className="mk-auth-input"
                type="password"
                required
                placeholder="Password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />

              <button
                type="submit"
                className="mk-auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <div className="mk-auth-toggle">
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setAuthError("");
                    }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setAuthError("");
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="mk-toast">
          <span
            className={`mk-toast-dot ${toast.type === "error" ? "error" : ""}`}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* SHARE DIALOG */}
      {shareData.isOpen && (
        <ShareDialog
          isOpen={shareData.isOpen}
          onClose={() =>
            setShareData((previous) => ({
              ...previous,
              isOpen: false,
            }))
          }
          url={shareData.url}
          title={shareData.title}
          category={shareData.category}
        />
      )}
    </div>
  );
}

export default MarketplaceView;
