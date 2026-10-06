import type { Metadata } from "next";
import { getLang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "NomadCare OS",
  description: "NomadCare back office",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
