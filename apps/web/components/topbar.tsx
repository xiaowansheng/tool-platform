import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function Topbar({
  title,
  subtitle,
  searchHref = "/#search"
}: {
  title: string;
  subtitle?: string;
  searchHref?: string | null;
}) {
  const t = useTranslations("topbar");

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span className="pill">Workspace</span>
        <h1>{title}</h1>
        {subtitle && <p className="topbar__subtext">{subtitle}</p>}
      </div>
      <div className="topbar__actions">
        {searchHref ? (
          <Link className="button-link" href={searchHref}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {t("searchTools")}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
