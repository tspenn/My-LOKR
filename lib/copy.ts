/** Canonical LOKR copy — matches Skyland Apps. */

export const COPY = {
  name: "LOKR",
  meaning: "LOKR is your own encrypted information locker.",
  headline: "Private messaging for the people and information you actually care about",
  hook: "Tired of being part of the big picture?",
  hookTwo:
    "Like the internet — but not sure you want to share all your secrets with the entire World Wide Web?",
  intro:
    "It is a private communication tool for families, small teams, and businesses who want a safer place to talk and share files. It is built for the conversations and documents that don’t belong in regular email or everyday messaging apps — including business plans, patent ideas, and files you would never put in Gmail or Outlook.",
  notEmail: "It is not a replacement for normal email.",
  noStore:
    "It is a Skyland PWA. You open it in the browser. There is nothing to download from Apple or Google, and it does not bloat your phone.",
  locked:
    "It is a locked, controlled space where your messages and files stay under your control — not sitting in Google, Microsoft, Apple, or Samsung mail, not searchable in those companies’ clouds, and not traveling the open internet as ordinary email attachments that hackers and scanners already know how to steal.",
  point:
    "The whole point is this: send the files and ideas you do not want sitting in email, on a public cloud drive, or inside Google, Microsoft, Apple, or Samsung. That includes proprietary work, patent drafts, and business you simply do not want those companies to hold.",
  whether:
    "Whether it’s a family coordinating care, a small group handling private matters, or a business protecting proprietary information, LOKR gives you a simple, controlled alternative.",
  whyTitle: "Why families and teams use it",
  why: [
    "Keep family conversations, medical information, financial details, or personal documents in a private channel",
    "Share files between trusted people without putting them into regular email, where they can be forwarded, scanned, or stolen",
    "Give small teams a quiet, secure place for important discussions, patent ideas, and proprietary work",
    "Avoid mixing sensitive information with everyday mail and phone clouds that Google, Microsoft, Apple, and Samsung can read",
    "Use it from the browser — no App Store, no Play Store, no extra app sitting on the phone",
  ],
  privacyTitle: "Where the privacy actually comes from",
  privacyLead: "Privacy in LOKR is built into the system:",
  privacy: [
    {
      title: "Your data stays under your control",
      body: "Messages and files are stored in a private system. They are not sent through Google, Microsoft, Apple, Samsung, or consumer email networks, and they are not left as ordinary attachments on the open internet.",
    },
    {
      title: "Strict access controls",
      body: "People can only see the conversations and files they are invited into. No one else has access.",
    },
    {
      title: "Private file storage",
      body: "Attachments are kept in locked private storage. Files are never left in public places. Secure, short-lived download links are used so documents are not left openly available.",
    },
    {
      title: "No advertising inside the product",
      body: "The free version contains no ads and no ad trackers.",
    },
    {
      title: "No Big Tech visibility into your content",
      body: "Google, Microsoft, Apple, and Samsung do not carry, store, or scan your LOKR messages or files. They are not in the product path. A phone or browser can still see what is on the screen while you use it, and a backup you turn on stays on your devices. Stripe is used only if you pay for a plan, and only for billing — never for your conversations, attachments, or Vault files. Free never touches a payment processor.",
    },
  ],
  vaultTitle: "Storage benefits — The Vault",
  vaultLead:
    "LOKR includes private cloud storage called The Vault, designed for important documents and attachments.",
  vault: [
    "Files stay inside the same secure system as your messages",
    "Storage is private by default",
    "Plans include storage, and you can add more through The Vault when needed",
    "Clear usage tracking so you always know how much space is being used",
    "Simple, transparent extra storage options",
  ],
  vaultClose:
    "This makes LOKR useful for everything from family documents and personal records to contracts, client files, patent drafts, and proprietary business materials.",
  whoTitle: "Who it’s for",
  who: [
    "Families who want a private place for important conversations and files",
    "Small teams that need a secure side channel",
    "Businesses handling proprietary work, patent ideas, or sensitive information",
    "Anyone who does not want Google, Microsoft, Apple, Samsung, or everyday email to hold the files that matter",
    "People traveling abroad who want a browser locker for documents and trusted contacts — without installing Signal or WhatsApp",
  ],
  travelTitle: "Travel — browser locker, not another app",
  travelLead:
    "LOKR is not a trick to avoid roaming charges. It is a good fit when you are away and do not want to download another messenger, but you do want a locked place for documents and the people you already trust.",
  travelGood: [
    "Open it in the browser on your phone or laptop. Nothing to install from a foreign App Store.",
    "Keep passport copies, medical notes, itineraries, and contracts in The Vault — shared only with people you invited.",
    "Message and send files to your LOKR circle without putting attachments in Gmail, Outlook, or consumer chat apps.",
    "Sign in with the same account from hotel, airport, or home. Your locker follows you.",
  ],
  travelWifiTitle: "Hotel and airport Wi‑Fi",
  travelWifiBody:
    "LOKR encrypts traffic between your browser and the locker, the same way a bank site does. That protects the content on the wire — but it does not make a sketchy network safe. Fake “Free_WiFi” hotspots, odd captive-portal logins, and shoulder surfing are still real. For passport scans, money, or proprietary work, prefer your phone’s cellular hotspot or a network you trust. LOKR protects what you store and who can see it; it does not fix the hotel router.",
  travelNot:
    "LOKR is not a replacement for Signal or WhatsApp when you need to reach anyone in the world, and it does not reduce mobile data use. Video and files still need internet — Wi‑Fi or cellular.",
  isAndIsNotTitle: "What LOKR is — and is not",
  itIs: "Your own encrypted information locker — a private, secure messaging and file exchange system for the information you don’t want sitting in email, consumer clouds, or the open internet.",
  itIsNot:
    "A store app you download, like Signal or WhatsApp, or a full replacement for Microsoft 365, Google Workspace, or everyday email. Those tools still work well for normal communication. LOKR exists for the things that need tighter control — the files and ideas you would not trust to those companies — in the browser, without bloating the phone.",
  securityTitle: "Supabase-level security — how the lock actually works",
  securityLead:
    "LOKR does not use Google, Microsoft, Apple, or Samsung for mail or file storage. Messages and files live in a private Supabase system with database and storage rules that keep other people’s data out of reach.",
  security: [
    {
      title: "Private database, not a public inbox",
      body: "Messages are stored in a private Postgres database. Row Level Security is on every table. The database will not return a conversation or file record unless you are an invited member. That is enforced in the database, not just in the screens.",
    },
    {
      title: "Locked file storage, not a public cloud folder",
      body: "Attachments and The Vault use private Supabase Storage buckets. There are no public file URLs for hackers to guess or scrape. Downloads use short-lived signed links that expire in seconds, then go dead.",
    },
    {
      title: "Invited people only",
      body: "You choose who is in your LOKR. Outsiders, search engines, and other LOKR workspaces cannot open your threads or files. If you are not invited, the system has nothing to show you.",
    },
    {
      title: "Encrypted in transit",
      body: "Traffic between your browser and LOKR is encrypted (HTTPS). Files are not emailed as open attachments that sit on mail servers, get copied into backups, and wait for the next inbox breach.",
    },
    {
      title: "Live video is not a file we keep",
      body: "A live call is encrypted between the browsers on that call. LOKR does not save a recording. If someone stole a copy of the locker, they would not get your face. That is the point of encrypting the call instead of uploading it.",
    },
    {
      title: "What Google, Microsoft, Apple, Samsung, and Stripe never receive",
      body: "Your message text, attachments, patent drafts, and Vault files are not routed through Gmail, Outlook, iCloud Mail, Drive, OneDrive, iCloud Drive, Samsung Cloud, or Stripe. If you subscribe, Stripe only sees what it needs to charge the plan. Stay on Free and there is no payment company in the path at all.",
    },
  ],
} as const;
