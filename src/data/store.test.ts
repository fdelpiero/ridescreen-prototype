import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Ad, Driver } from '../types'
import { idbKV, memoryKV } from './kv'
import { seedIfNeeded } from './seed'
import { DataStore } from './store'

const driver = (id: string, email: string): Driver => ({
  id, email, code: `D-${id}`, name: id, mobile: '', passSalt: '', passHash: '', status: 'awaiting_photo',
  createdAt: `2026-11-0${id.length}T00:00:00.000Z`,
})
const ad = (id: string, order: number): Ad => ({
  id, order, active: true, advertiser: id, offer: 'offer', qrUrl: 'https://example.com', image: 'data:,', createdAt: '',
})

describe.each([
  ['in memory', () => memoryKV()],
  ['IndexedDB', () => idbKV],
])('DataStore %s', (_name, makeKv) => {
  let store: DataStore

  beforeEach(async () => {
    store = new DataStore(makeKv())
    await store.clearAll()
  })

  it('saves, finds and updates drivers', async () => {
    await store.saveDriver(driver('a', 'A@Example.com'))
    expect((await store.findDriverByEmail(' a@example.com '))?.id).toBe('a')
    await store.saveDriver({ ...driver('a', 'A@Example.com'), status: 'active' })
    expect((await store.getDriver('a'))?.status).toBe('active')
    expect(await store.listDrivers()).toHaveLength(1)
    expect(await store.getDriver('missing')).toBeUndefined()
  })

  it('keeps ads in order, reorders and deletes them', async () => {
    await store.saveAd(ad('x', 1))
    await store.saveAd(ad('y', 2))
    await store.saveAd(ad('z', 3))
    await store.moveAd('z', -1)
    expect((await store.listAds()).map((a) => a.id)).toEqual(['x', 'z', 'y'])
    await store.moveAd('x', -1) // already first: no change
    await store.moveAd('y', 1) // already last: no change
    expect((await store.listAds()).map((a) => a.id)).toEqual(['x', 'z', 'y'])
    await store.deleteAd('z')
    expect((await store.listAds()).map((a) => a.id)).toEqual(['x', 'y'])
    expect(await store.nextAdOrder()).toBe(4)
  })

  it('returns default settings until some are saved', async () => {
    expect((await store.getSettings()).rotationSeconds).toBe(15)
    await store.saveSettings({ rotationSeconds: 30, weeklyPaymentAud: 300 })
    expect(await store.getSettings()).toEqual({ rotationSeconds: 30, weeklyPaymentAud: 300 })
  })

  it('adds up playback per week only', async () => {
    await store.addPlaybackMinutes('a', '2026-11-02', 60)
    await store.addPlaybackMinutes('a', '2026-11-02', 30)
    await store.addPlaybackMinutes('a', '2026-11-08', 90)
    await store.addPlaybackMinutes('a', '2026-11-09', 600) // next week
    await store.addPlaybackMinutes('b', '2026-11-03', 600) // another driver
    expect(await store.playbackHoursForWeek('a', '2026-11-02')).toBe(3)
    expect(await store.playbackHoursForWeek('a', '2026-10-26')).toBe(0)
  })

  it('keeps every minute when playback is logged at the same moment', async () => {
    await Promise.all([10, 20, 30].map((minutes) => store.addPlaybackMinutes('a', '2026-11-02', minutes)))
    expect(await store.playbackHoursForWeek('a', '2026-11-02')).toBe(1)
  })

  it('seeds the demo once, with a sample report the rules accept', async () => {
    await seedIfNeeded(store, '2026-11-15')
    await seedIfNeeded(store, '2026-11-15')
    expect(await store.listAds()).toHaveLength(5)
    const drivers = await store.listDrivers()
    expect(drivers.map((d) => d.status).sort()).toEqual(['active', 'pending_review'])
    const reports = await store.listReports()
    expect(reports).toHaveLength(1)
    expect(reports[0].weekStart).toBe('2026-11-02')
    expect(reports[0].check.status).toBe('consistent')
    expect(reports[0].playbackHours).toBeCloseTo(1900 / 60)
    expect(await store.listReportsForDriver('drv_sample_pending')).toHaveLength(0)
  })

  it('adds the new samples once to an existing demo without overwriting its ads', async () => {
    await store.markSeeded()
    await store.saveAd(ad('custom', 9))
    await seedIfNeeded(store, '2026-11-15')
    expect((await store.listAds()).map((item) => item.id)).toEqual(['custom', 'ad_sample_burger', 'ad_sample_fitness'])
    await store.deleteAd('ad_sample_burger')
    await seedIfNeeded(store, '2026-11-15')
    expect((await store.listAds()).map((item) => item.id)).toEqual(['custom', 'ad_sample_fitness'])
  })

  it('clears everything on reset', async () => {
    await seedIfNeeded(store, '2026-11-15')
    await store.clearAll()
    expect(await store.isSeeded()).toBe(false)
    expect(await store.listAds()).toHaveLength(0)
  })
})
