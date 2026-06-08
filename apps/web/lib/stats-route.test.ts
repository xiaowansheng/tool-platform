import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { GET } from "../app/api/stats/route";
import { closeDb, incrementVisit } from "./stats-db";

function withStatsDb<T>(fn: () => Promise<T> | T): Promise<T> | T {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-platform-route-stats-"));
  const previousDataDir = process.env.TOOL_PLATFORM_DATA_DIR;
  process.env.TOOL_PLATFORM_DATA_DIR = dataDir;
  closeDb();

  const cleanup = () => {
    closeDb();
    if (previousDataDir === undefined) {
      delete process.env.TOOL_PLATFORM_DATA_DIR;
    } else {
      process.env.TOOL_PLATFORM_DATA_DIR = previousDataDir;
    }
    fs.rmSync(dataDir, { force: true, recursive: true });
  };

  try {
    const result = fn();
    if (result && typeof (result as Promise<T>).then === "function") {
      return (result as Promise<T>).finally(cleanup);
    }
    cleanup();
    return result;
  } catch (error) {
    cleanup();
    throw error;
  }
}

test("stats GET returns 404 for an unknown tool id", async () => {
  await withStatsDb(async () => {
    const response = await GET(new Request("http://localhost/api/stats?type=tool&toolId=missing-tool") as never);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "valid toolId is required" });
  });
});

test("stats GET category includes direct category visits plus tool visits", async () => {
  await withStatsDb(async () => {
    incrementVisit("category:data-tools");
    incrementVisit("tool:json-formatter");
    incrementVisit("tool:json-formatter");
    incrementVisit("tool:hash-generator");

    const response = await GET(new Request("http://localhost/api/stats?type=category&categoryId=data-tools") as never);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { categoryId: "data-tools", visitCount: 3 });
  });
});
