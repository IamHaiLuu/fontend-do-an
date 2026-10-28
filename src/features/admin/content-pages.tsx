import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, MapPin, Plus, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Feedback, FormField, Picture, StatusBadge } from '@/components/common'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAdminData } from '@/hooks/data'
import { repo } from '@/services'
import { currency, day, dateTime, errorMessage, nights } from '@/lib/utils'
import { travelImage } from '@/lib/travel-images'
import type { Destination } from '@/types/domain'
import { AdminPageHeader, DataTable, DetailSection, InfoItem, LoadingSkeleton, Pagination, SearchFilterBar } from './admin-ui'
import { GoogleMapPicker } from '@/components/google-map'

const PAGE_SIZE = 8
const slice = <T,>(items: T[], page: number) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
const updateParam = (params: URLSearchParams, setParams: (next: URLSearchParams) => void, key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next) }

export function AdminDestinationsPage() {
  const { data, isLoading, error } = useAdminData()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const query = (params.get('q') ?? '').toLowerCase()
  const category = params.get('category') ?? ''
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const categories = [...new Set(data.destinations.map(item => item.category))]
  const items = data.destinations.filter(item => (!query || `${item.name} ${item.city} ${item.region}`.toLowerCase().includes(query)) && (!category || item.category === category))
  return <div><AdminPageHeader eyebrow="Quản lý nội dung" title="Địa điểm du lịch" description="Quản lý thông tin, giờ mở cửa, giá tham khảo, chủ đề và hình ảnh." actions={<Button asChild><Link to="/admin/destinations/new"><Plus size={16} />Thêm địa điểm</Link></Button>} /><SearchFilterBar search={params.get('q') ?? ''} onSearch={value => updateParam(params, setParams, 'q', value)} searchPlaceholder="Tên địa điểm, tỉnh/thành hoặc địa chỉ"><label className="min-w-44 text-sm font-medium">Loại địa điểm<select value={category} onChange={event => updateParam(params, setParams, 'category', event.target.value)}><option value="">Tất cả</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label></SearchFilterBar><DataTable total={slice(items, page).length} emptyTitle="Không có địa điểm phù hợp"><table><thead><tr><th>Địa điểm</th><th>Loại</th><th>Tỉnh/thành</th><th>Địa chỉ</th><th>Giá tham khảo</th><th>Giờ mở cửa</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{slice(items, page).map(item => <tr key={item.id}><td><div className="flex min-w-60 items-center gap-3"><Picture label={item.name} src={item.image ?? travelImage(item.id)} className="h-14 w-20 shrink-0 rounded-lg" /><div><strong>{item.name}</strong><span className="block font-mono text-xs text-slate-400">{item.id}</span></div></div></td><td>{item.category}</td><td>{item.city}</td><td>{item.region}</td><td>{currency(item.price)}</td><td>{item.openingHours ?? 'Chưa cập nhật'}</td><td><StatusBadge status={item.active === false ? 'HIDDEN' : 'VISIBLE'} /></td><td><div className="flex gap-2"><Button asChild size="sm" variant="secondary"><Link to={`/admin/destinations/${item.id}/edit`}>Chỉnh sửa</Link></Button><Button size="sm" variant="ghost" onClick={async () => { try { await repo.toggleDestination(item.id); await queryClient.invalidateQueries({ queryKey: ['admin'] }); setMessage('Đã cập nhật trạng thái địa điểm.') } catch (cause) { setMessage(errorMessage(cause)) } }}>{item.active === false ? 'Hiện' : 'Ẩn'}</Button></div></td></tr>)}</tbody></table></DataTable><Pagination page={page} totalPages={Math.max(1, Math.ceil(items.length / PAGE_SIZE))} total={items.length} onChange={setPage} /><div className="mt-4"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div></div>
}
export function AdminDestinationFormPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useAdminData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const saved = data.destinations.find(item => item.id === id)
  if (id && !saved) return <EmptyState title="Không tìm thấy địa điểm" />
  return <DestinationEditor key={id ?? 'new'} id={id} saved={saved} />
}

