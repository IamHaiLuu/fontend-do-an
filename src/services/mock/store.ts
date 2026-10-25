import { seedData } from './seed'
import type { AppData } from '@/types/domain'

const STORAGE_KEY = 'smarttravel.demo.v2'

export function readData(): AppData {
  let data: AppData
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    data = raw ? JSON.parse(raw) as AppData : seedData()
    if (data.version !== 2) data = seedData()
  } catch { data = seedData() }
  let changed = !localStorage.getItem(STORAGE_KEY)
  const now = Date.now()
  for (const booking of data.bookings) {
    if (booking.status === 'PENDING_PAYMENT' && new Date(booking.holdExpiresAt).getTime() <= now) {
      booking.status = 'EXPIRED'
      for (const payment of data.payments.filter(p => p.bookingId === booking.id && p.status !== 'PAID')) payment.status = 'EXPIRED'
      changed = true
    }
  }
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

export function commit<T>(change: (data: AppData) => T): T {
  const data = structuredClone(readData())
  const result = change(data)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event('smarttravel:update'))
  return result
}

export function resetData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData()))
  window.dispatchEvent(new Event('smarttravel:update'))
}
