import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "돌봄돌봄 - 맞벌이 부모를 위한 돌봄 일정 관리",
  description: "자녀의 하루 일정, 학원, 픽업/드롭오프, 돌봄 공백을 한눈에 파악하고 부부가 함께 관리하세요.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* CDN 프리커넥트로 폰트 로딩 가속 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
