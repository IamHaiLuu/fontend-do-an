export const DEFAULT_AMENITIES = ['Wi-Fi', 'Bãi đỗ xe', 'Hồ bơi', 'Thang máy', 'Điều hòa', 'TV', 'Bồn tắm', 'Bữa sáng', 'Ban công', 'Sân vườn']

export function normalizeAmenityName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}
