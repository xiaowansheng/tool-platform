"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, Home, MoreHorizontal, PanelsTopLeft, Search, Wrench, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { usePathname, useRouter } from "@/i18n/navigation";

export interface WorkspaceTabDefinition {
  id: string;
  name: string;
  kind: "home" | "search" | "category" | "tool";
}

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

const WORKSPACE_TABS_STORAGE_KEY = "tool-platform:workspace-tabs:v2";
const CONTEXT_MENU_WIDTH = 192;
const CONTEXT_MENU_HEIGHT = 176;
const CONTEXT_MENU_EDGE_GAP = 8;

function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
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

function writeStoredTabs(tabs: WorkspaceTabDefinition[]) {
  try {
    window.sessionStorage.setItem(
      WORKSPACE_TABS_STORAGE_KEY,
      JSON.stringify(tabs.map((tab) => tab.id))
    );
  } catch {
    // Tabs still work when browser storage is unavailable.
  }
}

function mergeTabs(...tabGroups: WorkspaceTabDefinition[][]) {
  const seen = new Set<string>();
  const tabs: WorkspaceTabDefinition[] = [];

  for (const tab of tabGroups.flat()) {
    if (!seen.has(tab.id)) {
      tabs.push(tab);
      seen.add(tab.id);
    }
  }

  return tabs;
}

export function WorkspaceTabs({
  availableTabs,
  children
}: {
  availableTabs: WorkspaceTabDefinition[];
  children: ReactNode;
}) {
  const t = useTranslations("workspaceTabs");
  const pathname = usePathname();
  const router = useRouter();
  const pageCacheRef = useRef(new Map<string, ReactNode>());
  const menuRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [tabs, setTabs] = useState<WorkspaceTabDefinition[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [suppressedTabId, setSuppressedTabId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const tabById = useMemo(() => new Map(availableTabs.map((tab) => [tab.id, tab])), [availableTabs]);
  const activeTabId = normalizePathname(pathname);
  const currentTab = tabById.get(activeTabId);
  const currentTabForCache = currentTab && currentTab.id !== suppressedTabId ? currentTab : null;

  if (currentTabForCache && !pageCacheRef.current.has(currentTabForCache.id)) {
    pageCacheRef.current.set(currentTabForCache.id, children);
  }

  const visibleTabs = currentTabForCache ? mergeTabs(tabs, [currentTabForCache]) : tabs;
  const panelTabs =
    currentTab && currentTab.id === suppressedTabId
      ? mergeTabs(visibleTabs, [currentTab])
      : visibleTabs;
  const hasCachedCurrentPage = currentTab ? pageCacheRef.current.has(currentTab.id) : false;

  useEffect(() => {
    const restoredTabs = readStoredTabIds()
      .map((id) => tabById.get(id))
      .filter((tab): tab is WorkspaceTabDefinition => Boolean(tab));

    setTabs((currentTabs) =>
      mergeTabs(
        restoredTabs,
        currentTabs
          .map((tab) => tabById.get(tab.id))
          .filter((tab): tab is WorkspaceTabDefinition => Boolean(tab))
      )
    );
    setStorageReady(true);
  }, [tabById]);

  useEffect(() => {
    if (currentTabForCache) {
      setTabs((currentTabs) => mergeTabs(currentTabs, [currentTabForCache]));
    }
  }, [currentTabForCache]);

  useEffect(() => {
    if (storageReady) {
      writeStoredTabs(tabs);
    }
  }, [storageReady, tabs]);

  useEffect(() => {
    for (const tabId of pageCacheRef.current.keys()) {
      if (!tabs.some((tab) => tab.id === tabId) && tabId !== activeTabId) {
        pageCacheRef.current.delete(tabId);
      }
    }

    if (suppressedTabId && activeTabId !== suppressedTabId) {
      setSuppressedTabId(null);
    }
  }, [activeTabId, suppressedTabId, tabs]);

  useEffect(() => {
    if (currentTab) {
      tabButtonRefs.current.get(currentTab.id)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }, [currentTab, visibleTabs.length]);

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

    if (activeTabId !== tabId) {
      router.push(tabId);
    }
  }

  function removeTabs(tabIds: string[], preferredTabId?: string) {
    const idsToRemove = new Set(tabIds);
    const nextTabs = tabs.filter((tab) => !idsToRemove.has(tab.id));

    if (idsToRemove.has(activeTabId)) {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      const preferredTab = preferredTabId
        ? nextTabs.find((tab) => tab.id === preferredTabId)
        : undefined;
      const fallbackTab =
        preferredTab ??
        nextTabs[Math.min(Math.max(activeIndex, 0), Math.max(nextTabs.length - 1, 0))];

      setSuppressedTabId(activeTabId);
      router.replace(fallbackTab?.id ?? "/");
    }

    for (const tabId of idsToRemove) {
      if (tabId !== activeTabId) {
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
              const active = tab.id === activeTabId;

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
                    <TabIcon kind={tab.kind} />
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
              const tabId = currentTab ? currentTab.id : visibleTabs.at(-1)?.id;

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

      {!currentTab || !hasCachedCurrentPage ? children : null}

      {panelTabs.map((tab) => {
        const cachedPage = pageCacheRef.current.get(tab.id);

        return cachedPage ? (
          <div key={tab.id} className="workspace-tabs__page" hidden={tab.id !== activeTabId}>
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

function TabIcon({ kind }: { kind: WorkspaceTabDefinition["kind"] }) {
  switch (kind) {
    case "home":
      return <Home aria-hidden="true" size={14} strokeWidth={2} />;
    case "search":
      return <Search aria-hidden="true" size={14} strokeWidth={2} />;
    case "category":
      return <Folder aria-hidden="true" size={14} strokeWidth={2} />;
    case "tool":
      return <Wrench aria-hidden="true" size={14} strokeWidth={2} />;
  }
}
