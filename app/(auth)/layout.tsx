import { BrandMark } from "@/components/BrandMark";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2 text-center">
          <BrandMark size="lg" />
          <p className="text-lg text-muted-foreground">
            A locked side channel for proprietary work. Not company email.
          </p>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-12">{children}</main>
    </div>
  );
}
