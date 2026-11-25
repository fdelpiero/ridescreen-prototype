import { describe, expect, it } from 'vitest'
import { parseReportHours } from './reportTime'
describe('Uber summary time', () => {
  it('accepts hours and minutes and decimal hours', () => {
    expect(parseReportHours('15 h 44 m')).toBeCloseTo(15 + 44 / 60)
    expect(parseReportHours('13:20')).toBeCloseTo(13 + 20 / 60)
    expect(parseReportHours('12.5')).toBe(12.5)
  })
  it('rejects invalid minutes and nonstandard numbers', () => {
    expect(parseReportHours('13:60')).toBeNull()
    expect(parseReportHours('1e2')).toBeNull()
    expect(parseReportHours('')).toBeNull()
  })
})
