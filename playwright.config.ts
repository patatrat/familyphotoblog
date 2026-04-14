import { defineConfig, devices } from "@playwright/test"

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://photos-staging.radomski.co.nz"

export default defineConfig({
  testDir: "./playwright/tests",
  globalSetup: "./playwright/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "unauthenticated",
      testMatch: "**/auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: ["**/events.spec.ts", "**/admin.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
    },
  ],
})
