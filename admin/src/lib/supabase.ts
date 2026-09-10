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

export const SUPABASE_URL = "https://idurlccrarznnnqixxsd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdXJsY2NyYXJ6bm5ucWl4eHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODY3NTgsImV4cCI6MjEwMzU2Mjc1OH0.pq_rza98twL-SETqm_6TGNzsPCkVJxwjocFUeLB1yMA";
export const ADMIN_EMAIL = "satpalswami22742@gmail.com";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const propertyConfig: Record<PropertyType, { title: string; singular: string; category: string; icon: string }> = {
  hostels: { title: "Hostels & PGs", singular: "Hostel / PG", category: "Hostel", icon: "Hotel" },
  tiffins: { title: "Tiffin & Mess Services", singular: "Tiffin / Mess", category: "Tiffin", icon: "Utensils" },
  libraries: { title: "24/7 Study Libraries", singular: "Library", category: "Library", icon: "BookOpen" },
  cafes: { title: "Student Cafes", singular: "Cafe", category: "Cafe", icon: "Coffee" },
  bookstores: { title: "Bookstores & Stationery", singular: "Bookstore", category: "Bookstore", icon: "Store" }
};

export const MASTER_TYPES: PropertyType[] = ["hostels", "tiffins", "libraries", "cafes", "bookstores"];

export function normalizePhone(v: string | number | undefined | null): string {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : d;
}

export function firstVal<T = any>(o: any, keys: string[], fallback: T = "" as any): T {
  if (!o) return fallback;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(o, k) && o[k] !== null && o[k] !== undefined && String(o[k]) !== "") {
      return o[k];
    }
  }
  return fallback;
}

export function propOwnerId(x: PropertyItem): string {
  return firstVal(x, ["owner_id", "ownerId", "user_id"], "");
}

export function propStatus(x: PropertyItem): string {
  return String(firstVal(x, ["status", "listing_status", "state"], "active") || "active").toLowerCase();
}

export function propVerified(x: PropertyItem): boolean {
  if (!x) return false;
  const values: any[] = [x.verified, x.is_verified, x.verification_status];
  return values.some(v => {
    if (v === true || v === 1) return true;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "verified" || s === "approved" || s === "accepted";
  });
}

