import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function monitorRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
}

async function resetDemo(page: Page) {
  await page.getByLabel("Open resources", { exact: true }).click();
  await page.getByRole("button", { name: "Reset demo session", exact: true }).click();
}

test("judged flow survives coaching, escalation, handoff, and reset", async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Maya Patel", level: 1 })).toBeVisible();
  await expect(page.getByText("Demo cases", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load coaching case", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Maya's check-in remains on the coaching path.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Attribution", exact: true }).click();
  const nauseaNode = page.locator('[data-node-id="nausea"]');
  await nauseaNode.click();
  await expect(nauseaNode).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selected-evidence h3")).toHaveText("Nausea burden");
  await expect(page.locator(".graph-relationship-list")).toContainText("raises model risk");

  const hydrationAction = page.locator('[data-node-id="intervention-hydration"]');
  await hydrationAction.focus();
  await page.keyboard.press("Enter");
  await expect(hydrationAction).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".selected-evidence h3")).toHaveText("Hydration nudge");

  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Call NHS 111 now" })).toBeVisible();
  await expect(page.locator(".decision-risk-score strong")).toHaveText("Abstained");
  await expect(page.getByText("Suppressed", { exact: true })).toBeVisible();
  await expect(page.locator('[data-node-id^="intervention-"]:not([aria-hidden="true"])')).toHaveCount(0);
  await expect(page.locator(".graph-relationship-list")).not.toContainText(/nudge|prompt/i);

  await page.getByRole("button", { name: "Review handoff draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Review drafts", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("In-memory only", { exact: true })).toBeVisible();
  await expect(page.getByText("Not sent", { exact: true })).toBeVisible();
  await expect(page.locator("#main-workspace")).toBeFocused();

  await resetDemo(page);
  await expect(page.getByRole("button", { name: "Decision map", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Load coaching case", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Maya's check-in remains on the coaching path.", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(runtimeErrors).toEqual([]);
});

test("keyboard changes announce safety state from every workspace", async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);
  await page.goto("/");

  const status = page.getByRole("status");
  await expect(status).toHaveCount(1);
  const escalation = page.getByRole("button", { name: "Load safety case", exact: true });
  await escalation.focus();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("Call NHS 111 now");
  await expect(status).toContainText("Risk level: Urgent");

  await page.getByRole("button", { name: "Check-in", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-workspace")).toBeFocused();

  const overdoseFlag = page.getByRole("checkbox", { name: "Possible overdose or poisoning" });
  await overdoseFlag.focus();
  await page.keyboard.press("Space");
  await expect(overdoseFlag).toBeChecked();
  await expect(page.getByLabel("Custom check-in")).toBeVisible();
  await expect(status).toContainText("Call 999 or go to A&E now");
  expect(runtimeErrors).toEqual([]);
});

test("patient switches preserve independent scenario and local review state", async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Call NHS 111 now" })).toBeVisible();
  await page.getByRole("button", { name: "Select James O'Connor", exact: true }).click();
  await expect(page.getByText("James's check-in remains on the coaching path.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Review drafts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 draft to review" })).toBeVisible();
  await expect(page.locator(".queue-item")).toHaveCount(1);
  const mayaQueueItem = page.locator(".queue-item").filter({ hasText: "Maya Patel" });
  await expect(mayaQueueItem).toContainText("Urgent");
  await mayaQueueItem.click();
  await expect(page.getByText("In-memory only", { exact: true })).toBeVisible();
  await expect(page.getByText("Not sent", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Decision map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Load safety case", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Call NHS 111 now" })).toBeVisible();

  await resetDemo(page);
  await page.getByRole("button", { name: "Review drafts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "0 drafts to review" })).toBeVisible();
  await expect(page.locator(".queue-item")).toHaveCount(0);
  await expect(page.getByText("No drafts waiting", { exact: true })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("model record exposes synthetic operating trade-offs and marginal bounds", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Model record", exact: true }).click();

  await expect(page.locator(".metric").filter({ hasText: "Test recall" })).toContainText("80%");
  await expect(page.locator(".metric").filter({ hasText: "Test precision" })).toContainText("32%");
  await expect(page.locator(".metric").filter({ hasText: "Rows flagged" })).toContainText("42%");
  await expect(page.locator(".model-support-status")).toHaveText("Marginal bounds passed");
  await expect(page.getByText(/Joint-distribution and semantic drift are not detected/i)).toBeVisible();
  await expect(page.getByText("Held-out synthetic calibration", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Decision map", exact: true }).click();
  await page.getByRole("button", { name: "Load safety case", exact: true }).click();
  await page.getByRole("button", { name: "Model record", exact: true }).click();
  await expect(page.locator(".model-support-status")).toHaveText("Marginal bounds exceeded");
  await expect(page.getByRole("heading", { name: "Attribution and sensitivity withheld" })).toBeVisible();
  await expect(page.getByText("Outside marginal feature bounds", { exact: true })).toBeVisible();
});

test("narrow coaching and escalation preserve safe reading order", async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 700 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page);

    const coachingCase = page.getByRole("button", { name: "Load coaching case", exact: true });
    const safetyCase = page.getByRole("button", { name: "Load safety case", exact: true });
    for (const control of [coachingCase, safetyCase]) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    const graphPanel = page.locator(".graph-evidence-panel");
    const inspector = page.locator(".graph-inspector");
    const coachingGraph = await graphPanel.boundingBox();
    const coachingInspector = await inspector.boundingBox();
    expect(coachingGraph?.y).toBeLessThan(coachingInspector?.y ?? 0);

    const contextIsClipped = await page.locator(".decision-summary").evaluate(
      (element) => element.scrollHeight > element.clientHeight + 1
    );
    expect(contextIsClipped).toBe(false);

    await safetyCase.click();
    await expect(page.getByRole("heading", { name: "Call NHS 111 now" })).toBeVisible();
    const escalationGraph = await graphPanel.boundingBox();
    const escalationInspector = await inspector.boundingBox();
    expect(escalationInspector?.y).toBeLessThan(escalationGraph?.y ?? 0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Review handoff draft", exact: true }).click();
    await expect(page.getByRole("heading", { name: "1 draft to review" })).toBeVisible();
    await expect(page.getByText("In-memory only", { exact: true })).toBeVisible();
    await expect(page.getByText("Not sent", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "Check-in", exact: true }).click();
    await expect(page.getByRole("group", { name: "Symptoms needing urgent help now" }).getByRole("checkbox")).toHaveCount(8);
    const reviewCarePlan = page.getByRole("button", { name: "Review care plan", exact: true });
    const reviewBox = await reviewCarePlan.boundingBox();
    expect(reviewBox?.y).toBeGreaterThanOrEqual(0);
    expect((reviewBox?.y ?? 0) + (reviewBox?.height ?? 0)).toBeLessThanOrEqual((width === 390 ? 844 : 700) + 1);
    if (width === 390) {
      await reviewCarePlan.click();
      await expect(page.locator(".generation-notice")).toContainText("deterministic local safety engine");
    }
    await expectNoHorizontalOverflow(page);
  }

  expect(runtimeErrors).toEqual([]);
});

test("core care states have no serious or critical automated accessibility violations", async ({ page }) => {
  await page.goto("/");

  const states: Array<[string, () => Promise<void>]> = [
    ["Decision map Coaching", async () => {}],
    ["Decision map Safety case", async () => {
      await page.getByRole("button", { name: "Load safety case", exact: true }).click();
    }],
    ["Review drafts", async () => {
      await page.getByRole("button", { name: "Review handoff draft", exact: true }).click();
    }],
    ["Check-in", async () => {
      await page.getByRole("button", { name: "Check-in", exact: true }).click();
    }]
  ];

  for (const [name, enterState] of states) {
    await enterState();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const severeViolations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    expect(severeViolations, name).toEqual([]);
  }
});