function DestinationEditor({ id, saved }: { id?: string; saved?: Destination }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<Omit<Destination, 'id'>>(() => saved ? { name: saved.name, description: saved.description, category: saved.category, city: saved.city, region: saved.region, price: saved.price, tags: saved.tags, active: saved.active !== false, openingHours: saved.openingHours, image: saved.image, rating: saved.rating, lat: saved.lat, lng: saved.lng } : { name: '', description: '', category: '', city: '', region: '', price: 0, tags: [], active: true, openingHours: '', image: '/images/da-nang-coast.png' })
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => { setForm(current => ({ ...current, [key]: value })); setDirty(true) }
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!form.name.trim() || !form.city.trim() || !form.region.trim() || !form.category.trim()) { setMessage('Vui lòng điền đầy đủ các trường bắt buộc.'); return } setBusy(true); try { await repo.saveDestination(id, form); await queryClient.invalidateQueries({ queryKey: ['admin'] }); await queryClient.invalidateQueries({ queryKey: ['catalog'] }); setDirty(false); navigate('/admin/destinations') } catch (cause) { setMessage(errorMessage(cause)) } finally { setBusy(false) } }
  return <div>
    <Link className="text-sm font-semibold text-[#1E3A5F]" to="/admin/destinations">← Danh sách địa điểm</Link>
    <div className="mt-5"><AdminPageHeader title={id ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'} description="Các trường có dấu * là bắt buộc. Tìm và chọn vị trí chính xác trên Google Maps." /></div>
    <form className="grid gap-5" onSubmit={submit}>
      <DetailSection title="Thông tin chung"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Tên địa điểm *"><input required value={form.name} onChange={event => set('name', event.target.value)} placeholder="Ví dụ: Bảo tàng Đà Nẵng" /></FormField><FormField label="Loại địa điểm *"><input required value={form.category} onChange={event => set('category', event.target.value)} placeholder="Văn hóa, Thiên nhiên..." /></FormField><FormField label="Tỉnh/thành *"><input required value={form.city} onChange={event => set('city', event.target.value)} /></FormField><FormField label="Địa chỉ / khu vực *"><input required value={form.region} onChange={event => set('region', event.target.value)} /></FormField><FormField label="Giá tham khảo (VND)"><input type="number" min="0" value={form.price} onChange={event => set('price', Number(event.target.value))} /></FormField><FormField label="Chủ đề" hint="Ngăn cách bằng dấu phẩy"><input value={form.tags.join(', ')} onChange={event => set('tags', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} /></FormField></div><div className="mt-5"><GoogleMapPicker address={[form.name, form.region, form.city].filter(Boolean).join(', ')} value={form.lat !== undefined && form.lng !== undefined ? { lat: form.lat, lng: form.lng } : undefined} onChange={location => { setForm(current => ({ ...current, lat: location.lat, lng: location.lng, region: location.address ?? current.region })); setDirty(true) }} /></div><div className="mt-4"><FormField label="Mô tả"><textarea value={form.description} onChange={event => set('description', event.target.value)} /></FormField></div></DetailSection>
      <DetailSection title="Giờ mở cửa"><FormField label="Mô tả giờ mở cửa"><input type="text" value={form.openingHours ?? ''} onChange={event => set('openingHours', event.target.value)} placeholder="Ví dụ: Thứ 2–6: 08:00–17:00; Thứ 7 và Chủ nhật: 08:00–20:00" /></FormField></DetailSection>
      <DetailSection title="Hình ảnh"><div className="grid gap-4 sm:grid-cols-[1fr_300px]"><FormField label="Đường dẫn ảnh"><input value={form.image ?? ''} onChange={event => set('image', event.target.value)} placeholder="/images/... hoặc URL ảnh" /></FormField><Picture label={form.name || 'địa điểm'} src={form.image} className="rounded-xl" /></div></DetailSection>
      <Feedback message={message} kind="error" /><div className="flex gap-3"><Button disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu địa điểm'}</Button><Button type="button" variant="secondary" onClick={() => navigate('/admin/destinations')}>Hủy</Button></div>
    </form>
  </div>
}

