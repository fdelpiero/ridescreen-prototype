import { describe, expect, it } from 'vitest'
import { activeAdsInOrder, nextIndex } from '../features/player/rotation'
import type { Ad } from '../types'
import { formatAbn, isValidAbn } from './abn'
import { addDays, formatWeek, isMonday, isValidISODate, lastCompleteWeekStart, mondayOf, weekDates } from './dates'
import { newDriverCode, newId } from './ids'
import { hashPassword, newSalt } from './password'
import { buildOfferUrl, isHttpUrl } from './qr'

describe('ABN validation', () => {
  it('accepts a valid ABN with or without spaces', () => {
    expect(isValidAbn('51 824 753 556')).toBe(true)
    expect(isValidAbn('51824753556')).toBe(true)
  })

  it('rejects a wrong checksum, wrong length and non-digits', () => {
    expect(isValidAbn('51 824 753 557')).toBe(false)
    expect(isValidAbn('5182475355')).toBe(false)
    expect(isValidAbn('5182475355A')).toBe(false)
    expect(isValidAbn('')).toBe(false)
  })

  it('formats as 2-3-3-3', () => {
    expect(formatAbn('51824753556')).toBe('51 824 753 556')
  })
})

describe('week helpers', () => {
  it('finds the Monday of a week, including from a Sunday', () => {
    expect(mondayOf('2026-11-15')).toBe('2026-11-09')
    expect(mondayOf('2026-11-09')).toBe('2026-11-09')
    expect(mondayOf('2026-11-11')).toBe('2026-11-09')
  })

  it('finds the last finished week', () => {
    expect(lastCompleteWeekStart('2026-11-15')).toBe('2026-11-02')
    expect(lastCompleteWeekStart('2026-11-16')).toBe('2026-11-09')
  })

  it('lists seven days and crosses month and year ends', () => {
    expect(weekDates('2026-11-30')).toEqual([
      '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06',
    ])
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('validates dates', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isMonday('2026-11-09')).toBe(true)
    expect(isMonday('2026-11-10')).toBe(false)
  })

  it('formats a week range for display', () => {
    const text = formatWeek('2026-11-09')
    expect(text).toContain('9 Nov')
    expect(text).toContain('15 Nov 2026')
  })
})

describe('QR offer links', () => {
  it('tags the advertiser link and keeps its existing query', () => {
    const url = new URL(buildOfferUrl('https://example.com/offer?plan=a', { adId: 'ad_1', driverCode: 'D-ABC23' }))
    expect(url.origin + url.pathname).toBe('https://example.com/offer')
    expect(url.searchParams.get('plan')).toBe('a')
    expect(url.searchParams.get('utm_medium')).toBe('in-car-tablet')
    expect(url.searchParams.get('utm_campaign')).toBe('ad_1')
    expect(url.searchParams.get('ref')).toBe('D-ABC23')
  })

  it('only accepts http and https destinations', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('example.com')).toBe(false)
  })
})

describe('ids and passwords', () => {
  it('makes distinct ids and unambiguous driver codes', () => {
    expect(newId('ad')).not.toBe(newId('ad'))
    expect(newDriverCode()).toMatch(/^D-[2-9A-HJ-NP-Z]{5}$/)
  })

  it('hashes deterministically per salt and differently across salts', async () => {
    const salt = newSalt()
    expect(await hashPassword('correct horse', salt)).toBe(await hashPassword('correct horse', salt))
    expect(await hashPassword('correct horse', salt)).not.toBe(await hashPassword('wrong horse', salt))
    expect(await hashPassword('correct horse', salt)).not.toBe(await hashPassword('correct horse', newSalt()))
  })
})

describe('player rotation', () => {
  const ad = (id: string, order: number, active: boolean): Ad => ({
    id, order, active, advertiser: id, offer: '', qrUrl: 'https://example.com', image: '', createdAt: '',
  })

  it('plays only active ads in admin order', () => {
    const ads = [ad('c', 3, true), ad('a', 1, true), ad('b', 2, false)]
    expect(activeAdsInOrder(ads).map((a) => a.id)).toEqual(['a', 'c'])
  })

  it('wraps around and survives an empty list', () => {
    expect(nextIndex(0, 3)).toBe(1)
    expect(nextIndex(2, 3)).toBe(0)
    expect(nextIndex(0, 0)).toBe(0)
  })
})
