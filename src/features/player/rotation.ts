import type { Ad } from '../../types'

/** The ads the player loops through: switched-on ads only, in the admin's order. */
export function activeAdsInOrder(ads: Ad[]): Ad[] {
  return ads.filter((ad) => ad.active).sort((a, b) => a.order - b.order)
}

export function nextIndex(current: number, count: number): number {
  return count <= 0 ? 0 : (current + 1) % count
}
