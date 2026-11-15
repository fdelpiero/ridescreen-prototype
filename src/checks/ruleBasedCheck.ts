import { REPORT_ACCEPTED_TYPES, REPORT_MAX_BYTES } from '../config'
import { addDays, isMonday, isValidISODate } from '../lib/dates'
import type { CheckResult, CheckStatus, Finding, ReportCheckContext, ReportCheckInput, ReportChecker } from './reportCheck'

/** Playback must cover at least this share of on-trip hours to pass without review. */
export const COVERAGE_OK = 0.8
/** Below this share the report is treated as not matching what the tablet recorded. */
export const COVERAGE_REVIEW = 0.5
export const HOURS_IN_WEEK = 168
/** Online hours above this are possible but unusual enough for a person to look at. */
export const HIGH_ONLINE_HOURS = 84
const MIN_AVG_TRIP_MINUTES = 3
const MAX_AVG_TRIP_MINUTES = 90

function oneDecimal(n: number): string {
  return n.toFixed(1)
}

export function evaluateReport(input: ReportCheckInput, context: ReportCheckContext, checkedAt: string): CheckResult {
  const findings: Finding[] = []
  const ok = (text: string) => findings.push({ level: 'ok', text })
  const warn = (text: string) => findings.push({ level: 'warn', text })
  const fail = (text: string) => findings.push({ level: 'fail', text })

  if (context.driverStatus !== 'active') {
    fail('This driver is not activated, so the week cannot be paid.')
  }

  if (!input.file) {
    fail('No report file was attached.')
  } else if (!REPORT_ACCEPTED_TYPES.includes(input.file.type)) {
    fail(`The file "${input.file.name}" is not a PDF, image or CSV.`)
  } else if (input.file.size > REPORT_MAX_BYTES) {
    fail(`The file "${input.file.name}" is larger than the upload limit.`)
  } else {
    ok(`Report file "${input.file.name}" received.`)
  }

  if (!isValidISODate(input.weekStart) || !isMonday(input.weekStart)) {
    fail('The reported week must start on a Monday.')
  } else if (input.weekStart > context.today) {
    fail('The reported week is in the future.')
  } else if (addDays(input.weekStart, 7) > context.today) {
    warn('The reported week has not finished yet.')
  } else {
    ok('The reported week has finished.')
  }

  if (context.alreadySubmittedWeeks.includes(input.weekStart)) {
    fail('A report for this week was already submitted.')
  }

  const hoursAreNumbers = [input.hoursOnline, input.hoursOnTrip, input.trips].every((n) => Number.isFinite(n) && n >= 0)
  let coverage: number | null = null

  if (!hoursAreNumbers) {
    fail('Hours and trips must be zero or more.')
  } else {
    if (input.hoursOnline > HOURS_IN_WEEK) {
      fail(`${oneDecimal(input.hoursOnline)} hours online is more than there are in a week.`)
    } else if (input.hoursOnline > HIGH_ONLINE_HOURS) {
      warn(`${oneDecimal(input.hoursOnline)} hours online is unusually high.`)
    }

    if (input.hoursOnTrip > input.hoursOnline) {
      fail('Hours on trips are higher than hours online.')
    } else if (input.hoursOnline <= HOURS_IN_WEEK) {
      ok('Hours on trips fit within hours online.')
    }

    if (input.hoursOnTrip === 0) {
      warn('No hours on trips were reported, so no passengers saw ads.')
    } else {
      if (input.trips === 0) {
        warn('Hours on trips were reported but no trips.')
      } else {
        const avgMinutes = (input.hoursOnTrip * 60) / input.trips
        if (avgMinutes < MIN_AVG_TRIP_MINUTES || avgMinutes > MAX_AVG_TRIP_MINUTES) {
          warn(`Average trip length of ${Math.round(avgMinutes)} minutes is unusual.`)
        }
      }

      coverage = context.playbackHours / input.hoursOnTrip
      const summary = `The tablet showed ads for ${oneDecimal(context.playbackHours)} h against ${oneDecimal(input.hoursOnTrip)} h on trips (${Math.round(coverage * 100)}%).`
      if (coverage >= COVERAGE_OK) ok(summary)
      else if (coverage >= COVERAGE_REVIEW) warn(`${summary} Some trips ran without ads on screen.`)
      else fail(`${summary} The tablet was off for most of the driving.`)
    }
  }

  let status: CheckStatus = 'consistent'
  if (findings.some((f) => f.level === 'fail')) status = 'mismatch'
  else if (findings.some((f) => f.level === 'warn')) status = 'needs_review'

  return { status, coverage, findings, method: 'rules-demo', checkedAt }
}

/** The prototype's checker: fixed rules, no AI, and it does not read the file's contents. */
export const ruleBasedChecker: ReportChecker = {
  method: 'rules-demo',
  async check(input, context) {
    return evaluateReport(input, context, new Date().toISOString())
  },
}
