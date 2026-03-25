import { v4 as uuidv4 } from "uuid";

const GUEST_ID_KEY      = "ds_guestId";
const DISPLAY_NAME_KEY  = "ds_displayName";

const DISPLAY_NAMES = [
  // Marvel Universe — adverb + name
  "Bravely Stark",
  "Swiftly Rogers",
  "Boldly Romanoff",
  "Quietly Banner",
  "Wisely Thor",
  "Calmly Barton",
  "Vividly Parker",
  "Nimbly Strange",
  "Boldly Wanda",
  "Steadily Vision",
  "Fiercely TChalla",
  "Quietly Shuri",
  "Brightly Okoye",
  "Firmly Rambeau",
  "Briskly Danvers",
  "Subtly Fury",
  "Patiently Hill",
  "Kindly Coulson",
  "Bravely Loki",
  "Neatly Valkyrie",
  "Smoothly Heimdall",
  "Nobly Frigga",
  "Quickly Mantis",
  "Freely Quill",
  "Safely Gamora",
  "Strongly Drax",
  "Lightly Rocket",
  "Warmly Groot",
  "Stealthily Nebula",
  "Clearly Yondu",
  "Finely Pepper",
  "Humbly Happy",
  "Brightly May",
  "Coolly Echo",
  "Steadily MoonKnight",
  "Quietly Khonshu",
  "Briskly ShangChi",
  "Gracefully Katy",
  "Patiently Wong",
  "Sharply Chavez",
  "Keenly AntMan",
  "Briskly Wasp",
  "Softly Yelena",
  "Smoothly RedGuardian",
  "Quickly Bucky",
  "Loyally SamWilson",
  "Strongly Isaiah",
  "Calmly Agatha",
  "Bravely Kamala",
  "Brightly KateBishop",
  "Firmly SheHulk",
  "Swiftly Daredevil",
  "Quietly Elektra",
  "Boldly Punisher",
  "Neatly Blade",
  "Silently SilverSurfer",
  "Clearly ReedRichards",
  "Bravely SueStorm",
  "Strongly BenGrimm",
  "Quickly JohnnyStorm",
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
