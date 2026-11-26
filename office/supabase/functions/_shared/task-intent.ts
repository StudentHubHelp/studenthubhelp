export const DAILY_ACTIVITY_REQUIRED_ROLES = ["data_listing_manager", "data_analyst_reporting_manager", "quality_control_manager"] as const;
export function isDailyWebsiteActivityTask(taskTitle: string, taskDescription: string): boolean {
  const value = (String(taskTitle || "") + " " + String(taskDescription || "")).toLocaleLowerCase();
  const explicit = /(?:daily|today'?s|website)\s+(?:website\s+)?activity\s+report|website\s+activity|daily\s+operations\s+report/.test(value);
  const dateWindow = /\b(today|today'?s|aaj|aj|yesterday|kal|date)\b|आज|कल|\b20\d{2}-\d{2}-\d{2}\b|\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+20\d{2}\b/i.test(value);
  const actions = /\b(add(?:ed)?|new|creat(?:e|ed)|update(?:d)?|edit(?:ed)?|modif(?:y|ied)|remov(?:e|ed)|delet(?:e|ed)|hide|hidden|deactivat(?:e|ed)|booking|bookings|reserv(?:e|ation|ations)|activity|happened)\b|what happened|kya hua|kya hua tha|जुड़ी|जोड़ी|नई|अपडेट|बदली|बदला|हटाई|हटाया|डिलीट|बुकिंग|क्या हुआ/.test(value);
  const domain = /website|site|property|properties|listing|hostel|\bpg\b|tiffin|mess|library|libraries|cafe|bookstore|booking|प्रॉपर्टी|लिस्टिंग|वेबसाइट|बुकिंग/.test(value);
  return explicit || (dateWindow && actions && domain);
}
