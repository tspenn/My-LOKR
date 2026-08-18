import type { Metadata } from "next";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_ORIGIN),
  title: {
    default: "LOKR",
    template: "%s · LOKR",
  },
  description:
    "LOKR is your own encrypted information locker. Private messaging for files and ideas you would not put in Google, Microsoft, Apple, or Samsung mail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
