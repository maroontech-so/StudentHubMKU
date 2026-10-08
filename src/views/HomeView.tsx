import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { fbfs } from "../lib/firebase";
import {
  Announcement,
  Event,
  Club,
  MarketplaceProfile,
  GalleryItem
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Calendar,
  Users,
  ArrowRight,
  Store,
  Lock,
  Image as icons,
  ChevronLeft,
  ChevronRight,
  Share2,
  X,
  Sparkles
} from "lucide-react";
import { ShareDialog } from "../components/ShareDialog";
import {
  optimizeUrl,
  generateSrcSet,
  getLoadingAttr,
  getFetchPriority
} from "../utils/imageOptimization";

const PROMO_GRADIENTS = [
  {
    id: 0,
    classes: "from-[#FFDE00] to-[#ffae00] text-black",
    text: "text-black"
  },
  {
    id: 1,
    classes: "from-amber-500 to-rose-600 text-white",
    text: "text-white"
  },
  {
    id: 2,
    classes: "from-indigo-900 via-purple-900 to-purple-800 text-white",
    text: "text-white"
  },
  {
    id: 3,
    classes: "from-emerald-600 via-teal-700 to-cyan-800 text-white",
    text: "text-white"
  },
  {
    id: 4,
    classes: "from-sky-400 to-blue-600 text-white",
    text: "text-white"
  },
  {
    id: 5,
    classes: "from-fuchsia-600 via-purple-700 to-pink-500 text-white",
    text: "text-white"
  },
  {
    id: 6,
    classes: "from-orange-400 via-amber-500 to-yellow-500 text-white",
    text: "text-white"
  },
  {
    id: 7,
    classes: "from-red-700 to-neutral-900 text-white",
    text: "text-white"
  },
  {
    id: 8,
    classes:
      "from-neutral-900 via-zinc-800 to-stone-900 text-white border-l-4 border-[#FFDE00]",
    text: "text-white"
  },
  {
    id: 9,
    classes: "from-pink-500 via-purple-500 to-indigo-500 text-white",
    text: "text-white"
  },
  {
    id: 10,
    classes: "from-violet-800 to-fuchsia-700 text-white",
    text: "text-white"
  }
];

