import type { DriverStatus } from '../types'

export type CheckStatus = 'consistent' | 'needs_review' | 'mismatch'

export interface Finding {
  level: 'ok' | 'warn' | 'fail'
  text: string
}

export interface ReportCheckInput {
  /** Monday of the reported week, YYYY-MM-DD. */
  weekStart: string
  hoursOnline: number
  hoursOnTrip: number
  trips: number
  file: { name: string; type: string; size: number } | null
}

export interface ReportCheckContext {
  today: string
  driverStatus: DriverStatus
  /** Weeks this driver has already reported. */
  alreadySubmittedWeeks: string[]
  /** Hours the tablet player logged ads on screen during the reported week. */
  playbackHours: number
}

export interface CheckResult {
  status: CheckStatus
  /** Tablet playback hours divided by on-trip hours, or null when it cannot be computed. */
  coverage: number | null
  findings: Finding[]
  /** 'rules-demo' = the prototype's deterministic rules. 'ai' is reserved for the Phase 2 document reader. */
  method: 'rules-demo' | 'ai'
  checkedAt: string
}

/**
 * The seam for Phase 2: an AI document reader that extracts the hours from the
 * uploaded Uber report implements this same interface, and no screen changes.
 */
export interface ReportChecker {
  readonly method: CheckResult['method']
  check(input: ReportCheckInput, context: ReportCheckContext): Promise<CheckResult>
}
