import { DemoApp } from "@/components/DemoApp";

export const metadata = {
  title: "Try LOKR",
  description: "A sample of the app. Not a locker.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoApp />;
}
