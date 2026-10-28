import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Banknote, CircleDollarSign, Eye, RefreshCcw, Star, WalletCards } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, StatusBadge } from '@/components/common'
import { useScopedPartnerData } from '@/hooks/data'
import { useSession } from '@/stores/session'
import { repo } from '@/services'
import { currency, day, dateTime, errorMessage, formatStatus } from '@/lib/utils'
import { AdminPageHeader, DataTable, DetailSection, LoadingSkeleton, SearchFilterBar, StatCard } from '@/features/admin/admin-ui'

export function PartnerRevenuePage() {
  const { data, isLoading, error } = useScopedPartnerData()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const paid = data.payments.filter(payment => payment.status === 'PAID' && (!from || payment.createdAt.slice(0, 10) >= from) && (!to || payment.createdAt.slice(0, 10) <= to))
  const paidIds = new Set(paid.map(payment => payment.bookingId))
  const revenue = paid.reduce((sum, payment) => sum + payment.amount, 0)
  const refunded = data.refunds.filter(refund => refund.status === 'REFUNDED' && paidIds.has(refund.bookingId)).reduce((sum, refund) => sum + refund.amount, 0)
  const commission = data.settlements.reduce((sum, item) => sum + item.commission, 0)
  const partnerNet = data.settlements.reduce((sum, item) => sum + item.net, 0)
  const paidOut = data.settlements.filter(item => item.status === 'PAID').reduce((sum, item) => sum + item.net, 0)
  const pending = data.settlements.filter(item => item.status !== 'PAID').reduce((sum, item) => sum + item.net, 0)
  const chartMap = paid.reduce<Record<string, number>>((rows, payment) => { const key = payment.createdAt.slice(0, 10); rows[key] = (rows[key] ?? 0) + payment.amount; return rows }, {})
  const chart = Object.entries(chartMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date: day(date), amount }))
  return <div><AdminPageHeader eyebrow="Quản lý tài chính" title="Doanh thu" description="Phân biệt doanh thu thanh toán, tiền hoàn, phí nền tảng và tiền thực nhận." /><Card className="mb-5 grid gap-4 p-4 sm:grid-cols-2 lg:max-w-xl"><FormField label="Từ ngày"><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></FormField><FormField label="Đến ngày"><input type="date" min={from} value={to} onChange={event => setTo(event.target.value)} /></FormField></Card><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Doanh thu thành công" value={currency(revenue)} icon={<CircleDollarSign size={19} />} tone="green" /><StatCard label="Đã hoàn cho khách" value={currency(refunded)} icon={<RefreshCcw size={19} />} tone="amber" /><StatCard label="Phí nền tảng" value={currency(commission)} icon={<WalletCards size={19} />} /><StatCard label="Chủ khách sạn được nhận" value={currency(partnerNet)} icon={<Banknote size={19} />} tone="violet" /><StatCard label="Đã chi trả" value={currency(paidOut)} icon={<Banknote size={19} />} tone="green" /><StatCard label="Chờ chi trả" value={currency(pending)} icon={<Banknote size={19} />} tone="amber" /></section><Card className="mt-6 p-5 sm:p-6"><h2 className="text-lg font-semibold">Doanh thu theo ngày</h2><div className="mt-5 h-72">{chart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="date" /><YAxis tickFormatter={value => `${Math.round(Number(value) / 1000000)}tr`} /><Tooltip formatter={value => currency(Number(value))} /><Bar dataKey="amount" name="Doanh thu" fill="#10B981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-sm text-slate-500">Không có dữ liệu trong khoảng ngày.</p>}</div></Card><div className="mt-6"><DetailSection title="Doanh thu theo đơn"><div className="table-scroll"><table><thead><tr><th>Mã đơn</th><th>Ngày thanh toán</th><th>Tổng tiền</th><th>Phí nền tảng</th><th>Tiền chủ khách sạn</th><th>Trạng thái</th></tr></thead><tbody>{data.bookings.filter(booking => paidIds.has(booking.id)).map(booking => { const payment = paid.find(item => item.bookingId === booking.id); const settlement = data.settlements.find(item => item.bookingIds.includes(booking.id)); return <tr key={booking.id}><td><Link className="font-semibold text-emerald-700" to={`/partner/bookings/${booking.id}`}>{booking.id}</Link></td><td>{payment ? dateTime(payment.completedAt ?? payment.createdAt) : '—'}</td><td>{currency(booking.total)}</td><td>{settlement ? currency(Math.round(settlement.commission / settlement.bookingIds.length)) : 'Chưa đối soát'}</td><td>{settlement ? currency(Math.round(settlement.net / settlement.bookingIds.length)) : 'Chưa đối soát'}</td><td>{settlement ? <StatusBadge status={settlement.status} /> : <StatusBadge status="PENDING" />}</td></tr> })}</tbody></table></div></DetailSection></div></div>
}

