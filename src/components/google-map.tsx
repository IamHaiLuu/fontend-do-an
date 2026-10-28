/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ExternalLink, LocateFixed, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MapPoint {
  id?: string
  lat: number
  lng: number
  label?: string
}

interface GoogleLatLng {
  lat: () => number
  lng: () => number
}

interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => {
    addListener: (name: string, handler: (event: { latLng?: GoogleLatLng }) => void) => void
    fitBounds: (bounds: unknown, padding?: number) => void
    setCenter: (point: MapPoint) => void
    setZoom: (zoom: number) => void
  }
  Marker: new (options: Record<string, unknown>) => {
    addListener: (name: string, handler: (event: { latLng?: GoogleLatLng }) => void) => void
    setMap: (map: unknown) => void
    setPosition: (point: MapPoint) => void
  }
  LatLngBounds: new () => { extend: (point: MapPoint) => void }
  Geocoder: new () => {
    geocode: (request: Record<string, unknown>) => Promise<{ results: Array<{ formatted_address: string; geometry: { location: GoogleLatLng } }> }>
  }
}

type GoogleWindow = Window & {
  google?: { maps: GoogleMapsApi }
  __smartTourismGoogleMaps?: Promise<GoogleMapsApi>
}

const defaultCenter = { lat: 16.0471, lng: 108.2068 }
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

function loadGoogleMaps() {
  const target = window as GoogleWindow
  if (target.google?.maps) return Promise.resolve(target.google.maps)
  if (target.__smartTourismGoogleMaps) return target.__smartTourismGoogleMaps
  target.__smartTourismGoogleMaps = new Promise<GoogleMapsApi>((resolve, reject) => {
    if (!apiKey) { reject(new Error('MISSING_KEY')); return }
    const existing = document.querySelector<HTMLScriptElement>('script[data-smart-tourism-google-maps]')
    const check = () => target.google?.maps ? resolve(target.google.maps) : reject(new Error('LOAD_FAILED'))
    if (existing) { existing.addEventListener('load', check, { once: true }); existing.addEventListener('error', () => reject(new Error('LOAD_FAILED')), { once: true }); return }
    const script = document.createElement('script')
    script.dataset.smartTourismGoogleMaps = 'true'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=vi&region=VN`
    script.async = true
    script.defer = true
    script.addEventListener('load', check, { once: true })
    script.addEventListener('error', () => reject(new Error('LOAD_FAILED')), { once: true })
    document.head.appendChild(script)
  })
  return target.__smartTourismGoogleMaps
}

function fallbackUrl(points: MapPoint[], address?: string) {
  const point = points[0]
  const query = point ? `${point.lat},${point.lng}` : address || 'Việt Nam'
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function MapFallback({ points, address, picker = false, activePointId, onPointSelect, className = '' }: { points: MapPoint[]; address?: string; picker?: boolean; activePointId?: string; onPointSelect?: (id: string) => void; className?: string }) {
  const query = points[0] ? `${points[0].lat},${points[0].lng}` : address || 'Việt Nam'
  const latitudes = points.map(point => point.lat)
  const longitudes = points.map(point => point.lng)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  const position = (point: MapPoint, index: number) => {
    if (points.length === 1) return { left: '50%', top: '50%' }
    const lngRange = Math.max(maxLng - minLng, 0.001)
    const latRange = Math.max(maxLat - minLat, 0.001)
    const left = 12 + ((point.lng - minLng) / lngRange) * 76
    const top = 14 + ((maxLat - point.lat) / latRange) * 64
    return { left: `${Number.isFinite(left) ? left : 18 + index * 12}%`, top: `${Number.isFinite(top) ? top : 50}%` }
  }
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
    <div className="relative"><iframe title="Google Maps" className={`h-72 w-full border-0 opacity-80 ${className}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${points.length > 1 ? 12 : 15}&output=embed`} />{points.map((point, index) => <button key={point.id ?? `${point.lat}-${point.lng}-${index}`} type="button" aria-label={`Điểm dừng ${index + 1}: ${point.label ?? 'Vị trí'}`} aria-pressed={activePointId === point.id} title={point.label} onClick={() => point.id && onPointSelect?.(point.id)} style={position(point, index)} className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-lg transition-transform ${activePointId === point.id ? 'z-20 h-11 w-11 scale-110 bg-[#159FE8] ring-4 ring-sky-200' : 'z-10 h-9 w-9 bg-[#1E3A5F] hover:scale-110'}`}>{index + 1}</button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white p-3 text-xs text-slate-600">
      <span>{picker ? 'Thêm VITE_GOOGLE_MAPS_API_KEY để tìm, click và kéo ghim trực tiếp.' : points.length ? `Đang hiển thị ${points.length} điểm dừng đã đánh số.` : 'Đang hiển thị bản đồ Google Maps.'}</span>
      <a className="inline-flex items-center gap-1 font-semibold text-[#1E3A5F]" href={fallbackUrl(points, address)} target="_blank" rel="noreferrer">Mở Google Maps <ExternalLink size={13} /></a>
    </div>
  </div>
}

export function GoogleMapView({ points, address, className = '', activePointId, onPointSelect }: { points: MapPoint[]; address?: string; className?: string; activePointId?: string; onPointSelect?: (id: string) => void }) {
  const mapElement = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(!apiKey)
  const validPoints = useMemo(() => points.filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng)), [points])
  useEffect(() => {
    if (!mapElement.current || !apiKey) return
    let markers: Array<{ setMap: (map: unknown) => void }> = []
    let active = true
    void loadGoogleMaps().then(maps => {
      if (!active || !mapElement.current) return
      const map = new maps.Map(mapElement.current, { center: validPoints[0] ?? defaultCenter, zoom: validPoints.length ? 14 : 6, mapTypeControl: false, streetViewControl: false, fullscreenControl: true })
      const bounds = new maps.LatLngBounds()
      markers = validPoints.map((point, index) => {
        bounds.extend(point)
        const marker = new maps.Marker({ map, position: point, title: point.label, zIndex: activePointId === point.id ? 100 : index, label: validPoints.length > 1 ? { text: String(index + 1), color: '#ffffff', fontWeight: '700' } : undefined })
        if (point.id && onPointSelect) marker.addListener('click', () => onPointSelect(point.id!))
        return marker
      })
      if (validPoints.length > 1) map.fitBounds(bounds, 56)
      const activePoint = validPoints.find(point => point.id === activePointId)
      if (activePoint) { map.setCenter(activePoint); map.setZoom(15) }
    }).catch(() => setFailed(true))
    return () => { active = false; markers.forEach(marker => marker.setMap(null)) }
  }, [validPoints, activePointId, onPointSelect])
  if (failed) return <MapFallback points={validPoints} address={address} activePointId={activePointId} onPointSelect={onPointSelect} className={className} />
  return <div ref={mapElement} aria-label="Bản đồ Google Maps" className={`h-80 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${className}`} />
}

