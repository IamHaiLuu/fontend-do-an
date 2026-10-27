import { seedData } from './seed'
import { mergeSeedExtras } from './seed-extras'
import type { AppData } from '@/types/domain'

// Keep the existing key so v2 demo changes can be upgraded in place.
const STORAGE_KEY = 'smarttravel.demo.v2'

export function readData(): AppData {
  let data: AppData
  let changed: boolean
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    data = raw ? JSON.parse(raw) as AppData : seedData()
    changed = !raw
    if (data.version === 2) { data = mergeSeedExtras(data); changed = true }
    else if (data.version !== 3) { data = seedData(); changed = true }
  } catch { data = seedData(); changed = true }
  const legacyData = data as AppData & { restaurants?: Array<{ id: string }> }
  if (legacyData.restaurants) {
    const removedIds = new Set(legacyData.restaurants.map(item => item.id))
    for (const [userId, favorites] of Object.entries(data.favorites)) data.favorites[userId] = favorites.filter(id => !removedIds.has(id))
    delete legacyData.restaurants
    changed = true
  }
  const categoryCount = data.categories.length
  const serviceCount = data.services.length
  data.categories = data.categories.filter(category => category.id !== 'cat-food')
  data.services = data.services.filter(service => service.categoryId !== 'cat-food')
  if (data.categories.length !== categoryCount || data.services.length !== serviceCount) changed = true
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
