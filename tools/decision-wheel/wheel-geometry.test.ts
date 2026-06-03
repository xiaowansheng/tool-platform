import assert from "node:assert/strict";
import test from "node:test";

import { getWheelGeometry } from "./wheel-geometry.ts";

test("getWheelGeometry never returns a negative radius for undersized canvases", () => {
  assert.equal(getWheelGeometry(0, 0).radius, 0);
  assert.equal(getWheelGeometry(32, 32).radius, 0);
});
