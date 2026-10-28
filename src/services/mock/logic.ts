import type { AppData, Booking, BookingInput, CancellationRule, Destination, Hotel, Itinerary, Payment, PlannerInput, PlannerResult, RoomType, Stopover, TravelActivity, TravelPreference, TravelTopic, User } from '@/types/domain'
import { assert } from '@/lib/errors'
import { addDay, nights, overlap, stayDays, todayPlus, uid } from '@/lib/utils'
import { DEMO_PASSWORD } from './seed'
import { cancellationQuote } from '@/lib/booking'
import { normalizeAmenityName } from '@/lib/amenities'
import { normalizeRoomNumber } from '@/lib/rooms'
import { commit, readData } from './store'

const activeHold = (b: Booking) => b.status === 'PENDING_PAYMENT' && Date.parse(b.holdExpiresAt) > Date.now()
const roomUnits = (data: AppData, booking: Booking, roomId: string) => {
  const exact = booking.roomItems?.filter(item => item.roomId === roomId).length ?? 0
  if (exact) return exact
  const hasPhysicalItems = booking.roomItems?.some(item => data.rooms.some(room => room.id === item.roomId))
  return !hasPhysicalItems && booking.roomId === roomId ? booking.rooms : 0
}
const soldOn = (data: AppData, roomId: string, date: string) => data.bookings.filter(b => b.checkIn <= date && date < b.checkOut && (b.status === 'CONFIRMED' || b.status === 'COMPLETED')).reduce((n, b) => n + roomUnits(data, b, roomId), 0)
const heldOn = (data: AppData, roomId: string, date: string) => data.bookings.filter(b => b.checkIn <= date && date < b.checkOut && activeHold(b)).reduce((n, b) => n + roomUnits(data, b, roomId), 0)
export const inventoryView = (data: AppData, roomId: string, date: string) => {
  const row = data.inventory.find(i => i.roomId === roomId && i.date === date)
  const sold = soldOn(data, roomId, date)
  const held = heldOn(data, roomId, date)
  const offered = row?.offered === 1 ? 1 : 0
  return { row, sold, held, available: Math.max(0, offered - sold - held) }
}
export const availableForStay = (data: AppData, roomId: string, checkIn: string, checkOut: string) => {
  const dates = stayDays(checkIn, checkOut)
  return dates.length ? Math.min(...dates.map(date => inventoryView(data, roomId, date).available)) : 0
}
const opensDuring = (hours: string | undefined, startHour: number, endHour: number) => {
  if (!hours || hours === 'Cả ngày') return true
  const times = [...hours.matchAll(/(\d{2}):(\d{2})/g)].map(match => Number(match[1]) * 60 + Number(match[2]))
  const [open, close] = times
  return open === undefined || close === undefined || open <= startHour * 60 && close >= endHour * 60
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('')
}

