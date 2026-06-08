function normalizePathname(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function stripLocalePrefix(pathname: string, locale: string) {
  const normalizedPathname = normalizePathname(pathname);
  const localePrefix = `/${locale}`;

  if (normalizedPathname === localePrefix) {
    return "/";
  }

  if (normalizedPathname.startsWith(`${localePrefix}/`)) {
    return normalizedPathname.slice(localePrefix.length);
  }

  return normalizedPathname;
}

export function getToolAppLocation(pathname: string, locale: string, toolId: string) {
  const normalizedPathname = stripLocalePrefix(pathname, locale);
  const toolRootPath = `/tools/${toolId}`;

  if (normalizedPathname === toolRootPath) {
    return {
      path: toolRootPath,
      segments: []
    };
  }

  if (normalizedPathname.startsWith(`${toolRootPath}/`)) {
    return {
      path: normalizedPathname,
      segments: normalizedPathname.slice(toolRootPath.length + 1).split("/").filter(Boolean)
    };
  }

  return {
    path: toolRootPath,
    segments: []
  };
}
