export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatar: string;
  course?: string;
  year?: string;
  createdAt: any;
  lastActive: any;
  role: 'student' | 'admin' | 'staff' | 'vendor';
  active: boolean;
  newsletterSubscribed?: boolean;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string;
  coverUrl?: string;
  leadership?: Array<{ name: string; role: string; email?: string }>;
  active: boolean;
  createdAt: any;
}

export interface ClubMembership {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  joinedAt: any;
}

export interface Event {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  tags?: string[];
  eventType: 'physical' | 'virtual' | 'hybrid';
  coverImage?: string;
  bannerImage?: string;
  galleryImages?: string[];
  promotionalPoster?: string;
  startDate: any;
  endDate: any;
  startTime?: string;
  endTime?: string;
  registrationDeadline: any;
  timezone?: string;
  venue?: string;
  venueDescription?: string;
  googleMapsLink?: string;
  meetingLink?: string;
  meetingPlatform?: string;
  organizerName: string;
  organizerLogo?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizerDescription?: string;
  unlimited?: boolean;
  capacity?: number;
  waitlistEnabled?: boolean;
  registeredCount: number;
  attendanceCount: number;
  goingCount: number;
  interestedCount: number;
  waitlistCount?: number;
  published: boolean;
  featured: boolean;
  private?: boolean;
  visibility: 'draft' | 'public' | 'private';
  status: 'active' | 'archived' | 'cancelled';
  featuredOnHomepage?: boolean;
  featuredInHero?: boolean;
  pinned?: boolean;
  customQuestions?: CustomQuestion[];
  isExternal?: boolean;
  requireApproval?: boolean;
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'checkbox';
  required: boolean;
}

export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  status: 'going' | 'interested';
  createdAt: any;
  updatedAt: any;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  yearOfStudy?: string;
  gender?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  customFields?: Record<string, string>;
  createdAt: any;
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  featured: boolean;
  visible: boolean;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: any;
  albumId?: string;
}

export interface GalleryAlbum {
  id: string;
  name: string;
  description?: string;
  topic: string;
  createdAt: any;
}

export interface VaultPost {
  id: string;
  title: string;
  content: string;
  anonymousId: string;
  timestamp: number;
  supportCount: number;
  authorName: string;
  contactInfo?: string;
}

export interface CatalogItem {
  name: string;
  description: string;
  price?: string | number;
  imageUrl?: string;
  isPromo?: boolean;
  promoTag?: string;
  promoMessage?: string;
  supportiveMessage?: string;
  noImage?: boolean;
  promoImageSlot?: number;
  gradientIndex?: number;
}

export interface BusinessRating {
  userId: string;
  userName: string;
  rating: number;
  review?: string;
  timestamp: any;
}

export interface PromotionItem {
  id: string;
  title: string;
  description: string;
  discountText?: string;
  imageUrl?: string;
  active: boolean;
}

export interface MarketplaceProfile {
  id: string;
  uid: string;
  ownerName: string;
  businessName: string;
  description: string;
  category: string;
  location: string;
  contactEmail: string;
  contactPhone?: string;
  whatsappNumber?: string;
  hours?: string;
  images: string[];
  catalog?: CatalogItem[];
  ratings?: BusinessRating[];
  overallRating?: number;
  promotions?: PromotionItem[];
  emailNotificationsEnabled?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  status: 'active' | 'sold';
  createdAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  visible: boolean;
  createdAt: any;
  category?: 'Update' | 'Announcement' | 'Communication';
  platforms?: string[];
  coverImage?: string;
}

export interface SiteSettings {
  id: string;
  marketplaceEnabled: boolean;
  vaultEnabled: boolean;
  galleryEnabled: boolean;
  eventsEnabled: boolean;
  clubsOpen: boolean;
  newsletterEnabled: boolean;
}

export interface ActivityFeedItem {
  id: string;
  action: string;
  details?: string;
  userId: string;
  userName?: string;
  timestamp: number;
}
