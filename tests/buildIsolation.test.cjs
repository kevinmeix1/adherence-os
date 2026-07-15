const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER
} = require("next/constants");

test("development and production use isolated Next output directories", async () => {
  const { default: getNextConfig } = await import("../next.config.mjs");

  assert.equal(getNextConfig(PHASE_DEVELOPMENT_SERVER).distDir, ".next-dev");
  assert.equal(getNextConfig(PHASE_PRODUCTION_BUILD).distDir, ".next");
  assert.equal(getNextConfig(PHASE_PRODUCTION_SERVER).distDir, ".next");
});

test("application routes emit baseline browser security headers", async () => {
  const { default: getNextConfig } = await import("../next.config.mjs");
  const rules = await getNextConfig(PHASE_PRODUCTION_SERVER).headers();
  const headers = Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));

  assert.equal(rules[0].source, "/:path*");
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["Permissions-Policy"], "camera=(), microphone=(), geolocation=()");
});
