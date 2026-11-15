import { evaluateReport } from '../checks/ruleBasedCheck'
import { DEFAULT_SETTINGS } from '../config'
import { lastCompleteWeekStart, today, weekDates } from '../lib/dates'
import type { Ad, Driver, WeeklyReport } from '../types'
import type { DataStore } from './store'

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

interface CreativeSpec {
  from: string
  to: string
  ink: string
  accent: string
  kicker: string
  lines: string[]
  footer: string
}

/** A placeholder ad creative drawn as SVG, so the demo ships with no image files. */
function creative(spec: CreativeSpec): string {
  const lines = spec.lines
    .map((line, i) => `<text x="110" y="${430 + i * 135}" font-size="118" font-weight="800" fill="${spec.ink}">${line}</text>`)
    .join('')
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${spec.from}"/><stop offset="1" stop-color="${spec.to}"/></linearGradient></defs>` +
      `<rect width="1600" height="1000" fill="url(#g)"/>` +
      `<circle cx="1380" cy="190" r="330" fill="${spec.accent}" opacity="0.18"/>` +
      `<circle cx="1500" cy="900" r="240" fill="${spec.accent}" opacity="0.12"/>` +
      `<rect x="110" y="150" width="84" height="12" rx="6" fill="${spec.accent}"/>` +
      `<text x="110" y="250" font-size="44" font-weight="700" letter-spacing="6" fill="${spec.accent}">${spec.kicker}</text>` +
      lines +
      `<text x="110" y="890" font-size="46" font-weight="500" fill="${spec.ink}" opacity="0.8">${spec.footer}</text>` +
      `</svg>`,
  )
}

const SAMPLE_TABLET_PHOTO = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" font-family="system-ui, sans-serif">` +
    `<rect width="1200" height="900" fill="#3a3f4a"/>` +
    `<rect x="330" y="40" width="540" height="820" rx="90" fill="#22252c"/>` +
    `<rect x="500" y="0" width="60" height="120" fill="#17191e"/><rect x="640" y="0" width="60" height="120" fill="#17191e"/>` +
    `<rect x="390" y="300" width="420" height="280" rx="18" fill="#0d0e11"/>` +
    `<rect x="404" y="314" width="392" height="252" rx="8" fill="#f5a524"/>` +
    `<rect x="430" y="350" width="170" height="26" fill="#16181d"/><rect x="430" y="394" width="120" height="16" fill="#16181d"/>` +
    `<rect x="670" y="350" width="100" height="100" fill="#16181d"/>` +
    `<text x="600" y="700" text-anchor="middle" font-size="34" fill="#c9ccd3">Sample photo: tablet mounted on the seat back</text>` +
    `</svg>`,
)

const SAMPLE_ADS: Omit<Ad, 'createdAt'>[] = [
  {
    id: 'ad_sample_finance',
    advertiser: 'Sample Finance Broker',
    offer: 'Riders get a free 30-minute home loan health check',
    qrUrl: 'https://example.com/finance-offer',
    active: true,
    order: 1,
    image: creative({
      from: '#0f2a43',
      to: '#1c4d6b',
      ink: '#ffffff',
      accent: '#7fd6c2',
      kicker: 'SAMPLE FINANCE BROKER',
      lines: ['Home loan sorted', 'in days, not weeks.'],
      footer: 'Placeholder creative for the prototype',
    }),
  },
  {
    id: 'ad_sample_spirits',
    advertiser: 'Sample Spirits Co.',
    offer: '5% off your first order, plus free delivery',
    qrUrl: 'https://example.com/spirits-offer',
    active: true,
    order: 2,
    image: creative({
      from: '#2b1408',
      to: '#6b2f12',
      ink: '#fff4e2',
      accent: '#f5a524',
      kicker: 'SAMPLE SPIRITS CO.',
      lines: ['Small-batch spirits,', 'delivered to your door.'],
      footer: 'Placeholder creative for the prototype',
    }),
  },
  {
    id: 'ad_sample_cafe',
    advertiser: 'Sample Corner Café',
    offer: 'Free coffee with any breakfast this week',
    qrUrl: 'https://example.com/cafe-offer',
    active: true,
    order: 3,
    image: creative({
      from: '#f3e7d3',
      to: '#e3c9a1',
      ink: '#2a1d10',
      accent: '#b2501c',
      kicker: 'SAMPLE CORNER CAFÉ',
      lines: ['Your morning coffee', 'is on us.'],
      footer: 'Placeholder creative for the prototype',
    }),
  },
]

export const SAMPLE_DRIVER_ID = 'drv_sample_active'

/** Minutes of playback per day (Mon to Sun) for the sample driver's last full week. */
const SAMPLE_PLAYBACK_MINUTES = [300, 280, 0, 310, 330, 420, 260]

const SAMPLE_REPORT_CSV = 'week_start,hours_online,hours_on_trip,trips\nSAMPLE,39.5,33.0,96\n'

/**
 * First-run demo data: three placeholder ads, an activated sample driver with one
 * checked weekly report, and a second driver waiting for approval. Runs once.
 */
export async function seedIfNeeded(store: DataStore, todayIso: string = today()): Promise<void> {
  if (await store.isSeeded()) return
  const now = new Date().toISOString()

  for (const ad of SAMPLE_ADS) await store.saveAd({ ...ad, createdAt: now })
  await store.saveSettings({ ...DEFAULT_SETTINGS })

  const activeDriver: Driver = {
    id: SAMPLE_DRIVER_ID,
    code: 'D-SAMPLE',
    name: 'Sam Sample',
    email: 'sample.driver@example.com',
    mobile: '0400 000 000',
    passSalt: '',
    passHash: '',
    status: 'active',
    tabletPhoto: SAMPLE_TABLET_PHOTO,
    photoUploadedAt: now,
    reviewedAt: now,
    isSample: true,
    createdAt: now,
  }
  const pendingDriver: Driver = {
    id: 'drv_sample_pending',
    code: 'D-SAMPLE2',
    name: 'Pat Pending',
    email: 'pending.driver@example.com',
    mobile: '0400 000 001',
    passSalt: '',
    passHash: '',
    status: 'pending_review',
    tabletPhoto: SAMPLE_TABLET_PHOTO,
    photoUploadedAt: now,
    isSample: true,
    createdAt: now,
  }
  await store.saveDriver(activeDriver)
  await store.saveDriver(pendingDriver)

  const weekStart = lastCompleteWeekStart(todayIso)
  const days = weekDates(weekStart)
  for (let i = 0; i < days.length; i++) {
    if (SAMPLE_PLAYBACK_MINUTES[i] > 0) await store.addPlaybackMinutes(activeDriver.id, days[i], SAMPLE_PLAYBACK_MINUTES[i])
  }

  const playbackHours = await store.playbackHoursForWeek(activeDriver.id, weekStart)
  const file = { name: 'sample-weekly-report.csv', type: 'text/csv', size: SAMPLE_REPORT_CSV.length }
  const input = { weekStart, hoursOnline: 39.5, hoursOnTrip: 33, trips: 96, file }
  const check = evaluateReport(input, { today: todayIso, driverStatus: 'active', alreadySubmittedWeeks: [], playbackHours }, now)
  const report: WeeklyReport = {
    id: 'rep_sample',
    driverId: activeDriver.id,
    weekStart,
    hoursOnline: input.hoursOnline,
    hoursOnTrip: input.hoursOnTrip,
    trips: input.trips,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileDataUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_REPORT_CSV)}`,
    playbackHours,
    check,
    decision: 'pending',
    submittedAt: now,
  }
  await store.saveReport(report)

  await store.markSeeded()
}
