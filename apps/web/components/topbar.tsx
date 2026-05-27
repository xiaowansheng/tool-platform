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
          搜索工具
        </Link>
        <Link className="button-link" href="/tools/json-formatter">
          打开示例工具
        </Link>
      </div>
    </header>
  );
}
