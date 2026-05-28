import type { ReactNode } from "react";
import Link from "next/link";

import { categories, getAllTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";

const categoryIcons: Record<string, string> = {
  developer: "</>",
  ai: "✦",
  text: "Aa",
  image: "◇",
  video: "▶",
  file: "☰",
  network: "◉",
  ops: "⌘",
  design: "◎",
  productivity: "⚡"
};

function SidebarContent({ tools }: { tools: ToolManifest[] }) {
  return (
    <>
      <div className="sidebar__brand">
        <span className="pill">Tool OS</span>
        <strong>Tool Platform</strong>
        <p>面向插件化工具的浏览器工作台，优先实现文档中的第一阶段能力。</p>
      </div>

      <nav className="sidebar__section">
        <Link className="sidebar__link" href="/">
          <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>首页</span>
          <span className="sidebar__link-count">{tools.length}</span>
        </Link>
        <Link className="sidebar__link" href="/search">
          <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>搜索</span>
          <span className="sidebar__link-count">⌘K</span>
        </Link>
      </nav>

      <div className="sidebar__section">
        {categories.map((category) => {
          const count = tools.filter((tool) => tool.category === category.id).length;
          return (
            <Link key={category.id} className="sidebar__link" href={`/categories/${category.id}`}>
              <span style={{ width: 18, textAlign: "center", fontSize: "0.72rem", opacity: 0.6, flexShrink: 0 }}>
                {categoryIcons[category.id] ?? "·"}
              </span>
              <span>{category.label}</span>
              <span className="sidebar__link-count">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar__footer">
        <ThemeToggle />
        <p style={{ marginTop: "0.6rem" }}>阶段聚焦：平台骨架、Manifest、动态路由、分类与搜索。</p>
      </div>
    </>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const tools = getAllTools();

  return (
    <div className="app-shell">
      <aside className="sidebar sidebar--desktop">
        <SidebarContent tools={tools} />
      </aside>

      <MobileNavigation>
        <SidebarContent tools={tools} />
      </MobileNavigation>

      <main className="main">{children}</main>
    </div>
  );
}
