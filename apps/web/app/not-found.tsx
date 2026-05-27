import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-state" style={{ marginTop: "3rem" }}>
      <strong style={{ fontSize: "1.4rem" }}>404 — 页面未找到</strong>
      <p>检查 slug 是否存在，或者回到首页查看当前已经注册的工具。</p>
      <Link className="button-link button-link--accent" href="/">
        返回首页
      </Link>
    </section>
  );
}
