import { expect, test } from '@playwright/test'

const datePlus = (offset: number) => {
  const value = new Date()
  value.setDate(value.getDate() + offset)
  return value.toISOString().slice(0, 10)
}

async function loginTourist(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto('/login')
  await page.getByRole('button', { name: /Du khách: khach@demo.vn/ }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test('route Tourist mới và Google Maps hiển thị tại chi tiết địa điểm', async ({ page }) => {
  await page.goto('/destinations/my-khe')
  await expect(page.getByRole('heading', { name: 'Bãi biển Mỹ Khê' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vị trí trên Google Maps' })).toBeVisible()
  await expect(page.getByTitle('Google Maps')).toBeVisible()
})

test('chọn ba phòng vật lý và tạo một đơn duy nhất', async ({ page }) => {
  await loginTourist(page)
  const checkIn = datePlus(60)
  const checkOut = datePlus(62)
  await page.goto(`/hotels/sea-garden?checkIn=${checkIn}&checkOut=${checkOut}&rooms=3&adults=6&children=0`)
  await expect(page.getByRole('heading', { name: 'Chọn phòng vật lý' })).toBeVisible()
  for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Chọn phòng' }).first().click()
  await expect(page.getByText('3/3')).toBeVisible()
  await page.getByRole('link', { name: 'Tiếp tục đặt phòng' }).click()
  await expect(page).toHaveURL(/\/booking\/checkout/)
  await expect(page.getByRole('row')).toHaveCount(4)
  await page.getByRole('button', { name: 'Xác nhận và thanh toán' }).click()
  await expect(page).toHaveURL(/\/booking\/BK-.*\/payment/)
  await expect(page.getByRole('row')).toHaveCount(4)
  await page.getByRole('button', { name: 'Mô phỏng thành công' }).click()
  await expect(page.getByRole('heading', { name: 'Đặt phòng đã được xác nhận' })).toBeVisible()
})

test('lịch trình hiển thị bản đồ và chỉ cho chọn địa điểm có trong hệ thống', async ({ page }) => {
  await loginTourist(page)
  await page.goto('/my-itineraries/trip-demo')
  await expect(page.getByRole('heading', { name: 'Bản đồ chuyến đi' })).toBeVisible()
  await expect(page.getByTitle('Google Maps')).toBeVisible()
  const markers = page.getByRole('button', { name: /Điểm dừng \d+:/ })
  await expect(markers.first()).toBeVisible()
  await markers.last().click()
  await expect(markers.last()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /Xem .* trên bản đồ/ }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Thêm địa điểm' }).click()
  await page.getByLabel('Chọn địa điểm trong hệ thống').selectOption('son-tra')
  await expect(page.getByLabel('Tên địa điểm *')).toHaveValue('Bán đảo Sơn Trà')
  await expect(page.getByTitle('Google Maps').last()).toBeVisible()
})

test('khách du lịch không truy cập được dashboard chủ khách sạn và admin', async ({ page }) => {
  await loginTourist(page)
  await page.goto('/partner/dashboard')
  await expect(page).toHaveURL(/\/403$/)
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/403$/)
})
