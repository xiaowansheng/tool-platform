"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { categories, getAllTools, type ToolManifest } from "@tool-platform/tool-sdk";

import { Link, useRouter } from "@/i18n/navigation";
import { COMMON_TOOLS_CATEGORY_ID, FAVORITE_TOOLS_CATEGORY_ID } from "@/lib/common-tools";
import { CommonToolsSidebarLink, FavoriteToolsSidebarLink } from "./common-tools";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNavigation } from "./mobile-navigation";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";
import { SiteVisitTracker } from "./visit-tracking";
import { WorkspaceTabs, type WorkspaceTabDefinition } from "./workspace-tabs";

const HOME_SEARCH_INPUT_ID = "home-search-input";

function SidebarContent({ tools }: { tools: ToolManifest[] }) {
  const t = useTranslations("layout");
  const ct = useTranslations("categories");
  const githubRepoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "https://github.com/xiaowansheng/tool-platform";

  return (
    <>
      <div className="sidebar__brand">
        <div className="sidebar__brand-header">
          <span className="sidebar__brand-icon">
            <img src="/icon.svg" alt="Tool Platform" width="20" height="20" />
          </span>
          <span className="pill pill--brand">Tool OS</span>
        </div>
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
        <a
          className="sidebar__link"
          href={githubRepoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={t("githubLabel")}
        >
          <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>{t("githubLabel")}</span>
        </a>
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
  const router = useRouter();
  const tools = getAllTools();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const workspaceTabs: WorkspaceTabDefinition[] = [
    { id: "/", name: t("home"), kind: "home" },
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select") {
          return;
        }
      }

      event.preventDefault();

      const input = document.getElementById(HOME_SEARCH_INPUT_ID);
      if (input instanceof HTMLInputElement) {
        if (window.location.hash !== "#search") {
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}#search`
          );
        }
        input.focus();
        input.select();
        return;
      }

      router.push("/#search");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className={`app-shell${sidebarCollapsed ? " app-shell--sidebar-collapsed" : ""}`}>
      <aside className={`sidebar sidebar--desktop${sidebarCollapsed ? " sidebar--collapsed" : ""}`}>
        <SidebarContent tools={tools} />
      </aside>

      <button
        className="sidebar-toggle"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <MobileNavigation>
        <SidebarContent tools={tools} />
      </MobileNavigation>

      <main className="main">
        <div className="main__content">
          <WorkspaceTabs availableTabs={workspaceTabs}>{children}</WorkspaceTabs>
        </div>
        <SiteFooter />
      </main>
      <SiteVisitTracker />
    </div>
  );
}