export function propFeatured(x: PropertyItem): boolean {
  const v: any = firstVal(x, ["featured", "is_featured"], false);
  if (v === true || v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1";
}

export function propViews(x: PropertyItem): number {
  const v = Number(firstVal(x, ["views", "view_count", "total_views", "visits"], 0));
  return Number.isFinite(v) ? v : 0;
}

export function propBookings(x: PropertyItem): number {
  const v = Number(firstVal(x, ["bookings", "booking_count", "total_bookings"], 0));
  return Number.isFinite(v) ? v : 0;
}

export function propReviews(x: PropertyItem): number {
  const v = Number(firstVal(x, ["review_count", "reviews_count"], 0));
  return Number.isFinite(v) ? v : 0;
}

export function propRating(x: PropertyItem): number {
  const v = Number(firstVal(x, ["rating", "average_rating", "avg_rating"], 0));
  return Number.isFinite(v) ? v : 0;
}

export function dateCreated(x: any): string | null {
  return firstVal(x, ["created_at", "createdAt", "submitted_at", "date"], null);
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function shortDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const allKeys = Array.from(new Set(data.flatMap(item => Object.keys(item))));
  const csvHeaders = allKeys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(",");
  const csvRows = data.map(item => {
    return allKeys.map(k => {
      const val = item[k];
      const str = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",");
  });
  const csvContent = [csvHeaders, ...csvRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `studenthubhelp-${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Comprehensive seed mock data in case table is empty or offline preview is used
export const initialSeedData = {
  students: [
    { id: "usr-st-101", full_name: "Aman Sharma", phone: "9829102938", email: "aman.sharma@gmail.com", role: "student", status: "active", address: "Sector 14, Pratap Nagar, Jaipur", created_at: "2026-08-15T10:20:00Z" },
    { id: "usr-st-102", full_name: "Pooja Choudhary", phone: "9414592019", email: "pooja.choudhary@gmail.com", role: "student", status: "active", address: "Gopalpura Bypass, Jaipur", created_at: "2026-08-18T14:40:00Z" },
    { id: "usr-st-103", full_name: "Vikram Rathore", phone: "9785210943", email: "vikram.rathore@outlook.com", role: "student", status: "active", address: "Mahaveer Nagar, Kota", created_at: "2026-08-22T09:15:00Z" },
    { id: "usr-st-104", full_name: "Neha Meena", phone: "9602341890", email: "neha.meena@gmail.com", role: "student", status: "active", address: "Talwandi, Kota", created_at: "2026-08-29T16:05:00Z" },
    { id: "usr-st-105", full_name: "Rahul Verma", phone: "9166782341", email: "rahul.verma@yahoo.com", role: "student", status: "disabled", address: "Kukas, Jaipur", created_at: "2026-09-01T11:25:00Z" },
    { id: "usr-st-106", full_name: "Anjali Soni", phone: "9828456712", email: "anjali.soni@gmail.com", role: "student", status: "active", address: "Indra Vihar, Kota", created_at: "2026-09-05T12:00:00Z" },
    { id: "usr-st-107", full_name: "Deepak Yadav", phone: "9982345129", email: "deepak.yadav@gmail.com", role: "student", status: "active", address: "Rajeev Gandhi Nagar, Kota", created_at: "2026-09-08T08:30:00Z" }
  ] as UserProfile[],

  owners: [
    { id: "usr-ow-201", full_name: "Rameshwar Prasad Sharma", phone: "9829012345", email: "rameshwar.hostels@gmail.com", role: "owner", status: "active", address: "Plot 42, Rajeev Gandhi Nagar, Kota", property: "Shree Krishna Deluxe Boys PG", created_at: "2026-07-10T11:00:00Z" },
    { id: "usr-ow-202", full_name: "Sunita Devi Agarwal", phone: "9414098765", email: "sunita.agarwal@gmail.com", role: "owner", status: "active", address: "12B, Coral Park, Kota", property: "Maa Annapurna Premium Tiffin", created_at: "2026-07-22T15:30:00Z" },
    { id: "usr-ow-203", full_name: "Mahesh Kumar Saini", phone: "9828112233", email: "saini.studyhub@gmail.com", role: "owner", status: "active", address: "Near Resonance, CP Tower Road, Kota", property: "Apex 24/7 Digital Library", created_at: "2026-08-01T09:00:00Z" },
    { id: "usr-ow-204", full_name: "Gaurav Shekhawat", phone: "9784561234", email: "gaurav.cafe@gmail.com", role: "owner", status: "active", address: "Talwandi Circle, Kota", property: "Chai & Code Student Cafe", created_at: "2026-08-12T17:20:00Z" },
    { id: "usr-ow-205", full_name: "Kailash Chand Jain", phone: "9929718264", email: "jain.bookdepot@gmail.com", role: "owner", status: "active", address: "Station Road, Kota", property: "Vidyarthi Book & Notes Depot", created_at: "2026-08-25T13:10:00Z" }
  ] as UserProfile[],

  hostels: [
    {
      id: "hst-001",
      name: "Shree Krishna Deluxe Boys PG",
      category: "Hostel",
      room_types: "Single / Double Sharing",
      gender: "Boys",
      owner_id: "usr-ow-201",
      owner_name: "Rameshwar Prasad Sharma",
      phone: "9829012345",
      whatsapp: "9829012345",
      email: "rameshwar.hostels@gmail.com",
      area: "Rajeev Gandhi Nagar",
      city: "Kota",
      pincode: "324005",
      address: "Plot 42, Near Allen Samyak, Rajeev Gandhi Nagar, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.8,
      price: "₹8,500/mo",
      monthly_rent: "8500",
      security_deposit: "₹5,000",
      timing: "In-time: 10:00 PM",
      total_beds: 45,
      available_beds: 6,
      food_available: "Yes (3 Meals + Milk)",
      facilities: "High Speed WiFi, RO Mineral Water, Air Cooled / AC, Biometric Security, Daily Housekeeping, Laundry",
      description: "Premier student hostel located 100 meters from Allen coaching institute. Peaceful study environment with hygienic food.",
      views: 1240,
      bookings: 38,
      review_count: 24,
      created_at: "2026-07-15T10:00:00Z",
      updated_at: "2026-09-08T18:00:00Z"
    },
    {
      id: "hst-002",
      name: "Radhika Girls Premium Residency",
      category: "Hostel",
      room_types: "Single AC / Non-AC",
      gender: "Girls",
      owner_id: "usr-ow-201",
      owner_name: "Rameshwar Prasad Sharma",
      phone: "9829012345",
      whatsapp: "9829012345",
      area: "Talwandi",
      city: "Kota",
      pincode: "324005",
      address: "B-Block, Talwandi, Near Commerce College Road, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.9,
      price: "₹9,200/mo",
      monthly_rent: "9200",
      timing: "In-time: 9:30 PM",
      total_beds: 50,
      available_beds: 4,
      food_available: "Pure Veg 4 Meals",
      facilities: "CCTV 24x7, Lady Warden, Fingerprint Entry, Power Backup 24 Hours, Medical Room",
      description: "Safe and secure residential hostel exclusively for female medical and engineering aspirants.",
      views: 1890,
      bookings: 46,
      review_count: 31,
      created_at: "2026-07-20T12:00:00Z",
      updated_at: "2026-09-07T14:30:00Z"
    },
    {
      id: "hst-003",
      name: "Gurukripa Student PG",
      category: "Hostel",
      room_types: "Double / Triple Sharing",
      gender: "Boys",
      owner_name: "Mohan Lal",
      phone: "9414234567",
      area: "Indra Vihar",
      city: "Kota",
      pincode: "324005",
      address: "14 Indra Vihar, Opposite City Mall, Kota",
      status: "pending",
      verified: false,
      featured: false,
      rating: 3.9,
      price: "₹5,500/mo",
      monthly_rent: "5500",
      timing: "In-time: 10:30 PM",
      total_beds: 30,
      available_beds: 12,
      facilities: "Attached Washroom, Cooler, High Speed Internet, Study Table & Chair",
      views: 450,
      bookings: 14,
      review_count: 8,
      created_at: "2026-09-04T09:00:00Z",
      updated_at: "2026-09-04T09:00:00Z"
    }
  ] as PropertyItem[],

  tiffins: [
    {
      id: "tfn-001",
      name: "Maa Annapurna Premium Tiffin",
      category: "Tiffin",
      owner_id: "usr-ow-202",
      owner_name: "Sunita Devi Agarwal",
      phone: "9414098765",
      whatsapp: "9414098765",
      area: "Coral Park",
      city: "Kota",
      address: "12B, Coral Park, Near Kunhari, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.7,
      price: "₹3,200/mo",
      timing: "Lunch: 11:30-2:30, Dinner: 7:30-10:00",
      meal_type: "Pure Veg Homely Food",
      plan_type: "Monthly / Half Monthly",
      delivery_available: "Free Doorstep Delivery in 3km",
      facilities: "4 Rotis (Desi Ghee), Dal, Seasonal Veg, Paneer twice a week, Rice, Salad, Sweet on Sunday",
      views: 920,
      bookings: 75,
      review_count: 42,
      created_at: "2026-07-25T11:00:00Z"
    },
    {
      id: "tfn-002",
      name: "Shyam Rasoi Healthy Meals",
      category: "Tiffin",
      owner_name: "Kishore Sen",
      phone: "9829334455",
      area: "Rajeev Gandhi Nagar",
      city: "Kota",
      address: "Street 5, Rajeev Gandhi Nagar, Kota",
      status: "active",
      verified: true,
      featured: false,
      rating: 4.4,
      price: "₹2,900/mo",
      timing: "12:00 PM - 10:00 PM",
      meal_type: "Veg Thali",
      facilities: "Low Oil, Less Spice, Special Khichdi on request, Hygienic Stainless Steel Tiffins",
      views: 640,
      bookings: 42,
      review_count: 19,
      created_at: "2026-08-05T14:20:00Z"
    },
    {
      id: "tfn-003",
      name: "Kalyan Mess & Bhojnalaya",
      category: "Tiffin",
      owner_name: "Babulal Sharma",
      phone: "9887766554",
      area: "Landmark City",
      city: "Kota",
      address: "Near Allen Supath, Landmark City, Kota",
      status: "pending",
      verified: false,
      rating: 4.1,
      price: "₹2,700/mo",
      timing: "11:00 AM - 9:30 PM",
      views: 210,
      bookings: 18,
      review_count: 5,
      created_at: "2026-09-02T16:00:00Z"
    }
  ] as PropertyItem[],

  libraries: [
    {
      id: "lib-001",
      name: "Apex 24/7 Digital Air-Conditioned Library",
      category: "Library",
      owner_id: "usr-ow-203",
      owner_name: "Mahesh Kumar Saini",
      phone: "9828112233",
      whatsapp: "9828112233",
      area: "CP Tower Road",
      city: "Kota",
      address: "2nd Floor, Opposite Resonance Head Office, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.9,
      price: "₹1,200/mo",
      timing: "24 Hours Open (3 Shifts Available)",
      seating_capacity: 120,
      facilities: "Ergonomic Chairs, Personal Charging Socket, Soundproof Cabins, High-Speed Optical Fiber WiFi, RO Chilled Water, Discussion Zone",
      views: 1560,
      bookings: 95,
      review_count: 58,
      created_at: "2026-08-01T08:00:00Z"
    },
    {
      id: "lib-002",
      name: "Chanakya Self Study Zone",
      category: "Library",
      owner_name: "Dinesh Agarwal",
      phone: "9414889900",
      area: "Talwandi",
      city: "Kota",
      address: "Behind Sheela Choudhary Hospital, Talwandi, Kota",
      status: "active",
      verified: true,
      featured: false,
      rating: 4.6,
      price: "₹900/mo",
      timing: "6:00 AM - Midnight 12:00 AM",
      seating_capacity: 80,
      facilities: "Silent Environment, AC, Individual Desks with LED Lights, Newspaper Stand",
      views: 780,
      bookings: 54,
      review_count: 22,
      created_at: "2026-08-10T11:00:00Z"
    }
  ] as PropertyItem[],

  cafes: [
    {
      id: "caf-001",
      name: "Chai & Code Student Cafe",
      category: "Cafe",
      owner_id: "usr-ow-204",
      owner_name: "Gaurav Shekhawat",
      phone: "9784561234",
      whatsapp: "9784561234",
      area: "Talwandi Circle",
      city: "Kota",
      address: "Shop 1-2, Near City Mall, Talwandi, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.7,
      price: "₹150 for two",
      timing: "8:00 AM - 11:30 PM",
      facilities: "Kulhad Chai, Cold Coffee, Sandwiches, Fast WiFi, Power Sockets at every table, Book Exchange Corner",
      views: 2100,
      bookings: 110,
      review_count: 65,
      created_at: "2026-08-12T16:00:00Z"
    },
    {
      id: "caf-002",
      name: "The Study Brew Espresso",
      category: "Cafe",
      owner_name: "Amit Pareek",
      phone: "9829778899",
      area: "Rajeev Gandhi Nagar",
      city: "Kota",
      address: "Plot 88, Near Allen Sangyan, Kota",
      status: "pending",
      verified: false,
      rating: 4.2,
      price: "₹200 for two",
      timing: "9:00 AM - 11:00 PM",
      views: 380,
      bookings: 25,
      review_count: 12,
      created_at: "2026-09-06T15:00:00Z"
    }
  ] as PropertyItem[],

  bookstores: [
    {
      id: "bks-001",
      name: "Vidyarthi Book & Notes Depot",
      category: "Bookstore",
      owner_id: "usr-ow-205",
      owner_name: "Kailash Chand Jain",
      phone: "9929718264",
      whatsapp: "9929718264",
      area: "Station Road",
      city: "Kota",
      address: "Shop 15, Near City Post Office, Station Road, Kota",
      status: "active",
      verified: true,
      featured: true,
      rating: 4.9,
      price: "Up to 35% Discount",
      timing: "9:00 AM - 9:00 PM (All 7 Days)",
      facilities: "JEE/NEET Coaching Material, Formula Booklets, Standard Reference Books, Bulk Xerox, Spiral Binding",
      views: 1450,
      bookings: 85,
      review_count: 48,
      created_at: "2026-08-25T10:00:00Z"
    }
  ] as PropertyItem[],

  listingRequests: [
    {
      id: 1001,
      name: "Sunrise Boys Hostel",
      property_name: "Sunrise Boys Hostel",
      category: "Hostel",
      owner_name: "Pradeep Joshi",
      phone: "9829876543",
      email: "pradeep.joshi@gmail.com",
      area: "Vigyan Nagar",
      city: "Kota",
      address: "Sector 2, Vigyan Nagar, Near Medical College, Kota",
      timing: "In-time: 10:00 PM",
      facilities: "AC, WiFi, 3 Meals, Gym access, RO water",
      rating: 4.5,
      price: "₹7,800/mo",
      status: "pending",
      created_at: "2026-09-08T11:45:00Z"
    },
    {
      id: 1002,
      name: "Apna Ghar Tiffin Service",
      property_name: "Apna Ghar Tiffin Service",
      category: "Tiffin",
      owner_name: "Kavita Soni",
      phone: "9414771122",
      area: "Mahaveer Nagar 3",
      city: "Kota",
      address: "House 45, Mahaveer Nagar 3rd, Kota",
      timing: "11:00 AM - 9:00 PM",
      facilities: "Ghar jaisa khana, 2 sabzi, 4 roti, rice, dal",
      rating: 4.3,
      price: "₹2,600/mo",
      status: "pending",
      created_at: "2026-09-09T08:15:00Z"
    }
  ] as ListingRequest[],

  claimRequests: [
    {
      id: 2001,
      property_id: "hst-003",
      property_name: "Gurukripa Student PG",
      property_type: "hostels",
      claimant_name: "Mohan Lal Gurjar",
      phone: "9414234567",
      email: "mohanlal.gurjar@gmail.com",
      message: "I am the registered owner and deed holder of Gurukripa PG. Please verify and connect to my dashboard.",
      status: "pending",
      created_at: "2026-09-07T14:10:00Z"
    }
  ] as ClaimRequest[],

  verificationRequests: [
    {
      id: 3001,
      property_id: "hst-003",
      property_name: "Gurukripa Student PG",
      property_table: "hostels",
      owner_name: "Mohan Lal Gurjar",
      status: "pending",
      created_at: "2026-09-07T14:15:00Z"
    },
    {
      id: 3002,
      property_id: "tfn-003",
      property_name: "Kalyan Mess & Bhojnalaya",
      property_table: "tiffins",
      owner_name: "Babulal Sharma",
      status: "pending",
      created_at: "2026-09-08T10:00:00Z"
    }
  ] as VerificationRequest[],

  bookings: [
    {
      id: "BK-8091",
      student_id: "usr-st-101",
      student_name: "Aman Sharma",
      student_phone: "9829102938",
      property_id: "hst-001",
      property_name: "Shree Krishna Deluxe Boys PG",
      property_type: "hostels",
      owner_name: "Rameshwar Prasad Sharma",
      joined_date: "2026-08-20T00:00:00Z",
      left_date: "2027-05-30T00:00:00Z",
      duration: "10 Months (Academic Year)",
      amount: "₹85,000",
      status: "active",
      created_at: "2026-08-16T12:00:00Z"
    },
    {
      id: "BK-8092",
      student_id: "usr-st-102",
      student_name: "Pooja Choudhary",
      student_phone: "9414592019",
      property_id: "hst-002",
      property_name: "Radhika Girls Premium Residency",
      property_type: "hostels",
      owner_name: "Rameshwar Prasad Sharma",
      joined_date: "2026-08-25T00:00:00Z",
      duration: "12 Months",
      amount: "₹1,10,400",
      status: "active",
      created_at: "2026-08-21T15:30:00Z"
    },
    {
      id: "BK-8093",
      student_id: "usr-st-103",
      student_name: "Vikram Rathore",
      student_phone: "9785210943",
      property_id: "tfn-001",
      property_name: "Maa Annapurna Premium Tiffin",
      property_type: "tiffins",
      owner_name: "Sunita Devi Agarwal",
      joined_date: "2026-09-01T00:00:00Z",
      duration: "1 Month (Recurring)",
      amount: "₹3,200",
      status: "active",
      created_at: "2026-08-28T18:10:00Z"
    },
    {
      id: "BK-8094",
      student_id: "usr-st-106",
      student_name: "Anjali Soni",
      student_phone: "9828456712",
      property_id: "lib-001",
      property_name: "Apex 24/7 Digital Library",
      property_type: "libraries",
      owner_name: "Mahesh Kumar Saini",
      joined_date: "2026-09-06T00:00:00Z",
      duration: "3 Months",
      amount: "₹3,600",
      status: "active",
      created_at: "2026-09-05T14:00:00Z"
    }
  ] as StudentBooking[],

  reviews: [
    {
      id: "rev-101",
      student_name: "Aman Sharma",
      property_name: "Shree Krishna Deluxe Boys PG",
      rating: 5,
      review: "Room quality aur khana dono bahut ache hain. Allen Samyak se chalne me sirf 2 minute lagte hain.",
      status: "published",
      created_at: "2026-09-02T18:20:00Z"
    },
    {
      id: "rev-102",
      student_name: "Pooja Choudhary",
      property_name: "Radhika Girls Premium Residency",
      rating: 5,
      review: "Hostel warden bahut cooperative hain aur security bahut strict hai. Very safe for girls.",
      status: "published",
      created_at: "2026-09-04T12:10:00Z"
    },
    {
      id: "rev-103",
      student_name: "Deepak Yadav",
      property_name: "Apex 24/7 Digital Library",
      rating: 5,
      review: "Peaceful environment, high speed WiFi and super comfortable chairs for long 12-hour study shifts.",
      status: "published",
      created_at: "2026-09-07T21:40:00Z"
    }
  ] as ReviewItem[],

  reports: [
    {
      id: "rep-01",
      reporter_name: "Student Reviewer",
      property_name: "Gurukripa Student PG",
      reason: "Water supply issue reported during evening peak study hours.",
      status: "investigating",
      created_at: "2026-09-08T16:20:00Z"
    }
  ] as PropertyReport[],

  notifications: [
    {
      id: "ntf-1",
      title: "New Listing Submitted",
      message: "Pradeep Joshi submitted 'Sunrise Boys Hostel' in Vigyan Nagar.",
      status: "unread",
      created_at: "2026-09-08T11:45:00Z"
    },
    {
      id: "ntf-2",
      title: "Ownership Claim Filed",
      message: "Mohan Lal submitted ownership proof for Gurukripa Student PG.",
      status: "unread",
      created_at: "2026-09-07T14:10:00Z"
    },
    {
      id: "ntf-3",
      title: "New Student Booking",
      message: "Anjali Soni booked 3 months at Apex 24/7 Digital Library.",
      status: "read",
      created_at: "2026-09-05T14:00:00Z"
    }
  ] as AdminNotification[],

  areas: [
    { id: 1, name: "Rajeev Gandhi Nagar", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 2, name: "Talwandi", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 3, name: "Indra Vihar", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 4, name: "Coral Park", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 5, name: "Landmark City", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 6, name: "Vigyan Nagar", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 7, name: "Station Road", city: "Kota", state: "Rajasthan", status: "active" },
    { id: 8, name: "Gopalpura Bypass", city: "Jaipur", state: "Rajasthan", status: "active" }
  ] as AreaItem[],

  settings: [
    { key: "website_name", value: "StudentHubHelp", description: "Official Portal Name" },
    { key: "website_contact", value: "+91 99297 18264", description: "Helpline Number" },
    { key: "website_whatsapp", value: "+91 99297 18264", description: "Official WhatsApp Support" },
    { key: "website_email", value: "satpalswami22742@gmail.com", description: "Director Contact Email" },
    { key: "student_registration", value: "enabled", description: "Allow public student sign-ups" },
    { key: "owner_registration", value: "enabled", description: "Allow new property owner onboarding" },
    { key: "booking_enabled", value: "enabled", description: "Student direct booking engine" },
    { key: "review_auto_publish", value: "manual_approval", description: "Review moderation policy" },
    { key: "maintenance_mode", value: "disabled", description: "System maintenance gateway" }
  ] as SystemSetting[],

  activity: [
    {
      id: "act-1",
      admin_email: "satpalswami22742@gmail.com",
      action: "verify_property",
      entity_type: "hostels",
      entity_id: "hst-001",
      old_value: { verified: false },
      new_value: { verified: true },
      created_at: "2026-09-08T19:00:00Z"
    },
    {
      id: "act-2",
      admin_email: "satpalswami22742@gmail.com",
      action: "approve_booking",
      entity_type: "student_bookings",
      entity_id: "BK-8094",
      new_value: { status: "active" },
      created_at: "2026-09-05T14:05:00Z"
    }
  ] as AdminActivityLog[],

  mediaImages: [
    {
      id: "med-1",
      property_id: "hst-001",
      url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
      public_url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
      category: "Room",
      created_at: "2026-09-01T10:00:00Z"
    },
    {
      id: "med-2",
      property_id: "hst-002",
      url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
      public_url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
      category: "Building",
      created_at: "2026-09-03T14:30:00Z"
    },
    {
      id: "med-3",
      property_id: "lib-001",
      url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
      public_url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
      category: "Study",
      created_at: "2026-09-04T12:00:00Z"
    }
  ] as OwnerPropertyImage[],

  get properties(): PropertyItem[] {
    return [
      ...this.hostels,
      ...this.tiffins,
      ...this.libraries,
      ...this.cafes,
      ...this.bookstores
    ];
  },

  get activityLogs(): AdminActivityLog[] {
    return this.activity;
  }
};

export async function fetchAllDataFromSupabase() {
  const result: any = {
    properties: [],
    students: [],
    owners: [],
    listingRequests: [],
    claimRequests: [],
    verificationRequests: [],
    bookings: [],
    reviews: [],
    reports: [],
    mediaImages: [],
    areas: [],
    notifications: [],
    activityLogs: [],
    settings: [],
  };

  if (!supabase) {
    console.warn('Supabase client is not available.');
    return result;
  }

  try {
    // These are the tables used by the live StudentHubHelp database.
    // Do not query students/owners/property_reviews/reports because those
    // table names do not exist in the current schema.
    const fetchPromises = [
      supabase.from('hostels').select('*').limit(100),
      supabase.from('tiffins').select('*').limit(100),
      supabase.from('libraries').select('*').limit(100),
      supabase.from('cafes').select('*').limit(100),
      supabase.from('bookstores').select('*').limit(100),
      supabase.from('profiles').select('*').limit(1000),
      supabase.from('listing_requests').select('*').limit(100),
      supabase.from('claim_requests').select('*').limit(100),
      supabase.from('verification_requests').select('*').limit(100),
      supabase.from('student_bookings').select('*').limit(100),
      supabase.from('reviews').select('*').limit(100),
      supabase.from('property_reports').select('*').limit(100),
      supabase.from('areas').select('*').limit(100),
    ];

    const [
      hostelsRes,
      tiffinsRes,
      librariesRes,
      cafesRes,
      bookstoresRes,
      profilesRes,
      listingRes,
      claimsRes,
      verifRes,
      bookingsRes,
      reviewsRes,
      reportsRes,
      areasRes,
    ] = await Promise.allSettled(fetchPromises);

    const getData = (res: PromiseSettledResult<any>, label: string): any[] => {
      if (res.status === 'rejected') {
        console.warn(`Supabase ${label} request failed:`, res.reason);
        return [];
      }
      if (res.value.error) {
        console.warn(`Supabase ${label} query failed:`, res.value.error.message);
        return [];
      }
      return Array.isArray(res.value.data) ? res.value.data : [];
    };

    const hostels = getData(hostelsRes, 'hostels');
    const tiffins = getData(tiffinsRes, 'tiffins');
    const libraries = getData(librariesRes, 'libraries');
    const cafes = getData(cafesRes, 'cafes');
    const bookstores = getData(bookstoresRes, 'bookstores');
    const profiles = getData(profilesRes, 'profiles');
    const listingRequests = getData(listingRes, 'listing_requests');
    const claimRequests = getData(claimsRes, 'claim_requests');
    const verificationRequests = getData(verifRes, 'verification_requests');
    const bookings = getData(bookingsRes, 'student_bookings');
    const reviews = getData(reviewsRes, 'reviews');
    const reports = getData(reportsRes, 'property_reports');
    const areas = getData(areasRes, 'areas');

    result.properties = [
      ...hostels.map((d: any) => ({ ...d, category: d.category || 'Hostel' })),
      ...tiffins.map((d: any) => ({ ...d, category: d.category || 'Tiffin' })),
      ...libraries.map((d: any) => ({ ...d, category: d.category || 'Library' })),
      ...cafes.map((d: any) => ({ ...d, category: d.category || 'Cafe' })),
      ...bookstores.map((d: any) => ({ ...d, category: d.category || 'Bookstore' })),
    ];

    // The live database keeps students and owners in profiles.
    // Split them by role instead of querying non-existent tables.
    result.students = profiles.filter((p: any) =>
      String(firstVal(p, ['role', 'user_role', 'type'], '')).toLowerCase() === 'student'
    );

    result.owners = profiles.filter((p: any) => {
      const role = String(firstVal(p, ['role', 'user_role', 'type'], '')).toLowerCase();
      return ['owner', 'landlord', 'property_owner', 'property-owner'].includes(role);
    });

    result.listingRequests = listingRequests;
    result.claimRequests = claimRequests;
    result.verificationRequests = verificationRequests;
    result.bookings = bookings;
    result.reviews = reviews;
    result.reports = reports;
    result.areas = areas;

    console.log('Supabase live data loaded:', {
      properties: result.properties.length,
      students: result.students.length,
      owners: result.owners.length,
      listingRequests: result.listingRequests.length,
      claimRequests: result.claimRequests.length,
      verificationRequests: result.verificationRequests.length,
      bookings: result.bookings.length,
      reviews: result.reviews.length,
      reports: result.reports.length,
      areas: result.areas.length,
    });
  } catch (e) {
    console.warn('Supabase fetch catch:', e);
  }

  return result;
}

export async function updatePropertyVerification(id: string | number, nextVerified: boolean, category?: string) {
  if (!supabase) return;
  const table = getTableNameForCategory(category);
  try {
    const { error } = await supabase
      .from(table)
      .update({ verified: nextVerified, is_verified: nextVerified })
      .eq('id', id);

    if (error) {
      console.warn('Supabase update verification failed:', error.message);
    }
  } catch (err) {
    console.warn('Supabase update verification failed:', err);
  }
}

export async function toggleUserDisabledState(userId: string | number, nextDisabled: boolean) {
  if (!supabase) return;
  const nextStatus = nextDisabled ? 'disabled' : 'active';
  try {
    // Users are stored in profiles in the live schema.
    const { error } = await supabase
      .from('profiles')
      .update({ status: nextStatus, account_status: nextStatus })
      .eq('id', userId);

    if (error) {
      console.warn('Supabase toggle user status:', error.message);
    }
  } catch (err) {
    console.warn('Supabase toggle user status:', err);
  }
}

export async function savePropertyToSupabase(property: PropertyItem): Promise<PropertyItem> {
  const table = getTableNameForCategory(property.category);
  const toSave = { ...property };
  if (!toSave.id) {
    toSave.id = `prop-${Date.now()}`;
  }

  if (supabase) {
    try {
      const { error } = await supabase.from(table).upsert(toSave);
      if (error) console.warn('Supabase save error:', error.message);
    } catch (err) {
      console.warn('Supabase upsert catch:', err);
    }
  }

  return toSave;
}

export async function deletePropertyFromSupabase(id: string | number, category?: string) {
  if (!supabase) return;
  const table = getTableNameForCategory(category);
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) console.warn('Supabase delete error:', error.message);
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }
}

function getTableNameForCategory(category?: string): string {
  const c = (category || 'hostel').toLowerCase();
  if (c.includes('tiffin') || c.includes('mess')) return 'tiffins';
  if (c.includes('library')) return 'libraries';
  if (c.includes('cafe')) return 'cafes';
  if (c.includes('book')) return 'bookstores';
  return 'hostels';
}
