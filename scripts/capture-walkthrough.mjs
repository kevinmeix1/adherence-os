import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
const root = process.cwd();
const walkthroughDir = path.join(root, "public", "walkthrough");
const documentationDir = path.join(root, "docs", "screenshots", "adherence-os");
const socialImage = path.join(root, "public", "adherence-os-live-twin.png");

await mkdir(walkthroughDir, { recursive: true });
await mkdir(documentationDir, { recursive: true });

const browser = await chromium.launch({ headless: process.env.CAPTURE_HEADLESS === "1" });
const context = await browser.newContext({ deviceScaleFactor: 1 });
let page;

async function settleVisualState() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function capture(name) {
  await settleVisualState();
  const publicPath = path.join(walkthroughDir, name);
  await page.screenshot({
    path: publicPath,
    type: "png",
    fullPage: false
  });
  await copyFile(publicPath, path.join(documentationDir, name));
  console.log(`captured ${name}`);
}

async function openFreshDemo(viewport = { width: 1280, height: 720 }) {
  const previousPage = page;
  page = await context.newPage();
  await page.setViewportSize(viewport);
  await previousPage?.close();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        scroll-behavior: auto !important;
        transition: none !important;
      }

      .graph-first-shell .product-nav .nav-button,
      .graph-evidence-panel .graph-node {
        transition: none !important;
      }

      .graph-first-shell .product-nav .nav-button.active {
        box-shadow: none !important;
      }

      .graph-evidence-panel .graph-node:hover,
      .graph-evidence-panel .graph-node:focus-visible {
        transform: none !important;
      }
    `
  });
  await page.getByRole("heading", { name: "Maya Patel", level: 1 }).waitFor();
}

try {
  await openFreshDemo();
  await capture("01-live-twin-coaching.png");
  await copyFile(path.join(walkthroughDir, "01-live-twin-coaching.png"), socialImage);

  await openFreshDemo();
  await page.getByRole("button", { name: "Attribution", exact: true }).click();
  await page.locator('[data-node-id="nausea"]').click();
  await page.locator(".selected-evidence h3").getByText("Nausea burden", { exact: true }).waitFor();
  await capture("02-attribution-driver.png");

  await openFreshDemo();
  await page.getByRole("button", { name: "Attribution", exact: true }).click();
  await page.locator('[data-node-id="intervention-meal"]').click();
  await page.locator(".selected-evidence h3").getByText("Meal-timing prompt", { exact: true }).waitFor();
  await capture("03-bounded-support-route.png");

  await openFreshDemo();
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await capture("04-safety-escalation.png");

  await openFreshDemo();
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await page.getByRole("button", { name: "Review handoff draft", exact: true }).click();
  await page.getByRole("heading", { name: "1 draft to review" }).waitFor();
  await capture("05-clinician-handoff-review.png");

  await openFreshDemo();
  await page.getByRole("button", { name: "Check-in", exact: true }).click();
  await page.getByRole("button", { name: "Review care plan", exact: true }).waitFor();
  await capture("06-patient-check-in.png");

  await openFreshDemo();
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await page.getByRole("button", { name: "Model record", exact: true }).click();
  await page.getByRole("heading", { name: "Attribution and sensitivity withheld" }).waitFor();
  await capture("07-model-evidence.png");

  await openFreshDemo({ width: 320, height: 700 });
  await page.getByRole("button", { name: "Load coaching case", exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture("08-mobile-live-twin.png");

  await openFreshDemo({ width: 320, height: 700 });
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("heading", { name: "Call NHS 111 now" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture("09-mobile-safety-escalation.png");
} finally {
  await browser.close();
}
