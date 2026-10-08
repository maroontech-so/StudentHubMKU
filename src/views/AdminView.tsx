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
} from "../types";
import { fetchAndRenderEmailTemplate } from "../utils/emailHelper";

import { AdminSeoModal } from "../components/AdminSeoModal";
import { AdminNewsletterModal } from "../components/AdminNewsletterModal";
import { AdminEventModal } from "../components/AdminEventModal";
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
  Bell,
  Database,
  HardDrive,
  Trash2,
  Link as LinkIcon,
  GripVertical,
  Layers,
  Heading1,
  Heading2,
  Type,
  Paperclip,
  Activity,
  CheckCircle,
  HelpCircle,
  Mail,
  Zap,
  ChevronLeft,
  ChevronRight,
  Plus,
  FolderClosed,
  Ticket,
  X,
} from "lucide-react";

interface ContentBlock {
  id: string;
  type: "h1" | "h2" | "text" | "image" | "file";
  content: string;
  meta?: {
    label?: string;
  };
}

export function AdminView() {
  const { profile, loading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Selected tab
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "news"
    | "events"
    | "assets"
    | "vault"
    | "roster"
    | "settings"
    | "emails"
  >("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Authentication credentials override if not validated
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState("");

  // States loaded from DB
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);

  // Gallery album and creation state for Admin
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [customImageTitle, setCustomImageTitle] = useState("");
  const [customImageCategory, setCustomImageCategory] = useState("campus");
  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumTopic, setNewAlbumTopic] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [plusMode, setPlusMode] = useState<"none" | "general" | "collection">(
    "none",
  );
  const [colUploadName, setColUploadName] = useState("");
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [assigningImageId, setAssigningImageId] = useState<string | null>(null);
  const [listings, setListings] = useState<MarketplaceProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [vaultPosts, setVaultPosts] = useState<VaultPost[]>([]);
  const [loading, setLoading] = useState(true);

  // General App settings
  const [siteSettings, setSiteSettings] = useState({
    marketplaceEnabled: true,
    vaultEnabled: true,
    galleryEnabled: true,
    eventsEnabled: true,
    clubsOpen: true,
    newsletterEnabled: true,
  });

  // Local logged audit streams
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

  // Current post draft edit logic
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postCoverImage, setPostCoverImage] = useState("");
  const [adminPreviewDevice, setAdminPreviewDevice] = useState<"pc" | "mobile">(
    "pc",
  );
  const [postBlocks, setPostBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "Write something brilliant today..." },
  ]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [postCategory, setPostCategory] = useState<
    "Update" | "Announcement" | "Communication"
  >("Announcement");
  const [postPlatformHomepage, setPostPlatformHomepage] = useState(true);
  const [postPlatformEmail, setPostPlatformEmail] = useState(false);
  const [rosterViewMode, setRosterViewMode] = useState<
    "users" | "newsletter"
  >("users");

  // Suggested item responds
  const [activeVaultPost, setActiveVaultPost] = useState<VaultPost | null>(null);
  const [vaultMessage, setVaultMessage] = useState("");
  const [vaultStatus, setVaultStatus] = useState("Under Review");

  // Dynamic calendar dates
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Global popup controllers
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoImage, setSeoImage] = useState("");

  const [isNlOpen, setIsNlOpen] = useState(false);

  const [isEvOpen, setIsEvOpen] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] =
    useState<Event | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");

  // Event dynamic attendee monitoring and campaign states
  const [selectedEventForAnalysis, setSelectedEventForAnalysis] =
    useState<Event | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<
    EventRegistration[]
  >([]);
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

      const allRegs = await fbfs.getCollection<EventRegistration>(
        "eventRegistrations",
      );
      setAllRegistrations(allRegs || []);

      const allListings = await fbfs.getCollection<MarketplaceProfile>(
        "marketplaceProfiles",
        [],
        "createdAt",
        "desc",
      );
      setListings(allListings);

      const settingsDoc = await fbfs.getDocById<any>(
        "siteSettings",
        "default",
      );
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

  // Read Suggestions from real-time database
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

  // --- ANNOUNCEMENT BULLETINS WORKFLOW ---
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
      (ann as any).platforms
        ? (ann as any).platforms.includes("email")
        : false,
    );

    try {
      if ((ann as any).blocks) {
        setPostBlocks(JSON.parse((ann as any).blocks));
      } else {
        setPostBlocks([
          { id: "b1", type: "text", content: ann.content || "" },
        ]);
      }
    } catch (e) {
      setPostBlocks([
        { id: "b1", type: "text", content: ann.content || "" },
      ]);
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
        triggerToast(
          "Corporate bulletin saved and updated in cloud database.",
        );
      } else {
        await fbfs.addDocInCollection("announcements", payload);
        triggerToast(
          "Fresh central release bulletin successfully published.",
        );
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

  const swapBlocks = (fromIdx: number, toIdx: number) => {
    const updated = [...postBlocks];
    const item = updated.splice(fromIdx, 1)[0];
    updated.splice(toIdx, 0, item);
    setPostBlocks(updated);
  };

  // --- EVENTS HUB SAVE OPERATIONS ---
  const saveEventAssembly = async (payload: Partial<Event>) => {
    try {
      const [yr, mo, dy] = selectedCalendarDate.split("-").map(Number);
      const localDate = new Date(yr, mo - 1, dy, 0, 0, 0);

      const updatedPayload: Partial<Event> = {
        ...payload,
        startDate: payload.startDate || localDate,
        endDate: payload.endDate || localDate,
        organizerName: payload.organizerName || "MKU Law Faculty",
        waitlistCount: payload.waitlistCount ?? 0,
        registeredCount: payload.registeredCount ?? 0,
        goingCount: payload.goingCount ?? 0,
        interestedCount: payload.interestedCount ?? 0,
        published: true,
        visibility: "public",
        status: payload.status || "active",
        featured: true,
      };

      if (selectedCalendarEvent) {
        await fbfs.updateDocById(
          "events",
          selectedCalendarEvent.id,
          updatedPayload,
        );
        triggerToast("Assembly event updated successfully!");
      } else {
        await fbfs.addDocInCollection("events", updatedPayload);
        triggerToast(
          "Interactive assembly calendar event cataloged!",
        );
      }

      logActivity(`Calibrated assembly: "${payload.title}"`, "Events");
      setIsEvOpen(false);
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast("Assembly update failed.", "error");
    }
  };

  const deleteEventAssembly = async (evId: string) => {
    try {
      await fbfs.deleteDocById("events", evId);
      triggerToast("Assembly event archived.");
      setIsEvOpen(false);
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
    }
  };

  // --- GALLERY VAULT UPLOADS ---
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

  const handleCreateAndUploadCollection = async (
    name: string,
    filesList: FileList,
  ) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(
        `Creating collection and uploading ${list.length} images...`,
      );
      const albumPayload: Partial<GalleryAlbum> = {
        name: name.trim(),
        topic: "Campus Life",
        description: `Created directly on ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
      };
      const albumRef = await fbfs.addDocInCollection(
        "gallery_albums",
        albumPayload,
      );
      const albumId = albumRef;

      let uploadedCount = 0;
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        const payload: Partial<GalleryItem> = {
          title:
            list.length > 1
              ? `${name.trim()} (${i + 1}/${list.length})`
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
        uploadedCount++;
      }
      triggerToast(
        `Successfully established directory "${name}" with ${uploadedCount} photos!`,
      );
      logActivity(`Established collection "${name}"`, "Gallery");
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast(
        err.message || "Failed to create and upload collection.",
        "error",
      );
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

  const removeImageFromCollection = async (item: GalleryItem) => {
    try {
      await fbfs.updateDocById("gallery", item.id, { albumId: "" });
      triggerToast("Photo removed from this collection.");
      await loadDatabaseRecords();
    } catch (err) {
      triggerToast("Failed to remove photo.", "error");
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

  // --- PARLIAMENT VAULT MODERATION ---
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

  // --- EVENT REGISTRATIONS & CAMPAIGNS ---
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

      const rendered = await fetchAndRenderEmailTemplate(
        "event_registration",
        {
          applicantName: reg.userName,
          applicantEmail: reg.userEmail,
          eventTitle: event.title,
          eventDate: dateStr,
          eventVenue: event.venue || "Campus Auditorium",
        },
      );

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
      triggerToast(
        `RSVP pass for ${reg.userName} marked as declined.`,
        "success",
      );
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

  // --- CALENDAR MONTH CALCULATIONS ---
  const getDaysInMonthGrid = () => {
    const list = [];
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      list.push({ empty: true });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d,
      ).padStart(2, "0")}`;
      const matchingEvents = events.filter((e) => {
        if (!e.startDate) return false;
        const evDate = new Date(
          (e.startDate as any).seconds
            ? (e.startDate as any).seconds * 1000
            : e.startDate,
        );
        const compareStr = `${evDate.getFullYear()}-${String(
          evDate.getMonth() + 1,
        ).padStart(2, "0")}-${String(evDate.getDate()).padStart(2, "0")}`;
        return compareStr === dateStr;
      });

      list.push({
        empty: false,
        day: d,
        dateString: dateStr,
        events: matchingEvents,
      });
    }

    return list;
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

  // RESTRICTED LOGIN SCREEN IF VISITOR IS UNVERIFIED
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
    <div className="min-h-screen bg-[#eef3f9] text-[#172033] selection:bg-[#fcdd09] selection:text-[#173d91]">
      {/* Mobile backdrop */}
      {sidebarMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#071a3d]/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* =========================================================
          SIDEBAR
      ========================================================= */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          bg-[#173d91] text-white
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
        {/* Brand */}
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
            aria-label="Toggle sidebar"
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
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <div className="space-y-1">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: <LayoutDashboard size={18} />,
              },
              {
                id: "news",
                label: "Content",
                icon: <FileText size={18} />,
              },
              {
                id: "events",
                label: "Events",
                icon: <CalendarIcon size={18} />,
              },
              {
                id: "assets",
                label: "Gallery",
                icon: <ImageIcon size={18} />,
              },
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
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`
                    w-full flex items-center gap-3
                    rounded-xl
                    px-3 py-3
                    text-left
                    transition-all duration-200
                    cursor-pointer
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

          <p
            className={`
              px-3 mb-2
              text-[10px] uppercase tracking-[0.14em]
              text-white/35 font-bold
              ${sidebarCollapsed ? "lg:hidden" : ""}
            `}
          >
            More
          </p>

          <div className="space-y-1">
            {[
              {
                id: "vault",
                label: "Suggestions",
                icon: <HelpCircle size={18} />,
              },
              {
                id: "emails",
                label: "Email",
                icon: <Mail size={18} />,
              },
              {
                id: "settings",
                label: "Settings",
                icon: <Layers size={18} />,
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
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`
                    w-full flex items-center gap-3
                    rounded-xl
                    px-3 py-3
                    text-left
                    transition-all duration-200
                    cursor-pointer
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

        {/* Sidebar footer */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <Link href="/">
            <button
              type="button"
              className={`
                w-full flex items-center gap-3
                px-3 py-3 rounded-xl
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
              w-full flex items-center gap-3
              px-3 py-3 rounded-xl
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

      {/* =========================================================
          MAIN APPLICATION
      ========================================================= */}
      <main
        className={`
          min-h-screen
          transition-[padding] duration-300
          ${sidebarCollapsed ? "lg:pl-[82px]" : "lg:pl-[250px]"}
        `}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-[76px] bg-white/90 backdrop-blur-xl border-b border-[#dbe3ef]">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarMobileOpen(true)}
                className="lg:hidden w-10 h-10 rounded-xl bg-[#f2f5f9] border border-[#e1e7ef] flex items-center justify-center text-[#173d91] cursor-pointer"
                aria-label="Open navigation"
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.13em] text-[#2457c5]">
                  Admin
                </p>

                <h1 className="text-base sm:text-lg font-black text-[#172033] truncate">
                  {activeTab === "overview" && "Overview"}
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
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#dbe3ef] bg-white text-[#344054] hover:border-[#2457c5]/30 hover:text-[#173d91] transition-colors cursor-pointer text-xs font-bold"
                >
                  <LinkIcon size={15} />
                  View site
                </button>
              </Link>

              <div className="w-10 h-10 rounded-xl bg-[#173d91] text-white flex items-center justify-center font-black text-sm">
                {(profile?.name || "A").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-7 lg:py-9 max-w-[1500px] mx-auto">
          {/* =====================================================
              OVERVIEW
          ===================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              <section>
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-[#2457c5] mb-2">
                      Welcome back, {profile?.name?.split(" ")[0] || "Admin"}.
                    </p>

                    <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] text-[#172033]">
                      Here's what's happening
                    </h2>

                    <p className="mt-2 text-sm text-[#667085] max-w-xl">
                      Manage StudentHub content, events, students and community
                      activity from one place.
                    </p>
                  </div>

                  <div className="text-xs font-semibold text-[#667085]">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("roster")}
                  className="group text-left bg-white border border-[#dce4ef] rounded-2xl p-5 hover:border-[#2457c5]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085]">
                        Students
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033]">
                        {users.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center">
                      <ShieldCheck size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5] group-hover:translate-x-0.5 transition-transform">
                    Manage students →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("events")}
                  className="group text-left bg-white border border-[#dce4ef] rounded-2xl p-5 hover:border-[#2457c5]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085]">
                        Events
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033]">
                        {events.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#fff9cf] text-[#173d91] flex items-center justify-center">
                      <CalendarIcon size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5]">
                    Manage events →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("news")}
                  className="group text-left bg-white border border-[#dce4ef] rounded-2xl p-5 hover:border-[#2457c5]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085]">
                        Posts
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033]">
                        {announcements.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5]">
                    Manage content →
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("assets")}
                  className="group text-left bg-white border border-[#dce4ef] rounded-2xl p-5 hover:border-[#2457c5]/35 hover:shadow-[0_10px_30px_rgba(23,61,145,0.07)] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#667085]">
                        Photos
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#172033]">
                        {galleryItems.length}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-[#fff9cf] text-[#173d91] flex items-center justify-center">
                      <ImageIcon size={18} />
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] font-bold text-[#2457c5]">
                    Manage gallery →
                  </p>
                </button>
              </section>

              {/* Quick actions + attention */}
              <section className="grid lg:grid-cols-[1.35fr_1fr] gap-5">
                <div className="bg-white border border-[#dce4ef] rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-black text-lg text-[#172033]">
                        Quick actions
                      </h3>
                      <p className="text-xs text-[#667085] mt-1">
                        Common admin tasks
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("news");
                        createFreshDraft();
                      }}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#e1e7ef] hover:border-[#2457c5]/35 hover:bg-[#f7f9fc] transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#173d91] text-white flex items-center justify-center shrink-0">
                        <Plus size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#172033]">
                          Create post
                        </p>
                        <p className="text-[11px] text-[#667085] mt-0.5">
                          Publish an announcement
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("events");
                        setSelectedCalendarEvent(null);
                        setSelectedCalendarDate(
                          new Date().toISOString().slice(0, 10),
                        );
                        setIsEvOpen(true);
                      }}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#e1e7ef] hover:border-[#2457c5]/35 hover:bg-[#f7f9fc] transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#fcdd09] text-[#173d91] flex items-center justify-center shrink-0">
                        <CalendarIcon size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#172033]">
                          Create event
                        </p>
                        <p className="text-[11px] text-[#667085] mt-0.5">
                          Add something to the calendar
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("assets")}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#e1e7ef] hover:border-[#2457c5]/35 hover:bg-[#f7f9fc] transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center shrink-0">
                        <ImageIcon size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#172033]">
                          Upload photos
                        </p>
                        <p className="text-[11px] text-[#667085] mt-0.5">
                          Add media to the gallery
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("roster")}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#e1e7ef] hover:border-[#2457c5]/35 hover:bg-[#f7f9fc] transition-all text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center shrink-0">
                        <ShieldCheck size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#172033]">
                          View students
                        </p>
                        <p className="text-[11px] text-[#667085] mt-0.5">
                          Manage accounts and access
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-[#173d91] text-white rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black text-lg">
                        Needs attention
                      </h3>
                      <p className="text-xs text-white/55 mt-1">
                        Items that may need your review
                      </p>
                    </div>

                    <Activity size={18} className="text-[#fcdd09]" />
                  </div>

                  <div className="mt-6 space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("events")}
                      className="w-full flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.11] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#fcdd09]" />
                        <span className="text-sm font-semibold">
                          Event registrations
                        </span>
                      </div>

                      <span className="text-sm font-black text-[#fcdd09]">
                        {
                          allRegistrations.filter(
                            (r) =>
                              r.approvalStatus !== "approved" &&
                              r.approvalStatus !== "declined",
                          ).length
                        }
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("vault")}
                      className="w-full flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.11] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#fcdd09]" />
                        <span className="text-sm font-semibold">
                          Suggestions
                        </span>
                      </div>

                      <span className="text-sm font-black text-[#fcdd09]">
                        {
                          vaultPosts.filter(
                            (p) => !p.status || p.status === "Under Review",
                          ).length
                        }
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("news")}
                      className="w-full flex items-center justify-between gap-4 p-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.11] transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#fcdd09]" />
                        <span className="text-sm font-semibold">
                          Draft posts
                        </span>
                      </div>

                      <span className="text-sm font-black text-[#fcdd09]">
                        {
                          announcements.filter(
                            (a) => (a as any).visible === false,
                          ).length
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Activity */}
              <section className="bg-white border border-[#dce4ef] rounded-2xl">
                <div className="px-5 sm:px-6 py-5 border-b border-[#e6ebf2]">
                  <h3 className="font-black text-lg text-[#172033]">
                    Recent activity
                  </h3>
                  <p className="text-xs text-[#667085] mt-1">
                    Latest actions from the admin workspace
                  </p>
                </div>

                <div className="divide-y divide-[#edf0f5]">
                  {activityFeed.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-[#98a2b3]">
                      No recent activity.
                    </div>
                  ) : (
                    activityFeed.slice(0, 6).map((activity) => (
                      <div
                        key={activity.id}
                        className="px-5 sm:px-6 py-4 flex items-center gap-4"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#edf3ff] text-[#2457c5] flex items-center justify-center shrink-0">
                          <CheckCircle size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#344054]">
                            {activity.text}
                          </p>

                          <p className="text-[11px] text-[#98a2b3] mt-1">
                            {activity.time}
                          </p>
                        </div>

                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-[#f4f6f9] text-[10px] font-bold text-[#667085]">
                          {activity.tag}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* =====================================================
              CONTENT
          ===================================================== */}
          {activeTab === "news" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                    Content
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                    Posts
                  </h2>

                  <p className="text-sm text-[#667085] mt-1">
                    Write, edit and publish StudentHub announcements.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={createFreshDraft}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] transition-colors cursor-pointer"
                >
                  <Plus size={17} />
                  New post
                </button>
              </div>

              <div className="grid xl:grid-cols-[350px_minmax(0,1fr)] gap-5">
                {/* Posts list */}
                <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2]">
                    <p className="text-xs font-bold text-[#667085]">
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
                            w-full text-left p-4 border-b border-[#edf0f5]
                            hover:bg-[#f7f9fc] transition-colors cursor-pointer
                            ${editPostId === ann.id ? "bg-[#f1f5fb]" : ""}
                          `}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold text-[#172033] line-clamp-2">
                              {ann.title}
                            </h3>

                            <span
                              className={`
                                shrink-0 px-2 py-1 rounded-md text-[9px] font-bold
                                ${
                                  (ann as any).visible === false
                                    ? "bg-[#fff4e5] text-[#b54708]"
                                    : "bg-[#ecfdf3] text-[#027a48]"
                                }
                              `}
                            >
                              {(ann as any).visible === false
                                ? "Draft"
                                : "Live"}
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] text-[#667085] line-clamp-2">
                            {ann.content}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Editor */}
                <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-[#e6ebf2] flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-[#667085]">
                        {editPostId ? "Editing post" : "New post"}
                      </p>

                      <p className="text-[11px] text-[#98a2b3] mt-0.5">
                        Changes are saved to Firebase.
                      </p>
                    </div>

                    {editPostId && (
                      <button
                        type="button"
                        onClick={deleteAnnouncement}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-2">
                        Title
                      </label>

                      <input
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="Write a clear headline..."
                        className="w-full rounded-xl border border-[#dce4ef] bg-white px-4 py-3.5 text-sm font-semibold text-[#172033] outline-none focus:border-[#2457c5] focus:ring-4 focus:ring-[#2457c5]/10 transition-all"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-2">
                          Category
                        </label>

                        <select
                          value={postCategory}
                          onChange={(e) =>
                            setPostCategory(
                              e.target.value as
                                | "Update"
                                | "Announcement"
                                | "Communication",
                            )
                          }
                          className="w-full rounded-xl border border-[#dce4ef] bg-white px-4 py-3 text-sm font-semibold text-[#172033] outline-none focus:border-[#2457c5] cursor-pointer"
                        >
                          <option value="Announcement">Announcement</option>
                          <option value="Update">Update</option>
                          <option value="Communication">Communication</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-2">
                          Cover image
                        </label>

                        <input
                          value={postCoverImage}
                          onChange={(e) => setPostCoverImage(e.target.value)}
                          placeholder="Image URL (optional)"
                          className="w-full rounded-xl border border-[#dce4ef] bg-white px-4 py-3 text-sm text-[#172033] outline-none focus:border-[#2457c5]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label className="text-xs font-bold text-[#344054]">
                          Content
                        </label>

                        <span className="text-[10px] text-[#98a2b3]">
                          {postBlocks.length} block
                          {postBlocks.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {postBlocks.map((block, index) => (
                          <div
                            key={block.id}
                            className="border border-[#dce4ef] rounded-xl overflow-hidden bg-[#fbfcfe]"
                          >
                            <div className="px-3 py-2 border-b border-[#e6ebf2] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical
                                  size={15}
                                  className="text-[#98a2b3]"
                                />

                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                                  {block.type}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setPostBlocks((prev) =>
                                    prev.filter(
                                      (_, blockIndex) =>
                                        blockIndex !== index,
                                    ),
                                  );
                                }}
                                className="text-[#98a2b3] hover:text-red-500 cursor-pointer"
                                aria-label="Remove block"
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
                                    prev.map((item, blockIndex) =>
                                      blockIndex === index
                                        ? {
                                            ...item,
                                            content: e.target.value,
                                          }
                                        : item,
                                    ),
                                  );
                                }}
                                rows={block.type === "text" ? 6 : 3}
                                className="w-full bg-transparent p-4 text-sm leading-6 text-[#344054] outline-none resize-y"
                              />
                            ) : (
                              <input
                                value={block.content}
                                onChange={(e) => {
                                  setPostBlocks((prev) =>
                                    prev.map((item, blockIndex) =>
                                      blockIndex === index
                                        ? {
                                            ...item,
                                            content: e.target.value,
                                          }
                                        : item,
                                    ),
                                  );
                                }}
                                className="w-full bg-transparent p-4 text-sm text-[#344054] outline-none"
                              />
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dce4ef] bg-white text-[11px] font-bold text-[#667085] hover:border-[#2457c5]/30 hover:text-[#2457c5] transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#f6f8fb] border border-[#e6ebf2] p-4">
                      <p className="text-xs font-bold text-[#344054] mb-3">
                        Publish to
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={postPlatformHomepage}
                            onChange={(e) =>
                              setPostPlatformHomepage(e.target.checked)
                            }
                            className="accent-[#173d91]"
                          />
                          <span className="text-xs font-semibold text-[#475467]">
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
                            className="accent-[#173d91]"
                          />
                          <span className="text-xs font-semibold text-[#475467]">
                            Email subscribers
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => publishOrSaveAnnouncement(false)}
                        className="px-4 py-3 rounded-xl border border-[#dce4ef] bg-white text-[#344054] text-sm font-bold hover:bg-[#f8fafc] transition-colors cursor-pointer"
                      >
                        Save draft
                      </button>

                      <button
                        type="button"
                        onClick={() => publishOrSaveAnnouncement(true)}
                        className="px-5 py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] transition-colors cursor-pointer"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              EVENTS
          ===================================================== */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                    Events
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                    Calendar
                  </h2>

                  <p className="text-sm text-[#667085] mt-1">
                    Create events and manage registrations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCalendarEvent(null);
                    setSelectedCalendarDate(
                      new Date().toISOString().slice(0, 10),
                    );
                    setIsEvOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] cursor-pointer"
                >
                  <Plus size={17} />
                  Create event
                </button>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      className="w-9 h-9 rounded-lg border border-[#dce4ef] flex items-center justify-center hover:bg-[#f6f8fb] cursor-pointer"
                    >
                      <ChevronLeft size={17} />
                    </button>

                    <h3 className="font-black text-[#172033]">
                      {calendarMonth.toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>

                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      className="w-9 h-9 rounded-lg border border-[#dce4ef] flex items-center justify-center hover:bg-[#f6f8fb] cursor-pointer"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-7 mb-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day) => (
                          <div
                            key={day}
                            className="text-center text-[10px] font-bold uppercase tracking-wider text-[#98a2b3] py-2"
                          >
                            {day}
                          </div>
                        ),
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonthGrid().map((cell: any, index) => {
                        if (cell.empty) {
                          return (
                            <div
                              key={`empty-${index}`}
                              className="min-h-[76px] sm:min-h-[92px]"
                            />
                          );
                        }

                        const hasEvents =
                          cell.events && cell.events.length > 0;

                        return (
                          <button
                            key={cell.dateString}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarDate(cell.dateString);

                              if (hasEvents) {
                                setSelectedCalendarEvent(cell.events[0]);
                              } else {
                                setSelectedCalendarEvent(null);
                              }

                              setIsEvOpen(true);
                            }}
                            className={`
                              min-h-[76px] sm:min-h-[92px]
                              rounded-xl border p-2
                              text-left
                              transition-all
                              cursor-pointer
                              ${
                                hasEvents
                                  ? "border-[#2457c5]/25 bg-[#f4f7fd] hover:bg-[#edf3ff]"
                                  : "border-transparent hover:border-[#dce4ef] hover:bg-[#f8fafc]"
                              }
                            `}
                          >
                            <span className="text-xs font-bold text-[#344054]">
                              {cell.day}
                            </span>

                            {hasEvents && (
                              <div className="mt-2 space-y-1">
                                {cell.events
                                  .slice(0, 2)
                                  .map((event: Event) => (
                                    <div
                                      key={event.id}
                                      className="px-1.5 py-1 rounded-md bg-[#173d91] text-white text-[9px] font-bold truncate"
                                    >
                                      {event.title}
                                    </div>
                                  ))}

                                {cell.events.length > 2 && (
                                  <p className="text-[9px] font-bold text-[#2457c5]">
                                    +{cell.events.length - 2} more
                                  </p>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Events list / registrations */}
                <div className="space-y-5">
                  <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#e6ebf2]">
                      <h3 className="font-black text-[#172033]">
                        Upcoming events
                      </h3>
                    </div>

                    <div className="divide-y divide-[#edf0f5] max-h-[380px] overflow-y-auto">
                      {events.length === 0 ? (
                        <p className="p-7 text-center text-sm text-[#98a2b3]">
                          No events available.
                        </p>
                      ) : (
                        events.slice(0, 8).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarEvent(event);

                              const d = new Date(event.startDate);
                              setSelectedCalendarDate(
                                `${d.getFullYear()}-${String(
                                  d.getMonth() + 1,
                                ).padStart(2, "0")}-${String(
                                  d.getDate(),
                                ).padStart(2, "0")}`,
                              );

                              setIsEvOpen(true);
                            }}
                            className="w-full text-left p-4 hover:bg-[#f8fafc] transition-colors cursor-pointer"
                          >
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center shrink-0">
                                <CalendarIcon size={17} />
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#172033] truncate">
                                  {event.title}
                                </p>

                                <p className="text-[11px] text-[#667085] mt-1">
                                  {new Date(
                                    event.startDate,
                                  ).toLocaleDateString()}
                                  {event.startTime
                                    ? ` · ${event.startTime}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-[#dce4ef] rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-black text-[#172033]">
                          Registration review
                        </h3>
                        <p className="text-[11px] text-[#667085] mt-1">
                          Pending attendee requests
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-[#fff9cf] text-[#173d91] text-[10px] font-black">
                        {
                          allRegistrations.filter(
                            (r) =>
                              r.approvalStatus !== "approved" &&
                              r.approvalStatus !== "declined",
                          ).length
                        }
                      </span>
                    </div>

                    <div className="space-y-2">
                      {allRegistrations
                        .filter(
                          (r) =>
                            r.approvalStatus !== "approved" &&
                            r.approvalStatus !== "declined",
                        )
                        .slice(0, 5)
                        .map((reg) => {
                          const event = events.find(
                            (e) => e.id === reg.eventId,
                          );

                          if (!event) return null;

                          return (
                            <div
                              key={reg.id}
                              className="p-3 rounded-xl bg-[#f7f9fc] border border-[#e6ebf2]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#172033] truncate">
                                    {reg.userName}
                                  </p>

                                  <p className="text-[10px] text-[#667085] mt-1 truncate">
                                    {event.title}
                                  </p>
                                </div>

                                <span className="text-[9px] font-bold text-[#b54708] bg-[#fff4e5] px-2 py-1 rounded-md shrink-0">
                                  Pending
                                </span>
                              </div>

                              <div className="flex gap-2 mt-3">
                                <button
                                  type="button"
                                  disabled={approvalLoadingRegId === reg.id}
                                  onClick={() =>
                                    handleApproveRegistration(
                                      reg.id,
                                      reg,
                                      event,
                                    )
                                  }
                                  className="flex-1 py-2 rounded-lg bg-[#173d91] text-white text-[10px] font-bold hover:bg-[#2457c5] disabled:opacity-50 cursor-pointer"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  disabled={approvalLoadingRegId === reg.id}
                                  onClick={() =>
                                    handleDeclineRegistration(reg.id, reg)
                                  }
                                  className="px-3 py-2 rounded-lg border border-[#dce4ef] text-[#667085] text-[10px] font-bold hover:bg-white disabled:opacity-50 cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {allRegistrations.filter(
                        (r) =>
                          r.approvalStatus !== "approved" &&
                          r.approvalStatus !== "declined",
                      ).length === 0 && (
                        <div className="py-7 text-center text-xs text-[#98a2b3]">
                          No pending registrations.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              GALLERY
          ===================================================== */}
          {activeTab === "assets" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                    Gallery
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                    Photos
                  </h2>

                  <p className="text-sm text-[#667085] mt-1">
                    Upload campus photography and organise albums.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingAlbum(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#dce4ef] bg-white text-[#344054] text-sm font-bold hover:bg-[#f8fafc] cursor-pointer"
                  >
                    <FolderClosed size={16} />
                    New album
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] cursor-pointer">
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
                  className="bg-white border border-[#dce4ef] rounded-2xl p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-black text-lg text-[#172033]">
                        Create album
                      </h3>
                      <p className="text-xs text-[#667085] mt-1">
                        Create a collection before adding photos.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreatingAlbum(false)}
                      className="w-9 h-9 rounded-lg hover:bg-[#f4f6f9] flex items-center justify-center text-[#667085] cursor-pointer"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-2">
                        Album name
                      </label>

                      <input
                        value={newAlbumName}
                        onChange={(e) => setNewAlbumName(e.target.value)}
                        className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5]"
                        placeholder="e.g. Moot Court 2026"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-2">
                        Topic
                      </label>

                      <input
                        value={newAlbumTopic}
                        onChange={(e) => setNewAlbumTopic(e.target.value)}
                        className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5]"
                        placeholder="Campus Life"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#344054] mb-2">
                        Description
                      </label>

                      <input
                        value={newAlbumDescription}
                        onChange={(e) =>
                          setNewAlbumDescription(e.target.value)
                        }
                        className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5]"
                        placeholder="Short description"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      className="px-5 py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] cursor-pointer"
                    >
                      Create album
                    </button>
                  </div>
                </form>
              )}

              {/* Upload controls */}
              <div className="bg-white border border-[#dce4ef] rounded-2xl p-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-2">
                      Photo title
                    </label>

                    <input
                      value={customImageTitle}
                      onChange={(e) => setCustomImageTitle(e.target.value)}
                      placeholder="Optional title"
                      className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-2">
                      Category
                    </label>

                    <input
                      value={customImageCategory}
                      onChange={(e) => setCustomImageCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-2">
                      Album
                    </label>

                    <select
                      value={uploadAlbumId}
                      onChange={(e) => setUploadAlbumId(e.target.value)}
                      className="w-full rounded-xl border border-[#dce4ef] px-4 py-3 text-sm outline-none focus:border-[#2457c5] cursor-pointer"
                    >
                      <option value="">No album</option>

                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Albums */}
              {albums.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-[#172033]">
                      Albums
                    </h3>

                    <span className="text-xs font-semibold text-[#667085]">
                      {albums.length} collections
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {albums.map((album) => {
                      const count = galleryItems.filter(
                        (item) => item.albumId === album.id,
                      ).length;

                      return (
                        <div
                          key={album.id}
                          className="bg-white border border-[#dce4ef] rounded-2xl p-5 hover:border-[#2457c5]/25 transition-colors"
                        >
                          <div className="w-11 h-11 rounded-xl bg-[#edf3ff] text-[#2457c5] flex items-center justify-center mb-4">
                            <FolderClosed size={19} />
                          </div>

                          <h4 className="font-black text-[#172033] truncate">
                            {album.name}
                          </h4>

                          <p className="text-xs text-[#667085] mt-1">
                            {album.topic || "Campus"}
                          </p>

                          <p className="text-[11px] text-[#98a2b3] mt-3">
                            {count} photo{count === 1 ? "" : "s"}
                          </p>

                          <div className="flex gap-2 mt-4">
                            <label className="flex-1 text-center py-2 rounded-lg bg-[#f4f6f9] text-[10px] font-bold text-[#344054] hover:bg-[#edf3ff] hover:text-[#2457c5] cursor-pointer">
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
                              className="px-3 py-2 rounded-lg border border-[#dce4ef] text-[10px] font-bold text-[#667085] hover:bg-[#f8fafc] cursor-pointer"
                            >
                              Rename
                            </button>

                            <button
                              type="button"
                              onClick={() => removeGalleryAlbum(album.id)}
                              className="px-3 py-2 rounded-lg border border-red-100 text-[10px] font-bold text-red-500 hover:bg-red-50 cursor-pointer"
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

              {/* Gallery grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-[#172033]">
                    All photos
                  </h3>

                  <span className="text-xs font-semibold text-[#667085]">
                    {galleryItems.length} photos
                  </span>
                </div>

                {galleryItems.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#ccd5e2] rounded-2xl py-16 text-center">
                    <ImageIcon size={32} className="mx-auto text-[#98a2b3]" />
                    <p className="mt-3 text-sm font-bold text-[#667085]">
                      No photos uploaded yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {galleryItems.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white border border-[#dce4ef] rounded-xl overflow-hidden"
                      >
                        <div className="aspect-square bg-[#f4f6f9] overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.title || "Gallery image"}
                            className="w-full h-full object-cover group-hover:scale-[1.025] transition-transform duration-300"
                          />
                        </div>

                        <div className="p-3">
                          <p className="text-xs font-bold text-[#172033] truncate">
                            {item.title}
                          </p>

                          <p className="text-[10px] text-[#98a2b3] mt-1 truncate">
                            {item.category}
                          </p>

                          <div className="flex gap-1.5 mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                copyLinkClipboard(item.imageUrl)
                              }
                              className="flex-1 py-1.5 rounded-lg bg-[#f4f6f9] text-[10px] font-bold text-[#667085] hover:text-[#2457c5] cursor-pointer"
                            >
                              Copy link
                            </button>

                            <button
                              type="button"
                              onClick={() => removeGalleryImage(item)}
                              className="w-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* =====================================================
              SUGGESTIONS
          ===================================================== */}
          {activeTab === "vault" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                  Community
                </p>

                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                  Suggestions
                </h2>

                <p className="text-sm text-[#667085] mt-1">
                  Review student feedback and send official responses.
                </p>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#e6ebf2]">
                    <h3 className="font-black text-[#172033]">
                      Submissions
                    </h3>
                  </div>

                  <div className="divide-y divide-[#edf0f5]">
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
                            w-full text-left p-5 hover:bg-[#f8fafc] transition-colors cursor-pointer
                            ${
                              activeVaultPost?.id === post.id
                                ? "bg-[#f1f5fb]"
                                : ""
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#172033]">
                                {post.title}
                              </h4>

                              <p className="text-xs text-[#667085] mt-2 line-clamp-3">
                                {post.content}
                              </p>
                            </div>

                            <span
                              className={`
                                shrink-0 px-2 py-1 rounded-md text-[9px] font-bold
                                ${
                                  post.status === "Addressed"
                                    ? "bg-[#ecfdf3] text-[#027a48]"
                                    : post.status === "Investigating"
                                      ? "bg-[#edf3ff] text-[#2457c5]"
                                      : "bg-[#fff9cf] text-[#173d91]"
                                }
                              `}
                            >
                              {post.status || "Under Review"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3 mt-4 text-[10px] text-[#98a2b3]">
                            <span>{post.authorName || "Anonymous"}</span>

                            <span>
                              {new Date(post.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white border border-[#dce4ef] rounded-2xl p-5">
                  <h3 className="font-black text-[#172033]">Response</h3>

                  <p className="text-xs text-[#667085] mt-1">
                    Update the status and send a response.
                  </p>

                  {activeVaultPost ? (
                    <div className="space-y-4 mt-6">
                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-2">
                          Status
                        </label>

                        <select
                          value={vaultStatus}
                          onChange={(e) => setVaultStatus(e.target.value)}
                          className="w-full rounded-xl border border-[#dce4ef] px-3 py-3 text-sm outline-none focus:border-[#2457c5] cursor-pointer"
                        >
                          <option value="Under Review">Under Review</option>
                          <option value="Investigating">
                            Investigating
                          </option>
                          <option value="Addressed">Addressed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#344054] mb-2">
                          Response
                        </label>

                        <textarea
                          rows={7}
                          value={vaultMessage}
                          onChange={(e) => setVaultMessage(e.target.value)}
                          placeholder="Write the official response..."
                          className="w-full rounded-xl border border-[#dce4ef] p-3 text-sm leading-6 outline-none resize-y focus:border-[#2457c5]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={commitVaultStatus}
                        className="w-full py-3 rounded-xl bg-[#173d91] text-white text-sm font-bold hover:bg-[#2457c5] cursor-pointer"
                      >
                        Save response
                      </button>
                    </div>
                  ) : (
                    <div className="mt-8 p-6 rounded-xl bg-[#f7f9fc] text-center">
                      <HelpCircle
                        size={26}
                        className="mx-auto text-[#98a2b3]"
                      />

                      <p className="text-xs text-[#667085] mt-3">
                        Select a suggestion to review it.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              STUDENTS
          ===================================================== */}
          {activeTab === "roster" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                    Students
                  </p>

                  <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                    Students
                  </h2>

                  <p className="text-sm text-[#667085] mt-1">
                    Manage student accounts and newsletter subscriptions.
                  </p>
                </div>

                <div className="flex p-1 bg-white border border-[#dce4ef] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("users")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      rosterViewMode === "users"
                        ? "bg-[#173d91] text-white"
                        : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Students
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterViewMode("newsletter")}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      rosterViewMode === "newsletter"
                        ? "bg-[#173d91] text-white"
                        : "text-[#667085] hover:text-[#172033]"
                    }`}
                  >
                    Newsletter
                  </button>
                </div>
              </div>

              {rosterViewMode === "users" ? (
                <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-[#f7f9fc] border-b border-[#e6ebf2]">
                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                            Student
                          </th>

                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                            Role
                          </th>

                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                            Newsletter
                          </th>

                          <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                            Access
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#edf0f5]">
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-[#fbfcfe] transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#edf3ff] text-[#2457c5] flex items-center justify-center font-black text-xs">
                                  {(user.name || "S")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-[#172033]">
                                    {user.name || "Student"}
                                  </p>

                                  <p className="text-[11px] text-[#667085] truncate max-w-[280px]">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextRole =
                                    user.role === "admin"
                                      ? "student"
                                      : "admin";

                                  await fbfs.updateDocById(
                                    "users",
                                    user.id,
                                    { role: nextRole },
                                  );

                                  triggerToast(
                                    `Role changed to ${nextRole}.`,
                                  );

                                  await loadDatabaseRecords();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#f4f6f9] text-[10px] font-bold text-[#475467] hover:bg-[#edf3ff] hover:text-[#2457c5] cursor-pointer"
                              >
                                {user.role || "student"}
                              </button>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`
                                  inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold
                                  ${
                                    user.newsletterSubscribed
                                      ? "bg-[#ecfdf3] text-[#027a48]"
                                      : "bg-[#f4f6f9] text-[#667085]"
                                  }
                                `}
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

                                  await fbfs.updateDocById(
                                    "users",
                                    user.id,
                                    { active: nextActive },
                                  );

                                  triggerToast(
                                    nextActive
                                      ? "Student access enabled."
                                      : "Student access suspended.",
                                  );

                                  await loadDatabaseRecords();
                                }}
                                className={`
                                  px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer
                                  ${
                                    user.active
                                      ? "bg-[#ecfdf3] text-[#027a48]"
                                      : "bg-[#fef3f2] text-[#b42318]"
                                  }
                                `}
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
                <div className="space-y-5">
                  <div className="bg-white border border-[#dce4ef] rounded-2xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-black text-[#172033]">
                          Newsletter subscribers
                        </h3>

                        <p className="text-xs text-[#667085] mt-1">
                          {
                            users.filter((user) => user.newsletterSubscribed)
                              .length
                          }{" "}
                          active subscribers
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const emails = users
                            .filter((user) => user.newsletterSubscribed)
                            .map((user) => user.email)
                            .filter(Boolean)
                            .join(", ");

                          navigator.clipboard
                            .writeText(emails)
                            .then(() =>
                              triggerToast("Subscriber emails copied."),
                            );
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#173d91] text-white text-xs font-bold hover:bg-[#2457c5] cursor-pointer"
                      >
                        <LinkIcon size={14} />
                        Copy emails
                      </button>
                    </div>

                    <textarea
                      readOnly
                      value={users
                        .filter((user) => user.newsletterSubscribed)
                        .map((user) => user.email)
                        .filter(Boolean)
                        .join(", ")}
                      className="mt-4 w-full h-20 rounded-xl bg-[#f7f9fc] border border-[#e6ebf2] p-3 text-xs text-[#667085] outline-none resize-none"
                    />
                  </div>

                  <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[650px]">
                        <thead>
                          <tr className="bg-[#f7f9fc] border-b border-[#e6ebf2]">
                            <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                              Student
                            </th>

                            <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                              Joined
                            </th>

                            <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                              Status
                            </th>

                            <th className="px-5 py-4 text-[10px] uppercase tracking-wider font-bold text-[#667085]">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#edf0f5]">
                          {users
                            .filter((user) => user.newsletterSubscribed)
                            .map((user) => (
                              <tr key={user.id}>
                                <td className="px-5 py-4">
                                  <p className="text-sm font-bold text-[#172033]">
                                    {user.name || "Student"}
                                  </p>

                                  <p className="text-[11px] text-[#667085]">
                                    {user.email}
                                  </p>
                                </td>

                                <td className="px-5 py-4 text-xs text-[#667085]">
                                  {user.createdAt
                                    ? new Date(
                                        user.createdAt,
                                      ).toLocaleDateString()
                                    : "—"}
                                </td>

                                <td className="px-5 py-4">
                                  <span className="px-2.5 py-1 rounded-lg bg-[#ecfdf3] text-[#027a48] text-[10px] font-bold">
                                    Active
                                  </span>
                                </td>

                                <td className="px-5 py-4">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          `Unsubscribe ${user.email}?`,
                                        )
                                      ) {
                                        return;
                                      }

                                      await fbfs.updateDocById(
                                        "users",
                                        user.id,
                                        {
                                          newsletterSubscribed: false,
                                        },
                                      );

                                      triggerToast(
                                        "Subscriber removed.",
                                      );

                                      await loadDatabaseRecords();
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}

                          {users.filter(
                            (user) => user.newsletterSubscribed,
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-5 py-12 text-center text-sm text-[#98a2b3]"
                              >
                                No newsletter subscribers yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================
              SETTINGS
          ===================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                  Settings
                </p>

                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                  Site settings
                </h2>

                <p className="text-sm text-[#667085] mt-1">
                  Control which StudentHub features are available.
                </p>
              </div>

              <div className="bg-white border border-[#dce4ef] rounded-2xl divide-y divide-[#edf0f5]">
                {[
                  {
                    field: "marketplaceEnabled",
                    label: "Marketplace",
                    description:
                      "Allow students to access the marketplace.",
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
                  const enabled = Boolean(
                    (siteSettings as any)[setting.field],
                  );

                  return (
                    <div
                      key={setting.field}
                      className="p-5 sm:p-6 flex items-center justify-between gap-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#172033]">
                          {setting.label}
                        </p>

                        <p className="text-xs text-[#667085] mt-1">
                          {setting.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveSiteTuning(setting.field)}
                        className={`
                          relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer
                          ${enabled ? "bg-[#173d91]" : "bg-[#d0d5dd]"}
                        `}
                        aria-label={`Toggle ${setting.label}`}
                      >
                        <span
                          className={`
                            absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                            ${
                              enabled ? "translate-x-6" : "translate-x-1"
                            }
                          `}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsSeoOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#dce4ef] text-sm font-bold text-[#344054] hover:bg-[#f8fafc] cursor-pointer"
                >
                  <Search size={16} />
                  SEO settings
                </button>

                <button
                  type="button"
                  onClick={() => setIsNlOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#dce4ef] text-sm font-bold text-[#344054] hover:bg-[#f8fafc] cursor-pointer"
                >
                  <Mail size={16} />
                  Newsletter
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              EMAIL
          ===================================================== */}
          {activeTab === "emails" && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2457c5] mb-2">
                  Email
                </p>

                <h2 className="text-3xl font-black tracking-[-0.03em] text-[#172033]">
                  Email Studio
                </h2>

                <p className="text-sm text-[#667085] mt-1">
                  Manage your email templates and communications.
                </p>
              </div>

              <div className="bg-white border border-[#dce4ef] rounded-2xl overflow-hidden">
                <EmailStudio />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================
          EXISTING MODALS
      ========================================================= */}

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
          logActivity(
            `Broadcasted mailshot: "${sub}"`,
            "Newsletter",
          );
        }}
      />

      <AdminEventModal
        isOpen={isEvOpen}
        onClose={() => setIsEvOpen(false)}
        selectedEvent={selectedCalendarEvent}
        targetDate={selectedCalendarDate}
        onSave={saveEventAssembly}
        onDelete={deleteEventAssembly}
      />

      {/* =========================================================
          TOAST
      ========================================================= */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] w-[min(420px,calc(100vw-2rem))]">
          <div className="bg-[#173d91] text-white rounded-2xl shadow-[0_15px_45px_rgba(23,61,145,0.25)] border border-white/10 px-4 py-3.5 flex items-center gap-3">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${
                  toast.type === "success"
                    ? "bg-[#fcdd09] text-[#173d91]"
                    : "bg-red-500 text-white"
                }
              `}
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
              className="text-white/50 hover:text-white cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
