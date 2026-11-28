export const SEO_LISTING_TABLES = Object.freeze({
  hostel:'hostels', tiffin:'tiffins', library:'libraries', cafe:'cafes', bookstore:'bookstores'
});
const COMMON = ['id','property_id','slug','name','service_name','city','area','address','image','images','nearby_coaching','landmark','latitude','longitude','description','status','verified','updated_at','created_at','phone','timing','timings','facilities','google_maps_url'];
const CATEGORY_FIELDS = Object.freeze({
  hostel:['monthly_rent','monthly_rent_range','monthly_fee','security_deposit','price','room_types','food_available','total_beds','available_beds','ac_available','wifi','electricity_included','water_available','laundry','parking','mess_available','mess_charge'],
  tiffin:['monthly_fee','price','meal_type','food_type','plan_type','delivery_available','delivery_charge','breakfast_available','lunch_available','dinner_available','monthly_plan','weekly_plan','daily_plan','jain_food','home_delivery','subscription_available'],
  library:['monthly_fee','daily_fee','open_24_hours','seating_capacity','available_seats','ac_available','wifi','charging_point','locker','parking','girls_section','boys_section','power_backup'],
  cafe:['price_range','price','opening_time','closing_time','weekly_off','delivery','takeaway','seating_capacity','wifi','ac','parking','online_order','upi_payment'],
  bookstore:['price','categories','classes','competitive_books','stationery','second_hand_books','book_rental','online_order','home_delivery','exam_books','school_books','college_books','ncert_books','photocopy','printing','lamination','spiral_binding','notes_available','opening_time','closing_time','weekly_off']
});
export function buildListingSelect(type) {
  if (!SEO_LISTING_TABLES[type]) throw new Error('Unknown listing category: ' + type);
  return [...new Set([...COMMON, ...(CATEGORY_FIELDS[type] || [])])].join(',');
}
const clean = value => String(value ?? '').replace(/\\s+/g,' ').trim();
const numberOrNull = value => { if (value === null || value === undefined || value === '') return null; const n=Number(String(value).replace(/[^0-9.]/g,'')); return Number.isFinite(n) ? n : null; };
export function normalizeListingRecord(type, raw, { city = raw.city, area = raw.area || raw.service_area } = {}) {
  if (!SEO_LISTING_TABLES[type]) throw new Error('Unknown listing category: ' + type);
  const name = clean(raw.name || raw.service_name);
  const verified = raw.verified === true;
  const active = clean(raw.status).toLowerCase() === 'active';
  const updatedAt = raw.updated_at || raw.created_at || null;
  const priceCandidates = type === 'hostel' ? [raw.monthly_rent,raw.monthly_fee,raw.price] : type === 'tiffin' ? [raw.monthly_fee,raw.price] : type === 'library' ? [raw.monthly_fee,raw.daily_fee,raw.price] : type === 'cafe' ? [raw.price_range,raw.price] : [raw.price];
  const facilities = Array.isArray(raw.facilities) ? raw.facilities.map(clean).filter(Boolean) : clean(raw.facilities).split(/[,;|]/).map(clean).filter(Boolean);
  const is24x7 = type === 'library' ? raw.open_24_hours === true || /24\\s*(?:x|\\*)\\s*7|24\\s*hours|24\\s*hrs/i.test(clean(raw.timing || raw.timings)) : false;
  return { ...raw, type, name, city:clean(city), area:clean(area), verified, active, updatedAt, facilitiesNormalized:facilities, is24x7, priceValue:priceCandidates.map(numberOrNull).find(value=>value!==null) ?? null };
}
