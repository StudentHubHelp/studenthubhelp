import { BotConfig } from '../types';

export const DEFAULT_BOT_CONFIG: BotConfig = {
  websiteName: 'StudentHubHelp',
  tagline: 'Student discovery for hostels, tiffins, libraries, cafes and bookstores.',
  industry: 'Student Housing & Educational Services Discovery',
  primaryLocation: 'Sikar, Kota, Jaipur, Delhi and other supported locations',
  directorName: 'SATPAL SWAMI',
  directorPhone: '+91 9929718264',
  directorEmail: 'satpalswami22742@gmail.com',
  botTone: 'professional',
  enableTTS: true,
  enableSTT: true,
  welcomeMessage: 'Namaste. Main StudentHubHelp ka AI Assistant hoon. Main aapki requirement samajhkar currently active listings ke basis par help karunga.',
  customKnowledge: `
StudentHubHelp is a student discovery platform.
The assistant must use live StudentHubHelp data for property facts.
Property recommendations must come only from currently active public listings.
Never invent a property name, price, rating, phone number, address, availability, facility or verification status.
If no active listing matches, clearly say that no matching active listing was found.
Platform support contact: Director Satpal Swami (+91 9929718264, satpalswami22742@gmail.com).
`,
  services: [
    { name: 'Hostel & PG Finder', desc: 'Find active student accommodation listings.', pricing: 'See live listings' },
    { name: 'Tiffin & Mess', desc: 'Find active meal and tiffin listings.', pricing: 'See live listings' },
    { name: 'Libraries', desc: 'Find active study library listings.', pricing: 'See live listings' },
    { name: 'Student Cafes', desc: 'Find active cafe listings.', pricing: 'See live listings' },
    { name: 'Bookstores', desc: 'Find active bookstore listings.', pricing: 'See live listings' }
  ]
};
