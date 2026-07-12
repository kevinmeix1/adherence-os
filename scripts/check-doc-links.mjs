import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const markdownFiles = [path.join(root, "README.md"), ...(await findMarkdown(path.join(root, "docs")))];
const failures = [];
let checkedLinks = 0;

for (const file of markdownFiles) {
  const content = await readFile(file, "utf8");
  const links = content.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g);

  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || rawTarget.startsWith("#") || /^[a-z]+:/i.test(rawTarget)) continue;

    const targetWithoutFragment = rawTarget.split("#", 1)[0].split("?", 1)[0];
    if (!targetWithoutFragment) continue;

    const resolved = path.resolve(path.dirname(file), decodeURIComponent(targetWithoutFragment));
    checkedLinks += 1;

    try {
      await access(resolved);
    } catch {
      failures.push(`${path.relative(root, file)} -> ${rawTarget}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`documentation link check failed with ${failures.length} missing target(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`documentation links: ${checkedLinks} local targets across ${markdownFiles.length} Markdown files`);

async function findMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findMarkdown(entryPath);
      return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
    })
  );
  return files.flat();
}
