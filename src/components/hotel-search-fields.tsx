import { useEffect, useRef, useState, type ReactNode } from 'react'
import { addMonths, format, startOfMonth } from 'date-fns'
import { Baby, BedDouble, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { addDay, nights, todayPlus } from '@/lib/utils'

type DateRangeProps = {
  checkIn: string
  checkOut: string
  onChange: (checkIn: string, checkOut: string) => void
  className?: string
}

type GuestRoomProps = {
  adults: number
  children: number
  rooms: number
  onChange: (values: { adults: number; children: number; rooms: number }) => void
  className?: string
}

const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']
const longWeekDays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

function parseDay(value: string) {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatRangeDay(value: string) {
  const date = parseDay(value)
  return `${longWeekDays[date.getDay()]}, ${date.getDate()} thg ${date.getMonth() + 1}`
}

function monthTitle(value: Date) {
  return `tháng ${value.getMonth() + 1} năm ${value.getFullYear()}`
}

function useCloseOnOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])
  return ref
}

export function HotelDateRangePicker({ checkIn, checkOut, onChange, className }: DateRangeProps) {
  const [open, setOpen] = useState(false)
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDay(checkIn)))
  const rootRef = useCloseOnOutside(open, () => setOpen(false))
  const nightCount = Math.max(0, nights(checkIn, checkOut))

  const choose = (date: string) => {
    if (!selectingEnd) {
      onChange(date, addDay(date, 1))
      setSelectingEnd(true)
      return
    }
    if (date <= checkIn) {
      onChange(date, addDay(date, 1))
      return
    }
    onChange(checkIn, date)
    setSelectingEnd(false)
  }

  return <div ref={rootRef} className={cn('relative min-w-0', className)}>
    <span className="block text-sm font-semibold text-[#1E3A5F]">Ngày nhận phòng và trả phòng</span>
    <button type="button" aria-label="Ngày nhận phòng và trả phòng" aria-expanded={open} onClick={() => { setOpen(value => !value); setVisibleMonth(startOfMonth(parseDay(checkIn))) }} className={cn('mt-1 flex min-h-12 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border bg-white px-4 text-left text-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200', open ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-300 hover:border-slate-400')}>
      <CalendarDays className="shrink-0 text-[#1E3A5F]" size={22} />
      <span className="min-w-0 flex-1 truncate text-sm sm:text-base">{formatRangeDay(checkIn)} – {formatRangeDay(checkOut)} <span className="text-slate-500">({nightCount} đêm)</span></span>
      <ChevronDown className={cn('shrink-0 transition-transform', open && 'rotate-180')} size={19} />
    </button>

    {open && <div role="dialog" aria-label="Chọn ngày nhận phòng và trả phòng" className="absolute left-1/2 top-[calc(100%+10px)] z-50 w-[min(920px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-20px_rgba(15,23,42,.35)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" aria-label="Tháng trước" onClick={() => setVisibleMonth(month => addMonths(month, -1))} className="grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronLeft size={22} /></button>
        <div className="text-center"><p className="font-semibold text-slate-900">{selectingEnd ? 'Chọn ngày trả phòng' : 'Chọn ngày nhận phòng'}</p><p className="mt-0.5 text-xs text-slate-500">Chọn ngày trên lịch để cập nhật kỳ lưu trú</p></div>
        <button type="button" aria-label="Tháng sau" onClick={() => setVisibleMonth(month => addMonths(month, 1))} className="grid size-10 place-items-center rounded-full text-sky-600 hover:bg-sky-50"><ChevronRight size={22} /></button>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <MonthCalendar month={visibleMonth} checkIn={checkIn} checkOut={checkOut} onChoose={choose} />
        <div className="hidden md:block"><MonthCalendar month={addMonths(visibleMonth, 1)} checkIn={checkIn} checkOut={checkOut} onChoose={choose} /></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600"><strong className="text-slate-900">{nightCount} đêm</strong> · {formatRangeDay(checkIn)} – {formatRangeDay(checkOut)}</p>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-600">Xong</button>
      </div>
    </div>}
  </div>
}

function MonthCalendar({ month, checkIn, checkOut, onChoose }: { month: Date; checkIn: string; checkOut: string; onChoose: (date: string) => void }) {
  const firstDayOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7
  const today = todayPlus(0)

  return <section aria-label={monthTitle(month)}>
    <h3 className="mb-4 text-center text-lg font-bold text-slate-900">{monthTitle(month)}</h3>
    <div className="grid grid-cols-7 border-b border-slate-200 pb-2 text-center text-xs font-semibold text-slate-500 sm:text-sm">{weekDays.map((day, index) => <span key={day} className={index === 6 ? 'text-red-500' : undefined}>{day}</span>)}</div>
    <div className="mt-3 grid grid-cols-7 gap-y-2">{Array.from({ length: cellCount }, (_, index) => {
      const day = index - firstDayOffset + 1
      if (day < 1 || day > daysInMonth) return <span key={index} className="aspect-square" />
      const date = format(new Date(month.getFullYear(), month.getMonth(), day), 'yyyy-MM-dd')
      const disabled = date < today
      const endpoint = date === checkIn || date === checkOut
      const inRange = date > checkIn && date < checkOut
      const sunday = index % 7 === 6
      return <button key={date} type="button" disabled={disabled} aria-label={`${day} ${monthTitle(month)}`} aria-pressed={endpoint} onClick={() => onChoose(date)} className={cn('mx-auto grid size-9 place-items-center rounded-full text-sm font-medium transition sm:size-10 sm:text-base', disabled && 'cursor-not-allowed text-slate-300', !disabled && !endpoint && !inRange && (sunday ? 'text-red-500 hover:bg-red-50' : 'text-slate-800 hover:bg-sky-50'), inRange && 'rounded-none bg-sky-50 text-sky-800', endpoint && 'bg-sky-500 font-bold text-white shadow-sm ring-2 ring-sky-500 ring-offset-2')}>{day}</button>
    })}</div>
  </section>
}

export function HotelGuestPicker({ adults, children, rooms, onChange, className }: GuestRoomProps) {
  const [open, setOpen] = useState(false)
  const [childAges, setChildAges] = useState<number[]>(() => Array.from({ length: children }, () => 8))
  const rootRef = useCloseOnOutside(open, () => setOpen(false))

  const change = (key: 'adults' | 'children' | 'rooms', value: number) => onChange({ adults, children, rooms, [key]: value })
  const visibleChildAges = Array.from({ length: children }, (_, index) => childAges[index] ?? 8)
  return <div ref={rootRef} className={cn('relative min-w-0', className)}>
    <span className="block text-sm font-semibold text-[#1E3A5F]">Khách và Phòng</span>
    <button type="button" aria-label="Khách và Phòng" aria-expanded={open} onClick={() => setOpen(value => !value)} className={cn('mt-1 flex min-h-12 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border bg-white px-4 text-left text-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200', open ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-300 hover:border-slate-400')}>
      <UserRound className="shrink-0 text-[#1E3A5F]" size={22} />
      <span className="min-w-0 flex-1 truncate text-sm sm:text-base">{adults} người lớn, {children} trẻ em, {rooms} phòng</span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700"><ChevronDown className={cn('transition-transform', open && 'rotate-180')} size={18} /></span>
    </button>

    {open && <div role="dialog" aria-label="Chọn số khách và phòng" className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[70vh] w-[min(420px,calc(100vw-32px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-20px_rgba(15,23,42,.35)]">
      <div className="grid gap-5">
        <CounterRow icon={<UserRound size={24} />} label="Người lớn" value={adults} min={1} max={12} onChange={value => change('adults', value)} />
        <CounterRow icon={<Baby size={24} />} label="Trẻ em" hint="Tối đa 17 tuổi" value={children} min={0} max={10} onChange={value => change('children', value)} />
        <CounterRow icon={<BedDouble size={24} />} label="Phòng" value={rooms} min={1} max={5} onChange={value => change('rooms', value)} />
      </div>
      {children > 0 && <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-semibold text-slate-900">Điền tuổi của trẻ</h3><p className="mt-1 text-sm leading-6 text-slate-500">Tuổi của trẻ giúp tìm loại phòng phù hợp hơn.</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{visibleChildAges.map((age, index) => <label key={index} className="text-sm font-medium text-slate-600">Trẻ em {index + 1}<select aria-label={`Tuổi trẻ em ${index + 1}`} value={age} onChange={event => setChildAges(current => Array.from({ length: children }, (_, ageIndex) => ageIndex === index ? Number(event.target.value) : current[ageIndex] ?? 8))}>{Array.from({ length: 18 }, (_, value) => <option key={value} value={value}>{value === 0 ? 'Dưới 1' : value}</option>)}</select></label>)}</div></div>}
      <button type="button" onClick={() => setOpen(false)} className="mt-6 w-full rounded-full bg-sky-500 px-6 py-3 font-semibold text-white hover:bg-sky-600 sm:ml-auto sm:block sm:w-36">Xong</button>
    </div>}
  </div>
}

function CounterRow({ icon, label, hint, value, min, max, onChange }: { icon: ReactNode; label: string; hint?: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center text-slate-700">{icon}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div><button type="button" aria-label={`Giảm ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid size-11 place-items-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"><Minus size={18} /></button><strong className="w-7 text-center text-lg">{value}</strong><button type="button" aria-label={`Tăng ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid size-11 place-items-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} /></button></div>
}
