import assert from "node:assert/strict";

globalThis.window = {
  location: {
    protocol: "http:",
    hostname: "localhost",
  },
};

const { resolveApiBaseUrl } = await import("./api.js");

assert.equal(resolveApiBaseUrl(), "http://localhost:8000");
console.log("web-admin api-base test passed");
