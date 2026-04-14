import { test, expect } from "@playwright/test"

test.describe("unauthenticated redirects", () => {
  test("/ redirects to /login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("/events redirects to /login", async ({ page }) => {
    await page.goto("/events")
    await expect(page).toHaveURL(/\/login/)
  })

  test("/admin redirects to /login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe("login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("shows email input and submit button", async ({ page }) => {
    await expect(page.getByLabel("Email address")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Send magic link" })
    ).toBeVisible()
  })

  test("has link to signup page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible()
  })

  test("submitting any email shows verify page or stays on login", async ({ page }) => {
    // Just verify the form submits without a JS crash — rate limiting or unknown
    // email may keep us on /login, which is valid behaviour
    await page.getByLabel("Email address").fill("e2e-admin@radomski.test")
    await page.getByRole("button", { name: "Send magic link" }).click()
    // Wait for navigation or error response
    await page.waitForLoadState("networkidle")
    const url = page.url()
    expect(url).toMatch(/\/(login|verify)/)
  })
})

test.describe("signup page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup")
  })

  test("shows all required fields", async ({ page }) => {
    await expect(page.getByLabel("Your name")).toBeVisible()
    await expect(page.getByLabel("Email address")).toBeVisible()
    await expect(page.getByLabel("Family passphrase")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Create account" })
    ).toBeVisible()
  })

  test("has link to login page", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible()
  })

  test("wrong passphrase shows an error", async ({ page }) => {
    await page.getByLabel("Your name").fill("Test User")
    await page.getByLabel("Email address").fill("notreal@example.com")
    await page.getByLabel("Family passphrase").fill("thisiswrong")
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page.getByText(/passphrase/i)).toBeVisible()
  })
})
