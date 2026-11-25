import { describe, expect, it } from 'vitest'
import { formatPlaybackMinutes, visiblePlaybackSegments } from './playback'

describe('visible ad display time', () => {
  it('formats accumulated minutes as hours and minutes', () => {
    expect(formatPlaybackMinutes(125)).toBe('2 h 05 min')
    expect(formatPlaybackMinutes(0.9)).toBe('0 h 00 min')
  })
  it('splits display time at local midnight', () => {
    const start = new Date(2026, 10, 23, 23, 59, 55).getTime()
    expect(visiblePlaybackSegments(start, start + 10_000)).toEqual([
      { date: '2026-11-23', minutes: 5 / 60 }, { date: '2026-11-24', minutes: 5 / 60 },
    ])
  })
  it('does not count long gaps when a tablet may have suspended', () => {
    expect(visiblePlaybackSegments(0, 16_000)).toEqual([])
  })
})
