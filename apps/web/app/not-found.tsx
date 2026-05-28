import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="empty-state" style={{ marginTop: "3rem" }}>
      <strong style={{ fontSize: "1.4rem" }}>{t("title")}</strong>
      <p>{t("description")}</p>
      <Link className="button-link button-link--accent" href="/">
        {t("backHome")}
      </Link>
    </section>
  );
}
