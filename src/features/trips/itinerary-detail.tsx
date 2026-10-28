import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock3, GripVertical, MapPin, Plus, Search, Star, Trash2, UsersRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, ErrorState, Feedback, FormField, LoadingState, Picture } from '@/components/common'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { GoogleMapPicker, GoogleMapView } from '@/components/google-map'
import { useCatalog, useTourist } from '@/hooks/data'
import { repo } from '@/services'
import { useSession } from '@/stores/session'
import { currency, day, errorMessage } from '@/lib/utils'
import type { Destination, Stopover, TravelActivity } from '@/types/domain'

export function ItineraryDetailPage() {
  const { id } = useParams()
  const user = useSession(state => state.user)
  const { data, isLoading, error } = useTourist()
  const { data: catalog } = useCatalog()
  const queryClient = useQueryClient()
  const [stopForm, setStopForm] = useState<Stopover | null>(null)
  const [activityForm, setActivityForm] = useState<TravelActivity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'stop' | 'activity'; id: string } | null>(null)
  const [selectedStopId, setSelectedStopId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const focusStop = useCallback((stopId: string) => {
    setSelectedStopId(stopId)
    window.requestAnimationFrame(() => document.getElementById(`stop-${stopId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [])

  if (isLoading) return <LoadingState />
  if (error) return <div className="container-app section-pad"><ErrorState message={errorMessage(error)} /></div>

  const trip = data?.trips.find(item => item.id === id)
  if (!trip) return <div className="container-app section-pad"><EmptyState title="Không tìm thấy lịch trình hoặc bạn không có quyền truy cập" action={<Button asChild><Link to="/my-itineraries">Về danh sách</Link></Button>} /></div>

  const stops = (data?.stops.filter(stop => stop.tripId === trip.id) ?? []).sort((a, b) => a.start.localeCompare(b.start))
  const dates = [...new Set(stops.map(stop => stop.start.slice(0, 10)))]
  const currentDate = selectedDate || dates[0] || trip.startDate
  const visibleStops = stops.filter(stop => stop.start.startsWith(currentDate))
  const points = stops.filter(stop => stop.lat !== undefined && stop.lng !== undefined).map(stop => ({ id: stop.id, lat: stop.lat!, lng: stop.lng!, label: stop.name }))
  const activeStopId = selectedStopId || visibleStops[0]?.id || points[0]?.id || ''
  const normalizedSearch = search.trim().toLocaleLowerCase('vi')
  const searchResults = normalizedSearch
    ? (catalog?.destinations ?? []).filter(place => `${place.name} ${place.city} ${place.region} ${place.category}`.toLocaleLowerCase('vi').includes(normalizedSearch)).slice(0, 5)
    : []
  const totalCost = data?.activities.filter(activity => stops.some(stop => stop.id === activity.stopId)).reduce((sum, activity) => sum + activity.cost, 0) ?? 0
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tourist'] })

  const blankStop = (place?: Destination): Stopover => ({
    id: '', tripId: trip.id, placeId: place?.id, name: place?.name ?? '',
    address: place ? `${place.region}, ${place.city}` : '',
    start: `${currentDate}T09:00`, end: `${currentDate}T11:00`, order: stops.length + 1,
    note: '', lat: place?.lat, lng: place?.lng,
  })
  const chooseDestination = (placeId: string) => {
    const place = catalog?.destinations.find(item => item.id === placeId)
    if (!stopForm || !place) return
    setStopForm({ ...stopForm, placeId: place.id, name: place.name, address: `${place.region}, ${place.city}`, lat: place.lat, lng: place.lng })
  }

  return <div className="min-h-screen bg-[#f7f7f7]">
    <div className="border-b border-slate-200 bg-white">
      <div className="container-app py-5">
        <Link className="text-sm font-semibold text-slate-600 hover:text-slate-950" to="/my-itineraries">← Lịch trình của tôi</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{trip.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><MapPin size={16} />{trip.city}</span>
              <span className="flex items-center gap-1.5"><CalendarDays size={16} />{day(trip.startDate)} – {day(trip.endDate)}</span>
              <span className="flex items-center gap-1.5"><UsersRound size={16} />{trip.adults + trip.children} khách</span>
              <span className="flex items-center gap-1.5"><Wallet size={16} />{currency(totalCost)} dự kiến</span>
            </div>
          </div>
          <div className="flex gap-2"><Button asChild variant="secondary"><Link to={`/my-itineraries/${trip.id}/edit`}>Sửa chuyến đi</Link></Button><Button onClick={() => setStopForm(blankStop())}><Plus size={16} />Thêm địa điểm</Button></div>
        </div>
      </div>
    </div>

    <div className="container-app py-6">
      <Feedback message={message} kind={message.startsWith('Đã') ? 'success' : 'error'} />
      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[minmax(0,590px)_minmax(520px,1fr)]">
        <section className="min-w-0">
          <Card className="relative z-10 p-4">
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={19} />
              <input aria-label="Tìm địa điểm để thêm" className="h-12 w-full rounded-full border border-slate-300 bg-white pl-11 pr-4 outline-none focus:border-slate-800" placeholder="Tìm điểm tham quan, nhà hàng, hoạt động..." value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            {search && <div className="absolute left-4 right-4 top-[68px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {searchResults.length ? searchResults.map(place => <button key={place.id} type="button" className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-0 hover:bg-slate-50" onClick={() => { setStopForm(blankStop(place)); setSearch('') }}>
                <Picture label={place.name} src={place.image ?? place.images?.[0]} className="h-14 w-16 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{place.name}</strong><span className="block truncate text-xs text-slate-500">{place.category} · {place.city}</span></span>
                <Plus size={18} />
              </button>) : <p className="p-4 text-sm text-slate-500">Không tìm thấy địa điểm phù hợp.</p>}
            </div>}
          </Card>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Chọn ngày trong lịch trình">
            {dates.map((date, index) => <button key={date} type="button" onClick={() => { setSelectedDate(date); setSelectedStopId('') }} className={`min-w-24 rounded-full border px-4 py-2 text-sm font-semibold ${currentDate === date ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-950'}`}>Ngày {index + 1} · {day(date)}</button>)}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div><p className="text-sm font-semibold text-slate-500">{day(currentDate)}</p><h2 className="text-2xl font-bold">Kế hoạch trong ngày</h2></div>
            <Button size="sm" variant="secondary" onClick={() => setStopForm(blankStop())}><Plus size={15} />Thêm</Button>
          </div>

          <div className="mt-4 grid gap-3">
            {visibleStops.length ? visibleStops.map((stop, index) => {
              const activities = data?.activities.filter(item => item.stopId === stop.id).sort((a, b) => a.start.localeCompare(b.start)) ?? []
              const place = catalog?.destinations.find(item => item.id === stop.placeId)
              return <article id={`stop-${stop.id}`} key={stop.id}>
                <Card className={`group overflow-hidden transition ${activeStopId === stop.id ? 'border-slate-900 ring-1 ring-slate-900' : 'hover:border-slate-400'}`}>
                  <div className="flex gap-3 p-3">
                    <button type="button" aria-label={`Xem ${stop.name} trên bản đồ`} onClick={() => focusStop(stop.id)} className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00aa6c] text-sm font-bold text-white">{index + 1}</button>
                    <Picture label={stop.name} src={place?.image ?? place?.images?.[0]} className="h-24 w-28 shrink-0 rounded-lg sm:h-28 sm:w-36" />
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><h3 className="truncate text-lg font-bold">{stop.name}</h3><p className="mt-0.5 truncate text-sm text-slate-500">{place?.category ?? (stop.address || trip.city)}</p></div>
                        <GripVertical className="shrink-0 text-slate-300" size={20} />
                      </div>
                      {place?.rating && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#00aa6c]"><Star size={15} fill="currentColor" />{place.rating.toFixed(1)}</p>}
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700"><Clock3 size={15} />{stop.start.slice(11, 16)} – {stop.end.slice(11, 16)}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold"><button onClick={() => focusStop(stop.id)} className="hover:underline">Bản đồ</button><button onClick={() => setStopForm(stop)} className="hover:underline">Sửa</button><button aria-label={`Xóa ${stop.name}`} onClick={() => setDeleteTarget({ kind: 'stop', id: stop.id })} className="text-red-700 hover:underline">Xóa</button></div>
                    </div>
                  </div>
                  {(stop.note || activities.length > 0) && <div className="border-t border-slate-100 px-4 py-3">
                    {stop.note && <p className="text-sm text-slate-600">{stop.note}</p>}
                    {activities.map(activity => <div key={activity.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><strong>{activity.start.slice(11, 16)}</strong> · {activity.name}</span><span className="flex gap-2"><button onClick={() => setActivityForm(activity)}>Sửa</button><button className="text-red-700" onClick={() => setDeleteTarget({ kind: 'activity', id: activity.id })}>Xóa</button></span></div>)}
                  </div>}
                  <button className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold hover:bg-slate-50" onClick={() => setActivityForm({ id: '', stopId: stop.id, name: '', start: stop.start, end: stop.end, note: '', cost: 0 })}><Plus size={15} />Thêm hoạt động tại đây</button>
                </Card>
              </article>
            }) : <EmptyState title="Ngày này chưa có điểm dừng" description="Tìm địa điểm ở phía trên hoặc thêm một vị trí mới vào kế hoạch." action={<Button onClick={() => setStopForm(blankStop())}>Thêm địa điểm</Button>} />}
          </div>
        </section>

        <aside className="xl:sticky xl:top-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">Bản đồ chuyến đi</h2><p className="text-sm text-slate-500">Chọn marker để mở điểm dừng tương ứng</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{points.length} địa điểm</span></div>
            <GoogleMapView points={points} address={trip.city} activePointId={activeStopId} onPointSelect={focusStop} className="!h-[calc(100vh-190px)] min-h-[560px] rounded-none border-0" />
          </Card>
        </aside>
      </div>
    </div>

    <Dialog open={Boolean(stopForm)} onOpenChange={open => !open && setStopForm(null)}><DialogContent title={stopForm?.id ? 'Sửa điểm dừng' : 'Thêm điểm dừng'}>{stopForm && <form className="grid gap-4" onSubmit={async event => { event.preventDefault(); try { await repo.saveStop(user?.id ?? '', stopForm); await refresh(); setStopForm(null); setMessage('Đã lưu điểm dừng.') } catch (cause) { setMessage(errorMessage(cause)) } }}>
      <FormField label="Chọn địa điểm trong hệ thống"><select value={stopForm.placeId ?? ''} onChange={event => chooseDestination(event.target.value)}><option value="">Nhập địa điểm khác</option>{catalog?.destinations.map(place => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></FormField>
      <div className="grid gap-3 sm:grid-cols-2"><FormField label="Tên địa điểm *"><input required value={stopForm.name} onChange={event => setStopForm({ ...stopForm, name: event.target.value })} /></FormField><FormField label="Địa chỉ"><input value={stopForm.address} onChange={event => setStopForm({ ...stopForm, address: event.target.value })} /></FormField></div>
      <GoogleMapPicker address={stopForm.address || `${stopForm.name}, ${trip.city}`} value={stopForm.lat !== undefined && stopForm.lng !== undefined ? { lat: stopForm.lat, lng: stopForm.lng } : undefined} onChange={location => setStopForm(current => current ? { ...current, lat: location.lat, lng: location.lng, address: location.address ?? current.address } : current)} />
      <div className="grid gap-3 sm:grid-cols-2"><FormField label="Thời gian đến *"><input required type="datetime-local" min={`${trip.startDate}T00:00`} max={`${trip.endDate}T23:59`} value={stopForm.start} onChange={event => setStopForm({ ...stopForm, start: event.target.value })} /></FormField><FormField label="Thời gian rời *"><input required type="datetime-local" min={stopForm.start} max={`${trip.endDate}T23:59`} value={stopForm.end} onChange={event => setStopForm({ ...stopForm, end: event.target.value })} /></FormField></div>
      <FormField label="Ghi chú"><textarea value={stopForm.note} onChange={event => setStopForm({ ...stopForm, note: event.target.value })} /></FormField><Button>Lưu điểm dừng</Button>
    </form>}</DialogContent></Dialog>

    <Dialog open={Boolean(activityForm)} onOpenChange={open => !open && setActivityForm(null)}><DialogContent title={activityForm?.id ? 'Sửa hoạt động' : 'Thêm hoạt động'}>{activityForm && <form className="grid gap-4" onSubmit={async event => { event.preventDefault(); try { await repo.saveActivity(user?.id ?? '', activityForm); await refresh(); setActivityForm(null); setMessage('Đã lưu hoạt động.') } catch (cause) { setMessage(errorMessage(cause)) } }}>
      <FormField label="Tên hoạt động *"><input required value={activityForm.name} onChange={event => setActivityForm({ ...activityForm, name: event.target.value })} /></FormField><div className="grid gap-3 sm:grid-cols-2"><FormField label="Bắt đầu"><input type="datetime-local" value={activityForm.start} onChange={event => setActivityForm({ ...activityForm, start: event.target.value })} /></FormField><FormField label="Kết thúc"><input type="datetime-local" min={activityForm.start} value={activityForm.end} onChange={event => setActivityForm({ ...activityForm, end: event.target.value })} /></FormField></div><FormField label="Chi phí dự kiến (VND)"><input type="number" min="0" value={activityForm.cost} onChange={event => setActivityForm({ ...activityForm, cost: Number(event.target.value) })} /></FormField><FormField label="Ghi chú"><textarea value={activityForm.note} onChange={event => setActivityForm({ ...activityForm, note: event.target.value })} /></FormField><Button>Lưu hoạt động</Button>
    </form>}</DialogContent></Dialog>

    <Dialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}><DialogContent title="Xác nhận xóa" description="Dữ liệu liên quan sẽ được cập nhật trong lịch trình của bạn."><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Quay lại</Button><Button variant="danger" onClick={async () => { if (!deleteTarget) return; try { if (deleteTarget.kind === 'stop') await repo.deleteStop(user?.id ?? '', deleteTarget.id); else await repo.deleteActivity(user?.id ?? '', deleteTarget.id); await refresh(); setDeleteTarget(null); setMessage('Đã xóa khỏi lịch trình.') } catch (cause) { setMessage(errorMessage(cause)) } }}><Trash2 size={15} />Xóa</Button></div></DialogContent></Dialog>
  </div>
}
