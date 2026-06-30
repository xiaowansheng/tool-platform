import type { Metadata } from "next";

import { HomeSearchExperience } from "@/components/home-search-experience";
import { Topbar } from "@/components/topbar";
import { isZhLocale } from "@/lib/tool-page-copy";
import { getAllTools } from "@tool-platform/tool-sdk";

import {
  buildSiteJsonLd,
  buildPageMetadata,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_DESCRIPTION_EN,
} from "@/lib/seo-metadata";

function getInitialQuery(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.q;

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = isZhLocale(locale);

  return buildPageMetadata({
    title: SITE_NAME,
    description: isZh ? DEFAULT_DESCRIPTION : DEFAULT_DESCRIPTION_EN,
    locale,
    path: `/${locale}`,
  });
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const allTools = getAllTools();
  const resolvedSearchParams = await searchParams;
  const jsonLd = buildSiteJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Topbar title="Tool Platform" searchHref={null} />
      <HomeSearchExperience initialQuery={getInitialQuery(resolvedSearchParams)} tools={allTools} />
    </>
  );
}
