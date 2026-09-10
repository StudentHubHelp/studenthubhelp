import { createClient } from '@supabase/supabase-js';
import {
  PropertyItem,
  UserProfile,
  ListingRequest,
  ClaimRequest,
  VerificationRequest,
  StudentBooking,
  ReviewItem,
  PropertyReport,
  AdminNotification,
  AdminActivityLog,
  AreaItem,
  SystemSetting,
  OwnerPropertyImage,
  PropertyType
} from '../types';

export const SUPABASE_URL =
  "https://idurlccrarznnnqixxsd.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ucWl4eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA";

export const ADMIN_EMAIL =
  "satpalswami22742@gmail.com";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export const propertyConfig: Record<
  PropertyType,
  {
    title: string;
    singular: string;
    category: string;
    icon: string;
  }
> = {
  hostels: {
    title: "Hostels & PGs",
    singular: "Hostel / PG",
    category: "Hostel",
    icon: "Hotel",
  },
  tiffins: {
    title: "Tiffin & Mess Services",
    singular: "Tiffin / Mess",
    category: "Tiffin",
    icon: "Utensils",
  },
  libraries: {
    title: "24/7 Study Libraries",
    singular: "Library",
    category: "Library",
    icon: "BookOpen",
  },
  cafes: {
    title: "Student Cafes",
    singular: "Cafe",
    category: "Cafe",
    icon: "Coffee",
  },
  bookstores: {
    title: "Bookstores & Stationery",
    singular: "Bookstore",
    category: "Bookstore",
    icon: "Store",
  },
};

export const MASTER_TYPES: PropertyType[] = [
  "hostels",
  "tiffins",
  "libraries",
  "cafes",
  "bookstores",
];

/* =========================================================
   COMMON HELPERS
========================================================= */