export function HomeView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<MarketplaceProfile[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [galleryCount, setGalleryCount] = useState(4);
  const [stats, setStats] = useState({
    users: 142,
    events: 0,
    products: 0
  });

  const [expandedAnns, setExpandedAnns] = useState<
    Record<string, boolean>
  >({});

  const [flashDeals, setFlashDeals] = useState<
    Array<{ promo: any; biz: MarketplaceProfile }>
  >([]);

  const [clubs, setClubs] = useState<Club[]>([]);

  const [countdown, setCountdown] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00"
  });

  const [nextEventTitle, setNextEventTitle] =
    useState("Loading...");

  const [selectedBulletin, setSelectedBulletin] =
    useState<Announcement | null>(null);

  const [shareData, setShareData] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    category: "Event" | "Bulletin" | "Portfolio";
  }>({
    isOpen: false,
    url: "",
    title: "",
    category: "Bulletin"
  });

  const [activeDealIdx, setActiveDealIdx] = useState(0);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const triggerToast = (
    msg: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({
      message: msg,
      type
    });

    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        /* =====================================================
           1. ANNOUNCEMENTS
        ===================================================== */

        const annList =
          await fbfs.getCollection<Announcement>(
            "announcements",
            [["visible", "==", true]],
            "createdAt",
            "desc"
          );

        const filteredAnnList = annList.filter(
          (ann) =>
            !ann.platforms ||
            ann.platforms.includes("homepage")
        );

        setAnnouncements(
          filteredAnnList.slice(0, 10)
        );

        /* =====================================================
           2. EVENTS
        ===================================================== */

        const rawEvList =
          await fbfs.getCollection<Event>("events");

        const now = Date.now();

        const evList = rawEvList
          .filter((e) => {
            if (
              e.published === false ||
              e.status === "cancelled"
            ) {
              return false;
            }

            const time = e.startDate?.seconds
              ? e.startDate.seconds * 1000
              : new Date(e.startDate).getTime();

            return time > now;
          })
          .sort((a, b) => {
            const timeA = a.startDate?.seconds
              ? a.startDate.seconds * 1000
              : new Date(a.startDate).getTime();

            const timeB = b.startDate?.seconds
              ? b.startDate.seconds * 1000
              : new Date(b.startDate).getTime();

            return timeA - timeB;
          })
          .slice(0, 5);

        setUpcomingEvents(evList);

        if (evList.length > 0) {
          setNextEventTitle(evList[0].title);
        } else {
          setNextEventTitle("No event");
        }

        /* =====================================================
           3. MARKETPLACE
        ===================================================== */

        let listList: MarketplaceProfile[] = [];

        try {
          listList =
            await fbfs.getCollection<MarketplaceProfile>(
              "marketplaceProfiles",
              [],
              "createdAt",
              "desc",
              20
            );
        } catch (_) {}

        if (
          !listList ||
          listList.length === 0
        ) {
          listList = [
            {
              id: "seed_micah",
              uid: "seed_user_micah",
              ownerName: "Prince Micah",
              businessName:
                "Micah's Premium Kinyozi",
              description:
                "I own a pristine kinyozi a few metres from the school gate.",
              category:
                "Salon & Grooming",
              location: "Gate Area",
              contactEmail:
                "micahprincemicah001@gmail.com",
              images: [
                "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80"
              ],
              whatsappNumber:
                "+254712345678",
              promotions: [
                {
                  id: "def_promo_1",
                  title:
                    "Back-to-School Barber Flash Cut!",
                  description:
                    "Get sharp razor line-ups and pristine hair styling from Prince Micah.",
                  discountText:
                    "20% OFF FOR FRESHMEN",
                  imageUrl:
                    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
                  active: true
                }
              ],
              createdAt: Date.now()
            } as any
          ];
        }

        setListings(listList);

        const promoList: Array<{
          promo: any;
          biz: MarketplaceProfile;
        }> = [];

        listList.forEach((biz) => {
          if (
            biz.catalog &&
            Array.isArray(biz.catalog)
          ) {
            biz.catalog.forEach(
              (item, idx) => {
                if (item.isPromo) {
                  promoList.push({
                    promo: {
                      id: `${biz.id}_promo_cat_${idx}`,
                      title: item.name,
                      description:
                        item.description,
                      discountText:
                        item.promoMessage ||
                        "DEAL",
                      imageUrl:
                        biz.images?.[
                          item.promoImageSlot !==
                          undefined
                            ? item.promoImageSlot
                            : 0
                        ] || "",
                      isPromo: true,
                      promoTag:
                        item.promoTag ||
                        "#PROMO",
                      promoMessage:
                        item.promoMessage ||
                        "SPECIAL DEAL",
                      supportiveMessage:
                        item.supportiveMessage ||
                        item.description ||
                        "",
                      noImage:
                        !!item.noImage,
                      promoImageSlot:
                        item.promoImageSlot !==
                        undefined
                          ? item.promoImageSlot
                          : 0,
                      gradientIndex:
                        item.gradientIndex !==
                        undefined
                          ? item.gradientIndex
                          : 0
                    },
                    biz
                  });
                }
              }
            );
          }

          const hasCatalogPromo =
            promoList.some(
              (item) =>
                item.biz.id === biz.id
            );

          if (
            !hasCatalogPromo &&
            biz.promotions &&
            biz.promotions.length > 0
          ) {
            biz.promotions.forEach(
              (p) => {
                if (p.active) {
                  promoList.push({
                    promo: {
                      id: p.id,
                      title: p.title,
                      description:
                        p.description,
                      discountText:
                        p.discountText ||
                        "PROMO",
                      imageUrl:
                        p.imageUrl || "",
                      isPromo: true,
                      promoTag:
                        "#MEGAOFFER",
                      promoMessage:
                        p.discountText ||
                        "OFFER",
                      supportiveMessage:
                        p.description,
                      noImage:
                        !p.imageUrl,
                      promoImageSlot: 0,
                      gradientIndex: 2
                    },
                    biz
                  });
                }
              }
            );
          }
        });

        if (promoList.length === 0) {
          const micahBiz =
            listList.find(
              (b) => b.id === "seed_micah"
            ) || listList[0];

          promoList.push({
            promo: {
              id: "def_promo_1",
              title:
                "Back-to-School Barber Flash Cut!",
              description:
                "Get sharp razor line-ups and pristine hair styling from Prince Micah.",
              discountText:
                "20% OFF FOR FRESHMEN",
              imageUrl:
                "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
              active: true,
              gradientIndex: 0
            },
            biz: micahBiz
          });

          promoList.push({
            promo: {
              id: "def_promo_2",
              title:
                "Stitch-Perfect Moots Court Gowns",
              description:
                "Advocacy gowns, wings, and smart presentation garments customized live.",
              discountText:
                "KSh 400 OFF ADVOCATES SETS",
              imageUrl:
                "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
              active: true,
              gradientIndex: 1
            },
            biz: micahBiz
          });
        }

        setFlashDeals(
          [...promoList].sort(
            () => Math.random() - 0.5
          )
        );

        /* =====================================================
           4. GALLERY
        ===================================================== */

        try {
          const gallery =
            await fbfs.getCollection<GalleryItem>(
              "gallery"
            );

          setGalleryImages(
            gallery || []
          );

          setGalleryCount(
            gallery.length || 0
          );
        } catch (_) {}

        /* =====================================================
           5. CLUBS
        ===================================================== */

        let clubsList: Club[] = [];

        try {
          clubsList =
            await fbfs.getCollection<Club>(
              "clubs",
              [["active", "==", true]],
              "name",
              "asc",
              4
            );
        } catch (_) {}

        if (
          !clubsList ||
          clubsList.length === 0
        ) {
          clubsList = [
            {
              id: "moot_court_society",
              name: "Moot Court Society",
              category:
                "Advocacy & Trials",
              description:
                "Hone elite trial litigation, oral advocacy, and legal brief writing.",
              logoUrl:
                "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=200&auto=format&fit=crop",
              coverUrl:
                "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=1200&auto=format&fit=crop",
              active: true
            } as any,
            {
              id: "human_rights_assoc",
              name:
                "Human Rights Law Guild",
              category:
                "Social Justice Campaign",
              description:
                "Committed to legal aid clinics, human rights advocacy, and civil rights community discourse.",
              logoUrl:
                "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=200&auto=format&fit=crop",
              coverUrl:
                "https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=1200&auto=format&fit=crop",
              active: true
            } as any
          ];
        }

        setClubs(clubsList);

        /* =====================================================
           6. STATS
        ===================================================== */

        let usersCount = 142;

        try {
          const allUsers =
            await fbfs.getCollection("users");

          usersCount =
            allUsers.length || 142;
        } catch (_) {}

        setStats({
          users: usersCount,
          events: evList.length,
          products: listList.length
        });
      } catch (err) {
        console.error(
          "Error loading homepage widgets data:",
          err
        );
      }
    };

    loadHomeData();
  }, []);

  /* =========================================================
     SHARED BULLETIN
  ========================================================= */

  useEffect(() => {
    if (announcements.length > 0) {
      const urlParams =
        new URLSearchParams(
          window.location.search
        );

      const sharedId =
        urlParams.get("bulletinId");

      if (sharedId) {
        const matched =
          announcements.find(
            (a) => a.id === sharedId
          );

        if (matched) {
          setSelectedBulletin(
            matched
          );
        }
      }
    }
  }, [announcements]);

  /* =========================================================
     MARKETPLACE AUTO ROTATION
  ========================================================= */

  useEffect(() => {
    if (flashDeals.length <= 1) {
      return;
    }

    const interval =
      setInterval(() => {
        setActiveDealIdx(
          (prev) =>
            (prev + 1) %
            flashDeals.length
        );
      }, 6000);

    return () =>
      clearInterval(interval);
  }, [flashDeals]);

  /* =========================================================
     EVENT COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (
      upcomingEvents.length === 0
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        const ev =
          upcomingEvents[0];

        const dateObj =
          ev.startDate?.seconds
            ? new Date(
                ev.startDate.seconds *
                  1000
              )
            : new Date(
                ev.startDate
              );

        const diff =
          dateObj.getTime() -
          Date.now();

        if (diff <= 0) {
          setCountdown({
            days: "00",
            hours: "00",
            minutes: "00",
            seconds: "00"
          });
        } else {
          const days =
            Math.floor(
              diff /
                (1000 *
                  60 *
                  60 *
                  24)
            );

          const hours =
            Math.floor(
              (diff /
                (1000 *
                  60 *
                  60)) %
                24
            );

          const minutes =
            Math.floor(
              (diff /
                1000 /
                60) %
                60
            );

          const seconds =
            Math.floor(
              (diff / 1000) %
                60
            );

          setCountdown({
            days: String(
              days
            ).padStart(2, "0"),
            hours: String(
              hours
            ).padStart(2, "0"),
            minutes: String(
              minutes
            ).padStart(2, "0"),
            seconds: String(
              seconds
            ).padStart(2, "0")
          });
        }
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [upcomingEvents]);

  /* =========================================================
     DATE
  ========================================================= */

  const today = new Date();

  const dayNumber =
    String(
      today.getDate()
    ).padStart(2, "0");

  const dayName =
    today.toLocaleDateString(
      undefined,
      {
        weekday: "long",
        month: "long",
        year: "numeric"
      }
    );

  /* =========================================================
     HERO IMAGES
  ========================================================= */

  const heroImages =
    galleryImages
      .filter(
        (item) =>
          !!item.imageUrl
      )
      .slice(0, 6);

  const todayImage =
    heroImages[3]?.imageUrl ||
    heroImages[0]?.imageUrl ||
    "";

  return (
    <main className="home-shell">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="home-hero">

        <div className="hero-copy-block">

          <div className="home-eyebrow">
            <span className="eyebrow-mark" />
            StudentHub MKU
          </div>

          <h1 className="home-hero-title">
            Your campus,
            <span>
              in one place.
            </span>
          </h1>

          <p className="home-hero-description">
            StudentHub brings together the things
            that make student life easier — campus
            updates, events, people, opportunities,
            memories and the everyday discoveries
            happening around MKU.
          </p>

          <div className="hero-meta">
            <span>
              Campus life
            </span>

            <i />

            <span>MKU</span>

            <i />

            <span>
              Built for students
            </span>
          </div>

          <div className="hero-actions">
            <Link
              href="/events"
              className="hero-primary"
            >
              Explore campus
              <ArrowRight size={15} />
            </Link>

            <Link
              href="/marketplace"
              className="hero-secondary"
            >
              Visit marketplace
            </Link>
          </div>

        </div>

        <div className="hero-album">

          <div className="album-label">
            <span>
              CAMPUS / 2026
            </span>

            <span>
              {galleryCount || 0} moments
            </span>
          </div>

          {heroImages.length > 0 ? (
            heroImages.map(
              (image, index) => (
                <Link
                  href="/gallery"
                  key={
                    image.id ||
                    `hero-${index}`
                  }
                  className={`album-photo album-photo-${index + 1}`}
                >
                  <img
                    src={
                      optimizeUrl(
                        image.imageUrl,
                        520,
                        55
                      )
                    }
                    srcSet={`${optimizeUrl(
                      image.imageUrl,
                      520,
                      55
                    )} 520w, ${optimizeUrl(
                      image.imageUrl,
                      760,
                      55
                    )} 760w`}
                    sizes="(max-width: 768px) 90vw, 380px"
                    alt={
                      image.caption ||
                      "MKU campus moment"
                    }
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchpriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    data-loaded="false"
                    onLoad={(e) => {
                      const target =
                        e.target as HTMLImageElement;
                      target.setAttribute(
                        "data-loaded",
                        "true"
                      );
                    }}
                  />

                  <span className="album-photo-caption">
                    {image.caption ||
                      "Campus moment"}
                  </span>
                </Link>
              )
            )
          ) : (
            <div className="album-empty">
              <ImageIcon size={25} />
              <span>
                Campus moments
                will appear here
              </span>
            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          CAMPUS SIGNAL
      ===================================================== */}

      <section className="campus-signal">

        <div className="signal-intro">
          <span className="section-kicker">
            The campus layer
          </span>

          <h2>
            More than a
            <br />
            timetable.
          </h2>

          <p>
            The useful, social and unexpected
            parts of student life — collected
            in one place.
          </p>
        </div>

        <div className="signal-stats">

          <div className="signal-stat">
            <span className="signal-number">
              {stats.users}+
            </span>

            <span className="signal-label">
              Students
            </span>
          </div>

          <div className="signal-stat">
            <span className="signal-number">
              {stats.events}
            </span>

            <span className="signal-label">
              Upcoming events
            </span>
          </div>

          <div className="signal-stat">
            <span className="signal-number">
              {stats.products}
            </span>

            <span className="signal-label">
              Marketplace vendors
            </span>
          </div>

        </div>

      </section>

      {/* =====================================================
          OFFICIAL RELEASES
      ===================================================== */}

      <section
        className="home-section"
        id="bulletin-section"
      >

        <div className="section-heading-row">

          <div>
            <span className="section-kicker">
              Official releases
            </span>

            <h2 className="section-title">
              What the campus
              <br className="desktop-break" />
              needs to know.
            </h2>
          </div>

          <span className="section-index">
            01 / BULLETINS
          </span>

        </div>

        {announcements.length === 0 ? (
          <div className="empty-editorial">
            <Megaphone size={22} />
            <div>
              <strong>
                No publications today.
              </strong>

              <span>
                Check back later for official
                campus releases.
              </span>
            </div>
          </div>
        ) : (
          <div className="bulletin-list">

            {announcements.map(
              (ann, index) => (
                <article
                  key={ann.id}
                  className="bulletin-card"
                >

                  <div className="bulletin-number">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </div>

                  <div className="bulletin-main">

                    <div className="bulletin-meta">
                      <span>
                        {ann.category ||
                          "Announcement"}
                      </span>

                      <i />

                      <span>
                        {new Date(
                          ann.createdAt?.seconds
                            ? ann.createdAt.seconds *
                              1000
                            : ann.createdAt
                        ).toLocaleDateString(
                          undefined,
                          {
                            month:
                              "short",
                            day: "numeric",
                            year: "numeric"
                          }
                        )}
                      </span>
                    </div>

                    <h3>
                      {ann.title}
                    </h3>

                    <p
                      className={
                        expandedAnns[
                          ann.id
                        ]
                          ? ""
                          : "bulletin-truncated"
                      }
                    >
                      {ann.content}
                    </p>

                    <div className="bulletin-actions">

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAnns(
                            (prev) => ({
                              ...prev,
                              [ann.id]:
                                !prev[
                                  ann.id
                                ]
                            })
                          )
                        }
                        className="text-action"
                      >
                        {expandedAnns[
                          ann.id
                        ]
                          ? "Show less"
                          : "Read publication"}
                        <ArrowRight
                          size={14}
                        />
                      </button>

                      {ann.fileUrl && (
                        <a
                          href={
                            ann.fileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-action muted-action"
                        >
                          PDF
                          <ArrowRight
                            size={14}
                          />
                        </a>
                      )}

                    </div>

                  </div>

                  {ann.coverImage && (
                    <div className="bulletin-image">
                      <img
                        src={
                          optimizeUrl(
                            ann.coverImage,
                            300,
                            50
                          )
                        }
                        sizes="(max-width: 768px) 45vw, 250px"
                        alt="Bulletin artwork"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        data-loaded="false"
                        onLoad={(e) => {
                          const target =
                            e.target as HTMLImageElement;
                          target.setAttribute(
                            "data-loaded",
                            "true"
                          );
                        }}
                      />
                    </div>
                  )}

                </article>
              )
            )}

          </div>
        )}

      </section>

      {/* =====================================================
          HAPPENING TODAY
      ===================================================== */}

      <section
        className="home-section"
        id="today"
      >

        <div className="section-heading-row">

          <div>
            <span className="section-kicker">
              Happening around campus
            </span>

            <h2 className="section-title">
              What's around
              <br className="desktop-break" />
              campus.
            </h2>
          </div>

          <Link
            href="/events"
            className="section-link"
          >
            Explore campus
            <ArrowRight size={14} />
          </Link>

        </div>

        <div className="today-layout">

          <article
            className="today-feature"
            style={
              todayImage
                ? {
                    backgroundImage: `url("${todayImage}")`
                  }
                : undefined
            }
          >

            <div className="today-feature-overlay" />

            <div className="today-feature-content">

              <span className="today-tag">
                Did you know?
              </span>

              <h3>
                Your campus has
                more stories than
                your timetable shows.
              </h3>

              <p>
                From student businesses and
                society meetings to unexpected
                moments around campus,
                StudentHub keeps the smaller
                pieces of university life visible.
              </p>

              <Link
                href="/gallery"
                className="light-action"
              >
                Discover campus
                <ArrowRight size={15} />
              </Link>

            </div>

          </article>

          <aside className="today-aside">

            <div className="date-block">

              <span className="date-number">
                {dayNumber}
              </span>

              <span className="date-name">
                {dayName}
              </span>

            </div>

            <div className="today-details">

              <div className="weather-line">
                <span className="weather-temp">
                  24°
                </span>

                <span className="weather-symbol">
                  ☁
                </span>
              </div>

              <p>
                A calm campus afternoon.
                Perfect weather for moving
                between lectures, meetings
                and everything in between.
              </p>

              <div className="today-detail-list">

                <div>
                  <span>
                    Campus
                  </span>

                  <strong>
                    MKU
                  </strong>
                </div>

                <div>
                  <span>
                    Next
                  </span>

                  <strong>
                    {nextEventTitle}
                  </strong>
                </div>

                <div>
                  <span>
                    Gallery
                  </span>

                  <strong>
                    {galleryCount}
                    {" "}
                    moments
                  </strong>
                </div>

              </div>

            </div>

          </aside>

        </div>

      </section>

      {/* =====================================================
          MARKETPLACE
      ===================================================== */}

      {flashDeals.length > 0 && (
        <section
          className="home-section"
          id="marketplace"
        >

          <div className="section-heading-row">

            <div>
              <span className="section-kicker">
                Student marketplace
              </span>

              <h2 className="section-title">
                Made around
                <br className="desktop-break" />
                campus.
              </h2>
            </div>

            <Link
              href="/marketplace"
              className="section-link"
            >
              Visit marketplace
              <ArrowRight size={14} />
            </Link>

          </div>

          <div className="marketplace-feature">

            <AnimatePresence mode="wait">

              {(() => {
                const currentDeal =
                  flashDeals[
                    activeDealIdx
                  ] ||
                  flashDeals[0];

                if (!currentDeal) {
                  return null;
                }

                const promo =
                  currentDeal.promo;

                const biz =
                  currentDeal.biz;

                const grad =
                  PROMO_GRADIENTS[
                    promo.gradientIndex !==
                    undefined
                      ? promo.gradientIndex
                      : 0
                  ] ||
                  PROMO_GRADIENTS[0];

                const featuredImg =
                  promo.imageUrl ||
                  biz.images?.[
                    promo.promoImageSlot ||
                      0
                  ] ||
                  biz.images?.[0] ||
                  "";

                return (
                  <motion.div
                    key={
                      activeDealIdx
                    }
                    className="market-slide"
                    initial={{
                      opacity: 0,
                      x: 35
                    }}
                    animate={{
                      opacity: 1,
                      x: 0
                    }}
                    exit={{
                      opacity: 0,
                      x: -35
                    }}
                    transition={{
                      duration: 0.45,
                      ease: [
                        0.16,
                        1,
                        0.3,
                        1
                      ]
                    }}
                  >

                    <div
                      className={`market-background bg-gradient-to-br ${grad.classes}`}
                    >

                      {!promo.noImage &&
                        featuredImg && (
                          <img
                            src={
                              optimizeUrl(
                                featuredImg,
                                640,
                                60
                              )
                            }
                            sizes="(max-width: 768px) 90vw, 640px"
                            alt={
                              promo.title
                            }
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="market-image"
                            data-loaded="false"
                            onLoad={(e) => {
                              const target =
                                e.target as HTMLImageElement;
                              target.setAttribute(
                                "data-loaded",
                                "true"
                              );
                            }}
                          />
                        )}

                      <div className="market-image-fade" />

                    </div>

                    <div className="market-content">

                      <div className="market-topline">

                        <span>
                          {promo.promoTag ||
                            "#PROMO"}
                        </span>

                        <i />

                        <span>
                          {biz.businessName}
                        </span>

                      </div>

                      <h3>
                        {promo.promoMessage ||
                          "SPECIAL DEAL"}
                      </h3>

                      <p className="market-title">
                        {promo.title}
                      </p>

                      <p className="market-description">
                        {promo.supportiveMessage ||
                          promo.description}
                      </p>

                      <div className="market-actions">

                        <Link
                          href="/marketplace"
                          className="market-button"
                        >
                          Visit marketplace
                          <ArrowRight
                            size={14}
                          />
                        </Link>

                        <span className="merchant">
                          {biz.ownerName
                            ? `Merchant · ${biz.ownerName}`
                            : "Student merchant"}
                        </span>

                      </div>

                    </div>

                  </motion.div>
                );
              })()}

            </AnimatePresence>

            {flashDeals.length > 1 && (
              <div className="market-controls">

                <button
                  type="button"
                  onClick={() =>
                    setActiveDealIdx(
                      (prev) =>
                        (prev -
                          1 +
                          flashDeals.length) %
                        flashDeals.length
                    )
                  }
                  aria-label="Previous promotion"
                >
                  <ChevronLeft
                    size={15}
                  />
                </button>

                <div className="market-dots">

                  {flashDeals.map(
                    (_, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() =>
                          setActiveDealIdx(
                            idx
                          )
                        }
                        aria-label={`Promotion ${idx + 1}`}
                        className={
                          idx ===
                          activeDealIdx
                            ? "active"
                            : ""
                        }
                      />
                    )
                  )}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveDealIdx(
                      (prev) =>
                        (prev + 1) %
                        flashDeals.length
                    )
                  }
                  aria-label="Next promotion"
                >
                  <ChevronRight
                    size={15}
                  />
                </button>

              </div>
            )}

          </div>

        </section>
      )}

      {/* =====================================================
          EVENTS
      ===================================================== */}

      <section
        className="home-section"
        id="events"
      >

        <div className="section-heading-row">

          <div>
            <span className="section-kicker">
              Events
            </span>

            <h2 className="section-title">
              Show up for
              <br className="desktop-break" />
              what's next.
            </h2>
          </div>

          <Link
            href="/events"
            className="section-link"
          >
            View all events
            <ArrowRight size={14} />
          </Link>

        </div>

        <div className="event-layout">

          <div className="event-intro">

            <p>
              From moot courts to networking
              summits, society meetings and
              student activities — keep the
              important dates visible.
            </p>

            <div className="event-rule" />

            <div className="event-mini-meta">

              <span>
                Upcoming
              </span>

              <strong>
                {upcomingEvents.length}
              </strong>

            </div>

          </div>

          {upcomingEvents.length > 0 ? (
            <div className="event-card">

              <div className="event-card-head">

                <div>
                  <span className="event-label">
                    NEXT EVENT
                  </span>

                  <h3>
                    {
                      upcomingEvents[0]
                        ?.title
                    }
                  </h3>
                </div>

                <Calendar
                  size={22}
                />

              </div>

              <div className="countdown">

                <div>
                  <strong>
                    {countdown.days}
                  </strong>

                  <span>
                    Days
                  </span>
                </div>

                <div>
                  <strong>
                    {countdown.hours}
                  </strong>

                  <span>
                    Hrs
                  </span>
                </div>

                <div>
                  <strong>
                    {countdown.minutes}
                  </strong>

                  <span>
                    Min
                  </span>
                </div>

                <div className="countdown-accent">
                  <strong>
                    {countdown.seconds}
                  </strong>

                  <span>
                    Sec
                  </span>
                </div>

              </div>

              <div className="event-card-footer">

                <div>
                  <span>
                    Capacity remaining
                  </span>

                  <strong>
                    {
                      upcomingEvents[0]
                        ?.capacity
                        ? Math.max(
                            0,
                            upcomingEvents[0]
                              .capacity -
                              (upcomingEvents[0]
                                .registeredCount ||
                                0)
                          )
                        : "42"
                    }
                  </strong>
                </div>

                <Link
                  href="/events"
                  className="dark-action"
                >
                  RSVP
                  <ArrowRight
                    size={14}
                  />
                </Link>

              </div>

            </div>
          ) : (
            <div className="event-card event-empty">

              <Calendar
                size={25}
              />

              <h3>
                No upcoming events.
              </h3>

              <p>
                New campus activities will
                appear here when published.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          DISCOVER
      ===================================================== */}

      <section className="home-section">

        <div className="section-heading-row">

          <div>
            <span className="section-kicker">
              Explore
            </span>

            <h2 className="section-title">
              The campus
              <br className="desktop-break" />
              layer.
            </h2>
          </div>

          <span className="section-index">
            04 / DISCOVER
          </span>

        </div>

        <div className="discover-grid">

          <Link
            href="/events"
            className="discover-card"
          >
            <span>
              01 / EVENTS
            </span>

            <Calendar size={21} />

            <h3>
              What's happening
            </h3>

            <p>
              Find events, meetings,
              activities and moments
              worth showing up for.
            </p>

            <ArrowRight
              className="discover-arrow"
              size={17}
            />
          </Link>

          <Link
            href="/marketplace"
            className="discover-card"
          >
            <span>
              02 / PEOPLE
            </span>

            <Users size={21} />

            <h3>
              People & communities
            </h3>

            <p>
              Discover students,
              societies, creators,
              businesses and communities
              around campus.
            </p>

            <ArrowRight
              className="discover-arrow"
              size={17}
            />
          </Link>

          <Link
            href="/gallery"
            className="discover-card"
          >
            <span>
              03 / MEMORIES
            </span>

            <ImageIcon size={21} />

            <h3>
              Campus memories
            </h3>

            <p>
              Revisit photographs,
              stories and moments that
              make MKU feel like more than
              a timetable.
            </p>

            <ArrowRight
              className="discover-arrow"
              size={17}
            />
          </Link>

        </div>

      </section>

      {/* =====================================================
          GALLERY
      ===================================================== */}

      <section
        className="home-section"
        id="gallery"
      >

        <div className="section-heading-row">

          <div>
            <span className="section-kicker">
              Campus gallery
            </span>

            <h2 className="section-title">
              Moments in
              <br className="desktop-break" />
              focus.
            </h2>
          </div>

          <Link
            href="/gallery"
            className="section-link"
          >
            View gallery
            <ArrowRight size={14} />
          </Link>

        </div>

        <div className="gallery-editorial">

          {galleryImages.length > 0 ? (
            galleryImages
              .slice(0, 7)
              .map((snap, index) => (
                <Link
                  key={snap.id}
                  href="/gallery"
                  className={`gallery-photo gallery-photo-${index + 1}`}
                >
                  <img
                    src={
                      optimizeUrl(
                        snap.imageUrl,
                        520,
                        55
                      )
                    }
                    srcSet={`${optimizeUrl(
                      snap.imageUrl,
                      520,
                      55
                    )} 520w, ${optimizeUrl(
                      snap.imageUrl,
                      760,
                      55
                    )} 760w`}
                    sizes="(max-width: 768px) 45vw, 320px"
                    alt={
                      snap.caption ||
                      "MKU campus moment"
                    }
                    loading={index < 2 ? "eager" : "lazy"}
                    fetchpriority={index < 2 ? "high" : "auto"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    data-loaded="false"
                    onLoad={(e) => {
                      const target =
                        e.target as HTMLImageElement;
                      target.setAttribute(
                        "data-loaded",
                        "true"
                      );
                    }}
                  />

                  <div className="gallery-photo-overlay" />

                  <div className="gallery-caption">
                    <span>
                      {snap.category ||
                        "GALLERY"}
                    </span>

                    <strong>
                      {snap.caption ||
                        "Campus moment"}
                    </strong>
                  </div>
                </Link>
              ))
          ) : (
            <div className="gallery-empty">
              <ImageIcon
                size={24}
              />

              <span>
                No snapshots published yet.
              </span>
            </div>
          )}

        </div>

      </section>

      {/* =====================================================
          VAULT
      ===================================================== */}

      <section
        className="home-section"
        id="vault"
      >

        <Link
          href="/vault"
          className="vault-feature"
        >

          <div className="vault-copy">

            <div className="vault-meta">
              <span>
                Pigeonhole
              </span>

              <span>
                Anonymous
              </span>
            </div>

            <h2>
              Got a secret?
              <span>
                Drop it here.
              </span>
            </h2>

            <p>
              Fully anonymous. Share
              complaints, ideas, suggestions
              or things you think the
              administration and student
              community should know.
            </p>

            <span className="vault-action">
              Enter the Vault
              <ArrowRight
                size={15}
              />
            </span>

          </div>

          <div className="vault-symbol">

            <div>
              <Lock
                size={34}
              />
            </div>

          </div>

        </Link>

      </section>

      {/* =====================================================
          NEWSLETTER
      ===================================================== */}

      <section className="home-section">

        <div className="newsletter-feature">

          <div className="newsletter-copy">

            <span className="section-kicker">
              StudentHub updates
            </span>

            <h2>
              Keep up with
              campus.
            </h2>

            <p>
              Get useful campus updates,
              events, opportunities and
              marketplace discoveries without
              having to chase them down.
            </p>

          </div>

          <div className="newsletter-form-wrap">

            <form
              onSubmit={async (e) => {
                e.preventDefault();

                const form =
                  e.target as HTMLFormElement;

                const emailInput =
                  form.elements.namedItem(
                    "subscriberEmail"
                  ) as HTMLInputElement;

                const email =
                  emailInput?.value?.trim();

                if (!email) {
                  return;
                }

                try {
                  const allUsers =
                    await fbfs.getCollection<any>(
                      "users"
                    );

                  const existing =
                    allUsers.find(
                      (u) =>
                        u.email?.toLowerCase() ===
                        email.toLowerCase()
                    );

                  if (existing) {
                    await fbfs.updateDocById(
                      "users",
                      existing.id,
                      {
                        newsletterSubscribed:
                          true
                      }
                    );
                  } else {
                    await fbfs.addDocInCollection(
                      "users",
                      {
                        email,
                        name: email.split(
                          "@"
                        )[0],
                        role: "student",
                        active: true,
                        createdAt:
                          Date.now(),
                        newsletterSubscribed:
                          true
                      }
                    );
                  }

                  try {
                    await fetch(
                      "/api/send-newsletter",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type":
                            "application/json"
                        },
                        body: JSON.stringify({
                          subject:
                            "Welcome to MKU Law Student Hub!",
                          postTitle:
                            "Subscription Activated Successfully",
                          audience: "all",
                          emails: [email],
                          blocks: [
                            {
                              id: "s1",
                              type: "h1",
                              content:
                                "Subscription Confirmed"
                            },
                            {
                              id: "s2",
                              type: "text",
                              content:
                                "You have successfully enlisted with the Mount Kenya University School of Law central broadcasting hub. You will receive urgent updates, court notifications, peer briefings, and other essential directives live."
                            }
                          ]
                        })
                      }
                    );
                  } catch (_) {}

                  triggerToast(
                    "Subscription completed successfully! Enlisted among newsletter members."
                  );

                  form.reset();
                } catch (err) {
                  console.error(err);

                  triggerToast(
                    "Subscription created! Thank you for subscribing."
                  );

                  form.reset();
                }
              }}
              className="newsletter-form"
            >

              <input
                name="subscriberEmail"
                type="email"
                required
                placeholder="Your email address"
                aria-label="Your email address"
              />

              <button type="submit">
                Join network
                <ArrowRight
                  size={14}
                />
              </button>

            </form>

          </div>

        </div>

      </section>

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div className="home-toast">

          <span
            className={
              toast.type ===
              "success"
                ? "success"
                : "error"
            }
          />

          <p>
            {toast.message}
          </p>

        </div>
      )}

      {/* =====================================================
          BULLETIN MODAL
      ===================================================== */}

      {selectedBulletin && (
        <div
          className="bulletin-modal-backdrop"
          onClick={() =>
            setSelectedBulletin(null)
          }
        >

          <div
            className="bulletin-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="bulletin-modal-actions">

              <button
                type="button"
                onClick={() =>
                  setShareData({
                    isOpen: true,
                    url: `https://studenthubmku.xyz/?bulletinId=${selectedBulletin.id}`,
                    title:
                      selectedBulletin.title,
                    category:
                      "Bulletin"
                  })
                }
                aria-label="Share bulletin"
              >
                <Share2 size={17} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedBulletin(
                    null
                  )
                }
                aria-label="Close bulletin"
              >
                <X size={17} />
              </button>

            </div>

            <div className="bulletin-modal-content">

              <div className="bulletin-meta">
                <span>
                  {selectedBulletin.category ||
                    "Official Announcement"}
                </span>

                <i />

                <span>
                  {new Date(
                    selectedBulletin.createdAt?.seconds
                      ? selectedBulletin.createdAt
                          .seconds *
                        1000
                      : selectedBulletin.createdAt
                  ).toLocaleDateString(
                    undefined,
                    {
                      month:
                        "short",
                      day: "numeric",
                      year: "numeric"
                    }
                  )}
                </span>
              </div>

              <h2>
                {
                  selectedBulletin.title
                }
              </h2>

              {selectedBulletin.coverImage && (
                <div className="bulletin-modal-image">
                  <img
                    src={
                      selectedBulletin.coverImage
                    }
                    alt="Bulletin cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <p>
                {
                  selectedBulletin.content
                }
              </p>

              {selectedBulletin.fileUrl && (
                <a
                  href={
                    selectedBulletin.fileUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="modal-download"
                >
                  Download official PDF
                  <ArrowRight
                    size={14}
                  />
                </a>
              )}

            </div>

          </div>

        </div>
      )}

      {shareData.isOpen && (
        <ShareDialog
          isOpen={
            shareData.isOpen
          }
          onClose={() =>
            setShareData(
              (prev) => ({
                ...prev,
                isOpen: false
              })
            )
          }
          url={
            shareData.url
          }
          title={
            shareData.title
          }
          category={
            shareData.category
          }
        />
      )}

    </main>
  );
}
