// End-to-end smoke test against a running AVA stack.
// Usage: AVA_URL=http://localhost:3000 AVA_EMAIL=... AVA_PASSWORD=... node e2e/smoke.mjs [screenshot-dir]
// Requires Playwright (npm i -D playwright, or a global install).
import { chromium } from "playwright";

const base = process.env.AVA_URL ?? "http://localhost:3000";
const email = process.env.AVA_EMAIL;
const password = process.env.AVA_PASSWORD;
const shots = process.argv[2];
if (!email || !password) throw new Error("Set AVA_EMAIL and AVA_PASSWORD");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const step = async (name, fn) => {
  await fn();
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  console.log(`✓ ${name}`);
};

await step("01-login", async () => {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/`);
});

await step("02-ava-today", async () => {
  await page.getByRole("button", { name: "What requires attention today?" }).click();
  await page.getByText("Deadlines (Project Registry, next 14 days):").waitFor();
});

const number = `E2E-${Date.now().toString().slice(-6)}`;
await step("03-create-project", async () => {
  await page.goto(`${base}/projects/new`);
  await page.getByLabel("Project number").fill(number);
  await page.getByLabel("Project name").fill("E2E Library Renovation");
  await page.getByLabel("Location").fill("Test City");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByText(`PROJECT ${number}`).waitFor();
});

await step("04-project-ava", async () => {
  await page.getByRole("button", { name: "What are we waiting for on this project?" }).click();
  await page.getByText("Checked: Project Registry.").waitFor();
});

await step("05-search", async () => {
  await page.getByLabel("Global search").fill(number);
  await page.getByLabel("Global search").press("Enter");
  await page.getByRole("link", { name: new RegExp(number) }).first().waitFor();
});

await step("06-today", async () => {
  await page.goto(`${base}/today`);
  await page.getByText("Connected sources").waitFor();
});

await step("07-settings", async () => {
  await page.goto(`${base}/settings`);
  await page.getByText(/PostgreSQL/).waitFor();
});

await step("08-mobile", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: "Open menu" }).waitFor();
});

await browser.close();
if (errors.length) {
  console.error("Page errors:", errors);
  process.exit(1);
}
console.log("Smoke test passed.");