export function normalizePhone(
  v: string | number | undefined | null
): string {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

export function firstVal<T = any>(
  o: any,
  keys: string[],
  fallback: T = "" as any
): T {
  if (!o) return fallback;

  for (const k of keys) {
    if (
      Object.prototype.hasOwnProperty.call(o, k) &&
      o[k] !== null &&
      o[k] !== undefined &&
      String(o[k]) !== ""
    ) {
      return o[k];
    }
  }

  return fallback;
}

export function propOwnerId(x: PropertyItem): string {
  return String(
    firstVal(
      x,
      ["owner_id", "ownerId", "user_id"],
      ""
    )
  );
}

export function propStatus(x: PropertyItem): string {
  return String(
    firstVal(
      x,
      ["status", "listing_status", "state"],
      "active"
    ) || "active"
  ).toLowerCase();
}

export function propVerified(x: PropertyItem): boolean {
  if (!x) return false;

  const values: any[] = [
    (x as any).verified,
    (x as any).is_verified,
    (x as any).verification_status,
    (x as any).is_approved,
  ];

  return values.some((v) => {
    if (v === true || v === 1) return true;

    const s = String(v ?? "")
      .trim()
      .toLowerCase();

    return [
      "true",
      "1",
      "verified",
      "approved",
      "accepted",
    ].includes(s);
  });
}

export function propFeatured(x: PropertyItem): boolean {
  const v: any = firstVal(
    x,
    ["featured", "is_featured"],
    false
  );

  if (v === true || v === 1) return true;

  const s = String(v ?? "")
    .trim()
    .toLowerCase();

  return s === "true" || s === "1";
}

export function propViews(x: PropertyItem): number {
  const v = Number(
    firstVal(
      x,
      ["views", "view_count", "total_views", "visits"],
      0
    )
  );

  return Number.isFinite(v) ? v : 0;
}

export function propBookings(x: PropertyItem): number {
  const v = Number(
    firstVal(
      x,
      ["bookings", "booking_count", "total_bookings"],
      0
    )
  );

  return Number.isFinite(v) ? v : 0;
}

export function propReviews(x: PropertyItem): number {
  const v = Number(
    firstVal(
      x,
      ["review_count", "reviews_count"],
      0
    )
  );

  return Number.isFinite(v) ? v : 0;
}

export function propRating(x: PropertyItem): number {
  const v = Number(
    firstVal(
      x,
      ["rating", "average_rating", "avg_rating"],
      0
    )
  );

  return Number.isFinite(v) ? v : 0;
}

export function dateCreated(
  x: any
): string | null {
  return firstVal(
    x,
    ["created_at", "createdAt", "submitted_at", "date"],
    null
  );
}

export function fmtDate(
  v: string | null | undefined
): string {
  if (!v) return "—";

  const d = new Date(v);

  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function shortDate(
  v: string | null | undefined
): string {
  if (!v) return "—";

  const d = new Date(v);

  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function exportToCSV(
  data: any[],
  filename: string
) {
  if (!data || !data.length) return;

  const allKeys = Array.from(
    new Set(
      data.flatMap((item) =>
        Object.keys(item)
      )
    )
  );

  const csvHeaders = allKeys
    .map(
      (k) =>
        `"${String(k).replace(/"/g, '""')}"`
    )
    .join(",");

  const csvRows = data.map((item) => {
    return allKeys
      .map((k) => {
        const val = item[k];

        const str =
          typeof val === "object"
            ? JSON.stringify(val)
            : String(val ?? "");

        return `"${str.replace(
          /"/g,
          '""'
        )}"`;
      })
      .join(",");
  });

  const csvContent = [
    csvHeaders,
    ...csvRows,
  ].join("\r\n");

  const blob = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.setAttribute("href", url);

  link.setAttribute(
    "download",
    `studenthubhelp-${filename}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`
  );

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* =========================================================
   NO FAKE / NO SEED DATA
========================================================= */

export const initialSeedData = {
  students: [] as UserProfile[],
  owners: [] as UserProfile[],
  properties: [] as PropertyItem[],
  listingRequests: [] as ListingRequest[],
  claimRequests: [] as ClaimRequest[],
  verificationRequests: [] as VerificationRequest[],
  bookings: [] as StudentBooking[],
  reviews: [] as ReviewItem[],
  reports: [] as PropertyReport[],
  notifications: [] as AdminNotification[],
  areas: [] as AreaItem[],
  settings: [] as SystemSetting[],
  activity: [] as AdminActivityLog[],
  activityLogs: [] as AdminActivityLog[],
  mediaImages: [] as OwnerPropertyImage[],
};

/* =========================================================
   TABLE MAP
========================================================= */

const PROPERTY_TABLES = [
  "hostels",
  "tiffins",
  "libraries",
  "cafes",
  "bookstores",
] as const;

type PropertyTable =
  (typeof PROPERTY_TABLES)[number];

function getTableNameForCategory(
  category?: string
): PropertyTable {
  const c = String(
    category || "hostel"
  ).toLowerCase();

  if (
    c.includes("tiffin") ||
    c.includes("mess")
  ) {
    return "tiffins";
  }

  if (c.includes("library")) {
    return "libraries";
  }

  if (c.includes("cafe")) {
    return "cafes";
  }

  if (
    c.includes("book") ||
    c.includes("stationery")
  ) {
    return "bookstores";
  }

  return "hostels";
}

/* =========================================================
   PROPERTY NORMALIZATION
   IMPORTANT:
   Raw DB fields are preserved.
   We only add common category.
========================================================= */

function normalizeProperty(
  row: any,
  table: PropertyTable
): PropertyItem {
  const categoryMap: Record<
    PropertyTable,
    string
  > = {
    hostels: "Hostel",
    tiffins: "Tiffin",
    libraries: "Library",
    cafes: "Cafe",
    bookstores: "Bookstore",
  };

  return {
    ...row,

    category:
      row.category ||
      categoryMap[table],

    _source_table: table,

    _source_id: row.id,
  } as PropertyItem;
}

/* =========================================================
   REAL SUPABASE DATA LOADER
========================================================= */

export async function fetchAllDataFromSupabase() {
  const result = {
    properties: [] as PropertyItem[],
    students: [] as UserProfile[],
    owners: [] as UserProfile[],
    listingRequests: [] as ListingRequest[],
    claimRequests: [] as ClaimRequest[],
    verificationRequests:
      [] as VerificationRequest[],
    bookings: [] as StudentBooking[],
    reviews: [] as ReviewItem[],
    reports: [] as PropertyReport[],
    mediaImages:
      [] as OwnerPropertyImage[],
    areas: [] as AreaItem[],
    notifications:
      [] as AdminNotification[],
    activityLogs:
      [] as AdminActivityLog[],
    settings:
      [] as SystemSetting[],
  };

  if (!supabase) {
    throw new Error(
      "Supabase client is not configured."
    );
  }

  /*
   * IMPORTANT:
   * Every request is independent.
   * One failed table will NOT destroy
   * the other real data.
   */

  const [
    hostelsRes,
    tiffinsRes,
    librariesRes,
    cafesRes,
    bookstoresRes,
    profilesRes,
    listingRequestsRes,
    claimRequestsRes,
    verificationRequestsRes,
    bookingsRes,
    reviewsRes,
    reportsRes,
    areasRes,
    notificationsRes,
    settingsRes,
    activityLogsRes,
    ownerImagesRes,
    propertyImagesRes,
  ] = await Promise.all([
    supabase
      .from("hostels")
      .select("*")
      .limit(1000),

    supabase
      .from("tiffins")
      .select("*")
      .limit(1000),

    supabase
      .from("libraries")
      .select("*")
      .limit(1000),

    supabase
      .from("cafes")
      .select("*")
      .limit(1000),

    supabase
      .from("bookstores")
      .select("*")
      .limit(1000),

    supabase
      .from("profiles")
      .select("*")
      .limit(1000),

    supabase
      .from("listing_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("claim_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("student_bookings")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("reviews")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("property_reports")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("areas")
      .select("*")
      .order("name", {
        ascending: true,
      })
      .limit(1000),

    supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("system_settings")
      .select("*")
      .order("key", {
        ascending: true,
      })
      .limit(1000),

    supabase
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000),

    supabase
      .from("owner_property_images")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .limit(1000),

    supabase
      .from("property_images")
      .select("*")
      .order("sort_order", {
        ascending: true,
      })
      .limit(1000),
  ]);

  /* =======================================================
     ERROR REPORTING
  ======================================================= */

  const responses: Array<
    [string, any]
  > = [
    ["hostels", hostelsRes],
    ["tiffins", tiffinsRes],
    ["libraries", librariesRes],
    ["cafes", cafesRes],
    ["bookstores", bookstoresRes],
    ["profiles", profilesRes],
    [
      "listing_requests",
      listingRequestsRes,
    ],
    [
      "claim_requests",
      claimRequestsRes,
    ],
    [
      "verification_requests",
      verificationRequestsRes,
    ],
    [
      "student_bookings",
      bookingsRes,
    ],
    ["reviews", reviewsRes],
    [
      "property_reports",
      reportsRes,
    ],
    ["areas", areasRes],
    [
      "admin_notifications",
      notificationsRes,
    ],
    [
      "system_settings",
      settingsRes,
    ],
    [
      "admin_activity_logs",
      activityLogsRes,
    ],
    [
      "owner_property_images",
      ownerImagesRes,
    ],
    [
      "property_images",
      propertyImagesRes,
    ],
  ];

  for (const [table, response] of responses) {
    if (response?.error) {
      console.warn(
        `Supabase ${table} query failed:`,
        response.error.message
      );
    }
  }

  /* =======================================================
     REAL PROPERTIES
  ======================================================= */

  const hostels =
    Array.isArray(hostelsRes.data)
      ? hostelsRes.data
      : [];

  const tiffins =
    Array.isArray(tiffinsRes.data)
      ? tiffinsRes.data
      : [];

  const libraries =
    Array.isArray(librariesRes.data)
      ? librariesRes.data
      : [];

  const cafes =
    Array.isArray(cafesRes.data)
      ? cafesRes.data
      : [];

  const bookstores =
    Array.isArray(bookstoresRes.data)
      ? bookstoresRes.data
      : [];

  result.properties = [
    ...hostels.map((row) =>
      normalizeProperty(
        row,
        "hostels"
      )
    ),

    ...tiffins.map((row) =>
      normalizeProperty(
        row,
        "tiffins"
      )
    ),

    ...libraries.map((row) =>
      normalizeProperty(
        row,
        "libraries"
      )
    ),

    ...cafes.map((row) =>
      normalizeProperty(
        row,
        "cafes"
      )
    ),

    ...bookstores.map((row) =>
      normalizeProperty(
        row,
        "bookstores"
      )
    ),
  ];

  /* =======================================================
     REAL PROFILES
  ======================================================= */

  const profiles =
    Array.isArray(profilesRes.data)
      ? profilesRes.data
      : [];

  result.students =
    profiles.filter(
      (profile: any) =>
        String(profile.role || "")
          .toLowerCase() ===
        "student"
    ) as UserProfile[];

  result.owners =
    profiles.filter(
      (profile: any) =>
        String(profile.role || "")
          .toLowerCase() ===
        "owner"
    ) as UserProfile[];

  /* =======================================================
     REAL REQUESTS
  ======================================================= */

  result.listingRequests =
    Array.isArray(
      listingRequestsRes.data
    )
      ? (listingRequestsRes.data as ListingRequest[])
      : [];

  result.claimRequests =
    Array.isArray(
      claimRequestsRes.data
    )
      ? (claimRequestsRes.data as ClaimRequest[])
      : [];

  result.verificationRequests =
    Array.isArray(
      verificationRequestsRes.data
    )
      ? (verificationRequestsRes.data as VerificationRequest[])
      : [];

  result.bookings =
    Array.isArray(
      bookingsRes.data
    )
      ? (bookingsRes.data as StudentBooking[])
      : [];

  result.reviews =
    Array.isArray(
      reviewsRes.data
    )
      ? (reviewsRes.data as ReviewItem[])
      : [];

  result.reports =
    Array.isArray(
      reportsRes.data
    )
      ? (reportsRes.data as PropertyReport[])
      : [];

  result.areas =
    Array.isArray(
      areasRes.data
    )
      ? (areasRes.data as AreaItem[])
      : [];

  result.notifications =
    Array.isArray(
      notificationsRes.data
    )
      ? (notificationsRes.data as AdminNotification[])
      : [];

  result.settings =
    Array.isArray(
      settingsRes.data
    )
      ? (settingsRes.data as SystemSetting[])
      : [];

  result.activityLogs =
    Array.isArray(
      activityLogsRes.data
    )
      ? (activityLogsRes.data as AdminActivityLog[])
      : [];

  /* =======================================================
     REAL PROPERTY IMAGES
  ======================================================= */

  const ownerImages =
    Array.isArray(
      ownerImagesRes.data
    )
      ? ownerImagesRes.data
      : [];

  const propertyImages =
    Array.isArray(
      propertyImagesRes.data
    )
      ? propertyImagesRes.data
      : [];

  result.mediaImages = [
    ...ownerImages,
    ...propertyImages,
  ] as OwnerPropertyImage[];

  /* =======================================================
     FINAL DEBUG SUMMARY
  ======================================================= */

  console.log(
    "StudentHubHelp REAL SUPABASE DATA:",
    {
      properties:
        result.properties.length,

      hostels:
        hostels.length,

      tiffins:
        tiffins.length,

      libraries:
        libraries.length,

      cafes:
        cafes.length,

      bookstores:
        bookstores.length,

      students:
        result.students.length,

      owners:
        result.owners.length,

      listingRequests:
        result.listingRequests.length,

      claimRequests:
        result.claimRequests.length,

      verificationRequests:
        result.verificationRequests.length,

      bookings:
        result.bookings.length,

      reviews:
        result.reviews.length,

      reports:
        result.reports.length,

      areas:
        result.areas.length,

      notifications:
        result.notifications.length,

      settings:
        result.settings.length,

      activityLogs:
        result.activityLogs.length,

      mediaImages:
        result.mediaImages.length,
    }
  );

  return result;
}

/* =========================================================
   PROPERTY VERIFICATION
========================================================= */

export async function updatePropertyVerification(
  id: string | number,
  nextVerified: boolean,
  category?: string
) {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured."
    );
  }

  const table =
    getTableNameForCategory(category);

  const { error } =
    await supabase
      .from(table)
      .update({
        verified: nextVerified,
      })
      .eq("id", id);

  if (error) {
    console.error(
      "Supabase verification update failed:",
      error.message
    );

    throw new Error(error.message);
  }

  return true;
}

/* =========================================================
   USER STATUS
========================================================= */

export async function toggleUserDisabledState(
  userId: string | number,
  nextDisabled: boolean
) {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured."
    );
  }

  const nextStatus =
    nextDisabled
      ? "disabled"
      : "active";

  const { error } =
    await supabase
      .from("profiles")
      .update({
        status: nextStatus,
      })
      .eq("id", userId);

  if (error) {
    console.error(
      "Supabase profile status update failed:",
      error.message
    );

    throw new Error(error.message);
  }

  return true;
}

