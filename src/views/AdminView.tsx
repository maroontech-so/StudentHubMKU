import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import { auth, fbfs, rtdb, uploadToImgBB } from "../lib/firebase";
import { ref, set, onValue } from "firebase/database";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Announcement, Event, UserProfile, Club, GalleryItem, GalleryAlbum, MarketplaceProfile, VaultPost, EventRegistration } from "../types";
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
  X
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
  const [activeTab, setActiveTab] = useState<"overview" | "news" | "events" | "assets" | "vault" | "roster" | "settings" | "emails">("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [plusMode, setPlusMode] = useState<"none" | "general" | "collection">("none");
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
    newsletterEnabled: true
  });

  // Local logged audit streams
  const [activityFeed, setActivityFeed] = useState<Array<{ id: string; text: string; time: string; tag: string }>>([
    { id: "1", text: "Mooting Society registered 14 new students", time: "6 mins ago", tag: "Clubs" },
    { id: "2", text: "David Maraga Lecture finalized in Events Assembly", time: "22 mins ago", tag: "Events" },
    { id: "3", text: "Audit report completed on student parliament vault", time: "1 hour ago", tag: "Audit" }
  ]);

  // Current post draft edit logic
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postCoverImage, setPostCoverImage] = useState("");
  const [adminPreviewDevice, setAdminPreviewDevice] = useState<"pc" | "mobile">("pc");
  const [postBlocks, setPostBlocks] = useState<ContentBlock[]>([
    { id: "b1", type: "text", content: "Write something brilliant today..." }
  ]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [postCategory, setPostCategory] = useState<"Update" | "Announcement" | "Communication">("Announcement");
  const [postPlatformHomepage, setPostPlatformHomepage] = useState(true);
  const [postPlatformEmail, setPostPlatformEmail] = useState(false);
  const [rosterViewMode, setRosterViewMode] = useState<"users" | "newsletter">("users");

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
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<Event | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");

  // Event dynamic attendee monitoring and campaign states
  const [selectedEventForAnalysis, setSelectedEventForAnalysis] = useState<Event | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<EventRegistration[]>([]);
  const [reminderLoadingRegId, setReminderLoadingRegId] = useState<string | null>(null);
  const [approvalLoadingRegId, setApprovalLoadingRegId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDatabaseRecords = async () => {
    try {
      setLoading(true);
      const allAnn = await fbfs.getCollection<Announcement>("announcements", [], "createdAt", "desc");
      setAnnouncements(allAnn);

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
      if (settingsDoc) {
        setSiteSettings(settingsDoc);
      }
    } catch (err) {
      console.error("Failed to load records from cloud database:", err);
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = profile && (profile.role === "admin" || (profile as any).admin === true);

  useEffect(() => {
    if (authLoading) return;
    if (isUserAdmin) {
      loadDatabaseRecords();
    }
  }, [profile, authLoading]);

  // Read Suggestions from real-time database
  useEffect(() => {
    const vaultRef = ref(rtdb, "vault");
    const unsubscribe = onValue(vaultRef, (snap) => {
      const data = snap.val() || {};
      const listed: VaultPost[] = Object.entries(data).map(([id, val]: any) => ({
        id,
        ...val
      })).sort((a, b) => b.timestamp - a.timestamp);
      setVaultPosts(listed);
    }, (err) => {
      console.error("Vault DB stream subscription error:", err);
    });
    return () => {};
  }, []);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) return;
    setAdminLoginLoading(true);
    setAdminLoginError("");
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword.trim());
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
      tag
    };
    setActivityFeed(prev => [freshLog, ...prev]);
  };

  // --- ANNOUNCEMENT BULLETINS WORKFLOW ---
  const loadDraftPost = (ann: Announcement) => {
    setEditPostId(ann.id);
    setPostTitle(ann.title || "");
    setPostCoverImage((ann as any).coverImage || "");
    setPostCategory((ann as any).category || "Announcement");
    setPostPlatformHomepage((ann as any).platforms ? (ann as any).platforms.includes("homepage") : true);
    setPostPlatformEmail((ann as any).platforms ? (ann as any).platforms.includes("email") : false);

    // Read blocks if stored in custom payload structure
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
    setPostBlocks([{ id: "b1", type: "text", content: "Write something brilliant today..." }]);
    triggerToast("Empty draft template initiated.");
  };

  const publishOrSaveAnnouncement = async (isLivePublish: boolean) => {
    if (!postTitle.trim()) {
      triggerToast("Title tag is mandatory to publish release docs.", "error");
      return;
    }

    if (!postPlatformHomepage && !postPlatformEmail) {
      triggerToast("Please select at least one platform to publish (Homepage or Email).", "error");
      return;
    }

    try {
      const flatText = postBlocks.map(b => b.content || "").join("\n\n");
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
        ...({ blocks: JSON.stringify(postBlocks) } as any)
      };

      if (editPostId) {
        await fbfs.updateDocById("announcements", editPostId, payload);
        triggerToast("Corporate bulletin saved and updated in cloud database.");
      } else {
        await fbfs.addDocInCollection("announcements", payload);
        triggerToast("Fresh central release bulletin successfully published.");
      }

      // If publishing, and Email platform is selected, trigger automated newsletter send via Resend API
      if (isLivePublish && postPlatformEmail) {
        triggerToast("Initiating Resend newsletter broadcast...", "success");
        try {
          const allUsers = await fbfs.getCollection<UserProfile>("users");
          let targetEmails: string[] = ["micahprince60@gmail.com"];
          if (allUsers.length > 0) {
            const list = allUsers.filter(u => u.newsletterSubscribed).map(u => u.email).filter(Boolean) as string[];
            if (list.length > 0) targetEmails = list;
          }

          const resendResponse = await fetch("/api/send-newsletter", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              subject: `[${postCategory}] ${postTitle.trim()}`,
              postTitle: postTitle.trim(),
              featuredImage: postCoverImage || "",
              audience: "all",
              emails: targetEmails,
              blocks: postBlocks
            })
          });

          if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            console.error("Resend delivery failed:", errorText);
            triggerToast("Automatic newsletter dispatch failed. Verify Resend config.", "error");
          } else {
            triggerToast(`Resend newsletter dispatch successful to ${targetEmails.length} subscribers!`, "success");
            logActivity(`Broadcasted mailshot: "${postTitle.slice(0, 16)}..."`, "Newsletter");
          }
        } catch (mailErr) {
          console.error("Mailshot error during publish:", mailErr);
          triggerToast("Automatic newsletter dispatch failed.", "error");
        }
      }

      logActivity(`Saved Document: "${postTitle.slice(0, 16)}..."`, isLivePublish ? "News" : "Draft");
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

  // Drag blocks reorder
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
        featured: true
      };

      if (selectedCalendarEvent) {
        await fbfs.updateDocById("events", selectedCalendarEvent.id, updatedPayload);
        triggerToast("Assembly event updated successfully!");
      } else {
        await fbfs.addDocInCollection("events", updatedPayload);
        triggerToast("Interactive assembly calendar event cataloged!");
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
          title: list.length > 1 && customImageTitle.trim()
            ? `${customImageTitle.trim()} (${i + 1}/${list.length})`
            : customImageTitle.trim() || file.name.split(".")[0] || "Campus Gallery Snapshot",
          imageUrl: url.trim(),
          category: customImageCategory || "Campus Life",
          featured: true,
          visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: uploadAlbumId || ""
        };
        await fbfs.addDocInCollection("gallery", payload);
        uploadedCount++;
      }
      triggerToast(`Successfully uploaded ${uploadedCount} photos to the public archives!`);
      logActivity(`Uploaded ${uploadedCount} gallery images`, "Gallery");
      setCustomImageTitle("");
      setUploadAlbumId("");
      await loadDatabaseRecords();
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || "Upload pipeline failed.", "error");
    }
  };

  const handleCreateAndUploadCollection = async (name: string, filesList: FileList) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(`Creating collection and uploading ${list.length} images...`);
      const albumPayload: Partial<GalleryAlbum> = {
        name: name.trim(),
        topic: "Campus Life",
        description: `Created directly on ${new Date().toLocaleDateString()}`,
        createdAt: Date.now()
      };
      const albumRef = await fbfs.addDocInCollection("gallery_albums", albumPayload);
      const albumId = albumRef;

      let uploadedCount = 0;
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        const payload: Partial<GalleryItem> = {
          title: list.length > 1 ? `${name.trim()} (${i + 1}/${list.length})` : file.name.split(".")[0],
          imageUrl: url.trim(),
          category: "Campus Life",
          featured: true,
          visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: albumId
        };
        await fbfs.addDocInCollection("gallery", payload);
        uploadedCount++;
      }
      triggerToast(`Successfully established directory "${name}" with ${uploadedCount} photos!`);
      logActivity(`Established collection "${name}"`, "Gallery");
      await loadDatabaseRecords();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to create and upload collection.", "error");
    }
  };

  const handleUploadPhotosToAlbum = async (albumId: string, filesList: FileList) => {
    const list = Array.from(filesList);
    if (list.length === 0) return;
    try {
      triggerToast(`Uploading ${list.length} images to collection...`);
      const activeAlbum = albums.find(a => a.id === albumId);
      const albumName = activeAlbum ? activeAlbum.name : "Collection Item";
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const url = await uploadToImgBB(file);
        const payload: Partial<GalleryItem> = {
          title: list.length > 1 ? `${albumName} (${i + 1}/${list.length})` : file.name.split(".")[0],
          imageUrl: url.trim(),
          category: "Campus Life",
          featured: true,
          visible: true,
          uploadedBy: auth.currentUser?.uid || "Anonymous",
          uploaderName: profile?.name || "Principal Admin",
          uploadedAt: Date.now(),
          albumId: albumId
        };
        await fbfs.addDocInCollection("gallery", payload);
      }
      triggerToast(`Added ${list.length} photos to collection.`);
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast(err.message || "Failed to add photos to collection.", "error");
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
      await fbfs.updateDocById("gallery_albums", albumId, { name: newName.trim() });
      triggerToast("Collection label updated.");
      await loadDatabaseRecords();
    } catch (err: any) {
      triggerToast("Failed to rename label.", "error");
    }
  };

  const handleCreateAlbum = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAlbumName.trim() || !newAlbumTopic.trim()) {
      triggerToast("Please supply the Album title & overarching Topic name.", "error");
      return;
    }
    try {
      const payload: Partial<GalleryAlbum> = {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        topic: newAlbumTopic.trim(),
        createdAt: Date.now()
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
    if (!window.confirm("Are you sure you want to delete this Collection/Album? Photos inside it will not be deleted, but they will be unassigned.")) {
      return;
    }
    try {
      await fbfs.deleteDocById("gallery_albums", albumId);
      const itemsInAlbum = galleryItems.filter(item => item.albumId === albumId);
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
      await set(ref(rtdb, `vault/${activeVaultPost.id}/adminResponse`), vaultMessage);
      triggerToast("Response and parliament status dispatched.");
      logActivity(`Answered suggestion ID: ${activeVaultPost.id.slice(0, 5)}`, "Vault");
      setActiveVaultPost(null);
      setVaultMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  // --- SIDEBAR TOGGLES CONTROL ---
  const saveSiteTuning = async (field: string) => {
    try {
      const updated = { ...siteSettings, [field]: !(siteSettings as any)[field] };
      setSiteSettings(updated);
      await fbfs.setDocById("siteSettings", "default", updated);
      triggerToast("System feature overrides committed successfully.");
      logActivity(`Toggled setting ${field}`, "SiteSettings");
    } catch (e) {
      console.error(e);
    }
  };

  // --- EVENT REGISTRATIONS & CAMPAIGNS ---
  const handleApproveRegistration = async (regId: string, reg: EventRegistration, event: Event) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, { approvalStatus: "approved" });
      setAllRegistrations(prev => prev.map(x => x.id === regId ? { ...x, approvalStatus: "approved" } : x));
      
      const dateStr = new Date(event.startDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) + (event.startTime ? ` @ ${event.startTime}` : "");
      
      const rendered = await fetchAndRenderEmailTemplate("event_registration", {
        applicantName: reg.userName,
        applicantEmail: reg.userEmail,
        eventTitle: event.title,
        eventDate: dateStr,
        eventVenue: event.venue || "Campus Auditorium"
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
          customHtml: rendered?.customHtml || undefined
        })
      });
      
      triggerToast(`RSVP pass for ${reg.userName} approved & dynamic confirmation email sent!`, "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Error updating registry status", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  const handleDeclineRegistration = async (regId: string, reg: EventRegistration) => {
    setApprovalLoadingRegId(regId);
    try {
      await fbfs.updateDocById("eventRegistrations", regId, { approvalStatus: "declined" });
      setAllRegistrations(prev => prev.map(x => x.id === regId ? { ...x, approvalStatus: "declined" } : x));
      triggerToast(`RSVP pass for ${reg.userName} marked as declined.`, "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Error updating registry status", "error");
    } finally {
      setApprovalLoadingRegId(null);
    }
  };

  const handleSendReminderCampaign = async (regId: string, reg: EventRegistration, event: Event) => {
    setReminderLoadingRegId(regId);
    try {
      const dateStr = new Date(event.startDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) + (event.startTime ? ` @ ${event.startTime}` : "");
      
      const rendered = await fetchAndRenderEmailTemplate("event_reminder", {
        applicantName: reg.userName,
        applicantEmail: reg.userEmail,
        eventTitle: event.title,
        eventDate: dateStr,
        eventVenue: event.venue || "Campus Auditorium"
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
          customHtml: rendered?.customHtml || undefined
        })
      });
      
      if (!res.ok) throw new Error("Email dispatch API error");
      
      triggerToast(`Attendance reminder successfully dispatched to ${reg.userEmail}!`, "success");
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
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const matchingEvents = events.filter(e => {
        if (!e.startDate) return false;
        const evDate = new Date(e.startDate.seconds ? e.startDate.seconds * 1000 : e.startDate);
        const compareStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, "0")}-${String(evDate.getDate()).padStart(2, "0")}`;
        return compareStr === dateStr;
      });

      list.push({
        empty: false,
        day: d,
        dateString: dateStr,
        events: matchingEvents
      });
    }

    return list;
  };

  // --- INTERACTION CODES AND HELPERS ---
  const copyLinkClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      triggerToast("Media link copied to clipboard!");
    });
  };

  if (authLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-12 animate-pulse w-full select-none text-left">
        <p className="text-gray-400 font-mono text-xs tracking-widest text-center uppercase">CONSTRUCTING SECURE ADMIN_OS CORE ENVIRONMENT SHELL ...</p>
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
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">EXECUTIVE CONSOLE</h2>
            <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest">Restricted — MKU Parliament Credentials Authorized</p>
          </div>

          {adminLoginError && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/15 bg-red-500/10 text-xs text-red-400">
              {adminLoginError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Admin Email Address</label>
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
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Access Token Password</label>
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
              {adminLoginLoading ? "Authorizing credentials..." : "Confirm Executive Access"}
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
    <div className="bg-[#09090b] text-white min-h-screen flex overflow-hidden selection:bg-[#FFDE00] selection:text-black text-left">
      
      {/* Sidebar navigation */}
      <aside className={`bg-[#0d0d0f] border-r border-white/10 flex flex-col h-screen relative z-50 shrink-0 ${sidebarCollapsed ? "w-[88px]" : "w-[260px]"} transition-all duration-300`}>
        <div className="h-20 flex items-center px-6 border-b border-white/10 justify-between shrink-0">
          {!sidebarCollapsed && (
            <h2 className="text-xl font-black text-[#FFDE00] tracking-tighter uppercase font-mono">ADMIN_OS</h2>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 hover:bg-white/5 rounded-lg ml-auto">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-1.5">
          {[
            { id: "overview", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
            { id: "news", label: "Post Editor", icon: <FileText size={18} /> },
            { id: "events", label: "Calendar", icon: <CalendarIcon size={18} /> },
            { id: "assets", label: "Gallery Vault", icon: <ImageIcon size={18} /> },
            { id: "vault", label: "Suggestions", icon: <Shield size={18} /> },
            { id: "roster", label: "Students", icon: <ShieldCheck size={18} /> },
            { id: "settings", label: "Tuning Controls", icon: <Layers size={18} /> },
            { id: "emails", label: "Email Studio", icon: <Mail size={18} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${activeTab === tab.id ? "bg-[#FFDE00] text-black shadow-lg shadow-[#FFDE00]/15" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <div className="shrink-0">{tab.icon}</div>
              {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0 space-y-2">
          <Link href="/">
            <button className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-xl font-extrabold text-[10px] sm:text-xs uppercase tracking-widest text-gray-400 hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10">
              {!sidebarCollapsed && <span>Exit Dashboard</span>}
            </button>
          </Link>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-3 py-3 rounded-xl font-extrabold text-[10px] sm:text-xs uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Log Out Admin</span>}
          </button>
        </div>
      </aside>

      {/* Primary Viewport Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Dynamic Nav-Header */}
        <header className="h-20 bg-[#0d0d0f]/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-8 shrink-0">
          <div className="text-left">
            <h1 className="text-xl font-black uppercase tracking-tight text-white">MKU Law Parliament Executive Platform</h1>
            <p className="text-[10px] text-gray-400 font-mono leading-none tracking-widest uppercase mt-0.5">Control Panel OS • Version 2.2.1</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-5 border-l border-white/10 text-right">
              <div className="hidden md:block">
                <p className="text-xs font-bold text-white">{profile?.name || "Corporate Admin"}</p>
                <p className="text-[9px] text-[#FFDE00] font-mono tracking-widest uppercase mt-0.5">Verified Principal</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFDE00] to-yellow-600 border border-[#FFDE00]/30 flex items-center justify-center font-bold text-black shadow-lg shadow-[#FFDE00]/10 shrink-0">
                L
              </div>
            </div>
          </div>
        </header>

        {/* View Port Router screen */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 relative">
          
          {/* TAB 1: COMMAND OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-10 text-left animate-fade-in">
              <div className="space-y-1.5 border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">Welcome back, Representative!</h2>
                <p className="text-sm text-gray-400 font-sans font-medium">Real-time status indexes of the MKU Gavel ecosystem database nodes.</p>
              </div>

              {/* Grid indexes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-6 rounded-2xl border border-white/10 bg-[#121214] relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl bg-[#FFDE00]/5"></div>
                  <h3 className="text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Bulletins</h3>
                  <div className="text-5xl font-black text-white mt-4">{announcements.length}</div>
                  <p className="text-gray-500 text-xs mt-1.5 font-semibold">Active Announcements on Feed</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/10 bg-[#121214] relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl bg-[#FFDE00]/5"></div>
                  <h3 className="text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Assemblies</h3>
                  <div className="text-5xl font-black text-white mt-4">{events.length}</div>
                  <p className="text-gray-500 text-xs mt-1.5 font-semibold">Scheduled calendar events</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/10 bg-[#121214] relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl bg-[#FFDE00]/5"></div>
                  <h3 className="text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Vault Slides</h3>
                  <div className="text-5xl font-black text-white mt-4">{galleryItems.length}</div>
                  <p className="text-gray-500 text-xs mt-1.5 font-semibold">Secure screenshot items</p>
                </div>
                <div className="p-6 rounded-2xl border border-white/10 bg-[#121214] relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl bg-[#FFDE00]/5"></div>
                  <h3 className="text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Parliament Vault</h3>
                  <div className="text-5xl font-black text-white mt-4">{vaultPosts.length}</div>
                  <p className="text-gray-500 text-xs mt-1.5 font-semibold">Student suggestions logged</p>
                </div>
              </div>

              {/* Double panel actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Shortcuts */}
                <div className="lg:col-span-8 space-y-4">
                  <h3 className="text-xs font-mono font-black uppercase text-gray-400 tracking-wider">Quick Actions Console</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setActiveTab("news")} className="p-6 rounded-2xl border border-white/10 bg-[#121214]/40 hover:bg-white/5 text-left group transition-all">
                      <div className="w-10 h-10 bg-[#FFDE00]/10 border border-[#FFDE00]/20 rounded-xl flex items-center justify-center text-[#FFDE00] group-hover:scale-105 transition-transform"><FileText size={18} /></div>
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mt-4">Draft New Bulletin</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Deploy fresh news bulletins instantly.</p>
                    </button>
                    <button onClick={() => setActiveTab("events")} className="p-6 rounded-2xl border border-white/10 bg-[#121214]/40 hover:bg-white/5 text-left group transition-all">
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform"><CalendarIcon size={18} /></div>
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mt-4">Calendar Hub</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Manage assembly dates and room limits.</p>
                    </button>
                    <button onClick={() => setActiveTab("assets")} className="p-6 rounded-2xl border border-white/10 bg-[#121214]/40 hover:bg-white/5 text-left group transition-all">
                      <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform"><ImageIcon size={18} /></div>
                      <h4 className="font-extrabold text-sm text-white uppercase tracking-wider mt-4">Asset Vault</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Upload and direct compile image logs.</p>
                    </button>
                    <button onClick={() => { setActiveTab("news"); setIsNlOpen(true); }} className="p-6 rounded-2xl border border-white/10 bg-[#121214]/40 hover:bg-white/5 text-left group transition-all">
                      <div className="w-10 h-10 bg-[#FFDE00]/10 border border-[#FFDE00]/20 rounded-xl flex items-center justify-center text-[#FFDE00] group-hover:scale-105 transition-transform"><Mail size={18} /></div>
                      <h4 className="font-extrabold text-sm text-[#FFDE00] uppercase tracking-wider mt-4">Broadcast Mailshot</h4>
                      <p className="text-[11px] text-gray-400 mt-1">Deliver interactive releases to all inbox queues.</p>
                    </button>
                  </div>
                </div>

                {/* Status controls */}
                <div className="lg:col-span-4 space-y-4">
                  <h3 className="text-xs font-mono font-black uppercase text-gray-400 tracking-wider font-bold">Services Integrity</h3>
                  
                  <div className="p-6 rounded-2xl bg-[#0d0d0f] border border-white/10 space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5"><Database size={13} className="text-green-500 animate-pulse" /> Firebase Firestore</span>
                        <span className="text-[9px] font-mono uppercase bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">Synchronized</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full w-[15%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5"><HardDrive size={13} className="text-indigo-400 animate-pulse" /> Realtime suggestions DB</span>
                        <span className="text-[9px] font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">Operational</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full w-[28%]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Log stream list */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono font-black uppercase text-gray-400 tracking-wider font-bold">Operator Session Logs</h3>
                    <div className="bg-[#121214]/60 rounded-2xl border border-white/10 p-4 space-y-3 max-h-56 overflow-y-auto">
                      {activityFeed.map(feed => (
                        <div key={feed.id} className="text-[11px] flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <p className="text-gray-300 font-semibold pr-4"><span className="text-[#FFDE00] uppercase font-mono tracking-widest font-bold pr-1">[{feed.tag}]</span> {feed.text}</p>
                          <span className="text-[9px] text-gray-500 shrink-0 font-mono font-bold uppercase">{feed.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}
             {/* TAB 2: POST EDITOR (CONTENT MACHINE) */}
          {activeTab === "news" && (
            <div className="space-y-8 text-left animate-fade-in w-full">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-white/10 pb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Central Post Studio</h2>
                  <p className="text-sm text-gray-400 font-sans font-medium">Modular block composer with real-time viewport Staging Render.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => {
                      setSeoTitle(postTitle || "Special Release");
                      setSeoDescription(postBlocks[0]?.content || "Stay updated with latest bulletins.");
                      setSeoImage(postCoverImage || "");
                      setIsSeoOpen(true);
                    }} 
                    className="px-4.5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-mono uppercase font-black tracking-wider flex items-center gap-2 transition-all cursor-pointer text-white"
                  >
                    Meta Custom Presets
                  </button>
                  <button 
                    onClick={() => setIsNlOpen(true)} 
                    className="px-4.5 py-3 rounded-xl border border-[#FFDE00]/20 bg-[#FFDE00]/10 hover:bg-[#FFDE00]/20 text-xs font-mono uppercase font-black tracking-wider flex items-center gap-2 transition-all cursor-pointer text-[#FFDE00]"
                  >
                    Newsletter Launch Engine
                  </button>
                  <button 
                    onClick={createFreshDraft} 
                    className="px-4.5 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase font-black tracking-wider flex items-center gap-2 transition-all cursor-pointer text-white"
                  >
                    New Draft Block
                  </button>
                </div>
              </div>

              {/* Layout splits - 50/50 split utilizing full available horizontal space */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[600px]">
                
                {/* Block Editor Frame */}
                <div className="flex flex-col bg-[#0d0d0f] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl min-h-[600px]">
                  
                  {/* Top controller */}
                  <div className="p-5 bg-black/40 border-b border-white/10 flex items-center gap-3 justify-between">
                    <input 
                      type="text" 
                      placeholder="Enter a captivating topic title..."
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="text-sm font-extrabold uppercase bg-transparent text-white focus:outline-none flex-1 placeholder:text-gray-400/50"
                    />
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => publishOrSaveAnnouncement(false)} className="px-3.5 py-2 hover:bg-white/5 text-[10px] font-mono border border-white/10 uppercase tracking-widest rounded-lg font-black transition-all">Save Draft</button>
                      <button onClick={() => publishOrSaveAnnouncement(true)} className="px-4 py-2 bg-[#FFDE00] text-black text-[10px] font-mono uppercase tracking-widest rounded-lg font-black transition-all flex items-center gap-1"><Zap size={10} /> Publish</button>
                      {editPostId && (
                        <button onClick={deleteAnnouncement} className="p-2 border border-red-500/10 text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"><Trash2 size={12} /></button>
                      )}
                    </div>
                  </div>

                  {/* Scroller blocks */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    
                    {/* Category & Platform Hub */}
                    <div className="p-4 bg-black/40 border border-white/10 rounded-2xl text-left space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Category Selector */}
                        <div>
                          <label className="text-[9.5px] font-mono uppercase font-black text-gray-400 block tracking-widest mb-2">Category Filter</label>
                          <select
                             value={postCategory}
                             onChange={(e) => setPostCategory(e.target.value as any)}
                             className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                          >
                            <option value="Announcement">Announcement</option>
                            <option value="Update">Update</option>
                            <option value="Communication">Communication</option>
                          </select>
                        </div>

                        {/* Platforms Checkbox List */}
                        <div>
                          <label className="text-[9.5px] font-mono uppercase font-black text-gray-400 block tracking-widest mb-2">Publish Target Platforms</label>
                          <div className="flex flex-col gap-2.5">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                              <input 
                                type="checkbox"
                                checked={postPlatformHomepage}
                                onChange={(e) => setPostPlatformHomepage(e.target.checked)}
                                className="w-4 h-4 rounded bg-black border-white/10 accent-[#FFDE00]"
                              />
                              1. Homepage Post Teaser
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
                              <input 
                                type="checkbox"
                                checked={postPlatformEmail}
                                onChange={(e) => setPostPlatformEmail(e.target.checked)}
                                className="w-4 h-4 rounded bg-black border-white/10 accent-[#FFDE00]"
                              />
                              2. Email Newsletter via Resend
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cover photo trigger */}
                    <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-left space-y-2">
                      <label className="text-[9.5px] font-mono uppercase font-black text-gray-400 block tracking-widest">Post Cover Image</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        {postCoverImage && (
                          <img src={postCoverImage} className="w-16 h-16 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                        )}
                        <label className="flex-1 py-3 text-center border border-dashed border-white/15 rounded-xl hover:border-[#FFDE00]/50 hover:bg-white/5 cursor-pointer text-xs font-semibold text-white transition-all flex items-center justify-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const url = await uploadToImgBB(file);
                                setPostCoverImage(url);
                                triggerToast("Cover image uploaded!");
                              } catch (err: any) {
                                triggerToast(err.message || "Upload failed", "error");
                              }
                            }} 
                          />
                          {postCoverImage ? "Change Cover Image" : "Upload Cover Image from device"}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {postBlocks.map((blk, idx) => (
                        <div 
                          key={blk.id}
                          className="p-4 rounded-xl border border-white/5 bg-[#141416]/90 flex items-start gap-3 hover:border-white/20 transition-all select-none"
                          draggable
                          onDragStart={() => setDraggedIdx(idx)}
                          onDragOver={(e) => { e.preventDefault(); }}
                          onDrop={() => { if (draggedIdx !== null) { swapBlocks(draggedIdx, idx); setDraggedIdx(null); } }}
                        >
                          <div className="text-gray-400/30 cursor-grab active:cursor-grabbing p-1"><GripVertical size={14} /></div>
                          <div className="flex-1 space-y-2">
                            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Element #{idx + 1} ({blk.type})</span>
                            {blk.type === "text" ? (
                              <textarea
                                value={blk.content}
                                onChange={(e) => {
                                  const updated = [...postBlocks];
                                  updated[idx].content = e.target.value;
                                  setPostBlocks(updated);
                                }}
                                className="w-full bg-[#0d0d0f] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none h-16"
                              />
                            ) : (
                              blk.type === "image" ? (
                                <div className="flex-1 flex gap-3 items-center">
                                  {blk.content ? (
                                    <img src={blk.content} className="w-12 h-12 rounded-lg object-cover border border-white/10" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-dashed border-white/10 shrink-0" />
                                  )}
                                  <label className="flex-1 py-2 text-center border border-dashed border-white/15 rounded-lg hover:border-[#FFDE00]/50 hover:bg-white/5 cursor-pointer text-xs font-semibold text-white transition-all flex items-center justify-center gap-2">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          const url = await uploadToImgBB(file);
                                          const updated = [...postBlocks];
                                          updated[idx].content = url;
                                          setPostBlocks(updated);
                                          triggerToast("Block image uploaded!");
                                        } catch (err: any) {
                                          triggerToast(err.message || "Upload failed", "error");
                                        }
                                      }} 
                                    />
                                    {blk.content ? "Change block photo" : "Upload block photo from device"}
                                  </label>
                                </div>
                              ) : (
                                <div className="flex gap-2 w-full">
                                  <input 
                                    type="text"
                                    placeholder="Enter value..."
                                    value={blk.content}
                                    onChange={(e) => {
                                      const updated = [...postBlocks];
                                      updated[idx].content = e.target.value;
                                      setPostBlocks(updated);
                                    }}
                                    className="flex-1 bg-[#0d0d0f] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#FFDE00] focus:outline-none focus:border-gavel-yellow/30 font-mono"
                                  />
                                </div>
                              )
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPostBlocks(postBlocks.filter(b => b.id !== blk.id))}
                            className="p-1 px-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Appends controls */}
                    <div className="pt-4 border-t border-dashed border-white/10 text-left space-y-3.5">
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">Append Segment block</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setPostBlocks([...postBlocks, { id: "p_" + Math.random().toString(), type: "text", content: "" }])} className="px-3 py-1.5 border border-white/10 text-[9.5px] font-mono uppercase bg-white/5 hover:bg-white/10 text-white rounded font-bold">Paragraph</button>
                        <button onClick={() => setPostBlocks([...postBlocks, { id: "h_" + Math.random().toString(), type: "h1", content: "" }])} className="px-3 py-1.5 border border-white/10 text-[9.5px] font-mono uppercase bg-white/5 hover:bg-white/10 text-white rounded font-bold">Header 1</button>
                        <button onClick={() => setPostBlocks([...postBlocks, { id: "h2_" + Math.random().toString(), type: "h2", content: "" }])} className="px-3 py-1.5 border border-white/10 text-[9.5px] font-mono uppercase bg-white/5 hover:bg-white/10 text-white rounded font-bold">Header 2</button>
                        <button onClick={() => setPostBlocks([...postBlocks, { id: "img_" + Math.random().toString(), type: "image", content: "" }])} className="px-3 py-1.5 border border-white/10 text-[9.5px] font-mono uppercase bg-white/5 hover:bg-white/10 text-white rounded font-bold">Image URL</button>
                      </div>
                    </div>

                    {/* Highly prominent Publish block */}
                    <div className="pt-8 mt-4 border-t border-white/15">
                      <button 
                        onClick={() => publishOrSaveAnnouncement(true)}
                        className="w-full bg-[#FFDE00] hover:bg-yellow-400 text-black font-black text-xs py-4 px-6 rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-xl hover:shadow-yellow-400/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Zap size={14} className="fill-current text-black animate-pulse" />
                        <span>Publish Bulletin Live Now</span>
                      </button>
                      <p className="text-[9.5px] font-mono text-gray-500 uppercase tracking-wider text-center mt-2.5">This dispatches immediate bulletins to students on the homepage timeline.</p>
                    </div>

                  </div>
                </div>

                {/* Live Staging rendered mock device on the right of screen */}
                <div 
                  className={`flex flex-col bg-black border border-white/15 rounded-2xl overflow-hidden shadow-2xl relative min-h-[600px] transition-all duration-300 mx-auto ${
                    adminPreviewDevice === "mobile" ? "max-w-[360px] w-full border-[#FFDE00]/30" : "w-full"
                  }`}
                >
                  <div className="p-4 bg-[#0d0d0f] border-b border-white/10 flex items-center justify-between text-xs text-gray-400 font-mono uppercase font-black tracking-wide">
                    <span>STAGING RENDER VIEWPORT</span>
                    
                    {/* PC / Mobile Toggle Buttons */}
                    <div className="flex bg-[#141416] p-0.5 rounded-lg border border-white/10 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setAdminPreviewDevice("pc")}
                        className={`px-1.5 py-1 rounded text-[8.5px] font-mono uppercase font-bold transition-all cursor-pointer ${
                          adminPreviewDevice === "pc" 
                            ? "bg-[#FFDE00] text-black" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        PC
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminPreviewDevice("mobile")}
                        className={`px-1.5 py-1 rounded text-[8.5px] font-mono uppercase font-bold transition-all cursor-pointer ${
                          adminPreviewDevice === "mobile" 
                            ? "bg-[#FFDE00] text-black" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 bg-[#09090b] text-left space-y-5">
                    {postCoverImage && (
                      <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 block">
                        <img src={postCoverImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Cover Preview" />
                      </div>
                    )}
                    <h1 className="text-xl font-black text-white uppercase tracking-tight">{postTitle || "Title Topic placeholder"}</h1>
                    
                    <div className="space-y-4 text-xs font-sans text-gray-300 leading-relaxed font-semibold">
                      {postBlocks.map(block => {
                        if (block.type === "h1") return <h2 key={block.id} className="text-sm font-black uppercase text-white tracking-wider border-b border-white/5 pb-1">{block.content || "Heading 1 Empty"}</h2>;
                        if (block.type === "h2") return <h3 key={block.id} className="text-xs font-bold text-[#FFDE00] tracking-wide">{block.content || "Secondary Segment"}</h3>;
                        if (block.type === "image" && block.content) return <img key={block.id} src={block.content} className="w-full rounded-lg border border-white/5" referrerPolicy="no-referrer" alt="Block Preview" />;
                        return <p key={block.id} className="whitespace-pre-wrap">{block.content || "(empty block)"}</p>;
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Saved list posts below the editor split to avoid congestion */}
              <div className="mt-12 bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 text-left space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                       <FileText className="text-[#FFDE00]" size={20} />
                       Saved Announcements Catalog ({announcements.length})
                    </h3>
                    <p className="text-xs text-gray-400 font-sans font-medium">Click on any saved document to load, review, modify, or strike down.</p>
                  </div>
                  <button 
                    onClick={createFreshDraft}
                    className="px-4.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono uppercase font-black tracking-wider transition-all cursor-pointer text-white flex items-center gap-2 self-start"
                  >
                    <Plus size={14} /> Start Fresh blank draft
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id}
                      onClick={() => {
                        loadDraftPost(ann);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`group p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-36 ${editPostId === ann.id ? "bg-[#FFDE00]/10 border-[#FFDE00]/30 text-[#FFDE00]" : "bg-[#111113] border-white/5 hover:border-white/15 hover:bg-white/[0.02]"}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 group-hover:text-[#FFDE00]/70 transition-colors">
                            {ann.category || "Bulletin"}
                          </span>
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${ann.visible ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                            {ann.visible ? "PUBLISHED" : "LOCAL DRAFT"}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold uppercase line-clamp-2 text-white group-hover:text-[#FFDE00] transition-colors">
                          {ann.title || "Untitled announcement"}
                        </h4>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-3 border-t border-white/5 mt-2">
                        <span>Click to open</span>
                        <span className="text-[9px] text-gray-500">
                          {ann.createdAt ? new Date(ann.createdAt.seconds ? ann.createdAt.seconds * 1000 : ann.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                  {announcements.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">No announcements archived in student hub catalog.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVENT CREATION */}
          {activeTab === "events" && (() => {
            const eventRegistrations = allRegistrations.filter(r => r.eventId === (selectedEventForAnalysis?.id || ""));
            const totalReg = eventRegistrations.length;
            
            const maleCount = eventRegistrations.filter(r => (r.gender || (r as any).regGender) === "Male").length;
            const femaleCount = eventRegistrations.filter(r => (r.gender || (r as any).regGender) === "Female").length;
            const otherGenderCount = eventRegistrations.filter(r => !["Male", "Female"].includes(r.gender || (r as any).regGender || "")).length;
            
            const malePct = totalReg > 0 ? Math.round((maleCount / totalReg) * 100) : 0;
            const femalePct = totalReg > 0 ? Math.round((femaleCount / totalReg) * 100) : 0;
            const otherGenderPct = totalReg > 0 ? Math.round((otherGenderCount / totalReg) * 100) : 0;

            const y1Count = eventRegistrations.filter(r => (r.yearOfStudy || (r as any).regYear || (r as any).year) === "Year 1").length;
            const y2Count = eventRegistrations.filter(r => (r.yearOfStudy || (r as any).regYear || (r as any).year) === "Year 2").length;
            const y3Count = eventRegistrations.filter(r => (r.yearOfStudy || (r as any).regYear || (r as any).year) === "Year 3").length;
            const y4Count = eventRegistrations.filter(r => (r.yearOfStudy || (r as any).regYear || (r as any).year) === "Year 4").length;
            const pgCount = eventRegistrations.filter(r => (r.yearOfStudy || (r as any).regYear || (r as any).year) === "Postgraduate").length;
            const representativeCount = eventRegistrations.filter(r => !["Year 1", "Year 2", "Year 3", "Year 4", "Postgraduate"].includes(r.yearOfStudy || (r as any).regYear || (r as any).year || "")).length;

            const y1Pct = totalReg > 0 ? Math.round((y1Count / totalReg) * 100) : 0;
            const y2Pct = totalReg > 0 ? Math.round((y2Count / totalReg) * 100) : 0;
            const y3Pct = totalReg > 0 ? Math.round((y3Count / totalReg) * 100) : 0;
            const y4Pct = totalReg > 0 ? Math.round((y4Count / totalReg) * 100) : 0;
            const pgPct = totalReg > 0 ? Math.round((pgCount / totalReg) * 100) : 0;
            const repPct = totalReg > 0 ? Math.round((representativeCount / totalReg) * 100) : 0;

            // Sync default analysis target
            if (events.length > 0 && !selectedEventForAnalysis) {
              setSelectedEventForAnalysis(events[0]);
            }

            return (
              <div className="space-y-8 text-left animate-fade-in">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white">Event Assemblies Calendar</h2>
                    <p className="text-sm text-gray-400 font-sans font-medium">Coordinate general, physical workshops, and room capacity limit safety guidelines.</p>
                  </div>
                  <div className="flex bg-[#121214] p-1.5 border border-white/10 rounded-xl gap-2 font-mono text-xs items-center">
                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-white/5 rounded text-white cursor-pointer"><ChevronLeft size={16} /></button>
                    <span className="font-bold uppercase tracking-wider text-white px-2">{calendarMonth.toLocaleString("default", { month: "long" })} {calendarMonth.getFullYear()}</span>
                    <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-white/5 rounded text-white cursor-pointer"><ChevronRight size={16} /></button>
                  </div>
                </div>

                {/* Grid Calendar */}
                <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="grid grid-cols-7 border-b border-white/5 bg-black/40 text-center text-xs font-mono font-black uppercase tracking-widest text-gray-400 py-3.5">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-white/5 p-px min-h-[480px]">
                    {getDaysInMonthGrid().map((cell, idx) => {
                      if (cell.empty) {
                        return <div key={`empty-${idx}`} className="bg-[#0f0f12]/30 min-h-[90px]"></div>;
                      }

                      return (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setSelectedCalendarEvent(null);
                            setSelectedCalendarDate(cell.dateString || "");
                            setIsEvOpen(true);
                          }}
                          className="bg-[#121214] hover:bg-white/[0.03] p-3.5 min-h-[90px] flex flex-col text-left transition-all group border border-white/[0.02] cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono font-black text-white/50 group-hover:text-[#FFDE00] transition-colors">{cell.day}</span>
                            <span className="text-[8px] bg-white/5 group-hover:bg-[#FFDE00]/10 text-white group-hover:text-[#FFDE00] p-1 px-1.5 rounded-lg border border-white/5 transition-opacity duration-200">+ ADD</span>
                          </div>

                          <div className="space-y-1 overflow-y-auto flex-1 h-[56px] hide-scrollbar mt-1">
                            {cell.events?.map(ev => (
                              <div 
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCalendarEvent(ev);
                                  setSelectedCalendarDate(cell.dateString || "");
                                  setIsEvOpen(true);
                                }}
                                className="text-[9px] font-mono uppercase bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-extrabold p-1 rounded-md mb-1 truncate shadow"
                                title={ev.title}
                              >
                                {ev.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Registrations & Demographics Analyzer Panel */}
                <div id="admin-registrations-analyzer" className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8 mt-8 text-left shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Ticket className="text-[#FFDE00]" size={20} />
                        Attendee Register & Analytical Demographics
                      </h3>
                      <p className="text-xs text-gray-400 font-sans font-medium">Verify guest passes, register approvals, and review live demographic graphs.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest shrink-0">Symposium filter:</span>
                      <select 
                        value={selectedEventForAnalysis?.id || ""} 
                        onChange={(e) => {
                          const ev = events.find(x => x.id === e.target.value);
                          setSelectedEventForAnalysis(ev || null);
                        }}
                        className="bg-black/65 border border-white/10 text-xs text-white rounded-xl px-4 py-2.5 outline-none focus:border-[#FFDE00] shrink-0 font-sans font-bold cursor-pointer transition-colors max-w-xs"
                      >
                        <option value="">-- Choose Symposium --</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id} className="bg-[#0f0f12]">
                            {ev.title.substring(0, 32)}{ev.title.length > 32 ? "..." : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedEventForAnalysis ? (
                    <>
                      {/* Event Stats Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-black">Total RSVP Registered</span>
                          <span className="text-3xl font-black text-white mt-1.5">{eventRegistrations.length}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest font-black flex items-center gap-1">
                            ● Approved Seats
                          </span>
                          <span className="text-3xl font-black text-green-400 mt-1.5">
                            {eventRegistrations.filter(r => r.approvalStatus === "approved").length}
                            <span className="text-xs text-gray-500 font-normal font-sans"> / {selectedEventForAnalysis.capacity || "∞"}</span>
                          </span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-[#FFDE00] uppercase tracking-widest font-black flex items-center gap-1">
                            ● Pending Approvals
                          </span>
                          <span className="text-3xl font-black text-[#FFDE00] mt-1.5">{eventRegistrations.filter(r => !r.approvalStatus || r.approvalStatus === "pending").length}</span>
                        </div>
                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-black">Declined / Revoked</span>
                          <span className="text-3xl font-black text-gray-500 mt-1.5">{eventRegistrations.filter(r => r.approvalStatus === "declined").length}</span>
                        </div>
                      </div>

                      {/* Graphical Analysis Bento Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Gender Statistics Column */}
                        <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h4 className="text-xs font-mono font-black text-[#FFDE00] uppercase tracking-widest">Gender Demographics</h4>
                            <span className="text-[9px] font-mono text-gray-500">Live aggregated metrics</span>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Male Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-sans font-bold text-gray-300">
                                <span>Gentlemen (Male)</span>
                                <span>{maleCount} seats ({malePct}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${malePct}%` }}></div>
                              </div>
                            </div>

                            {/* Female Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-sans font-bold text-gray-300">
                                <span>Ladies (Female)</span>
                                <span>{femaleCount} seats ({femalePct}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${femalePct}%` }}></div>
                              </div>
                            </div>

                            {/* Other Bar */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-sans font-bold text-gray-300">
                                <span>Unclassified / Private</span>
                                <span>{otherGenderCount} seats ({otherGenderPct}%)</span>
                              </div>
                              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#FFDE00] rounded-full transition-all duration-500" style={{ width: `${otherGenderPct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Year of Study Distribution Column */}
                        <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-4">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <h4 className="text-xs font-mono font-black text-[#FFDE00] uppercase tracking-widest">Academic Year Representation</h4>
                            <span className="text-[9px] font-mono text-gray-500">Comrade class distribution</span>
                          </div>

                          <div className="space-y-3">
                            {/* Year 1 */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Year 1</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${y1Pct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{y1Count} ({y1Pct}%)</span>
                            </div>

                            {/* Year 2 */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Year 2</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${y2Pct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{y2Count} ({y2Pct}%)</span>
                            </div>

                            {/* Year 3 */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Year 3</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${y3Pct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{y3Count} ({y3Pct}%)</span>
                            </div>

                            {/* Year 4 */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Year 4</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${y4Pct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{y4Count} ({y4Pct}%)</span>
                            </div>

                            {/* Postgraduate */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Postgrad</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pgPct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{pgCount} ({pgPct}%)</span>
                            </div>

                            {/* Guest / Other */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="w-20 font-mono text-gray-400 shrink-0">Guests</span>
                              <div className="flex-grow h-2.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#FFDE00]/70 rounded-full transition-all duration-500" style={{ width: `${repPct}%` }}></div>
                              </div>
                              <span className="w-14 text-right font-sans font-bold text-gray-300 text-[11px] shrink-0">{representativeCount} ({repPct}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Custom Form Question Responses Graphs */}
                      {selectedEventForAnalysis.customQuestions && selectedEventForAnalysis.customQuestions.length > 0 && (
                        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
                          <div className="flex justify-between items-center border-b border-white/5 pb-3">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-mono font-black text-[#FFDE00] uppercase tracking-widest flex items-center gap-1.5">
                                📊 Custom Questionnaire Demographics & Feedback
                              </h4>
                              <p className="text-[10px] text-gray-400 font-sans font-medium">Live aggregated frequency patterns and user selections</p>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold">Dynamic Analysis</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {selectedEventForAnalysis.customQuestions.map((q) => {
                              // Get responses for this specific custom field label
                              const rawAnswers = eventRegistrations.map((r) => r.customFields?.[q.label] || r.customFields?.[q.id] || "");
                              const filteredAnswers = rawAnswers.filter((ans) => ans !== undefined && ans !== "");

                              if (q.type === "checkbox") {
                                // Calculate Yes/No stats
                                const yesCount = filteredAnswers.filter((ans) => {
                                  const lower = String(ans).toLowerCase();
                                  return lower === "yes" || lower === "true" || ans === true;
                                }).length;
                                const noCount = filteredAnswers.length - yesCount;
                                const total = filteredAnswers.length;

                                const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0;
                                const noPct = total > 0 ? Math.round((noCount / total) * 100) : 0;

                                return (
                                  <div key={q.id} className="bg-black/25 border border-white/5 rounded-xl p-4.5 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-extrabold text-white truncate max-w-[80%]" title={q.label}>{q.label}</span>
                                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/5 border border-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Yes / No</span>
                                    </div>
                                    <div className="space-y-2.5 font-sans">
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-gray-300">
                                          <span>Yes (Agreed)</span>
                                          <span className="font-mono text-[10px] text-gray-400 font-black">{yesCount} ({yesPct}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${yesPct}%` }}></div>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] text-gray-300">
                                          <span>No (Declined)</span>
                                          <span className="font-mono text-[10px] text-gray-400 font-black">{noCount} ({noPct}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${noPct}%` }}></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                // For text, number, email: build frequency statistics
                                const freq: Record<string, number> = {};
                                filteredAnswers.forEach((ans) => {
                                  let txt = String(ans).trim();
                                  if (!txt) return;
                                  freq[txt] = (freq[txt] || 0) + 1;
                                });

                                const sorted = Object.entries(freq)
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 4); // show top 4 answers

                                return (
                                  <div key={q.id} className="bg-black/25 border border-white/5 rounded-xl p-4.5 space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-white truncate max-w-[70%]" title={q.label}>{q.label}</span>
                                      <span className="text-[9px] font-mono text-gavel-yellow bg-gavel-yellow/5 border border-gavel-yellow/10 px-1.5 py-0.5 rounded shrink-0 uppercase">{q.type}</span>
                                    </div>
                                    <div className="space-y-2">
                                      {sorted.length === 0 ? (
                                        <div className="text-[10px] text-gray-500 font-mono py-2">No response submissions matching field.</div>
                                      ) : (
                                        sorted.map(([reply, count], idx) => {
                                          const pct = filteredAnswers.length > 0 ? Math.round((count / filteredAnswers.length) * 100) : 0;
                                          return (
                                            <div key={idx} className="space-y-1 text-left">
                                              <div className="flex justify-between text-[11px] text-gray-300">
                                                <span className="truncate max-w-[75%] font-serif italic text-gray-400">"{reply}"</span>
                                                <span className="font-mono text-[10px] text-gray-400 shrink-0 font-black">{count}x ({pct}%)</span>
                                              </div>
                                              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                  className="h-full bg-[#FFDE00] rounded-full transition-all duration-500" 
                                                  style={{ 
                                                    width: `${pct}%`,
                                                    opacity: 1 - (idx * 0.2)
                                                  }}
                                                ></div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}

                      {/* Registrants Data Table */}
                      <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-mono font-black text-[#FFDE00] uppercase tracking-widest">Registered Attendee List ({eventRegistrations.length})</h4>
                          <span className="text-[10px] text-gray-500 font-sans">Required Approval states are flagged manually below</span>
                        </div>

                        <div className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden">
                          <div className="overflow-x-auto select-none">
                            <table className="w-full text-left text-xs font-sans">
                              <thead>
                                <tr className="bg-black/40 border-b border-white/5 text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                                  <th className="p-4">Comrade Delegate</th>
                                  <th className="p-4">Contact Info</th>
                                  <th className="p-4">Academic Year</th>
                                  <th className="p-4">Gender</th>
                                  <th className="p-4">Registry State</th>
                                  <th className="p-4 text-center">Operational Directives</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {eventRegistrations.map((reg) => {
                                  const isPending = !reg.approvalStatus || reg.approvalStatus === "pending";
                                  const isApproved = reg.approvalStatus === "approved";
                                  const isDeclined = reg.approvalStatus === "declined";
                                  const combinedYear = reg.yearOfStudy || (reg as any).regYear || (reg as any).year || "N/A";
                                  const combinedGender = reg.gender || (reg as any).regGender || "N/A";

                                  return (
                                    <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors">
                                      <td className="p-4">
                                        <div>
                                          <p className="font-extrabold text-white">{reg.userName}</p>
                                          <span className="text-[10px] text-gray-500 font-mono uppercase">ID: {reg.id.substring(0, 8)}</span>
                                          
                                          {/* Custom Form Question Submissions */}
                                          {reg.customFields && Object.keys(reg.customFields).length > 0 && (
                                            <div className="mt-1.5 bg-white/[0.02] border border-white/5 rounded-lg p-2 text-[10px] space-y-1 text-gray-400 max-w-[280px]">
                                              {Object.entries(reg.customFields).map(([label, response]) => (
                                                <div key={label} className="truncate">
                                                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#FFDE00]/80 font-black">{label}:</span>{" "}
                                                  <span className="text-gray-300 font-medium font-sans">"{response}"</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-4 font-mono text-[11px] text-gray-300">{reg.userEmail}</td>
                                      <td className="p-4 font-mono text-[11px] text-[#FFDE00]">{combinedYear}</td>
                                      <td className="p-4 font-mono text-[11px] text-gray-400">{combinedGender}</td>
                                      <td className="p-4">
                                        {isApproved && (
                                          <span className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded">
                                            Approved Seat
                                          </span>
                                        )}
                                        {isDeclined && (
                                          <span className="inline-block bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded">
                                            Declined
                                          </span>
                                        )}
                                        {isPending && (
                                          <span className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded select-none animate-pulse">
                                            Pending Approval
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center justify-center gap-3">
                                          {/* Approval Controls */}
                                          {isPending && (
                                            <>
                                              <button 
                                                type="button"
                                                disabled={!!approvalLoadingRegId}
                                                onClick={() => handleApproveRegistration(reg.id, reg, selectedEventForAnalysis)}
                                                className="bg-green-500 hover:bg-green-400 text-black font-extrabold text-[10px] font-mono tracking-wider uppercase px-2.5 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1"
                                              >
                                                Approve
                                              </button>
                                              <button 
                                                type="button"
                                                disabled={!!approvalLoadingRegId}
                                                onClick={() => handleDeclineRegistration(reg.id, reg)}
                                                className="bg-white/5 border border-white/10 hover:bg-red-500 hover:text-black hover:border-red-500 text-gray-300 font-extrabold text-[10px] font-mono tracking-wider uppercase px-2.5 py-1.5 rounded transition-all cursor-pointer"
                                              >
                                                Decline
                                              </button>
                                            </>
                                          )}

                                          {/* Reset or De-approve option if approved */}
                                          {isApproved && (
                                            <button 
                                              type="button"
                                              disabled={!!approvalLoadingRegId}
                                              onClick={() => handleDeclineRegistration(reg.id, reg)}
                                              className="text-gray-500 hover:text-red-400 text-[10px] font-mono uppercase tracking-wider hover:underline cursor-pointer"
                                            >
                                              Decline Seat
                                            </button>
                                          )}

                                          {isDeclined && (
                                            <button 
                                              type="button"
                                              disabled={!!approvalLoadingRegId}
                                              onClick={() => handleApproveRegistration(reg.id, reg, selectedEventForAnalysis)}
                                              className="text-gray-500 hover:text-green-400 text-[10px] font-mono uppercase tracking-wider hover:underline cursor-pointer"
                                            >
                                              Approve Seat
                                            </button>
                                          )}

                                          <div className="w-px h-4 bg-white/5" />

                                          {/* E-Pass Automated Reminder Campaign trigger button */}
                                          <button
                                            type="button"
                                            disabled={reminderLoadingRegId === reg.id}
                                            onClick={() => handleSendReminderCampaign(reg.id, reg, selectedEventForAnalysis)}
                                            className="text-[#FFDE00] hover:text-white hover:bg-white/5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-[#FFDE00]/20 hover:border-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                            title="Dispatch urgent automated countdown email with schedule reminder details"
                                          >
                                            {reminderLoadingRegId === reg.id ? "Sending..." : "Dispatch Reminder"}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {eventRegistrations.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 font-mono text-xs uppercase tracking-widest">
                                      No delegate pass registrations filed for this symposium yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Select an Event Symposium to view Applicants feed.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 4: SECURE GALLERY DAM */}
          {activeTab === "assets" && (() => {
            const randomizedImages = [...galleryItems].sort((a, b) => {
              const hashA = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const hashB = b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              return (hashA % 13) - (hashB % 13);
            });

            return (
              <div className="space-y-0 text-left animate-fade-in w-full p-0 m-0 rounded-none border-none">
                {/* 1. EASY POSTING BUTTON & EXPANDING CONTROLS */}
                <div className="flex items-center bg-[#070708] p-0 m-0 border-b border-white/10 rounded-none gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlusMenuOpen(!isPlusMenuOpen);
                      setPlusMode("none");
                    }}
                    className="w-12 h-12 bg-gavel-yellow hover:bg-[#FFDE00] text-black flex items-center justify-center transition-all cursor-pointer rounded-none border-none"
                    title="Toggle posting options"
                  >
                    {isPlusMenuOpen ? <X size={18} /> : <Plus size={18} />}
                  </button>

                  {isPlusMenuOpen && (
                    <div className="flex h-12 bg-black/60 items-center animate-fade-in rounded-none divide-x divide-white/10 border-r border-white/10">
                      {/* General upload option */}
                      <label className="px-5 h-full flex items-center justify-center hover:bg-white/5 font-mono text-[10px] tracking-widest text-white uppercase cursor-pointer transition-all rounded-none font-bold">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              await addImagesToGallery(e.target.files);
                              setIsPlusMenuOpen(false);
                            }
                          }}
                        />
                        GENERAL
                      </label>

                      {/* Collection creation option */}
                      <button
                        type="button"
                        onClick={() => setPlusMode(plusMode === "collection" ? "none" : "collection")}
                        className={`px-5 h-full flex items-center justify-center font-mono text-[10px] tracking-widest uppercase transition-all whitespace-nowrap cursor-pointer rounded-none ${
                          plusMode === "collection" ? "bg-gavel-yellow text-black font-black" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        NEW COLLECTION
                      </button>
                    </div>
                  )}

                  {/* Inline collector sub-input */}
                  {isPlusMenuOpen && plusMode === "collection" && (
                    <div className="flex h-12 bg-black items-center animate-fade-in border-r border-white/10">
                      <input
                        type="text"
                        placeholder="Collection Name..."
                        value={colUploadName}
                        onChange={(e) => setColUploadName(e.target.value)}
                        className="bg-transparent px-4 py-1 text-xs text-white placeholder-gray-600 focus:outline-none min-w-[150px] sm:min-w-[200px]"
                      />
                      <label className="px-5 h-full bg-[#FFDE00] text-black font-mono text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all hover:bg-white flex items-center justify-center rounded-none">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (!colUploadName.trim()) {
                              triggerToast("Supply collection name first", "error");
                              return;
                            }
                            if (e.target.files && e.target.files.length > 0) {
                              await handleCreateAndUploadCollection(colUploadName, e.target.files);
                              setColUploadName("");
                              setPlusMode("none");
                              setIsPlusMenuOpen(false);
                            }
                          }}
                        />
                        UPLOAD FILES
                      </label>
                    </div>
                  )}
                </div>

                {/* 2. FRONTLINE COLLECTIONS LISTING */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-px bg-white/10 w-full select-none text-left rounded-none">
                  {albums.map((alb) => {
                    const albumPhotos = galleryItems.filter((p) => p.albumId === alb.id);
                    const coverPhoto = albumPhotos.length > 0 ? albumPhotos[0].imageUrl : "";
                    const isOpened = activeColId === alb.id;
                    return (
                      <div
                        key={alb.id}
                        onClick={() => setActiveColId(isOpened ? null : alb.id)}
                        className={`relative aspect-[4/3] w-full cursor-pointer group bg-[#0d0d0f] transition-all p-3 flex flex-col justify-between rounded-none ${
                          isOpened ? "bg-white/[0.05]" : ""
                        }`}
                      >
                        {coverPhoto && (
                          <img
                            src={coverPhoto}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none group-hover:scale-102 transition-transform duration-500"
                          />
                        )}
                        <div className="relative z-10 flex justify-between items-start w-full">
                          <span className="text-[8px] font-mono tracking-widest text-[#FFDE55] uppercase font-black">
                            {albumPhotos.length} IMAGES
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGalleryAlbum(alb.id);
                              if (isOpened) setActiveColId(null);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none rounded-none bg-transparent"
                            title="Delete Collection"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <div className="relative z-10">
                          <p className="text-[11px] font-black uppercase text-white tracking-widest truncate group-hover:text-gavel-yellow transition-colors">
                            {alb.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3. ACTIVE OPENED COLLECTION PANEL */}
                {activeColId && (() => {
                  const activeAlb = albums.find((a) => a.id === activeColId);
                  if (!activeAlb) return null;
                  const colPhotos = galleryItems.filter((p) => p.albumId === activeColId);
                  return (
                    <div className="bg-[#050506] border-b border-white/10 p-3 text-left animate-fade-in space-y-3 rounded-none">
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch justify-between">
                        <div className="flex items-center gap-2 flex-grow bg-[#0f0f11] py-1 px-3 border border-white/5 rounded-none">
                          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest font-bold whitespace-nowrap">
                            LABEL:
                          </span>
                          <input
                            type="text"
                            defaultValue={activeAlb.name}
                            onBlur={(e) => updateAlbumLabel(activeColId, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateAlbumLabel(activeColId, e.currentTarget.value);
                                e.currentTarget.blur();
                              }
                            }}
                            className="bg-transparent text-[11px] font-black uppercase text-gavel-yellow focus:outline-none flex-grow"
                            placeholder="Change collection label..."
                          />
                        </div>

                        <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-[9px] tracking-widest uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                await handleUploadPhotosToAlbum(activeColId, e.target.files);
                              }
                            }}
                          />
                          <Plus size={10} /> ADD IMAGES DIRECTLY
                        </label>
                      </div>

                      {colPhotos.length === 0 ? (
                        <p className="text-[9px] font-mono text-gray-500 uppercase py-6 bg-black/40 text-center rounded-none m-0">
                          Collection archives empty.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-px bg-white/10 rounded-none w-full">
                          {colPhotos.map((item) => (
                            <div key={item.id} className="relative aspect-square bg-[#0c0c0e] group overflow-hidden rounded-none">
                              <img
                                src={item.imageUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/85 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-none">
                                <button
                                  type="button"
                                  onClick={() => removeImageFromCollection(item)}
                                  className="w-6 h-6 bg-white/10 rounded-none text-xs text-white hover:bg-white/20 transition-all font-mono font-bold flex items-center justify-center cursor-pointer border-none"
                                  title="Unassign from collection"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(item)}
                                  className="w-6 h-6 bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all rounded-none flex items-center justify-center cursor-pointer border-none"
                                  title="Delete image entirely"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. GRID OF ALL UPLOADED IMAGES (Sorted stable-randomly) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-px bg-white/10 w-full select-none text-left rounded-none">
                  {randomizedImages.map((item) => {
                    const itemAlbum = albums.find((a) => a.id === item.albumId);
                    return (
                      <div key={item.id} className="relative aspect-square bg-[#0c0c0e] group overflow-hidden rounded-none">
                        <img
                          src={item.imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />

                        {/* Subtle Label of collection at bottom */}
                        {itemAlbum && (
                          <div className="absolute left-0 bottom-0 bg-black/80 px-1 py-0.5 text-[8.5px] font-mono font-black text-gavel-yellow max-w-full truncate uppercase tracking-widest rounded-none">
                            {itemAlbum.name}
                          </div>
                        )}

                        {/* Hover triggers */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 rounded-none">
                          <div className="flex justify-between items-center relative w-full">
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(item)}
                              className="w-6 h-6 bg-black text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center rounded-none border-none"
                              title="Delete Photo"
                            >
                              <Trash2 size={10} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningImageId(assigningImageId === item.id ? null : item.id);
                              }}
                              className="w-6 h-6 bg-black text-[#FFDE00] hover:bg-gavel-yellow hover:text-black transition-colors font-black text-sm flex items-center justify-center cursor-pointer rounded-none border-none"
                              title="Assign to Collection"
                            >
                              +
                            </button>

                            {/* Dropdown popup list */}
                            {assigningImageId === item.id && (
                              <div className="absolute right-0 bottom-7 z-40 bg-black border border-white/20 flex flex-col max-h-32 overflow-y-auto w-32 select-none rounded-none shadow-2xl">
                                {albums.map((alb) => (
                                  <button
                                    key={alb.id}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await fbfs.updateDocById("gallery", item.id, { albumId: alb.id });
                                        triggerToast(`Moved file to "${alb.name}"`);
                                        setAssigningImageId(null);
                                        await loadDatabaseRecords();
                                      } catch (err: any) {
                                        triggerToast("Assignment failed.", "error");
                                      }
                                    }}
                                    className="px-2 py-1 text-[8px] font-mono text-left font-bold border-b border-white/5 uppercase text-gray-300 hover:bg-[#FFDE00] hover:text-black transition-colors truncate rounded-none border-none"
                                  >
                                    {alb.name}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await fbfs.updateDocById("gallery", item.id, { albumId: "" });
                                      triggerToast("Removed photo from collections.");
                                      setAssigningImageId(null);
                                      await loadDatabaseRecords();
                                    } catch (err: any) {
                                      triggerToast("Failed to remove.", "error");
                                    }
                                  }}
                                  className="px-2 py-1 text-[8px] font-mono text-left font-black text-red-400 hover:bg-red-500 hover:text-white transition-colors uppercase whitespace-nowrap rounded-none border-none"
                                >
                                  UNASSIGN
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 5: PARLIAMENT SUGGESTIONS */}
          {activeTab === "vault" && (
            <div className="space-y-8 text-left animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">Student Suggestions Dispatch</h2>
                <p className="text-sm text-gray-400 font-sans font-medium">Verify parliamentary complaints, provide formal legal and institutional responses.</p>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-start">
                
                {/* Suggestions List */}
                <div className="lg:col-span-8 space-y-4">
                  {vaultPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        setActiveVaultPost(post);
                        setVaultMessage((post as any).adminResponse || "");
                        setVaultStatus(post.status || "Under Review");
                      }}
                      className={`p-5 rounded-2xl border transition-all text-left space-y-2 cursor-pointer ${activeVaultPost?.id === post.id ? "bg-[#FFDE00]/5 border-[#FFDE00]/30" : "bg-[#0c0c0e] border-white/10 hover:border-white/20"}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="font-extrabold text-sm uppercase text-white">{post.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono uppercase font-black tracking-widest border ${post.status === "Addressed" ? "bg-green-500/15 border-green-500/30 text-green-400" : post.status === "Investigating" ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400" : "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"}`}>
                          {post.status || "Under Review"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-semibold">{post.content}</p>
                      
                      <div className="flex justify-between items-center pt-2 text-[10px] text-gray-500 font-mono">
                        <span>Submitted by: <b>{post.authorName || "Anonymous"}</b></span>
                        <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}

                  {vaultPosts.length === 0 && (
                    <p className="text-xs text-gray-400 font-bold text-center py-10 bg-[#0c0c0e] border border-dashed border-white/10 rounded-2xl">No parliament suggestions cataloged.</p>
                  )}
                </div>

                {/* Form response editor */}
                <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0d0d0f] border border-white/10 space-y-4">
                  <h3 className="text-xs font-mono font-black uppercase text-gray-400 tracking-wider">Official response editor</h3>
                  
                  {activeVaultPost ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9.5px] font-mono text-gray-400 uppercase font-bold mb-1.5">Action Status</label>
                        <select
                          value={vaultStatus}
                          onChange={(e) => setVaultStatus(e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="Under Review">Under Review</option>
                          <option value="Investigating">Investigating / Processing</option>
                          <option value="Addressed">Addressed & Solved</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9.5px] font-mono text-gray-400 uppercase font-bold mb-1.5">Formal feedback response</label>
                        <textarea
                          rows={4}
                          value={vaultMessage}
                          onChange={(e) => setVaultMessage(e.target.value)}
                          placeholder="Type official institutional feedback response here..."
                          className="w-full bg-[#18181b] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FFDE00]"
                        />
                      </div>

                      <button 
                        onClick={commitVaultStatus} 
                        className="w-full py-3 bg-[#FFDE00] text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        Dispatch Response
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic text-center py-6">Select a complaint from the list on the left to calibrate official institutional responses.</p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: STUDENTS ROSTER Access Control */}
          {activeTab === "roster" && (
            <div className="space-y-8 text-left animate-fade-in">
              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-white">Identity & Subscription Registry</h2>
                  <p className="text-sm text-gray-400 font-sans font-medium">Verify credentials, evaluate newsletter subscription streams, and calibrate authorization rules.</p>
                </div>

                {/* Segment Selector Toggle */}
                <div className="flex bg-[#121214] p-1 rounded-xl border border-white/5 gap-1 shadow-inner self-start md:self-auto shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("users")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono uppercase font-black tracking-wider transition-all cursor-pointer ${
                      rosterViewMode === "users" 
                        ? "bg-[#FFDE00] text-black shadow-md font-extrabold" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    User Accounts ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("newsletter")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono uppercase font-black tracking-wider transition-all cursor-pointer ${
                      rosterViewMode === "newsletter"
                        ? "bg-[#FFDE00] text-black shadow-md font-extrabold" 
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Newsletter ({users.filter(u => u.newsletterSubscribed).length})
                  </button>
                </div>
              </div>

              {rosterViewMode === "users" ? (
                <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/50 border-b border-white/5 text-gray-400 font-mono text-[9px] uppercase tracking-widest">
                        <th className="p-4 font-black">Student User Profile</th>
                        <th className="p-4 font-black text-center">Authorization Level</th>
                        <th className="p-4 font-black text-center">Account status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(usr => (
                        <tr key={usr.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-white text-sm">{usr.name || "Prince Micah"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">{usr.email}</span>
                              {usr.newsletterSubscribed && (
                                <span className="px-1.5 py-0.2 bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-mono rounded uppercase font-bold">Subscribed</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextRole = usr.role === "admin" ? "student" : "admin";
                                await fbfs.updateDocById("users", usr.id, { role: nextRole });
                                triggerToast(`Account authorization calibrated to ${nextRole}`);
                                await loadDatabaseRecords();
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase font-black tracking-widest cursor-pointer ${usr.role === "admin" ? "bg-[#FFDE00]/10 border-[#FFDE00]/30 text-[#FFDE00]" : "bg-black/30 border-white/5 text-gray-400"}`}
                            >
                              {usr.role || "student"}
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextActive = !usr.active;
                                await fbfs.updateDocById("users", usr.id, { active: nextActive });
                                triggerToast(`Student access status toggled successfully.`);
                                await loadDatabaseRecords();
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase font-black tracking-widest cursor-pointer ${usr.active ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-500"}`}
                            >
                              {usr.active ? "Access is active" : "Suspended"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Convenient Bulk Clipboard Utility */}
                  <div className="p-5 bg-black/40 border border-white/10 rounded-2xl text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-black text-gray-300 uppercase tracking-wider">Fast Bulk Copy Tool</h3>
                      <button
                        onClick={() => {
                          const subEmails = users.filter(u => u.newsletterSubscribed).map(u => u.email).filter(Boolean).join(", ");
                          navigator.clipboard.writeText(subEmails);
                          triggerToast("Copied subscriber list to clipboard!");
                        }}
                        className="px-3 py-1.5 text-[10px] bg-[#FFDE00] text-black rounded-lg font-mono uppercase font-black tracking-wider hover:bg-white transition-all cursor-pointer shadow"
                      >
                        Copy All Emails
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                      Click the button above to copy a comma-separated list of all active subscriber emails. Perfect for manual importing into custom outreach tools.
                    </p>
                    <textarea
                      readOnly
                      value={users.filter(u => u.newsletterSubscribed).map(u => u.email).filter(Boolean).join(", ")}
                      className="w-full h-11 bg-black/50 border border-white/5 text-gray-400 rounded-lg p-2.5 text-[10px] font-mono outline-none resize-none"
                    />
                  </div>

                  {/* Subscribers table grid */}
                  <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-black/50 border-b border-white/5 text-gray-400 font-mono text-[9px] uppercase tracking-widest">
                          <th className="p-4 font-black">Subscriber Identity / Campus Mail</th>
                          <th className="p-4 font-black text-center">Opt-in Date</th>
                          <th className="p-4 font-black text-center">Subscription Status</th>
                          <th className="p-4 font-black text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(usr => usr.newsletterSubscribed).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-500 font-mono text-xs uppercase">
                              No active newsletter subscribers enlisted yet
                            </td>
                          </tr>
                        ) : (
                          users.filter(usr => usr.newsletterSubscribed).map(usr => (
                            <tr key={usr.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-white text-sm">{usr.name || "Enlisted Member"}</p>
                                <p className="text-[10px] text-[#FFDE00] font-mono mt-0.5">{usr.email}</p>
                              </td>
                              <td className="p-4 text-center text-gray-400 font-mono text-[10px] uppercase">
                                {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : "Historical Opt-in"}
                              </td>
                              <td className="p-4 text-center">
                                <span className="inline-block px-2.5 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-mono rounded-lg uppercase font-bold tracking-wider">
                                  ACTIVE ENLISTMENT
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Unsubscribe ${usr.email} from the newsletter database?`)) {
                                      await fbfs.updateDocById("users", usr.id, { newsletterSubscribed: false });
                                      triggerToast("Subscriber removed successfully.");
                                      await loadDatabaseRecords();
                                    }
                                  }}
                                  className="px-2.5 py-1.5 hover:bg-red-500/10 text-red-400 rounded-lg text-[9px] font-mono border border-red-500/15 uppercase font-bold tracking-widest transition-colors cursor-pointer"
                                >
                                  Strike Off
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TUNING Override CONTROLS */}
          {activeTab === "settings" && (
            <div className="space-y-8 text-left animate-fade-in text-left">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">System Overrides</h2>
                <p className="text-sm text-gray-400 font-sans font-medium">Sync site settings override variables securely into Firestore database rules.</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0d0d0f] border border-white/10 max-w-2xl space-y-5">
                {[
                  { field: "marketplaceEnabled", label: "Business Marketplace Platform", desc: "Allow students to register enterprise trading profiles and catalog listings." },
                  { field: "vaultEnabled", label: "Student complaints vault desk", desc: "Allows open suggestions, questions and feedback logging." },
                  { field: "eventsEnabled", label: "Active assemblies billboard", desc: "Enables interactive event booking slots registration." }
                ].map((tune, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1 pr-6">
                      <p className="text-sm font-bold text-white uppercase tracking-wide">{tune.label}</p>
                      <p className="text-xs text-gray-500 leading-normal">{tune.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => saveSiteTuning(tune.field)}
                      className={`px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow border transition-colors ${ (siteSettings as any)[tune.field] ? "bg-[#FFDE00] text-black border-[#FFDE00]" : "bg-black/40 border-white/10 text-gray-400 hover:text-white"}`}
                    >
                      {(siteSettings as any)[tune.field] ? "ENABLED" : "DISABLED"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: EMAIL TEMPLATES ENGINE */}
          {activeTab === "emails" && (
            <div className="animate-fade-in text-left">
              <EmailStudio />
            </div>
          )}

        </div>
      </main>

      {/* PORTED COMPACT MODALS */}
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
          triggerToast(`Newsletter broadcast initiated successfully to ${count} students!`);
          logActivity(`Broadcasted mailshot: "${sub}"`, "Newsletter");
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

      {/* TOAST SYSTEM ACCENTS */}
      {toast && (
        <div className="fixed top-24 right-8 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border bg-[#0d0d0f]/95 backdrop-blur-md shadow-2xl text-xs font-semibold max-w-sm border-white/15 text-white animate-fade-in font-sans">
          <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-green-400" : "bg-red-400"}`}></div>
          <p className="flex-1">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="text-[10px] text-gray-500 hover:text-white ml-2">Dismiss</button>
        </div>
      )}

    </div>
  );
}
