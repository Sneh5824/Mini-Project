import { v4 as uuidv4 } from "uuid";

const GUEST_ID_KEY      = "ds_guestId";
const DISPLAY_NAME_KEY  = "ds_displayName";

const DISPLAY_NAMES = [
  // Classic Animals
  "Anonymous Fox",      "Silent Panda",       "Logical Owl",
  "Curious Tiger",      "Brave Eagle",        "Clever Raccoon",
  "Witty Dolphin",      "Swift Falcon",       "Bold Lynx",
  "Mystic Raven",       "Lazy Sloth",         "Zany Narwhal",
  "Chaotic Platypus",   "Sneaky Mongoose",    "Dizzy Flamingo",
  "Turbocharged Yak",   "Reckless Ostrich",   "Caffeinated Lemur",

  // Bollywood Legends
  "Bachchan Overload",  "Rajesh Khanna Ji",   "Dharmendra Bhai",
  "Dev Anand Saab",     "Dilip Kumar Sahab",  "Hema Malini Rocks",
  "Rekha Supremacy",    "Amrish Puri Returns","Mithun Da Rules",
  "Sunny Deol Dhai Kg", "Sridevi Reloaded",   "Govinda Unstoppable",
  "Karisma Comeback",   "Jackie Shroff Swag",  "Rishi Kapoor Mode",
  "Vinod Khanna Vibes", "Jeetendra Jumpsuit",  "Shakti Kapoor Haha",

  // Funny / Dramatic
  "Accidentally Senior Dev",  "sudo rm -rf Man",       "Merge Conflict God",
  "404 Brain Not Found",      "Infinite Loop Enjoyer", "Stack Overflow Victim",
  "npm install Failure",      "Segfault Survivor",     "NullPointer Nightmare",
  "Off By One Error",         "Semicolon Forgetter",   "Tab vs Space Warrior",
  "Git Push Force Legend",    "Ctrl Z Addict",         "Dark Mode Evangelist",
  "Copy Paste Champion",      "Google Translate Coder","Deadline Denier",

  // Old School / Retro
  "Floppy Disk Rider",    "Dial-Up Demon",        "Windows XP Ghost",
  "Internet Explorer Fan","Cassette Tape Wizard",  "Nokia 3310 Survivor",
  "Y2K Believer",         "Clippy Assistant",      "MySpace Legend",
  "MS Paint Picasso",     "Orkut Veteran",         "Flash Player Mourner",

  // Desi / Indian Internet Culture
  "Pappu Pass Ho Gaya",   "Chai Break Engineer",   "Jugaad Master",
  "UPSC Dropout Coder",   "Bhai Ka System Slow",   "Jio Speed Programmer",
  "Engineering Dropout",  "Aunty Ka Favorite",     "Yaar Ek Bug Hai",
  "Sarkari Job Waiter",   "IIT Reject Legend",     "Desi Rubber Duck",
  "Sharma Ji Ka Beta",    "VPN Ke Bina Kuch Nahi", "BC Roll Back Karo",

  // Sci-Fi / Universe
  "Quantum Debugger",     "Interstellar Intern",   "Time Zone Terrorist",
  "Multiverse Merge Guy", "Dark Matter Developer", "Wormhole Watcher",
  "Planet 404 Resident",  "Galactic Git Pusher",   "Nebula Nonsense",

  // Gamer
  "AFK Since 2007",       "Respawn Requested",     "No Clip Mode On",
  "GTA Cheat Coder",      "One HP Survivor",       "Always Speedrunning",
  "Lag Compensator",      "Bot Suspicion Level 9", "Rage Quit Resistant",
];

/**
 * Returns the persisted guest identity.
 * - guestId  : stable (kept in localStorage so reconnects work within a tab session)
 * - displayName : re-randomised on every page load for freshness
 */
export function getOrCreateIdentity() {
  if (typeof window === "undefined") return { guestId: "", displayName: "" };

  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }

  // Always pick a new random name so every visit feels fresh
  const displayName = DISPLAY_NAMES[Math.floor(Math.random() * DISPLAY_NAMES.length)];
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);

  return { guestId, displayName };
}

/** Marks a roomId as created by this identity (used to detect host role). */
export function markAsHost(roomId) {
  if (typeof window === "undefined") return;
  const myRooms = JSON.parse(localStorage.getItem("ds_myRooms") || "{}");
  myRooms[roomId] = true;
  localStorage.setItem("ds_myRooms", JSON.stringify(myRooms));
}

/** Returns true if this client created the given room. */
export function isRoomHost(roomId) {
  if (typeof window === "undefined") return false;
  const myRooms = JSON.parse(localStorage.getItem("ds_myRooms") || "{}");
  return !!myRooms[roomId];
}
