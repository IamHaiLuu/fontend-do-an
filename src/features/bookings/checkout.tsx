import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { BedDouble, CalendarDays, Mail, Phone, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, LoadingState, PageHeader, Picture } from '@/components/common'
import { useCatalog } from '@/hooks/data'
import { repo } from '@/services'
import { useSession } from '@/stores/session'
import { currency, day, errorMessage, nights, todayPlus } from '@/lib/utils'
import type { BookingInput } from '@/types/domain'

export function BookingCheckoutPage() {
  const user = useSession(state => state.user)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useCatalog()
  const roomIds = (params.get('roomIds') ?? '').split(',').filter(Boolean)
  const hotelId = params.get('hotelId') ?? ''
  const checkIn = params.get('checkIn') ?? todayPlus(7)
  const checkOut = params.get('checkOut') ?? todayPlus(9)
  const adults = Number(params.get('adults') ?? 2)
  const children = Number(params.get('children') ?? 0)
  const [contact, setContact] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', note: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  const hotel = data?.hotels.find(item => item.id === hotelId)
  const selectedRooms = roomIds.map(roomId => data?.rooms.find(room => room.id === roomId && room.hotelId === hotelId)).filter(Boolean)
  if (!hotel || !selectedRooms.length || selectedRooms.length !== roomIds.length) return <div className="container-app section-pad"><EmptyState title="Chưa có phòng hợp lệ để đặt" description="Vui lòng quay lại khách sạn và chọn ít nhất một phòng." action={<Button asChild><Link to="/hotels">Tìm khách sạn</Link></Button>} /></div>
  const nightCount = nights(checkIn, checkOut)
  const total = selectedRooms.reduce((sum, room) => sum + (room?.basePrice ?? 0) * nightCount, 0)
  const capacity = selectedRooms.reduce((sum, room) => sum + (room?.capacity ?? 0), 0)
  const confirm = async () => {
    if (checkIn < todayPlus(0) || nightCount < 1 || capacity < adults + children) { setMessage('Ngày lưu trú hoặc sức chứa phòng không hợp lệ.'); return }
    if (contact.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(contact.email) || !/^0\d{9,10}$/.test(contact.phone)) { setMessage('Vui lòng kiểm tra họ tên, email và số điện thoại.'); return }
    setBusy(true); setMessage('')
    try {
      const input: BookingInput = { hotelId, roomId: roomIds[0]!, roomIds, checkIn, checkOut, rooms: roomIds.length, adults, children, guestName: contact.name, guestEmail: contact.email, guestPhone: contact.phone, specialRequest: contact.note }
      const booking = await repo.createBooking(user?.id ?? '', input)
      navigate(`/booking/${booking.id}/payment`)
    } catch (cause) { setMessage(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <div className="container-app section-pad">
    <PageHeader title="Xác nhận đặt phòng" description="Kiểm tra toàn bộ phòng trước khi tạo một đơn và thanh toán đủ 100%." />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="grid gap-6"><Card className="p-5 sm:p-7"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-[#159FE8]"><UserRound size={20} /></span><div><h2 className="text-lg font-semibold">Thông tin người đặt</h2><p className="text-sm text-slate-500">Được điền từ tài khoản và chỉ áp dụng cho đơn này.</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><FormField label="Họ và tên *"><input value={contact.name} onChange={event => setContact(current => ({ ...current, name: event.target.value }))} /></FormField><FormField label="Số điện thoại *"><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} /><input className="pl-10" value={contact.phone} onChange={event => setContact(current => ({ ...current, phone: event.target.value }))} /></div></FormField><FormField label="Email *"><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} /><input className="pl-10" type="email" value={contact.email} onChange={event => setContact(current => ({ ...current, email: event.target.value }))} /></div></FormField><FormField label="Yêu cầu đặc biệt"><textarea value={contact.note} onChange={event => setContact(current => ({ ...current, note: event.target.value }))} /></FormField></div></Card>
      <Card className="overflow-hidden"><div className="border-b border-slate-200 p-5"><h2 className="text-lg font-semibold">Danh sách phòng trong đơn</h2><p className="text-sm text-slate-500">Tất cả phòng cùng khách sạn và cùng thời gian lưu trú.</p></div><div className="table-scroll"><table><thead><tr><th>Phòng</th><th>Loại phòng</th><th>Giá/đêm</th><th>Số đêm</th><th>Thành tiền</th></tr></thead><tbody>{selectedRooms.map(room => room && <tr key={room.id}><td className="font-semibold">Phòng {room.roomNumber}</td><td>{room.name}</td><td>{currency(room.basePrice)}</td><td>{nightCount}</td><td className="font-semibold">{currency(room.basePrice * nightCount)}</td></tr>)}</tbody></table></div></Card></div>
      <Card className="h-fit overflow-hidden lg:sticky lg:top-24"><Picture label={hotel.name} src={hotel.image} className="aspect-[16/9]" /><div className="p-5"><h2 className="text-xl font-semibold">{hotel.name}</h2><p className="mt-1 text-sm text-slate-500">{hotel.address}</p><div className="mt-5 grid gap-3 text-sm"><p className="flex items-center gap-2"><CalendarDays size={17} />{day(checkIn)} – {day(checkOut)} · {nightCount} đêm</p><p className="flex items-center gap-2"><BedDouble size={17} />{selectedRooms.length} phòng vật lý</p><p className="flex items-center gap-2"><UsersRound size={17} />{adults} người lớn, {children} trẻ em</p></div><div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="flex gap-2"><ShieldCheck className="shrink-0" size={18} /><span>{hotel.cancellationPolicy}</span></p></div><div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-4"><span>Tổng thanh toán</span><strong className="text-2xl text-[#1E3A5F]">{currency(total)}</strong></div><Feedback message={message} kind="error" /><Button className="mt-5 w-full" disabled={busy} onClick={confirm}>{busy ? 'Đang kiểm tra phòng...' : 'Xác nhận và thanh toán'}</Button><Button asChild variant="ghost" className="mt-2 w-full"><Link to={`/hotels/${hotel.id}?${params.toString()}`}>Chọn lại phòng</Link></Button></div></Card>
    </div>
  </div>
}
