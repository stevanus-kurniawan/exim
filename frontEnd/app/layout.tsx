import type { Metadata } from "next";
import { getThemeCssVars } from "@/lib/tokens";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "EOS — Exim Operation System",
  description: "Phase 1 Import Operation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeVars = getThemeCssVars();
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
