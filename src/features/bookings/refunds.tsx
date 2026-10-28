import { Link } from 'react-router'
import { Clock3, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import { useTourist } from '@/hooks/data'
import { currency, dateTime, errorMessage } from '@/lib/utils'

export function MyRefundsPage() {
  const { data, isLoading, error } = useTourist()
  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  const items = data?.refunds.filter(refund => data.bookings.some(booking => booking.id === refund.bookingId)) ?? []
  return <div className="container-app section-pad"><PageHeader title="Theo dõi hoàn tiền" description="Trạng thái được cập nhật từ hệ thống thanh toán; gửi yêu cầu không đồng nghĩa đã hoàn tất." />{items.length ? <div className="grid gap-4">{items.map(refund => { const booking = data?.bookings.find(item => item.id === refund.bookingId); const paid = data?.payments.find(item => item.bookingId === refund.bookingId && item.status === 'PAID'); return <Card key={refund.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#159FE8]"><RefreshCcw size={20} /></span><div><p className="text-xs font-semibold uppercase text-slate-400">{refund.id}</p><h2 className="mt-1 text-lg font-semibold">Đơn {refund.bookingId}</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} />Yêu cầu {dateTime(refund.createdAt)}</p></div></div><StatusBadge status={refund.status} /></div><div className="mt-5 grid gap-4 border-y border-slate-100 py-4 sm:grid-cols-3"><div><p className="text-xs text-slate-400">Đã thanh toán</p><strong>{currency(paid?.amount ?? booking?.total ?? 0)}</strong></div><div><p className="text-xs text-slate-400">Số tiền hoàn</p><strong className="text-[#1E3A5F]">{currency(refund.amount)}</strong></div><div><p className="text-xs text-slate-400">Hoàn tất</p><strong>{refund.processedAt ? dateTime(refund.processedAt) : 'Chưa hoàn tất'}</strong></div></div><div className="mt-4 flex justify-end"><Button asChild variant="secondary" size="sm"><Link to={`/my-bookings/${refund.bookingId}`}>Xem đơn đặt phòng</Link></Button></div></Card> })}</div> : <EmptyState title="Chưa có yêu cầu hoàn tiền" description="Khi một đơn đủ điều kiện được hủy, tiến trình hoàn tiền sẽ hiển thị tại đây." />}</div>
}
