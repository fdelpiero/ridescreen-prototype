// Working title only: the product has no brand name yet. Change it here
// (and the matching constant in vite.config.ts, which feeds the install manifest).
export const APP_NAME = 'RideScreen'
export const APP_TAGLINE = 'In-car tablet advertising for rideshare drivers'

export const ROTATION_OPTIONS = [15, 30] as const
export type RotationSeconds = (typeof ROTATION_OPTIONS)[number]

export const DEFAULT_SETTINGS = {
  rotationSeconds: 15 as RotationSeconds,
  // Sample figure for the demo only. Driver pay is a business decision, not a product default.
  weeklyPaymentAud: 250,
}

// How often the player records "ads were on screen" for the logged-in driver.
export const HEARTBEAT_MS = 5_000

// Upload limits keep the browser database small on cheap tablets.
export const IMAGE_MAX_DIMENSION = 1600
export const IMAGE_JPEG_QUALITY = 0.82
export const REPORT_MAX_BYTES = 5 * 1024 * 1024
export const REPORT_ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/csv']
