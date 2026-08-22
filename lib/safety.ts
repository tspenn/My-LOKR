export const SAFETY_COPY = {
  title: "Privacy and safety",
  short:
    "We do not read private messages or scan your files. You are responsible for what you share.",
  bullets: [
    "We do not routinely read private messages, and we do not fingerprint or scan files in LOKR.",
    "If you use safety software on your own devices, that stays on your devices. This app does not run those checks.",
    "You are responsible for what you send and store, and for the people you invite.",
    "On hotel or airport Wi‑Fi, LOKR traffic is encrypted in transit — but the network itself can still be risky. Prefer your phone hotspot for sensitive documents.",
  ],
} as const;

export const TRAVEL_COPY = {
  title: "Travel and public Wi‑Fi",
  short:
    "Use LOKR from the browser abroad without installing another app. Protect documents — but do not trust every network.",
  bullets: [
    "Good for travel: passport copies, medical notes, itineraries, and private threads with people already in your locker — no App Store download.",
    "Not a roaming saver: messages, files, and live video still use Wi‑Fi or cellular data.",
    "Hotel Wi‑Fi: encrypted like banking on the wire, but fake hotspots and captive portals still happen. Use your hotspot for the most sensitive files.",
    "LOKR is for your invited circle, not a replacement for Signal or WhatsApp when you need to reach anyone in the world.",
  ],
} as const;
