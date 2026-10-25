import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MapPin, Search, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, DetailLink, EmptyState, ErrorState, Feedback, LoadingState, PageHeader, Picture } from '@/components/common'
import { repo } from '@/services'
import { currency, errorMessage, nights, todayPlus } from '@/lib/utils'
import { useSession } from '@/stores/session'
import { useCatalog } from '@/hooks/data'
import type { Destination, Hotel, Restaurant } from '@/types/domain'

const cardTitle = 'text-lg font-semibold text-slate-900'

function FavoriteButton({ id }: { id: string }) {
  const user = useSession(s => s.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const { data } = useQuery({ queryKey: ['tourist', user?.id], queryFn: () => repo.touristData(user?.id ?? ''), enabled: user?.role === 'tourist' })
  const saved = data?.favorites.includes(id) ?? false
  return <div className="flex items-center gap-2"><Button type="button" variant="secondary" size="sm" aria-label={saved ? 'Bỏ yêu thích' : 'Lưu yêu thích'} onClick={async () => {
    if (!user || user.role !== 'tourist') { navigate('/auth/login?returnTo=' + encodeURIComponent(location.pathname + location.search)); return }
    try { await repo.toggleFavorite(user.id, id); await queryClient.invalidateQueries({ queryKey: ['tourist', user.id] }); setMessage(saved ? 'Đã bỏ yêu thích' : 'Đã lưu yêu thích') } catch (error) { setMessage(errorMessage(error)) }
  }}><Heart size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Đã lưu' : 'Yêu thích'}</Button>{message && <span role="status" className="text-xs text-slate-500">{message}</span>}</div>
}

export function DestinationCard({ item }: { item: Destination }) { return <Card className="overflow-hidden"><Picture label={item.name} /><div className="p-5"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1E3A5F]">{item.category}</div><h3 className={cardTitle}>{item.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{item.region}, {item.city}</p><p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-600">{item.description}</p><div className="mt-4 flex items-center justify-between"><DetailLink to={'/explore/' + item.id} /><span className="text-sm font-medium">{item.price ? currency(item.price) : 'Miễn phí'}</span></div></div></Card> }
export function HotelCard({ item, price, search = '' }: { item: Hotel; price: number; search?: string }) { return <Card className="overflow-hidden"><Picture label={item.name} /><div className="p-5"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-[#1E3A5F]">{item.stars} sao</span>{item.rating && <span className="flex items-center gap-1 text-sm text-amber-700"><Star size={14} fill="currentColor" />{item.rating}</span>}</div><h3 className={cardTitle}>{item.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{item.area}, {item.city}</p><p className="mt-3 text-sm text-slate-600">{item.amenities.slice(0, 3).join(' · ')}</p><div className="mt-4 flex items-end justify-between gap-2"><DetailLink to={'/hotels/' + item.id + search} /><div className="text-right"><span className="text-xs text-slate-500">Từ / đêm</span><p className="font-semibold text-[#1E3A5F]">{currency(price)}</p></div></div></div></Card> }
export function RestaurantCard({ item }: { item: Restaurant }) { return <Card className="overflow-hidden"><Picture label={item.name} /><div className="p-5"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1E3A5F]">{item.cuisine}</div><h3 className={cardTitle}>{item.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{item.area}, {item.city}</p><p className="mt-3 text-sm text-slate-600">Giá tham khảo {currency(item.price)} · {item.openingHours}</p><div className="mt-4"><DetailLink to={'/restaurants/' + item.id} /></div></div></Card> }

export function HomePage() {
  const { data, isLoading, error } = useCatalog()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  return <>
    <section className="border-b border-slate-200 bg-[#F8FAFC]"><div className="container-app grid items-center gap-9 py-14 lg:grid-cols-[1.2fr_.8fr] lg:py-20"><div><span className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#1E3A5F]"><Sparkles size={14} />Lên kế hoạch du lịch theo sở thích</span><h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">Khám phá hành trình phù hợp với bạn</h1><p className="mt-5 max-w-xl text-lg leading-7 text-slate-600">Lên kế hoạch chuyến đi, khám phá điểm đến và nhận những gợi ý phù hợp với sở thích của bạn.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/explore">Khám phá điểm đến</Link></Button><Button asChild variant="secondary" size="lg"><Link to="/ai/trip-planner">Lập lịch trình với AI demo</Link></Button></div></div><div className="relative hidden lg:block"><div className="aspect-[5/4] rounded-2xl border border-slate-200 bg-[#DDEAEF] p-6 shadow-sm"><div className="flex h-full flex-col justify-between rounded-xl border border-white/70 bg-white/80 p-7"><div className="text-sm font-semibold uppercase tracking-widest text-[#44627F]">Đà Nẵng · 3 ngày 2 đêm</div><div><div className="mb-5 h-24 w-24 rounded-full bg-[#F4DDA7]" /><p className="text-3xl font-semibold text-[#1E3A5F]">Biển. Thành phố.<br />Một hành trình của riêng bạn.</p></div><div className="flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} />Mỹ Khê · Sơn Trà · Ngũ Hành Sơn</div></div></div></div></div></section>
    <section className="container-app -mt-1 py-8"><form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]" onSubmit={e => { e.preventDefault(); navigate('/explore?q=' + encodeURIComponent(search)) }}><label className="text-sm font-medium">Bạn muốn đi đâu?<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm điểm đến, ví dụ Đà Nẵng" /></label><Button className="self-end"><Search size={17} />Tìm kiếm</Button></form></section>
    {isLoading ? <LoadingState /> : error ? <div className="container-app"><ErrorState message={errorMessage(error)} /></div> : data && <>
      <section className="container-app section-pad"><div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-semibold">Điểm đến nổi bật</h2><p className="mt-1 text-slate-500">Bắt đầu từ những nơi được yêu thích tại Việt Nam.</p></div><DetailLink to="/explore">Xem tất cả</DetailLink></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.destinations.slice(0, 3).map(item => <DestinationCard key={item.id} item={item} />)}</div></section>
      <section className="bg-[#F8FAFC]"><div className="container-app section-pad"><div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-semibold">Nơi ở đáng cân nhắc</h2><p className="mt-1 text-slate-500">Tìm phòng phù hợp với lịch trình của bạn.</p></div><DetailLink to="/hotels">Tìm khách sạn</DetailLink></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.hotels.slice(0, 3).map(item => <HotelCard key={item.id} item={item} price={Math.min(...data.rooms.filter(r => r.hotelId === item.id).map(r => r.basePrice))} />)}</div></div></section>
      <section className="container-app section-pad"><div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-semibold">Ẩm thực địa phương</h2><p className="mt-1 text-slate-500">Một phần quan trọng của mỗi chuyến đi.</p></div><DetailLink to="/restaurants">Xem nhà hàng</DetailLink></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{data.restaurants.slice(0, 3).map(item => <RestaurantCard key={item.id} item={item} />)}</div></section>
      <section className="bg-[#EAF0F6]"><div className="container-app flex flex-wrap items-center justify-between gap-6 py-12"><div><h2 className="text-2xl font-semibold text-[#1E3A5F]">Lịch trình rõ ràng trong vài bước</h2><p className="mt-2 text-slate-600">Chọn điểm đến, ngày đi, ngân sách và sở thích. Công cụ demo sẽ sắp xếp các địa điểm có sẵn.</p></div><Button asChild><Link to="/ai/trip-planner">Bắt đầu lập lịch trình</Link></Button></div></section>
    </>}
  </>
}

export function ExplorePage() {
  const { data, isLoading, error } = useCatalog()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').toLowerCase()
  const city = params.get('city') ?? ''
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'name'
  const [keyword, setKeyword] = useState(params.get('q') ?? '')
  const items = useMemo(() => {
    const filtered = (data?.destinations ?? []).filter(x => (!q || (x.name + ' ' + x.city + ' ' + x.tags.join(' ')).toLowerCase().includes(q)) && (!city || x.city === city) && (!category || x.category === category))
    return filtered.sort((a, b) => sort === 'rating' ? (b.rating ?? 0) - (a.rating ?? 0) : a.name.localeCompare(b.name, 'vi'))
  }, [data, q, city, category, sort])
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  return <div className="container-app section-pad"><PageHeader title="Khám phá điểm đến" description="Tìm địa điểm theo khu vực và loại trải nghiệm." /><div className="mb-7 grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 md:grid-cols-[2fr_1fr_1fr_1fr]"><form onSubmit={e => { e.preventDefault(); update('q', keyword) }}><label className="text-sm font-medium">Từ khóa<input placeholder="Tên hoặc sở thích" value={keyword} onChange={e => setKeyword(e.target.value)} /></label></form><label className="text-sm font-medium">Thành phố<select value={city} onChange={e => update('city', e.target.value)}><option value="">Tất cả</option>{[...new Set(data?.destinations.map(x => x.city) ?? [])].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-medium">Loại hình<select value={category} onChange={e => update('category', e.target.value)}><option value="">Tất cả</option>{[...new Set(data?.destinations.map(x => x.category) ?? [])].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-medium">Sắp xếp<select value={sort} onChange={e => update('sort', e.target.value)}><option value="name">Tên A–Z</option><option value="rating">Đánh giá cao</option></select></label></div>{isLoading ? <LoadingState /> : error ? <ErrorState message={errorMessage(error)} /> : items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <DestinationCard key={item.id} item={item} />)}</div> : <EmptyState title="Không tìm thấy điểm đến" description="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." action={<Button variant="secondary" onClick={() => setParams({})}>Xóa bộ lọc</Button>} />}</div>
}
export function DestinationDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useCatalog()
  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  const item = data?.destinations.find(x => x.id === id)
  if (!item) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy địa điểm" action={<Button asChild><Link to="/explore">Về Khám phá</Link></Button>} /></div>
  return <div className="container-app section-pad"><Link className="text-sm text-[#1E3A5F] hover:underline" to="/explore">← Khám phá</Link><div className="mt-5 grid gap-8 lg:grid-cols-[1.2fr_.8fr]"><Picture label={item.name} className="rounded-xl" /><div><span className="text-sm font-semibold text-[#1E3A5F]">{item.category}</span><h1 className="mt-2 text-3xl font-semibold">{item.name}</h1><p className="mt-2 text-slate-500">{item.region}, {item.city}</p><p className="mt-6 leading-7 text-slate-700">{item.description}</p><dl className="mt-6 grid gap-3 text-sm"><div><dt className="font-semibold">Giờ hoạt động</dt><dd className="text-slate-600">{item.openingHours ?? 'Chưa có thông tin'}</dd></div><div><dt className="font-semibold">Giá tham khảo</dt><dd className="text-slate-600">{item.price ? currency(item.price) : 'Miễn phí'}</dd></div>{item.lat && <div><dt className="font-semibold">Tọa độ</dt><dd className="text-slate-600">{item.lat}, {item.lng}</dd></div>}</dl><div className="mt-7"><FavoriteButton id={item.id} /></div></div></div></div>
}

