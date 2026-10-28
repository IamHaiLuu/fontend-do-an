import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Card, EmptyState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export function AdminPageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return <div>{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#159FE8]">{eyebrow}</p>}<PageHeader title={title} description={description} actions={actions} /></div>
}

export function StatCard({ label, value, detail, icon, tone = 'blue' }: { label: string; value: string; detail?: string; icon: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'violet' }) {
  const tones = { blue: 'bg-sky-50 text-sky-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' }
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p><span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>{icon}</span></div><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</Card>
}

export function SearchFilterBar({ search, onSearch, searchPlaceholder = 'Tìm kiếm...', children, actions }: { search: string; onSearch: (value: string) => void; searchPlaceholder?: string; children?: ReactNode; actions?: ReactNode }) {
  return <Card className="mb-5 p-4"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[220px] flex-1 text-sm font-medium text-slate-700">Tìm kiếm<div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} /><input className="mt-0 pl-10" value={search} onChange={event => onSearch(event.target.value)} placeholder={searchPlaceholder} /></div></label>{children}{actions && <div className="ml-auto flex gap-2">{actions}</div>}</div></Card>
}

export function DataTable({ children, total, emptyTitle = 'Không có dữ liệu' }: { children: ReactNode; total: number; emptyTitle?: string }) {
  if (!total) return <EmptyState title={emptyTitle} description="Thử thay đổi từ khóa hoặc bộ lọc." />
  return <Card className="overflow-hidden"><div className="table-scroll">{children}</div><div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Hiển thị {total} bản ghi trong trang hiện tại</div></Card>
}

export function Pagination({ page, totalPages, onChange, total }: { page: number; totalPages: number; onChange: (page: number) => void; total: number }) {
  if (totalPages <= 1) return <p className="mt-4 text-sm text-slate-500">Tổng cộng {total} bản ghi</p>
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Tổng cộng {total} bản ghi · Trang {page}/{totalPages}</p><div className="flex items-center gap-2"><Button size="icon" variant="secondary" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></Button>{Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, page - 3), Math.max(5, page + 2)).map(number => <Button key={number} size="sm" variant={number === page ? 'default' : 'secondary'} onClick={() => onChange(number)}>{number}</Button>)}<Button size="icon" variant="secondary" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></Button></div></div>
}

export function DetailSection({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{actions}</div><div className="mt-5">{children}</div></Card>
}

export function InfoItem({ label, children }: { label: string; children?: ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1.5 text-sm font-medium text-slate-800">{children || '—'}</dd></div>
}

export function LoadingSkeleton() {
  return <div role="status" aria-label="Đang tải" className="animate-pulse space-y-5"><div className="h-9 w-64 rounded-lg bg-slate-200" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-32 rounded-xl bg-slate-200" />)}</div><div className="h-80 rounded-xl bg-slate-200" /></div>
}
