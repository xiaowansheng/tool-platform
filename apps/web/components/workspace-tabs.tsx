"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, PanelsTopLeft, Wrench, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { usePathname, useRouter } from "@/i18n/navigation";

interface ToolTabDefinition {
  id: string;
  name: string;
}

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

const WORKSPACE_TABS_STORAGE_KEY = "tool-platform:workspace-tabs:v1";
const CONTEXT_MENU_WIDTH = 192;
const CONTEXT_MENU_HEIGHT = 176;
const CONTEXT_MENU_EDGE_GAP = 8;

function getToolId(pathname: string) {
  const match = pathname.match(/^\/tools\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function readStoredTabIds() {
  try {
    const value = window.sessionStorage.getItem(WORKSPACE_TABS_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredTabs(tabs: ToolTabDefinition[]) {
  try {
    window.sessionStorage.setItem(
      WORKSPACE_TABS_STORAGE_KEY,
      JSON.stringify(tabs.map((tab) => tab.id))
    );
  } catch {
    // Tabs still work when browser storage is unavailable.
  }
}

function mergeTabs(...tabGroups: ToolTabDefinition[][]) {
  const seen = new Set<string>();
  const tabs: ToolTabDefinition[] = [];

  for (const tab of tabGroups.flat()) {
    if (!seen.has(tab.id)) {
      tabs.push(tab);
      seen.add(tab.id);
    }
  }

  return tabs;
}

export function WorkspaceTabs({
  children,
  tools
}: {
  children: ReactNode;
  tools: ToolTabDefinition[];
}) {
  const t = useTranslations("workspaceTabs");
  const pathname = usePathname();
  const router = useRouter();
  const pageCacheRef = useRef(new Map<string, ReactNode>());
  const menuRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [tabs, setTabs] = useState<ToolTabDefinition[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [suppressedToolId, setSuppressedToolId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const toolById = useMemo(() => new Map(tools.map((tool) => [tool.id, tool])), [tools]);
  const activeToolId = getToolId(pathname);
  const currentTool = activeToolId ? toolById.get(activeToolId) : undefined;
  const currentToolForCache = currentTool && currentTool.id !== suppressedToolId ? currentTool : null;

  if (currentToolForCache && !pageCacheRef.current.has(currentToolForCache.id)) {
    pageCacheRef.current.set(currentToolForCache.id, children);
  }

  const visibleTabs = currentToolForCache ? mergeTabs(tabs, [currentToolForCache]) : tabs;
  const panelTabs =
    currentTool && currentTool.id === suppressedToolId
      ? mergeTabs(visibleTabs, [currentTool])
      : visibleTabs;
  const hasCachedCurrentPage = currentTool ? pageCacheRef.current.has(currentTool.id) : false;

  useEffect(() => {
    const restoredTabs = readStoredTabIds()
      .map((id) => toolById.get(id))
      .filter((tab): tab is ToolTabDefinition => Boolean(tab));

    setTabs((currentTabs) => mergeTabs(restoredTabs, currentTabs));
    setStorageReady(true);
  }, [toolById]);

  useEffect(() => {
    if (currentToolForCache) {
      setTabs((currentTabs) => mergeTabs(currentTabs, [currentToolForCache]));
    }
  }, [currentToolForCache]);

  useEffect(() => {
    if (storageReady) {
      writeStoredTabs(tabs);
    }
  }, [storageReady, tabs]);

  useEffect(() => {
    for (const toolId of pageCacheRef.current.keys()) {
      if (!tabs.some((tab) => tab.id === toolId) && toolId !== activeToolId) {
        pageCacheRef.current.delete(toolId);
      }
    }

    if (suppressedToolId && activeToolId !== suppressedToolId) {
      setSuppressedToolId(null);
    }
  }, [activeToolId, suppressedToolId, tabs]);

  useEffect(() => {
    if (activeToolId) {
      tabButtonRefs.current.get(activeToolId)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }, [activeToolId, visibleTabs.length]);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();

    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }

    function closeMenuOnKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeMenuOnKeyDown);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);

    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeMenuOnKeyDown);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
    };
  }, [contextMenu]);

  function closeContextMenu() {
    setContextMenu(null);
  }

  function selectTab(tabId: string) {
    closeContextMenu();

    if (activeToolId !== tabId) {
      router.push(`/tools/${tabId}`);
    }
  }

  function removeTabs(tabIds: string[], preferredToolId?: string) {
    const idsToRemove = new Set(tabIds);
    const nextTabs = tabs.filter((tab) => !idsToRemove.has(tab.id));

    if (activeToolId && idsToRemove.has(activeToolId)) {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeToolId);
      const preferredTab = preferredToolId
        ? nextTabs.find((tab) => tab.id === preferredToolId)
        : undefined;
      const fallbackTab =
        preferredTab ??
        nextTabs[Math.min(Math.max(activeIndex, 0), Math.max(nextTabs.length - 1, 0))];

      setSuppressedToolId(activeToolId);
      router.replace(fallbackTab ? `/tools/${fallbackTab.id}` : "/");
    }

    for (const tabId of idsToRemove) {
      if (tabId !== activeToolId) {
        pageCacheRef.current.delete(tabId);
      }
    }

    setTabs(nextTabs);
    closeContextMenu();
  }

  function openContextMenu(tabId: string, x: number, y: number) {
    setContextMenu({
      tabId,
      x: Math.max(
        CONTEXT_MENU_EDGE_GAP,
        Math.min(x, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_EDGE_GAP)
      ),
      y: Math.max(
        CONTEXT_MENU_EDGE_GAP,
        Math.min(y, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_EDGE_GAP)
      )
    });
  }

  function openMouseContextMenu(event: MouseEvent<HTMLElement>, tabId: string) {
    event.preventDefault();
    openContextMenu(tabId, event.clientX, event.clientY);
  }

  function openKeyboardContextMenu(event: KeyboardEvent<HTMLButtonElement>, tabId: string) {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    openContextMenu(tabId, rect.left, rect.bottom + 4);
  }

  const contextTabIndex = contextMenu
    ? visibleTabs.findIndex((tab) => tab.id === contextMenu.tabId)
    : -1;
  const contextTab = contextTabIndex >= 0 ? visibleTabs[contextTabIndex] : undefined;
  const hasOtherTabs = visibleTabs.length > 1;
  const hasTabsToRight = contextTabIndex >= 0 && contextTabIndex < visibleTabs.length - 1;

  return (
    <>
      <section className="workspace-tabs" aria-label={t("ariaLabel")}>
        <div className="workspace-tabs__list" role="tablist" aria-label={t("ariaLabel")}>
          {visibleTabs.length > 0 ? (
            visibleTabs.map((tab) => {
              const active = tab.id === activeToolId;

              return (
                <div
                  key={tab.id}
                  className={`workspace-tab${active ? " workspace-tab--active" : ""}`}
                  onContextMenu={(event) => openMouseContextMenu(event, tab.id)}
                >
                  <button
                    ref={(button) => {
                      if (button) {
                        tabButtonRefs.current.set(tab.id, button);
                      } else {
                        tabButtonRefs.current.delete(tab.id);
                      }
                    }}
                    type="button"
                    className="workspace-tab__select"
                    role="tab"
                    aria-selected={active}
                    title={tab.name}
                    onClick={() => selectTab(tab.id)}
                    onKeyDown={(event) => openKeyboardContextMenu(event, tab.id)}
                  >
                    <Wrench aria-hidden="true" size={14} strokeWidth={2} />
                    <span>{tab.name}</span>
                  </button>
                  <button
                    type="button"
                    className="workspace-tab__close"
                    aria-label={t("closeTab", { name: tab.name })}
                    title={t("close")}
                    onClick={() => removeTabs([tab.id])}
                  >
                    <X aria-hidden="true" size={13} strokeWidth={2} />
                  </button>
                </div>
              );
            })
          ) : (
            <span className="workspace-tabs__empty">
              <PanelsTopLeft aria-hidden="true" size={15} strokeWidth={2} />
              {t("empty")}
            </span>
          )}
        </div>

        {visibleTabs.length > 0 ? (
          <button
            type="button"
            className="workspace-tabs__menu-trigger"
            aria-label={t("moreActions")}
            title={t("moreActions")}
            onClick={(event) => {
              const tabId = activeToolId && toolById.has(activeToolId) ? activeToolId : visibleTabs.at(-1)?.id;

              if (tabId) {
                const rect = event.currentTarget.getBoundingClientRect();
                openContextMenu(tabId, rect.right - CONTEXT_MENU_WIDTH, rect.bottom + 4);
              }
            }}
          >
            <MoreHorizontal aria-hidden="true" size={17} strokeWidth={2} />
          </button>
        ) : null}
      </section>

      {!currentTool || !hasCachedCurrentPage ? children : null}

      {panelTabs.map((tab) => {
        const cachedPage = pageCacheRef.current.get(tab.id);

        return cachedPage ? (
          <div key={tab.id} className="workspace-tabs__page" hidden={tab.id !== activeToolId}>
            {cachedPage}
          </div>
        ) : null;
      })}

      {contextMenu && contextTab
        ? createPortal(
            <div
              ref={menuRef}
              className="workspace-tab-menu"
              role="menu"
              aria-label={t("contextMenu", { name: contextTab.name })}
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button type="button" role="menuitem" onClick={() => removeTabs([contextTab.id])}>
                {t("close")}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!hasOtherTabs}
                onClick={() =>
                  removeTabs(
                    visibleTabs.filter((tab) => tab.id !== contextTab.id).map((tab) => tab.id),
                    contextTab.id
                  )
                }
              >
                {t("closeOthers")}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!hasTabsToRight}
                onClick={() =>
                  removeTabs(
                    visibleTabs.slice(contextTabIndex + 1).map((tab) => tab.id),
                    contextTab.id
                  )
                }
              >
                {t("closeRight")}
              </button>
              <button
                type="button"
                className="workspace-tab-menu__danger"
                role="menuitem"
                onClick={() => removeTabs(visibleTabs.map((tab) => tab.id))}
              >
                {t("closeAll")}
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
