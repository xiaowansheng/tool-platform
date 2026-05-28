"use client";

import type { MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNavigation({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

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

      <header className="mobile-topbar">
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
