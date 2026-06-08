import assert from "node:assert/strict";
import test from "node:test";

import { getToolAppLocation } from "./tool-app-location";

test("getToolAppLocation strips the locale prefix and returns tool subpath segments", () => {
  assert.deepEqual(getToolAppLocation("/zh/tools/json-formatter/examples/basic", "zh", "json-formatter"), {
    path: "/tools/json-formatter/examples/basic",
    segments: ["examples", "basic"]
  });
});

test("getToolAppLocation falls back to the tool root when the pathname does not match the tool", () => {
  assert.deepEqual(getToolAppLocation("/zh/search", "zh", "json-formatter"), {
    path: "/tools/json-formatter",
    segments: []
  });
});