export function AdminTopicsPage() {
  const { data, isLoading, error } = useAdminData()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = data.topics.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
  const open = (id = '') => { const topic = data.topics.find(item => item.id === id); setEditing(id || 'new'); setName(topic?.name ?? ''); setDescription(topic?.description ?? '') }
  return <div><AdminPageHeader eyebrow="Quản lý nội dung" title="Chủ đề du lịch" description="Chủ đề đang được địa điểm hoặc sở thích sử dụng chỉ có thể ngừng sử dụng, không xóa cứng." actions={<Button onClick={() => open()}><Plus size={16} />Thêm chủ đề</Button>} /><SearchFilterBar search={query} onSearch={setQuery} searchPlaceholder="Tên hoặc mô tả chủ đề" /><DataTable total={items.length} emptyTitle="Không có chủ đề phù hợp"><table><thead><tr><th>Mã chủ đề</th><th>Tên chủ đề</th><th>Mô tả</th><th>Số địa điểm liên kết</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(topic => <tr key={topic.id}><td className="font-mono text-xs">{topic.id}</td><td className="font-semibold">{topic.name}</td><td>{topic.description}</td><td>{data.destinations.filter(item => item.tags.some(tag => tag.toLowerCase().includes(topic.name.replace('Du lịch ', '').toLowerCase()))).length}</td><td><StatusBadge status={topic.active ? 'ACTIVE' : 'SUSPENDED'} /></td><td><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(topic.id)}>Sửa</Button><Button size="sm" variant="ghost" onClick={async () => { try { await repo.toggleTopic(topic.id); await queryClient.invalidateQueries({ queryKey: ['admin'] }); setMessage('Đã cập nhật trạng thái chủ đề.') } catch (cause) { setMessage(errorMessage(cause)) } }}>{topic.active ? 'Ngừng sử dụng' : 'Bật lại'}</Button></div></td></tr>)}</tbody></table></DataTable><div className="mt-4"><Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} /></div><Dialog open={Boolean(editing)} onOpenChange={value => !value && setEditing('')}><DialogContent title={editing === 'new' ? 'Thêm chủ đề' : 'Chỉnh sửa chủ đề'}><form className="grid gap-4" onSubmit={async event => { event.preventDefault(); try { await repo.saveTopic(editing === 'new' ? undefined : editing, { name, description, active: data.topics.find(item => item.id === editing)?.active ?? true }); await queryClient.invalidateQueries({ queryKey: ['admin'] }); setEditing(''); setMessage('Đã lưu chủ đề.') } catch (cause) { setMessage(errorMessage(cause)) } }}><FormField label="Tên chủ đề *"><input required value={name} onChange={event => setName(event.target.value)} /></FormField><FormField label="Mô tả"><textarea value={description} onChange={event => setDescription(event.target.value)} /></FormField><Button>Lưu chủ đề</Button></form></DialogContent></Dialog></div>
}

export function AdminReviewsModernPage() {
  const { data, isLoading, error } = useAdminData()
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') ?? '').toLowerCase()
  const stars = params.get('stars') ?? ''
  const status = params.get('status') ?? ''
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = data.reviews.filter(review => { const user = data.users.find(item => item.id === review.userId); const hotel = data.hotels.find(item => item.id === review.hotelId); return (!query || `${review.bookingId} ${user?.name ?? ''} ${hotel?.name ?? ''}`.toLowerCase().includes(query)) && (!stars || review.stars === Number(stars)) && (!status || review.status === status) })
  return <div><AdminPageHeader eyebrow="Quản lý nội dung" title="Đánh giá" description="Admin có thể ẩn hoặc khôi phục, không chỉnh sửa nội dung và số sao gốc." /><SearchFilterBar search={params.get('q') ?? ''} onSearch={value => updateParam(params, setParams, 'q', value)} searchPlaceholder="Mã đơn, khách hàng hoặc khách sạn"><label className="min-w-36 text-sm font-medium">Số sao<select value={stars} onChange={event => updateParam(params, setParams, 'stars', event.target.value)}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao</option>)}</select></label><label className="min-w-40 text-sm font-medium">Trạng thái<select value={status} onChange={event => updateParam(params, setParams, 'status', event.target.value)}><option value="">Tất cả</option><option value="VISIBLE">Đang hiển thị</option><option value="HIDDEN">Đã ẩn</option><option value="PENDING">Chờ xử lý</option></select></label></SearchFilterBar><DataTable total={items.length} emptyTitle="Không có đánh giá phù hợp"><table><thead><tr><th>Mã đánh giá</th><th>Mã đơn</th><th>Khách du lịch</th><th>Khách sạn</th><th>Số sao</th><th>Nội dung</th><th>Ngày đánh giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(review => <tr key={review.id}><td className="font-mono text-xs">{review.id}</td><td>{review.bookingId}</td><td>{data.users.find(item => item.id === review.userId)?.name}</td><td>{data.hotels.find(item => item.id === review.hotelId)?.name}</td><td><span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Star size={15} fill="currentColor" />{review.stars}</span></td><td className="max-w-72 truncate">{review.content}</td><td>{dateTime(review.createdAt)}</td><td><StatusBadge status={review.status} /></td><td><Button asChild size="sm" variant="secondary"><Link to={`/admin/reviews/${review.id}`}><Eye size={15} />Chi tiết</Link></Button></td></tr>)}</tbody></table></DataTable></div>
}

