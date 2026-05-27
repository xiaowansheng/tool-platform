import { SearchSurface } from "@/components/search-surface";
import { Topbar } from "@/components/topbar";
import { getAllTools } from "@tool-platform/tool-sdk";

export default function SearchPage() {
  return (
    <>
      <Topbar title="Search Workspace" subtitle="文档强调搜索是核心入口，这里单独给出完整检索页。" />
      <div className="content-stack">
        <SearchSurface tools={getAllTools()} />
      </div>
    </>
  );
}
