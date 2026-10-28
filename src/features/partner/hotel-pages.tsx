import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Eye, Pencil, Plus, Search, ShieldCheck, Trash2, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, MediaGallery, Picture, StatusBadge } from '@/components/common'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { usePartnerData } from '@/hooks/data'
import { useSession } from '@/stores/session'
import { repo } from '@/services'
import { currency, day, errorMessage, todayPlus } from '@/lib/utils'
import { cancellationPolicyText, cancellationRules } from '@/lib/booking'
import { bookingUsesRoom } from '@/lib/rooms'
import { roomImage, travelImage } from '@/lib/travel-images'
import type { Hotel, RoomType } from '@/types/domain'
import { AdminPageHeader, DataTable, DetailSection, InfoItem, LoadingSkeleton } from '@/features/admin/admin-ui'
import { GoogleMapPicker } from '@/components/google-map'
import { ImageManager } from '@/components/image-manager'
import { usePartnerHotel } from '@/stores/partner-hotel'

function AmenityPicker({ options, value, onChange, label = 'Chọn tiện nghi' }: { options: string[]; value: string[]; onChange: (value: string[]) => void; label?: string }) {
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter(selected => selected !== item) : [...value, item])
  return <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">{label}</legend>{options.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{options.map(item => <button key={item} type="button" aria-pressed={value.includes(item)} onClick={() => toggle(item)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm ${value.includes(item) ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`}><Wifi size={16} /><span>{item}</span>{value.includes(item) && <Check className="ml-auto" size={16} />}</button>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Danh mục chưa có tiện nghi. <Link className="font-semibold text-emerald-700" to="/partner/amenities">Thêm tiện nghi trước</Link>.</p>}</fieldset>
}

export function PartnerHotelPage() {
  const { data, isLoading, error } = usePartnerData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  if (!data.hotels.length) return <EmptyState title="Bạn chưa có khách sạn" description="Một chủ khách sạn có thể đăng ký và quản lý nhiều khách sạn." action={<Button asChild><Link to="/partner/hotel/register">Thêm khách sạn</Link></Button>} />
  return <div>
    <AdminPageHeader eyebrow="Chủ khách sạn" title="Danh sách khách sạn" description={`Bạn đang quản lý ${data.hotels.length} khách sạn.`} actions={<Button asChild><Link to="/partner/hotel/register"><Plus size={16} />Thêm khách sạn</Link></Button>} />
    <DataTable total={data.hotels.length} emptyTitle="Chưa có khách sạn"><table><thead><tr><th>Ảnh đại diện</th><th>Khách sạn</th><th>Hạng</th><th>Phòng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{data.hotels.map(hotel => {
      const roomCount = data.rooms.filter(room => room.hotelId === hotel.id).length
      return <tr key={hotel.id}><td><Picture label={`Ảnh đại diện ${hotel.name}`} src={hotel.images?.[0] ?? hotel.image ?? travelImage(hotel.id)} className="h-16 w-24 rounded-lg" /></td><td><strong className="text-[#1E3A5F]">{hotel.name}</strong><span className="mt-1 block max-w-sm text-xs text-slate-500">{hotel.address}</span></td><td>{hotel.stars} sao</td><td>{roomCount} phòng</td><td><StatusBadge status={hotel.suspended ? 'SUSPENDED' : hotel.approvalStatus ?? 'PENDING'} /></td><td><div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link to={`/partner/hotel/${hotel.id}/edit`}>Chỉnh sửa</Link></Button><Button asChild size="sm" variant="secondary"><Link to={`/partner/rooms?hotelId=${hotel.id}`}>Quản lý phòng</Link></Button></div></td></tr>
    })}</tbody></table></DataTable>
  </div>
}

export function PartnerHotelFormPage() {
  const { id } = useParams()
  const { data, isLoading, error } = usePartnerData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const saved = id ? data.hotels.find(hotel => hotel.id === id) : undefined
  if (id && !saved) return <EmptyState title="Không tìm thấy khách sạn hoặc bạn không có quyền truy cập" />
  return <PartnerHotelEditor saved={saved} amenityCatalog={data.partner?.amenities ?? []} />
}

