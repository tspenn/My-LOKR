import type { Metadata } from "next";
import { PRODUCTION_ORIGIN } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_ORIGIN),
  title: {
    default: "My Lokr",
    template: "%s · My Lokr",
  },
  description:
    "Private messaging for files and ideas you would not put in Google, Microsoft, Apple, or Samsung mail. Locked Supabase storage, not email attachments on the open internet.",
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
