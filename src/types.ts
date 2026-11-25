import type { CheckResult } from './checks/reportCheck'
import type { RotationSeconds } from './config'

export type DriverStatus = 'awaiting_photo' | 'pending_review' | 'active' | 'rejected'

export interface Driver {
  id: string
  /** Short pseudonymous code carried in QR links for attribution. */
  code: string
  name: string
  email: string
  mobile: string
  abn?: string
  /** Demo-grade login: salted SHA-256, stored only in this browser. Empty for the sample driver. */
  passSalt: string
  passHash: string
  status: DriverStatus
  /** Photo of the tablet mounted in the car, as a data URL. */
  tabletPhoto?: string
  photoUploadedAt?: string
  reviewNote?: string
  reviewedAt?: string
  isSample?: boolean
  createdAt: string
}

export interface Ad {
  id: string
  advertiser: string
  /** Rider-exclusive offer shown next to the QR code. */
  offer: string
  /** Where the QR code sends the rider. */
  qrUrl: string
  /** Creative as a data URL. */
  image: string
  active: boolean
  order: number
  createdAt: string
}

export interface Settings {
  rotationSeconds: RotationSeconds
  weeklyPaymentAud: number
}

export type ReportDecision = 'pending' | 'eligible' | 'not_eligible'

export interface WeeklyReport {
  id: string
  driverId: string
  /** Monday of the reported week, YYYY-MM-DD. */
  weekStart: string
  hoursOnline: number
  hoursOnTrip: number
  trips: number
  fileName: string
  fileType: string
  fileSize: number
  fileDataUrl: string
  /** Tablet playback hours logged for that week at the time of the check. */
  playbackHours: number
  check: CheckResult
  decision: ReportDecision
  decisionAt?: string
  submittedAt: string
}

/** Minutes of ad playback per local calendar day, keyed YYYY-MM-DD. */
export type PlaybackLog = Record<string, number>

/** A tablet player session; missing endedAt means an end was not recorded. */
export interface TabletSession {
  id: string
  driverId: string
  startedAt: string
  endedAt?: string
}
