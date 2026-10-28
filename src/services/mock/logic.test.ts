import { beforeEach, describe, expect, it } from 'vitest'
import { mock, inventoryView, snapshot } from './logic'
import { todayPlus } from '@/lib/utils'
import { cancellationQuote } from '@/lib/booking'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

describe('mock nghiệp vụ du lịch', () => {
  it('đăng nhập đúng ba vai trò demo và từ chối mật khẩu sai', async () => {
    expect((await mock.login('khach@demo.vn', 'Demo@123')).role).toBe('tourist')
    expect((await mock.login('doitac@demo.vn', 'Demo@123')).role).toBe('partner')
    expect((await mock.login('admin@demo.vn', 'Demo@123')).role).toBe('admin')
    await expect(mock.login('khach@demo.vn', 'sai')).rejects.toThrow('Mật khẩu không chính xác')
  })
  it('xác thực OTP demo và giữ tài khoản sau khi tải lại dữ liệu', async () => {
    await mock.register('Khách mới', 'moi@example.vn', 'MatKhau@123')
    await expect(mock.verifyOtp('000000')).rejects.toThrow('không đúng')
    const user = await mock.verifyOtp('123456')
    expect((await mock.login('moi@example.vn', 'MatKhau@123')).id).toBe(user.id)
    expect(snapshot().users.some(u => u.id === user.id)).toBe(true)
  })
  it('giữ tồn phòng từng đêm, tránh booking trùng và chỉ xác nhận sau thanh toán demo', async () => {
    const input = { hotelId: 'sea-garden', roomId: 'room-deluxe', roomIds: ['room-deluxe', 'room-family'], checkIn: todayPlus(60), checkOut: todayPlus(62), rooms: 2, adults: 4, children: 0, guestName: 'Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '' }
    const before = inventoryView(snapshot(), input.roomId, input.checkIn).available
    const booking = await mock.createBooking('user-tourist', input)
    expect(booking.status).toBe('PENDING_PAYMENT')
    expect((await mock.createBooking('user-tourist', input)).id).toBe(booking.id)
    expect(booking.roomItems).toHaveLength(2)
    expect(inventoryView(snapshot(), input.roomId, input.checkIn).available).toBe(before - 1)
    await mock.payBooking('user-tourist', booking.id, 'failure')
    expect(snapshot().bookings.find(b => b.id === booking.id)?.status).toBe('PENDING_PAYMENT')
    await mock.payBooking('user-tourist', booking.id, 'success')
    expect(snapshot().bookings.find(b => b.id === booking.id)?.status).toBe('CONFIRMED')
    expect(inventoryView(snapshot(), input.roomId, input.checkIn).available).toBe(before - 1)
  })
  it('hủy booking tạo refund riêng và giải phóng tồn phòng', async () => {
    const input = { hotelId: 'sea-garden', roomId: 'room-deluxe', checkIn: todayPlus(60), checkOut: todayPlus(62), rooms: 1, adults: 2, children: 0, guestName: 'Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '' }
    const before = inventoryView(snapshot(), input.roomId, input.checkIn).available
    const booking = await mock.createBooking('user-tourist', input)
    await mock.payBooking('user-tourist', booking.id, 'success')
    await mock.cancelBooking('user-tourist', booking.id)
    expect(snapshot().bookings.find(b => b.id === booking.id)?.status).toBe('CANCELLED')
    expect(snapshot().refunds.find(r => r.bookingId === booking.id)?.status).toBe('PENDING')
    expect(inventoryView(snapshot(), input.roomId, input.checkIn).available).toBe(before)
    await expect(mock.resolveRefund(booking.id, 'REFUNDED')).rejects.toThrow('Không thể chuyển')
    await mock.resolveRefund(booking.id, 'PROCESSING')
    expect(snapshot().refunds.find(r => r.bookingId === booking.id)?.status).toBe('PROCESSING')
    await mock.resolveRefund(booking.id, 'REFUNDED')
    expect(snapshot().refunds.find(r => r.bookingId === booking.id)?.status).toBe('REFUNDED')
    await expect(mock.cancelBooking('user-tourist', booking.id)).rejects.toThrow('không thể hủy')
  })
  it('tính phí hủy từ điều khoản đã chụp khi đặt phòng', async () => {
    const booking = await mock.createBooking('user-tourist', { hotelId: 'sea-garden', roomId: 'room-deluxe', checkIn: todayPlus(30), checkOut: todayPlus(31), rooms: 1, adults: 2, children: 0, guestName: 'Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '' })
    await mock.payBooking('user-tourist', booking.id, 'success')
    const stored = JSON.parse(localStorage.getItem('smarttravel.demo.v2')!)
    stored.hotels.find((hotel: { id: string }) => hotel.id === 'sea-garden').cancellationTerms = { freeUntilHours: 1000, lateFeeRate: 1, checkInHour: 14 }
    localStorage.setItem('smarttravel.demo.v2', JSON.stringify(stored))
    await mock.cancelBooking('user-tourist', booking.id)
    expect(snapshot().bookings.find(b => b.id === booking.id)?.cancellationFee).toBe(0)
    expect(cancellationQuote({ ...booking, policyTermsSnapshot: { freeUntilHours: 1000, lateFeeRate: 0.25, checkInHour: 14 } }).fee).toBe(Math.round(booking.total * 0.25))
  })
  it('áp dụng đúng nhiều mốc hoàn tiền trong một chính sách hủy', async () => {
    const rules = [
      { hoursBeforeCheckIn: 72, refundRate: 1 },
      { hoursBeforeCheckIn: 24, refundRate: 0.7 },
      { hoursBeforeCheckIn: 0, refundRate: 0 },
    ]
    await mock.saveCancellationPolicy('user-partner', 'Chính sách hoàn tiền theo mốc.', rules, 'sea-garden')
    const hotel = snapshot().hotels.find(item => item.id === 'sea-garden')!
    expect(hotel.cancellationTerms.rules).toEqual(rules)
    const booking = { ...snapshot().bookings[0]!, checkIn: '2030-01-10', total: 1000000, policyTermsSnapshot: hotel.cancellationTerms }
    expect(cancellationQuote(booking, Date.parse('2030-01-07T06:00:00+07:00')).refund).toBe(1000000)
    expect(cancellationQuote(booking, Date.parse('2030-01-09T08:00:00+07:00')).refund).toBe(700000)
    expect(cancellationQuote(booking, Date.parse('2030-01-10T02:00:00+07:00')).refund).toBe(0)
    await expect(mock.saveCancellationPolicy('user-partner', 'Trùng mốc.', [...rules, { hoursBeforeCheckIn: 24, refundRate: 0.5 }], 'sea-garden')).rejects.toThrow('chỉ được xuất hiện một lần')
  })
  it('chỉ cho phép một đánh giá sau booking hoàn tất', async () => {
    const review = await mock.addReview('user-tourist', 'BK-DEMO-001', 5, 'Phòng sạch, vị trí thuận tiện.')
    expect(review.status).toBe('VISIBLE')
    await expect(mock.addReview('user-tourist', 'BK-DEMO-001', 4, 'Đánh giá thứ hai')).rejects.toThrow('đã được đánh giá')
    await expect(mock.addReview('user-partner', 'BK-DEMO-001', 5, 'Không thuộc quyền')).rejects.toThrow('đã hoàn tất')
  })
  it('ngăn điểm dừng trùng thời gian và điểm dừng ngoài chuyến đi', async () => {
    const date = todayPlus(10)
    await expect(mock.saveStop('user-tourist', { id: '', tripId: 'trip-demo', name: 'Trùng giờ', address: '', start: date + 'T10:00', end: date + 'T12:00', order: 2, note: '' })).rejects.toThrow('trùng thời gian')
    await expect(mock.saveStop('user-tourist', { id: '', tripId: 'trip-demo', name: 'Ngoài ngày', address: '', start: todayPlus(20) + 'T10:00', end: todayPlus(20) + 'T12:00', order: 2, note: '' })).rejects.toThrow('không hợp lệ')
  })
  it('lập lịch trong giờ mở cửa và từ chối khi không có địa điểm phù hợp', async () => {
    const input = { city: 'Đà Nẵng', startDate: todayPlus(7), endDate: todayPlus(8), adults: 2, children: 0, budget: 6000000, interests: ['Biển'], style: 'Cân bằng', note: '' }
    const plan = await mock.plan(input)
    expect(plan.stops.length).toBeGreaterThan(0)
    for (const stop of plan.stops) {
      const place = snapshot().destinations.find(item => item.id === stop.placeId)!
      if (place.openingHours === 'Cả ngày') continue
      const [start, end] = [...place.openingHours!.matchAll(/(\d{2}):(\d{2})/g)].map(match => Number(match[1]) * 60 + Number(match[2]))
      expect(Number(stop.start.slice(11, 13)) * 60).toBeGreaterThanOrEqual(start ?? 0)
      expect(Number(stop.end.slice(11, 13)) * 60).toBeLessThanOrEqual(end ?? 1440)
    }
    const stored = JSON.parse(localStorage.getItem('smarttravel.demo.v2')!)
    stored.destinations.forEach((place: { openingHours: string }) => { place.openingHours = '19:00–20:00' })
    localStorage.setItem('smarttravel.demo.v2', JSON.stringify(stored))
    await expect(mock.plan(input)).rejects.toThrow('Không có địa điểm mở cửa')
  })
  it('giải thích điểm dừng, tách chi phí và giảm nhịp độ khi tinh chỉnh', async () => {
    const input = { city: 'Đà Nẵng', startDate: todayPlus(7), endDate: todayPlus(9), adults: 2, children: 0, budget: 6000000, interests: ['Biển', 'Thiên nhiên'], style: 'Cân bằng', note: '' }
    const plan = await mock.plan(input)
    expect(plan.input).toEqual(input)
    expect(plan.costBreakdown).toBeDefined()
    expect(plan.totalCost).toBe(Object.values(plan.costBreakdown!).reduce((sum, value) => sum + value, 0))
    for (const date of [todayPlus(7), todayPlus(8), todayPlus(9)]) {
      const stops = plan.stops.filter(stop => stop.start.startsWith(date))
      expect(new Set(stops.map(stop => stop.placeId)).size).toBe(stops.length)
      for (const stop of stops) {
        expect(plan.reasons?.[stop.id]).toContain('mở cửa')
        expect(snapshot().destinations.some(place => place.id === stop.placeId)).toBe(true)
      }
    }
    const relaxed = await mock.plan({ ...input, note: 'Giảm hoạt động, lịch thư giãn' })
    expect(relaxed.stops.length).toBeLessThan(plan.stops.length)
    expect(relaxed.stops.filter(stop => stop.start.startsWith(todayPlus(7))).length).toBeLessThanOrEqual(2)
    const tightBudget = await mock.plan({ ...input, budget: 3900000 })
    expect(tightBudget.costBreakdown?.activities).toBe(0)
    expect(tightBudget.stops.every(stop => snapshot().destinations.find(place => place.id === stop.placeId)?.price === 0)).toBe(true)
    const cultural = await mock.plan({ ...input, interests: [], note: 'Ưu tiên văn hóa' })
    expect(cultural.stops.some(stop => cultural.reasons?.[stop.id]?.includes('Theo yêu cầu về Văn hóa'))).toBe(true)
  })
  it('không cho đặt trùng phòng vật lý và phát hiện revision cũ', async () => {
    const date = todayPlus(60)
    const booking = await mock.createBooking('user-tourist', { hotelId: 'sea-garden', roomId: 'room-deluxe', roomIds: ['room-deluxe'], checkIn: date, checkOut: todayPlus(61), rooms: 1, adults: 2, children: 0, guestName: 'Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '' })
    expect(booking.status).toBe('PENDING_PAYMENT')
    await expect(mock.createBooking('user-demo-other', { hotelId: 'sea-garden', roomId: 'room-deluxe', roomIds: ['room-deluxe'], checkIn: date, checkOut: todayPlus(61), rooms: 1, adults: 1, children: 0, guestName: 'Khách khác', guestEmail: 'khac@demo.vn', guestPhone: '0900000000', specialRequest: '' })).rejects.toThrow('không còn trống')
    const revision = snapshot().inventory.find(i => i.roomId === 'room-deluxe' && i.date === date)?.revision ?? 0
    await expect(mock.saveInventory('user-partner', 'room-deluxe', [{ date, offered: 0, price: 1200000, revision }])).rejects.toThrow('thấp hơn')
    await mock.saveInventory('user-partner', 'room-deluxe', [{ date, offered: 1, price: 1300000, revision }])
    await expect(mock.saveInventory('user-partner', 'room-deluxe', [{ date, offered: 1, price: 1300000, revision }])).rejects.toThrow('đã thay đổi')
  })
  it('quản lý phòng vật lý với lịch bán 0/1 và số phòng đã chuẩn hóa', async () => {
    const source = snapshot().rooms.find(item => item.id === 'room-deluxe')!
    const created = await mock.saveRoom('user-partner', { ...source, id: '', roomNumber: '  a-201  ', name: 'Phòng mới' })
    expect(created.roomNumber).toBe('A-201')
    const rows = snapshot().inventory.filter(item => item.roomId === created.id)
    expect(rows).toHaveLength(90)
    expect(rows.every(item => item.offered === 1)).toBe(true)
    await expect(mock.saveRoom('user-partner', { ...source, id: '', roomNumber: 'a-201', name: 'Phòng trùng' })).rejects.toThrow('đã tồn tại')
    const row = rows[0]!
    await expect(mock.saveInventory('user-partner', created.id, [{ ...row, offered: 2 }])).rejects.toThrow('không hợp lệ')
    await expect(mock.saveInventory('user-partner', created.id, [{ ...row, date: todayPlus(-1) }])).rejects.toThrow('quá khứ')
  })
  it('không đánh dấu nhầm booking giữa hai phòng vật lý', async () => {
    const rooms = snapshot().rooms.filter(item => item.hotelId === 'sea-garden')
    const first = rooms[0]!
    const second = rooms[1]!
    const date = todayPlus(70)
    const firstBefore = inventoryView(snapshot(), first.id, date).available
    const secondBefore = inventoryView(snapshot(), second.id, date).available
    await mock.createBooking('user-tourist', { hotelId: 'sea-garden', roomId: second.id, roomIds: [second.id], checkIn: date, checkOut: todayPlus(71), rooms: 1, adults: 1, children: 0, guestName: 'Minh Anh', guestEmail: 'khach@demo.vn', guestPhone: '0901234567', specialRequest: '' })
    expect(inventoryView(snapshot(), first.id, date).available).toBe(firstBefore)
    expect(inventoryView(snapshot(), second.id, date).available).toBe(secondBefore - 1)
  })
  it('cho chủ khách sạn thêm, sửa, xóa tiện nghi và đồng bộ nơi đang sử dụng', async () => {
    await mock.addPartnerAmenity('user-partner', '  Phòng   gym riêng  ')
    const partner = snapshot().partners.find(item => item.userId === 'user-partner')!
    expect(partner.amenities).toContain('Phòng gym riêng')
    await expect(mock.addPartnerAmenity('user-partner', 'phòng gym riêng')).rejects.toThrow('đã có')
    const room = snapshot().rooms.find(item => item.id === 'room-deluxe')!
    await mock.saveRoom('user-partner', { ...room, amenities: [...room.amenities, 'Phòng gym riêng'] })
    expect(snapshot().rooms.find(item => item.id === room.id)?.amenities).toContain('Phòng gym riêng')
    await mock.updatePartnerAmenity('user-partner', 'Phòng gym riêng', 'Phòng thể hình riêng')
    expect(snapshot().partners.find(item => item.userId === 'user-partner')?.amenities).toContain('Phòng thể hình riêng')
    expect(snapshot().rooms.find(item => item.id === room.id)?.amenities).toContain('Phòng thể hình riêng')
    await mock.deletePartnerAmenity('user-partner', 'Phòng thể hình riêng')
    expect(snapshot().partners.find(item => item.userId === 'user-partner')?.amenities).not.toContain('Phòng thể hình riêng')
    expect(snapshot().rooms.find(item => item.id === room.id)?.amenities).not.toContain('Phòng thể hình riêng')
    await expect(mock.saveRoom('user-partner', { ...room, amenities: ['Tiện nghi ngoài danh mục'] })).rejects.toThrow('không thuộc danh mục')
  })
  it('xử lý chủ khách sạn và chi trả theo trạng thái có revision', async () => {
    const hotelStatuses = snapshot().hotels.filter(hotel => hotel.partnerId === 'partner-river').map(hotel => [hotel.id, hotel.approvalStatus])
    await mock.verifyPartner('partner-river', 'NEEDS_INFO', 'Cần giấy phép kinh doanh', 1)
    expect(snapshot().hotels.filter(hotel => hotel.partnerId === 'partner-river').map(hotel => [hotel.id, hotel.approvalStatus])).toEqual(hotelStatuses)
    await expect(mock.verifyPartner('partner-river', 'VERIFIED', '', 1)).rejects.toThrow('đã thay đổi')
    await mock.verifyHotel('river-light', 'VERIFIED', '')
    expect(snapshot().hotels.find(hotel => hotel.id === 'river-light')?.approvalStatus).toBe('VERIFIED')
    expect(snapshot().hotels.find(hotel => hotel.id === 'pine-house')?.approvalStatus).not.toBe('VERIFIED')
    let row = snapshot().settlements.find(s => s.id === 'SET-DEMO-001')!
    await mock.transitionSettlement(row.id, 'APPROVED', row.revision)
    row = snapshot().settlements.find(s => s.id === row.id)!
    await mock.transitionSettlement(row.id, 'PROCESSING', row.revision)
    row = snapshot().settlements.find(s => s.id === row.id)!
    await mock.transitionSettlement(row.id, 'PAID', row.revision)
    row = snapshot().settlements.find(s => s.id === row.id)!
    expect(row.transferReference).toContain('MOCK')
    await expect(mock.transitionSettlement(row.id, 'PAID', row.revision)).rejects.toThrow('Không thể chuyển')
  })
})
