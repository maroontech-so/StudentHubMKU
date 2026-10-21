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
  Send,
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

  // Auth
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");

  // DB State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [listings, setListings] = useState<MarketplaceProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vaultPosts, setVaultPosts] = useState<VaultPost[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // Gallery
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [customImageTitle, setCustomImageTitle] = useState("");
  const [customImageCategory, setCustomImageCategory] = useState("campus");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumTopic, setNewAlbumTopic] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");

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
  const [bulletinEmailBroadcast, setBulletinEmailBroadcast] = useState(true);

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
  const [eventEmailBroadcast, setEventEmailBroadcast] = useState(true);

  // Settings
  const [siteSettings, setSiteSettings] = useState({
    marketplaceEnabled: true,
    vaultEnabled: true,
    galleryEnabled: true,
    eventsEnabled: true,
    clubsOpen: true,
    newsletterEnabled: true,
    bulletinsEnabled: true,
  });

  // Activity Feed
  const [activityFeed, setActivityFeed] = useState<
    Array<{ id: string; text: string; time: string; tag: string }>
  >([
    { id: "1", text: "Mooting Society registered 14 new students", time: "6 mins ago", tag: "Clubs" },
    { id: "2", text: "David Maraga Lecture finalized in Events Assembly", time: "22 mins ago", tag: "Events" },
    { id: "3", text: "Audit report completed on student parliament vault", time: "1 hour ago", tag: "Audit" },
  ]);

  // Posts
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postCoverImage, setPostCoverImage] = useState("");
  const [postCoverUploading, setPostCoverUploading] = useState(false);
  const [postBlocks, setPostBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "Write something brilliant today..." },
  ]);
  const [blockUploading, setBlockUploading] = useState<string | null>(null);
  const [postCategory, setPostCategory] = useState<"Update" | "Announcement" | "Communication">("Announcement");
  const [postPlatformHomepage, setPostPlatformHomepage] = useState(true);
  const [postPlatformEmail, setPostPlatformEmail] = useState(false);
  const [rosterViewMode, setRosterViewMode] = useState<"users" | "newsletter">("users");

  // Vault
  const [activeVaultPost, setActiveVaultPost] = useState<VaultPost | null>(null);
  const [vaultMessage, setVaultMessage] = useState("");
  const [vaultStatus, setVaultStatus] = useState("Under Review");

  // Modals
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImage, setSeoImage] = useState("");
  const [isNlOpen, setIsNlOpen] = useState(false);

  // Registrations
  const [reminderLoadingRegId, setReminderLoadingRegId] = useState<string | null>(null);
  const [approvalLoadingRegId, setApprovalLoadingRegId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const logActivity = (text: string, tag: string) => {
    const freshLog = { id: "log_" + Math.random().toString(36).substring(2, 6).toUpperCase(), text, time: "Just now", tag };
    setActivityFeed((prev) => [freshLog, ...prev]);
  };

  const loadDatabaseRecords = async () => {
    try {
      setLoading(true);
      const allAnn = await fbfs.getCollection<Announcement>("announcements", [], "createdAt", "desc");
      setAnnouncements(allAnn);

      const allBulletins = await fbfs.getCollection<Bulletin>("bulletins", [], "createdAt", "desc");
      setBulletins(allBulletins || []);

      const allEv = await fbfs.getCollection<Event>("events", [], "startDate", "desc");
      setEvents(allEv);

      const allClubs = await fbfs.getCollection<Club>("clubs", [], "name", "asc");
      setClubs(allClubs);

      const allGal = await fbfs.getCollection<GalleryItem>("gallery", [], "uploadedAt", "desc");
      setGalleryItems(allGal);

      const allAlbums = await fbfs.getCollection<GalleryAlbum>("gallery_albums", [], "createdAt", "desc");
      setAlbums(allAlbums || []);

      const allUsr = await fbfs.getCollection<UserProfile>("users");
      setUsers(allUsr);

      const allRegs = await fbfs.getCollection<EventRegistration>("eventRegistrations");
      setAllRegistrations(allRegs || []);

      const allListings = await fbfs.getCollection<MarketplaceProfile>("marketplaceProfiles", [], "createdAt", "desc");
      setListings(allListings);

      const settingsDoc = await fbfs.getDocById<any>("siteSettings", "default");
      if (settingsDoc) setSiteSettings(settingsDoc);
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = profile && (profile.role === "admin" || (profile as any).admin === true);

  useEffect(() => {
    if (authLoading) return;
    if (isUserAdmin) loadDatabaseRecords();
  }, [profile, authLoading]);

  useEffect(() => {
    const vaultRef = ref(rtdb, "vault");
    const unsubscribe = onValue(
      vaultRef,
      (snap) => {
        const data = snap.val() || {};
        const listed: VaultPost[] = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setVaultPosts(listed);
      },
      (err) => {
        // Note: If this fires, check your Firebase Realtime Database rules.
        // They must allow reading /vault for authenticated users.
        console.error("Vault DB stream error:", err);
      }
    );
    return () => {};
  }, []);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    setAdminLoginLoading(true);
    setAdminLoginError("");
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword.trim());
      triggerToast("Sign-in accepted. System Access Granted.");
    } catch (err: any) {
      setAdminLoginError(err.message || "Invalid credentials.");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const uploadLocalImage = async (file: File, setter: (url: string) => void, setLoadingFlag: (v: boolean) => void, successMsg: string = "Image uploaded successfully!") => {
    setLoadingFlag(true);
    try {
      const url = await uploadToImgBB(file);
      setter(url.trim());
      triggerToast(successMsg);
    } catch (err: any) {
      triggerToast(err.message || "Image upload failed.", "error");
    } finally {
      setLoadingFlag(false);
    }
  };

  /* =========================================================
     EMAIL BROADCAST HELPER (DEBUGGED)
  ========================================================= */
  const broadcastEmail = async (subject: string, title: string, contentBlocks: any[], featuredImage: string) => {
    try {
      const subscribedUsers = users.filter((u) => u.newsletterSubscribed);
      const targetEmails = subscribedUsers.map((u) => u.email).filter(Boolean) as string[];
      
      if (targetEmails.length === 0) {
        triggerToast("Email broadcast skipped: No subscribers.", "error");
        return;
      }

      console.log("Attempting to send email to:", targetEmails);

      const res = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject,
          postTitle: title,
          featuredImage: featuredImage || "",
          audience: "all",
          emails: targetEmails,
          blocks: contentBlocks,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("API Error Response:", errorData);
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Email API Success:", data);

      triggerToast(`Email broadcast sent to ${targetEmails.length} subscribers!`, "success");
      logActivity(`Broadcasted email: "${title.slice(0, 20)}..."`, "Newsletter");
    } catch (err: any) {
      console.error("Broadcast failed:", err);
      triggerToast(`Failed to send email broadcast: ${err.message}`, "error");
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
    setBulletinEmailBroadcast(true);
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
    setBulletinEmailBroadcast(false);
  };

  const saveBulletin = async (publish: boolean = true) => {
    if (!bulletinTitle.trim() || !bulletinContent.trim()) {
      triggerToast("Title and content are required.", "error");
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
        triggerToast("Bulletin updated!");
        logActivity(`Updated bulletin: "${bulletinTitle.slice(0, 20)}..."`, "Bulletin");
      } else {
        await fbfs.addDocInCollection("bulletins", {
          ...payload,
          createdAt: Date.now(),
          views: 0,
          reactions: { likes: 0, fires: 0, hearts: 0 },
        });
        triggerToast("New bulletin published!");
        logActivity(`Created bulletin: "${bulletinTitle.slice(0, 20)}..."`, "Bulletin");

        if (publish && bulletinEmailBroadcast) {
          await broadcastEmail(
            `[Bulletin] ${bulletinTitle.trim()}`,
            bulletinTitle.trim(),
            [{ type: "text", content: bulletinContent }],
            bulletinImageUrl
          );
        }
      }
      resetBulletinForm();
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save bulletin.", "error");
    } finally {
      setBulletinSaving(false);
    }
  };

  const deleteBulletin = async (id: string) => {
    if (!window.confirm("Delete this bulletin?")) return;
    try {
      await fbfs.deleteDocById("bulletins", id);
      triggerToast("Bulletin deleted.");
      if (editingBulletin?.id === id) resetBulletinForm();
      await loadDatabaseRecords();
    } catch (err) {
      triggerToast("Failed to delete bulletin.", "error");
    }
  };

  const toggleBulletinPublish = async (b: Bulletin) => {
    try {
      await fbfs.updateDocById("bulletins", b.id, { isPublished: !b.isPublished });
      triggerToast(b.isPublished ? "Unpublished." : "Published!");
      await loadDatabaseRecords();
    } catch (err) {
      triggerToast("Failed to toggle status.", "error");
    }
  };

  const addBulletinTag = () => {
    const tag = newTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !bulletinTags.includes(tag)) {
      setBulletinTags([...bulletinTags, tag]);
      setNewTagInput("");
    }
  };

  /* =========================================================
     POSTS (Announcements)
  ========================================================= */

  const loadDraftPost = (ann: Announcement) => {
    setEditPostId(ann.id);
    setPostTitle(ann.title || "");
    setPostCoverImage((ann as any).coverImage || "");
    setPostCategory((ann as any).category || "Announcement");
    setPostPlatformHomepage((ann as any).platforms?.includes("homepage") ?? true);
    setPostPlatformEmail((ann as any).platforms?.includes("email") ?? false);

    try {
      if ((ann as any).blocks) setPostBlocks(JSON.parse((ann as any).blocks));
      else setPostBlocks([{ id: "b1", type: "text", content: ann.content || "" }]);
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
    setPostBlocks([{ id: "b1", type: "text", content: "Write something brilliant today..." }]);
    triggerToast("Empty draft initiated.");
  };

  const publishOrSaveAnnouncement = async (isLivePublish: boolean) => {
    if (!postTitle.trim()) return triggerToast("Title is mandatory.", "error");
    if (!postPlatformHomepage && !postPlatformEmail) return triggerToast("Select at least one platform.", "error");

    try {
      const flatText = postBlocks.map((b) => b.content || "").join("\n\n");
      const platforms = [];
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
        triggerToast("Post updated.");
      } else {
        await fbfs.addDocInCollection("announcements", payload);
        triggerToast("Post published.");
      }

      if (isLivePublish && postPlatformEmail) {
        await broadcastEmail(
          `[${postCategory}] ${postTitle.trim()}`,
          postTitle.trim(),
          postBlocks,
          postCoverImage
        );
      }

      logActivity(`Saved Document: "${postTitle.slice(0, 16)}..."`, isLivePublish ? "News" : "Draft");
      createFreshDraft();
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Error saving post.", "error");
    }
  };

  const deleteAnnouncement = async () => {
    if (!editPostId) return createFreshDraft();
    try {
      await fbfs.deleteDocById("announcements", editPostId);
      triggerToast("Post deleted.");
      createFreshDraft();
      await loadDatabaseRecords();
    } catch (err) {
      triggerToast("Delete failed.", "error");
    }
  };

  /* =========================================================
     EVENTS (Inline Editor)
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
    setEventEmailBroadcast(true);
  };

  const loadEventForEdit = (event: Event) => {
    setEventEditingId(event.id);
    setEventTitle(event.title || "");
    setEventDescription(event.description || "");
    setEventCategory(event.category || "academic");
    setEventVenue(event.venue || "");
    
    const startDate = (event.startDate as any)?.seconds ? new Date((event.startDate as any).seconds * 1000) : new Date(event.startDate);
    setEventStartDate(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`);
    
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
    setEventEmailBroadcast(false);
  };

  const saveEventFromInline = async () => {
    if (!eventTitle.trim()) return triggerToast("Event title required.", "error");
    if (!eventStartDate) return triggerToast("Event date required.", "error");
    if (eventIsExternal && !eventMeetingLink.trim()) return triggerToast("External events require a meeting link.", "error");
    if (!eventIsExternal && !eventVenue.trim()) return triggerToast("Physical events require a venue.", "error");

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
        ...({ isExternal: eventIsExternal, meetingLink: eventMeetingLink.trim(), googleMapsLink: eventGoogleMapsLink.trim() } as any),
        published: true,
        visibility: "public",
        status: "active",
        featured: true,
      };

      if (eventEditingId) {
        await fbfs.updateDocById("events", eventEditingId, payload);
        triggerToast("Event updated!");
        logActivity(`Updated event: "${eventTitle}"`, "Events");
      } else {
        await fbfs.addDocInCollection("events", {
          ...payload,
          registeredCount: 0, goingCount: 0, interestedCount: 0, waitlistCount: 0,
        });
        triggerToast("Event created!");
        logActivity(`Created event: "${eventTitle}"`, "Events");

        if (eventEmailBroadcast) {
          const dateStr = localDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" });
          await broadcastEmail(
            `[Event] ${eventTitle.trim()}`,
            eventTitle.trim(),
            [
              { type: "h2", content: `📅 ${dateStr} @ ${eventStartTime || "10:00 AM"}` },
              { type: "text", content: eventDescription || "Join us for this upcoming event!" },
              { type: "text", content: `📍 Location: ${eventIsExternal ? eventMeetingLink : eventVenue}` },
            ],
            eventCoverImage
          );
        }
      }
      resetEventForm();
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to save event.", "error");
    } finally {
      setEventSaving(false);
    }
  };

  const deleteEventInline = async (id: string) => {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await fbfs.deleteDocById("events", id);
      triggerToast("Event deleted.");
      if (eventEditingId === id) resetEventForm();
      await loadDatabaseRecords();
    } catch (err) {
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
      triggerToast(`Uploading ${list.length} photos...`);
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        await fbfs.addDocInCollection("gallery", {
          title: list.length > 1 && customImageTitle.trim() ? `${customImageTitle.trim()} (${i + 1}/${list.length})` : customImageTitle.trim() || file.name.split(".")[0] || "Campus Gallery Snapshot",
          imageUrl: url.trim(),
          category: customImageCategory || "Campus Life",
          featured: true, visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: uploadAlbumId || "",
        });
      }
      triggerToast(`Uploaded ${list.length} photos!`);
      setCustomImageTitle("");
      setUploadAlbumId("");
      await loadDatabaseRecords();
    } catch (e: any) {
      triggerToast(e.message || "Upload failed.", "error");
    }
  };

  const handleUploadPhotosToAlbum = async (albumId: string, filesList: FileList) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(`Uploading ${list.length} images to album...`);
      const albumName = albums.find((a) => a.id === albumId)?.name || "Collection Item";
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        await fbfs.addDocInCollection("gallery", {
          title: list.length > 1 ? `${albumName} (${i + 1}/${list.length})` : file.name.split(".")[0],
          imageUrl: url.trim(),
          category: "Campus Life",
          featured: true, visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: albumId,
        });
      }
      triggerToast(`Added ${list.length} photos.`);
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to add photos.", "error");
    }
  };

  const handleCreateAlbum = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAlbumName.trim() || !newAlbumTopic.trim()) return triggerToast("Album name and topic required.", "error");
    try {
      await fbfs.addDocInCollection("gallery_albums", {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        topic: newAlbumTopic.trim(),
        createdAt: Date.now(),
      });
      setIsCreatingAlbum(false);
      setNewAlbumName(""); setNewAlbumDescription(""); setNewAlbumTopic("");
      triggerToast("Album created!");
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to create Album.", "error");
    }
  };

  const removeGalleryAlbum = async (albumId: string) => {
    if (!window.confirm("Delete this Album? Photos will be unassigned.")) return;
    try {
      await fbfs.deleteDocById("gallery_albums", albumId);
      const itemsInAlbum = galleryItems.filter((item) => item.albumId === albumId);
      for (const item of itemsInAlbum) await fbfs.updateDocById("gallery", item.id, { albumId: "" });
      triggerToast("Album deleted.");
      await loadDatabaseRecords();
    } catch (e: any) {
      triggerToast("Failed to delete Album.", "error");
    }
  };

  const removeGalleryImage = async (item: GalleryItem) => {
    try {
      await fbfs.deleteDocById("gallery", item.id);
      triggerToast("Photo deleted.");
      await loadDatabaseRecords();
    } catch (e) {
      triggerToast("Failed to delete photo.", "error");
    }
  };

  /* =========================================================
     VAULT & SETTINGS
  ========================================================= */

  const commitVaultStatus = async () => {
    if (!activeVaultPost) return;
    try {
      await set(ref(rtdb, `vault/${activeVaultPost.id}/status`), vaultStatus);
      await set(ref(rtdb, `vault/${activeVaultPost.id}/adminResponse`), vaultMessage);
      triggerToast("Status dispatched.");
      setActiveVaultPost(null);
      setVaultMessage("");
    } catch (e) {
      triggerToast("Failed to dispatch.", "error");
    }
  };

  const saveSiteTuning = async (field: string) => {
    try {
      const updated = { ...siteSettings, [field]: !(siteSettings as any)[field] };
      setSiteSettings(updated);
      await fbfs.setDocById("siteSettings", "default", updated);
      triggerToast("Settings updated.");
    } catch (e) {
      triggerToast("Failed to update settings.", "error");
    }
  };

  /* =========================================================
     REGISTRATIONS
  ========================================================= */

  const handleApproveRegistration = async (regId: string, reg: EventRegistration, event: Event) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, { approvalStatus: "approved" });
      setAllRegistrations((prev) => prev.map((x) => (x.id === regId ? { ...x, approvalStatus: "approved" } : x)));

      const dateStr = new Date(event.startDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) + (event.startTime ? ` @ ${event.startTime}` : "");
      const rendered = await fetchAndRenderEmailTemplate("event_registration", {
        applicantName: reg.userName, applicantEmail: reg.userEmail, eventTitle: event.title, eventDate: dateStr, eventVenue: event.venue || "Campus Auditorium",
      });

      await fetch("/api/send-event-registration-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantEmail: reg.userEmail, applicantName: reg.userName, eventTitle: event.title, eventDate: dateStr, eventVenue: event.venue || "Campus Auditorium",
          customFields: reg.customFields || {}, customSubject: rendered?.customSubject || undefined, customHtml: rendered?.customHtml || undefined,
        }),
      });
      triggerToast(`RSVP for ${reg.userName} approved!`, "success");
    } catch (err: any) {
      triggerToast("Error approving registration.", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  const handleDeclineRegistration = async (regId: string, reg: EventRegistration) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, { approvalStatus: "declined" });
      setAllRegistrations((prev) => prev.map((x) => (x.id === regId ? { ...x, approvalStatus: "declined" } : x)));
      triggerToast(`RSVP for ${reg.userName} declined.`);
    } catch (err: any) {
      triggerToast("Error declining registration.", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-12 animate-pulse w-full text-left">
        <p className="text-gray-400 font-mono text-xs tracking-widest text-center uppercase">
          CONSTRUCTING SECURE ADMIN_OS ENVIRONMENT...
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
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">EXECUTIVE CONSOLE</h2>
            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest">Restricted — MKU Parliament Credentials</p>
          </div>
          {adminLoginError && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/15 bg-red-500/10 text-xs text-red-400">{adminLoginError}</div>
          )}
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Admin Email</label>
              <input type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@mku.ac.ke" className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/40 font-semibold" />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Access Token Password</label>
              <input type="password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••••••" className="w-full bg-[#141416] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]/40" />
            </div>
            <button type="submit" disabled={adminLoginLoading} className="w-full bg-[#FFDE00] hover:bg-yellow-400 text-black font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-lg">
              {adminLoginLoading ? "Authorizing..." : "Confirm Executive Access"}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link href="/">
              <span className="text-[10px] font-mono text-[#FFDE00] hover:underline uppercase tracking-wider font-extrabold cursor-pointer">← Back To Student Hub</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-[#050505] text-[#172033] dark:text-white selection:bg-[#fcdd09] selection:text-[#173d91]">
      {sidebarMobileOpen && (
        <button type="button" aria-label="Close nav" onClick={() => setSidebarMobileOpen(false)} className="fixed inset-0 z-40 bg-[#071a3d]/40 backdrop-blur-sm lg:hidden" />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#173d91] dark:bg-[#0a0a0c] text-white flex flex-col shadow-[8px_0_30px_rgba(23,61,145,0.12)] transition-transform duration-300 ${sidebarMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${sidebarCollapsed ? "lg:w-[82px]" : "lg:w-[250px]"} w-[250px]`}>
        <div className="h-[76px] px-5 flex items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#fcdd09] flex items-center justify-center shrink-0">
              <span className="text-[#173d91] font-black text-lg">S</span>
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-black tracking-tight text-[15px] leading-none">STUDENTHUB</p>
                <p className="text-[10px] text-white/55 mt-1 font-medium">MKU ADMIN</p>
              </div>
            )}
          </div>
          <button type="button" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden lg:flex ml-auto w-8 h-8 rounded-lg items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button type="button" onClick={() => setSidebarMobileOpen(false)} className="lg:hidden ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <div className="space-y-1">
            {[
              { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
              { id: "bulletins", label: "Bulletins", icon: <Newspaper size={18} /> },
              { id: "news", label: "Content", icon: <FileText size={18} /> },
              { id: "events", label: "Events", icon: <CalendarIcon size={18} /> },
              { id: "assets", label: "Gallery", icon: <ImageIcon size={18} /> },
              { id: "roster", label: "Students", icon: <ShieldCheck size={18} /> },
            ].map((tab) => (
              <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id as any); setSidebarMobileOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer ${activeTab === tab.id ? "bg-[#fcdd09] text-[#173d91] font-bold shadow-[0_5px_18px_rgba(252,221,9,0.16)]" : "text-white/65 hover:text-white hover:bg-white/[0.07]"}`}>
                <span className="shrink-0">{tab.icon}</span>
                {!sidebarCollapsed && <span className="text-sm font-semibold">{tab.label}</span>}
              </button>
            ))}
          </div>
          <div className="my-7 h-px bg-white/10" />
          {!sidebarCollapsed && <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.14em] text-white/35 font-bold">More</p>}
          <div className="space-y-1">
            {[
              { id: "vault", label: "Suggestions", icon: <HelpCircle size={18} /> },
              { id: "emails", label: "Email", icon: <Mail size={18} /> },
              { id: "settings", label: "Settings", icon: <Layers size={18} /> },
            ].map((tab) => (
              <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id as any); setSidebarMobileOpen(false); }} className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all cursor-pointer ${activeTab === tab.id ? "bg-white text-[#173d91] font-bold" : "text-white/65 hover:text-white hover:bg-white/[0.07]"}`}>
                <span className="shrink-0">{tab.icon}</span>
                {!sidebarCollapsed && <span className="text-sm font-semibold">{tab.label}</span>}
              </button>
            ))}
          </div>
        </nav>
        <div className="p-3 border-t border-white/10 shrink-0">
          <Link href="/">
            <button type="button" className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer ${sidebarCollapsed ? "justify-center" : ""}`}>
              <LinkIcon size={17} />
              {!sidebarCollapsed && <span className="text-sm font-semibold">View StudentHub</span>}
            </button>
          </Link>
          <button type="button" onClick={logout} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer ${sidebarCollapsed ? "justify-center" : ""}`}>
            <LogOut size={17} />
            {!sidebarCollapsed && <span className="text-sm font-semibold">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[82px]" : "lg:pl-[250px]"}`}>
        <header className="sticky top-0 z-30 h-[76px] bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-[#dbe3ef] dark:border-white/10">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={() => setSidebarMobileOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-[#f2f5f9] dark:bg-white/5 border border-[#e1e7ef] dark:border-white/10 flex items-center justify-center text-[#173d91] dark:text-white cursor-pointer">
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.13em] text-[#2457c5] dark:text-[#fcdd09]">Admin</p>
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
                <button type="button" className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#dbe3ef] dark:border-white/10 bg-white dark:bg-white/5 text-[#344054] dark:text-white hover:border-[#2457c5]/30 hover:text-[#173d91] dark:hover:text-[#fcdd09] transition-colors cursor-pointer text-xs font-bold">
                  <LinkIcon size={15} /> View site
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
                    <p className="text-sm font-semibold text-[#2457c5] dark:text-[#fcdd09] mb-2">Welcome back, {profile?.name?.split(" ")[0] || "Admin"}.</p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] text-[#172033] dark:text-white">Here's what's happening</h2>
                  </div>
                  <div className="text-xs font-semibold text-[#667085] dark:text-gray-400">
                    {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                </div>
              </section>
              <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Bulletins", count: bulletins.length, icon: <Newspaper size={18} />, tab: "bulletins" },
                  { label: "Students", count: users.length, icon: <ShieldCheck size={18} />, tab: "roster" },
                  { label: "Events", count: events.length, icon: <CalendarIcon size={18} />, tab: "events" },
                  { label: "Photos", count: galleryItems.length, icon: <ImageIcon size={18} />, tab: "assets" },
                ].map((stat, i) => (
                  <button key={i} type="button" onClick={() => setActiveTab(stat.tab as any)} className="group text-left bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 hover:border-[#2457c5]/35 dark:hover:border-[#fcdd09]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#667085] dark:text-gray-400">{stat.label}</p>
                        <p className="mt-2 text-3xl font-black text-[#172033] dark:text-white">{stat.count}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center">
                        {stat.icon}
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-bold text-[#2457c5] dark:text-[#fcdd09] group-hover:translate-x-0.5 transition-transform">Manage {stat.label.toLowerCase()} →</p>
                  </button>
                ))}
              </section>
              <section className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl">
                <div className="px-5 sm:px-6 py-5 border-b border-[#e6ebf2] dark:border-white/10">
                  <h3 className="font-black text-lg">Recent activity</h3>
                </div>
                <div className="divide-y divide-[#edf0f5] dark:divide-white/5">
                  {activityFeed.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="px-5 sm:px-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-[#edf3ff] dark:bg-white/10 text-[#2457c5] dark:text-[#fcdd09] flex items-center justify-center shrink-0">
                        <CheckCircle size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#344054] dark:text-gray-300">{activity.text}</p>
                        <p className="text-[11px] text-[#98a2b3] mt-1">{activity.time}</p>
                      </div>
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
                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Campus Bulletins</h2>
                </div>
                <button type="button" onClick={resetBulletinForm} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold hover:bg-[#2457c5] dark:hover:bg-yellow-400">
                  <Plus size={17} /> New Bulletin
                </button>
              </div>
              <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="max-h-[650px] overflow-y-auto divide-y divide-[#edf0f5] dark:divide-white/5">
                    {bulletins.length === 0 ? (
                      <div className="p-8 text-center text-sm text-[#98a2b3]">No bulletins yet.</div>
                    ) : (
                      bulletins.map((bulletin) => (
                        <div key={bulletin.id} className={`p-4 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition-colors ${editingBulletin?.id === bulletin.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <button type="button" onClick={() => loadBulletinForEdit(bulletin)} className="flex-1 text-left">
                              <h3 className="text-sm font-bold line-clamp-2">{bulletin.title}</h3>
                            </button>
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={() => toggleBulletinPublish(bulletin)} className={`p-1.5 rounded-lg ${bulletin.isPublished ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                {bulletin.isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              <button type="button" onClick={() => deleteBulletin(bulletin.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
                  <input value={bulletinTitle} onChange={(e) => setBulletinTitle(e.target.value)} placeholder="Title *" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold outline-none" />
                  <select value={bulletinCategory} onChange={(e) => setBulletinCategory(e.target.value)} className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm font-semibold outline-none">
                    {BULLETIN_CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                  
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                      {bulletinImageUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span className="text-xs font-bold">{bulletinImageUrl ? "Replace Cover" : "Upload Cover"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLocalImage(f, setBulletinImageUrl, setBulletinImageUploading, "Cover uploaded!"); e.currentTarget.value = ""; }} />
                    </label>
                    {bulletinImageUrl && <button type="button" onClick={() => setBulletinImageUrl("")} className="p-2.5 rounded-xl border border-red-100 text-red-500"><Trash2 size={14} /></button>}
                  </div>
                  {bulletinImageUrl && <img src={bulletinImageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border border-[#dce4ef]" />}

                  <textarea value={bulletinContent} onChange={(e) => setBulletinContent(e.target.value)} rows={6} placeholder="Content *" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none resize-y" />
                  
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                    <input type="checkbox" checked={bulletinEmailBroadcast} onChange={(e) => setBulletinEmailBroadcast(e.target.checked)} className="accent-[#173d91] dark:accent-[#fcdd09]" />
                    <Send size={14} className="text-[#2457c5] dark:text-[#fcdd09]" />
                    <span className="text-xs font-semibold">Broadcast via email to subscribers</span>
                  </label>

                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => saveBulletin(false)} className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold">Save Draft</button>
                    <button type="button" onClick={() => saveBulletin(true)} className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold">Publish</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {activeTab === "news" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Posts</h2>
                <button type="button" onClick={createFreshDraft} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold">
                  <Plus size={17} /> New Post
                </button>
              </div>
              <div className="grid xl:grid-cols-[350px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden max-h-[650px] overflow-y-auto">
                  {announcements.map((ann) => (
                    <button key={ann.id} type="button" onClick={() => loadDraftPost(ann)} className={`w-full text-left p-4 border-b border-[#edf0f5] dark:border-white/5 hover:bg-[#f7f9fc] dark:hover:bg-white/5 ${editPostId === ann.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}`}>
                      <h3 className="text-sm font-bold line-clamp-2">{ann.title}</h3>
                    </button>
                  ))}
                </div>
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
                  <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold outline-none" />
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                    {postCoverUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span className="text-xs font-bold">{postCoverImage ? "Replace Cover" : "Upload Cover"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLocalImage(f, setPostCoverImage, setPostCoverUploading, "Cover uploaded!"); e.currentTarget.value = ""; }} />
                  </label>
                  {postCoverImage && <img src={postCoverImage} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />}
                  <textarea value={postBlocks[0]?.content || ""} onChange={(e) => setPostBlocks([{ id: "b1", type: "text", content: e.target.value }])} rows={8} placeholder="Content..." className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none resize-y" />
                  
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                    <input type="checkbox" checked={postPlatformEmail} onChange={(e) => setPostPlatformEmail(e.target.checked)} className="accent-[#173d91] dark:accent-[#fcdd09]" />
                    <Send size={14} className="text-[#2457c5] dark:text-[#fcdd09]" />
                    <span className="text-xs font-semibold">Broadcast via email to subscribers</span>
                  </label>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => publishOrSaveAnnouncement(false)} className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold">Save Draft</button>
                    <button type="button" onClick={() => publishOrSaveAnnouncement(true)} className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold">Publish</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EVENTS */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Event Manager</h2>
                <button type="button" onClick={resetEventForm} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold">
                  <Plus size={17} /> New Event
                </button>
              </div>
              <div className="grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden max-h-[650px] overflow-y-auto">
                  {events.map((event) => (
                    <div key={event.id} className={`p-4 border-b border-[#edf0f5] dark:border-white/5 hover:bg-[#f7f9fc] dark:hover:bg-white/5 ${eventEditingId === event.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}`}>
                      <div className="flex justify-between items-start gap-3">
                        <button type="button" onClick={() => loadEventForEdit(event)} className="flex-1 text-left">
                          <h3 className="text-sm font-bold line-clamp-2">{event.title}</h3>
                        </button>
                        <button type="button" onClick={() => deleteEventInline(event.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                    <button type="button" onClick={() => setEventIsExternal(false)} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold ${!eventIsExternal ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] shadow" : "text-[#667085]"}`}><Building2 size={14} /> Physical</button>
                    <button type="button" onClick={() => setEventIsExternal(true)} className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold ${eventIsExternal ? "bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] shadow" : "text-[#667085]"}`}><Video size={14} /> External</button>
                  </div>
                  <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Event Title *" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3.5 text-sm font-semibold outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none" />
                    <input type="text" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} placeholder="10:00 AM" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none" />
                  </div>
                  {eventIsExternal ? (
                    <input type="url" value={eventMeetingLink} onChange={(e) => setEventMeetingLink(e.target.value)} placeholder="Meeting / Registration Link *" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none" />
                  ) : (
                    <input type="text" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} placeholder="Physical Venue *" className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none" />
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#dce4ef] dark:border-white/10 cursor-pointer">
                    {eventCoverUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span className="text-xs font-bold">{eventCoverImage ? "Replace Cover" : "Upload Cover"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLocalImage(f, setEventCoverImage, setEventCoverUploading, "Cover uploaded!"); e.currentTarget.value = ""; }} />
                  </label>
                  {eventCoverImage && <img src={eventCoverImage} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />}
                  <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={4} placeholder="Event description..." className="w-full rounded-xl border border-[#dce4ef] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm outline-none resize-y" />
                  
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-[#f6f8fb] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10">
                    <input type="checkbox" checked={eventEmailBroadcast} onChange={(e) => setEventEmailBroadcast(e.target.checked)} className="accent-[#173d91] dark:accent-[#fcdd09]" />
                    <Send size={14} className="text-[#2457c5] dark:text-[#fcdd09]" />
                    <span className="text-xs font-semibold">Broadcast via email to subscribers</span>
                  </label>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={resetEventForm} className="px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold">Cancel</button>
                    <button type="button" onClick={saveEventFromInline} disabled={eventSaving} className="px-5 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold disabled:opacity-50">
                      {eventSaving ? "Saving..." : eventEditingId ? "Update Event" : "Create Event"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GALLERY */}
          {activeTab === "assets" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-end">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Gallery</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreatingAlbum(true)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#dce4ef] dark:border-white/10 text-sm font-bold"><FolderClosed size={16} /> New Album</button>
                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold cursor-pointer">
                    <Plus size={17} /> Upload
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) addImagesToGallery(e.target.files); e.currentTarget.value = ""; }} />
                  </label>
                </div>
              </div>
              {isCreatingAlbum && (
                <form onSubmit={handleCreateAlbum} className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 flex gap-4">
                  <input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} placeholder="Album Name" className="flex-1 rounded-xl border border-[#dce4ef] bg-white px-4 py-2 text-sm" />
                  <button type="submit" className="px-4 py-2 bg-[#173d91] text-white rounded-xl text-sm font-bold">Create</button>
                </form>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {galleryItems.map((item) => (
                  <div key={item.id} className="group bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-xl overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="aspect-square w-full object-cover" />
                    <div className="p-3 flex justify-between items-center">
                      <p className="text-xs font-bold truncate">{item.title}</p>
                      <button type="button" onClick={() => removeGalleryImage(item)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VAULT */}
          {activeTab === "vault" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Suggestions</h2>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl divide-y divide-[#edf0f5] dark:divide-white/5">
                  {vaultPosts.map((post) => (
                    <button key={post.id} type="button" onClick={() => { setActiveVaultPost(post); setVaultMessage(post.adminResponse || ""); setVaultStatus(post.status || "Under Review"); }} className={`w-full text-left p-5 hover:bg-[#f8fafc] dark:hover:bg-white/5 ${activeVaultPost?.id === post.id ? "bg-[#f1f5fb] dark:bg-white/10" : ""}`}>
                      <h4 className="text-sm font-bold">{post.title}</h4>
                      <p className="text-xs text-[#667085] dark:text-gray-400 mt-2 line-clamp-2">{post.content}</p>
                    </button>
                  ))}
                </div>
                <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl p-5 space-y-4">
                  <select value={vaultStatus} onChange={(e) => setVaultStatus(e.target.value)} className="w-full rounded-xl border border-[#dce4ef] bg-white px-3 py-2 text-sm">
                    <option value="Under Review">Under Review</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Addressed">Addressed</option>
                  </select>
                  <textarea rows={5} value={vaultMessage} onChange={(e) => setVaultMessage(e.target.value)} placeholder="Response..." className="w-full rounded-xl border border-[#dce4ef] bg-white p-3 text-sm" />
                  <button type="button" onClick={commitVaultStatus} className="w-full py-3 rounded-xl bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] text-sm font-bold">Save Response</button>
                </div>
              </div>
            </div>
          )}

          {/* ROSTER */}
          {activeTab === "roster" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Students</h2>
              <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-[#f7f9fc] dark:bg-white/5 border-b border-[#e6ebf2] dark:border-white/10">
                      <th className="px-5 py-4 text-[10px] uppercase tracking-wider text-[#667085]">Student</th>
                      <th className="px-5 py-4 text-[10px] uppercase tracking-wider text-[#667085]">Role</th>
                      <th className="px-5 py-4 text-[10px] uppercase tracking-wider text-[#667085]">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5] dark:divide-white/5">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-5 py-4"><p className="text-sm font-bold">{user.name}</p><p className="text-[11px] text-[#667085]">{user.email}</p></td>
                        <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-lg bg-[#f4f6f9] dark:bg-white/10 text-[10px] font-bold">{user.role || "student"}</span></td>
                        <td className="px-5 py-4">
                          <button type="button" onClick={async () => { await fbfs.updateDocById("users", user.id, { active: !user.active }); await loadDatabaseRecords(); }} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${user.active ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#fef3f2] text-[#b42318]"}`}>
                            {user.active ? "Active" : "Suspended"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white">Settings</h2>
              <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl divide-y divide-[#edf0f5] dark:divide-white/5">
                {["marketplaceEnabled", "vaultEnabled", "galleryEnabled", "eventsEnabled"].map((field) => (
                  <div key={field} className="p-5 flex items-center justify-between">
                    <p className="text-sm font-bold capitalize">{field.replace("Enabled", "")}</p>
                    <button type="button" onClick={() => saveSiteTuning(field)} className={`relative w-12 h-7 rounded-full transition-colors ${(siteSettings as any)[field] ? "bg-[#173d91] dark:bg-[#fcdd09]" : "bg-[#d0d5dd]"}`}>
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${(siteSettings as any)[field] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMAIL */}
          {activeTab === "emails" && (
            <div className="animate-fade-in">
              <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033] dark:text-white mb-6">Email Studio</h2>
              <div className="bg-white dark:bg-white/5 border border-[#dce4ef] dark:border-white/10 rounded-2xl overflow-hidden"><EmailStudio /></div>
            </div>
          )}

        </div>
      </main>

      <AdminSeoModal isOpen={isSeoOpen} onClose={() => setIsSeoOpen(false)} title={seoTitle} description={seoDescription} image={seoImage} onSave={(d) => { setSeoTitle(d.title); setSeoDescription(d.description); setSeoImage(d.image); setIsSeoOpen(false); triggerToast("SEO updated."); }} />
      <AdminNewsletterModal isOpen={isNlOpen} onClose={() => setIsNlOpen(false)} postTitle={postTitle} blocksCount={postBlocks.length} featuredImage={postCoverImage} blocks={postBlocks} onSendComplete={(s, c) => { setIsNlOpen(false); triggerToast(`Sent to ${c} students!`); }} />

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] w-[min(420px,calc(100vw-2rem))]">
          <div className="bg-[#173d91] dark:bg-[#fcdd09] text-white dark:text-[#173d91] rounded-2xl shadow-[0_15px_45px_rgba(23,61,145,0.25)] border border-white/10 px-4 py-3.5 flex items-center gap-3">
            <p className="flex-1 text-xs sm:text-sm font-semibold">{toast.message}</p>
            <button type="button" onClick={() => setToast(null)} className="opacity-50 hover:opacity-100"><X size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
