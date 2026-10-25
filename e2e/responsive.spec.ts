import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 360, height: 800 } })

async function expectNoPageOverflow(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  await expect(page.locator('main h1').first()).toBeVisible()
  const sizes = await page.evaluate(() => ({ viewport: window.innerWidth, page: document.documentElement.scrollWidth }))
  expect(sizes.page, `${path} must fit a 360px viewport`).toBeLessThanOrEqual(sizes.viewport + 1)
}

test('các trang chính dùng được ở 360px', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  for (const path of ['/', '/explore', '/hotels', '/hotels/sea-garden', '/restaurants', '/ai/trip-planner']) {
    await expectNoPageOverflow(page, path)
  }

  await page.goto('/auth/login')
  await page.getByRole('button', { name: /Đối tác: doitac@demo.vn/ }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  for (const path of ['/partner', '/partner/rooms', '/partner/rooms/room-deluxe/inventory']) {
    await expectNoPageOverflow(page, path)
  }

  await page.goto('/auth/login')
  await page.getByRole('button', { name: /Quản trị: admin@demo.vn/ }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  for (const path of ['/admin', '/admin/partners', '/admin/reports', '/admin/settlements/SET-DEMO-001']) {
    await expectNoPageOverflow(page, path)
  }
})
