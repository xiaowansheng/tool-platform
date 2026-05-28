import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  return (
    <>
      <Topbar title={manifest.name} subtitle="动态工具路由来自自动生成的 Tool Registry。" />
      <div className="tool-page">
        <section className="tool-panel">
          <div className="tool-page__headline">
            <div>
              <p className="eyebrow">{category?.label ?? manifest.category}</p>
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

        <section className="tool-docs">
          <article>
            <p className="eyebrow">Workspace Layout</p>
            <h3>Input → Processing → Output</h3>
            <p>遵循 UI 文档里强调的工作区结构，优先突出输入、处理与结果区。</p>
          </article>
          <article>
            <p className="eyebrow">Lifecycle</p>
            <h3>Manifest → Registry → Route</h3>
            <p>工具接入后会先注册，再进入分类、搜索和动态工具页面。</p>
          </article>
          <article>
            <p className="eyebrow">Phase Two</p>
            <h3>Runtime → Worker → OPFS</h3>
            <p>重工具开始通过 runtime manager、Worker RPC 和 OPFS 存储脱离主线程执行。</p>
          </article>
        </section>
      </div>
    </>
  );
}
