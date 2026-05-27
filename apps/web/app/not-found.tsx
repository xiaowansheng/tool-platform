import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-state">
      <strong>没有找到对应页面或工具</strong>
      <p>检查 slug 是否存在，或者回到首页查看当前已经注册的工具。</p>
      <Link className="button-link" href="/">
        返回首页
      </Link>
    </section>
  );
}