export function PartnerPaymentsPage() {
  const { data, isLoading, error } = useScopedPartnerData()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').toLowerCase()
  const status = params.get('status') ?? ''
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  const items = data.payments.filter(payment => { const booking = data.bookings.find(item => item.id === payment.bookingId); return (!query || `${payment.id} ${payment.bookingId} ${booking?.guestName ?? ''}`.toLowerCase().includes(query)) && (!status || payment.status === status) })
  return <div><AdminPageHeader eyebrow="Quản lý tài chính" title="Giao dịch thanh toán" description="Dữ liệu chỉ đọc; chủ khách sạn không thể sửa số tiền hoặc trạng thái giao dịch." /><SearchFilterBar search={params.get('q') ?? ''} onSearch={value => update('q', value)} searchPlaceholder="Mã giao dịch, mã đơn hoặc khách hàng"><label className="min-w-44 text-sm font-medium">Trạng thái<select value={status} onChange={event => update('status', event.target.value)}><option value="">Tất cả</option>{['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'EXPIRED'].map(item => <option key={item} value={item}>{formatStatus(item)}</option>)}</select></label></SearchFilterBar><DataTable total={items.length} emptyTitle="Không có giao dịch phù hợp"><table><thead><tr><th>Mã giao dịch</th><th>Mã đơn</th><th>Khách hàng</th><th>Số tiền</th><th>Phương thức</th><th>Thời gian</th><th>Mã tham chiếu</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(payment => { const booking = data.bookings.find(item => item.id === payment.bookingId); return <tr key={payment.id}><td className="font-mono text-xs">{payment.id}</td><td>{payment.bookingId}</td><td>{booking?.guestName}</td><td className="font-semibold">{currency(payment.amount)}</td><td>{payment.method}</td><td>{dateTime(payment.createdAt)}</td><td>{payment.reference ?? '—'}</td><td><StatusBadge status={payment.status} /></td><td><Button asChild size="sm" variant="secondary"><Link to={`/partner/bookings/${payment.bookingId}`}><Eye size={15} />Xem đơn</Link></Button></td></tr> })}</tbody></table></DataTable></div>
}

export function PartnerPayoutsPage() {
  const { data, isLoading, error } = useScopedPartnerData()
  const [status, setStatus] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = data.settlements.filter(item => !status || item.status === status)
  const totals = (statuses: string[]) => data.settlements.filter(item => statuses.includes(item.status)).reduce((sum, item) => sum + item.net, 0)
  return <div><AdminPageHeader eyebrow="Quản lý tài chính" title="Chi trả từ nền tảng" description="Chủ khách sạn chỉ đối chiếu, không thể tự tạo hoặc chuyển trạng thái khoản chi." /><section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Dự kiến nhận" value={currency(totals(['DRAFT', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED']))} icon={<Banknote size={18} />} /><StatCard label="Đủ điều kiện" value={currency(totals(['APPROVED']))} icon={<Banknote size={18} />} tone="green" /><StatCard label="Đang xử lý" value={currency(totals(['PROCESSING']))} icon={<Banknote size={18} />} tone="amber" /><StatCard label="Đã nhận" value={currency(totals(['PAID']))} icon={<Banknote size={18} />} tone="green" /><StatCard label="Thất bại" value={currency(totals(['FAILED']))} icon={<Banknote size={18} />} tone="amber" /></section><Card className="mb-5 max-w-xs p-4"><FormField label="Trạng thái"><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả</option>{['DRAFT', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED'].map(item => <option key={item} value={item}>{formatStatus(item)}</option>)}</select></FormField></Card><DataTable total={items.length} emptyTitle="Chưa có khoản chi trả"><table><thead><tr><th>Mã chi trả</th><th>Các đơn liên quan</th><th>Kỳ đối soát</th><th>Tổng tiền đơn</th><th>Phí nền tảng</th><th>Điều chỉnh</th><th>Thực nhận</th><th>Trạng thái</th><th>Mã chuyển tiền</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td className="font-mono text-xs">{item.id}</td><td>{item.bookingIds.map(bookingId => <Link key={bookingId} className="mr-2 font-semibold text-emerald-700" to={`/partner/bookings/${bookingId}`}>{bookingId}</Link>)}</td><td>{day(item.periodStart)} – {day(item.periodEnd)}</td><td>{currency(item.gross)}</td><td>{currency(item.commission)}</td><td>{currency(item.adjustment)}</td><td className="font-semibold">{currency(item.net)}</td><td><StatusBadge status={item.status} /></td><td>{item.transferReference ?? '—'}</td></tr>)}</tbody></table></DataTable></div>
}

export function PartnerRefundsPage() {
  const { data, isLoading, error } = useScopedPartnerData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  return <div><AdminPageHeader eyebrow="Quản lý tài chính" title="Đơn hủy và hoàn tiền" description="Chủ khách sạn chỉ xem hồ sơ và ảnh hưởng tài chính; không thể thay đổi số tiền hoặc xử lý hoàn." /><DataTable total={data.refunds.length} emptyTitle="Chưa có hồ sơ hoàn tiền"><table><thead><tr><th>Mã hoàn tiền</th><th>Mã đơn</th><th>Khách hàng</th><th>Ngày nhận phòng</th><th>Ngày hủy</th><th>Đã thanh toán</th><th>Hoàn cho khách</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.refunds.map(refund => { const booking = data.bookings.find(item => item.id === refund.bookingId); const payment = data.payments.find(item => item.bookingId === refund.bookingId && item.status === 'PAID'); return <tr key={refund.id}><td className="font-mono text-xs">{refund.id}</td><td>{refund.bookingId}</td><td>{booking?.guestName}</td><td>{booking ? day(booking.checkIn) : '—'}</td><td>{booking?.cancelledAt ? dateTime(booking.cancelledAt) : '—'}</td><td>{currency(payment?.amount ?? 0)}</td><td className="font-semibold">{currency(refund.amount)}</td><td><StatusBadge status={refund.status} /></td><td><Button asChild size="sm" variant="secondary"><Link to={`/partner/bookings/${refund.bookingId}`}><Eye size={15} />Xem đơn</Link></Button></td></tr> })}</tbody></table></DataTable></div>
}

export function PartnerReviewsPage() {
  const { data, isLoading, error } = useScopedPartnerData()
  const [query, setQuery] = useState('')
  const [stars, setStars] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = data.reviews.filter(review => { const booking = data.bookings.find(item => item.id === review.bookingId); return (!query || `${review.bookingId} ${booking?.guestName ?? ''}`.toLowerCase().includes(query.toLowerCase())) && (!stars || review.stars === Number(stars)) })
  const average = data.reviews.length ? data.reviews.reduce((sum, item) => sum + item.stars, 0) / data.reviews.length : 0
  return <div><AdminPageHeader eyebrow="Quản lý khách hàng" title="Đánh giá khách sạn" description="Chủ khách sạn chỉ được xem đánh giá thuộc khách sạn, không thể sửa nội dung hoặc trạng thái kiểm duyệt." /><div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Điểm trung bình" value={average.toFixed(1)} detail="trên 5 sao" icon={<Star size={19} />} tone="amber" /><StatCard label="Tổng đánh giá" value={String(data.reviews.length)} icon={<Star size={19} />} /><Card className="p-5"><p className="text-sm font-medium text-slate-500">Phân bố số sao</p><div className="mt-3 flex items-end gap-3">{[1, 2, 3, 4, 5].map(value => <div key={value} className="text-center"><strong className="block">{data.reviews.filter(item => item.stars === value).length}</strong><span className="text-xs text-slate-400">{value}★</span></div>)}</div></Card></div><SearchFilterBar search={query} onSearch={setQuery} searchPlaceholder="Mã đơn hoặc tên khách hàng"><label className="min-w-36 text-sm font-medium">Số sao<select value={stars} onChange={event => setStars(event.target.value)}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}</select></label></SearchFilterBar>{items.length ? <div className="grid gap-4">{items.map(review => { const booking = data.bookings.find(item => item.id === review.bookingId); return <Card key={review.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-1 text-amber-500">{Array.from({ length: review.stars }, (_, index) => <Star key={index} size={16} fill="currentColor" />)}</div><h2 className="mt-2 font-semibold">{booking?.guestName} · {review.bookingId}</h2><p className="mt-1 text-xs text-slate-500">{dateTime(review.createdAt)}</p></div><StatusBadge status={review.status} /></div><p className="mt-4 text-sm leading-6 text-slate-700">{review.content}</p></Card> })}</div> : <EmptyState title="Không có đánh giá phù hợp" />}</div>
}

