import { test, expect } from "@playwright/test"

test("admin page is accessible to admin user", async ({ page }) => {
  await page.goto("/admin")
  await expect(page).toHaveURL("/admin")
  // Nav should be visible (not redirected away)
  await expect(
    page.getByRole("link", { name: "Radomski Photos" })
  ).toBeVisible()
})

test("admin nav link is visible for admin user", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible()
})

test("admin page shows the E2E test user in user list", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.getByText("E2E Admin")).toBeVisible()
})

test("admin page shows site settings section", async ({ page }) => {
  await page.goto("/admin")
  await expect(page.getByText(/settings/i)).toBeVisible()
})
