import type { ReactNode } from 'react'
import {
  BedDouble,
  CalendarDays,
  Check,
  CreditCard,
  MapPin,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Card, Picture, StatusBadge } from '@/components/common'
import { cn } from '@/lib/cn'
import { currency, day } from '@/lib/utils'
import { roomImage } from '@/lib/travel-images'
import type { Booking, BookingInput, Hotel, Payment, Refund, RoomType } from '@/types/domain'

const steps = [
  { number: 1, label: 'Lưu trú', icon: CalendarDays },
  { number: 2, label: 'Người đặt', icon: UserRound },
  { number: 3, label: 'Xác nhận', icon: ShieldCheck },
]

export function BookingSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Tiến trình đặt phòng" className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {steps.map(({ number, label, icon: Icon }) => {
        const complete = number < current
        const active = number === current
        return (
          <li key={number} className={cn('relative flex items-center gap-3 px-3 py-4 sm:px-5', number < 3 && 'border-r border-slate-200', active && 'bg-sky-50')}>
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold', complete || active ? 'border-[#159FE8] bg-[#159FE8] text-white' : 'border-slate-300 bg-white text-slate-500')}>
              {complete ? <Check size={17} /> : <Icon size={17} />}
            </span>
            <span className="hidden sm:block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Bước {number}</span>
              <span className={cn('text-sm font-semibold', active ? 'text-[#1E3A5F]' : 'text-slate-600')}>{label}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
export function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#159FE8]">{icon}</span>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  )
}

export function DetailItem({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{children || '—'}</dd>
    </div>
  )
}

export function RoomSummary({ hotel, room, booking, form, total }: { hotel: Hotel; room: RoomType; booking?: Booking; form?: BookingInput; total: number }) {
  const stay = booking ?? form
  if (!stay) return null
  return (
    <Card className="h-fit overflow-hidden lg:sticky lg:top-24">
      <Picture label={room.name} src={room.images?.[0] ?? room.image ?? roomImage(room.id)} className="aspect-[16/9]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#159FE8]">{hotel.stars} sao</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{hotel.name}</h2>
          </div>
          {hotel.rating && <span className="rounded-lg bg-[#1E3A5F] px-2 py-1 text-sm font-bold text-white">{hotel.rating}</span>}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500"><MapPin className="mt-0.5 shrink-0" size={15} />{hotel.address}</p>
        <div className="my-4 border-t border-slate-100" />
        <p className="flex items-center gap-2 font-semibold"><BedDouble size={17} className="text-[#159FE8]" />{room.name}</p>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <p className="flex items-center gap-2"><CalendarDays size={16} />{day(stay.checkIn)} – {day(stay.checkOut)}</p>
          <p className="flex items-center gap-2"><UsersRound size={16} />{stay.adults} người lớn, {stay.children} trẻ em · {stay.rooms} phòng</p>
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-4">
          <span className="text-sm text-slate-500">Tổng thanh toán</span>
          <strong className="text-xl text-[#1E3A5F]">{currency(total)}</strong>
        </div>
      </div>
    </Card>
  )
}

export function BookingRelationFlow({ booking, payment, refund }: { booking: Booking; payment?: Payment; refund?: Refund }) {
  const nodes = [
    { label: 'Đơn đặt phòng', id: booking.id, status: booking.status, icon: <ReceiptText size={19} /> },
    { label: 'Thanh toán', id: payment?.reference ?? payment?.id ?? 'Chưa phát sinh', status: payment?.status ?? 'PENDING', icon: <CreditCard size={19} /> },
    { label: 'Hoàn tiền', id: refund?.id ?? 'Chưa phát sinh', status: refund?.status, icon: <RefreshCcw size={19} /> },
  ]
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon={<ReceiptText size={20} />} title="Luồng giao dịch" description="Theo quan hệ Đơn đặt phòng → Thanh toán → Hoàn tiền trong ERD." />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {nodes.map((node, index) => (
          <div key={node.label} className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
            {index < nodes.length - 1 && <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden h-px w-3 bg-slate-300 md:block" />}
            <div className="flex items-center gap-2 text-[#1E3A5F]">{node.icon}<strong className="text-sm">{node.label}</strong></div>
            <p className="mt-3 truncate text-xs text-slate-500" title={node.id}>{node.id}</p>
            <div className="mt-2">{node.status ? <StatusBadge status={node.status} /> : <span className="text-xs text-slate-400">Không áp dụng</span>}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

