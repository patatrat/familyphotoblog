import { test, expect } from "@playwright/test"

test("home page loads when authenticated", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("link", { name: "Radomski Photos" })
  ).toBeVisible()
})

test("archive link is visible in nav", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Archive" })).toBeVisible()
})

test("archive page loads and shows heading", async ({ page }) => {
  await page.goto("/events")
  await expect(page).toHaveURL("/events")
  await expect(
    page.getByRole("heading", { name: "All events" })
  ).toBeVisible()
})

test("clicking a published event opens event detail page", async ({ page }) => {
  await page.goto("/")
  const firstEvent = page
    .locator('a[href^="/events/"]')
    .filter({ hasNotText: "Archive" })
    .first()

  if ((await firstEvent.count()) === 0) {
    test.skip()
  }

  const href = await firstEvent.getAttribute("href")
  await firstEvent.click()
  await expect(page).toHaveURL(href!)
})

test("lightbox opens on photo click and shows uploader attribution", async ({
  page,
}) => {
  await page.goto("/")

  const firstEvent = page
    .locator('a[href^="/events/"]')
    .filter({ hasNotText: "Archive" })
    .first()

  if ((await firstEvent.count()) === 0) {
    test.skip()
  }

  await firstEvent.click()

  // Click the first photo thumbnail in the grid
  const firstPhoto = page
    .locator(".grid button[aria-label]")
    .first()

  if ((await firstPhoto.count()) === 0) {
    test.skip()
  }

  await firstPhoto.click()

  // Lightbox should open and show attribution
  await expect(page.getByText(/Photo by/)).toBeVisible()
  // Navigation counter visible (e.g. "1 / 5")
  await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()
})

test("lightbox closes with Escape key", async ({ page }) => {
  await page.goto("/")

  const firstEvent = page
    .locator('a[href^="/events/"]')
    .filter({ hasNotText: "Archive" })
    .first()

  if ((await firstEvent.count()) === 0) {
    test.skip()
  }

  await firstEvent.click()

  const firstPhoto = page.locator(".grid button[aria-label]").first()
  if ((await firstPhoto.count()) === 0) {
    test.skip()
  }

  await firstPhoto.click()
  await expect(page.getByText(/Photo by/)).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(page.getByText(/Photo by/)).not.toBeVisible()
})
