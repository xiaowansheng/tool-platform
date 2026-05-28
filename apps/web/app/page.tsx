import { CategoryPanel } from "@/components/category-panel";
import { ToolCard } from "@/components/tool-card";
import { Topbar } from "@/components/topbar";
import { categories, getAllTools, getFeaturedTools } from "@tool-platform/tool-sdk";

export default function HomePage() {
  const allTools = getAllTools();
  const featuredTools = getFeaturedTools();

  return (
    <>
      <Topbar title="Tool Platform" subtitle="Browser Tool OS 的第一阶段骨架，先把工具入口、分类与搜索跑通。" />
      <div className="content-stack">
        <section className="hero">
          <span className="pill">Phase One</span>
          <h2>把工具当成插件，而不是普通页面。</h2>
          <p>
            当前实现按仓库文档先完成平台骨架、Manifest 自动注册、动态工具路由、分类系统、搜索系统以及
            `simple` 工具示例，后续再向 Worker / WASM / AI Runtime 推进。
          </p>
          <div className="hero__stats">
            <article className="stat-card">
              <strong>{allTools.length}</strong>
              <span>已注册工具</span>
            </article>
            <article className="stat-card">
              <strong>{categories.length}</strong>
              <span>推荐分类</span>
            </article>
            <article className="stat-card">
              <strong>{featuredTools.length}</strong>
              <span>精选入口</span>
            </article>
          </div>
        </section>

        <CategoryPanel />

        <section className="stat-card">
          <div className="section-header">
            <div>
              <h2>快捷工具</h2>
              <p>首页优先给出可直接进入的工具入口，而不是营销文案。</p>
            </div>
          </div>
          <div className="card-grid">
            {featuredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
