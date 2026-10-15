import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { auth, fbfs, rtdb, uploadToImgBB } from "../lib/firebase";
import { ref, set, onValue } from "firebase/database";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  Announcement,
  Event,
  UserProfile,
  Club,
  GalleryItem,
  GalleryAlbum,
  MarketplaceProfile,
  VaultPost,
  EventRegistration,
  Bulletin,
} from "../types";
import { fetchAndRenderEmailTemplate } from "../utils/emailHelper";

import { AdminSeoModal } from "../components/AdminSeoModal";
import { AdminNewsletterModal } from "../components/AdminNewsletterModal";
import { EmailStudio } from "../components/EmailStudio";

import {
  Shield,
  LayoutDashboard,
  FileText,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  ShieldCheck,
  Menu,
  LogOut,
  Search,
  Activity,
  CheckCircle,
  HelpCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderClosed,
  X,
  Newspaper,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  Link as LinkIcon,
  Layers,
  GripVertical,
  Trash2,
  Video,
  Building2,
} from "lucide-react";

interface ContentBlock {
  id: string;
  type: "h1" | "h2" | "text" | "image" | "file";
  content: string;
  meta?: {
    label?: string;
  };
}

const BULLETIN_CATEGORIES = [
  { id: "news", label: "News", color: "#3b82f6" },
  { id: "updates", label: "Updates", color: "#8b5cf6" },
  { id: "announcements", label: "Announcements", color: "#f59e0b" },
  { id: "events", label: "Events", color: "#10b981" },
  { id: "alerts", label: "Alerts", color: "#ef4444" },
  { id: "spotlight", label: "Spotlight", color: "#ec4899" },
];

