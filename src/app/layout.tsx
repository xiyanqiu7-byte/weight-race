import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { CoupleProvider } from "@/hooks/useCouple";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-hei",
  display: "swap",
});

export const metadata: Metadata = {
  title: "减脂对战",
  description: "好友减脂比赛 PWA · 先减 5kg 者胜",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "减脂对战",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "减脂对战",
    description: "先减 5kg 者胜 · 一起打卡一起挑衅",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "减脂对战" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "减脂对战",
    description: "先减 5kg 者胜 · 一起打卡一起挑衅",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`h-full ${notoSansSC.variable}`}>
      <body className={`${notoSansSC.className} min-h-full`}>
        <CoupleProvider>
          <div className="app-shell">{children}</div>
        </CoupleProvider>
      </body>
    </html>
  );
}