function PartnerHotelEditor({ saved, amenityCatalog }: { saved?: Hotel; amenityCatalog: string[] }) {
  const user = useSession(state => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [amenities, setAmenities] = useState<string[]>(saved?.amenities ?? amenityCatalog.filter(item => ['Wi-Fi', 'Bãi đỗ xe'].includes(item)))
  const [images, setImages] = useState(saved?.images ?? (saved?.image ? [saved.image] : ['/images/da-nang-coast.webp']))
  const [form, setForm] = useState<Omit<Hotel, 'partnerId'>>(() => saved ? { ...saved } : { id: '', name: '', description: '', city: '', area: '', address: '', stars: 3, rating: undefined, amenities: [], images: ['/images/da-nang-coast.webp'], image: '/images/da-nang-coast.webp', cancellationPolicy: 'Hủy trước ít nhất 24 giờ: hoàn 100%; hủy trước ít nhất 0 giờ: hoàn 50%.', cancellationTerms: { freeUntilHours: 24, lateFeeRate: 0.5, checkInHour: 14, rules: [{ hoursBeforeCheckIn: 24, refundRate: 1 }, { hoursBeforeCheckIn: 0, refundRate: 0.5 }] }, approvalStatus: 'NEEDS_INFO', registeredAt: undefined })
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current => ({ ...current, [key]: value }))
  const save = async (submit: boolean) => { setBusy(true); setMessage(''); try { await repo.savePartnerHotel(user?.id ?? '', { ...form, image: images[0], images, amenities }, submit); await queryClient.invalidateQueries({ queryKey: ['partner'] }); await queryClient.invalidateQueries({ queryKey: ['admin'] }); navigate('/partner/hotel') } catch (cause) { setMessage(errorMessage(cause)) } finally { setBusy(false) } }
  return <div>
    <Link className="text-sm font-semibold text-emerald-700" to="/partner/hotel">← Hồ sơ khách sạn</Link>
    <div className="mt-5"><AdminPageHeader title={saved ? 'Chỉnh sửa khách sạn' : 'Thêm khách sạn'} description={saved ? 'Thay đổi quan trọng có thể cần Admin phê duyệt lại.' : 'Một chủ khách sạn có thể quản lý nhiều khách sạn.'} /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Tên khách sạn *"><input required value={form.name} onChange={event => set('name', event.target.value)} /></FormField><FormField label="Hạng sao"><select value={form.stars} onChange={event => set('stars', Number(event.target.value))}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value} sao</option>)}</select></FormField><FormField label="Tỉnh/thành *"><input required value={form.city} onChange={event => set('city', event.target.value)} /></FormField><FormField label="Khu vực *"><input required value={form.area} onChange={event => set('area', event.target.value)} /></FormField></div><div className="mt-4 grid gap-4"><FormField label="Địa chỉ *"><input required value={form.address} onChange={event => set('address', event.target.value)} /></FormField><GoogleMapPicker address={form.address || `${form.area}, ${form.city}`} value={form.lat !== undefined && form.lng !== undefined ? { lat: form.lat, lng: form.lng } : undefined} onChange={location => setForm(current => ({ ...current, lat: location.lat, lng: location.lng, address: location.address ?? current.address }))} /><FormField label="Mô tả"><textarea value={form.description} onChange={event => set('description', event.target.value)} /></FormField><AmenityPicker options={amenityCatalog} value={amenities} onChange={setAmenities} label="Tiện nghi khách sạn" /><ImageManager label={form.name || 'khách sạn'} images={images} onChange={setImages} /></div><Feedback message={message} kind="error" /><div className="mt-6 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => save(false)}>Lưu thông tin</Button><Button disabled={busy} variant="secondary" onClick={() => save(true)}>{saved?.approvalStatus === 'REJECTED' ? 'Gửi lại yêu cầu duyệt' : 'Gửi đăng ký duyệt'}</Button><Button asChild variant="ghost"><Link to="/partner/hotel">Hủy</Link></Button></div></Card>
      <Card className="h-fit overflow-hidden"><MediaGallery label={form.name || 'khách sạn'} images={images} /><div className="p-5"><h2 className="font-semibold">Quy trình phê duyệt</h2><ol className="mt-3 grid gap-3 text-sm text-slate-600"><li>1. Chọn đúng vị trí trên Google Maps.</li><li>2. Thêm đầy đủ album ảnh.</li><li>3. Lưu và gửi hồ sơ để Admin kiểm tra.</li><li>4. Sau khi duyệt mới nhận được đơn.</li></ol></div></Card>
    </div>
  </div>
}

