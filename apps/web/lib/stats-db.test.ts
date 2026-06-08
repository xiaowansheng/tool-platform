import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { closeDb, getVisitCountForTargets, incrementVisit } from "./stats-db";

test("getVisitCountForTargets returns 0 for an empty target list", () => {
  assert.equal(getVisitCountForTargets([]), 0);
});

test("getVisitCountForTargets sums only the requested targets", () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-platform-stats-"));
  const previousDataDir = process.env.TOOL_PLATFORM_DATA_DIR;
  process.env.TOOL_PLATFORM_DATA_DIR = dataDir;
  closeDb();

  try {
    incrementVisit("tool:json-formatter");
    incrementVisit("tool:json-formatter");
    incrementVisit("tool:hash-generator");
    incrementVisit("tool:ignored");

    assert.equal(getVisitCountForTargets(["tool:json-formatter", "tool:hash-generator"]), 3);
  } finally {
    closeDb();
    if (previousDataDir === undefined) {
      delete process.env.TOOL_PLATFORM_DATA_DIR;
    } else {
      process.env.TOOL_PLATFORM_DATA_DIR = previousDataDir;
    }
    fs.rmSync(dataDir, { force: true, recursive: true });
  }
});
