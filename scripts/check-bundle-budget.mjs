import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const manifestPath = new URL("../.next/app-build-manifest.json", import.meta.url);
const buildDirectory = new URL("../.next/", import.meta.url);
const budgetKb = Number(process.env.HOME_BUNDLE_BUDGET_KB ?? 155);

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  throw new Error("HOME_BUNDLE_BUDGET_KB must be a positive number");
}

let manifest;

try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (error) {
  throw new Error("Unable to read the production bundle manifest. Run pnpm build first.", { cause: error });
}

const routeFiles = [...(manifest.pages?.["/layout"] ?? []), ...(manifest.pages?.["/page"] ?? [])];
const javascriptFiles = [...new Set(routeFiles.filter((file) => file.endsWith(".js")))];

if (javascriptFiles.length === 0) {
  throw new Error("The production manifest did not contain JavaScript for the home route");
}

const chunks = await Promise.all(
  javascriptFiles.map(async (file) => {
    const bytes = await readFile(new URL(file, buildDirectory));
    return { file, gzipBytes: gzipSync(bytes).byteLength };
  })
);

const totalBytes = chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0);
const budgetBytes = budgetKb * 1000;
const totalKb = totalBytes / 1000;
const headroomKb = (budgetBytes - totalBytes) / 1000;

console.log(
  `home first-load JS: ${totalKb.toFixed(1)} kB gzip / ${budgetKb.toFixed(1)} kB budget ` +
    `(${headroomKb.toFixed(1)} kB headroom)`
);

if (totalBytes > budgetBytes) {
  const largestChunks = chunks
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
    .slice(0, 5)
    .map((chunk) => `${(chunk.gzipBytes / 1000).toFixed(1)} kB ${chunk.file}`)
    .join("\n");

  throw new Error(`Home first-load JavaScript exceeds the bundle budget. Largest chunks:\n${largestChunks}`);
}