export function PartnerProfilePage() {
  const { data, isLoading, error } = useScopedPartnerData()
  const sessionUser = useSession(state => state.user)
  const login = useSession(state => state.login)
  const queryClient = useQueryClient()
  const user = data?.user
  const [name, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data || !user) return <ErrorState message={errorMessage(error)} />
  const currentName = name ?? user.name
  const currentPhone = phone ?? user.phone ?? ''
  return <div><AdminPageHeader eyebrow="Tài khoản" title="Thông tin cá nhân" description="Bạn không thể thay đổi vai trò, ID hoặc quyền sở hữu khách sạn từ biểu mẫu này." /><div className="grid gap-5 xl:grid-cols-[1fr_340px]"><Card className="p-5 sm:p-6"><form className="grid gap-4" onSubmit={async event => { event.preventDefault(); try { const updated = await repo.saveProfile(user.id, { name: currentName, phone: currentPhone }); if (sessionUser) login({ ...sessionUser, ...updated }); await queryClient.invalidateQueries({ queryKey: ['partner'] }); setName(null); setPhone(null); setMessage('Đã cập nhật thông tin cá nhân.') } catch (cause) { setMessage(errorMessage(cause)) } }}><FormField label="Họ và tên *"><input required value={currentName} onChange={event => setName(event.target.value)} /></FormField><FormField label="Email"><input disabled value={user.email} /></FormField><FormField label="Số điện thoại"><input value={currentPhone} onChange={event => setPhone(event.target.value)} /></FormField><FormField label="Vai trò"><input disabled value="HOTEL_OWNER" /></FormField><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /><div className="flex flex-wrap gap-3"><Button>Lưu thông tin</Button><Button asChild variant="secondary"><Link to={`/auth/forgot-password?email=${encodeURIComponent(user.email)}`}>Đổi mật khẩu</Link></Button></div></form></Card><Card className="h-fit p-6 text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">{user.name.charAt(0)}</span><h2 className="mt-4 font-semibold">{user.name}</h2><p className="mt-1 text-sm text-slate-500">{user.email}</p><div className="mt-4"><StatusBadge status={user.active === false ? 'LOCKED' : 'ACTIVE'} /></div>{data.partner && <div className="mt-5 border-t border-slate-100 pt-5 text-left text-sm"><p>Ngân hàng: <strong>{data.partner.bankName}</strong></p><p className="mt-2">Tài khoản: <strong>••••{data.partner.bankLast4}</strong></p><p className="mt-2 text-xs text-slate-500">Thông tin nhận tiền cần quy trình xác minh riêng.</p></div>}</Card></div></div>
}
