import type { ReactNode } from "react";

import Link from "next/link";

import { categories, getAllTools } from "@tool-platform/tool-sdk";

export function PlatformShell({ children }: { children: ReactNode }) {
  const tools = getAllTools();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="pill">Tool OS</span>
          <strong>Tool Platform</strong>
          <p>面向插件化工具的浏览器工作台，优先实现文档中的第一阶段能力。</p>
        </div>
        <nav className="sidebar__section">
          <Link className="sidebar__link" href="/">
            <span>首页</span>
            <span>{tools.length}</span>
          </Link>
          <Link className="sidebar__link" href="/search">
            <span>搜索</span>
            <span>⌘K</span>
          </Link>
        </nav>
        <div className="sidebar__section">
          {categories.map((category) => {
            const count = tools.filter((tool) => tool.category === category.id).length;

            return (
              <Link key={category.id} className="sidebar__link" href={`/categories/${category.id}`}>
                <span>{category.label}</span>
                <span>{count}</span>
              </Link>
            );
          })}
        </div>
        <div className="sidebar__footer">
          <p>阶段聚焦：平台骨架、Manifest、动态路由、分类与搜索。</p>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
