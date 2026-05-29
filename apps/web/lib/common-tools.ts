export const COMMON_TOOLS_CATEGORY_ID = "common-tools";
export const LOCAL_TOOL_CATEGORY_COUNT = 1;

export interface CommonToolRecord {
  id: string;
  usedAt: number;
  useCount: number;
}

const COMMON_TOOLS_STORAGE_KEY = "tool-platform:common-tools:v1";
const COMMON_TOOLS_STORAGE_EVENT = "tool-platform:common-tools-updated";
const MAX_COMMON_TOOLS = 24;

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeRecords(value: unknown): CommonToolRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const records: CommonToolRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<CommonToolRecord>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";

    if (!id || seen.has(id)) {
      continue;
    }

    const usedAt = Number.isFinite(candidate.usedAt) ? Number(candidate.usedAt) : 0;
    const useCount = Number.isFinite(candidate.useCount) ? Number(candidate.useCount) : 1;

    records.push({
      id,
      usedAt: Math.max(0, usedAt),
      useCount: Math.max(1, Math.floor(useCount))
    });
    seen.add(id);
  }

  return sortCommonToolRecords(records).slice(0, MAX_COMMON_TOOLS);
}

function sortCommonToolRecords(records: CommonToolRecord[]) {
  return [...records].sort((a, b) => b.useCount - a.useCount || b.usedAt - a.usedAt);
}

function notifyCommonToolsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COMMON_TOOLS_STORAGE_EVENT));
}

export function readCommonToolRecords(): CommonToolRecord[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(COMMON_TOOLS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    return normalizeRecords(JSON.parse(rawValue));
  } catch {
    return [];
  }
}

export function writeCommonToolRecords(records: CommonToolRecord[]) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      COMMON_TOOLS_STORAGE_KEY,
      JSON.stringify(sortCommonToolRecords(records).slice(0, MAX_COMMON_TOOLS))
    );
    notifyCommonToolsChanged();
  } catch {
    // Ignore private mode and quota failures; common tools are an optional local shortcut.
  }
}

export function recordCommonToolUsage(toolId: string, usedAt = Date.now()) {
  const id = toolId.trim();

  if (!id) {
    return;
  }

  const records = readCommonToolRecords();
  const currentRecord = records.find((record) => record.id === id);
  const nextRecords = currentRecord
    ? records.map((record) =>
        record.id === id
          ? {
              ...record,
              usedAt,
              useCount: record.useCount + 1
            }
          : record
      )
    : [
        {
          id,
          usedAt,
          useCount: 1
        },
        ...records
      ];

  writeCommonToolRecords(nextRecords);
}

export function removeCommonTool(toolId: string) {
  writeCommonToolRecords(readCommonToolRecords().filter((record) => record.id !== toolId));
}

export function clearCommonTools() {
  writeCommonToolRecords([]);
}

export function subscribeCommonTools(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function onStorage(event: StorageEvent) {
    if (event.key === COMMON_TOOLS_STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener(COMMON_TOOLS_STORAGE_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(COMMON_TOOLS_STORAGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
