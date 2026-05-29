import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

import { ToolUsageTracker } from "@/components/common-tools";
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
      <ToolUsageTracker toolId={manifest.id} />
      <Topbar title={manifest.name} subtitle={t("subtitle")} />
      <div className="tool-page">
        <section className="tool-panel tool-panel--info">
          <div className="tool-page__headline">
            <div className="tool-page__headline-text">
              <p className="eyebrow">{ct(`${manifest.category}.label`)}</p>
              <h2>{manifest.name}</h2>
              <p className="tool-page__desc">{manifest.description}</p>
            </div>
            <span className="pill pill--runtime" data-runtime={manifest.runtime}>
              {manifest.runtime}
            </span>
          </div>
          <dl className="detail-grid detail-grid--meta">
            <div className="detail-card detail-card--meta">
              <dt>Runtime</dt>
              <dd>{manifest.runtime}</dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>Tags</dt>
              <dd>{manifest.tags.join(" / ")}</dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>Manifest</dt>
              <dd className="detail-card__mono">{manifest.id}</dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>Worker</dt>
              <dd>
                <span className={`status-label ${manifest.worker ? "status-label--on" : "status-label--off"}`}>
                  {manifest.worker ? "enabled" : "not required"}
                </span>
              </dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>Permissions</dt>
              <dd>{manifest.permissions?.join(" / ") ?? "none"}</dd>
            </div>
          </dl>
        </section>

        <ToolClientLoader manifest={manifest} />
        <ToolRuntimeCard manifest={manifest} />
      </div>
    </>
  );
}
