import type { Booking } from '@/types/domain'

export function bookingUsesRoom(booking: Booking, roomId: string) {
  if (booking.roomItems?.length) return booking.roomItems.some(item => item.roomId === roomId)
  return booking.roomId === roomId || booking.roomIds?.includes(roomId) === true
}

export function normalizeRoomNumber(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('vi')
}
