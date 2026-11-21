import { DEFAULT_SETTINGS } from '../config'
import { weekDates } from '../lib/dates'
import type { Ad, Driver, PlaybackLog, Settings, WeeklyReport } from '../types'
import type { KV } from './kv'

const DRIVER = 'driver:'
const AD = 'ad:'
const REPORT = 'report:'
const PLAYBACK = 'playback:'
const SETTINGS = 'settings'
const SEEDED = 'meta:seeded'
const SAMPLE_ADS_V2 = 'meta:sample-ads-v2'
const SAMPLE_PHOTOS_V2 = 'meta:sample-photos-v3'
const SAMPLE_ARTWORK_V2 = 'meta:sample-artwork-v2'

/**
 * Everything the screens know about persistence. The prototype backs it with the
 * browser's IndexedDB; Phase 2 replaces this class with one that talks to a real
 * backend and keeps the same methods.
 */
export class DataStore {
  private readonly kv: KV

  constructor(kv: KV) {
    this.kv = kv
  }

  private async list<T>(prefix: string): Promise<T[]> {
    const all = await this.kv.entries()
    return all.filter(([key]) => key.startsWith(prefix)).map(([, value]) => value as T)
  }

  async hasSampleAdsV2(): Promise<boolean> {
    return Boolean(await this.kv.get(SAMPLE_ADS_V2))
  }

  markSampleAdsV2(): Promise<void> {
    return this.kv.set(SAMPLE_ADS_V2, true)
  }

  async hasSamplePhotosV2(): Promise<boolean> {
    return Boolean(await this.kv.get(SAMPLE_PHOTOS_V2))
  }

  markSamplePhotosV2(): Promise<void> {
    return this.kv.set(SAMPLE_PHOTOS_V2, true)
  }

  async hasSampleArtworkV2(): Promise<boolean> {
    return Boolean(await this.kv.get(SAMPLE_ARTWORK_V2))
  }

  markSampleArtworkV2(): Promise<void> {
    return this.kv.set(SAMPLE_ARTWORK_V2, true)
  }

  // Drivers
  async listDrivers(): Promise<Driver[]> {
    const drivers = await this.list<Driver>(DRIVER)
    return drivers.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  getDriver(id: string): Promise<Driver | undefined> {
    return this.kv.get<Driver>(DRIVER + id)
  }

  async findDriverByEmail(email: string): Promise<Driver | undefined> {
    const wanted = email.trim().toLowerCase()
    return (await this.listDrivers()).find((d) => d.email.toLowerCase() === wanted)
  }

  saveDriver(driver: Driver): Promise<void> {
    return this.kv.set(DRIVER + driver.id, driver)
  }

  // Ads
  async listAds(): Promise<Ad[]> {
    const ads = await this.list<Ad>(AD)
    return ads.sort((a, b) => a.order - b.order)
  }

  saveAd(ad: Ad): Promise<void> {
    return this.kv.set(AD + ad.id, ad)
  }

  deleteAd(id: string): Promise<void> {
    return this.kv.del(AD + id)
  }

  async nextAdOrder(): Promise<number> {
    const ads = await this.listAds()
    return ads.length === 0 ? 1 : ads[ads.length - 1].order + 1
  }

  /** Swap an ad with its neighbour in the rotation. `direction` -1 moves it earlier. */
  async moveAd(id: string, direction: -1 | 1): Promise<void> {
    const ads = await this.listAds()
    const from = ads.findIndex((a) => a.id === id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= ads.length) return
    const [a, b] = [ads[from], ads[to]]
    await this.saveAd({ ...a, order: b.order })
    await this.saveAd({ ...b, order: a.order })
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...(await this.kv.get<Partial<Settings>>(SETTINGS)) }
  }

  saveSettings(settings: Settings): Promise<void> {
    return this.kv.set(SETTINGS, settings)
  }

  // Weekly reports
  async listReports(): Promise<WeeklyReport[]> {
    const reports = await this.list<WeeklyReport>(REPORT)
    return reports.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }

  async listReportsForDriver(driverId: string): Promise<WeeklyReport[]> {
    return (await this.listReports()).filter((r) => r.driverId === driverId)
  }

  saveReport(report: WeeklyReport): Promise<void> {
    return this.kv.set(REPORT + report.id, report)
  }

  // Playback log
  async getPlayback(driverId: string): Promise<PlaybackLog> {
    return (await this.kv.get<PlaybackLog>(PLAYBACK + driverId)) ?? {}
  }

  // Adding minutes is read-then-write, so writes are queued one after another.
  // This covers one tab; two tabs logging at once needs a server-side counter.
  private playbackQueue: Promise<void> = Promise.resolve()

  addPlaybackMinutes(driverId: string, isoDate: string, minutes: number): Promise<void> {
    const write = this.playbackQueue.then(async () => {
      const log = await this.getPlayback(driverId)
      log[isoDate] = (log[isoDate] ?? 0) + minutes
      await this.kv.set(PLAYBACK + driverId, log)
    })
    this.playbackQueue = write.catch(() => {})
    return write
  }

  async playbackHoursForWeek(driverId: string, weekStart: string): Promise<number> {
    const log = await this.getPlayback(driverId)
    const minutes = weekDates(weekStart).reduce((total, day) => total + (log[day] ?? 0), 0)
    return minutes / 60
  }

  // Lifecycle
  async isSeeded(): Promise<boolean> {
    return (await this.kv.get<boolean>(SEEDED)) === true
  }

  markSeeded(): Promise<void> {
    return this.kv.set(SEEDED, true)
  }

  clearAll(): Promise<void> {
    return this.kv.clear()
  }
}