export function PartnerRoomsModernPage() {
  const { data, isLoading, error } = usePartnerData()
  const [params] = useSearchParams()
  const activeHotelId = usePartnerHotel(state => state.hotelId)
  const setActiveHotelId = usePartnerHotel(state => state.setHotelId)
  const user = useSession(state => state.user)
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayPlus(0))
  const [search, setSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [target, setTarget] = useState('')
  const [message, setMessage] = useState('')
  const requestedHotelId = params.get('hotelId')
  useEffect(() => { if (requestedHotelId && data?.hotels.some(item => item.id === requestedHotelId)) setActiveHotelId(requestedHotelId) }, [data, requestedHotelId, setActiveHotelId])
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const selectedHotelId = activeHotelId || requestedHotelId || ''
  const hotel = data.hotels.find(item => item.id === selectedHotelId) ?? data.hotels[0]
  const rooms = selectedHotelId ? data.rooms.filter(room => room.hotelId === selectedHotelId) : data.rooms
  if (!hotel) return <EmptyState title="Chưa có khách sạn" action={<Button asChild><Link to="/partner/hotel/register">Đăng ký khách sạn</Link></Button>} />
  const occupiedIds = new Set(data.bookings.filter(booking => ['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED'].includes(booking.status) && booking.checkIn <= date && date < booking.checkOut).flatMap(booking => booking.roomItems?.map(item => item.roomId) ?? booking.roomIds ?? [booking.roomId]))
  const roomTypes = [...new Set(data.rooms.map(room => room.roomType || room.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const normalizedSearch = search.trim().toLocaleLowerCase('vi')
  const filteredRooms = rooms.filter(room => {
    const hotelName = data.hotels.find(item => item.id === room.hotelId)?.name ?? ''
    const matchesSearch = !normalizedSearch || [room.roomNumber, room.name, room.roomType, room.id, hotelName].some(value => value?.toLocaleLowerCase('vi').includes(normalizedSearch))
    const matchesRoomType = !roomTypeFilter || (room.roomType || room.name) === roomTypeFilter
    const matchesStatus = !statusFilter || (statusFilter === 'active' ? room.active !== false : room.active === false)
    const matchesAvailability = !availabilityFilter || (availabilityFilter === 'available' ? room.active !== false && !occupiedIds.has(room.id) : occupiedIds.has(room.id))
    return matchesSearch && matchesRoomType && matchesStatus && matchesAvailability
  })
  const targetRoom = rooms.find(room => room.id === target)
  return <div>
    <AdminPageHeader eyebrow="Quản lý khách sạn" title="Phòng khách sạn" description="Quản lý từng phòng vật lý; mỗi phòng chỉ mở hoặc đóng bán theo ngày." actions={<Button asChild><Link to="/partner/rooms/new"><Plus size={16} />Thêm phòng</Link></Button>} />
    <Card className="mb-5 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FormField label="Tìm kiếm phòng"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Số phòng, tên hoặc mã phòng" /></div></FormField>
        <FormField label="Khách sạn"><select value={selectedHotelId} onChange={event => setActiveHotelId(event.target.value)}><option value="">Tất cả khách sạn</option>{data.hotels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Loại phòng"><select value={roomTypeFilter} onChange={event => setRoomTypeFilter(event.target.value)}><option value="">Tất cả loại phòng</option>{roomTypes.map(item => <option key={item} value={item}>{item}</option>)}</select></FormField>
        <FormField label="Trạng thái"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Bảo trì/ngừng dùng</option></select></FormField>
        <FormField label="Tình trạng theo ngày"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input type="date" value={date} onChange={event => setDate(event.target.value)} /><select aria-label="Tình trạng phòng theo ngày" value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)}><option value="">Tất cả</option><option value="available">Còn trống</option><option value="occupied">Đã đặt</option></select></div></FormField>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-sm text-slate-500">Hiển thị <strong className="text-slate-800">{filteredRooms.length}</strong>/{rooms.length} phòng</p><Button type="button" size="sm" variant="ghost" onClick={() => { setSearch(''); setRoomTypeFilter(''); setStatusFilter(''); setAvailabilityFilter(''); setDate(todayPlus(0)) }}>Xóa bộ lọc</Button></div>
    </Card>
    <DataTable total={filteredRooms.length} emptyTitle={rooms.length ? 'Không tìm thấy phòng phù hợp' : 'Chưa có phòng'}><table><thead><tr><th>Phòng</th><th>Ảnh</th><th>Loại phòng</th><th>Giá/đêm</th><th>Sức chứa</th><th>Diện tích</th><th>Trạng thái</th><th>Ngày đã chọn</th><th>Thao tác</th></tr></thead><tbody>{filteredRooms.map(room => <tr key={room.id}><td><strong>Phòng {room.roomNumber}</strong><span className="block text-xs text-slate-500">{room.name} · {data.hotels.find(item => item.id === room.hotelId)?.name} · {room.id}</span></td><td><Picture label={room.name} src={room.images?.[0] ?? room.image ?? roomImage(room.id)} className="h-14 w-20 rounded-lg" /></td><td>{room.roomType || room.name}</td><td>{currency(room.basePrice)}</td><td>{room.capacity} khách</td><td>{room.area} m²</td><td><StatusBadge status={room.active === false ? 'SUSPENDED' : 'ACTIVE'} /></td><td>{occupiedIds.has(room.id) ? <span className="text-amber-700">Đã được đặt</span> : <span className="text-emerald-700">Còn trống</span>}</td><td><div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="secondary"><Link to={`/partner/rooms/${room.id}`}><Eye size={15} />Xem</Link></Button><Button asChild size="sm" variant="ghost"><Link to={`/partner/rooms/${room.id}/edit`}>Sửa</Link></Button><Button size="sm" variant="ghost" onClick={() => setTarget(room.id)}>{room.active === false ? 'Mở lại' : 'Ngừng dùng'}</Button></div></td></tr>)}</tbody></table></DataTable>
    <div className="mt-4"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div>
    <Dialog open={Boolean(targetRoom)} onOpenChange={open => !open && setTarget('')}><DialogContent title={targetRoom?.active === false ? 'Mở lại phòng?' : 'Ngừng sử dụng phòng?'} description={targetRoom ? `Phòng ${targetRoom.roomNumber}. Các đơn đã xác nhận vẫn được giữ nguyên.` : ''}><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTarget('')}>Hủy</Button><Button variant={targetRoom?.active === false ? 'default' : 'danger'} onClick={async () => { if (!targetRoom) return; try { await repo.toggleRoomActive(user?.id ?? '', targetRoom.id); await queryClient.invalidateQueries({ queryKey: ['partner'] }); setTarget(''); setMessage(targetRoom.active === false ? 'Đã mở lại phòng.' : 'Đã ngừng sử dụng phòng.') } catch (cause) { setMessage(errorMessage(cause)) } }}>Xác nhận</Button></div></DialogContent></Dialog>
  </div>
}

export function PartnerRoomModernFormPage() {
  const { id } = useParams()
  const activeHotelId = usePartnerHotel(state => state.hotelId)
  const { data, isLoading, error } = usePartnerData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const saved = data.rooms.find(room => room.id === id)
  if (id && !saved) return <EmptyState title="Không tìm thấy phòng hoặc bạn không có quyền truy cập" />
  if (!data.hotels[0]) return <EmptyState title="Chưa có khách sạn" />
  return <RoomEditor key={id ?? 'new'} saved={saved} hotels={data.hotels} defaultHotelId={activeHotelId} amenityCatalog={data.partner?.amenities ?? []} />
}

function RoomEditor({ saved, hotels, defaultHotelId, amenityCatalog }: { saved?: RoomType; hotels: Hotel[]; defaultHotelId?: string; amenityCatalog: string[] }) {
  const user = useSession(state => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [amenities, setAmenities] = useState<string[]>(saved?.amenities ?? amenityCatalog.filter(item => ['Wi-Fi', 'TV', 'Điều hòa'].includes(item)))
  const [images, setImages] = useState(saved?.images ?? (saved?.image ? [saved.image] : ['/images/room-deluxe.png']))
  const [form, setForm] = useState<RoomType>(() => saved ? { ...saved, roomType: saved.roomType || saved.name } : { id: '', hotelId: hotels.some(hotel => hotel.id === defaultHotelId) ? defaultHotelId! : hotels[0]!.id, roomNumber: '', name: '', roomType: '', description: '', capacity: 2, area: 25, bed: '1 giường đôi', basePrice: 1000000, amenities: [], active: true, images: ['/images/room-deluxe.png'] })
  const set = <K extends keyof RoomType>(key: K, value: RoomType[K]) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await repo.saveRoom(user?.id ?? '', { ...form, image: images[0], images, amenities })
      await queryClient.invalidateQueries({ queryKey: ['partner'] })
      await queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/partner/rooms')
    } catch (cause) { setMessage(errorMessage(cause)) } finally { setBusy(false) }
  }
  return <div>
    <Link className="text-sm font-semibold text-emerald-700" to="/partner/rooms">← Danh sách phòng</Link>
    <div className="mt-5"><AdminPageHeader title={saved ? `Chỉnh sửa phòng ${saved.roomNumber}` : 'Thêm phòng vật lý'} description="Phòng mới sử dụng giá cơ bản và sẵn sàng nhận đặt sau khi lưu." /></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <Card className="p-5 sm:p-6"><form className="grid gap-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Khách sạn *"><select value={form.hotelId} disabled={Boolean(saved)} onChange={event => set('hotelId', event.target.value)}>{hotels.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}</select></FormField><FormField label="Số phòng *"><input required value={form.roomNumber ?? ''} onChange={event => set('roomNumber', event.target.value)} placeholder="201 hoặc A-201" /></FormField><FormField label="Tên hiển thị *"><input required value={form.name} onChange={event => set('name', event.target.value)} placeholder="Phòng Deluxe hướng biển" /></FormField><FormField label="Loại phòng *"><input required value={form.roomType ?? ''} onChange={event => set('roomType', event.target.value)} placeholder="Deluxe, Suite, Phòng đôi..." /></FormField><FormField label="Giá mỗi đêm (VND) *"><input required type="number" min="1" value={form.basePrice} onChange={event => set('basePrice', Number(event.target.value))} /></FormField><FormField label="Sức chứa tối đa *"><input required type="number" min="1" value={form.capacity} onChange={event => set('capacity', Number(event.target.value))} /></FormField><FormField label="Diện tích (m²)"><input type="number" min="1" value={form.area} onChange={event => set('area', Number(event.target.value))} /></FormField><FormField label="Loại giường"><input value={form.bed} onChange={event => set('bed', event.target.value)} /></FormField></div><FormField label="Mô tả"><textarea value={form.description} onChange={event => set('description', event.target.value)} /></FormField><AmenityPicker options={amenityCatalog} value={amenities} onChange={setAmenities} label="Tiện nghi phòng" /><ImageManager label={form.name || 'phòng'} images={images} onChange={setImages} /><Feedback message={message} kind="error" /><div className="flex gap-3"><Button disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu phòng'}</Button><Button asChild variant="secondary"><Link to="/partner/rooms">Hủy</Link></Button></div></form></Card>
      <Card className="h-fit overflow-hidden"><MediaGallery label={form.name || 'phòng'} images={images} /><div className="p-5"><strong>{hotels.find(hotel => hotel.id === form.hotelId)?.name}</strong><p className="mt-1 text-sm text-slate-500">Phòng {form.roomNumber || '—'} · {currency(form.basePrice)}/đêm · {form.capacity} khách</p></div></Card>
    </div>
  </div>
}

