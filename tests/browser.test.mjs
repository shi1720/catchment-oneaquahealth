import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.CATCHMENT_TEST_URL ?? "http://localhost:5173";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CATCHMENT_BROWSER_CHANNEL || undefined,
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Inspect Foundry outfall/ }).waitFor();
await page.screenshot({ path: "test-results/catchment-overview-screen.png" });
await page
  .getByRole("button", { name: "Record observation", exact: true })
  .click();
await page
  .getByLabel("Describe the observation")
  .fill(
    "Demonstration: grey water and an unusual smell observed from the public path.",
  );
await page.getByLabel("Dissolved oxygen mg/L", { exact: true }).fill("3.8");
await page.getByLabel("pH 0–14", { exact: true }).fill("7.4");
await page.getByLabel("Turbidity NTU", { exact: true }).fill("65");
assert.ok(
  await page
    .getByText(
      "Clear appearance and high turbidity disagree. Recheck the entry.",
      { exact: true },
    )
    .isVisible(),
);
await page.getByRole("combobox", { name: "Water appearance" }).click();
await page.getByRole("option", { name: /Cloudy/ }).click();
await page
  .getByRole("combobox", { name: "Odour noticed from the bank" })
  .click();
await page.getByRole("option", { name: "Sewage-like" }).click();
await page
  .getByRole("checkbox", {
    name: "I checked instrument calibration for these readings",
  })
  .check();
await page.screenshot({
  path: "test-results/catchment-observation.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Save for human review" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Observation saved" })
  .waitFor();
const report = page
  .locator(".report")
  .filter({ hasText: "Demonstration: grey water" });
await report
  .getByLabel("Review rationale")
  .fill(
    "Units and timestamp checked in the demonstration. Confirmed for field triage; cause remains unknown.",
  );
await report.getByRole("button", { name: "Confirm evidence" }).click();
await page.getByRole("status").filter({ hasText: "Review saved" }).waitFor();
await page.getByRole("tab", { name: "Field missions", exact: true }).click();
assert.equal(await page.locator(".plan-site").count(), 2);
assert.ok(
  (await page.locator(".plan-site").allTextContents()).some((x) =>
    x.includes("Foundry outfall"),
  ),
);
assert.ok(
  (await page.locator(".plan-site").allTextContents()).some((x) =>
    x.includes("School reach"),
  ),
);
await page.getByRole("button", { name: "1 visit", exact: true }).click();
assert.equal(await page.locator(".plan-site").count(), 1);
await page.getByRole("button", { name: "2 visits", exact: true }).click();
await page.getByRole("checkbox", { name: /I reviewed the evidence/ }).check();
await page.screenshot({
  path: "test-results/catchment-sampling-plan.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Create field missions" }).click();
await page
  .getByRole("status")
  .filter({ hasText: "Field missions created" })
  .waitFor();
assert.equal(await page.locator(".mission-card").count(), 2);
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("tab", { name: /Field missions/ }).click();
assert.equal(await page.locator(".mission-card").count(), 2);
const mission = page
  .locator(".mission-card")
  .filter({ hasText: "Foundry outfall" });
await mission
  .getByLabel("Field follow-up")
  .fill(
    "DEMO: bank-side visit completed; sample BF-003 collected by a trained team. Laboratory results pending; no safety conclusion.",
  );
await mission.getByRole("button", { name: "Complete field visit" }).click();
await page.getByRole("status").filter({ hasText: "Visit completed" }).waitFor();
assert.ok(await mission.getByText("Complete", { exact: true }).isVisible());
await page.getByRole("tab", { name: "Methods & evidence" }).click();
await page
  .getByRole("button", { name: "Refresh live context" })
  .waitFor({ state: "visible" });
await page.waitForFunction(
  () => !document.body.innerText.includes("Loading rainfall observations…"),
);
const rainText = await page.locator(".rainfall-panel").innerText();
console.log("RAINFALL", rainText);
for (const name of [
  "Evidence JSON",
  "Observations CSV",
  "Experimental FHIR R4",
]) {
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name, exact: true }).click();
  const d = await dl;
  await d.saveAs("test-results/" + d.suggestedFilename());
}
const evidence = JSON.parse(
  await fs.readFile("test-results/catchment-json.json", "utf8"),
);
assert.equal(evidence.missions.length, 2);
assert.ok(evidence.missions.some((m) => m.status === "complete"));
assert.ok(
  evidence.observations.some(
    (o) => o.source === "participant" && o.status === "confirmed",
  ),
);
const csv =
  "siteId,observedAt,appearance,odour,wildlife,notes,oxygen,ph,turbidity,temperature,calibrated\nB01," +
  new Date().toISOString() +
  ",clear,none,normal,Imported demonstration baseline observation,8.3,7.4,3,16,true\n";
await page
  .getByLabel("Choose a CSV file")
  .setInputFiles({
    name: "observations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
await page.getByRole("button", { name: "Validate & import" }).click();
await page.getByRole("status").filter({ hasText: "Import saved" }).waitFor();
await page.screenshot({
  path: "test-results/catchment-methods.png",
  fullPage: true,
});
const other = await browser.newContext();
const p2 = await other.newPage();
await p2.goto(base);
await p2.getByRole("button", { name: /Inspect Foundry/ }).waitFor();
const otherData = await p2.evaluate(
  async () => await (await fetch("/api/workspace")).json(),
);
assert.equal(otherData.workspace.missions.length, 0);
assert.equal(otherData.workspace.observations.length, 5);
await other.close();
for (const width of [390, 768]) {
  await page.setViewportSize({ width, height: 844 });
  for (const tab of [
    "Catchment overview",
    "Record observation",
    "Field missions",
    "Methods & evidence",
  ]) {
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Overflow " + width + " " + tab,
    );
    await page.screenshot({
      path: `test-results/mobile-${width}-${tab.split(" ")[0]}.png`,
      fullPage: true,
    });
  }
}
assert.deepEqual(errors, []);
await fs.writeFile(
  "test-results/browser-results.json",
  JSON.stringify(
    {
      passed: true,
      checks: [
        "create observation",
        "quality conflict surfaced",
        "confirm review",
        "exact allocation 2 to 1",
        "persisted mission after reload",
        "complete follow-up",
        "three export formats",
        "atomic CSV import",
        "isolated second visitor",
        "four tabs at 390 and 768 px without horizontal overflow",
      ],
      pageErrors: errors,
      rainfall: rainText,
    },
    null,
    2,
  ),
);
console.log("E2E PASSED");
await browser.close();
