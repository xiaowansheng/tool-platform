import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { PlatformShell } from "@/components/platform-shell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-cjk"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Tool Platform",
  description: "基于 Manifest、分类、搜索与动态路由的工具平台第一阶段实现。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${notoSansSc.variable} ${jetbrainsMono.variable}`}>
        <PlatformShell>{children}</PlatformShell>
      </body>
    </html>
  );
}
