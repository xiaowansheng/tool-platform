import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { categories, getAllTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { Link } from "@/i18n/navigation";
import { COMMON_TOOLS_CATEGORY_ID, FAVORITE_TOOLS_CATEGORY_ID } from "@/lib/common-tools";
import { CommonToolsSidebarLink, FavoriteToolsSidebarLink } from "./common-tools";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNavigation } from "./mobile-navigation";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";
import { WorkspaceTabs, type WorkspaceTabDefinition } from "./workspace-tabs";


function SidebarContent({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("layout");
  const ct = useTranslations("categories");

  return (
    <>
      <div className="sidebar__brand">
        <span className="pill">Tool OS</span>
        <strong>Tool Platform</strong>
        <p>{t("sidebarDescription")}</p>
      </div>

      <nav className="sidebar__section">
        <Link className="sidebar__link" href="/">
          <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{t("home")}</span>
          <span className="sidebar__link-count">{tools.length}</span>
        </Link>
        <Link className="sidebar__link" href="/search">
          <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{t("search")}</span>
          <span className="sidebar__link-count">⌘K</span>
        </Link>
      </nav>

      <div className="sidebar__section">
        <CommonToolsSidebarLink />
        <FavoriteToolsSidebarLink />
        {categories.map((category) => {
          const count = tools.filter((tool) => tool.category === category.id).length;
          return (
            <Link key={category.id} className="sidebar__link" href={`/categories/${category.id}`}>
              <span style={{ width: 18, textAlign: "center", fontSize: "0.72rem", opacity: 0.6, flexShrink: 0 }}>
                {category.icon ?? "·"}
              </span>
              <span>{ct(`${category.id}.label`)}</span>
              <span className="sidebar__link-count">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar__footer">
        <ThemeToggle />
        <LocaleSwitcher />
        <p style={{ marginTop: "0.6rem" }}>{t("footerFocus")}</p>
      </div>
    </>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const t = useTranslations("layout");
  const ct = useTranslations("categories");
  const commonToolsT = useTranslations("commonTools");
  const favoriteToolsT = useTranslations("favoriteTools");
  const tools = getAllTools();
  const workspaceTabs: WorkspaceTabDefinition[] = [
    { id: "/", name: t("home"), kind: "home" },
    { id: "/search", name: t("search"), kind: "search" },
    {
      id: `/categories/${COMMON_TOOLS_CATEGORY_ID}`,
      name: commonToolsT("title"),
      kind: "category"
    },
    {
      id: `/categories/${FAVORITE_TOOLS_CATEGORY_ID}`,
      name: favoriteToolsT("title"),
      kind: "category"
    },
    ...categories.map((category) => ({
      id: `/categories/${category.id}`,
      name: ct(`${category.id}.label`),
      kind: "category" as const
    })),
    ...tools.map(({ id, name }) => ({
      id: `/tools/${id}`,
      name,
      kind: "tool" as const
    }))
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar sidebar--desktop">
        <SidebarContent tools={tools} />
      </aside>

      <MobileNavigation>
        <SidebarContent tools={tools} />
      </MobileNavigation>

      <main className="main">
        <div className="main__content">
          <WorkspaceTabs availableTabs={workspaceTabs}>{children}</WorkspaceTabs>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