export function AdminItinerariesPage() {
  const { data, isLoading, error } = useAdminData()
  const [query, setQuery] = useState('')
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const items = data.trips.filter(trip => { const user = data.users.find(item => item.id === trip.userId); return `${trip.id} ${trip.name} ${user?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()) })
  return <div><AdminPageHeader eyebrow="Quản lý nội dung" title="Lịch trình du lịch" description="Khu vực giám sát dữ liệu; Admin không chỉnh sửa lịch trình riêng tư của khách du lịch." /><SearchFilterBar search={query} onSearch={setQuery} searchPlaceholder="Mã, tên lịch trình hoặc khách du lịch" /><DataTable total={items.length} emptyTitle="Không có lịch trình phù hợp"><table><thead><tr><th>Mã lịch trình</th><th>Tên lịch trình</th><th>Khách du lịch</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Số ngày</th><th>Ngân sách</th><th>Điểm dừng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.map(trip => <tr key={trip.id}><td className="font-mono text-xs">{trip.id}</td><td className="font-semibold">{trip.name}</td><td>{data.users.find(item => item.id === trip.userId)?.name}</td><td>{day(trip.startDate)}</td><td>{day(trip.endDate)}</td><td>{nights(trip.startDate, trip.endDate) + 1}</td><td>{currency(trip.budget)}</td><td>{data.stops.filter(item => item.tripId === trip.id).length}</td><td><StatusBadge status={trip.status} /></td><td><Button asChild size="sm" variant="secondary"><Link to={`/admin/itineraries/${trip.id}`}><Eye size={15} />Chi tiết</Link></Button></td></tr>)}</tbody></table></DataTable></div>
}

export function AdminItineraryDetailPage() {
  const { id } = useParams()
  const { data, isLoading, error } = useAdminData()
  if (isLoading) return <LoadingSkeleton />
  if (error || !data) return <ErrorState message={errorMessage(error)} />
  const trip = data.trips.find(item => item.id === id)
  if (!trip) return <EmptyState title="Không tìm thấy lịch trình" />
  const stops = data.stops.filter(item => item.tripId === trip.id).sort((a, b) => a.order - b.order)
  return <div><Link className="text-sm font-semibold text-[#1E3A5F]" to="/admin/itineraries">← Danh sách lịch trình</Link><div className="mt-5"><AdminPageHeader title={trip.name} description={`${trip.city} · ${day(trip.startDate)} – ${day(trip.endDate)}`} actions={<StatusBadge status={trip.status} />} /></div><div className="grid gap-5"><DetailSection title="Thông tin chung"><dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><InfoItem label="Chủ sở hữu">{data.users.find(item => item.id === trip.userId)?.name}</InfoItem><InfoItem label="Thời gian">{nights(trip.startDate, trip.endDate) + 1} ngày</InfoItem><InfoItem label="Ngân sách">{currency(trip.budget)}</InfoItem><InfoItem label="Số khách">{trip.adults} người lớn, {trip.children} trẻ em</InfoItem><InfoItem label="Nguồn tạo">{trip.source}</InfoItem><InfoItem label="Ghi chú">{trip.note}</InfoItem></dl></DetailSection><DetailSection title="Danh sách điểm dừng và hoạt động"><div className="grid gap-4">{stops.map(stop => <div key={stop.id} className="rounded-xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#159FE8]">Điểm dừng {stop.order}</p><h3 className="mt-1 font-semibold">{stop.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{stop.address}</p></div><span className="text-sm text-slate-500">{dateTime(stop.start)} – {dateTime(stop.end)}</span></div><div className="mt-4 grid gap-2">{data.activities.filter(item => item.stopId === stop.id).map(activity => <div key={activity.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-[1fr_220px_130px]"><strong>{activity.name}</strong><span>{dateTime(activity.start)} – {dateTime(activity.end)}</span><span className="font-semibold">{currency(activity.cost)}</span></div>)}</div></div>)}</div></DetailSection></div></div>
}

