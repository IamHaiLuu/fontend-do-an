import { expect, test } from '@playwright/test'

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByRole('button', { name: /Quản trị: admin@demo.vn/ }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await loginAdmin(page)
})

test('admin truy cập đầy đủ các phân hệ chính', async ({ page }) => {
  const routes = [
    ['/admin/dashboard', 'Tổng quan quản trị'],
    ['/admin/users', 'Người dùng'],
    ['/admin/hotels', 'Khách sạn'],
    ['/admin/bookings', 'Đơn đặt phòng'],
    ['/admin/payments', 'Thanh toán'],
    ['/admin/refunds', 'Hủy đơn và hoàn tiền'],
    ['/admin/payouts', 'Chi trả chủ khách sạn'],
    ['/admin/destinations', 'Địa điểm du lịch'],
    ['/admin/topics', 'Chủ đề du lịch'],
    ['/admin/reviews', 'Đánh giá'],
    ['/admin/itineraries', 'Lịch trình du lịch'],
  ] as const
  for (const [path, heading] of routes) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true }).last()).toBeVisible()
  }
})

test('admin không còn mục và trang quản lý hình ảnh', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await expect(page.getByRole('navigation', { name: 'Điều hướng quản trị' }).getByRole('link', { name: 'Hình ảnh' })).toHaveCount(0)
  await page.goto('/admin/media')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
})

test('chi tiết booking hiển thị đầy đủ ba phòng cùng khách sạn và đúng tổng tiền', async ({ page }) => {
  await page.goto('/admin/bookings/BK-ADMIN-3ROOM')
  await expect(page.getByRole('heading', { name: 'Đơn BK-ADMIN-3ROOM' })).toBeVisible()
  await expect(page.getByText('Phòng 101')).toBeVisible()
  await expect(page.getByText('Phòng 102')).toBeVisible()
  await expect(page.getByText('Phòng 103')).toBeVisible()
  await expect(page.getByText('3 phòng', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('7.200.000 ₫').first()).toBeVisible()
})

test('chi tiết khách sạn không hiển thị tab và gallery hình ảnh', async ({ page }) => {
  await page.goto('/admin/hotels/sea-garden')
  await expect(page.getByRole('heading', { name: 'Sea Garden Hotel' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Hình ảnh' })).toHaveCount(0)
  await expect(page.getByText('Gallery khách sạn và phòng')).toHaveCount(0)
})

test('admin thêm địa điểm với mô tả giờ mở cửa', async ({ page }) => {
  await page.goto('/admin/destinations/new')
  await page.getByLabel('Tên địa điểm *').fill('Bảo tàng Du lịch Demo')
  await page.getByLabel('Loại địa điểm *').fill('Văn hóa')
  await page.getByLabel('Tỉnh/thành *').fill('Đà Nẵng')
  await page.getByLabel('Địa chỉ / khu vực *').fill('Hải Châu')
  await page.getByLabel('Mô tả giờ mở cửa').fill('Thứ 2–6: 08:00–17:00; cuối tuần: 08:00–20:00')
  await expect(page.getByRole('button', { name: 'Thêm khung giờ' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Lưu địa điểm' }).click()
  await expect(page).toHaveURL(/\/admin\/destinations$/)
  await expect(page.getByText('Bảo tàng Du lịch Demo')).toBeVisible()
  await expect(page.getByText('Thứ 2–6: 08:00–17:00; cuối tuần: 08:00–20:00')).toBeVisible()
})
