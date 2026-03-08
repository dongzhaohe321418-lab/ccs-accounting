import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCS \u8bb0\u8d26\u7cfb\u7edf - \u5251\u6865\u4e2d\u56fd\u5b66\u751f\u4f1a",
  description: "\u5251\u6865\u4e2d\u56fd\u5b66\u751f\u4f1a\u8d22\u52a1\u7ba1\u7406\u7cfb\u7edf",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
