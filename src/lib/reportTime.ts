/** Accept decimal hours or the hours-and-minutes shown in Uber's summary. */
export function parseReportHours(text: string): number | null {
  const value = text.trim()
  const hm = /^(\d+)\s*(?::|h\s*)(\d{1,2})\s*m?$/i.exec(value)
  if (hm) return Number(hm[2]) < 60 ? Number(hm[1]) + Number(hm[2]) / 60 : null
  if (!/^\d+(\.\d+)?$/.test(value)) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
