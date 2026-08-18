import { chromium, type FullConfig } from "@playwright/test";

// Logs in once via the real login form and reuses the session for every spec file -
// login itself isn't a section-58 checklist item, so there's no value re-doing the
// UI flow per test; this just makes every other test fast and independent of it.
export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD must be set to run the e2e suite.");
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${baseURL}/dashboard`, { timeout: 15_000 });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
  await browser.close();
}
