import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { BedDouble, CalendarDays, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, LoadingState, PageHeader } from '@/components/common'
import { HotelDateRangePicker, HotelGuestPicker } from '@/components/hotel-search-fields'
import { repo } from '@/services'
import { currency, day, errorMessage, nights, stayDays, todayPlus } from '@/lib/utils'
import { useSession } from '@/stores/session'
import { useCatalog } from '@/hooks/data'
import type { BookingInput } from '@/types/domain'
import { BookingSteps, RoomSummary, SectionTitle } from './booking-ui'

export function BookingNewPage() {
  const user = useSession(state => state.user)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useCatalog()
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<BookingInput>({
    hotelId: params.get('hotelId') ?? '',
    roomId: params.get('roomId') ?? '',
    checkIn: params.get('checkIn') ?? todayPlus(7),
    checkOut: params.get('checkOut') ?? todayPlus(9),
    rooms: Number(params.get('rooms') ?? 1),
    adults: Number(params.get('adults') ?? 2),
    children: Number(params.get('children') ?? 0),
    guestName: user?.name ?? '',
    guestEmail: user?.email ?? '',
    guestPhone: user?.phone ?? '',
    specialRequest: '',
  })

  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>

  const hotel = data?.hotels.find(item => item.id === form.hotelId)
  const room = data?.rooms.find(item => item.id === form.roomId && item.hotelId === form.hotelId)
  if (!hotel || !room || !data) {
    return <div className="container-app section-pad"><EmptyState title="Chưa chọn phòng" description="Chọn khách sạn và loại phòng trước khi đặt." action={<Button asChild><Link to="/hotels">Tìm khách sạn</Link></Button>} /></div>
  }

  const dates = nights(form.checkIn, form.checkOut) > 0 ? stayDays(form.checkIn, form.checkOut) : []
  const prices = dates.map(date => data.inventory.find(item => item.roomId === room.id && item.date === date)?.price ?? room.basePrice)
  const total = prices.reduce((sum, price) => sum + price * form.rooms, 0)
  const available = dates.length > 0 && dates.every(date => (data.availability.find(item => item.roomId === room.id && item.date === date)?.available ?? 0) >= form.rooms)
  const capacity = form.adults + form.children <= room.capacity * form.rooms
  const set = <K extends keyof BookingInput>(key: K, value: BookingInput[K]) => setForm(current => ({ ...current, [key]: value }))

  const next = () => {
    setMessage('')
    if (step === 1) {
      if (form.checkIn < todayPlus(0) || !dates.length || !available || !capacity || form.rooms < 1 || form.adults < 1) {
        setMessage('Ngày lưu trú, số khách hoặc tình trạng phòng không hợp lệ.')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (form.guestName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.guestEmail) || !/^0\d{9,10}$/.test(form.guestPhone)) {
        setMessage('Kiểm tra họ tên, email và số điện thoại người đặt.')
        return
      }
      setStep(3)
    }
  }

  const confirm = async () => {
    setBusy(true)
    setMessage('')
    try {
      const booking = await repo.createBooking(user?.id ?? '', form)
      navigate(`/bookings/${booking.id}/payment`)
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app section-pad">
      <PageHeader title="Đặt phòng khách sạn" description="Tạo đơn đặt phòng theo dữ liệu khách sạn, loại phòng và chính sách hủy." />
      <BookingSteps current={step} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5 sm:p-7">
          {step === 1 && (
            <div>
              <SectionTitle icon={<CalendarDays size={20} />} title="Ngày nhận và trả phòng" description="Chọn khoảng lưu trú, số khách và số phòng cần đặt." />
              <div className="mt-6 grid gap-4">
                <HotelDateRangePicker checkIn={form.checkIn} checkOut={form.checkOut} onChange={(checkIn, checkOut) => setForm(current => ({ ...current, checkIn, checkOut }))} />
                <HotelGuestPicker adults={form.adults} children={form.children} rooms={form.rooms} onChange={values => setForm(current => ({ ...current, ...values }))} />
              </div>
              <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <p className="flex items-center gap-2 text-sm"><CalendarDays size={17} className="text-[#159FE8]" /><span><strong>{dates.length}</strong> đêm</span></p>
                <p className="flex items-center gap-2 text-sm"><BedDouble size={17} className="text-[#159FE8]" /><span>Tối đa <strong>{room.capacity}</strong> khách/phòng</span></p>
                <p className={`text-sm font-medium ${available && capacity ? 'text-emerald-700' : 'text-red-700'}`}>{available && capacity ? '✓ Phòng còn trống' : 'Không đủ phòng hoặc quá sức chứa'}</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionTitle icon={<UserRound size={20} />} title="Thông tin người đặt" description="Thông tin này được lưu vào đơn đặt phòng và dùng để liên hệ." />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField label="Họ và tên"><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="pl-10" required value={form.guestName} onChange={event => set('guestName', event.target.value)} autoComplete="name" /></div></FormField>
                <FormField label="Số điện thoại"><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="pl-10" required inputMode="tel" value={form.guestPhone} onChange={event => set('guestPhone', event.target.value)} autoComplete="tel" /></div></FormField>
                <FormField label="Email"><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="pl-10" required type="email" value={form.guestEmail} onChange={event => set('guestEmail', event.target.value)} autoComplete="email" /></div></FormField>
                <FormField label="Yêu cầu đặc biệt" hint="Tùy chọn; khách sạn sẽ cố gắng đáp ứng."><textarea value={form.specialRequest} onChange={event => set('specialRequest', event.target.value)} placeholder="Ví dụ: phòng tầng cao, giường phụ..." /></FormField>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionTitle icon={<ShieldCheck size={20} />} title="Kiểm tra và xác nhận" description="Đơn sẽ ở trạng thái chờ thanh toán trong thời gian giữ phòng." />
              <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
                <div className="grid gap-1 p-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">Khách sạn / phòng</dt><dd className="font-semibold">{hotel.name} · {room.name}</dd></div>
                <div className="grid gap-1 p-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">Ngày lưu trú</dt><dd>{day(form.checkIn)} – {day(form.checkOut)} · {dates.length} đêm</dd></div>
                <div className="grid gap-1 p-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">Khách / phòng</dt><dd>{form.adults} người lớn, {form.children} trẻ em · {form.rooms} phòng</dd></div>
                <div className="grid gap-1 p-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">Người đặt</dt><dd>{form.guestName} · {form.guestEmail} · {form.guestPhone}</dd></div>
                <div className="grid gap-1 p-4 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">Yêu cầu</dt><dd>{form.specialRequest || 'Không có'}</dd></div>
              </dl>
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mt-0.5 shrink-0" size={20} /><p><strong>Chính sách hủy được lưu cùng đơn:</strong> {hotel.cancellationPolicy}</p></div>
            </div>
          )}

          <div className="mt-6"><Feedback message={message} kind="error" /></div>
          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
            <Button variant="secondary" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>{step > 1 ? 'Quay lại' : 'Chọn phòng khác'}</Button>
            {step < 3 ? <Button onClick={next}>Tiếp tục</Button> : <Button disabled={busy} onClick={confirm}>{busy ? 'Đang tạo booking...' : 'Xác nhận và thanh toán'}</Button>}
          </div>
        </Card>

        <div className="grid h-fit gap-4">
          <RoomSummary hotel={hotel} room={room} form={form} total={total} />
          {step === 1 && <Card className="p-5"><h3 className="font-semibold">Chi tiết giá theo đêm</h3><div className="mt-3 grid gap-2 text-sm">{prices.map((price, index) => <div key={dates[index] ?? index} className="flex justify-between gap-3 text-slate-600"><span>{dates[index] ? day(dates[index]) : `Đêm ${index + 1}`} × {form.rooms} phòng</span><span>{currency(price * form.rooms)}</span></div>)}</div></Card>}
        </div>
      </div>
    </div>
  )
}
