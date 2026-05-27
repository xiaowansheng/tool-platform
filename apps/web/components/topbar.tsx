import Link from "next/link";

export function Topbar({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        <span className="pill">Workspace</span>
        <h1>{title}</h1>
        <p className="topbar__subtext">{subtitle}</p>
      </div>
      <div className="topbar__actions">
        <Link className="button-link" href="/search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          搜索工具
        </Link>
        <Link className="button-link button-link--accent" href="/tools/json-formatter">
          打开示例
        </Link>
      </div>
    </header>
  );
}
