/** Visual branding tokens for My Lokr. Calm, secure, professional — not “hacker.” */

export const BRAND = {
  name: "My Lokr",
  font: {
    heading: "Space Grotesk",
    body: "Inter",
    source: "https://fonts.bunny.net/css?family=inter:400,500,600,700|space-grotesk:500,600,700",
    fallback: "ui-sans-serif, system-ui, sans-serif",
  },
  darkChrome: {
    primary: "#1F1F1F",
    secondary: "#2A2A2A",
    elevated: "#333333",
    border: "#3F3F3F",
  },
  reading: {
    pane: "#F8F8F7",
    text: "#1F1F1F",
    muted: "#6F6B66",
  },
  text: {
    primary: "#F8F8F7",
    muted: "#A39E96",
    faint: "#6F6B66",
  },
  accent: {
    teal: "#2A9D8F",
    tealHover: "#21867A",
    tealSoft: "#E6F4F1",
    onTeal: "#F8F8F7",
  },
  feedback: {
    danger: "#C45C5C",
    warn: "#C4A46A",
  },
} as const;
