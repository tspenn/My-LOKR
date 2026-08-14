import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Lokr",
    template: "%s · My Lokr",
  },
  description:
    "Private messaging for files and ideas you would not put in Google or Microsoft mail. Locked Supabase storage, not email attachments on the open internet.",
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