/* =========================================================
   SAVE / UPDATE PROPERTY
========================================================= */

export async function savePropertyToSupabase(
  property: PropertyItem
): Promise<PropertyItem> {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured."
    );
  }

  const table =
    getTableNameForCategory(
      (property as any).category
    );

  /*
   * Do NOT send UI-only helper fields
   * back to Supabase.
   */
  const {
    _source_table,
    _source_id,
    ...rawProperty
  } = property as any;

  const payload = {
    ...rawProperty,
    updated_at:
      new Date().toISOString(),
  };

  /*
   * Existing property:
   * UPDATE exact record.
   */
  if (property.id !== undefined &&
      property.id !== null &&
      property.id !== "") {

    const { data, error } =
      await supabase
        .from(table)
        .update(payload)
        .eq("id", property.id)
        .select()
        .single();

    if (error) {
      console.error(
        `Supabase ${table} update failed:`,
        error.message
      );

      throw new Error(error.message);
    }

    return normalizeProperty(
      data,
      table
    );
  }

  /*
   * New property:
   * INSERT without manually inventing
   * an ID. Database handles identity IDs
   * where applicable.
   */
  const { data, error } =
    await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(
      `Supabase ${table} insert failed:`,
      error.message
    );

    throw new Error(error.message);
  }

  return normalizeProperty(
    data,
    table
  );
}

/* =========================================================
   DELETE PROPERTY
========================================================= */

export async function deletePropertyFromSupabase(
  id: string | number,
  category?: string
) {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured."
    );
  }

  const table =
    getTableNameForCategory(category);

  const { error } =
    await supabase
      .from(table)
      .delete()
      .eq("id", id);

  if (error) {
    console.error(
      `Supabase ${table} delete failed:`,
      error.message
    );

    throw new Error(error.message);
  }

  return true;
}
