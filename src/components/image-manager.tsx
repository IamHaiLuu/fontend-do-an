import { useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Picture } from '@/components/common'

export function ImageManager({ label, images, onChange, max = 12 }: { label: string; images: string[]; onChange: (images: string[]) => void; max?: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const add = (sources: string[]) => {
    const valid = sources.filter(source => source.startsWith('data:image/') || source.startsWith('/') || /^https:\/\//i.test(source))
    setMessage(valid.length === sources.length ? '' : 'Chỉ chấp nhận ảnh tải lên, đường dẫn /images/... hoặc URL HTTPS.')
    onChange([...new Set([...images, ...valid])].slice(0, max))
  }
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].slice(0, Math.max(0, max - images.length))
    const sources = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })))
    add(sources)
    event.target.value = ''
  }
  const move = (index: number, offset: number) => { const next = [...images]; const target = index + offset; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target]!, next[index]!]; onChange(next) }
  return <div role="group" aria-label={`Album ảnh ${label}`} className="grid gap-3"><div className="flex flex-wrap gap-2"><input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple onChange={upload} /><Button type="button" variant="secondary" disabled={images.length >= max} onClick={() => inputRef.current?.click()}><ImagePlus size={16} />Tải ảnh lên</Button><div className="flex min-w-60 flex-1 gap-2"><input className="!mt-0" value={url} onChange={event => setUrl(event.target.value)} placeholder="Dán URL ảnh https://..." /><Button type="button" disabled={!url.trim() || images.length >= max} onClick={() => { add([url.trim()]); setUrl('') }}>Thêm URL</Button></div></div>{message && <p role="alert" className="text-xs text-red-700">{message}</p>}<p className="text-xs text-slate-500">Tối đa {max} ảnh. Ảnh đầu tiên là ảnh đại diện; có thể đổi thứ tự hoặc xóa từng ảnh.</p>{images.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{images.map((source, index) => <div key={`${source}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><Picture label={`${label} ${index + 1}`} src={source} className="rounded-none" /><div className="flex items-center gap-1 p-2">{index === 0 && <span className="mr-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><Star size={13} fill="currentColor" />Đại diện</span>}<Button type="button" size="icon" variant="ghost" aria-label={`Đưa ảnh ${index + 1} sang trái`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowLeft size={15} /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Đưa ảnh ${index + 1} sang phải`} disabled={index === images.length - 1} onClick={() => move(index, 1)}><ArrowRight size={15} /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}><Trash2 size={15} /></Button></div></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Chưa có ảnh.</p>}</div>
}
