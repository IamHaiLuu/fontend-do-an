import { seedData } from './seed'
import { mergeSeedExtras } from './seed-extras'
import type { AppData } from '@/types/domain'
import { DEFAULT_AMENITIES } from '@/lib/amenities'

// Keep the existing key so v2 demo changes can be upgraded in place.
const STORAGE_KEY = 'smarttravel.demo.v2'

const isoDay = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
const isoTime = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString()

function normalizeAdminDemo(data: AppData) {
  let changed = false
  for (const partner of data.partners) {
    const hotelIds = new Set(partner.hotelIds)
    const usedAmenities = [
      ...data.hotels.filter(hotel => hotelIds.has(hotel.id)).flatMap(hotel => hotel.amenities),
      ...data.rooms.filter(room => hotelIds.has(room.hotelId)).flatMap(room => room.amenities),
    ]
    const next = [...new Set([...(partner.amenities ?? DEFAULT_AMENITIES), ...usedAmenities])]
    if (!partner.amenities || next.length !== partner.amenities.length) {
      partner.amenities = next
      changed = true
    }
  }
  for (const hotel of data.hotels) {
    if (!hotel.cancellationTerms.rules?.length) {
      hotel.cancellationTerms.rules = [
        { hoursBeforeCheckIn: hotel.cancellationTerms.freeUntilHours, refundRate: 1 },
        { hoursBeforeCheckIn: 0, refundRate: Math.max(0, 1 - hotel.cancellationTerms.lateFeeRate) },
      ]
      changed = true
    }
  }
  for (const booking of data.bookings) {
    if (!booking.policyTermsSnapshot.rules?.length) {
      booking.policyTermsSnapshot.rules = [
        { hoursBeforeCheckIn: booking.policyTermsSnapshot.freeUntilHours, refundRate: 1 },
        { hoursBeforeCheckIn: 0, refundRate: Math.max(0, 1 - booking.policyTermsSnapshot.lateFeeRate) },
      ]
      changed = true
    }
  }
  if (!Array.isArray(data.topics)) {
    data.topics = [
      { id: 'topic-sea', name: 'Du lịch biển', description: 'Bãi biển và nghỉ dưỡng ven biển', active: true },
      { id: 'topic-nature', name: 'Thiên nhiên', description: 'Cảnh quan, núi rừng và sinh thái', active: true },
      { id: 'topic-culture', name: 'Văn hóa', description: 'Di sản, lịch sử và đời sống bản địa', active: true },
      { id: 'topic-food', name: 'Ẩm thực', description: 'Trải nghiệm món ăn địa phương', active: true },
    ]
    changed = true
  }
  const demoNames = ['Phạm Gia Hân', 'Võ Minh Khang', 'Đặng Thảo Vy', 'Bùi Quốc Bảo', 'Hoàng Ngọc Mai', 'Đỗ Anh Tuấn', 'Lý Thanh Trúc']
  for (let index = data.users.length; index < 10; index++) {
    const suffix = index + 1
    data.users.push({ id: `user-demo-${suffix}`, name: demoNames[index - 3] ?? `Du khách ${suffix}`, email: `dulich${suffix}@demo.vn`, phone: `09000000${String(suffix).padStart(2, '0')}`, role: 'tourist', verified: true, active: true, createdAt: isoTime(-suffix * 3) })
    changed = true
  }
  data.users.forEach((user, index) => {
    if (user.active === undefined) { user.active = true; changed = true }
    if (!user.createdAt) { user.createdAt = isoTime(-(index + 1) * 12); changed = true }
  })
  if (!data.users.some(user => user.active === false)) {
    const lockDemo = data.users.find(user => user.id.startsWith('user-demo-'))
    if (lockDemo) { lockDemo.active = false; changed = true }
  }
  // Older demo data split every hotel into a separate owner. Merge those generated
  // records back so one hotel owner can manage an arbitrary number of hotels.
  for (const generated of data.partners.filter(partner => partner.id.startsWith('partner-owner-'))) {
    const baseName = generated.name.replace(/ · \d+$/, '')
    const owner = data.partners.find(partner => !partner.id.startsWith('partner-owner-') && partner.name === baseName)
    if (!owner) continue
    generated.hotelIds.forEach(hotelId => {
      if (!owner.hotelIds.includes(hotelId)) owner.hotelIds.push(hotelId)
      const hotel = data.hotels.find(item => item.id === hotelId)
      if (hotel) hotel.partnerId = owner.id
    })
    const generatedUser = data.users.find(user => user.id === generated.userId && user.id.startsWith('user-demo-'))
    if (generatedUser) generatedUser.role = 'tourist'
    data.partners = data.partners.filter(partner => partner.id !== generated.id)
    changed = true
  }
  const usedOwnerIds = new Set(data.partners.map(partner => partner.userId).filter(Boolean))
  const availableOwners = data.users.filter(user => user.id.startsWith('user-demo-') && !usedOwnerIds.has(user.id))
  data.partners.forEach(partner => {
    if (!partner.userId) {
      const ownerUser = availableOwners.shift()
      if (ownerUser) {
        ownerUser.role = 'partner'
        ownerUser.name = partner.name.replace(/ · \d+$/, '')
        ownerUser.email = partner.email
        ownerUser.active = true
        partner.userId = ownerUser.id
        changed = true
      }
    }
  })
  const cityCenters: Record<string, { lat: number; lng: number }> = {
    'Đà Nẵng': { lat: 16.0544, lng: 108.2022 }, 'Đà Lạt': { lat: 11.9404, lng: 108.4583 },
    'Huế': { lat: 16.4637, lng: 107.5909 }, 'Quảng Nam': { lat: 15.8801, lng: 108.3380 },
    'Nha Trang': { lat: 12.2388, lng: 109.1967 }, 'Vũng Tàu': { lat: 10.4114, lng: 107.1362 },
  }
  data.destinations.forEach((destination, index) => {
    const center = cityCenters[destination.city]
    if (center && (destination.lat === undefined || destination.lng === undefined)) {
      destination.lat = center.lat + (index % 5 - 2) * 0.008
      destination.lng = center.lng + (index % 4 - 1.5) * 0.009
      changed = true
    }
  })
  data.hotels.forEach((hotel, index) => {
    const center = cityCenters[hotel.city]
    if (center && (hotel.lat === undefined || hotel.lng === undefined)) {
      hotel.lat = center.lat + (index % 3 - 1) * 0.006
      hotel.lng = center.lng + (index % 4 - 1.5) * 0.006
      changed = true
    }
    const partner = data.partners.find(item => item.id === hotel.partnerId)
    if (!hotel.approvalStatus) { hotel.approvalStatus = partner?.status ?? 'PENDING'; changed = true }
    if (!hotel.registeredAt) { hotel.registeredAt = partner?.registeredAt ?? isoTime(-30); changed = true }
    if (hotel.approvalStatus === 'VERIFIED' && !hotel.approvedAt) { hotel.approvedAt = isoTime(-20); changed = true }
    const generatedHotelAlbum = Boolean(hotel.images?.length && hotel.images.length <= 3 && hotel.images.includes('/images/da-nang-coast.webp') && hotel.images.includes('/images/hoi-an-lanterns.webp'))
    if (!hotel.images?.length || generatedHotelAlbum) {
      const cover = hotel.image ?? ({ 'Đà Lạt': '/images/da-lat-pines.webp', 'Huế': '/images/hue-citadel.webp', 'Quảng Nam': '/images/hoi-an-lanterns.webp' }[hotel.city] ?? '/images/da-nang-coast.webp')
      hotel.images = [cover, `${cover}?gallery=2`, `${cover}?gallery=3`]
      hotel.image = hotel.images[0]
      changed = true
    }
    if (hotel.image !== hotel.images[0]) { hotel.image = hotel.images[0]; changed = true }
  })
  data.rooms.forEach((room, index) => {
    if (!room.roomNumber) { room.roomNumber = String(101 + index); changed = true }
    if (room.active === undefined) { room.active = true; changed = true }
    const generatedRoomAlbum = Boolean(room.images?.length && room.images.length <= 3 && room.images.includes('/images/room-deluxe.png') && room.images.includes('/images/room-family-suite.png'))
    if (!room.images?.length || generatedRoomAlbum) {
      const cover = room.image ?? '/images/room-deluxe.png'
      room.images = [cover, `${cover}?gallery=2`, `${cover}?gallery=3`]
      room.image = room.images[0]
      changed = true
    }
    if (room.image !== room.images[0]) { room.image = room.images[0]; changed = true }
  })
  data.hotels.forEach(hotel => {
    const hotelRooms = data.rooms.filter(room => room.hotelId === hotel.id)
    const source = hotelRooms[0]
    if (!source) return
    while (data.rooms.filter(room => room.hotelId === hotel.id).length < 3) {
      const sequence = data.rooms.filter(room => room.hotelId === hotel.id).length + 1
      const id = `${source.id}-physical-${sequence}`
      if (!data.rooms.some(room => room.id === id)) {
        data.rooms.push({ ...source, id, roomNumber: String(100 + sequence), name: `${source.name} · Phòng ${100 + sequence}` })
        data.inventory.filter(row => row.roomId === source.id).forEach(row => data.inventory.push({ ...row, roomId: id, offered: 1 }))
        changed = true
      } else break
    }
  })
  for (const row of data.inventory) {
    if (data.rooms.some(room => room.id === row.roomId && room.roomNumber) && row.offered > 1) {
      row.offered = 1
      changed = true
    }
  }
  data.stops.forEach(stop => {
    const place = data.destinations.find(destination => destination.id === stop.placeId)
    if (place && (stop.lat === undefined || stop.lng === undefined)) {
      stop.lat = place.lat
      stop.lng = place.lng
      if (!stop.address) stop.address = `${place.region}, ${place.city}`
      changed = true
    }
  })
  if (!data.bookings.some(booking => booking.rooms >= 3)) {
    const hotel = data.hotels.find(item => data.rooms.some(room => room.hotelId === item.id))
    const room = data.rooms.find(item => item.hotelId === hotel?.id)
    if (hotel && room) {
      const nightlyPrice = room.basePrice
      data.bookings.push({
        id: 'BK-ADMIN-3ROOM', userId: 'user-tourist', hotelId: hotel.id, roomId: room.id,
        checkIn: isoDay(8), checkOut: isoDay(10), rooms: 3, adults: 6, children: 1,
        guestName: 'Nguyễn Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: 'Ba phòng gần nhau',
        total: nightlyPrice * 6, nightlyPrices: [nightlyPrice * 3, nightlyPrice * 3], status: 'CONFIRMED',
        holdExpiresAt: isoTime(-1), createdAt: isoTime(-2), policySnapshot: hotel.cancellationPolicy,
        policyTermsSnapshot: { ...hotel.cancellationTerms },
        roomItems: [0, 1, 2].map((offset) => ({ roomId: `${room.id}-${offset + 1}`, roomNumber: String(201 + offset), nightlyPrice, nights: 2, subtotal: nightlyPrice * 2 })),
      })
      data.payments.push({ id: 'PAY-ADMIN-3ROOM', bookingId: 'BK-ADMIN-3ROOM', status: 'PAID', amount: nightlyPrice * 6, createdAt: isoTime(-2), completedAt: isoTime(-2), reference: 'VNPAY-DEMO-3ROOM', method: 'VNPAY QR' })
      changed = true
    }
  }
  while (data.bookings.length < 10) {
    const sequence = data.bookings.length + 1
    const room = data.rooms[(sequence - 1) % data.rooms.length]
    const hotel = room && data.hotels.find(item => item.id === room.hotelId)
    if (!room || !hotel) break
    const roomCount = sequence % 3 === 0 ? 2 : 1
    const nightCount = 2
    const status = sequence % 4 === 0 ? 'EXPIRED' : sequence % 3 === 0 ? 'CONFIRMED' : 'COMPLETED'
    const total = room.basePrice * roomCount * nightCount
    const bookingId = `BK-ADMIN-${String(sequence).padStart(3, '0')}`
    data.bookings.push({ id: bookingId, userId: 'user-tourist', hotelId: hotel.id, roomId: room.id, checkIn: status === 'COMPLETED' ? isoDay(-sequence * 3) : isoDay(sequence + 12), checkOut: status === 'COMPLETED' ? isoDay(-sequence * 3 + 2) : isoDay(sequence + 14), rooms: roomCount, adults: roomCount * 2, children: 0, guestName: 'Nguyễn Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '', total, nightlyPrices: Array.from({ length: nightCount }, () => room.basePrice * roomCount), status, holdExpiresAt: isoTime(-sequence), createdAt: isoTime(-sequence), policySnapshot: hotel.cancellationPolicy, policyTermsSnapshot: { ...hotel.cancellationTerms }, roomItems: Array.from({ length: roomCount }, (_, index) => ({ roomId: `${room.id}-physical-${index + 1}`, roomNumber: String(301 + index), nightlyPrice: room.basePrice, nights: nightCount, subtotal: room.basePrice * nightCount })) })
    data.payments.push({ id: `PAY-ADMIN-${String(sequence).padStart(3, '0')}`, bookingId, status: status === 'EXPIRED' ? 'FAILED' : 'PAID', amount: total, createdAt: isoTime(-sequence), completedAt: status === 'EXPIRED' ? undefined : isoTime(-sequence), reference: status === 'EXPIRED' ? undefined : `VNPAY-ADMIN-${sequence}`, method: 'VNPAY QR', failureReason: status === 'EXPIRED' ? 'Hết thời gian thanh toán' : undefined })
    changed = true
  }
  data.bookings.forEach(booking => {
    if (!booking.roomItems?.length) {
      const room = data.rooms.find(item => item.id === booking.roomId)
      const count = Math.max(1, booking.rooms)
      const nightCount = Math.max(1, booking.nightlyPrices.length)
      const nightlyPrice = Math.round(booking.total / count / nightCount)
      booking.roomItems = Array.from({ length: count }, (_, index) => ({ roomId: count === 1 ? booking.roomId : `${booking.roomId}-${index + 1}`, roomNumber: count === 1 ? room?.roomNumber ?? '101' : String(201 + index), nightlyPrice, nights: nightCount, subtotal: nightlyPrice * nightCount }))
      changed = true
    }
    const hotelRooms = data.rooms.filter(room => room.hotelId === booking.hotelId)
    const used = new Set<string>()
    let repaired = false
    booking.roomItems = booking.roomItems.map(item => {
      const exact = hotelRooms.find(room => room.id === item.roomId && !used.has(room.id))
      const room = exact ?? hotelRooms.find(candidate => !used.has(candidate.id) && candidate.id === booking.roomId) ?? hotelRooms.find(candidate => !used.has(candidate.id))
      if (!room) return item
      used.add(room.id)
      if (room.id !== item.roomId || room.roomNumber !== item.roomNumber) repaired = true
      return { ...item, roomId: room.id, roomNumber: room.roomNumber ?? item.roomNumber }
    })
    if (repaired) {
      booking.roomIds = booking.roomItems.map(item => item.roomId)
      booking.roomId = booking.roomIds[0] ?? booking.roomId
      booking.rooms = booking.roomItems.length
      changed = true
    }
  })
  data.payments.forEach(payment => {
    if (!payment.method) { payment.method = 'VNPAY QR'; changed = true }
    if (payment.status === 'PAID' && !payment.completedAt) { payment.completedAt = payment.createdAt; changed = true }
  })
  if (!data.settlements.some(settlement => settlement.status === 'PAID')) {
    const booking = data.bookings.find(item => item.id === 'BK-DEMO-003' && item.status === 'COMPLETED')
    const hotel = booking && data.hotels.find(item => item.id === booking.hotelId)
    const partner = hotel && data.partners.find(item => item.id === hotel.partnerId)
    if (booking && hotel && partner) {
      const commission = Math.round(booking.total * partner.commissionRate)
      data.settlements.push({ id: 'SET-ADMIN-PAID', partnerId: partner.id, hotelId: hotel.id, periodStart: booking.checkIn, periodEnd: booking.checkOut, bookingIds: [booking.id], gross: booking.total, commission, adjustment: 0, net: booking.total - commission, status: 'PAID', revision: 1, transferReference: 'MOCK-TRF-ADMIN-PAID' })
      changed = true
    }
  }
  return changed
}

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
  if (normalizeAdminDemo(data)) changed = true
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