export function HotelsPage() {
  const { data, isLoading, error } = useCatalog()
  const [params, setParams] = useSearchParams()
  const [keyword, setKeyword] = useState(params.get('city') ?? '')
  const city = params.get('city') ?? ''
  const checkIn = params.get('checkIn') ?? todayPlus(7)
  const checkOut = params.get('checkOut') ?? todayPlus(9)
  const adults = Number(params.get('adults') ?? 2)
  const children = Number(params.get('children') ?? 0)
  const rooms = Number(params.get('rooms') ?? 1)
  const stars = Number(params.get('stars') ?? 0)
  const maxPrice = Number(params.get('maxPrice') ?? 0)
  const sort = params.get('sort') ?? 'recommended'
  const validDates = checkIn >= todayPlus(0) && nights(checkIn, checkOut) > 0
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  const items = useMemo(() => {
    if (!data) return []
    return data.hotels.map(hotel => {
      const hotelRooms = data.rooms.filter(r => r.hotelId === hotel.id && r.capacity * rooms >= adults + children)
      const availableRooms = hotelRooms.filter(room => !validDates || Array.from({ length: nights(checkIn, checkOut) }, (_, i) => {
        const date = new Date(checkIn + 'T12:00:00'); date.setDate(date.getDate() + i); return date.toISOString().slice(0, 10)
      }).every(date => (data.availability.find(a => a.roomId === room.id && a.date === date)?.available ?? 0) >= rooms))
      return { hotel, price: Math.min(...availableRooms.map(r => r.basePrice)), available: availableRooms.length > 0 }
    }).filter(x => x.hotel.city.toLowerCase().includes(city.toLowerCase()) && x.hotel.stars >= stars && x.available && (!maxPrice || x.price <= maxPrice))
      .sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : sort === 'rating' ? (b.hotel.rating ?? 0) - (a.hotel.rating ?? 0) : b.hotel.stars - a.hotel.stars)
  }, [data, city, checkIn, checkOut, adults, children, rooms, stars, maxPrice, sort, validDates])
  return <div className="container-app section-pad"><PageHeader title="Tìm khách sạn" description="So sánh phòng, giá tham khảo và khả dụng theo ngày." /><div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 md:grid-cols-3 lg:grid-cols-6"><form className="lg:col-span-2" onSubmit={e => { e.preventDefault(); update('city', keyword) }}><label className="text-sm font-medium">Điểm đến<input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Đà Nẵng, Đà Lạt..." /></label></form><label className="text-sm font-medium">Nhận phòng<input type="date" min={todayPlus(0)} value={checkIn} onChange={e => update('checkIn', e.target.value)} /></label><label className="text-sm font-medium">Trả phòng<input type="date" min={checkIn} value={checkOut} onChange={e => update('checkOut', e.target.value)} /></label><label className="text-sm font-medium">Người lớn<input type="number" min="1" max="12" value={adults} onChange={e => update('adults', e.target.value)} /></label><label className="text-sm font-medium">Số phòng<input type="number" min="1" max="5" value={rooms} onChange={e => update('rooms', e.target.value)} /></label><label className="text-sm font-medium">Trẻ em<input type="number" min="0" max="10" value={children} onChange={e => update('children', e.target.value)} /></label><label className="text-sm font-medium">Hạng sao<select value={stars} onChange={e => update('stars', e.target.value)}><option value="0">Tất cả</option><option value="3">Từ 3 sao</option><option value="4">Từ 4 sao</option></select></label><label className="text-sm font-medium">Giá tối đa / đêm<select value={maxPrice} onChange={e => update('maxPrice', e.target.value)}><option value="0">Không giới hạn</option><option value="1000000">1.000.000 ₫</option><option value="1500000">1.500.000 ₫</option><option value="2500000">2.500.000 ₫</option></select></label><label className="text-sm font-medium">Sắp xếp<select value={sort} onChange={e => update('sort', e.target.value)}><option value="recommended">Đề xuất</option><option value="price-asc">Giá thấp trước</option><option value="price-desc">Giá cao trước</option><option value="rating">Đánh giá cao</option></select></label><div className="flex items-end"><Button className="w-full" onClick={() => update('city', keyword)}><Search size={17} />Tìm phòng</Button></div></div>
    {!validDates ? <Feedback kind="error" message="Ngày trả phòng phải sau ngày nhận phòng và ngày nhận phòng không được ở quá khứ." /> : isLoading ? <LoadingState /> : error ? <ErrorState message={errorMessage(error)} /> : items.length ? <><p className="mb-4 text-sm text-slate-500">{items.length} khách sạn phù hợp</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ hotel, price }) => <HotelCard key={hotel.id} item={hotel} price={price} search={params.toString() ? '?' + params.toString() : ''} />)}</div></> : <EmptyState title="Không có khách sạn phù hợp" description="Thử đổi ngày lưu trú hoặc nới bộ lọc." action={<Button variant="secondary" onClick={() => setParams({})}>Đặt lại bộ lọc</Button>} />}</div>
}

