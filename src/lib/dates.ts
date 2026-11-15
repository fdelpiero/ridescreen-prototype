// All dates are local calendar days as YYYY-MM-DD strings. Weeks run Monday to Sunday.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toISODate(parseISODate(iso)) === iso
}

export function today(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function mondayOf(iso: string): string {
  const daysSinceMonday = (parseISODate(iso).getDay() + 6) % 7
  return addDays(iso, -daysSinceMonday)
}

export function isMonday(iso: string): boolean {
  return parseISODate(iso).getDay() === 1
}

/** The seven days of the week starting on `weekStart`. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Monday of the most recent week that has fully finished. */
export function lastCompleteWeekStart(todayIso: string): string {
  return addDays(mondayOf(todayIso), -7)
}

const dayMonth = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatWeek(weekStart: string): string {
  const start = parseISODate(weekStart)
  const end = parseISODate(addDays(weekStart, 6))
  return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`
}

export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoTimestamp))
}
