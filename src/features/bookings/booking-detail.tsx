import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CreditCard, Hotel as HotelIcon, MessageSquareText, ShieldCheck, Star, UserRound, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { repo } from '@/services'
import { cancellationQuote } from '@/lib/booking'
import { currency, day, dateTime, errorMessage } from '@/lib/utils'
import { useSession } from '@/stores/session'
import { useCatalog, useTourist } from '@/hooks/data'
import { BookingRelationFlow, DetailItem, RoomSummary, SectionTitle } from './booking-ui'

export function BookingDetailPage() {
  const { id } = useParams()
  const [now] = useState(() => Date.now())
  const user = useSession(state => state.user)
  const { data, isLoading, error } = useTourist()
  const { data: catalog } = useCatalog()
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [stars, setStars] = useState(0)
  const [content, setContent] = useState('')

  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>

  const booking = data?.bookings.find(item => item.id === id)
  if (!booking) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy booking" /></div>

  const hotel = catalog?.hotels.find(item => item.id === booking.hotelId)
  const room = catalog?.rooms.find(item => item.id === booking.roomId)
  const payment = [...(data?.payments.filter(item => item.bookingId === booking.id) ?? [])].at(-1)
  const refund = data?.refunds.find(item => item.bookingId === booking.id)
  const reviewed = data?.reviews.some(item => item.bookingId === booking.id)
  const quote = cancellationQuote(booking, now)
  const canCancel = booking.status === 'CONFIRMED' && quote.allowed

  const cancel = async () => {
    try {
      await repo.cancelBooking(user?.id ?? '', booking.id)
      await queryClient.invalidateQueries({ queryKey: ['tourist'] })
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      setCancelOpen(false)
      setMessage('Đã hủy booking. Yêu cầu hoàn tiền đang chờ xử lý.')
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  return (
    <div className="container-app section-pad">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E3A5F] hover:underline" to="/bookings"><ArrowLeft size={16} />Booking của tôi</Link>
      <div className="mt-5"><PageHeader title={`Booking ${booking.id}`} description="Chi tiết đơn đặt phòng và các bản ghi liên quan theo ERD." actions={<StatusBadge status={booking.status} />} /></div>
      <div className="mb-6"><BookingRelationFlow booking={booking} payment={payment} refund={refund} /></div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5">
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<HotelIcon size={20} />} title="Thông tin lưu trú" description="Khách sạn và loại phòng gắn với đơn đặt phòng." />
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <DetailItem label="Khách sạn">{hotel?.name ?? booking.hotelId}</DetailItem>
              <DetailItem label="Loại phòng">{room?.name ?? booking.roomId}</DetailItem>
              <DetailItem label="Ngày nhận phòng"><span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-[#159FE8]" />{day(booking.checkIn)}</span></DetailItem>
              <DetailItem label="Ngày trả phòng"><span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-[#159FE8]" />{day(booking.checkOut)}</span></DetailItem>
              <DetailItem label="Số lượng"><span className="inline-flex items-center gap-2"><UsersRound size={16} className="text-[#159FE8]" />{booking.rooms} phòng · {booking.adults + booking.children} khách</span></DetailItem>
              <DetailItem label="Tạo lúc">{dateTime(booking.createdAt)}</DetailItem>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<UserRound size={20} />} title="Thông tin người đặt" description="Dữ liệu liên hệ được lưu tại thời điểm tạo đơn." />
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <DetailItem label="Họ và tên">{booking.guestName}</DetailItem>
              <DetailItem label="Số điện thoại">{booking.guestPhone}</DetailItem>
              <DetailItem label="Email">{booking.guestEmail}</DetailItem>
              <DetailItem label="Yêu cầu đặc biệt">{booking.specialRequest || 'Không có'}</DetailItem>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<CreditCard size={20} />} title="Thanh toán và hoàn tiền" description="Hai nghiệp vụ được hiển thị tách biệt với trạng thái riêng." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><strong>Thanh toán</strong><span className="text-xs text-slate-400">{payment ? 'Đã tạo giao dịch' : 'Chưa có'}</span></div><p className="mt-3 text-sm text-slate-500">{payment?.id ?? 'Chưa phát sinh giao dịch'}</p>{payment && <p className="mt-1 text-sm font-semibold">{currency(payment.amount)}</p>}</div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><strong>Hoàn tiền</strong><span className="text-xs text-slate-400">{refund ? 'Đã tạo yêu cầu' : 'Không áp dụng'}</span></div><p className="mt-3 text-sm text-slate-500">{refund?.id ?? 'Chưa phát sinh yêu cầu'}</p>{refund && <p className="mt-1 text-sm font-semibold">{currency(refund.amount)}</p>}</div>
            </div>
            {booking.status === 'PENDING_PAYMENT' && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Phòng được giữ đến {dateTime(booking.holdExpiresAt)}.</p>}
            {refund && <p className="mt-3 text-sm text-slate-500">Đơn đã hủy và trạng thái hoàn tiền được xử lý độc lập.</p>}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionTitle icon={<ShieldCheck size={20} />} title="Chính sách hủy tại thời điểm đặt" description="Bản chụp chính sách giúp lịch sử booking không thay đổi khi khách sạn cập nhật quy định." />
            <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{booking.policySnapshot}</p>
          </Card>

          {booking.status === 'COMPLETED' && (
            <Card className="p-5 sm:p-6">
              <SectionTitle icon={<MessageSquareText size={20} />} title="Đánh giá khách sạn" description="Mỗi booking hoàn tất có thể tạo một đánh giá." />
              {reviewed ? <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Bạn đã gửi đánh giá cho booking này.</p> : (
                <form className="mt-5 grid gap-4" onSubmit={async event => {
                  event.preventDefault()
                  try {
                    await repo.addReview(user?.id ?? '', booking.id, stars, content)
                    await queryClient.invalidateQueries({ queryKey: ['tourist'] })
                    await queryClient.invalidateQueries({ queryKey: ['catalog'] })
                    setMessage('Đã gửi đánh giá.')
                  } catch (err) {
                    setMessage(errorMessage(err))
                  }
                }}>
                  <FormField label="Số sao"><select value={stars} onChange={event => setStars(Number(event.target.value))}><option value="0">Chọn số sao</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} sao</option>)}</select></FormField>
                  <FormField label="Nhận xét"><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Chia sẻ trải nghiệm lưu trú..." /></FormField>
                  <Button className="w-fit"><Star size={16} />Gửi đánh giá</Button>
                </form>
              )}
            </Card>
          )}
        </div>

        <div className="grid h-fit gap-4">
          {hotel && room && <RoomSummary hotel={hotel} room={room} booking={booking} total={booking.total} />}
          <Card className="p-5">
            <h2 className="font-semibold">Chi tiết chi phí</h2>
            <div className="mt-4 grid gap-2 text-sm">{booking.nightlyPrices.map((price, index) => <div key={`${booking.id}-${index}`} className="flex justify-between gap-3 text-slate-600"><span>Đêm {index + 1} × {booking.rooms} phòng</span><span>{currency(price * booking.rooms)}</span></div>)}</div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-semibold"><span>Tổng thanh toán</span><span className="text-lg text-[#1E3A5F]">{currency(booking.total)}</span></div>
            <div className="mt-5 grid gap-2">{booking.status === 'PENDING_PAYMENT' && <Button asChild><Link to={`/bookings/${booking.id}/payment`}>Tiếp tục thanh toán</Link></Button>}{canCancel && <Button variant="danger" onClick={() => setCancelOpen(true)}>Hủy booking</Button>}</div>
            <div className="mt-4"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div>
          </Card>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title="Xác nhận hủy booking" description="Việc hủy sẽ giải phóng phòng. Hoàn tiền được theo dõi bằng một bản ghi riêng.">
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm"><p>Chính sách: {booking.policySnapshot}</p><p className="flex justify-between"><span>Phí hủy dự kiến</span><strong>{currency(quote.fee)}</strong></p><p className="flex justify-between"><span>Số tiền yêu cầu hoàn</span><strong>{currency(booking.total - quote.fee)}</strong></p></div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setCancelOpen(false)}>Quay lại</Button><Button variant="danger" onClick={cancel}>Xác nhận hủy</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
