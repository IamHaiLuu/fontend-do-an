import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Check, MapPin, ShieldCheck, Star, UsersRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, LoadingState, MediaGallery, PageHeader, StatusBadge } from '@/components/common'
import { HotelDateRangePicker, HotelGuestPicker } from '@/components/hotel-search-fields'
import { GoogleMapView } from '@/components/google-map'
import { useCatalog } from '@/hooks/data'
import { currency, errorMessage, nights, stayDays, todayPlus } from '@/lib/utils'
import { roomImage, travelImage } from '@/lib/travel-images'

export function HotelDetailModernPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { data, isLoading, error } = useCatalog()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const checkIn = params.get('checkIn') ?? todayPlus(7)
  const checkOut = params.get('checkOut') ?? todayPlus(9)
  const requestedRooms = Math.max(1, Number(params.get('rooms') ?? 1))
  const adults = Math.max(1, Number(params.get('adults') ?? 2))
  const children = Math.max(0, Number(params.get('children') ?? 0))
  const dateCount = nights(checkIn, checkOut)
  const dates = dateCount > 0 ? stayDays(checkIn, checkOut) : []
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => next.set(key, value))
    setSelectedIds([])
    setParams(next, { replace: true })
  }

  const hotel = data?.hotels.find(item => item.id === id)
  const rooms = useMemo(() => (data?.rooms ?? []).filter(room => room.hotelId === id && room.active !== false), [data, id])
  const selectedRooms = rooms.filter(room => selectedIds.includes(room.id))
  const totalCapacity = selectedRooms.reduce((sum, room) => sum + room.capacity, 0)
  const total = selectedRooms.reduce((sum, room) => sum + room.basePrice * Math.max(0, dateCount), 0)
  const ready = selectedRooms.length === requestedRooms && totalCapacity >= adults + children && dates.length > 0

  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  if (!hotel || !data) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy khách sạn" action={<Button asChild><Link to="/hotels">Về danh sách</Link></Button>} /></div>

  const isAvailable = (roomId: string) => dates.length > 0 && dates.every(date => (data.availability.find(item => item.roomId === roomId && item.date === date)?.available ?? 0) > 0)
  const toggle = (roomId: string) => setSelectedIds(current => current.includes(roomId) ? current.filter(value => value !== roomId) : current.length < requestedRooms ? [...current, roomId] : current)
  const checkoutSearch = new URLSearchParams({ hotelId: hotel.id, roomIds: selectedIds.join(','), checkIn, checkOut, rooms: String(selectedIds.length), adults: String(adults), children: String(children) })
  const point = hotel.lat !== undefined && hotel.lng !== undefined ? [{ lat: hotel.lat, lng: hotel.lng, label: hotel.name }] : []

  return <div className="container-app section-pad">
    <Link className="text-sm font-semibold text-[#1E3A5F] hover:underline" to={`/hotels?${params.toString()}`}>← Quay lại kết quả tìm kiếm</Link>
    <section className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <MediaGallery label={hotel.name} images={hotel.images} fallback={hotel.images?.[0] ?? hotel.image ?? travelImage(hotel.city)} />
      <div><div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[#1E3A5F]"><span>{hotel.stars} sao</span>{hotel.rating && <span className="inline-flex items-center gap-1 text-amber-600"><Star size={15} fill="currentColor" />{hotel.rating}</span>}</div><h1 className="mt-2 text-3xl font-semibold">{hotel.name}</h1><p className="mt-2 flex items-start gap-2 text-slate-500"><MapPin className="mt-1 shrink-0" size={17} />{hotel.address}</p><p className="mt-5 leading-7 text-slate-700">{hotel.description}</p><div className="mt-5 flex flex-wrap gap-2">{hotel.amenities.map(item => <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs text-[#1E3A5F]" key={item}>{item}</span>)}</div><p className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck className="shrink-0" size={18} /><span><strong>Chính sách hủy:</strong> {hotel.cancellationPolicy}</span></p></div>
    </section>

    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_auto]"><HotelDateRangePicker checkIn={checkIn} checkOut={checkOut} onChange={(nextCheckIn, nextCheckOut) => update({ checkIn: nextCheckIn, checkOut: nextCheckOut })} /><HotelGuestPicker adults={adults} children={children} rooms={requestedRooms} onChange={values => update({ adults: String(values.adults), children: String(values.children), rooms: String(values.rooms) })} /><div className="flex items-end"><Button className="w-full" onClick={() => setSelectedIds([])}>Kiểm tra lại phòng</Button></div></div>
    </section>

    <div className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div><PageHeader title="Chọn phòng vật lý" description={`Chọn đúng ${requestedRooms} phòng cho ${adults + children} khách · ${dateCount} đêm.`} /><div className="grid gap-4">{rooms.map(room => {
        const available = isAvailable(room.id)
        const selected = selectedIds.includes(room.id)
        return <Card key={room.id} className={`grid gap-4 overflow-hidden p-4 md:grid-cols-[12rem_1fr_auto] ${selected ? 'border-sky-400 ring-2 ring-sky-100' : ''}`}>
          <MediaGallery label={room.name} images={room.images} fallback={room.images?.[0] ?? room.image ?? roomImage(room.id)} className="md:max-w-48" />
          <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Phòng {room.roomNumber}</h2><StatusBadge status={available ? 'ACTIVE' : 'SUSPENDED'} /></div><p className="mt-1 font-medium text-slate-700">{room.name}</p><p className="mt-2 text-sm text-slate-500">{room.area} m² · {room.bed}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><UsersRound size={16} />Tối đa {room.capacity} khách</p><p className="mt-2 text-xs text-slate-500">{room.amenities.join(' · ')}</p></div>
          <div className="flex flex-col items-start justify-between gap-3 md:items-end"><p className="text-lg font-semibold text-[#1E3A5F]">{currency(room.basePrice)}<span className="block text-xs font-normal text-slate-500">mỗi đêm</span></p><Button disabled={!available || !selected && selectedIds.length >= requestedRooms} variant={selected ? 'secondary' : 'default'} onClick={() => toggle(room.id)}>{selected ? <><X size={16} />Bỏ chọn</> : <><Check size={16} />Chọn phòng</>}</Button></div>
        </Card>
      })}</div></div>
      <Card className="h-fit p-5 xl:sticky xl:top-24"><h2 className="text-lg font-semibold">Các phòng đã chọn</h2><p className="mt-1 text-sm text-slate-500">Một đơn duy nhất cho một khách sạn.</p><div className="mt-4 grid gap-3">{selectedRooms.length ? selectedRooms.map(room => <div key={room.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><strong>Phòng {room.roomNumber}</strong><p className="text-xs text-slate-500">{room.name} · {room.capacity} khách</p></div><span className="text-sm font-semibold">{currency(room.basePrice)}</span></div>) : <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Chưa chọn phòng.</p>}</div><dl className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm"><div className="flex justify-between"><dt>Số phòng</dt><dd className="font-semibold">{selectedRooms.length}/{requestedRooms}</dd></div><div className="flex justify-between"><dt>Tổng sức chứa</dt><dd className="font-semibold">{totalCapacity}/{adults + children} khách</dd></div><div className="flex justify-between"><dt>Số đêm</dt><dd className="font-semibold">{dateCount}</dd></div><div className="flex justify-between text-base"><dt>Tổng tiền</dt><dd className="font-bold text-[#1E3A5F]">{currency(total)}</dd></div></dl>{!ready && selectedRooms.length > 0 && <Feedback kind="error" message={selectedRooms.length !== requestedRooms ? `Vui lòng chọn đủ ${requestedRooms} phòng.` : 'Tổng sức chứa chưa đủ cho số khách.'} />}<Button asChild={ready} disabled={!ready} className="mt-5 w-full">{ready ? <Link to={`/booking/checkout?${checkoutSearch.toString()}`}>Tiếp tục đặt phòng</Link> : 'Chưa đủ điều kiện'}</Button></Card>
    </div>

    <section className="mt-12 grid gap-6 lg:grid-cols-2"><div><h2 className="mb-4 text-2xl font-semibold">Vị trí khách sạn</h2><GoogleMapView points={point} address={hotel.address} /></div><div><h2 className="mb-4 text-2xl font-semibold">Đánh giá khách hàng</h2><div className="grid gap-3">{data.reviews.filter(review => review.hotelId === hotel.id && review.status === 'VISIBLE').map(review => <Card key={review.id} className="p-5"><p className="font-semibold text-amber-600">{review.stars}/5 sao</p><p className="mt-2 text-sm text-slate-600">{review.content}</p></Card>)}</div></div></section>
  </div>
}