export function AdminView() {
  const { profile, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "news"
    | "bulletins"
    | "events"
    | "assets"
    | "vault"
    | "roster"
    | "settings"
    | "emails"
  >("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);

  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [customImageTitle, setCustomImageTitle] = useState("");
  const [customImageCategory, setCustomImageCategory] = useState("campus");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumTopic, setNewAlbumTopic] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");

  const [listings, setListings] = useState<MarketplaceProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vaultPosts, setVaultPosts] = useState<VaultPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulletin state
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null);
  const [bulletinTitle, setBulletinTitle] = useState("");
  const [bulletinContent, setBulletinContent] = useState("");
  const [bulletinCategory, setBulletinCategory] = useState("news");
  const [bulletinImageUrl, setBulletinImageUrl] = useState("");
  const [bulletinImageUploading, setBulletinImageUploading] = useState(false);
  const [bulletinIsPublished, setBulletinIsPublished] = useState(true);
  const [bulletinIsPinned, setBulletinIsPinned] = useState(false);
  const [bulletinTags, setBulletinTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [bulletinSaving, setBulletinSaving] = useState(false);

  // Event editor state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventCategory, setEventCategory] = useState("academic");
  const [eventVenue, setEventVenue] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventCapacity, setEventCapacity] = useState("");
  const [eventCoverImage, setEventCoverImage] = useState("");
  const [eventCoverUploading, setEventCoverUploading] = useState(false);
  const [eventIsExternal, setEventIsExternal] = useState(false);
  const [eventMeetingLink, setEventMeetingLink] = useState("");
  const [eventGoogleMapsLink, setEventGoogleMapsLink] = useState("");
  const [eventOrganizerName, setEventOrganizerName] = useState("");
  const [eventOrganizerEmail, setEventOrganizerEmail] = useState("");
  const [eventRequireApproval, setEventRequireApproval] = useState(false);
  const [eventEditingId, setEventEditingId] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    marketplaceEnabled: true,
    vaultEnabled: true,
    galleryEnabled: true,
    eventsEnabled: true,
    clubsOpen: true,
    newsletterEnabled: true,
    bulletinsEnabled: true,
  });

  const [activityFeed, setActivityFeed] = useState<
    Array<{ id: string; text: string; time: string; tag: string }>
  >([
    {
      id: "1",
      text: "Mooting Society registered 14 new students",
      time: "6 mins ago",
      tag: "Clubs",
    },
    {
      id: "2",
      text: "David Maraga Lecture finalized in Events Assembly",
      time: "22 mins ago",
      tag: "Events",
    },
    {
      id: "3",
      text: "Audit report completed on student parliament vault",
      time: "1 hour ago",
      tag: "Audit",
    },
  ]);

  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postCoverImage, setPostCoverImage] = useState("");
  const [postCoverUploading, setPostCoverUploading] = useState(false);
  const [postBlocks, setPostBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "Write something brilliant today..." },
  ]);
  const [blockUploading, setBlockUploading] = useState<string | null>(null);
  const [postCategory, setPostCategory] = useState<
    "Update" | "Announcement" | "Communication"
  >("Announcement");
  const [postPlatformHomepage, setPostPlatformHomepage] = useState(true);
  const [postPlatformEmail, setPostPlatformEmail] = useState(false);
  const [rosterViewMode, setRosterViewMode] = useState<"users" | "newsletter">(
    "users",
  );

  const [activeVaultPost, setActiveVaultPost] = useState<VaultPost | null>(
    null,
  );
  const [vaultMessage, setVaultMessage] = useState("");
  const [vaultStatus, setVaultStatus] = useState("Under Review");

  const [calendarMonth] = useState(new Date());

  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImage, setSeoImage] = useState("");

  const [isNlOpen, setIsNlOpen] = useState(false);

  const [allRegistrations, setAllRegistrations] = useState<EventRegistration[]>(
    [],
  );
  const [reminderLoadingRegId, setReminderLoadingRegId] = useState<
    string | null
  >(null);
  const [approvalLoadingRegId, setApprovalLoadingRegId] = useState<
    string | null
  >(null);

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

  const loadDatabaseRecords = async () => {
    try {
      setLoading(true);
      const allAnn = await fbfs.getCollection<Announcement>(
        "announcements",
        [],
        "createdAt",
        "desc",
      );
      setAnnouncements(allAnn);

      const allBulletins = await fbfs.getCollection<Bulletin>(
        "bulletins",
        [],
        "createdAt",
        "desc",
      );
      setBulletins(allBulletins || []);

      const allEv = await fbfs.getCollection<Event>(
        "events",
        [],
        "startDate",
        "desc",
      );
      setEvents(allEv);

      const allClubs = await fbfs.getCollection<Club>(
        "clubs",
        [],
        "name",
        "asc",
      );
      setClubs(allClubs);

      const allGal = await fbfs.getCollection<GalleryItem>(
        "gallery",
        [],
        "uploadedAt",
        "desc",
      );
      setGalleryItems(allGal);

      const allAlbums = await fbfs.getCollection<GalleryAlbum>(
        "gallery_albums",
        [],
        "createdAt",
        "desc",
      );
      setAlbums(allAlbums || []);

      const allUsr = await fbfs.getCollection<UserProfile>("users");
      setUsers(allUsr);

      const allRegs =
        await fbfs.getCollection<EventRegistration>("eventRegistrations");
      setAllRegistrations(allRegs || []);

      const allListings = await fbfs.getCollection<MarketplaceProfile>(
        "marketplaceProfiles",
        [],
        "createdAt",
        "desc",
      );
      setListings(allListings);

      const settingsDoc = await fbfs.getDocById<any>("siteSettings", "default");
      if (settingsDoc) {
        setSiteSettings(settingsDoc);
      }
    } catch (err) {
      console.error("Failed to load records from cloud database:", err);
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin =
    profile && (profile.role === "admin" || (profile as any).admin === true);

  useEffect(() => {
    if (authLoading) return;
    if (isUserAdmin) {
      loadDatabaseRecords();
    }
  }, [profile, authLoading]);

  useEffect(() => {
    const vaultRef = ref(rtdb, "vault");
    const unsubscribe = onValue(
      vaultRef,
      (snap) => {
        const data = snap.val() || {};
        const listed: VaultPost[] = Object.entries(data)
          .map(([id, val]: any) => ({
            id,
            ...val,
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setVaultPosts(listed);
      },
      (err) => {
        console.error("Vault DB stream subscription error:", err);
      },
    );
    return () => {};
  }, []);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    setAdminLoginLoading(true);
    setAdminLoginError("");
    try {
      await signInWithEmailAndPassword(
        auth,
        adminEmail.trim(),
        adminPassword.trim(),
      );
      triggerToast("Sign-in credential accepted. System Access Granted.");
    } catch (err: any) {
      console.error(err);
      setAdminLoginError(err.message || "Invalid credential tokens.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const logActivity = (text: string, tag: string) => {
    const freshLog = {
      id: "log_" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      text,
      time: "Just now",
      tag,
    };
    setActivityFeed((prev) => [freshLog, ...prev]);
  };

  /* =========================================================
     IMAGE UPLOAD HELPER
  ========================================================= */

  const uploadLocalImage = async (
    file: File,
    setter: (url: string) => void,
    setLoadingFlag: (v: boolean) => void,
    successMsg: string = "Image uploaded successfully!",
  ) => {
    setLoadingFlag(true);
    try {
      const url = await uploadToImgBB(file);
      setter(url.trim());
      triggerToast(successMsg);
    } catch (err: any) {
      console.error("Image upload failed:", err);
      triggerToast(err.message || "Image upload failed.", "error");
    } finally {
      setLoadingFlag(false);
    }
  };

  /* =========================================================
     BULLETINS
  ========================================================= */

  const resetBulletinForm = () => {
    setEditingBulletin(null);
    setBulletinTitle("");
    setBulletinContent("");
    setBulletinCategory("news");
    setBulletinImageUrl("");
    setBulletinIsPublished(true);
    setBulletinIsPinned(false);
    setBulletinTags([]);
    setNewTagInput("");
  };

  const loadBulletinForEdit = (bulletin: Bulletin) => {
    setEditingBulletin(bulletin);
    setBulletinTitle(bulletin.title || "");
    setBulletinContent(bulletin.content || "");
    setBulletinCategory(bulletin.category || "news");
    setBulletinImageUrl(bulletin.imageUrl || "");
    setBulletinIsPublished(bulletin.isPublished !== false);
    setBulletinIsPinned(bulletin.isPinned || false);
    setBulletinTags(bulletin.tags || []);
  };

  const saveBulletin = async (publish: boolean = true) => {
    if (!bulletinTitle.trim() || !bulletinContent.trim()) {
      triggerToast("Title and content are required for bulletins.", "error");
      return;
    }

    setBulletinSaving(true);
    try {
      const payload: Partial<Bulletin> = {
        title: bulletinTitle.trim(),
        content: bulletinContent.trim(),
        category: bulletinCategory,
        imageUrl: bulletinImageUrl.trim(),
        isPublished: publish,
        isPinned: bulletinIsPinned,
        tags: bulletinTags,
        updatedAt: Date.now(),
      };

      if (editingBulletin?.id) {
        await fbfs.updateDocById("bulletins", editingBulletin.id, payload);
        triggerToast("Bulletin updated successfully!");
        logActivity(
          `Updated bulletin: "${bulletinTitle.slice(0, 20)}..."`,
          "Bulletin",
        );
      } else {
        const newPayload = {
          ...payload,
          createdAt: Date.now(),
          views: 0,
          reactions: { likes: 0, fires: 0, hearts: 0 },
        };
        await fbfs.addDocInCollection("bulletins", newPayload);
        triggerToast("New bulletin published successfully!");
        logActivity(
          `Created bulletin: "${bulletinTitle.slice(0, 20)}..."`,
          "Bulletin",
        );
      }

      resetBulletinForm();
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to save bulletin.", "error");
    } finally {
      setBulletinSaving(false);
    }
  };

  const deleteBulletin = async (bulletinId: string) => {
    if (!window.confirm("Are you sure you want to delete this bulletin?"))
      return;

    try {
      await fbfs.deleteDocById("bulletins", bulletinId);
      triggerToast("Bulletin deleted successfully.");
      logActivity("Deleted bulletin", "Bulletin");
      if (editingBulletin?.id === bulletinId) {
        resetBulletinForm();
      }
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to delete bulletin.", "error");
    }
  };

  const toggleBulletinPublish = async (bulletin: Bulletin) => {
    try {
      await fbfs.updateDocById("bulletins", bulletin.id, {
        isPublished: !bulletin.isPublished,
      });
      triggerToast(
        bulletin.isPublished ? "Bulletin unpublished." : "Bulletin published!",
      );
      await loadDatabaseRecords();
    } catch (err) {
      triggerToast("Failed to toggle publish status.", "error");
    }
  };

  const addBulletinTag = () => {
    const tag = newTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !bulletinTags.includes(tag)) {
      setBulletinTags([...bulletinTags, tag]);
      setNewTagInput("");
    }
  };

  const removeBulletinTag = (tag: string) => {
    setBulletinTags(bulletinTags.filter((t) => t !== tag));
  };

  /* =========================================================
     POSTS (announcements)
  ========================================================= */

  const loadDraftPost = (ann: Announcement) => {
    setEditPostId(ann.id);
    setPostTitle(ann.title || "");
    setPostCoverImage((ann as any).coverImage || "");
    setPostCategory((ann as any).category || "Announcement");
    setPostPlatformHomepage(
      (ann as any).platforms
        ? (ann as any).platforms.includes("homepage")
        : true,
    );
    setPostPlatformEmail(
      (ann as any).platforms ? (ann as any).platforms.includes("email") : false,
    );

    try {
      if ((ann as any).blocks) {
        setPostBlocks(JSON.parse((ann as any).blocks));
      } else {
        setPostBlocks([{ id: "b1", type: "text", content: ann.content || "" }]);
      }
    } catch (e) {
      setPostBlocks([{ id: "b1", type: "text", content: ann.content || "" }]);
    }
  };

  const createFreshDraft = () => {
    setEditPostId(null);
    setPostTitle("");
    setPostCoverImage("");
    setPostCategory("Announcement");
    setPostPlatformHomepage(true);
    setPostPlatformEmail(false);
    setPostBlocks([
      { id: "b1", type: "text", content: "Write something brilliant today..." },
    ]);
    triggerToast("Empty draft template initiated.");
  };

  const publishOrSaveAnnouncement = async (isLivePublish: boolean) => {
    if (!postTitle.trim()) {
      triggerToast("Title tag is mandatory to publish release docs.", "error");
      return;
    }

    if (!postPlatformHomepage && !postPlatformEmail) {
      triggerToast(
        "Please select at least one platform to publish (Homepage or Email).",
        "error",
      );
      return;
    }

    try {
      const flatText = postBlocks.map((b) => b.content || "").join("\n\n");
      const platforms: string[] = [];
      if (postPlatformHomepage) platforms.push("homepage");
      if (postPlatformEmail) platforms.push("email");

      const payload: Partial<Announcement> = {
        title: postTitle.trim(),
        content: flatText,
        visible: isLivePublish,
        createdAt: new Date(),
        category: postCategory,
        platforms,
        coverImage: postCoverImage,
        ...({ blocks: JSON.stringify(postBlocks) } as any),
      };

      if (editPostId) {
        await fbfs.updateDocById("announcements", editPostId, payload);
        triggerToast("Corporate bulletin saved and updated in cloud database.");
      } else {
        await fbfs.addDocInCollection("announcements", payload);
        triggerToast("Fresh central release bulletin successfully published.");
      }

      if (isLivePublish && postPlatformEmail) {
        triggerToast("Initiating Resend newsletter broadcast...", "success");
        try {
          const allUsers = await fbfs.getCollection<UserProfile>("users");
          let targetEmails: string[] = ["micahprince60@gmail.com"];
          if (allUsers.length > 0) {
            const list = allUsers
              .filter((u) => u.newsletterSubscribed)
              .map((u) => u.email)
              .filter(Boolean) as string[];
            if (list.length > 0) targetEmails = list;
          }

          const resendResponse = await fetch("/api/send-newsletter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subject: `[${postCategory}] ${postTitle.trim()}`,
              postTitle: postTitle.trim(),
              featuredImage: postCoverImage || "",
              audience: "all",
              emails: targetEmails,
              blocks: postBlocks,
            }),
          });

          if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            console.error("Resend delivery failed:", errorText);
            triggerToast(
              "Automatic newsletter dispatch failed. Verify Resend config.",
              "error",
            );
          } else {
            triggerToast(
              `Resend newsletter dispatch successful to ${targetEmails.length} subscribers!`,
              "success",
            );
            logActivity(
              `Broadcasted mailshot: "${postTitle.slice(0, 16)}..."`,
              "Newsletter",
            );
          }
        } catch (mailErr) {
          console.error("Mailshot error during publish:", mailErr);
          triggerToast("Automatic newsletter dispatch failed.", "error");
        }
      }

      logActivity(
        `Saved Document: "${postTitle.slice(0, 16)}..."`,
        isLivePublish ? "News" : "Draft",
      );
      createFreshDraft();
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Error deploying release.", "error");
    }
  };

  const deleteAnnouncement = async () => {
    if (!editPostId) {
      createFreshDraft();
      return;
    }
    try {
      await fbfs.deleteDocById("announcements", editPostId);
      triggerToast("Central bulletin record struck down from database.");
      logActivity("Struck down release catalog", "Archive");
      createFreshDraft();
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast("Purge failed.", "error");
    }
  };

  /* =========================================================
     EVENTS (inline editor)
  ========================================================= */

  const resetEventForm = () => {
    setEventEditingId(null);
    setEventTitle("");
    setEventDescription("");
    setEventCategory("academic");
    setEventVenue("");
    setEventStartDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventCapacity("");
    setEventCoverImage("");
    setEventIsExternal(false);
    setEventMeetingLink("");
    setEventGoogleMapsLink("");
    setEventOrganizerName("");
    setEventOrganizerEmail("");
    setEventRequireApproval(false);
  };

  const loadEventForEdit = (event: Event) => {
    setEventEditingId(event.id);
    setEventTitle(event.title || "");
    setEventDescription(event.description || "");
    setEventCategory(event.category || "academic");
    setEventVenue(event.venue || "");
    const startDate = (event.startDate as any)?.seconds
      ? new Date((event.startDate as any).seconds * 1000)
      : new Date(event.startDate);
    setEventStartDate(
      `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(startDate.getDate()).padStart(2, "0")}`,
    );
    setEventStartTime(event.startTime || "");
    setEventEndTime(event.endTime || "");
    setEventCapacity(event.capacity ? String(event.capacity) : "");
    setEventCoverImage(event.coverImage || "");
    setEventIsExternal(!!(event as any).isExternal);
    setEventMeetingLink((event as any).meetingLink || "");
    setEventGoogleMapsLink((event as any).googleMapsLink || "");
    setEventOrganizerName(event.organizerName || "");
    setEventOrganizerEmail(event.organizerEmail || "");
    setEventRequireApproval(!!event.requireApproval);
  };

  const saveEventFromInline = async () => {
    if (!eventTitle.trim()) {
      triggerToast("Event title is required.", "error");
      return;
    }
    if (!eventStartDate) {
      triggerToast("Event date is required.", "error");
      return;
    }
    if (eventIsExternal && !eventMeetingLink.trim()) {
      triggerToast(
        "External events require a meeting/registration link.",
        "error",
      );
      return;
    }
    if (!eventIsExternal && !eventVenue.trim()) {
      triggerToast("Physical events require a venue.", "error");
      return;
    }

    setEventSaving(true);
    try {
      const [yr, mo, dy] = eventStartDate.split("-").map(Number);
      const localDate = new Date(yr, mo - 1, dy, 0, 0, 0);

      const payload: Partial<Event> = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        category: eventCategory,
        venue: eventIsExternal ? eventMeetingLink.trim() : eventVenue.trim(),
        startDate: localDate,
        endDate: localDate,
        startTime: eventStartTime || "10:00 AM",
        endTime: eventEndTime || "",
        capacity: eventCapacity ? Number(eventCapacity) : 0,
        coverImage: eventCoverImage.trim(),
        organizerName: eventOrganizerName.trim() || "MKU Law Faculty",
        organizerEmail: eventOrganizerEmail.trim(),
        requireApproval: eventRequireApproval,
        ...({
          isExternal: eventIsExternal,
          meetingLink: eventMeetingLink.trim(),
          googleMapsLink: eventGoogleMapsLink.trim(),
        } as any),
        published: true,
        visibility: "public",
        status: "active",
        featured: true,
      };

      if (eventEditingId) {
        await fbfs.updateDocById("events", eventEditingId, payload);
        triggerToast("Event updated successfully!");
        logActivity(`Updated event: "${eventTitle}"`, "Events");
      } else {
        const newPayload = {
          ...payload,
          registeredCount: 0,
          goingCount: 0,
          interestedCount: 0,
          waitlistCount: 0,
        };
        await fbfs.addDocInCollection("events", newPayload);
        triggerToast("Event created successfully!");
        logActivity(`Created event: "${eventTitle}"`, "Events");
      }

      resetEventForm();
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to save event.", "error");
    } finally {
      setEventSaving(false);
    }
  };

  const deleteEventInline = async (eventId: string) => {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await fbfs.deleteDocById("events", eventId);
      triggerToast("Event deleted.");
      logActivity("Deleted event", "Events");
      if (eventEditingId === eventId) resetEventForm();
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to delete event.", "error");
    }
  };

  /* =========================================================
     GALLERY
  ========================================================= */

  const addImagesToGallery = async (filesList: FileList) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(`Uploading ${list.length} snapshot assets...`);
      let uploadedCount = 0;
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        const payload: Partial<GalleryItem> = {
          title:
            list.length > 1 && customImageTitle.trim()
              ? `${customImageTitle.trim()} (${i + 1}/${list.length})`
              : customImageTitle.trim() ||
                file.name.split(".")[0] ||
                "Campus Gallery Snapshot",
          imageUrl: url.trim(),
          category: customImageCategory || "Campus Life",
          featured: true,
          visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: uploadAlbumId || "",
        };
        await fbfs.addDocInCollection("gallery", payload);
        uploadedCount++;
      }
      triggerToast(
        `Successfully uploaded ${uploadedCount} photos to the public archives!`,
      );
      logActivity(`Uploaded ${uploadedCount} gallery images`, "Gallery");
      setCustomImageTitle("");
      setUploadAlbumId("");
      await loadDatabaseRecords();
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "Upload pipeline failed.", "error");
    }
  };

  const handleUploadPhotosToAlbum = async (
    albumId: string,
    filesList: FileList,
  ) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(`Uploading ${list.length} images to collection...`);
      const activeAlbum = albums.find((a) => a.id === albumId);
      const albumName = activeAlbum ? activeAlbum.name : "Collection Item";
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        const payload: Partial<GalleryItem> = {
          title:
            list.length > 1
              ? `${albumName} (${i + 1}/${list.length})`
              : file.name.split(".")[0],
          imageUrl: url.trim(),
          category: "Campus Life",
          featured: true,
          visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: albumId,
        };
        await fbfs.addDocInCollection("gallery", payload);
      }
      triggerToast(`Added ${list.length} photos to collection.`);
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(
        err.message || "Failed to add photos to collection.",
        "error",
      );
    }
  };

  const updateAlbumLabel = async (albumId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await fbfs.updateDocById("gallery_albums", albumId, {
        name: newName.trim(),
      });
      triggerToast("Collection label updated.");
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast("Failed to rename label.", "error");
    }
  };

  const handleCreateAlbum = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAlbumName.trim() || !newAlbumTopic.trim()) {
      triggerToast(
        "Please supply the Album title & overarching Topic name.",
        "error",
      );
      return;
    }
    try {
      const payload: Partial<GalleryAlbum> = {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        topic: newAlbumTopic.trim(),
        createdAt: Date.now(),
      };
      await fbfs.addDocInCollection("gallery_albums", payload);
      setIsCreatingAlbum(false);
      setNewAlbumName("");
      setNewAlbumDescription("");
      setNewAlbumTopic("");
      triggerToast(`Topic Album "${payload.name}" cataloged successfully!`);
      logActivity(`Created collection album "${payload.name}"`, "Gallery");
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to create Album", "error");
    }
  };

  const removeGalleryAlbum = async (albumId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this Collection/Album? Photos inside it will not be deleted, but they will be unassigned.",
      )
    ) {
      return;
    }
    try {
      await fbfs.deleteDocById("gallery_albums", albumId);
      const itemsInAlbum = galleryItems.filter(
        (item) => item.albumId === albumId,
      );
      for (const item of itemsInAlbum) {
        await fbfs.updateDocById("gallery", item.id, { albumId: "" });
      }
      triggerToast("Album deleted and associated photos unassigned.");
      logActivity("Deleted collection album", "Gallery");
      await loadDatabaseRecords();
    } catch (e: any) {
      triggerToast("Failed to delete Album.", "error");
    }
  };

  const removeGalleryImage = async (item: GalleryItem) => {
    try {
      await fbfs.deleteDocById("gallery", item.id);
      triggerToast("Media purged.");
      await loadDatabaseRecords();
    } catch (e) {
      console.error(e);
    }
  };

  /* =========================================================
     VAULT / SETTINGS
  ========================================================= */

  const commitVaultStatus = async () => {
    if (!activeVaultPost) return;
    try {
      await set(ref(rtdb, `vault/${activeVaultPost.id}/status`), vaultStatus);
      await set(
        ref(rtdb, `vault/${activeVaultPost.id}/adminResponse`),
        vaultMessage,
      );
      triggerToast("Response and parliament status dispatched.");
      logActivity(
        `Answered suggestion ID: ${activeVaultPost.id.slice(0, 5)}`,
        "Vault",
      );
      setActiveVaultPost(null);
      setVaultMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  const saveSiteTuning = async (field: string) => {
    try {
      const updated = {
        ...siteSettings,
        [field]: !(siteSettings as any)[field],
      };
      setSiteSettings(updated);
      await fbfs.setDocById("siteSettings", "default", updated);
      triggerToast("System feature overrides committed successfully.");
      logActivity(`Toggled setting ${field}`, "SiteSettings");
    } catch (e) {
      console.error(e);
    }
  };

  /* =========================================================
     REGISTRATIONS
  ========================================================= */

  const handleApproveRegistration = async (
    regId: string,
    reg: EventRegistration,
    event: Event,
  ) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, {
        approvalStatus: "approved",
      });
      setAllRegistrations((prev) =>
        prev.map((x) =>
          x.id === regId ? { ...x, approvalStatus: "approved" } : x,
        ),
      );

      const dateStr =
        new Date(event.startDate).toLocaleDateString(undefined, {
          weekday: "short",
          month: "long",
          day: "numeric",
          year: "numeric",
        }) + (event.startTime ? ` @ ${event.startTime}` : "");

      const rendered = await fetchAndRenderEmailTemplate("event_registration", {
        applicantName: reg.userName,
        applicantEmail: reg.userEmail,
        eventTitle: event.title,
        eventDate: dateStr,
        eventVenue: event.venue || "Campus Auditorium",
      });

      await fetch("/api/send-event-registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantEmail: reg.userEmail,
          applicantName: reg.userName,
          eventTitle: event.title,
          eventDate: dateStr,
          eventVenue: event.venue || "Campus Auditorium",
          customFields: reg.customFields || {},
          customSubject: rendered?.customSubject || undefined,
          customHtml: rendered?.customHtml || undefined,
        }),
      });

      triggerToast(
        `RSVP pass for ${reg.userName} approved & dynamic confirmation email sent!`,
        "success",
      );
    } catch (err: any) {
      console.error(err);
      triggerToast("Error updating registry status", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  const handleDeclineRegistration = async (
    regId: string,
    reg: EventRegistration,
  ) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, {
        approvalStatus: "declined",
      });
      setAllRegistrations((prev) =>
        prev.map((x) =>
          x.id === regId ? { ...x, approvalStatus: "declined" } : x,
        ),
      );
      triggerToast(`RSVP pass for ${reg.userName} marked as declined.`);
    } catch (err: any) {
      console.error(err);
      triggerToast("Error updating registry status", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  const handleSendReminderCampaign = async (
    regId: string,
    reg: EventRegistration,
    event: Event,
  ) => {
    setReminderLoadingRegId(regId);
    try {
      const dateStr =
        new Date(event.startDate).toLocaleDateString(undefined, {
          weekday: "short",
          month: "long",
          day: "numeric",
          year: "numeric",
        }) + (event.startTime ? ` @ ${event.startTime}` : "");

      const rendered = await fetchAndRenderEmailTemplate("event_reminder", {
        applicantName: reg.userName,
        applicantEmail: reg.userEmail,
        eventTitle: event.title,
        eventDate: dateStr,
        eventVenue: event.venue || "Campus Auditorium",
      });

      const res = await fetch("/api/send-event-reminder-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantEmail: reg.userEmail,
          applicantName: reg.userName,
          eventTitle: event.title,
          eventDate: dateStr,
          eventVenue: event.venue || "Campus Auditorium",
          customSubject: rendered?.customSubject || undefined,
          customHtml: rendered?.customHtml || undefined,
        }),
      });

      if (!res.ok) throw new Error("Email dispatch API error");

      triggerToast(
        `Attendance reminder successfully dispatched to ${reg.userEmail}!`,
        "success",
      );
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to dispatch email reminder campaign.", "error");
    } finally {
      setReminderLoadingRegId(null);
    }
  };

  const copyLinkClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      triggerToast("Media link copied to clipboard!");
    });
  };

  if (authLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-12 animate-pulse w-full select-none text-left">
        <p className="text-gray-400 font-mono text-xs tracking-widest text-center uppercase">
          CONSTRUCTING SECURE ADMIN_OS CORE ENVIRONMENT SHELL ...
        </p>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[85vh] py-12 px-6">
        <div className="w-full max-w-lg p-8 sm:p-10 rounded-[2rem] border border-white/10 bg-[#09090b]/95 shadow-2xl relative text-left">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FFDE00]/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>

          <div className="text-center mb-8 space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFDE00]/10 border border-[#FFDE00]/20 flex items-center justify-center text-[#FFDE00]">
              <Shield size={28} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              EXECUTIVE CONSOLE
            </h2>
            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest">
              Restricted — MKU Parliament Credentials Authorized
            </p>
          </div>

          {adminLoginError && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/15 bg-red-500/10 text-xs text-red-400">
              {adminLoginError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="micahprincemicah001@gmail.com"
                className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/40 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">
                Access Token Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/40"
              />
            </div>

            <button
              type="submit"
              disabled={adminLoginLoading}
              className="w-full bg-[#FFDE00] hover:bg-yellow-400 text-black font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-lg"
            >
              {adminLoginLoading
                ? "Authorizing credentials..."
                : "Confirm Executive Access"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link href="/">
              <span className="text-[10px] font-mono text-[#FFDE00] hover:underline uppercase tracking-wider font-extrabold cursor-pointer">
                ← Back To Student Hub
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-[#050505] text-[#172033] dark:text-white selection:bg-[#fcdd09] selection:text-[#173d91]">
      {sidebarMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#071a3d]/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          bg-[#173d91] dark:bg-[#0a0a0c] text-white
          flex flex-col
          shadow-[8px_0_30px_rgba(23,61,145,0.12)]
          transition-transform duration-300
          ${
            sidebarMobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          ${sidebarCollapsed ? "lg:w-[82px]" : "lg:w-[250px]"}
          w-[250px]
        `}
      >
        <div className="h-[76px] px-5 flex items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#fcdd09] flex items-center justify-center shrink-0">
              <span className="text-[#173d91] font-black text-lg">S</span>
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-black tracking-tight text-[15px] leading-none">
                  STUDENTHUB
                </p>
                <p className="text-[10px] text-white/55 mt-1 font-medium">
                  MKU ADMIN
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex ml-auto w-8 h-8 rounded-lg items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarMobileOpen(false)}
            className="lg:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <div className="space-y-1">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: <LayoutDashboard size={18} />,
              },
              {
                id: "bulletins",
                label: "Bulletins",
                icon: <Newspaper size={18} />,
              },
              { id: "news", label: "Content", icon: <FileText size={18} /> },
              {
                id: "events",
                label: "Events",
                icon: <CalendarIcon size={18} />,
              },
              { id: "assets", label: "Gallery", icon: <ImageIcon size={18} /> },
              {
                id: "roster",
                label: "Students",
                icon: <ShieldCheck size={18} />,
              },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer
                    ${
                      active
                        ? "bg-[#fcdd09] text-[#173d91] font-bold shadow-[0_5px_18px_rgba(252,221,9,0.16)]"
                        : "text-white/65 hover:text-white hover:bg-white/[0.07]"
                    }
                  `}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="text-sm font-semibold">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-7 h-px bg-white/10" />

          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.14em] text-white/35 font-bold">
              More
            </p>
          )}

          <div className="space-y-1">
            {[
              {
                id: "vault",
                label: "Suggestions",
                icon: <HelpCircle size={18} />,
              },
              { id: "emails", label: "Email", icon: <Mail size={18} /> },
              { id: "settings", label: "Settings", icon: <Layers size={18} /> },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer
                    ${
                      active
                        ? "bg-white text-[#173d91] font-bold"
                        : "text-white/65 hover:text-white hover:bg-white/[0.07]"
                    }
                  `}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="text-sm font-semibold">{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <Link href="/">
            <button
              type="button"
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl
                text-white/60 hover:text-white hover:bg-white/[0.07]
                transition-colors cursor-pointer
                ${sidebarCollapsed ? "justify-center" : ""}
              `}
            >
              <LinkIcon size={17} />
              {!sidebarCollapsed && (
                <span className="text-sm font-semibold">View StudentHub</span>
              )}
            </button>
          </Link>

          <button
            type="button"
            onClick={logout}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl
              text-white/60 hover:text-white hover:bg-white/[0.07]
              transition-colors cursor-pointer
              ${sidebarCollapsed ? "justify-center" : ""}
            `}
          >
            <LogOut size={17} />
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold">Sign out</span>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main
        className={`
          min-h-screen transition-[padding] duration-300
          ${sidebarCollapsed ? "lg:pl-[82px]" : "lg:pl-[250px]"}
        `}
      >
        <header className="sticky top-0 z-30 h-[76px] bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-[#dbe3ef] dark:border-white/10">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarMobileOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-[#f2f5f9] dark:bg-white/5 border border-[#e1e7ef] dark:border-white/10 flex items-center justify-center text-[#173d91] dark:text-white cursor-pointer"
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.13em] text-[#2457c5] dark:text-[#fcdd09]">
                  Admin
                </p>

                <h1 className="text-base sm:text-lg font-black text-[#172033] dark:text-white truncate">
                  {activeTab === "overview" && "Overview"}
                  {activeTab === "bulletins" && "Bulletins"}
                  {activeTab === "news" && "Content"}
                  {activeTab === "events" && "Events"}
                  {activeTab === "assets" && "Gallery"}
                  {activeTab === "vault" && "Suggestions"}
                  {activeTab === "roster" && "Students"}
                  {activeTab === "settings" && "Settings"}
                  {activeTab === "emails" && "Email"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/">
                <button
                  type="button"
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#dbe3ef] dark:border-white/10 bg-white dark:bg-white/5 text-[#344054] dark:text-white hover:border-[#2457c5]/30 hover:text-[#173d91] dark:hover:text-[#fcdd09] transition-colors cursor-pointer text-xs font-bold"
                >
                  <LinkIcon size={15} />
                  View site
                </button>
              </Link>

              <div className="w-10 h-10 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] flex items-center justify-center font-black text-sm">
                {(profile?.name || "A").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-7 lg:py-9 max-w-[1500px] mx-auto">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              <section>
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-[#2457c5] dark:text-[#fcdd09] mb-2">
                      Welcome back, {profile?.name?.split(" ")[0] || "Admin"}.
                    </p>

                    <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] text-[#172033] dark:text-white">
                      Here's what's happening
                    </h2>

                    <p className="mt-2 text-sm text-[#667085] dark:text-gray-400 max-w-xl">
                      Manage StudentHub content, events, students and community
                      activity from one place.
                    </p>
                  </div>

                  <div className="text-xs font-semibold text-[#667085] dark:text-gray-400">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("bulletins")}
                  className="group text-left bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 hover:border-[#2457c5]/35 dark:hover:border-[#fcdd09]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                        Bulletins
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033] dark:text-white">
                        {bulletins.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center">
                      <Newspaper size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5] dark:text-[#fcdd09] group-hover:translate-x-0.5 transition-transform">
                    Manage bulletins →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className="group text-left bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 hover:border-[#2457c5]/35 dark:hover:border-[#fcdd09]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                        Students
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033] dark:text-white">
                        {users.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center">
                      <ShieldCheck size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5] dark:text-[#fcdd09] group-hover:translate-x-0.5 transition-transform">
                    Manage students →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("events")}
                  className="group text-left bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 hover:border-[#2457c5]/35 dark:hover:border-[#fcdd09]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                        Events
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033] dark:text-white">
                        {events.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#fff9cf] dark:bg-white/10 text-[#173d91] dark:text-[#fcdd09] flex items-center justify-center">
                      <CalendarIcon size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5] dark:text-[#fcdd09]">
                    Manage events →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("assets")}
                  className="group text-left bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 hover:border-[#2457c5]/35 dark:hover:border-[#fcdd09]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                        Photos
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033] dark:text-white">
                        {galleryItems.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#fff9cf] dark:bg-white/10 text-[#173d91] dark:text-[#fcdd09] flex items-center justify-center">
                      <ImageIcon size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5] dark:text-[#fcdd09]">
                    Manage gallery →
                  </p>
                </button>
              </section>

              <section className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl">
                <div className="px-5 sm:px-6 py-5 border-b border-[#e6ebf2] dark:border-white/10">
                  <h3 className="font-black text-lg text-[#172033] dark:text-white">
                    Recent activity
                  </h3>
                  <p className="text-xs text-[#667085] dark:text-gray-400 mt-1">
                    Latest actions from the admin workspace
                  </p>
                </div>

                <div className="divide-y divide-[#edf0f5] dark:divide-white/5">
                  {activityFeed.slice(0, 6).map((activity) => (
                    <div
                      key={activity.id}
                      className="px-5 sm:px-6 py-4 flex items-center gap-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center shrink-0">
                        <CheckCircle size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#344054] dark:text-gray-300">
                          {activity.text}
                        </p>
                        <p className="text-[11px] text-[#98a2b3] mt-1">
                          {activity.time}
                        </p>
                      </div>

                      <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-[#f4f6f9] dark:bg-white/10 text-[10px] font-bold text-[#667085] dark:text-gray-400">
                        {activity.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* BULLETINS */}
          {activeTab === "bulletins" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] dark:text-[#fcdd09] mb-2">
                    News & Updates
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                    Campus Bulletins
                  </h2>

                  <p className="text-sm text-[#667085] dark:text-gray-400 mt-1">
                    Create and manage news, updates and announcements.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetBulletinForm}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold hover:bg-[#2457c5] dark:hover:bg-yellow-400 transition-colors cursor-pointer"
                >
                  <Plus size={17} />
                  New Bulletin
                </button>
              </div>

              <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2] dark:border-white/10">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      All Bulletins ({bulletins.length})
                    </p>
                  </div>

                  <div className="max-h-[650px] overflow-y-auto">
                    {bulletins.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#98a2b3]">
                        No bulletins yet.
                      </div>
                    ) : (
                      bulletins.map((bulletin) => (
                        <div
                          key={bulletin.id}
                          className={`
                            p-4 border-b border-[#edf0f5] dark:border-white/5
                            hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition-colors
                            ${editingBulletin?.id === bulletin.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}
                          `}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => loadBulletinForEdit(bulletin)}
                              className="flex-1 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                  style={{
                                    backgroundColor: `${
                                      BULLETIN_CATEGORIES.find(
                                        (c) => c.id === bulletin.category,
                                      )?.color || "#3b82f6"
                                    }20`,
                                    color:
                                      BULLETIN_CATEGORIES.find(
                                        (c) => c.id === bulletin.category,
                                      )?.color || "#3b82f6",
                                  }}
                                >
                                  {bulletin.category || "news"}
                                </span>
                                {bulletin.isPinned && (
                                  <span className="text-[9px] text-amber-500 font-bold">
                                    📌 PINNED
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-bold text-[#172033] dark:text-white line-clamp-2">
                                {bulletin.title}
                              </h3>

                              <p className="mt-1 text-[11px] text-[#667085] dark:text-gray-400 line-clamp-2">
                                {bulletin.content}
                              </p>
                            </button>

                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => toggleBulletinPublish(bulletin)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  bulletin.isPublished
                                    ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                    : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {bulletin.isPublished ? (
                                  <Eye size={14} />
                                ) : (
                                  <EyeOff size={14} />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteBulletin(bulletin.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-[#e6ebf2] dark:border-white/10">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      {editingBulletin
                        ? "Editing Bulletin"
                        : "Create New Bulletin"}
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#344054] dark:text-gray-300 mb-2">
                          Title *
                        </label>
                        <input
                          value={bulletinTitle}
                          onChange={(e) => setBulletinTitle(e.target.value)}
                          placeholder="Enter bulletin headline..."
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold text-[#172033] dark:text-white outline-none focus:border-[#2457c5] dark:focus:border-[#fcdd09]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={bulletinCategory}
                          onChange={(e) => setBulletinCategory(e.target.value)}
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold text-[#172033] dark:text-white outline-none cursor-pointer"
                        >
                          {BULLETIN_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] dark:text-gray-300 mb-2">
                          Cover image
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 hover:border-[#2457c5] dark:hover:border-[#fcdd09] cursor-pointer">
                            {bulletinImageUploading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-xs font-bold">
                                  Uploading...
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload size={14} />
                                <span className="text-xs font-bold">
                                  {bulletinImageUrl ? "Replace" : "Upload"}
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadLocalImage(
                                    file,
                                    setBulletinImageUrl,
                                    setBulletinImageUploading,
                                    "Cover uploaded!",
                                  );
                                }
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          {bulletinImageUrl && (
                            <button
                              type="button"
                              onClick={() => setBulletinImageUrl("")}
                              className="p-2.5 rounded-xl border border-[#dce4ef] dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {bulletinImageUrl && (
                      <img
                        src={bulletinImageUrl}
                        alt="Cover preview"
                        className="w-full max-h-64 object-cover rounded-xl border border-[#dce4ef] dark:border-white/10"
                      />
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#344054] dark:text-gray-300 mb-2">
                        Content *
                      </label>
                      <textarea
                        value={bulletinContent}
                        onChange={(e) => setBulletinContent(e.target.value)}
                        rows={8}
                        placeholder="Write your bulletin content here..."
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none resize-y leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#344054] dark:text-gray-300 mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {bulletinTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] text-xs font-medium"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => removeBulletinTag(tag)}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addBulletinTag();
                            }
                          }}
                          placeholder="Add a tag..."
                          className="flex-1 rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm outline-none"
                        />
                        <button
                          type="button"
                          onClick={addBulletinTag}
                          className="px-4 py-2.5 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold hover:bg-[#f8fafc] dark:hover:bg-white/5"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulletinIsPublished}
                          onChange={(e) =>
                            setBulletinIsPublished(e.target.checked)
                          }
                          className="accent-[#173d91] dark:accent-[#fcdd09]"
                        />
                        <span className="text-xs font-semibold">
                          Publish immediately
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulletinIsPinned}
                          onChange={(e) =>
                            setBulletinIsPinned(e.target.checked)
                          }
                          className="accent-[#173d91] dark:accent-[#fcdd09]"
                        />
                        <span className="text-xs font-semibold">
                          Pin to top
                        </span>
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => saveBulletin(false)}
                        disabled={bulletinSaving}
                        className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold hover:bg-[#f8fafc] dark:hover:bg-white/10 disabled:opacity-50"
                      >
                        {bulletinSaving ? "Saving..." : "Save as Draft"}
                      </button>

                      <button
                        type="button"
                        onClick={() => saveBulletin(true)}
                        disabled={bulletinSaving}
                        className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold hover:bg-[#2457c5] dark:hover:bg-yellow-400 disabled:opacity-50"
                      >
                        {bulletinSaving ? "Publishing..." : "Publish Bulletin"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {activeTab === "news" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] dark:text-[#fcdd09] mb-2">
                    Content
                  </p>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                    Posts
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={createFreshDraft}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold hover:bg-[#2457c5] dark:hover:bg-yellow-400"
                >
                  <Plus size={17} />
                  New post
                </button>
              </div>

              <div className="grid xl:grid-cols-[350px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2] dark:border-white/10">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      Published & saved
                    </p>
                  </div>

                  <div className="max-h-[650px] overflow-y-auto">
                    {announcements.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#98a2b3]">
                        No posts yet.
                      </div>
                    ) : (
                      announcements.map((ann) => (
                        <button
                          key={ann.id}
                          type="button"
                          onClick={() => loadDraftPost(ann)}
                          className={`
                            w-full text-left p-4 border-b border-[#edf0f5] dark:border-white/5
                            hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition-colors
                            ${editPostId === ann.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}
                          `}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold line-clamp-2">
                              {ann.title}
                            </h3>
                            <span
                              className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-bold ${
                                (ann as any).visible === false
                                  ? "bg-[#fff4e5] text-[#b54708]"
                                  : "bg-[#ecfdf3] text-[#027a48]"
                              }`}
                            >
                              {(ann as any).visible === false
                                ? "Draft"
                                : "Live"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-[#e6ebf2] dark:border-white/10 flex items-center justify-between gap-4">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      {editPostId ? "Editing post" : "New post"}
                    </p>

                    {editPostId && (
                      <button
                        type="button"
                        onClick={deleteAnnouncement}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold mb-2">
                        Title
                      </label>
                      <input
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="Write a clear headline..."
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Category
                        </label>
                        <select
                          value={postCategory}
                          onChange={(e) =>
                            setPostCategory(e.target.value as any)
                          }
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
                        >
                          <option value="Announcement">Announcement</option>
                          <option value="Update">Update</option>
                          <option value="Communication">Communication</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Cover image
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                            {postCoverUploading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-xs font-bold">
                                  Uploading...
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload size={14} />
                                <span className="text-xs font-bold">
                                  {postCoverImage ? "Replace" : "Upload"}
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadLocalImage(
                                    file,
                                    setPostCoverImage,
                                    setPostCoverUploading,
                                    "Cover uploaded!",
                                  );
                                }
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          {postCoverImage && (
                            <button
                              type="button"
                              onClick={() => setPostCoverImage("")}
                              className="p-2.5 rounded-xl border border-[#dce4ef] dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {postCoverImage && (
                      <img
                        src={postCoverImage}
                        alt="Cover preview"
                        className="w-full max-h-64 object-cover rounded-xl border border-[#dce4ef] dark:border-white/10"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold">Content</label>
                        <span className="text-[10px] text-[#98a2b3]">
                          {postBlocks.length} block
                          {postBlocks.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {postBlocks.map((block, index) => (
                          <div
                            key={block.id}
                            className="border border-[#dce4ef] dark:border-white/10 rounded-xl overflow-hidden bg-[#fbfcfe] dark:bg-white/5"
                          >
                            <div className="px-3 py-2 border-b border-[#e6ebf2] dark:border-white/10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical
                                  size={15}
                                  className="text-[#98a2b3]"
                                />
                                <span className="text-[10px] font-bold uppercase text-[#667085] dark:text-gray-400">
                                  {block.type}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPostBlocks((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  )
                                }
                                className="text-[#98a2b3] hover:text-red-500"
                              >
                                <X size={15} />
                              </button>
                            </div>

                            {block.type === "text" ||
                            block.type === "h1" ||
                            block.type === "h2" ? (
                              <textarea
                                value={block.content}
                                onChange={(e) => {
                                  setPostBlocks((prev) =>
                                    prev.map((item, i) =>
                                      i === index
                                        ? { ...item, content: e.target.value }
                                        : item,
                                    ),
                                  );
                                }}
                                rows={block.type === "text" ? 6 : 3}
                                className="w-full bg-transparent p-4 text-sm outline-none resize-y"
                              />
                            ) : (
                              <div className="p-4 space-y-3">
                                {block.content &&
                                  (block.type === "image" ? (
                                    <img
                                      src={block.content}
                                      alt="Block"
                                      className="w-full max-h-72 object-cover rounded-xl border border-[#dce4ef] dark:border-white/10"
                                    />
                                  ) : (
                                    <a
                                      href={block.content}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-xs font-bold text-[#2457c5] dark:text-[#fcdd09] hover:underline break-all"
                                    >
                                      {block.content}
                                    </a>
                                  ))}

                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                                  {blockUploading === block.id ? (
                                    <>
                                      <Loader2
                                        size={12}
                                        className="animate-spin"
                                      />
                                      <span className="text-[11px] font-bold">
                                        Uploading...
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={12} />
                                      <span className="text-[11px] font-bold">
                                        {block.content
                                          ? "Replace file"
                                          : "Upload file"}
                                      </span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept={
                                      block.type === "image" ? "image/*" : "*"
                                    }
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setBlockUploading(block.id);
                                        uploadToImgBB(file)
                                          .then((url) => {
                                            setPostBlocks((prev) =>
                                              prev.map((b) =>
                                                b.id === block.id
                                                  ? {
                                                      ...b,
                                                      content: url.trim(),
                                                    }
                                                  : b,
                                              ),
                                            );
                                            triggerToast("Uploaded!");
                                          })
                                          .catch((err) =>
                                            triggerToast(
                                              err.message || "Upload failed.",
                                              "error",
                                            ),
                                          )
                                          .finally(() =>
                                            setBlockUploading(null),
                                          );
                                      }
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {[
                          ["h1", "Heading"],
                          ["h2", "Subheading"],
                          ["text", "Text"],
                          ["image", "Image"],
                          ["file", "File"],
                        ].map(([type, label]) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              setPostBlocks((prev) => [
                                ...prev,
                                {
                                  id:
                                    "b_" +
                                    Math.random().toString(36).slice(2, 9),
                                  type: type as ContentBlock["type"],
                                  content: "",
                                },
                              ])
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dce4ef] dark:border-white/10 text-[11px] font-bold hover:border-[#2457c5]/30"
                          >
                            <Plus size={13} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10 p-4">
                      <p className="text-xs font-bold mb-3">Publish to</p>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={postPlatformHomepage}
                            onChange={(e) =>
                              setPostPlatformHomepage(e.target.checked)
                            }
                            className="accent-[#173d91] dark:accent-[#fcdd09]"
                          />
                          <span className="text-xs font-semibold">
                            StudentHub homepage
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={postPlatformEmail}
                            onChange={(e) =>
                              setPostPlatformEmail(e.target.checked)
                            }
                            className="accent-[#173d91] dark:accent-[#fcdd09]"
                          />
                          <span className="text-xs font-semibold">
                            Email subscribers
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => publishOrSaveAnnouncement(false)}
                        className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold"
                      >
                        Save draft
                      </button>

                      <button
                        type="button"
                        onClick={() => publishOrSaveAnnouncement(true)}
                        className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EVENTS */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] dark:text-[#fcdd09] mb-2">
                    Events
                  </p>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                    Event Manager
                  </h2>
                  <p className="text-sm text-[#667085] dark:text-gray-400 mt-1">
                    Create internal (physical) or external (online/registration)
                    events with cover images.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetEventForm}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold"
                >
                  <Plus size={17} />
                  New event
                </button>
              </div>

              <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2] dark:border-white/10">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      All events ({events.length})
                    </p>
                  </div>

                  <div className="max-h-[650px] overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#98a2b3]">
                        No events yet.
                      </div>
                    ) : (
                      events.map((event) => {
                        const evDate = (event.startDate as any)?.seconds
                          ? new Date((event.startDate as any).seconds * 1000)
                          : new Date(event.startDate);
                        const isExternal = !!(event as any).isExternal;

                        return (
                          <div
                            key={event.id}
                            className={`
                              p-4 border-b border-[#edf0f5] dark:border-white/5
                              hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition-colors
                              ${eventEditingId === event.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}
                            `}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => loadEventForEdit(event)}
                                className="flex-1 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                                      isExternal
                                        ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400"
                                        : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    {isExternal ? (
                                      <>
                                        <Video size={9} /> External
                                      </>
                                    ) : (
                                      <>
                                        <Building2 size={9} /> Physical
                                      </>
                                    )}
                                  </span>
                                </div>

                                <h3 className="text-sm font-bold line-clamp-2">
                                  {event.title}
                                </h3>

                                <p className="mt-1 text-[11px] text-[#667085] dark:text-gray-400">
                                  {evDate.toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                  {event.startTime
                                    ? ` · ${event.startTime}`
                                    : ""}
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteEventInline(event.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-[#e6ebf2] dark:border-white/10">
                    <p className="text-xs font-bold text-[#667085] dark:text-gray-400">
                      {eventEditingId ? "Editing event" : "Create new event"}
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold mb-2">
                        Event type
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setEventIsExternal(false)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                            !eventIsExternal
                              ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] shadow"
                              : "text-[#667085] dark:text-gray-400"
                          }`}
                        >
                          <Building2 size={14} />
                          Physical
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventIsExternal(true)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${
                            eventIsExternal
                              ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] shadow"
                              : "text-[#667085] dark:text-gray-400"
                          }`}
                        >
                          <Video size={14} />
                          External
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-2">
                        Event title *
                      </label>
                      <input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Annual Moot Court Championship"
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Category
                        </label>
                        <select
                          value={eventCategory}
                          onChange={(e) => setEventCategory(e.target.value)}
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold outline-none cursor-pointer"
                        >
                          <option value="academic">Academic</option>
                          <option value="moot">Moot Court</option>
                          <option value="debate">Debate</option>
                          <option value="career">Career</option>
                          <option value="social">Social</option>
                          <option value="workshop">Workshop</option>
                          <option value="seminar">Seminar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={eventStartDate}
                          onChange={(e) => setEventStartDate(e.target.value)}
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Start time
                        </label>
                        <input
                          type="text"
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          placeholder="10:00 AM"
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          End time
                        </label>
                        <input
                          type="text"
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          placeholder="4:00 PM"
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Capacity
                        </label>
                        <input
                          type="number"
                          value={eventCapacity}
                          onChange={(e) => setEventCapacity(e.target.value)}
                          placeholder="0 = unlimited"
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    {eventIsExternal ? (
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Meeting / Registration link *
                        </label>
                        <input
                          type="url"
                          value={eventMeetingLink}
                          onChange={(e) => setEventMeetingLink(e.target.value)}
                          placeholder="https://zoom.us/j/... or https://forms.gle/..."
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-2">
                            Physical venue *
                          </label>
                          <input
                            type="text"
                            value={eventVenue}
                            onChange={(e) => setEventVenue(e.target.value)}
                            placeholder="e.g. MKU Main Courtroom"
                            className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-2">
                            Google Maps link
                          </label>
                          <input
                            type="url"
                            value={eventGoogleMapsLink}
                            onChange={(e) =>
                              setEventGoogleMapsLink(e.target.value)
                            }
                            placeholder="https://maps.google.com/?q=..."
                            className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold mb-2">
                        Cover image
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                          {eventCoverUploading ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              <span className="text-xs font-bold">
                                Uploading...
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span className="text-xs font-bold">
                                {eventCoverImage ? "Replace" : "Upload cover"}
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                uploadLocalImage(
                                  file,
                                  setEventCoverImage,
                                  setEventCoverUploading,
                                  "Event cover uploaded!",
                                );
                              }
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>

                        {eventCoverImage && (
                          <button
                            type="button"
                            onClick={() => setEventCoverImage("")}
                            className="p-2.5 rounded-xl border border-[#dce4ef] dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {eventCoverImage && (
                      <img
                        src={eventCoverImage}
                        alt="Event cover preview"
                        className="w-full max-h-64 object-cover rounded-xl border border-[#dce4ef] dark:border-white/10"
                      />
                    )}

                    <div>
                      <label className="block text-xs font-bold mb-2">
                        Description
                      </label>
                      <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        rows={5}
                        placeholder="What's this event about?"
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none resize-y leading-relaxed"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Organizer name
                        </label>
                        <input
                          value={eventOrganizerName}
                          onChange={(e) =>
                            setEventOrganizerName(e.target.value)
                          }
                          placeholder="e.g. MKU Law Faculty"
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-2">
                          Organizer email
                        </label>
                        <input
                          type="email"
                          value={eventOrganizerEmail}
                          onChange={(e) =>
                            setEventOrganizerEmail(e.target.value)
                          }
                          placeholder="organizer@mku.ac.ke"
                          className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer p-4 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                      <input
                        type="checkbox"
                        checked={eventRequireApproval}
                        onChange={(e) =>
                          setEventRequireApproval(e.target.checked)
                        }
                        className="accent-[#173d91] dark:accent-[#fcdd09]"
                      />
                      <span className="text-xs font-semibold">
                        Require admin approval for registrations
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={resetEventForm}
                        className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={saveEventFromInline}
                        disabled={eventSaving}
                        className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold disabled:opacity-50"
                      >
                        {eventSaving
                          ? "Saving..."
                          : eventEditingId
                            ? "Update event"
                            : "Create event"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GALLERY */}
          {activeTab === "assets" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] dark:text-[#fcdd09] mb-2">
                    Gallery
                  </p>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                    Photos
                  </h2>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingAlbum(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold"
                  >
                    <FolderClosed size={16} />
                    New album
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold cursor-pointer">
                    <Plus size={17} />
                    Upload
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          addImagesToGallery(e.target.files);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {isCreatingAlbum && (
                <form
                  onSubmit={handleCreateAlbum}
                  className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 sm:p-6"
                >
                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      className="rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                      placeholder="Album name"
                    />
                    <input
                      value={newAlbumTopic}
                      onChange={(e) => setNewAlbumTopic(e.target.value)}
                      className="rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                      placeholder="Topic"
                    />
                    <input
                      value={newAlbumDescription}
                      onChange={(e) => setNewAlbumDescription(e.target.value)}
                      className="rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none"
                      placeholder="Description"
                    />
                  </div>

                  <div className="flex justify-end mt-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingAlbum(false)}
                      className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold"
                    >
                      Create album
                    </button>
                  </div>
                </form>
              )}

              {albums.length > 0 && (
                <section>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {albums.map((album) => {
                      const count = galleryItems.filter(
                        (item) => item.albumId === album.id,
                      ).length;
                      return (
                        <div
                          key={album.id}
                          className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5"
                        >
                          <div className="w-11 h-11 rounded-xl bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center mb-4">
                            <FolderClosed size={19} />
                          </div>

                          <h4 className="font-black truncate">{album.name}</h4>
                          <p className="text-xs text-[#667085] dark:text-gray-400 mt-1">
                            {album.topic || "Campus"}
                          </p>
                          <p className="text-[11px] text-[#98a2b3] mt-3">
                            {count} photo{count === 1 ? "" : "s"}
                          </p>

                          <div className="flex gap-2 mt-4">
                            <label className="flex-1 text-center py-2 rounded-lg bg-[#f4f6f9] dark:bg-white/10 text-[10px] font-bold cursor-pointer">
                              Add photos
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handleUploadPhotosToAlbum(
                                      album.id,
                                      e.target.files,
                                    );
                                  }
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                const nextName = window.prompt(
                                  "Album name",
                                  album.name,
                                );
                                if (nextName) {
                                  updateAlbumLabel(album.id, nextName);
                                }
                              }}
                              className="px-3 py-2 rounded-lg border border-[#dce4ef] dark:border-white/10 text-[10px] font-bold"
                            >
                              Rename
                            </button>

                            <button
                              type="button"
                              onClick={() => removeGalleryAlbum(album.id)}
                              className="px-3 py-2 rounded-lg border border-red-100 dark:border-red-500/30 text-[10px] font-bold text-red-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {galleryItems.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-xl overflow-hidden"
                    >
                      <div className="aspect-square bg-[#f4f6f9] dark:bg-white/5 overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.title || "Gallery"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="p-3">
                        <p className="text-xs font-bold truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[#98a2b3] mt-1 truncate">
                          {item.category}
                        </p>

                        <div className="flex gap-1.5 mt-3">
                          <button
                            type="button"
                            onClick={() => copyLinkClipboard(item.imageUrl)}
                            className="flex-1 py-1.5 rounded-lg bg-[#f4f6f9] dark:bg-white/10 text-[10px] font-bold"
                          >
                            Copy link
                          </button>

                          <button
                            type="button"
                            onClick={() => removeGalleryImage(item)}
                            className="w-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* VAULT */}
          {activeTab === "vault" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] dark:text-[#fcdd09] mb-2">
                  Community
                </p>
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                  Suggestions
                </h2>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="divide-y divide-[#edf0f5] dark:divide-white/5">
                    {vaultPosts.length === 0 ? (
                      <div className="p-10 text-center text-sm text-[#98a2b3]">
                        No suggestions yet.
                      </div>
                    ) : (
                      vaultPosts.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => {
                            setActiveVaultPost(post);
                            setVaultMessage(post.adminResponse || "");
                            setVaultStatus(post.status || "Under Review");
                          }}
                          className={`
                            w-full text-left p-5 hover:bg-[#f8fafc] dark:hover:bg-white/5
                            ${activeVaultPost?.id === post.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold">
                                {post.title}
                              </h4>
                              <p className="text-xs text-[#667085] dark:text-gray-400 mt-2 line-clamp-3">
                                {post.content}
                              </p>
                            </div>
                            <span className="shrink-0 px-2 py-1 rounded-md text-[9px] font-bold bg-[#fff9cf] text-[#173d91]">
                              {post.status || "Under Review"}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5">
                  <h3 className="font-black">Response</h3>

                  {activeVaultPost ? (
                    <div className="space-y-4 mt-6">
                      <select
                        value={vaultStatus}
                        onChange={(e) => setVaultStatus(e.target.value)}
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-3 py-3 text-sm outline-none"
                      >
                        <option value="Under Review">Under Review</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Addressed">Addressed</option>
                      </select>

                      <textarea
                        rows={7}
                        value={vaultMessage}
                        onChange={(e) => setVaultMessage(e.target.value)}
                        placeholder="Write the official response..."
                        className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 p-3 text-sm outline-none resize-y"
                      />

                      <button
                        type="button"
                        onClick={commitVaultStatus}
                        className="w-full py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold"
                      >
                        Save response
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#667085] dark:text-gray-400 mt-4">
                      Select a suggestion to review it.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ROSTER */}
          {activeTab === "roster" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                    Students
                  </h2>
                </div>

                <div className="flex p-1 bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("users")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                      rosterViewMode === "users"
                        ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91]"
                        : "text-[#667085] dark:text-gray-400"
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("newsletter")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold ${
                      rosterViewMode === "newsletter"
                        ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91]"
                        : "text-[#667085] dark:text-gray-400"
                    }`}
                  >
                    Newsletter
                  </button>
                </div>
              </div>

              {rosterViewMode === "users" ? (
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-[#f7f9fc] dark:bg-white/5 border-b border-[#e6ebf2] dark:border-white/10">
                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085] dark:text-gray-400">
                            Student
                          </th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085] dark:text-gray-400">
                            Role
                          </th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085] dark:text-gray-400">
                            Newsletter
                          </th>
                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085] dark:text-gray-400">
                            Access
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#edf0f5] dark:divide-white/5">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold">
                                {user.name || "Student"}
                              </p>
                              <p className="text-[11px] text-[#667085] dark:text-gray-400">
                                {user.email}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextRole =
                                    user.role === "admin" ? "student" : "admin";
                                  await fbfs.updateDocById("users", user.id, {
                                    role: nextRole,
                                  });
                                  triggerToast(`Role changed to ${nextRole}.`);
                                  await loadDatabaseRecords();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#f4f6f9] dark:bg-white/10 text-[10px] font-bold"
                              >
                                {user.role || "student"}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  user.newsletterSubscribed
                                    ? "bg-[#ecfdf3] text-[#027a48]"
                                    : "bg-[#f4f6f9] dark:bg-white/10 text-[#667085] dark:text-gray-400"
                                }`}
                              >
                                {user.newsletterSubscribed
                                  ? "Subscribed"
                                  : "Not subscribed"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextActive = !user.active;
                                  await fbfs.updateDocById("users", user.id, {
                                    active: nextActive,
                                  });
                                  triggerToast(
                                    nextActive
                                      ? "Student access enabled."
                                      : "Student access suspended.",
                                  );
                                  await loadDatabaseRecords();
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                                  user.active
                                    ? "bg-[#ecfdf3] text-[#027a48]"
                                    : "bg-[#fef3f2] text-[#b42318]"
                                }`}
                              >
                                {user.active ? "Active" : "Suspended"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5">
                  <p className="text-xs text-[#667085] dark:text-gray-400 mb-4">
                    {users.filter((u) => u.newsletterSubscribed).length} active
                    subscribers
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      const emails = users
                        .filter((u) => u.newsletterSubscribed)
                        .map((u) => u.email)
                        .filter(Boolean)
                        .join(", ");
                      navigator.clipboard
                        .writeText(emails)
                        .then(() => triggerToast("Subscriber emails copied."));
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-xs font-bold"
                  >
                    <LinkIcon size={14} />
                    Copy emails
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">
                Site settings
              </h2>

              <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl divide-y divide-[#edf0f5] dark:divide-white/5">
                {[
                  {
                    field: "marketplaceEnabled",
                    label: "Marketplace",
                    description: "Allow students to access the marketplace.",
                  },
                  {
                    field: "vaultEnabled",
                    label: "Suggestions",
                    description:
                      "Allow students to submit suggestions and feedback.",
                  },
                  {
                    field: "galleryEnabled",
                    label: "Gallery",
                    description: "Display the campus photo gallery.",
                  },
                  {
                    field: "eventsEnabled",
                    label: "Events",
                    description: "Enable event discovery and registration.",
                  },
                  {
                    field: "clubsOpen",
                    label: "Clubs",
                    description: "Allow students to access clubs.",
                  },
                  {
                    field: "newsletterEnabled",
                    label: "Newsletter",
                    description: "Allow newsletter subscriptions.",
                  },
                ].map((setting) => {
                  const enabled = Boolean((siteSettings as any)[setting.field]);
                  return (
                    <div
                      key={setting.field}
                      className="p-5 sm:p-6 flex items-center justify-between gap-5"
                    >
                      <div>
                        <p className="text-sm font-bold">{setting.label}</p>
                        <p className="text-xs text-[#667085] dark:text-gray-400 mt-1">
                          {setting.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveSiteTuning(setting.field)}
                        className={`relative shrink-0 w-12 h-7 rounded-full ${
                          enabled
                            ? "bg-[#173d91] dark:bg-[#fcdd09]"
                            : "bg-[#d0d5dd] dark:bg-white/20"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                            enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EMAIL */}
          {activeTab === "emails" && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white mb-6">
                Email Studio
              </h2>
              <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                <EmailStudio />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals — no more AdminEventModal */}
      <AdminSeoModal
        isOpen={isSeoOpen}
        onClose={() => setIsSeoOpen(false)}
        title={seoTitle}
        description={seoDescription}
        image={seoImage}
        onSave={(data) => {
          setSeoTitle(data.title);
          setSeoDescription(data.description);
          setSeoImage(data.image);
          setIsSeoOpen(false);
          triggerToast("SEO metadata updated successfully.");
        }}
      />

      <AdminNewsletterModal
        isOpen={isNlOpen}
        onClose={() => setIsNlOpen(false)}
        postTitle={postTitle}
        blocksCount={postBlocks.length}
        featuredImage={postCoverImage}
        blocks={postBlocks}
        onSendComplete={(sub, count) => {
          setIsNlOpen(false);
          triggerToast(
            `Newsletter broadcast initiated successfully to ${count} students!`,
          );
          logActivity(`Broadcasted mailshot: "${sub}"`, "Newsletter");
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] w-[min(420px,calc(100vw-2rem))]">
          <div className="bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] rounded-2xl shadow-[0_15px_45px_rgba(23,61,145,0.25)] border border-white/10 px-4 py-3.5 flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === "success"
                  ? "bg-[#fcdd09] dark:bg-[#173d91] text-[#173d91] dark:text-[#fcdd09]"
                  : "bg-red-500 text-white"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle size={16} />
              ) : (
                <X size={16} />
              )}
            </div>

            <p className="flex-1 text-xs sm:text-sm font-semibold leading-5">
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/50 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
