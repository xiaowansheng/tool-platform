import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Topbar } from "@/components/topbar";
import { getCategoryMeta, getToolRecord } from "@tool-platform/tool-sdk";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const record = getToolRecord(slug);

  if (!record) {
    return {
      title: "Tool Not Found"
    };
  }

  return {
    title: `${record.manifest.name} | Tool Platform`,
    description: record.manifest.description
  };
}

export default async function ToolPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = getToolRecord(slug);

  if (!record) {
    notFound();
  }

  const category = getCategoryMeta(record.manifest.category);
  const ToolComponent = record.component;

  return (
    <>
      <Topbar title={record.manifest.name} subtitle="动态工具路由来自自动生成的 Tool Registry。" />
      <div className="tool-page">
        <section className="tool-panel">
          <div className="tool-page__headline">
            <div>
              <p className="eyebrow">{category?.label ?? record.manifest.category}</p>
              <h2>{record.manifest.name}</h2>
              <p>{record.manifest.description}</p>
            </div>
            <span className="pill">{record.manifest.runtime}</span>
          </div>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>Runtime</h3>
              <p>{record.manifest.runtime}</p>
            </article>
            <article className="detail-card">
              <h3>Tags</h3>
              <p>{record.manifest.tags.join(" / ")}</p>
            </article>
            <article className="detail-card">
              <h3>Manifest</h3>
              <p>{record.manifest.id}</p>
            </article>
          </div>
        </section>

        <ToolComponent manifest={record.manifest} />

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
        </section>
      </div>
    </>
  );
}
