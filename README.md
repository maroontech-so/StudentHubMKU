# Mount Kenya University (MKU) School of Law — Student Hub & Parliament Portal

Welcome to the **MKU Law Student Hub & Parliament Portal**, a highly polished, full-stack, secure digital ecosystem custom-built for students, faculty, and administrative leaders at Mount Kenya University. The portal serves as a unified command center for campus updates, secure anonymous feedback desks, democratic student leadership interactions, community markets, club memberships, and RSVP-ready academic event channels.

---

## 🏛️ Project Vision & Visual Design

The MKU Law Student Hub is styled with **Gavel & Slate Modernism**—utilizing generous negative space, sleek borders, charcoal-gray ambient dark frames, high-contrast gold accents, and beautiful micro-animations. It translates legal prestige into a cutting-edge, fast, and accessible mobile-friendly web experience.

* **Space Grotesk** and **Inter** typography pairing.
* Interactive state-driven transitions via **framer-motion** (`motion/react`).
* Highly secure design principles, ensuring student identities remain shielded inside safe spaces.

---

## 🛠️ Complete Feature Matrix

The portal houses multiple high-fidelity, interactive views structured modularly:

### 1. 🏡 Student Gazette Hub (`HomeView.tsx`)
* **Urgent Bulletins**: Real-time broadcasts from student parliament representatives.
* **Gazette Newsletter**: Fast, one-click email subscription with instant Resend confirmation emails and automated broadcast queues.
* **Campus Snapshots**: At-a-glance carousel for upcoming events, popular student directories, and trending local listings.

### 2. 🗳️ The Secure Vault (`VaultView.tsx`)
As requested, this is designed for ultimate minimalism based on the official blueprint design:
* **Consequence-Free Input**: A single text frame focusing entirely on the core whisper text area.
* **Anonymous Verification**: Generates randomized, masked credentials on dispatch, guaranteeing absolute metadata concealment.
* **Sealed Submission**: Direct insertion into Firebase Realtime Database with high-durability persistence.

### 3. 🎫 Academic & Social Events Desk (`EventsView.tsx`, `EventDetailsView.tsx`)
* **Registrations & RSVPs**: Integrated interactive ticketing with automated registration confirmation emails.
* **Cron-Ready Notifications**: Resend-backed background alert queues reminding students of pending sessions, moot court sessions, or guest lectures.
* **Dynamic RSVPs**: Tracks attendance statistics dynamically with support indices.

### 4. 🧭 Club Directories (`ClubsView.tsx`)
* **Alliance Lists**: Full directory of student clubs, moot court teams, and specialized legal societies.
* **Membership Actions**: Secure request processing, user registrations, and admin-led membership rosters.

### 5. 🛍️ Student Marketplace (`MarketplaceView.tsx`, `SellerProfileView.tsx`)
* **Local Peer Commerce**: Allows student entrepreneurs to publish textbooks, visual charts, custom dress codes, and local services.
* **Seller Hub**: Manage active profiles, update existing listings, and capture real-time email-driven purchase requests.

### 6. 🛡️ Master Governor Console (`AdminView.tsx`)
* **Content Command**: Admin desk to manage, edit, delete, or flag announcements, event items, media albums, and club files.
* **Subscriber Broadcast Panel**: Direct interface to broadcast beautiful responsive newsletter graphics to active subscriber lists.
* **Membership Overviews**: View student enrollments, download email registries, and resolve custom Vault issues.

---

## 📂 System File Architecture

```bash
├── api/                                      # Full-stack Serverless Endpoint Proxies
│   ├── index.ts                              # Main Server Core
│   ├── alert-vendor.ts                       # Mail Dispatch for Marketplace purchases
│   ├── send-event-registration-email.ts      # Mail Dispatch for Event ticketing confirmation
│   ├── send-event-reminder-email.ts          # Mail Dispatch for automatic reminders
│   └── send-newsletter.ts                    # Broadcast core for newsletter dispatching
├── src/
│   ├── components/                           # Shared UI Custom Components
│   │   └── AdminNewsletterModal.tsx          # Responsive Newsletter Design Form
│   ├── lib/
│   │   └── firebase.ts                       # Firebase Web Client (Firestore + Auth + RTDB)
│   ├── views/                                # Modular Full-Screen Route Components
│   │   ├── HomeView.tsx                      # General dashboard & Newsletter subscription
│   │   ├── VaultView.tsx                     # Minimalistic feedback box
│   │   ├── AdminView.tsx                     # Parliament and admin console
│   │   ├── MarketplaceView.tsx               # Peer commerce listings
│   │   └── ClubsView.tsx                     # Legal alliance portfolios
│   ├── App.tsx                               # Primary Route Engine & Authentication state
│   ├── main.tsx                              # React Dom Entry
│   ├── index.css                             # Tailwind core & Theme definitions
│   └── types.ts                              # Core global data models
├── .env.example                              # Reference Environment File
├── package.json                              # Main Manifest and Dependencies Registry
├── tailwind.config.js                        # Layout constraints
└── tsconfig.json                             # Modern Type Compilations rules
```

---

## ⚙️ Environment Configuration

To operate the full-stack email broadcasters and secure authentication hooks, configure your environment files. Never store active keys inside the workspace. Use a `.env` or `.env.local` file:

```env
# SERVER-SIDE EMAIL BROADCAST CONFIGURATION
RESEND_API_KEY=re_dH4sb2mM_8qFhcnntLemF4XFZf9YwXutC
RESEND_DOMAIN_VERIFIED=studenthubmku.xyz

# FIREBASE INTEGRATION BLUEPRINTS
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

---

## 🚀 Installation & Local Development

Follow these steps to run the application on your computer:

### 1. Install Dependencies
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
The server will boot locally and link active files.

### 3. Multi-Platform Build Checkup
Before deploying or checking artifacts, verify that TypeScript configurations and bundler assets build cleanly:
```bash
npm run lint
npm run build
```

---

## 🔒 Security Operations & Data Trust

1. **Lazy Key Resolution**: The backend utilizes secure lazy getters. Mail routes do not crash on startup if credentials are temporarily absent.
2. **Client Anonymization**: No browser-level telemetry, third-party trackers, or hardware fingerprints are cached or transferred to the Vault databases.
3. **Double-Masked Broadcasts**: To project student privacy, newsletter campaigns sent to multiple subscribers always pack recipient addresses in `BCC` fields, ensuring email addresses remain unexposed.
