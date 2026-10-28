import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Banknote, BedDouble, Bell, Building2, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight,
  CircleDollarSign, Compass, CreditCard, LayoutDashboard, LogOut, Menu, MessageSquareText,
  ReceiptText, ShieldCheck, UserRound, Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { usePartnerData } from '@/hooks/data'
import { useSession } from '@/stores/session'
import { usePartnerHotel } from '@/stores/partner-hotel'

const groups = [
  { label: 'Tổng quan', items: [{ to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Quản lý khách sạn', items: [
    { to: '/partner/hotel', label: 'Thông tin khách sạn', icon: Building2 },
    { to: '/partner/rooms', label: 'Quản lý phòng', icon: BedDouble },
    { to: '/partner/amenities', label: 'Tiện nghi', icon: Wifi },
    { to: '/partner/cancellation-policies', label: 'Chính sách hủy', icon: ShieldCheck },
  ] },
  { label: 'Quản lý đặt phòng', items: [
    { to: '/partner/bookings', label: 'Đơn đặt phòng', icon: CalendarDays },
    { to: '/partner/booking-calendar', label: 'Lịch đặt phòng', icon: CalendarRange },
    { to: '/partner/booking-history', label: 'Lịch sử đặt phòng', icon: ReceiptText },
  ] },
  { label: 'Quản lý tài chính', items: [
    { to: '/partner/revenue', label: 'Doanh thu', icon: CircleDollarSign },
    { to: '/partner/payments', label: 'Thanh toán', icon: CreditCard },
    { to: '/partner/payouts', label: 'Chi trả nền tảng', icon: Banknote },
    { to: '/partner/refunds', label: 'Hủy & hoàn tiền', icon: ReceiptText },
  ] },
  { label: 'Khách hàng', items: [{ to: '/partner/reviews', label: 'Đánh giá', icon: MessageSquareText }] },
  { label: 'Tài khoản', items: [{ to: '/partner/profile', label: 'Thông tin cá nhân', icon: UserRound }] },
]

const titles: Record<string, string> = {
  dashboard: 'Tổng quan', hotel: 'Thông tin khách sạn', register: 'Đăng ký khách sạn', edit: 'Chỉnh sửa', rooms: 'Quản lý phòng',
  amenities: 'Tiện nghi', 'cancellation-policies': 'Chính sách hủy', media: 'Hình ảnh', bookings: 'Đơn đặt phòng',
  'booking-calendar': 'Lịch đặt phòng', 'booking-history': 'Lịch sử đặt phòng', revenue: 'Doanh thu', payments: 'Thanh toán',
  payouts: 'Chi trả từ nền tảng', refunds: 'Hủy và hoàn tiền', reviews: 'Đánh giá', profile: 'Thông tin cá nhân', new: 'Thêm phòng',
}

function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return <><Link to="/partner/dashboard" onClick={onNavigate} className={cn('flex h-[72px] items-center gap-3 border-b border-slate-800 px-5', collapsed && 'justify-center px-2')}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Compass size={23} /></span>{!collapsed && <span><strong className="block text-white">Smart Tourism</strong><span className="text-xs text-slate-400">Hotel Owner</span></span>}</Link><nav aria-label="Điều hướng chủ khách sạn" className="h-[calc(100vh-72px)] overflow-y-auto px-3 py-5">{groups.map(group => <div key={group.label} className="mb-6">{!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>}<div className="grid gap-1">{group.items.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} onClick={onNavigate} title={collapsed ? item.label : undefined} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', collapsed && 'justify-center', isActive ? 'bg-emerald-500 font-semibold text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}><Icon size={18} className="shrink-0" />{!collapsed && item.label}</NavLink> })}</div></div>)}</nav></>
}

export function PartnerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const user = useSession(state => state.user)
  const logout = useSession(state => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = usePartnerData()
  const hotelId = usePartnerHotel(state => state.hotelId)
  const setHotelId = usePartnerHotel(state => state.setHotelId)
  useEffect(() => { if (hotelId && data && !data.hotels.some(hotel => hotel.id === hotelId)) setHotelId('') }, [data, hotelId, setHotelId])
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = data?.bookings.filter(booking => (!hotelId || booking.hotelId === hotelId) && booking.status === 'CONFIRMED' && booking.checkIn >= today).slice(0, 3) ?? []
  const segments = location.pathname.split('/').filter(Boolean).slice(1)
  const title = titles[segments.at(-1) ?? 'dashboard'] ?? (segments.length > 1 ? 'Chi tiết' : 'Chủ khách sạn')
  return <div className="min-h-screen bg-[#F4F7FA]">
    <aside className={cn('fixed inset-y-0 left-0 z-40 hidden bg-[#14283F] transition-[width] duration-200 lg:block', collapsed ? 'w-[82px]' : 'w-[270px]')}><Sidebar collapsed={collapsed} /><button aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow" onClick={() => setCollapsed(value => !value)}>{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Đóng menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[285px] bg-[#14283F]"><Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} /></aside></div>}
    <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[82px]' : 'lg:pl-[270px]')}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></Button><div className="min-w-0"><p className="truncate text-xs text-slate-400">Chủ khách sạn <span className="mx-1">/</span> {segments.map(item => titles[item] ?? item).join(' / ') || 'Tổng quan'}</p><h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1></div></div><div className="relative flex items-center gap-2"><label className="hidden text-xs font-medium text-slate-500 md:block">Khách sạn<select aria-label="Khách sạn đang quản lý" className="!mt-1 !min-h-9 max-w-56 text-sm" value={hotelId} onChange={event => setHotelId(event.target.value)}><option value="">Tất cả khách sạn</option>{data?.hotels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button variant="ghost" size="icon" aria-label="Thông báo" aria-expanded={noticeOpen} onClick={() => { setNoticeOpen(value => !value); setAccountOpen(false) }}><Bell size={18} />{upcoming.length > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}</Button>{noticeOpen && <div className="absolute right-12 top-12 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"><strong className="text-sm">Lịch nhận phòng sắp tới</strong><div className="mt-2 grid gap-2">{upcoming.length ? upcoming.map(booking => <Link key={booking.id} to={`/partner/bookings/${booking.id}`} onClick={() => setNoticeOpen(false)} className="rounded-lg p-2 text-sm hover:bg-slate-50"><strong className="block">{booking.id} · {booking.guestName}</strong><span className="text-xs text-slate-500">Nhận phòng {booking.checkIn}</span></Link>) : <p className="text-sm text-slate-500">Không có lịch sắp tới.</p>}</div></div>}<span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">{user?.name?.charAt(0) ?? 'P'}</span><Button variant="ghost" size="icon" aria-label="Mở menu tài khoản" aria-expanded={accountOpen} onClick={() => { setAccountOpen(value => !value); setNoticeOpen(false) }}><ChevronDown size={17} /></Button>{accountOpen && <div className="absolute right-0 top-12 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-3 py-2"><strong className="block text-sm">{user?.name}</strong><span className="text-xs text-slate-500">{user?.email}</span></div><Link className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50" to="/partner/profile" onClick={() => setAccountOpen(false)}><UserRound size={16} />Thông tin cá nhân</Link><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => { logout(); navigate('/') }}><LogOut size={16} />Đăng xuất</button></div>}</div></div></header>
      <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden"><label className="text-xs font-medium text-slate-500">Khách sạn đang quản lý<select value={hotelId} onChange={event => setHotelId(event.target.value)}><option value="">Tất cả khách sạn</option>{data?.hotels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <main id="main" className="min-w-0 p-4 sm:p-6 xl:p-8"><Outlet /></main>
    </div>
  </div>
}
