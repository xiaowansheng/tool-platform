"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    startTransition(() => {
      const search = window.location.search;
      const hash = window.location.hash;
      router.replace(`${pathname}${search}${hash}`, { locale: next });
    });
  }

  return (
    <select
      className="locale-switcher"
      defaultValue={locale}
      onChange={onChange}
      disabled={isPending}
      aria-label={t("label")}
    >
      <option value="zh">{t("zh")}</option>
      <option value="en">{t("en")}</option>
    </select>
  );
}
