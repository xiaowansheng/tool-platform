"use client";

import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const HIDE_AFTER_SCROLL_PX = 56;
const SHOW_AFTER_SCROLL_PX = 40;
const ALWAYS_VISIBLE_SCROLL_TOP_PX = 24;

export function MobileNavigation({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topbarHidden, setTopbarHidden] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollYRef = useRef(0);
  const accumulatedScrollRef = useRef(0);
  const scrollDirectionRef = useRef<"down" | "up" | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const close = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    setTopbarHidden(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        openButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, close]);

  useEffect(() => {
    lastScrollYRef.current = Math.max(window.scrollY, 0);

    function updateTopbarVisibility() {
      animationFrameRef.current = null;

      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(delta) < 1) {
        return;
      }

      const direction = delta > 0 ? "down" : "up";

      if (scrollDirectionRef.current !== direction) {
        scrollDirectionRef.current = direction;
        accumulatedScrollRef.current = 0;
      }

      accumulatedScrollRef.current += Math.abs(delta);
      lastScrollYRef.current = currentScrollY;

      if (currentScrollY <= ALWAYS_VISIBLE_SCROLL_TOP_PX) {
        setTopbarHidden(false);
        return;
      }

      if (direction === "down" && accumulatedScrollRef.current >= HIDE_AFTER_SCROLL_PX) {
        setTopbarHidden(true);
      }

      if (direction === "up" && accumulatedScrollRef.current >= SHOW_AFTER_SCROLL_PX) {
        setTopbarHidden(false);
      }
    }

    function onScroll() {
      if (drawerOpen || animationFrameRef.current !== null) {
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(updateTopbarVisibility);
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawerOpen]);

  function closeAfterNavigation(event: MouseEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("a")) {
      close();
    }
  }

  return (
    <>
      {drawerOpen ? <div className="drawer-overlay" onClick={close} /> : null}

      <aside
        className={`sidebar sidebar--drawer${drawerOpen ? " sidebar--drawer-open" : ""}`}
        aria-hidden={!drawerOpen}
        aria-label="Mobile menu"
        onClick={closeAfterNavigation}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="drawer-close"
          onClick={close}
          aria-label="Close menu"
        >
          <X aria-hidden="true" size={20} strokeWidth={2} />
        </button>
        {children}
      </aside>

      <header className={`mobile-topbar${topbarHidden && !drawerOpen ? " mobile-topbar--hidden" : ""}`}>
        <button
          ref={openButtonRef}
          type="button"
          className="hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-label="Open menu"
        >
          <Menu aria-hidden="true" size={20} strokeWidth={2} />
        </button>
        <strong className="mobile-topbar__title">Tool Platform</strong>
      </header>
    </>
  );
}
