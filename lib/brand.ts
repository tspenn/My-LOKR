/** Visual branding tokens for LOKR. Warm wood shell, cyan actions. */

export const BRAND = {
  name: "LOKR",
  font: {
    heading: "Space Grotesk",
    body: "Inter",
    source: "https://fonts.bunny.net/css?family=inter:400,500,600,700|space-grotesk:500,600,700",
    fallback: "ui-sans-serif, system-ui, sans-serif",
  },
  darkChrome: {
    primary: "#452D21",
    secondary: "#53382C",
    elevated: "#5C3F32",
    border: "#7A5A48",
  },
  reading: {
    pane: "#F8F8F7",
    text: "#1F1F1F",
    muted: "#6F6B66",
  },
  text: {
    primary: "#F8F8F7",
    muted: "#F0EDE8",
    faint: "#6F6B66",
  },
  accent: {
    teal: "#73CBDF",
    tealHover: "#5EB9CD",
    tealSoft: "#D5EFF5",
    onTeal: "#1F1F1F",
  },
  images: {
    square: "/LOKRsquare.png",
    office: "/LOKR phone image.jpg",
  },
  feedback: {
    danger: "#C45C5C",
    warn: "#C4A46A",
  },
} as const;
