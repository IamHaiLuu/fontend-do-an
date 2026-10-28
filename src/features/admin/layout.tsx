import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Banknote, CalendarRange, ChevronDown, ChevronLeft, ChevronRight,
  Compass, CreditCard, Hotel, LayoutDashboard, LogOut, MapPinned, Menu, MessageSquareText,
  ReceiptText, Route, Tags, UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useSession } from '@/stores/session'

const groups = [
  { label: 'Tổng quan', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Quản lý hệ thống', items: [
    { to: '/admin/users', label: 'Người dùng', icon: UsersRound },
    { to: '/admin/hotels', label: 'Khách sạn', icon: Hotel },
    { to: '/admin/destinations', label: 'Địa điểm du lịch', icon: MapPinned },
    { to: '/admin/topics', label: 'Chủ đề du lịch', icon: Tags },
  ] },
  { label: 'Quản lý đặt phòng', items: [
    { to: '/admin/bookings', label: 'Đơn đặt phòng', icon: CalendarRange },
    { to: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
    { to: '/admin/refunds', label: 'Hủy & hoàn tiền', icon: ReceiptText },
  ] },
  { label: 'Quản lý tài chính', items: [{ to: '/admin/payouts', label: 'Chi trả chủ khách sạn', icon: Banknote }] },
  { label: 'Quản lý nội dung', items: [
    { to: '/admin/reviews', label: 'Đánh giá', icon: MessageSquareText },
    { to: '/admin/itineraries', label: 'Lịch trình', icon: Route },
  ] },
]

const titles: Record<string, string> = {
  dashboard: 'Tổng quan', users: 'Người dùng', hotels: 'Khách sạn', destinations: 'Địa điểm du lịch', topics: 'Chủ đề du lịch',
  bookings: 'Đơn đặt phòng', payments: 'Thanh toán', refunds: 'Hủy đơn và hoàn tiền', payouts: 'Chi trả chủ khách sạn',
  reviews: 'Đánh giá', itineraries: 'Lịch trình du lịch', new: 'Thêm mới', edit: 'Chỉnh sửa',
}
function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return <><Link to="/admin/dashboard" onClick={onNavigate} className={cn('flex h-[72px] items-center gap-3 border-b border-slate-800 px-5', collapsed && 'justify-center px-2')}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#159FE8] text-white"><Compass size={23} /></span>{!collapsed && <span><strong className="block text-white">Smart Tourism</strong><span className="text-xs text-slate-400">Admin Console</span></span>}</Link><nav aria-label="Điều hướng quản trị" className="h-[calc(100vh-72px)] overflow-y-auto px-3 py-5">{groups.map(group => <div key={group.label} className="mb-6">{!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>}<div className="grid gap-1">{group.items.map(item => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} onClick={onNavigate} title={collapsed ? item.label : undefined} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', collapsed && 'justify-center', isActive ? 'bg-[#159FE8] font-semibold text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white')}><Icon size={18} className="shrink-0" />{!collapsed && <span>{item.label}</span>}</NavLink> })}</div></div>)}</nav></>
}

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const user = useSession(state => state.user)
  const logout = useSession(state => state.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean).slice(1)
  const pageTitle = titles[segments.at(-1) ?? 'dashboard'] ?? (segments.length > 1 ? 'Chi tiết' : 'Quản trị')

  return <div className="min-h-screen bg-[#F4F7FA]">
    <aside className={cn('fixed inset-y-0 left-0 z-40 hidden bg-[#14283F] transition-[width] duration-200 lg:block', collapsed ? 'w-[82px]' : 'w-[270px]')}><SidebarContent collapsed={collapsed} /><button aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow" onClick={() => setCollapsed(value => !value)}>{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Đóng menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[285px] bg-[#14283F]"><SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} /></aside></div>}
    <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[82px]' : 'lg:pl-[270px]')}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></Button><div className="min-w-0"><p className="truncate text-xs text-slate-400">Quản trị viên <span className="mx-1">/</span> {segments.map(item => titles[item] ?? item).join(' / ') || 'Tổng quan'}</p><h1 className="truncate text-lg font-semibold text-slate-900">{pageTitle}</h1></div></div><div className="relative flex items-center gap-3"><span className="hidden text-right sm:block"><strong className="block text-sm text-slate-800">{user?.name}</strong><span className="text-xs text-slate-400">Quản trị viên</span></span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">{user?.name?.charAt(0) ?? 'A'}</span><Button variant="ghost" size="icon" aria-label="Mở menu tài khoản" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><ChevronDown size={17} /></Button>{accountOpen && <div className="absolute right-0 top-12 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><div className="border-b border-slate-100 px-3 py-2"><strong className="block text-sm">{user?.name}</strong><span className="text-xs text-slate-500">{user?.email}</span></div><Link className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50" to="/admin/users" onClick={() => setAccountOpen(false)}><UsersRound size={16} />Quản lý tài khoản</Link><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => { logout(); navigate('/') }}><LogOut size={16} />Đăng xuất</button></div>}<Button variant="ghost" size="icon" aria-label="Đăng xuất" onClick={() => { logout(); navigate('/') }}><LogOut size={18} /></Button></div></div></header>
      <main id="main" className="min-w-0 p-4 sm:p-6 xl:p-8"><Outlet /></main>
    </div>
  </div>
}

