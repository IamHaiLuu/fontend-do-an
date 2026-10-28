import { expect, test } from '@playwright/test'

async function loginPartner(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto('/auth/login')
  await page.getByRole('button', { name: /Chủ khách sạn: doitac@demo.vn/ }).click()
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/partner\/dashboard$/)
}

test.beforeEach(async ({ page }) => {
  await loginPartner(page)
})

test('dashboard và các phân hệ chính chỉ hiển thị dữ liệu khách sạn đang sở hữu', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible()
  await expect(page.locator('main').getByText(/2 khách sạn/).first()).toBeVisible()

  for (const [path, heading] of [
    ['/partner/hotel', 'Danh sách khách sạn'],
    ['/partner/rooms', 'Phòng khách sạn'],
    ['/partner/bookings', 'Đơn đặt phòng'],
    ['/partner/revenue', 'Doanh thu'],
    ['/partner/payments', 'Giao dịch thanh toán'],
    ['/partner/payouts', 'Chi trả từ nền tảng'],
    ['/partner/reviews', 'Đánh giá khách sạn'],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
  }
})

test('chi tiết đơn hỗ trợ nhiều phòng vật lý và giữ nguyên tổng tiền', async ({ page }) => {
  await page.goto('/partner/bookings/BK-ADMIN-3ROOM')
  await expect(page.getByRole('heading', { name: 'Đơn BK-ADMIN-3ROOM' })).toBeVisible()
  await expect(page.getByText('Phòng 101', { exact: true })).toBeVisible()
  await expect(page.getByText('Phòng 102', { exact: true })).toBeVisible()
  await expect(page.getByText('Phòng 103', { exact: true })).toBeVisible()
  await expect(page.getByText('3 phòng', { exact: true })).toBeVisible()
  await expect(page.getByText('7.200.000 ₫').last()).toBeVisible()
})

test('chặn truy cập chéo đơn và phòng của khách sạn khác', async ({ page }) => {
  await page.goto('/partner/bookings/BK-ADMIN-003')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy đơn hoặc bạn không có quyền truy cập' })).toBeVisible()

  await page.goto('/partner/rooms/room-river')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy phòng hoặc bạn không có quyền truy cập' })).toBeVisible()
})

test('không cho tạo số phòng trùng trong cùng khách sạn', async ({ page }) => {
  await page.goto('/partner/rooms/new')
  await page.getByLabel('Số phòng *').fill('101')
  await page.getByLabel('Tên hiển thị *').fill('Phòng kiểm thử')
  await page.getByLabel('Loại phòng *').fill('Deluxe')
  await page.getByRole('button', { name: 'Lưu phòng' }).click()
  await expect(page.getByText('Số phòng đã tồn tại trong khách sạn.')).toBeVisible()
  await expect(page).toHaveURL(/\/partner\/rooms\/new$/)
})

test('chủ khách sạn quản lý nhiều khách sạn và album nhiều ảnh', async ({ page }) => {
  await page.goto('/partner/hotel')
  await expect(page.getByText('Bạn đang quản lý 2 khách sạn.')).toBeVisible()
  await expect(page.getByRole('cell', { name: /Sea Garden Hotel 68 Võ Nguyên/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: /Sunrise Coast Đà Nẵng 18 Võ Nguyên/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ảnh minh họa Ảnh đại diện Sea Garden Hotel' })).toBeVisible()
  await expect(page.getByLabel('Album ảnh Sea Garden Hotel')).toHaveCount(0)

  await page.goto('/partner/rooms/new')
  await expect(page.getByLabel('Khách sạn *').locator('option')).toHaveCount(2)
  await expect(page.getByLabel('Album ảnh phòng')).toBeVisible()
})

test('bộ chọn khách sạn lọc dữ liệu xuyên suốt và album ảnh có thao tác', async ({ page }) => {
  await page.goto('/partner/rooms')
  await page.getByRole('combobox', { name: 'Khách sạn', exact: true }).selectOption('sunrise-danang')
  await expect(page.getByText('room-sunrise-standard', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('room-deluxe', { exact: false })).toHaveCount(0)
  await page.getByLabel('Tìm kiếm phòng').fill('suite')
  await expect(page.getByText('room-sunrise-suite', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('room-sunrise-standard', { exact: false })).toHaveCount(0)

  await page.goto('/partner/amenities')
  await expect(page.getByRole('combobox', { name: 'Khách sạn', exact: true })).toHaveCount(0)
  await page.getByLabel('Tên tiện nghi mới').fill('Phòng gym riêng')
  await page.getByRole('button', { name: 'Thêm tiện nghi' }).click()
  await expect(page.getByText('Đã thêm tiện nghi.')).toBeVisible()
  await page.getByLabel('Tìm kiếm tiện nghi').fill('gym riêng')
  await expect(page.getByRole('row').filter({ hasText: 'Phòng gym riêng' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Wi-Fi' })).toHaveCount(0)
  await page.getByLabel('Tìm kiếm tiện nghi').fill('')
  let amenityRow = page.getByRole('row').filter({ hasText: 'Phòng gym riêng' })
  await amenityRow.getByRole('button', { name: 'Sửa' }).click()
  await page.getByLabel('Tên tiện nghi', { exact: true }).fill('Phòng thể hình riêng')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã cập nhật tiện nghi.')).toBeVisible()
  await page.goto('/partner/rooms/new')
  await expect(page.getByRole('button', { name: 'Phòng thể hình riêng' })).toBeVisible()
  await page.goto('/partner/hotel/register')
  await expect(page.getByRole('button', { name: 'Phòng thể hình riêng' })).toBeVisible()
  await page.goto('/partner/amenities')
  amenityRow = page.getByRole('row').filter({ hasText: 'Phòng thể hình riêng' })
  await amenityRow.getByRole('button', { name: 'Xóa' }).click()
  await page.getByRole('button', { name: 'Xóa tiện nghi' }).click()
  await expect(page.getByText('Đã xóa tiện nghi.')).toBeVisible()
  await expect(page.getByText('Phòng thể hình riêng')).toHaveCount(0)
  await page.goto('/partner/cancellation-policies')
  await expect(page.getByRole('combobox', { name: 'Khách sạn', exact: true })).toHaveValue('sunrise-danang')
  await page.getByRole('button', { name: 'Thêm điều khoản' }).click()
  await expect(page.getByLabel('Hủy trước ít nhất (giờ) · khoản 3')).toBeVisible()
  await page.getByLabel('Hủy trước ít nhất (giờ) · khoản 3').fill('72')
  await page.getByLabel('Tỷ lệ hoàn (%) · khoản 3').fill('100')
  await page.getByRole('button', { name: 'Lưu chính sách' }).click()
  await expect(page.getByText('Đã cập nhật chính sách hủy.')).toBeVisible()

  await page.goto('/partner/hotel/sea-garden/edit')
  const album = page.getByRole('group', { name: 'Album ảnh Sea Garden Hotel' })
  await expect(album.getByRole('button', { name: /Tải ảnh lên/ })).toBeVisible()
  await expect(album.getByPlaceholder('Dán URL ảnh https://...')).toBeVisible()
  await expect(album.getByRole('button', { name: /Xóa ảnh 1/ })).toBeVisible()
})

test('các trang tài chính của chủ khách sạn là chỉ đọc', async ({ page }) => {
  await page.goto('/partner/payments')
  await expect(page.getByRole('button', { name: /thành công|thất bại|hoàn tiền/i })).toHaveCount(0)
  await page.goto('/partner/refunds')
  await expect(page.getByRole('button', { name: /duyệt|xử lý|hoàn tiền/i })).toHaveCount(0)
})
