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
