import { useTranslations } from "next-intl";

import { SearchSurface } from "@/components/search-surface";
import { Topbar } from "@/components/topbar";
import { getAllTools } from "@tool-platform/tool-sdk";

export default function SearchPage() {
  const t = useTranslations("searchPage");

  return (
    <>
      <Topbar title="Search Workspace" subtitle={t("subtitle")} />
      <div className="content-stack">
        <SearchSurface tools={getAllTools()} />
      </div>
    </>
  );
}
