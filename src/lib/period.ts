export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export function previousMonthValue(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthBounds(value: string): { from: string; to: string } | null {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return null
  const next = new Date(year, month, 1)
  return { from: `${value}-01`, to: isoDate(next) }
}

export function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return '—'
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export function monthRangeLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return ''
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

export function rangeLabel(from: string, to: string): string {
  if (!from || !to) return ''
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  end.setDate(end.getDate() - 1)
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

export function isValidRange(from: string, to: string): boolean {
  return !!from && !!to && from < to
}