export function HotelDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { data, isLoading, error } = useCatalog()
  const checkIn = params.get('checkIn') ?? todayPlus(7)
  const checkOut = params.get('checkOut') ?? todayPlus(9)
  const rooms = Number(params.get('rooms') ?? 1)
  const adults = Number(params.get('adults') ?? 2)
  const children = Number(params.get('children') ?? 0)
  const back = '/hotels' + (params.toString() ? '?' + params.toString() : '')
  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  const hotel = data?.hotels.find(x => x.id === id)
  if (!hotel || !data) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy khách sạn" action={<Button asChild><Link to="/hotels">Về danh sách</Link></Button>} /></div>
  const hotelRooms = data.rooms.filter(r => r.hotelId === id)
  const reviews = data.reviews.filter(r => r.hotelId === id && r.status === 'VISIBLE')
  return <div className="container-app section-pad"><Link className="text-sm text-[#1E3A5F] hover:underline" to={back}>← Quay lại kết quả tìm kiếm</Link><div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><Picture label={hotel.name} className="rounded-xl" /><div><div className="text-sm font-semibold text-[#1E3A5F]">{hotel.stars} sao · {hotel.rating ? 'Đánh giá ' + hotel.rating : 'Chưa có đánh giá'}</div><h1 className="mt-2 text-3xl font-semibold">{hotel.name}</h1><p className="mt-2 flex items-center gap-1 text-slate-500"><MapPin size={16} />{hotel.address}</p><p className="mt-5 leading-7 text-slate-700">{hotel.description}</p><div className="mt-5 flex flex-wrap gap-2">{hotel.amenities.map(x => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700" key={x}>{x}</span>)}</div><p className="mt-5 text-sm text-slate-600"><strong>Chính sách hủy:</strong> {hotel.cancellationPolicy}</p><div className="mt-5"><FavoriteButton id={hotel.id} /></div></div></div><div className="mt-12"><PageHeader title="Chọn loại phòng" description={'Lưu trú ' + checkIn + ' đến ' + checkOut + ' · ' + adults + ' người lớn, ' + children + ' trẻ em'} /><div className="grid gap-4">{hotelRooms.map(room => {
    const days = Array.from({ length: Math.max(0, nights(checkIn, checkOut)) }, (_, i) => { const date = new Date(checkIn + 'T12:00:00'); date.setDate(date.getDate() + i); return date.toISOString().slice(0, 10) })
    const available = days.length > 0 && days.every(date => (data.availability.find(a => a.roomId === room.id && a.date === date)?.available ?? 0) >= rooms)
    const capacity = room.capacity * rooms >= adults + children
    return <Card key={room.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]"><div><h3 className="text-lg font-semibold">{room.name}</h3><p className="mt-1 text-sm text-slate-500">{room.description}</p><p className="mt-2 text-sm text-slate-600">{room.area} m² · {room.bed} · Tối đa {room.capacity} khách/phòng</p><p className="mt-2 text-xs text-slate-500">{room.amenities.join(' · ')}</p></div><div className="flex flex-col items-start gap-2 md:items-end"><span className="text-lg font-semibold text-[#1E3A5F]">{currency(room.basePrice)} <span className="text-sm font-normal text-slate-500">/ đêm</span></span><span className={'text-xs ' + (available && capacity ? 'text-emerald-700' : 'text-red-700')}>{available && capacity ? 'Còn phòng' : capacity ? 'Hết phòng cho kỳ lưu trú' : 'Không đủ sức chứa'}</span><Button asChild={available && capacity} disabled={!available || !capacity} size="sm">{available && capacity ? <Link to={'/bookings/new?' + new URLSearchParams({ hotelId: hotel.id, roomId: room.id, checkIn, checkOut, rooms: String(rooms), adults: String(adults), children: String(children) })}>Chọn phòng</Link> : 'Không thể chọn'}</Button></div></Card>
  })}</div></div><div className="mt-12"><h2 className="mb-4 text-2xl font-semibold">Đánh giá khách hàng</h2>{reviews.length ? <div className="grid gap-3">{reviews.map(r => <Card key={r.id} className="p-5"><p className="font-semibold">{r.stars}/5 sao</p><p className="mt-2 text-sm text-slate-600">{r.content}</p></Card>)}</div> : <p className="text-sm text-slate-500">Chưa có đánh giá được công bố.</p>}</div></div>
}

