/** Visual branding tokens for My Lokr. Calm, secure, professional — not “hacker.” */

export const BRAND = {
  name: "My Lokr",
  font: {
    family: "DM Sans",
    source: "https://fonts.bunny.net/css?family=dm-sans:400,500,600,700",
    fallback: "ui-sans-serif, system-ui, sans-serif",
    reference: "Go Intelligence Agency (https://go-i-agency.vercel.app/)",
  },
  darkChrome: {
    primary: "#1F1F1F",
    secondary: "#2A2A2A",
    elevated: "#333333",
    border: "#3F3F3F",
  },
  text: {
    primary: "#F4F1EA",
    muted: "#A39E96",
    faint: "#6F6B66",
  },
  accent: {
    /** Softened metal, not neon. */
    metal: "#C9C2B6",
    onMetal: "#1F1F1F",
  },
  feedback: {
    danger: "#C45C5C",
    warn: "#C4A46A",
  },
} as const;
