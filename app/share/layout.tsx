import { SaveToHomeProvider } from "@/components/SaveToHome";

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SaveToHomeProvider>{children}</SaveToHomeProvider>;
}
