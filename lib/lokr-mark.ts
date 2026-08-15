/** Up to four letters for a Lokr with no logo — FAM, TSTP, SKYR. */
export function lokrMark(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "LOKR";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = words
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, "").charAt(0))
      .join("");
    return (initials || cleaned.replace(/[^a-zA-Z0-9]/g, "")).slice(0, 4).toUpperCase();
  }
  return cleaned.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "LOKR";
}
