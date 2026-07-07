import assert from "node:assert/strict";

import { formatDisplayDate } from "./formatting.js";

assert.match(formatDisplayDate("2026-04-23T00:00:00.000Z"), /2026/);
console.log("web-public formatting test passed");
