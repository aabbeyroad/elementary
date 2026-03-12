import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elementary Care Planner",
  description: "Shared care planning for working parents with early elementary kids.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
