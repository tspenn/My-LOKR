import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try LOKR",
  description: "A tour of LOKR. Not a real locker.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