export const mock = {
  publicData: async () => {
    const data = readData()
    const destinations = data.destinations.filter(destination => destination.active !== false)
    const hotels = data.hotels.filter(hotel => hotel.approvalStatus === 'VERIFIED' && !hotel.suspended)
    const hotelIds = new Set(hotels.map(hotel => hotel.id))
    const rooms = data.rooms.filter(room => hotelIds.has(room.hotelId) && room.active !== false)
    const roomIds = new Set(rooms.map(room => room.id))
    const inventory = data.inventory.filter(row => roomIds.has(row.roomId))
    const reviews = data.reviews.filter(review => hotelIds.has(review.hotelId) && review.status === 'VISIBLE')
    const { categories, services } = data
    const availability = inventory.map(row => ({ roomId: row.roomId, date: row.date, ...inventoryView(data, row.roomId, row.date) }))
    return { destinations, hotels, rooms, inventory, availability, reviews, categories, services }
  },
  touristData: async (userId: string) => {
    const { users, preferences, trips, stops, activities, bookings, payments, refunds, reviews, favorites } = readData()
    return { user: users.find(u => u.id === userId), preference: preferences.find(p => p.userId === userId), trips: trips.filter(t => t.userId === userId), stops, activities, bookings: bookings.filter(b => b.userId === userId), payments, refunds, reviews, favorites: favorites[userId] ?? [] }
  },
  partnerData: async (userId: string) => {
    const data = readData()
    const partner = data.partners.find(p => p.userId === userId)
    const hotelIds = partner?.hotelIds ?? []
    const bookings = data.bookings.filter(booking => hotelIds.includes(booking.hotelId))
    const bookingIds = new Set(bookings.map(booking => booking.id))
    return {
      user: data.users.find(user => user.id === userId), partner,
      hotels: data.hotels.filter(hotel => hotelIds.includes(hotel.id)),
      rooms: data.rooms.filter(room => hotelIds.includes(room.hotelId)), inventory: data.inventory, bookings,
      payments: data.payments.filter(payment => bookingIds.has(payment.bookingId)),
      refunds: data.refunds.filter(refund => bookingIds.has(refund.bookingId)),
      reviews: data.reviews.filter(review => hotelIds.includes(review.hotelId)),
      settlements: data.settlements.filter(settlement => settlement.partnerId === partner?.id),
    }
  },
  adminData: async () => {
    const { users, partners, hotels, rooms, inventory, destinations, topics, trips, stops, activities, bookings, payments, refunds, reviews, categories, services, settlements } = readData()
    return { users, partners, hotels, rooms, inventory, destinations, topics, trips, stops, activities, bookings, payments, refunds, reviews, categories, services, settlements }
  },
  login: async (email: string, password: string): Promise<User> => {
    const user = readData().users.find(u => u.email.toLowerCase() === email.toLowerCase() || u.name.toLowerCase() === email.toLowerCase())
    assert(user && user.verified, 'LOGIN', 'Tài khoản không tồn tại hoặc chưa xác minh.', 401)
    const valid = user.passwordHash ? user.passwordHash === await hash(password) : user.id.startsWith('user-') && password === DEMO_PASSWORD
    assert(valid, 'LOGIN', 'Mật khẩu không chính xác.', 401)
    return user
  },
  register: async (name: string, email: string, password: string) => {
    assert(!readData().users.some(u => u.email.toLowerCase() === email.toLowerCase()), 'DUPLICATE', 'Email đã được sử dụng.', 409)
    sessionStorage.setItem('smarttravel.pending', JSON.stringify({ name, email, passwordHash: await hash(password), expiresAt: Date.now() + 5 * 60000 }))
    return { demoOtp: '123456' }
  },
  verifyOtp: async (otp: string): Promise<User> => {
    const raw = sessionStorage.getItem('smarttravel.pending')
    assert(raw, 'OTP', 'Không có yêu cầu xác thực. Vui lòng đăng ký lại.')
    const pending = JSON.parse(raw) as { name: string; email: string; passwordHash: string; expiresAt: number }
    assert(pending.expiresAt > Date.now(), 'OTP_EXPIRED', 'Mã demo đã hết hạn. Vui lòng đăng ký lại.')
    assert(otp === '123456', 'OTP', 'Mã OTP demo không đúng.')
    const user = commit(data => {
      assert(!data.users.some(u => u.email.toLowerCase() === pending.email.toLowerCase()), 'DUPLICATE', 'Email đã được sử dụng.', 409)
      const record: User = { id: uid('tourist'), name: pending.name, email: pending.email, role: 'tourist', verified: true, passwordHash: pending.passwordHash }
      data.users.push(record)
      return record
    })
    sessionStorage.removeItem('smarttravel.pending')
    return user
  },
  requestOtp: async (email: string) => {
    assert(readData().users.some(u => u.email.toLowerCase() === email.toLowerCase()), 'USER', 'Không tìm thấy tài khoản với email này.', 404)
    sessionStorage.setItem('smarttravel.reset', JSON.stringify({ email, expiresAt: Date.now() + 5 * 60000 }))
    return { demoOtp: '123456' }
  },
  resendOtp: async () => {
    const raw = sessionStorage.getItem('smarttravel.pending')
    assert(raw, 'OTP', 'Không có yêu cầu xác thực.')
    const pending = JSON.parse(raw) as { expiresAt: number }
    pending.expiresAt = Date.now() + 5 * 60000
    sessionStorage.setItem('smarttravel.pending', JSON.stringify(pending))
    return { demoOtp: '123456' }
  },
  resetPassword: async (email: string, password: string, otp: string) => {
    assert(otp === '123456', 'OTP', 'Mã OTP demo không đúng.')
    const raw = sessionStorage.getItem('smarttravel.reset')
    assert(raw, 'OTP', 'Vui lòng yêu cầu mã đặt lại mật khẩu.')
    const pending = JSON.parse(raw) as { email: string; expiresAt: number }
    assert(pending.email === email && pending.expiresAt > Date.now(), 'OTP_EXPIRED', 'Mã demo đã hết hạn.')
    const passwordHash = await hash(password)
    commit(data => { const user = data.users.find(u => u.email === email); assert(user, 'USER', 'Không tìm thấy tài khoản.'); user.passwordHash = passwordHash })
    sessionStorage.removeItem('smarttravel.reset')
  },
  saveProfile: async (userId: string, values: Pick<User, 'name' | 'phone'>) => commit(data => {
    const user = data.users.find(u => u.id === userId); assert(user, 'USER', 'Không tìm thấy tài khoản.', 404)
    user.name = values.name; user.phone = values.phone
    return user
  }),
  requestDeletion: async (userId: string, password: string) => {
    const user = readData().users.find(u => u.id === userId)
    assert(user, 'USER', 'Không tìm thấy tài khoản.', 404)
    const valid = user.passwordHash ? user.passwordHash === await hash(password) : password === DEMO_PASSWORD
    assert(valid, 'PASSWORD', 'Mật khẩu xác thực không đúng.', 401)
    return commit(data => { const record = data.users.find(u => u.id === userId); assert(record, 'USER', 'Không tìm thấy tài khoản.'); record.deletionRequestedAt = new Date().toISOString(); return record })
  },
  savePreference: async (userId: string, pref: Omit<TravelPreference, 'userId'>) => commit(data => {
    data.preferences = data.preferences.filter(p => p.userId !== userId)
    const next = { ...pref, userId }; data.preferences.push(next); return next
  }),
  clearPreference: async (userId: string) => commit(data => { data.preferences = data.preferences.filter(p => p.userId !== userId) }),
  toggleFavorite: async (userId: string, id: string) => commit(data => {
    const list = data.favorites[userId] ?? []
    data.favorites[userId] = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
    return data.favorites[userId]
  }),
  recommend: async (query: string, userId?: string) => {
    const data = readData()
    const pref = data.preferences.find(p => p.userId === userId)
    const terms = (query + ' ' + (pref?.interests.join(' ') ?? '')).toLowerCase().split(/\s+/).filter(x => x.length > 2)
    const items = [
      ...data.destinations.map(x => ({ id: x.id, type: 'destination' as const, name: x.name, city: x.city, price: x.price, tags: x.tags, description: x.description })),
      ...data.hotels.map(x => ({ id: x.id, type: 'hotel' as const, name: x.name, city: x.city, price: data.rooms.find(r => r.hotelId === x.id)?.basePrice ?? 0, tags: x.amenities, description: x.description })),
    ]
    return items.map(item => {
      const searchable = (item.name + ' ' + item.city + ' ' + item.tags.join(' ')).toLowerCase()
      const matches = terms.filter(t => searchable.includes(t))
      return { ...item, score: matches.length, reason: matches.length ? 'Phù hợp: ' + matches.slice(0, 3).join(', ') : 'Có trong danh mục du lịch của hệ thống' }
    }).sort((a, b) => b.score - a.score).slice(0, 12)
  },
  plan: async (input: PlannerInput): Promise<PlannerResult> => {
    assert(input.city.trim(), 'CITY', 'Vui lòng chọn điểm đến.')
    assert(input.startDate >= todayPlus(0), 'DATE', 'Ngày bắt đầu không được ở quá khứ.')
    assert(input.startDate <= input.endDate, 'DATE', 'Ngày kết thúc không hợp lệ.')
    assert(input.adults >= 1 && input.children >= 0 && input.budget > 0, 'INPUT', 'Kiểm tra số khách và ngân sách.')
    const days = nights(input.startDate, input.endDate) + 1
    assert(days > 0 && days <= 10, 'DATE', 'Chuyến đi demo hỗ trợ từ 1 đến 10 ngày.')
    const data = readData()
    const places = data.destinations.filter(d => d.city.toLowerCase().includes(input.city.toLowerCase()))
    assert(places.length, 'EMPTY', 'Chưa có dữ liệu địa điểm cho điểm đến này.')
    const guests = input.adults + input.children
    const lodgingCost = Math.max(0, days - 1) * 1200000
    const foodCost = days * guests * 250000
    let remainingActivityBudget = Math.max(0, input.budget - lodgingCost - foodCost)
    const matches = (place: typeof places[number]) => input.interests.filter(tag => place.tags.includes(tag) || place.category === tag)
    const requested = (place: typeof places[number]) => input.note.toLowerCase().includes(place.category.toLowerCase())
    const score = (place: typeof places[number]) => matches(place).length * 10 + (requested(place) ? 18 : 0) + (place.rating ?? 0) - (input.style === 'Tiết kiệm' ? place.price / 100000 : 0)
    const ranked = [...places].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'vi'))
    const tripId = uid('trip')
    const trip: Itinerary = { id: tripId, userId: '', name: 'Khám phá ' + input.city, city: input.city, startDate: input.startDate, endDate: input.endDate, adults: input.adults, children: input.children, budget: input.budget, note: input.note, source: 'demo-planner', status: 'DRAFT' }
    const stops: Stopover[] = []
    const activities: TravelActivity[] = []
    const reasons: Record<string, string> = {}
    let activityCost = 0
    const quiet = input.style === 'Nghỉ dưỡng' || /giảm|ít hoạt động|thư giãn/i.test(input.note)
    for (let d = 0; d < days; d++) {
      const dateText = addDay(input.startDate, d)
      const count = quiet ? 2 : 3
      const usedToday = new Set<string>()
      for (let j = 0; j < count; j++) {
        const startHour = j === 0 ? 9 : j === 1 ? 13 : 16
        const endHour = startHour + (j === 2 ? 1 : 2)
        const openPlaces = ranked.filter(place => !usedToday.has(place.id) && opensDuring(place.openingHours, startHour, endHour))
        const affordable = openPlaces.filter(place => place.price * guests <= Math.max(0, remainingActivityBudget))
        const choices = affordable.length ? affordable : openPlaces
        const place = choices.length ? choices[(d + j) % choices.length] : undefined
        if (!place) continue
        usedToday.add(place.id)
        const start = dateText + 'T' + String(startHour).padStart(2, '0') + ':00'
        const end = dateText + 'T' + String(endHour).padStart(2, '0') + ':00'
        const stopId = uid('stop')
        stops.push({ id: stopId, tripId, placeId: place.id, name: place.name, address: place.region + ', ' + place.city, start, end, order: stops.length + 1, note: place.description, lat: place.lat, lng: place.lng })
        activities.push({ id: uid('activity'), stopId, name: 'Tham quan ' + place.name, start, end, placeId: place.id, note: place.openingHours ? 'Giờ tham khảo: ' + place.openingHours : '', cost: place.price })
        const matched = matches(place)
        reasons[stopId] = (requested(place) ? 'Theo yêu cầu về ' + place.category : matched.length ? 'Hợp sở thích ' + matched.join(', ') : 'Có trong danh mục ' + input.city) + '; mở cửa ' + (place.openingHours ?? 'chưa có thông tin')
        activityCost += place.price * guests
        remainingActivityBudget -= place.price * guests
      }
    }
    assert(stops.length > 0, 'OPEN_HOURS', 'Không có địa điểm mở cửa trong khung giờ lịch trình demo.')
    const costBreakdown = { lodging: lodgingCost, food: foodCost, activities: activityCost }
    const totalCost = costBreakdown.lodging + costBreakdown.food + costBreakdown.activities
    return { trip, stops, activities, totalCost, costBreakdown, reasons, input, explanation: 'Lịch demo chọn địa điểm trong danh mục theo sở thích, ngân sách, giờ mở cửa và nhịp độ đã chọn. Khoảng nghỉ giữa các hoạt động chưa tính thời gian di chuyển. Lưu trú tạm tính 1.200.000 đ/đêm và ăn uống 250.000 đ/người/ngày.' }
  },
  savePlannedTrip: async (userId: string, result: PlannerResult) => commit(data => {
    const trip = { ...result.trip, userId, status: 'SAVED' as const }
    assert(!data.trips.some(t => t.id === trip.id), 'DUPLICATE', 'Lịch trình đã được lưu.')
    data.trips.push(trip); data.stops.push(...result.stops); data.activities.push(...result.activities)
    return trip
  }),
  saveTrip: async (userId: string, values: Itinerary) => commit(data => {
    assert(values.startDate <= values.endDate, 'DATE', 'Ngày kết thúc phải sau ngày bắt đầu.')
    const old = data.trips.find(t => t.id === values.id)
    if (old) {
      assert(old.userId === userId, 'FORBIDDEN', 'Không có quyền sửa chuyến đi.', 403)
      assert(data.stops.filter(s => s.tripId === old.id).every(s => s.start.slice(0, 10) >= values.startDate && s.end.slice(0, 10) <= values.endDate), 'TIME', 'Ngày mới không bao gồm mọi điểm dừng hiện có.')
      Object.assign(old, values); return old
    }
    const trip = { ...values, id: uid('trip'), userId, status: 'SAVED' as const }
    data.trips.push(trip); return trip
  }),
  deleteTrip: async (userId: string, tripId: string) => commit(data => {
    const trip = data.trips.find(t => t.id === tripId); assert(trip?.userId === userId, 'FORBIDDEN', 'Không có quyền xóa chuyến đi.', 403)
    const stopIds = data.stops.filter(s => s.tripId === tripId).map(s => s.id)
    data.activities = data.activities.filter(a => !stopIds.includes(a.stopId))
    data.stops = data.stops.filter(s => s.tripId !== tripId)
    data.trips = data.trips.filter(t => t.id !== tripId)
  }),
  saveStop: async (userId: string, stop: Stopover) => commit(data => {
    const trip = data.trips.find(t => t.id === stop.tripId); assert(trip?.userId === userId, 'FORBIDDEN', 'Không có quyền sửa điểm dừng.', 403)
    assert(stop.start < stop.end && stop.start.slice(0, 10) >= trip.startDate && stop.end.slice(0, 10) <= trip.endDate, 'TIME', 'Thời gian điểm dừng không hợp lệ.')
    assert(!data.stops.some(s => s.tripId === stop.tripId && s.id !== stop.id && overlap(s.start, s.end, stop.start, stop.end)), 'CONFLICT', 'Điểm dừng trùng thời gian.')
    assert(data.activities.filter(a => a.stopId === stop.id).every(a => a.start >= stop.start && a.end <= stop.end), 'TIME', 'Thời gian mới không bao gồm mọi hoạt động hiện có.')
    const old = data.stops.find(s => s.id === stop.id)
    if (old) Object.assign(old, stop)
    else data.stops.push({ ...stop, id: uid('stop') })
  }),
  deleteStop: async (userId: string, stopId: string) => commit(data => {
    const stop = data.stops.find(s => s.id === stopId); assert(stop, 'NOT_FOUND', 'Không tìm thấy điểm dừng.', 404)
    assert(data.trips.some(t => t.id === stop.tripId && t.userId === userId), 'FORBIDDEN', 'Không có quyền xóa.', 403)
    data.stops = data.stops.filter(s => s.id !== stopId); data.activities = data.activities.filter(a => a.stopId !== stopId)
  }),
  saveActivity: async (userId: string, activity: TravelActivity) => commit(data => {
    const stop = data.stops.find(s => s.id === activity.stopId); assert(stop, 'NOT_FOUND', 'Không tìm thấy điểm dừng.', 404)
    assert(data.trips.some(t => t.id === stop.tripId && t.userId === userId), 'FORBIDDEN', 'Không có quyền sửa.', 403)
    assert(activity.start < activity.end && activity.start >= stop.start && activity.end <= stop.end, 'TIME', 'Hoạt động phải nằm trong thời gian điểm dừng.')
    assert(!data.activities.some(a => a.stopId === stop.id && a.id !== activity.id && overlap(a.start, a.end, activity.start, activity.end)), 'CONFLICT', 'Hoạt động trùng thời gian.')
    const old = data.activities.find(a => a.id === activity.id)
    if (old) Object.assign(old, activity)
    else data.activities.push({ ...activity, id: uid('activity') })
  }),
  deleteActivity: async (userId: string, activityId: string) => commit(data => {
    const activity = data.activities.find(a => a.id === activityId)
    const stop = data.stops.find(s => s.id === activity?.stopId)
    assert(stop && data.trips.some(t => t.id === stop.tripId && t.userId === userId), 'FORBIDDEN', 'Không có quyền xóa.', 403)
    data.activities = data.activities.filter(a => a.id !== activityId)
  }),
  createBooking: async (userId: string, values: BookingInput) => commit(data => {
    assert(values.checkIn >= todayPlus(0) && nights(values.checkIn, values.checkOut) > 0, 'DATE', 'Ngày nhận/trả phòng không hợp lệ.')
    const selectedIds = [...new Set(values.roomIds?.length ? values.roomIds : [values.roomId])]
    assert(selectedIds.length > 0 && values.adults > 0, 'GUESTS', 'Số khách và số phòng phải lớn hơn 0.')
    const selectedRooms = selectedIds.map(roomId => data.rooms.find(room => room.id === roomId && room.hotelId === values.hotelId))
    const hotel = data.hotels.find(h => h.id === values.hotelId)
    assert(hotel && selectedRooms.every(Boolean), 'NOT_FOUND', 'Không tìm thấy một hoặc nhiều phòng.', 404)
    const rooms = selectedRooms.filter((room): room is RoomType => Boolean(room))
    assert(rooms.every(room => room.active !== false), 'ROOM_INACTIVE', 'Có phòng đang bảo trì hoặc ngừng hoạt động.', 409)
    assert(values.adults + values.children <= rooms.reduce((sum, room) => sum + room.capacity, 0), 'CAPACITY', 'Số khách vượt tổng sức chứa các phòng.')
    const selectionKey = selectedIds.slice().sort().join(',')
    const existing = data.bookings.find(b => b.userId === userId && activeHold(b) && (b.roomIds ?? [b.roomId]).slice().sort().join(',') === selectionKey && b.checkIn === values.checkIn && b.checkOut === values.checkOut)
    if (existing) return existing
    const dates = stayDays(values.checkIn, values.checkOut)
    assert(rooms.every(room => dates.every(date => inventoryView(data, room.id, date).available > 0)), 'SOLD_OUT', 'Một hoặc nhiều phòng không còn trống cho toàn bộ kỳ lưu trú.', 409)
    const nightlyPrices = dates.map(date => rooms.reduce((sum, room) => sum + (data.inventory.find(item => item.roomId === room.id && item.date === date)?.price ?? room.basePrice), 0))
    const roomItems = rooms.map(room => {
      const subtotal = dates.reduce((sum, date) => sum + (data.inventory.find(item => item.roomId === room.id && item.date === date)?.price ?? room.basePrice), 0)
      return { roomId: room.id, roomNumber: room.roomNumber ?? room.id, nightlyPrice: Math.round(subtotal / dates.length), nights: dates.length, subtotal }
    })
    const total = roomItems.reduce((sum, item) => sum + item.subtotal, 0)
    const booking: Booking = { ...values, roomId: rooms[0]!.id, roomIds: selectedIds, rooms: rooms.length, roomItems, id: uid('BK'), userId, total, nightlyPrices, status: 'PENDING_PAYMENT', holdExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(), createdAt: new Date().toISOString(), policySnapshot: hotel.cancellationPolicy, policyTermsSnapshot: { ...hotel.cancellationTerms } }
    data.bookings.push(booking)
    data.payments.push({ id: uid('PAY'), bookingId: booking.id, status: 'PENDING', amount: total, createdAt: booking.createdAt })
    return booking
  }),
  payBooking: async (userId: string, bookingId: string, outcome: 'success' | 'failure' | 'expire') => commit(data => {
    const booking = data.bookings.find(b => b.id === bookingId && b.userId === userId)
    assert(booking, 'NOT_FOUND', 'Không tìm thấy booking.', 404)
    assert(booking.status === 'PENDING_PAYMENT' && activeHold(booking), 'EXPIRED', 'Thời gian giữ phòng đã hết.', 409)
    const payment: Payment = { id: uid('PAY'), bookingId, status: 'PROCESSING', amount: booking.total, createdAt: new Date().toISOString() }
    data.payments.push(payment)
    if (outcome === 'success') { payment.status = 'PAID'; booking.status = 'CONFIRMED'; payment.reference = uid('MOCK') }
    else if (outcome === 'failure') payment.status = 'FAILED'
    else { payment.status = 'EXPIRED'; booking.status = 'EXPIRED' }
    return booking
  }),
  cancelBooking: async (userId: string, bookingId: string) => commit(data => {
    const booking = data.bookings.find(b => b.id === bookingId && b.userId === userId)
    assert(booking?.status === 'CONFIRMED', 'STATUS', 'Booking hiện không thể hủy.', 409)
    const quote = cancellationQuote(booking)
    assert(quote.allowed, 'CHECKED_IN', 'Đã đến giờ nhận phòng; không thể hủy trực tuyến.', 409)
    const fee = quote.fee
    booking.status = 'CANCELLED'; booking.cancelledAt = new Date().toISOString(); booking.cancellationFee = fee
    if (booking.total - fee > 0) {
      const refund = { id: uid('REF'), bookingId, status: 'PENDING' as const, amount: booking.total - fee, createdAt: new Date().toISOString() }
      data.refunds.push(refund); booking.refundId = refund.id
    }
    return booking
  }),
  resolveRefund: async (bookingId: string, outcome: 'PROCESSING' | 'REFUNDED' | 'FAILED') => commit(data => {
    const refund = data.refunds.find(r => r.bookingId === bookingId)
    assert(refund && (refund.status === 'PENDING' && outcome === 'PROCESSING' || refund.status === 'PROCESSING' && (outcome === 'REFUNDED' || outcome === 'FAILED')), 'STATUS', 'Không thể chuyển trạng thái hoàn tiền.', 409)
    refund.status = outcome; return refund
  }),
  addReview: async (userId: string, bookingId: string, stars: number, content: string) => commit(data => {
    const booking = data.bookings.find(b => b.id === bookingId && b.userId === userId)
    assert(booking?.status === 'COMPLETED', 'STATUS', 'Chỉ booking đã hoàn tất mới được đánh giá.', 409)
    assert(!data.reviews.some(r => r.bookingId === bookingId), 'DUPLICATE', 'Booking này đã được đánh giá.', 409)
    assert(stars >= 1 && stars <= 5 && content.trim().length >= 10, 'REVIEW', 'Chọn 1–5 sao và nhập ít nhất 10 ký tự.')
    const review = { id: uid('REV'), bookingId, hotelId: booking.hotelId, userId, stars, content, status: 'VISIBLE' as const, createdAt: new Date().toISOString() }
    data.reviews.push(review); return review
  }),
  saveRoom: async (userId: string, room: RoomType) => commit(data => {
    const partner = data.partners.find(p => p.userId === userId)
    assert(partner?.hotelIds.includes(room.hotelId), 'FORBIDDEN', 'Không có quyền quản lý khách sạn.', 403)
    assert(room.amenities.every(amenity => partner?.amenities?.includes(amenity)), 'AMENITY', 'Phòng có tiện nghi không thuộc danh mục của chủ khách sạn.')
    assert(room.name.trim() && room.capacity > 0 && room.basePrice > 0, 'VALIDATION', 'Tên, sức chứa và giá phòng không hợp lệ.')
    assert(room.images?.length, 'VALIDATION', 'Phòng phải có ít nhất một ảnh.')
    assert(room.roomNumber?.trim(), 'VALIDATION', 'Số phòng không được để trống.')
    room.roomNumber = normalizeRoomNumber(room.roomNumber!)
    assert(!data.rooms.some(item => item.hotelId === room.hotelId && normalizeRoomNumber(item.roomNumber ?? '') === room.roomNumber && item.id !== room.id), 'DUPLICATE', 'Số phòng đã tồn tại trong khách sạn.', 409)
    room.images = [...new Set(room.images ?? [])]
    room.image = room.images[0]
    const old = data.rooms.find(r => r.id === room.id)
    if (old) { Object.assign(old, room); return old }
    const created = { ...room, id: uid('room') }
    data.rooms.push(created)
    for (let offset = 0; offset < 90; offset++) data.inventory.push({ roomId: created.id, date: todayPlus(offset), offered: 1, price: created.basePrice, revision: 1 })
    return created
  }),
  savePartnerHotel: async (userId: string, values: Omit<Hotel, 'partnerId'>, submit: boolean) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); assert(partner, 'PARTNER', 'Không tìm thấy hồ sơ chủ khách sạn.', 404)
    assert(values.amenities.every(amenity => partner.amenities?.includes(amenity)), 'AMENITY', 'Khách sạn có tiện nghi không thuộc danh mục của chủ khách sạn.')
    assert(values.name.trim() && values.address.trim() && values.city.trim(), 'VALIDATION', 'Tên, địa chỉ và tỉnh/thành không được để trống.')
    assert(values.images?.length, 'VALIDATION', 'Khách sạn phải có ít nhất một ảnh.')
    values.images = [...new Set(values.images ?? [])]
    values.image = values.images[0]
    const existing = data.hotels.find(item => item.id === values.id && partner.hotelIds.includes(item.id))
    if (existing) {
      Object.assign(existing, values)
      if (submit && existing.approvalStatus !== 'VERIFIED') { existing.approvalStatus = 'PENDING'; existing.rejectionReason = undefined }
      return existing
    }
    const hotel: Hotel = { ...values, id: uid('hotel'), partnerId: partner.id, approvalStatus: submit ? 'PENDING' : 'NEEDS_INFO', registeredAt: new Date().toISOString() }
    data.hotels.push(hotel); partner.hotelIds.push(hotel.id); partner.revision++
    return hotel
  }),
  saveHotelAmenities: async (userId: string, amenities: string[], roomId?: string, hotelId?: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); assert(partner, 'PARTNER', 'Không tìm thấy hồ sơ chủ khách sạn.', 404)
    assert(amenities.every(amenity => partner.amenities?.includes(amenity)), 'AMENITY', 'Có tiện nghi không thuộc danh mục của chủ khách sạn.')
    if (roomId) { const room = data.rooms.find(item => item.id === roomId); assert(room && partner.hotelIds.includes(room.hotelId), 'FORBIDDEN', 'Không có quyền sửa phòng này.', 403); room.amenities = amenities; return room }
    const hotel = data.hotels.find(item => item.id === hotelId && partner.hotelIds.includes(item.id)); assert(hotel, 'HOTEL', 'Vui lòng chọn khách sạn.', 404); hotel.amenities = amenities; return hotel
  }),
  addPartnerAmenity: async (userId: string, value: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); assert(partner, 'PARTNER', 'Không tìm thấy hồ sơ chủ khách sạn.', 404)
    const name = normalizeAmenityName(value)
    assert(name.length >= 2 && name.length <= 50, 'VALIDATION', 'Tên tiện nghi phải có từ 2 đến 50 ký tự.')
    assert(!partner.amenities?.some(item => item.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')), 'DUPLICATE', 'Tiện nghi này đã có trong danh mục.', 409)
    partner.amenities = [...(partner.amenities ?? []), name]
    return partner
  }),
  updatePartnerAmenity: async (userId: string, currentValue: string, value: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); assert(partner, 'PARTNER', 'Không tìm thấy hồ sơ chủ khách sạn.', 404)
    const current = partner.amenities?.find(item => item.toLocaleLowerCase('vi') === currentValue.toLocaleLowerCase('vi'))
    assert(current, 'NOT_FOUND', 'Không tìm thấy tiện nghi.', 404)
    const name = normalizeAmenityName(value)
    assert(name.length >= 2 && name.length <= 50, 'VALIDATION', 'Tên tiện nghi phải có từ 2 đến 50 ký tự.')
    assert(!partner.amenities?.some(item => item !== current && item.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')), 'DUPLICATE', 'Tiện nghi này đã có trong danh mục.', 409)
    partner.amenities = partner.amenities?.map(item => item === current ? name : item)
    const hotelIds = new Set(partner.hotelIds)
    for (const hotel of data.hotels.filter(item => hotelIds.has(item.id))) hotel.amenities = hotel.amenities.map(item => item === current ? name : item)
    for (const room of data.rooms.filter(item => hotelIds.has(item.hotelId))) room.amenities = room.amenities.map(item => item === current ? name : item)
    return partner
  }),
  deletePartnerAmenity: async (userId: string, value: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); assert(partner, 'PARTNER', 'Không tìm thấy hồ sơ chủ khách sạn.', 404)
    const current = partner.amenities?.find(item => item.toLocaleLowerCase('vi') === value.toLocaleLowerCase('vi'))
    assert(current, 'NOT_FOUND', 'Không tìm thấy tiện nghi.', 404)
    partner.amenities = partner.amenities?.filter(item => item !== current)
    const hotelIds = new Set(partner.hotelIds)
    for (const hotel of data.hotels.filter(item => hotelIds.has(item.id))) hotel.amenities = hotel.amenities.filter(item => item !== current)
    for (const room of data.rooms.filter(item => hotelIds.has(item.hotelId))) room.amenities = room.amenities.filter(item => item !== current)
    return partner
  }),
  saveCancellationPolicy: async (userId: string, policy: string, rules: CancellationRule[], hotelId?: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); const hotel = data.hotels.find(item => item.id === hotelId && partner?.hotelIds.includes(item.id)); assert(hotel, 'HOTEL', 'Vui lòng chọn khách sạn.', 404)
    const normalized = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn)
    assert(policy.trim() && normalized.length > 0 && normalized.every(rule => Number.isInteger(rule.hoursBeforeCheckIn) && rule.hoursBeforeCheckIn >= 0 && rule.refundRate >= 0 && rule.refundRate <= 1), 'VALIDATION', 'Thông tin chính sách hủy không hợp lệ.')
    assert(new Set(normalized.map(rule => rule.hoursBeforeCheckIn)).size === normalized.length, 'DUPLICATE', 'Mỗi mốc thời gian chỉ được xuất hiện một lần.')
    assert(normalized.every((rule, index) => index === 0 || normalized[index - 1]!.refundRate >= rule.refundRate), 'ORDER', 'Mốc hủy sớm hơn không được có tỷ lệ hoàn thấp hơn mốc hủy muộn.')
    const fullRefund = normalized.filter(rule => rule.refundRate === 1).at(-1)
    hotel.cancellationPolicy = policy
    hotel.cancellationTerms = {
      ...hotel.cancellationTerms,
      freeUntilHours: fullRefund?.hoursBeforeCheckIn ?? normalized[0]!.hoursBeforeCheckIn,
      lateFeeRate: 1 - normalized.at(-1)!.refundRate,
      rules: normalized,
    }
    return hotel
  }),
  toggleRoomActive: async (userId: string, roomId: string) => commit(data => {
    const partner = data.partners.find(item => item.userId === userId); const room = data.rooms.find(item => item.id === roomId); assert(room && partner?.hotelIds.includes(room.hotelId), 'FORBIDDEN', 'Không có quyền sửa phòng này.', 403)
    room.active = room.active === false
    return room
  }),
  saveInventory: async (userId: string, roomId: string, rows: { date: string; offered: number; price: number; revision: number }[]) => commit(data => {
    const room = data.rooms.find(r => r.id === roomId)
    const partner = data.partners.find(p => p.userId === userId)
    assert(room && partner?.hotelIds.includes(room.hotelId), 'FORBIDDEN', 'Không có quyền sửa lịch phòng.', 403)
    for (const row of rows) {
      assert(row.date >= todayPlus(0), 'DATE', 'Không thể thay đổi lịch phòng trong quá khứ.')
      const current = data.inventory.find(i => i.roomId === roomId && i.date === row.date)
      assert((current?.revision ?? 0) === row.revision, 'CONFLICT', 'Lịch phòng đã thay đổi. Vui lòng tải lại.', 409)
      assert(Number.isInteger(row.offered) && (row.offered === 0 || row.offered === 1) && row.price > 0, 'VALIDATION', 'Trạng thái mở bán hoặc giá không hợp lệ.')
      assert(row.offered >= soldOn(data, roomId, row.date) + heldOn(data, roomId, row.date), 'CAPACITY', 'Số phòng bán thấp hơn số đã đặt và đang giữ.', 409)
    }
    for (const row of rows) {
      const current = data.inventory.find(i => i.roomId === roomId && i.date === row.date)
      if (current) Object.assign(current, { offered: row.offered, price: row.price, revision: current.revision + 1 })
      else data.inventory.push({ roomId, ...row, revision: 1 })
    }
  }),
  verifyPartner: async (id: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO', note: string, revision: number) => commit(data => {
    const partner = data.partners.find(p => p.id === id); assert(partner, 'NOT_FOUND', 'Không tìm thấy chủ khách sạn.', 404)
    assert(partner.revision === revision, 'CONFLICT', 'Hồ sơ đã thay đổi. Vui lòng tải lại.', 409)
    assert(status === 'VERIFIED' || note.trim(), 'NOTE', 'Vui lòng nhập lý do hoặc nội dung yêu cầu bổ sung.')
    partner.status = status; partner.note = note; partner.revision++
  }),
  verifyHotel: async (id: string, status: 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO', note: string) => commit(data => {
    const hotel = data.hotels.find(item => item.id === id); assert(hotel, 'NOT_FOUND', 'Không tìm thấy khách sạn.', 404)
    assert(status === 'VERIFIED' || note.trim(), 'NOTE', 'Vui lòng nhập lý do hoặc nội dung yêu cầu bổ sung.')
    hotel.approvalStatus = status
    hotel.rejectionReason = status === 'REJECTED' ? note : undefined
    hotel.approvedAt = status === 'VERIFIED' ? new Date().toISOString() : undefined
    return hotel
  }),
  toggleUserActive: async (id: string) => commit(data => {
    const user = data.users.find(item => item.id === id); assert(user, 'NOT_FOUND', 'Không tìm thấy người dùng.', 404)
    assert(user.role !== 'admin', 'FORBIDDEN', 'Không thể khóa tài khoản quản trị đang sử dụng.', 403)
    user.active = user.active === false
    return user
  }),
  toggleHotelSuspended: async (id: string) => commit(data => {
    const hotel = data.hotels.find(item => item.id === id); assert(hotel, 'NOT_FOUND', 'Không tìm thấy khách sạn.', 404)
    assert(hotel.approvalStatus === 'VERIFIED', 'STATUS', 'Chỉ khách sạn đã duyệt mới có thể tạm ngừng.', 409)
    hotel.suspended = !hotel.suspended
    return hotel
  }),
  saveDestination: async (id: string | undefined, values: Omit<Destination, 'id'>) => commit(data => {
    assert(values.name.trim() && values.city.trim() && values.region.trim(), 'VALIDATION', 'Tên, tỉnh/thành và địa chỉ không được để trống.')
    assert(values.price >= 0, 'VALIDATION', 'Giá tham khảo không hợp lệ.')
    const current = data.destinations.find(item => item.id === id)
    if (current) Object.assign(current, values)
    else data.destinations.unshift({ ...values, id: uid('destination') })
  }),
  toggleDestination: async (id: string) => commit(data => {
    const destination = data.destinations.find(item => item.id === id); assert(destination, 'NOT_FOUND', 'Không tìm thấy địa điểm.', 404)
    destination.active = destination.active === false
  }),
  saveTopic: async (id: string | undefined, values: Omit<TravelTopic, 'id'>) => commit(data => {
    assert(values.name.trim(), 'VALIDATION', 'Tên chủ đề không được để trống.')
    const current = data.topics.find(item => item.id === id)
    if (current) Object.assign(current, values)
    else data.topics.push({ ...values, id: uid('topic') })
  }),
  toggleTopic: async (id: string) => commit(data => {
    const topic = data.topics.find(item => item.id === id); assert(topic, 'NOT_FOUND', 'Không tìm thấy chủ đề.', 404)
    topic.active = !topic.active
  }),
  saveCategory: async (id: string | undefined, name: string, description: string, active: boolean) => commit(data => {
    assert(name.trim(), 'NAME', 'Tên danh mục không được để trống.')
    const old = data.categories.find(c => c.id === id)
    if (old) Object.assign(old, { name, description, active })
    else data.categories.push({ id: uid('cat'), name, description, active })
  }),
  toggleService: async (id: string) => commit(data => {
    const service = data.services.find(s => s.id === id); assert(service, 'NOT_FOUND', 'Không tìm thấy dịch vụ.', 404)
    service.active = !service.active
  }),
  moderateReview: async (id: string, status: 'VISIBLE' | 'HIDDEN', reason: string) => commit(data => {
    const review = data.reviews.find(r => r.id === id); assert(review, 'NOT_FOUND', 'Không tìm thấy đánh giá.', 404)
    assert(status === 'VISIBLE' || reason.trim(), 'REASON', 'Cần nhập lý do ẩn đánh giá.')
    review.status = status; review.moderationReason = reason
  }),
  transitionSettlement: async (id: string, next: 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED', revision: number) => commit(data => {
    const settlement = data.settlements.find(s => s.id === id); assert(settlement, 'NOT_FOUND', 'Không tìm thấy khoản đối soát.', 404)
    assert(settlement.revision === revision, 'CONFLICT', 'Dữ liệu đối soát đã thay đổi.', 409)
    const allowed = { DRAFT: ['APPROVED'], APPROVED: ['PROCESSING'], PROCESSING: ['PAID', 'FAILED'], FAILED: ['APPROVED'], PAID: [] } as const
    assert((allowed[settlement.status] as readonly string[]).includes(next), 'STATUS', 'Không thể chuyển trạng thái đối soát.', 409)
    if (next === 'APPROVED') {
      assert(settlement.bookingIds.every(bookingId => {
        const booking = data.bookings.find(b => b.id === bookingId)
        return booking?.status === 'COMPLETED' && data.payments.some(p => p.bookingId === bookingId && p.status === 'PAID') && !data.settlements.some(s => s.id !== settlement.id && s.bookingIds.includes(bookingId) && ['APPROVED', 'PROCESSING', 'PAID'].includes(s.status))
      }), 'ELIGIBILITY', 'Có booking chưa đủ điều kiện hoặc đã thuộc khoản chi trả khác.', 409)
    }
    settlement.status = next; settlement.revision++
    if (next === 'PAID') settlement.transferReference = uid('MOCK-TRF')
    return settlement
  }),
  reset: async () => { const { resetData } = await import('./store'); resetData() },
}

export type MockRepository = typeof mock
export const snapshot = readData