export function GoogleMapPicker({ value, address, onChange }: { value?: MapPoint; address: string; onChange: (value: MapPoint & { address?: string }) => void }) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<InstanceType<GoogleMapsApi['Map']> | null>(null)
  const markerRef = useRef<InstanceType<GoogleMapsApi['Marker']> | null>(null)
  const mapsRef = useRef<GoogleMapsApi | null>(null)
  const [query, setQuery] = useState(address)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(!apiKey)

  const selectPoint = async (point: MapPoint, resolveAddress: boolean) => {
    markerRef.current?.setPosition(point)
    mapRef.current?.setCenter(point)
    mapRef.current?.setZoom(16)
    if (!resolveAddress || !mapsRef.current) { onChange(point); return }
    try {
      const response = await new mapsRef.current.Geocoder().geocode({ location: point })
      const formatted = response.results[0]?.formatted_address
      if (formatted) setQuery(formatted)
      onChange({ ...point, address: formatted })
    } catch { onChange(point) }
  }

  useEffect(() => {
    if (!mapElement.current || !apiKey) return
    let active = true
    void loadGoogleMaps().then(maps => {
      if (!active || !mapElement.current) return
      mapsRef.current = maps
      const center = value ?? defaultCenter
      const map = new maps.Map(mapElement.current, { center, zoom: value ? 16 : 6, mapTypeControl: false, streetViewControl: false, fullscreenControl: true })
      const marker = new maps.Marker({ map, position: center, draggable: true, title: 'Vị trí đã chọn' })
      map.addListener('click', event => { if (event.latLng) void selectPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() }, true) })
      marker.addListener('dragend', event => { if (event.latLng) void selectPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() }, true) })
      mapRef.current = map
      markerRef.current = marker
    }).catch(() => setFailed(true))
    return () => { active = false; markerRef.current?.setMap(null); markerRef.current = null; mapRef.current = null }
  }, [])

  useEffect(() => {
    if (value && markerRef.current && mapRef.current) {
      markerRef.current.setPosition(value)
      mapRef.current.setCenter(value)
    }
  }, [value?.lat, value?.lng])

  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim() || !mapsRef.current) return
    setBusy(true)
    setMessage('')
    try {
      const response = await new mapsRef.current.Geocoder().geocode({ address: query, componentRestrictions: { country: 'VN' } })
      const result = response.results[0]
      if (!result) { setMessage('Không tìm thấy địa điểm phù hợp.'); return }
      const point = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng(), address: result.formatted_address }
      setQuery(result.formatted_address)
      await selectPoint(point, false)
      onChange(point)
    } catch { setMessage('Không thể tìm địa điểm. Hãy kiểm tra khóa Google Maps hoặc thử lại.') }
    finally { setBusy(false) }
  }

  if (failed) return <div className="grid gap-3"><MapFallback points={value ? [value] : []} address={address} picker /><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Vĩ độ<input type="number" step="any" value={value?.lat ?? ''} onChange={event => onChange({ lat: Number(event.target.value), lng: value?.lng ?? defaultCenter.lng })} /></label><label className="text-sm font-medium">Kinh độ<input type="number" step="any" value={value?.lng ?? ''} onChange={event => onChange({ lat: value?.lat ?? defaultCenter.lat, lng: Number(event.target.value) })} /></label></div></div>

  return <div className="grid gap-3">
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={search}><label className="sr-only" htmlFor="google-map-search">Tìm trên Google Maps</label><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} /><input id="google-map-search" className="!mt-0 pl-10" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập tên địa điểm hoặc địa chỉ" /></div><Button disabled={busy} type="submit"><LocateFixed size={16} />{busy ? 'Đang tìm...' : 'Tìm trên bản đồ'}</Button></form>
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <div ref={mapElement} aria-label="Chọn vị trí trên Google Maps" className="h-80 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" />
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={13} />Click bản đồ hoặc kéo ghim để chọn chính xác.</span>{value && <span>{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</span>}</div>
  </div>
}
