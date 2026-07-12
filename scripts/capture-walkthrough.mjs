import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
const root = process.cwd();
const walkthroughDir = path.join(root, "public", "walkthrough");
const socialImage = path.join(root, "public", "adherence-os-live-twin.jpg");

await mkdir(walkthroughDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

async function capture(name) {
  await page.screenshot({
    path: path.join(walkthroughDir, name),
    type: "jpeg",
    quality: 92,
    fullPage: false
  });
  console.log(`captured ${name}`);
}

async function resetDemo() {
  await page.getByLabel("Open resources", { exact: true }).click();
  await page.getByRole("button", { name: "Reset demo session", exact: true }).click();
  await page.getByRole("button", { name: "Load coaching case", exact: true }).waitFor();
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Maya Patel", level: 1 }).waitFor();
  await capture("01-live-twin-coaching.jpg");
  await copyFile(path.join(walkthroughDir, "01-live-twin-coaching.jpg"), socialImage);

  await page.getByRole("button", { name: "Attribution", exact: true }).click();
  await page.locator('[data-node-id="nausea"]').click();
  await page.locator(".selected-evidence h3").getByText("Nausea burden", { exact: true }).waitFor();
  await capture("02-attribution-driver.jpg");

  await page.locator('[data-node-id="intervention-meal"]').click();
  await page.locator(".selected-evidence h3").getByText("Meal-timing prompt", { exact: true }).waitFor();
  await capture("03-bounded-support-route.jpg");

  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await capture("04-safety-escalation.jpg");

  await page.getByRole("button", { name: "Review handoff draft", exact: true }).click();
  await page.getByRole("heading", { name: "1 draft to review" }).waitFor();
  await capture("05-clinician-handoff-review.jpg");

  await resetDemo();
  await page.getByRole("button", { name: "Check-in", exact: true }).click();
  await page.getByRole("button", { name: "Review care plan", exact: true }).waitFor();
  await capture("06-patient-check-in.jpg");

  await page.getByRole("button", { name: "Decision map", exact: true }).click();
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("button", { name: "Model record", exact: true }).click();
  await page.getByRole("heading", { name: "Attribution and sensitivity withheld" }).waitFor();
  await capture("07-model-evidence.jpg");

  await resetDemo();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("button", { name: "Load coaching case", exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture("08-mobile-live-twin.jpg");

  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture("09-mobile-safety-escalation.jpg");
} finally {
  await browser.close();
}