export function PartnerRoomDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = usePartnerData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const room = data.rooms.find(item => item.id === id)
  if (!room) return <EmptyState title="Không tìm thấy phòng hoặc bạn không có quyền truy cập" />
  const bookings = data.bookings.filter(booking => bookingUsesRoom(booking, room.id))
  return <div>
    <Link className="text-sm font-semibold text-emerald-700" to="/partner/rooms">← Danh sách phòng</Link>
    <div className="mt-5"><AdminPageHeader title={`Phòng ${room.roomNumber}`} description={room.name} actions={<div className="flex flex-wrap gap-2"><StatusBadge status={room.active === false ? 'SUSPENDED' : 'ACTIVE'} /><Button asChild size="sm" variant="secondary"><Link to={`/partner/rooms/${room.id}/edit`}>Chỉnh sửa</Link></Button></div>} /></div>
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="h-fit overflow-hidden"><MediaGallery label={room.name} images={room.images} fallback={room.image ?? roomImage(room.id)} /><div className="p-5"><p className="text-2xl font-bold text-emerald-700">{currency(room.basePrice)}</p><p className="text-sm text-slate-500">mỗi đêm</p></div></Card>
      <div className="grid gap-5"><DetailSection title="Thông tin phòng"><dl className="grid gap-5 sm:grid-cols-2"><InfoItem label="Mã phòng">{room.id}</InfoItem><InfoItem label="Số phòng">{room.roomNumber}</InfoItem><InfoItem label="Loại phòng">{room.roomType || room.name}</InfoItem><InfoItem label="Sức chứa">{room.capacity} khách</InfoItem><InfoItem label="Diện tích">{room.area} m²</InfoItem><InfoItem label="Loại giường">{room.bed}</InfoItem><InfoItem label="Trạng thái">{room.active === false ? 'Ngừng sử dụng' : 'Hoạt động'}</InfoItem></dl><p className="mt-5 text-sm text-slate-600">{room.description}</p><div className="mt-4 flex flex-wrap gap-2">{room.amenities.map(item => <span key={item} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">{item}</span>)}</div></DetailSection><DetailSection title="Lượt đặt phòng"><div className="table-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Nhận phòng</th><th>Trả phòng</th><th>Đơn giá đã lưu</th><th>Trạng thái</th></tr></thead><tbody>{bookings.map(booking => { const item = booking.roomItems?.find(value => value.roomId === room.id); return <tr key={booking.id}><td><Link className="font-semibold text-emerald-700" to={`/partner/bookings/${booking.id}`}>{booking.id}</Link></td><td>{booking.guestName}</td><td>{day(booking.checkIn)}</td><td>{day(booking.checkOut)}</td><td>{currency(item?.nightlyPrice ?? booking.nightlyPrices[0] ?? room.basePrice)}</td><td><StatusBadge status={booking.status} /></td></tr> })}</tbody></table></div></DetailSection></div>
    </div>
  </div>
}

export function PartnerAmenitiesPage() {
  const { data, isLoading, error } = usePartnerData()
  const user = useSession(state => state.user)
  const queryClient = useQueryClient()
  const [newAmenity, setNewAmenity] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState('')
  const [editValue, setEditValue] = useState('')
  const [deleting, setDeleting] = useState('')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const amenityCatalog = data.partner?.amenities ?? []
  const normalizedSearch = search.trim().toLocaleLowerCase('vi')
  const filteredAmenities = amenityCatalog.filter(item => !normalizedSearch || item.toLocaleLowerCase('vi').includes(normalizedSearch))
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['partner'] })
    await queryClient.invalidateQueries({ queryKey: ['catalog'] })
  }
  const addAmenity = async (event: FormEvent) => {
    event.preventDefault()
    setWorking(true)
    setMessage('')
    try {
      await repo.addPartnerAmenity(user?.id ?? '', newAmenity)
      await refresh()
      setNewAmenity('')
      setMessage('Đã thêm tiện nghi.')
    } catch (cause) { setMessage(errorMessage(cause)) } finally { setWorking(false) }
  }
  return <div>
    <AdminPageHeader eyebrow="Quản lý khách sạn" title="Tiện nghi" />
    <Card className="mb-5 p-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end"><form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addAmenity}><div className="w-full max-w-md"><FormField label="Tên tiện nghi mới"><input required minLength={2} maxLength={50} value={newAmenity} onChange={event => setNewAmenity(event.target.value)} placeholder="Ví dụ: Phòng gym, xe đưa đón sân bay..." /></FormField></div><Button disabled={working}><Plus size={16} />{working ? 'Đang thêm...' : 'Thêm tiện nghi'}</Button></form><FormField label="Tìm kiếm tiện nghi"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="pl-10" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nhập tên tiện nghi..." /></div></FormField></div><div className="mt-3"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div></Card>
    <DataTable total={filteredAmenities.length} emptyTitle={amenityCatalog.length ? 'Không tìm thấy tiện nghi phù hợp' : 'Chưa có tiện nghi'}><table><thead><tr><th>Tên tiện nghi</th><th className="w-52">Thao tác</th></tr></thead><tbody>{filteredAmenities.map(item => <tr key={item}><td><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Wifi size={17} /></span><strong>{item}</strong></div></td><td><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(item); setEditValue(item); setMessage('') }}><Pencil size={15} />Sửa</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setDeleting(item); setMessage('') }}><Trash2 size={15} />Xóa</Button></div></td></tr>)}</tbody></table></DataTable>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !working) setEditing('') }}><DialogContent title="Sửa tiện nghi" description={`Đổi tên “${editing}” trong toàn bộ khách sạn và phòng đang sử dụng.`}><form className="grid gap-4" onSubmit={async event => { event.preventDefault(); setWorking(true); setMessage(''); try { await repo.updatePartnerAmenity(user?.id ?? '', editing, editValue); await refresh(); setEditing(''); setMessage('Đã cập nhật tiện nghi.') } catch (cause) { setMessage(errorMessage(cause)) } finally { setWorking(false) } }}><FormField label="Tên tiện nghi"><input required minLength={2} maxLength={50} value={editValue} onChange={event => setEditValue(event.target.value)} /></FormField><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => setEditing('')}>Hủy</Button><Button disabled={working}>{working ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></div></form></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !working) setDeleting('') }}><DialogContent title="Xóa tiện nghi?" description={`Tiện nghi “${deleting}” sẽ bị xóa khỏi danh mục và khỏi các khách sạn, phòng đang sử dụng.`}><div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={working} onClick={() => setDeleting('')}>Hủy</Button><Button type="button" variant="danger" disabled={working} onClick={async () => { setWorking(true); setMessage(''); try { await repo.deletePartnerAmenity(user?.id ?? '', deleting); await refresh(); setDeleting(''); setMessage('Đã xóa tiện nghi.') } catch (cause) { setMessage(errorMessage(cause)) } finally { setWorking(false) } }}>{working ? 'Đang xóa...' : 'Xóa tiện nghi'}</Button></div></DialogContent></Dialog>
  </div>
}

