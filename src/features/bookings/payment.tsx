import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CreditCard, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Feedback, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { isMock, repo } from '@/services'
import { currency, dateTime, errorMessage } from '@/lib/utils'
import { useSession } from '@/stores/session'
import { useCatalog, useTourist } from '@/hooks/data'
import { BookingRelationFlow, RoomSummary, SectionTitle } from './booking-ui'

export function PaymentPage() {
  const { id } = useParams()
  const user = useSession(state => state.user)
  const { data, isLoading } = useTourist()
  const { data: catalog } = useCatalog()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (isLoading) return <LoadingState />
  const booking = data?.bookings.find(item => item.id === id)
  if (!booking) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy booking" /></div>
  if (booking.status !== 'PENDING_PAYMENT') return <div className="container-app section-pad"><EmptyState title="Booking không còn chờ thanh toán" action={<Button asChild><Link to={`/bookings/${booking.id}`}>Xem booking</Link></Button>} /></div>

  const hotel = catalog?.hotels.find(item => item.id === booking.hotelId)
  const room = catalog?.rooms.find(item => item.id === booking.roomId)

  const simulate = async (outcome: 'success' | 'failure' | 'expire') => {
    setBusy(true)
    try {
      await repo.payBooking(user?.id ?? '', booking.id, outcome)
      await queryClient.invalidateQueries({ queryKey: ['tourist'] })
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate(`/bookings/${booking.id}/payment-result`)
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-app section-pad">
      <PageHeader title="Thanh toán booking" description={`Mã ${booking.id} · giữ phòng đến ${dateTime(booking.holdExpiresAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5 sm:p-7">
          <SectionTitle icon={<CreditCard size={20} />} title="Thanh toán qua VNPAY" description="Giao dịch thanh toán được tạo riêng và liên kết với đơn đặt phòng." />
          {booking.roomItems && booking.roomItems.length > 0 && <div className="mt-6 overflow-hidden rounded-xl border border-slate-200"><div className="table-scroll"><table><thead><tr><th>Phòng</th><th>Giá/đêm</th><th>Số đêm</th><th>Thành tiền</th></tr></thead><tbody>{booking.roomItems.map(item => <tr key={item.roomId}><td className="font-semibold">Phòng {item.roomNumber}</td><td>{currency(item.nightlyPrice)}</td><td>{item.nights}</td><td className="font-semibold">{currency(item.subtotal)}</td></tr>)}</tbody></table></div></div>}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#159FE8] p-6 text-white shadow-lg">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold"><ReceiptText size={20} />VNPAY</span><LockKeyhole size={20} /></div>
            <p className="mt-8 text-sm text-sky-100">Số tiền thanh toán</p>
            <p className="mt-1 text-3xl font-bold">{currency(booking.total)}</p>
            <div className="mt-8 flex items-end justify-between gap-4 text-xs text-sky-100"><span>BOOKING<br /><strong className="text-sm text-white">{booking.id}</strong></span><span className="text-right">TRẠNG THÁI<br /><strong className="text-sm text-white">Chờ thanh toán</strong></span></div>
          </div>
          <div className="mt-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck className="mt-0.5 shrink-0" size={20} /><p>Không nhập hoặc lưu thông tin thẻ trên giao diện này. {isMock ? 'Đây là môi trường mô phỏng, không phát sinh giao dịch thật.' : 'Kết quả do backend xác minh.'}</p></div>
          <div className="mt-5"><Feedback message={message} kind="error" /></div>
          {isMock ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><Button disabled={busy} onClick={() => simulate('success')}>Mô phỏng thành công</Button><Button disabled={busy} variant="secondary" onClick={() => simulate('failure')}>Mô phỏng thất bại</Button><Button disabled={busy} variant="secondary" onClick={() => simulate('expire')}>Mô phỏng hết hạn</Button></div>
          ) : <Button className="mt-6" disabled={busy} onClick={() => simulate('success')}>Tiếp tục qua VNPAY</Button>}
          <Button asChild variant="ghost" className="mt-3"><Link to={`/bookings/${booking.id}`}>Quay lại booking</Link></Button>
        </Card>
        {hotel && room && <RoomSummary hotel={hotel} room={room} booking={booking} total={booking.total} />}
      </div>
    </div>
  )
}

export function PaymentResultPage() {
  const { id } = useParams()
  const { data, isLoading } = useTourist()
  const { data: catalog } = useCatalog()
  if (isLoading) return <LoadingState />

  const booking = data?.bookings.find(item => item.id === id)
  if (!booking) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy booking" /></div>

  const payment = [...(data?.payments.filter(item => item.bookingId === id) ?? [])].at(-1)
  const hotel = catalog?.hotels.find(item => item.id === booking.hotelId)
  const success = booking.status === 'CONFIRMED'

  return (
    <div className="container-app section-pad">
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className={`px-6 py-10 text-center ${success ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ${success ? 'text-emerald-700' : 'text-amber-700'}`}>{success ? <CheckCircle2 size={34} /> : <CreditCard size={34} />}</div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">{success ? 'Đặt phòng đã được xác nhận' : booking.status === 'EXPIRED' ? 'Thời gian giữ phòng đã hết' : 'Thanh toán chưa thành công'}</h1>
          <p className="mt-2 text-slate-600">{hotel?.name} · {currency(booking.total)}</p>
          <div className="mt-4 flex justify-center gap-2"><StatusBadge status={booking.status} />{payment && <StatusBadge status={payment.status} />}</div>
        </div>
        <div className="p-6 sm:p-8">
          <BookingRelationFlow booking={booking} payment={payment} />
          {isMock && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">Đây là kết quả mô phỏng, không phải giao dịch VNPAY thật.</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild><Link to={`/bookings/${booking.id}`}>Chi tiết booking</Link></Button>{booking.status === 'PENDING_PAYMENT' && <Button asChild variant="secondary"><Link to={`/bookings/${booking.id}/payment`}>Thử lại</Link></Button>}<Button asChild variant="ghost"><Link to="/bookings">Danh sách booking</Link></Button></div>
        </div>
      </Card>
    </div>
  )
}
