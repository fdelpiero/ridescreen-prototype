import { describe, expect, it } from 'vitest'
import type { ReportCheckContext, ReportCheckInput } from './reportCheck'
import { evaluateReport, ruleBasedChecker } from './ruleBasedCheck'

// Sunday 15 Nov 2026. The last finished week started Monday 2 Nov.
const TODAY = '2026-11-15'
const AT = '2026-11-15T03:00:00.000Z'

const goodInput: ReportCheckInput = {
  weekStart: '2026-11-02',
  hoursOnline: 40,
  hoursOnTrip: 30,
  trips: 90,
  file: { name: 'uber-week.pdf', type: 'application/pdf', size: 120_000 },
}
const goodContext: ReportCheckContext = {
  today: TODAY,
  driverStatus: 'active',
  alreadySubmittedWeeks: [],
  playbackHours: 28,
}

const run = (input: Partial<ReportCheckInput> = {}, context: Partial<ReportCheckContext> = {}) =>
  evaluateReport({ ...goodInput, ...input }, { ...goodContext, ...context }, AT)

describe('evaluateReport', () => {
  it('passes a report the tablet log backs up', () => {
    const result = run()
    expect(result.status).toBe('consistent')
    expect(result.coverage).toBeCloseTo(28 / 30)
    expect(result.method).toBe('rules-demo')
    expect(result.checkedAt).toBe(AT)
    expect(result.findings.every((f) => f.level === 'ok')).toBe(true)
  })

  it('treats exactly 80% playback coverage as consistent', () => {
    expect(run({}, { playbackHours: 24 }).status).toBe('consistent')
  })

  it('asks for review when playback covers 50-80% of trip hours', () => {
    expect(run({}, { playbackHours: 20 }).status).toBe('needs_review')
    expect(run({}, { playbackHours: 15 }).status).toBe('needs_review')
  })

  it('flags a large difference between the weekly totals', () => {
    const result = run({}, { playbackHours: 5 })
    expect(result.status).toBe('mismatch')
    expect(result.findings.some((f) => f.level === 'fail' && f.text.includes('weekly totals differ'))).toBe(true)
  })

  it('fails when trip hours exceed online hours', () => {
    expect(run({ hoursOnline: 20, hoursOnTrip: 30, trips: 90 }, { playbackHours: 30 }).status).toBe('mismatch')
  })

  it('fails more online hours than a week contains', () => {
    expect(run({ hoursOnline: 170 }).status).toBe('mismatch')
  })

  it('asks for review on unusually high online hours', () => {
    expect(run({ hoursOnline: 90 }).status).toBe('needs_review')
  })

  it('fails a duplicate week', () => {
    expect(run({}, { alreadySubmittedWeeks: ['2026-11-02'] }).status).toBe('mismatch')
  })

  it('fails a week in the future and a week that does not start on Monday', () => {
    expect(run({ weekStart: '2026-11-16' }).status).toBe('mismatch')
    expect(run({ weekStart: '2026-11-03' }).status).toBe('mismatch')
    expect(run({ weekStart: 'not-a-date' }).status).toBe('mismatch')
  })

  it('asks for review when the week is still in progress', () => {
    // Monday 9 Nov started the week that ends tonight (Sunday 15 Nov).
    expect(run({ weekStart: '2026-11-09' }).status).toBe('needs_review')
  })

  it('accepts a week the day after it ends', () => {
    expect(run({ weekStart: '2026-11-09' }, { today: '2026-11-16' }).status).toBe('consistent')
  })

  it('fails a missing, wrong-type or oversized file', () => {
    expect(run({ file: null }).status).toBe('mismatch')
    expect(run({ file: { name: 'x.exe', type: 'application/octet-stream', size: 10 } }).status).toBe('mismatch')
    expect(run({ file: { name: 'big.pdf', type: 'application/pdf', size: 50 * 1024 * 1024 } }).status).toBe('mismatch')
  })

  it('fails a driver who is not activated', () => {
    expect(run({}, { driverStatus: 'pending_review' }).status).toBe('mismatch')
  })

  it('asks for review when no trip hours were reported and leaves coverage empty', () => {
    const result = run({ hoursOnTrip: 0, trips: 0 })
    expect(result.status).toBe('needs_review')
    expect(result.coverage).toBeNull()
  })

  it('asks for review on implausible average trip length', () => {
    expect(run({ trips: 2000 }).status).toBe('needs_review')
    expect(run({ trips: 0 }).status).toBe('needs_review')
  })

  it('fails negative or non-numeric values', () => {
    expect(run({ hoursOnline: -1 }).status).toBe('mismatch')
    expect(run({ hoursOnTrip: Number.NaN }).status).toBe('mismatch')
  })
})

describe('ruleBasedChecker', () => {
  it('returns the same verdict through the ReportChecker interface', async () => {
    const result = await ruleBasedChecker.check(goodInput, goodContext)
    expect(result.status).toBe('consistent')
    expect(ruleBasedChecker.method).toBe('rules-demo')
  })
})
