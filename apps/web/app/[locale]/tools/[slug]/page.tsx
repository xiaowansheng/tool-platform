import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

import { ToolClientLoader } from "@/components/tool-client-loader";
import { Topbar } from "@/components/topbar";
import { ToolRuntimeCard } from "@/components/tool-runtime-card";
import { getCategoryMeta, getToolManifest } from "@tool-platform/tool-sdk";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manifest = getToolManifest(slug);

  if (!manifest) {
    return {
      title: "Tool Not Found"
    };
  }

  return {
    title: `${manifest.name} | Tool Platform`,
    description: manifest.description
  };
}

export default async function ToolPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const manifest = getToolManifest(slug);

  if (!manifest) {
    notFound();
  }

  const category = getCategoryMeta(manifest.category);

  return <ToolPageContent manifest={manifest} categoryLabel={category?.label ?? manifest.category} />;
}

function ToolPageContent({ manifest, categoryLabel }: { manifest: NonNullable<ReturnType<typeof getToolManifest>>; categoryLabel: string }) {
  const t = useTranslations("toolPage");
  const ct = useTranslations("categories");

  return (
    <>
      <Topbar title={manifest.name} subtitle={t("subtitle")} />
      <div className="tool-page">
        <section className="tool-panel">
          <div className="tool-page__headline">
            <div>
              <p className="eyebrow">{ct(`${manifest.category}.label`)}</p>
              <h2>{manifest.name}</h2>
              <p>{manifest.description}</p>
            </div>
            <span className="pill pill--runtime" data-runtime={manifest.runtime}>
              {manifest.runtime}
            </span>
          </div>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Runtime</h3>
              <p>{manifest.runtime}</p>
            </article>
            <article className="detail-card">
              <h3>Tags</h3>
              <p>{manifest.tags.join(" / ")}</p>
            </article>
            <article className="detail-card">
              <h3>Manifest</h3>
              <p>{manifest.id}</p>
            </article>
            <article className="detail-card">
              <h3>Worker</h3>
              <p>{manifest.worker ? "enabled" : "not required"}</p>
            </article>
            <article className="detail-card">
              <h3>Permissions</h3>
              <p>{manifest.permissions?.join(" / ") ?? "none"}</p>
            </article>
          </div>
        </section>

        <ToolClientLoader manifest={manifest} />
        <ToolRuntimeCard manifest={manifest} />
      </div>
    </>
  );
}
