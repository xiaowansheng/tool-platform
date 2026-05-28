"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <select
      className="locale-switcher"
      defaultValue={locale}
      onChange={onChange}
      disabled={isPending}
      aria-label={t("label")}
      style={{
        background: "var(--surface-elevated, #fff)",
        border: "1px solid var(--border-subtle, #e5e7eb)",
        borderRadius: 6,
        padding: "0.3rem 0.5rem",
        fontSize: "0.8rem",
        color: "var(--text-primary, #111)",
        cursor: "pointer",
        width: "100%"
      }}
    >
      <option value="zh">{t("zh")}</option>
      <option value="en">{t("en")}</option>
    </select>
  );
}