export function RestaurantsPage() {
  const { data, isLoading, error } = useCatalog()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const city = params.get('city') ?? ''
  const max = Number(params.get('max') ?? 0)
  const [keyword, setKeyword] = useState(q)
  const items = (data?.restaurants ?? []).filter(x => (x.name + ' ' + x.cuisine + ' ' + x.area).toLowerCase().includes(q.toLowerCase()) && (!city || x.city === city) && (!max || x.price <= max))
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }
  return <div className="container-app section-pad"><PageHeader title="Tìm nhà hàng" description="Khám phá ẩm thực địa phương theo khu vực và mức giá." /><div className="mb-7 grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 md:grid-cols-3"><form onSubmit={e => { e.preventDefault(); update('q', keyword) }}><label className="text-sm font-medium">Tên hoặc món ăn<input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Mì Quảng, hải sản..." /></label></form><label className="text-sm font-medium">Thành phố<select value={city} onChange={e => update('city', e.target.value)}><option value="">Tất cả</option>{[...new Set(data?.restaurants.map(x => x.city) ?? [])].map(x => <option key={x}>{x}</option>)}</select></label><label className="text-sm font-medium">Giá tham khảo tối đa<select value={max} onChange={e => update('max', e.target.value)}><option value="0">Không giới hạn</option><option value="100000">100.000 ₫</option><option value="300000">300.000 ₫</option></select></label></div>{isLoading ? <LoadingState /> : error ? <ErrorState message={errorMessage(error)} /> : items.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(x => <RestaurantCard key={x.id} item={x} />)}</div> : <EmptyState title="Không tìm thấy nhà hàng" description="Thử từ khóa hoặc mức giá khác." />}</div>
}
export function RestaurantDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useCatalog()
  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>
  const item = data?.restaurants.find(x => x.id === id)
  if (!item) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy nhà hàng" /></div>
  return <div className="container-app section-pad"><Link className="text-sm text-[#1E3A5F] hover:underline" to="/restaurants">← Nhà hàng</Link><div className="mt-5 grid gap-8 lg:grid-cols-2"><Picture label={item.name} className="rounded-xl" /><div><span className="text-sm font-semibold text-[#1E3A5F]">{item.cuisine}</span><h1 className="mt-2 text-3xl font-semibold">{item.name}</h1><p className="mt-2 text-slate-500">{item.area}, {item.city}</p><p className="mt-6 leading-7">{item.description}</p><p className="mt-5 text-sm"><strong>Giờ mở cửa:</strong> {item.openingHours}</p><p className="mt-2 text-sm"><strong>Giá tham khảo:</strong> {currency(item.price)}</p><div className="mt-7"><FavoriteButton id={item.id} /></div></div></div></div>
}
