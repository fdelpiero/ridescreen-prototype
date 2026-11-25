import { toISODate } from './dates'

/** Split a short visible interval across local calendar days. Long gaps are discarded
 * because a suspended tablet cannot prove that ads stayed visible. */
export function visiblePlaybackSegments(startMs: number, endMs: number): { date: string; minutes: number }[] {
  if (endMs <= startMs || endMs - startMs > 15_000) return []
  const result: { date: string; minutes: number }[] = []
  let cursor = startMs
  while (cursor < endMs) {
    const date = new Date(cursor)
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
    const end = Math.min(endMs, midnight)
    result.push({ date: toISODate(date), minutes: (end - cursor) / 60_000 })
    cursor = end
  }
  return result
}

export function formatPlaybackMinutes(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes + 1e-8))
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`
}