export function PartnerCancellationPolicyPage() {
  const { data, isLoading, error } = usePartnerData()
  const activeHotelId = usePartnerHotel(state => state.hotelId)
  const setActiveHotelId = usePartnerHotel(state => state.setHotelId)
  const user = useSession(state => state.user)
  const queryClient = useQueryClient()
  const hotel = data?.hotels.find(item => item.id === activeHotelId) ?? data?.hotels[0]
  const [draft, setDraft] = useState<ReturnType<typeof cancellationRules> | null>(null)
  const [message, setMessage] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !hotel) return <EmptyState title="Chưa có khách sạn" />
  const currentRules = draft ?? cancellationRules(hotel.cancellationTerms)
  const preview = cancellationPolicyText(currentRules)
  const updateRule = (index: number, field: 'hoursBeforeCheckIn' | 'refundRate', value: number) => setDraft(currentRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [field]: value } : rule))
  const addRule = () => {
    const nextHours = Math.max(...currentRules.map(rule => rule.hoursBeforeCheckIn), 0) + 24
    setDraft([...currentRules, { hoursBeforeCheckIn: nextHours, refundRate: 1 }])
  }
  const removeRule = (index: number) => setDraft(currentRules.filter((_, ruleIndex) => ruleIndex !== index))
  return <div>
    <AdminPageHeader eyebrow="Quản lý khách sạn" title="Chính sách hủy" description="Một chính sách có thể gồm nhiều mốc hoàn tiền. Booking đã phát sinh tiếp tục dùng bản chụp điều khoản tại thời điểm đặt." />
    <div className="mb-5 max-w-sm"><FormField label="Khách sạn"><select value={hotel.id} onChange={event => { setActiveHotelId(event.target.value); setDraft(null); setMessage('') }}>{data?.hotels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="p-5 sm:p-6">
        <form onSubmit={async event => { event.preventDefault(); try { await repo.saveCancellationPolicy(user?.id ?? '', preview, currentRules, hotel.id); await queryClient.invalidateQueries({ queryKey: ['partner'] }); setDraft(null); setMessage('Đã cập nhật chính sách hủy.') } catch (cause) { setMessage(errorMessage(cause)) } }}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Các điều khoản hoàn tiền</h2><p className="mt-1 text-sm text-slate-500">Hệ thống chọn mốc cao nhất mà thời gian hủy đáp ứng.</p></div><Button type="button" variant="secondary" size="sm" onClick={addRule}><Plus size={16} />Thêm điều khoản</Button></div>
          <div className="mt-5 grid gap-3">{currentRules.map((rule, index) => <div key={index} className="grid items-end gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_1fr_auto]"><FormField label={`Hủy trước ít nhất (giờ) · khoản ${index + 1}`}><input type="number" min="0" step="1" required value={rule.hoursBeforeCheckIn} onChange={event => updateRule(index, 'hoursBeforeCheckIn', Number(event.target.value))} /></FormField><FormField label={`Tỷ lệ hoàn (%) · khoản ${index + 1}`}><input type="number" min="0" max="100" step="1" required value={Math.round(rule.refundRate * 100)} onChange={event => updateRule(index, 'refundRate', Number(event.target.value) / 100)} /></FormField><Button type="button" variant="ghost" size="sm" disabled={currentRules.length === 1} onClick={() => removeRule(index)} aria-label={`Xóa điều khoản ${index + 1}`}><Trash2 size={17} /></Button></div>)}</div>
          <p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900"><strong>Quy tắc:</strong> các mốc giờ không được trùng nhau; tỷ lệ hoàn từ 0% đến 100%. Nếu không có mốc phù hợp, khách không được hoàn tiền.</p>
          <div className="mt-4"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div>
          <Button className="mt-5 w-fit">Lưu chính sách</Button>
        </form>
      </Card>
      <Card className="h-fit p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={21} /></span><div><h2 className="font-semibold">Xem trước chính sách</h2><StatusBadge status="ACTIVE" /></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{preview}</p><div className="mt-5 grid gap-2">{[...currentRules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn).map((rule, index) => <div key={`${rule.hoursBeforeCheckIn}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span>Trước ≥ {rule.hoursBeforeCheckIn} giờ</span><strong className="text-emerald-700">Hoàn {Math.round(rule.refundRate * 100)}%</strong></div>)}</div></Card>
    </div>
  </div>
}

