import originalTabletPhoto from '../assets/demo/tablet-mounted.jpg'
import activeTabletPhoto from '../assets/demo/tablet-active-ad.jpg'
import pendingTabletPhoto from '../assets/demo/tablet-pending-ad.jpg'
import financePhoto from '../assets/demo/finance.jpg'
import drinksPhoto from '../assets/demo/drinks.jpg'
import cafePhoto from '../assets/demo/cafe.jpg'
import burgerPhoto from '../assets/demo/burger.jpg'
import fitnessPhoto from '../assets/demo/fitness.jpg'
import { evaluateReport } from '../checks/ruleBasedCheck'
import { DEFAULT_SETTINGS } from '../config'
import { lastCompleteWeekStart, today, weekDates } from '../lib/dates'
import type { Ad, Driver, WeeklyReport } from '../types'
import type { DataStore } from './store'

const SAMPLE_ADS: Omit<Ad, 'createdAt'>[] = [
  {
    id: 'ad_sample_finance',
    advertiser: 'Harbour Home Loans',
    offer: 'Riders get a free 30-minute home loan health check',
    qrUrl: 'https://example.com/finance-offer',
    active: true,
    order: 1,
    image: financePhoto,
  },
  {
    id: 'ad_sample_spirits',
    advertiser: 'Sunset Spritz Co.',
    offer: '5% off your first order, plus free delivery',
    qrUrl: 'https://example.com/spirits-offer',
    active: true,
    order: 2,
    image: drinksPhoto,
  },
  {
    id: 'ad_sample_cafe',
    advertiser: 'Corner & Co. Café',
    offer: 'Free coffee with any breakfast this week',
    qrUrl: 'https://example.com/cafe-offer',
    active: true,
    order: 3,
    image: cafePhoto,
  },
  {
    id: 'ad_sample_burger',
    advertiser: 'The Burger Yard',
    offer: 'Riders get 15% off their first burger',
    qrUrl: 'https://example.com/burger-offer',
    active: true,
    order: 4,
    image: burgerPhoto,
  },
  {
    id: 'ad_sample_fitness',
    advertiser: 'Coastline Fitness',
    offer: 'Try your first fitness class free',
    qrUrl: 'https://example.com/fitness-offer',
    active: true,
    order: 5,
    image: fitnessPhoto,
  },
]

export const SAMPLE_DRIVER_ID = 'drv_sample_active'

/** Minutes of playback per day (Mon to Sun) for the sample driver's last full week. */
const SAMPLE_PLAYBACK_MINUTES = [300, 280, 0, 310, 330, 420, 260]

const SAMPLE_REPORT_CSV = 'week_start,hours_online,hours_on_trip,trips\nSAMPLE,39.5,33.0,96\n'

/**
 * First-run demo data: five sample ads, an activated sample driver with one
 * checked weekly report, and a second driver waiting for approval. Runs once.
 */
export async function seedIfNeeded(store: DataStore, todayIso: string = today()): Promise<void> {
  if (await store.isSeeded()) {
    if (!await store.hasSampleAdsV2()) {
      const ads = await store.listAds()
      let order = ads.reduce((max, ad) => Math.max(max, ad.order), 0)
      for (const sample of SAMPLE_ADS.filter((ad) => ['ad_sample_burger', 'ad_sample_fitness'].includes(ad.id))) {
        if (!ads.some((ad) => ad.id === sample.id)) {
          await store.saveAd({ ...sample, order: ++order, createdAt: new Date().toISOString() })
        }
      }
      await store.markSampleAdsV2()
    }
    if (!await store.hasSampleArtworkV2()) {
      const originalNames: Record<string, string> = {
        ad_sample_finance: 'Sample Finance Broker',
        ad_sample_spirits: 'Sample Spirits Co.',
        ad_sample_cafe: 'Sample Corner Café',
      }
      for (const existing of await store.listAds()) {
        const sample = SAMPLE_ADS.find((ad) => ad.id === existing.id)
        // Only replace the original built-in SVG; never overwrite a driver's uploaded image.
        if (!sample || !originalNames[existing.id] || !existing.image.startsWith('data:image/svg+xml')) continue
        let svg = ''
        try { svg = decodeURIComponent(existing.image.slice(existing.image.indexOf(',') + 1)) } catch { continue }
        if (!svg.includes('Placeholder creative for the prototype')) continue
        await store.saveAd({ ...existing, image: sample.image,
          advertiser: existing.advertiser === originalNames[existing.id] ? sample.advertiser : existing.advertiser })
      }
      await store.markSampleArtworkV2()
    }
    if (!await store.hasSamplePhotosV2()) {
      for (const [id, photo] of [['drv_sample_active', activeTabletPhoto], ['drv_sample_pending', pendingTabletPhoto]] as const) {
        const driver = await store.getDriver(id)
        if (driver?.isSample && driver.tabletPhoto === originalTabletPhoto) {
          await store.saveDriver({ ...driver, tabletPhoto: photo })
        }
      }
      await store.markSamplePhotosV2()
    }
    return
  }
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
    tabletPhoto: activeTabletPhoto,
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
    tabletPhoto: pendingTabletPhoto,
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

  await store.markSampleAdsV2()
  await store.markSampleArtworkV2()
  await store.markSamplePhotosV2()
  await store.markSeeded()
}
