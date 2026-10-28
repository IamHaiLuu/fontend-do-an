import { Link, useSearchParams } from 'react-router'
import { CalendarDays, MapPin, Search, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Picture, StatusBadge } from '@/components/common'
import { useCatalog, useTourist } from '@/hooks/data'
import { currency, day, errorMessage, formatStatus } from '@/lib/utils'
import { roomImage } from '@/lib/travel-images'

const bookingStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED']

export function BookingsPage() {
  const { data, isLoading, error } = useTourist()
  const { data: catalog } = useCatalog()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').toLowerCase()
  const status = params.get('status') ?? ''

  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>

  const bookings = [...(data?.bookings ?? [])]
    .filter(booking => {
      const hotel = catalog?.hotels.find(item => item.id === booking.hotelId)
      return (!query || booking.id.toLowerCase().includes(query) || hotel?.name.toLowerCase().includes(query)) && (!status || booking.status === status)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <div className="container-app section-pad">
      <PageHeader title="Booking của tôi" description="Mỗi đơn liên kết trực tiếp với khách sạn, loại phòng, thanh toán và hoàn tiền." actions={<Button asChild><Link to="/hotels">Đặt phòng mới</Link></Button>} />
      <Card className="mb-6 grid gap-4 p-4 sm:grid-cols-[1fr_240px]">
        <label className="text-sm font-medium text-slate-700">Tìm mã booking hoặc khách sạn<div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="mt-0 pl-10" value={params.get('q') ?? ''} onChange={event => updateParam('q', event.target.value)} placeholder="Nhập từ khóa..." /></div></label>
        <label className="text-sm font-medium text-slate-700">Trạng thái<select value={status} onChange={event => updateParam('status', event.target.value)}><option value="">Tất cả trạng thái</option>{bookingStatuses.map(item => <option key={item} value={item}>{formatStatus(item)}</option>)}</select></label>
      </Card>

      {bookings.length ? (
        <div className="grid gap-5">
          {bookings.map(booking => {
            const hotel = catalog?.hotels.find(item => item.id === booking.hotelId)
            const room = catalog?.rooms.find(item => item.id === booking.roomId)
            const payment = [...(data?.payments.filter(item => item.bookingId === booking.id) ?? [])].at(-1)
            const refund = data?.refunds.find(item => item.bookingId === booking.id)
            return (
              <Card className="group overflow-hidden" key={booking.id}>
                <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
                  <Picture label={room?.name ?? 'phòng'} src={room?.image ?? roomImage(booking.roomId)} className="h-full min-h-44 rounded-none" />
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-[#159FE8]">Mã {booking.id}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{hotel?.name ?? booking.hotelId}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={15} />{hotel?.address}</p></div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-5 grid gap-3 border-y border-slate-100 py-4 text-sm sm:grid-cols-3">
                      <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 text-[#159FE8]" size={17} /><span><span className="block text-xs text-slate-400">Lưu trú</span>{day(booking.checkIn)} – {day(booking.checkOut)}</span></p>
                      <p className="flex items-start gap-2"><UsersRound className="mt-0.5 text-[#159FE8]" size={17} /><span><span className="block text-xs text-slate-400">Phòng và khách</span>{booking.rooms} phòng · {booking.adults + booking.children} khách</span></p>
                      <p><span className="block text-xs text-slate-400">Loại phòng</span>{room?.name ?? booking.roomId}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>Thanh toán</span>{payment ? <StatusBadge status={payment.status} /> : <span>Chưa phát sinh</span>}{refund && <><span>· Hoàn tiền</span><StatusBadge status={refund.status} /></>}</div>
                      <div className="flex items-center gap-4"><strong className="text-lg text-[#1E3A5F]">{currency(booking.total)}</strong><Button asChild variant="secondary" size="sm"><Link to={`/bookings/${booking.id}`}>Xem chi tiết</Link></Button></div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : <EmptyState title="Không có booking phù hợp" description="Thử đổi bộ lọc hoặc tìm khách sạn để đặt phòng." action={<Button asChild><Link to="/hotels">Tìm khách sạn</Link></Button>} />}
    </div>
  )
}
