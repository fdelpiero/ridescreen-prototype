const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export function formatAud(amount: number): string {
  return `${aud.format(amount)} AUD`
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} h`
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
