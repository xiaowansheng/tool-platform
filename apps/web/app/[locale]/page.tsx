import { HomeSearchExperience } from "@/components/home-search-experience";
import { Topbar } from "@/components/topbar";
import { getAllTools } from "@tool-platform/tool-sdk";

function getInitialQuery(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.q;

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const allTools = getAllTools();
  const resolvedSearchParams = await searchParams;

  return (
    <>
      <Topbar title="Tool Platform" searchHref={null} />
      <HomeSearchExperience initialQuery={getInitialQuery(resolvedSearchParams)} tools={allTools} />
    </>
  );
}