export function PartnerMediaPage() {
  const { data, isLoading, error } = usePartnerData()
  const [filter, setFilter] = useState('')
  const [preview, setPreview] = useState<{ label: string; src?: string }>()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = [
    ...data.hotels.flatMap(hotel => (hotel.images?.length ? hotel.images : [hotel.images?.[0] ?? hotel.image ?? travelImage(hotel.id)]).map((src, index) => ({ id: `hotel-${hotel.id}-${index}`, label: `${hotel.name} · Ảnh ${index + 1}`, src, type: 'hotel', roomId: '', hotelId: hotel.id }))),
    ...data.rooms.flatMap(room => (room.images?.length ? room.images : [room.images?.[0] ?? room.image ?? roomImage(room.id)]).map((src, index) => ({ id: `room-${room.id}-${index}`, label: `Phòng ${room.roomNumber} · ${room.name} · Ảnh ${index + 1}`, src, type: 'room', roomId: room.id, hotelId: room.hotelId }))),
  ].filter(item => !filter || item.type === filter)
  return <div><AdminPageHeader eyebrow="Quản lý khách sạn" title="Thư viện hình ảnh" description={`Quản lý ${items.length} ảnh thuộc các khách sạn và phòng của bạn.`} /><div className="mb-5 flex flex-wrap gap-2"><Button size="sm" variant={!filter ? 'default' : 'secondary'} onClick={() => setFilter('')}>Tất cả</Button><Button size="sm" variant={filter === 'hotel' ? 'default' : 'secondary'} onClick={() => setFilter('hotel')}>Ảnh khách sạn</Button><Button size="sm" variant={filter === 'room' ? 'default' : 'secondary'} onClick={() => setFilter('room')}>Ảnh phòng</Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{items.map(item => <Card key={item.id} className="overflow-hidden"><button className="block w-full" onClick={() => setPreview(item)}><Picture label={item.label} src={item.src} className="rounded-none" /></button><div className="p-4"><strong className="block truncate">{item.label}</strong><p className="mt-1 text-xs text-slate-500">{data.hotels.find(hotel => hotel.id === item.hotelId)?.name}</p><Button asChild className="mt-4 w-full" size="sm" variant="secondary"><Link to={item.type === 'hotel' ? `/partner/hotel/${item.hotelId}/edit` : `/partner/rooms/${item.roomId}/edit`}>Quản lý album</Link></Button></div></Card>)}</div><Dialog open={Boolean(preview)} onOpenChange={open => !open && setPreview(undefined)}><DialogContent title={preview?.label ?? 'Xem ảnh'}>{preview && <Picture label={preview.label} src={preview.src} className="rounded-xl" />}</DialogContent></Dialog></div>
}
