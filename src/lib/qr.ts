import { APP_NAME } from '../config'

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * The link a rider's phone opens when it scans the QR code: the advertiser's own
 * page, tagged so the advertiser can see the visit came from an in-car tablet and
 * which driver's car it was. The driver code is pseudonymous.
 */
export function buildOfferUrl(qrUrl: string, tags: { adId: string; driverCode: string }): string {
  const url = new URL(qrUrl)
  url.searchParams.set('utm_source', APP_NAME.toLowerCase())
  url.searchParams.set('utm_medium', 'in-car-tablet')
  url.searchParams.set('utm_campaign', tags.adId)
  url.searchParams.set('ref', tags.driverCode)
  return url.toString()
}
