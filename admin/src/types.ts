export type PropertyType = 'hostels' | 'tiffins' | 'libraries' | 'cafes' | 'bookstores';

export interface PropertyItem {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  category?: string;
  type?: string;
  property_type?: string;
  business_type?: string;
  owner_id?: string;
  owner_name?: string;
  phone?: string;
  owner_phone?: string;
  whatsapp?: string;
  email?: string;
  area?: string;
  city?: string;
  pincode?: string;
  address?: string;
  full_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  google_maps_url?: string;
  status?: string;
  verified?: boolean;
  is_verified?: boolean;
  verification_status?: string;
  featured?: boolean;
  is_featured?: boolean;
  rating?: number | null;
  price?: string | number | null;
  rent?: string | number | null;
  monthly_rent?: string | number | null;
  timing?: string;
  opening_time?: string;
  closing_time?: string;
  facilities?: string;
  description?: string;
  details?: string;
  image?: string;
  image_url?: string;
  photo?: string;
  room_types?: string;
  gender?: string;
  room_sharing?: string;
  total_beds?: string | number;
  available_beds?: string | number;
  food_available?: string | boolean;
  food_type?: string;
  rules?: string;
  meal_type?: string;
  plan_type?: string;
  delivery_available?: string | boolean;
  service_area?: string;
  cuisine?: string;
  seating_capacity?: string | number;
  monthly_fee?: string | number;
  open_24_hours?: string | boolean;
  membership?: string;
  categories?: string;
  stationery?: string;
  printing?: string;
  views?: number;
  view_count?: number;
  total_views?: number;
  bookings?: number;
  booking_count?: number;
  review_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  address?: string;
  city?: string;
  status?: string;
  account_status?: string;
  property?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ListingRequest {
  id: string | number;
  name?: string;
  property_name?: string;
  title?: string;
  category?: string;
  property_type?: string;
  owner_name?: string;
  owner_id?: string;
  phone?: string;
  owner_phone?: string;
  email?: string;
  area?: string;
  city?: string;
  address?: string;
  timing?: string;
  facilities?: string;
  description?: string;
  rating?: number | null;
  price?: string | number;
  image?: string;
  status?: string;
  verified?: boolean;
  admin_note?: string;
  created_at?: string;
  submitted_at?: string;
  [key: string]: any;
}

export interface ClaimRequest {
  id: string | number;
  property_id?: string;
  property_name?: string;
  property_type?: string;
  claimant_name?: string;
  claimant_id?: string;
  phone?: string;
  email?: string;
  proof_url?: string;
  message?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface VerificationRequest {
  id: string | number;
  property_id?: string;
  property_name?: string;
  property_table?: string;
  owner_name?: string;
  owner_id?: string;
  document_url?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface StudentBooking {
  id: string | number;
  student_id?: string;
  student_name?: string;
  student_phone?: string;
  property_id?: string;
  property_name?: string;
  property_type?: string;
  owner_id?: string;
  owner_name?: string;
  booking_date?: string;
  start_date?: string;
  joined_date?: string;
  left_date?: string;
  duration?: string;
  amount?: number | string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface ReviewItem {
  id: string | number;
  student_id?: string;
  student_name?: string;
  property_id?: string;
  property_name?: string;
  property_type?: string;
  rating?: number;
  review?: string;
  comment?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface PropertyReport {
  id: string | number;
  reporter_id?: string;
  reporter_name?: string;
  property_id?: string;
  property_name?: string;
  property_type?: string;
  reason?: string;
  description?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface AdminNotification {
  id: string | number;
  title?: string;
  type?: string;
  message?: string;
  body?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface AdminActivityLog {
  id?: string | number;
  admin_id?: string;
  admin_email?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: any;
  new_value?: any;
  created_at?: string;
  [key: string]: any;
}

export interface AreaItem {
  id: string | number;
  name?: string;
  area_name?: string;
  city?: string;
  state?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface SystemSetting {
  id?: string | number;
  key?: string;
  setting_key?: string;
  name?: string;
  value?: string;
  setting_value?: string;
  description?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface OwnerPropertyImage {
  id: string | number;
  property_id?: string;
  file_name?: string;
  name?: string;
  category?: string;
  image_type?: string;
  storage_path?: string;
  path?: string;
  public_url?: string;
  url?: string;
  created_at?: string;
  [key: string]: any;
}

export type SectionTab =
  | 'overview'
  | 'analytics'
  | 'user-management'
  | 'students'
  | 'owners'
  | 'properties'
  | 'hostels'
  | 'tiffins'
  | 'libraries'
  | 'cafes'
  | 'bookstores'
  | 'listing-requests'
  | 'claim-requests'
  | 'unverified-properties'
  | 'verification'
  | 'bookings'
  | 'reviews'
  | 'reports'
  | 'media'
  | 'featured'
  | 'areas'
  | 'notifications'
  | 'activity'
  | 'settings'
  | 'categories'
  | 'admin';
