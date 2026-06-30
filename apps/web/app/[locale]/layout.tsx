import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { Inter, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { PlatformShell } from "@/components/platform-shell";
import { ThemeSync } from "@/components/theme-sync";
import { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, DEFAULT_DESCRIPTION_EN } from "@/lib/seo-metadata";
import { routing } from "@/i18n/routing";

import "../globals.css";

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

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: isZh ? DEFAULT_DESCRIPTION : DEFAULT_DESCRIPTION_EN,
    icons: {
      icon: "/icon.svg",
      apple: "/icon.svg",
    },
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: isZh ? "zh_CN" : "en_US",
      images: [
        {
          url: "/icon.svg",
          width: 512,
          height: 512,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/icon.svg"],
    },
    alternates: {
      languages: {
        zh: `${SITE_URL}/zh`,
        en: `${SITE_URL}/en`,
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`
          }}
        />
      </head>
      <body className={`${inter.variable} ${notoSansSc.variable} ${jetbrainsMono.variable}`}>
        <ThemeSync />
        <NextIntlClientProvider messages={messages}>
          <PlatformShell>{children}</PlatformShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
