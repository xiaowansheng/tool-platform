import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";

import { FavoriteToolButton, ToolUsageTracker } from "@/components/common-tools";
import { ToolAppLoader } from "@/components/tool-app-loader";
import { Topbar } from "@/components/topbar";
import { ToolRuntimeCard } from "@/components/tool-runtime-card";
import {
  getPermissionLabels,
  getRuntimeLabel,
  getToolPageGuide,
  getToolPageManifest,
  isZhLocale
} from "@/lib/tool-page-copy";
import { getToolManifest } from "@tool-platform/tool-sdk";

interface ToolRouteParams {
  locale: string;
  slug: string;
  segments?: string[];
}

export async function generateMetadata({
  params
}: {
  params: Promise<ToolRouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifest = getToolManifest(slug);

  if (!manifest) {
    return {
      title: isZhLocale(locale) ? "工具未找到" : "Tool Not Found"
    };
  }

  const pageManifest = getToolPageManifest(manifest, locale);

  return {
    title: `${pageManifest.name} | Tool Platform`,
    description: pageManifest.description
  };
}

export default async function ToolPage({
  params
}: {
  params: Promise<ToolRouteParams>;
}) {
  const { locale, slug } = await params;
  const manifest = getToolManifest(slug);

  if (!manifest) {
    notFound();
  }

  const pageManifest = getToolPageManifest(manifest, locale);

  return <ToolPageContent manifest={pageManifest} locale={locale} />;
}

function ToolPageContent({ manifest, locale }: { manifest: NonNullable<ReturnType<typeof getToolManifest>>; locale: string }) {
  const t = useTranslations("toolPage");
  const ct = useTranslations("categories");
  const guide = getToolPageGuide(manifest, locale);
  const isZh = isZhLocale(locale);
  const runtimeLabel = getRuntimeLabel(manifest.runtime, locale);
  const permissionLabels = getPermissionLabels(manifest.permissions, locale);
  const labels = isZh
    ? {
        runtime: "运行方式",
        tags: "标签",
        manifest: "工具标识",
        worker: "Worker",
        permissions: "权限",
        workerOn: "已启用",
        workerOff: "无需启用",
        noPermissions: "无需额外权限",
        guideEyebrow: "使用指南",
        guideTitle: "开始使用",
        stepsTitle: "使用步骤",
        examplesTitle: "使用例子"
      }
    : {
        runtime: "Runtime",
        tags: "Tags",
        manifest: "Manifest",
        worker: "Worker",
        permissions: "Permissions",
        workerOn: "enabled",
        workerOff: "not required",
        noPermissions: "none",
        guideEyebrow: "Guide",
        guideTitle: "How to use",
        stepsTitle: "Steps",
        examplesTitle: "Examples"
      };

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
            <div className="tool-page__headline-actions">
              <FavoriteToolButton toolId={manifest.id} toolName={manifest.name} showLabel />
              <span className="pill pill--runtime" data-runtime={manifest.runtime}>
                {runtimeLabel}
              </span>
            </div>
          </div>
          <dl className="detail-grid detail-grid--meta">
            <div className="detail-card detail-card--meta">
              <dt>{labels.runtime}</dt>
              <dd>{runtimeLabel}</dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>{labels.tags}</dt>
              <dd className="detail-card__tags">
                {manifest.tags.map((tag) => (
                  <span className="detail-card__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>{labels.manifest}</dt>
              <dd className="detail-card__mono">{manifest.id}</dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>{labels.worker}</dt>
              <dd>
                <span className={`status-label ${manifest.worker ? "status-label--on" : "status-label--off"}`}>
                  {manifest.worker ? labels.workerOn : labels.workerOff}
                </span>
              </dd>
            </div>
            <div className="detail-card detail-card--meta">
              <dt>{labels.permissions}</dt>
              <dd className="detail-card__tags">
                {permissionLabels.length > 0 ? (
                  permissionLabels.map((permission) => (
                    <span className="detail-card__tag detail-card__tag--perm" key={permission}>
                      {permission}
                    </span>
                  ))
                ) : (
                  <span className="detail-card__tag detail-card__tag--none">{labels.noPermissions}</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {guide ? (
          <section className="tool-panel tool-panel--guide">
            <div className="tool-panel__header">
              <div>
                <p className="eyebrow">{labels.guideEyebrow}</p>
                <h2>{labels.guideTitle}</h2>
              </div>
              <p>{guide.intro}</p>
            </div>
            <div className="tool-guide-grid">
              <article className="detail-card detail-card--guide">
                <h3>{labels.stepsTitle}</h3>
                <ol className="compact-list">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </article>
              <article className="detail-card detail-card--guide">
                <h3>{labels.examplesTitle}</h3>
                <ul className="compact-list">
                  {guide.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>
        ) : null}

        <ToolAppLoader manifest={manifest} locale={locale} />
        <ToolRuntimeCard manifest={manifest} locale={locale} />
      </div>
    </>
  );
}
