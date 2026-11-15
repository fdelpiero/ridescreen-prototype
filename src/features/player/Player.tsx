import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from '../../components/ui'
import { APP_NAME, HEARTBEAT_MS } from '../../config'
import { store } from '../../data'
import { useSession } from '../../data/session'
import { today } from '../../lib/dates'
import { buildOfferUrl } from '../../lib/qr'
import { navigate } from '../../lib/router'
import { useLoad } from '../../lib/useLoad'
import type { Ad } from '../../types'
import { activeAdsInOrder } from './rotation'

const EXIT_HOLD_MS = 2000
const EMPTY_RETRY_MS = 30_000

/**
 * The screen passengers see. `preview` lets the admin look at the loop without
 * a driver account and without logging any playback.
 */
export function Player({ preview }: { preview: boolean }) {
  const session = useSession()
  const driverId = preview ? undefined : session.driverId
  const exitTo = preview ? '/admin/ads' : '/driver'

  const { data, error, reload } = useLoad(async () => {
    const [ads, settings, driver] = await Promise.all([
      store.listAds(),
      store.getSettings(),
      driverId ? store.getDriver(driverId) : Promise.resolve(undefined),
    ])
    return { ads: activeAdsInOrder(ads), settings, driver }
  }, driverId ?? 'preview')

  // Only a first load that fails is fatal. If a background reload fails while
  // the loop is running, keep playing what is already on the tablet.
  if (error && !data) {
    return (
      <PlayerMessage title="The tablet screen could not load" backTo={exitTo}>
        {error}
      </PlayerMessage>
    )
  }
  if (!data) return <PlayerMessage title="Loading…" />

  if (!preview && data.driver?.status !== 'active') {
    return (
      <PlayerMessage title="This tablet isn’t activated yet" backTo="/driver">
        Ads start once the photo of your mounted tablet has been approved.
      </PlayerMessage>
    )
  }
  if (data.ads.length === 0) {
    return (
      <PlayerMessage title="No ads are switched on right now" backTo={exitTo} retry={reload}>
        This screen checks again every 30 seconds and starts by itself when an ad is switched on.
      </PlayerMessage>
    )
  }

  return (
    <PlayerScreen
      ads={data.ads}
      rotationSeconds={data.settings.rotationSeconds}
      driverCode={data.driver?.code ?? 'PREVIEW'}
      logDriverId={preview ? null : (data.driver?.id ?? null)}
      exitTo={exitTo}
      onLoopEnd={reload}
    />
  )
}

function PlayerMessage({
  title,
  backTo,
  retry,
  children,
}: {
  title: string
  backTo?: string
  retry?: () => void
  children?: React.ReactNode
}) {
  useEffect(() => {
    if (!retry) return
    const id = window.setInterval(retry, EMPTY_RETRY_MS)
    return () => window.clearInterval(id)
  }, [retry])

  return (
    <div className="player-message">
      <div className="stack">
        <h1>{title}</h1>
        {children && <p>{children}</p>}
        {backTo && (
          <div>
            <Link to={backTo} className="btn">
              Back
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function offerUrl(ad: Ad, driverCode: string): string {
  try {
    return buildOfferUrl(ad.qrUrl, { adId: ad.id, driverCode })
  } catch {
    return ad.qrUrl
  }
}

function PlayerScreen({
  ads,
  rotationSeconds,
  driverCode,
  logDriverId,
  exitTo,
  onLoopEnd,
}: {
  ads: Ad[]
  rotationSeconds: number
  driverCode: string
  logDriverId: string | null
  exitTo: string
  onLoopEnd: () => void
}) {
  const [started, setStarted] = useState(false)
  const [tick, setTick] = useState(0)
  const [qrImages, setQrImages] = useState<Record<string, string>>({})
  const online = useOnline()
  const wakeLockSupported = 'wakeLock' in navigator

  const count = ads.length
  const index = tick % count
  const current = ads[index]

  // Advance one ad at a time. At the end of each loop, pick up any changes the
  // admin made (new ads, new order, new timing) without interrupting playback.
  useEffect(() => {
    if (!started) return
    const id = window.setTimeout(() => {
      const next = tick + 1
      if (next % count === 0) onLoopEnd()
      setTick(next)
    }, rotationSeconds * 1000)
    return () => window.clearTimeout(id)
  }, [started, count, rotationSeconds, tick, onLoopEnd])

  // QR codes are drawn once per playlist, not on every rotation. The effect is
  // keyed on the link text so a background reload that changes nothing is free.
  const qrTargets = JSON.stringify(ads.map((ad) => [ad.id, offerUrl(ad, driverCode)]))
  useEffect(() => {
    let cancelled = false
    const targets = JSON.parse(qrTargets) as [string, string][]
    Promise.all(
      targets.map(async ([adId, url]) => {
        try {
          return [adId, await QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: 'M' })] as const
        } catch {
          return [adId, ''] as const
        }
      }),
    ).then((entries) => {
      if (!cancelled) setQrImages(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [qrTargets])

  // Keep the tablet awake. The lock is dropped by the browser whenever the tab
  // is hidden, so ask again each time it comes back.
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!started || !('wakeLock' in navigator)) return
    const request = () => {
      navigator.wakeLock.request('screen').then(
        (lock) => {
          wakeLock.current = lock
        },
        () => {
          // Refused (battery saver, for example). The start screen already tells
          // the driver to set the screen timeout to Never as a fallback.
        },
      )
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }
    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      wakeLock.current?.release().catch(() => {})
      wakeLock.current = null
    }
  }, [started])

  // Proof of play: one minute logged for each minute the ads were really on screen.
  useEffect(() => {
    if (!started || !logDriverId) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      store.addPlaybackMinutes(logDriverId, today(), HEARTBEAT_MS / 60_000).catch(() => {})
    }, HEARTBEAT_MS)
    return () => window.clearInterval(id)
  }, [started, logDriverId])

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    navigate(exitTo)
  }, [exitTo])

  // Leaving by the browser's back button should not leave the tablet stuck in full screen.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exit])

  // Hidden exit: passengers can't leave the loop with a stray tap.
  const holdTimer = useRef<number | null>(null)
  const cancelHold = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }, [])
  const beginHold = () => {
    cancelHold()
    holdTimer.current = window.setTimeout(exit, EXIT_HOLD_MS)
  }
  useEffect(() => cancelHold, [cancelHold])

  function start() {
    // Start the ads first. Full screen is a nice-to-have: some browsers refuse the
    // request and some never answer it, and neither should hold up the loop.
    setStarted(true)
    try {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } catch {
      // No full-screen support here. The ads still play.
    }
  }

  return (
    <div className="player">
      <div className="player-stage">
        {ads.map((ad, i) => (
          <div key={ad.id} className={`slide ${i === index ? 'slide-current' : ''}`} aria-hidden={i !== index}>
            <img src={ad.image} alt="" className="slide-backdrop" />
            <img src={ad.image} alt={`${ad.advertiser}: ${ad.offer}`} className="slide-image" />
          </div>
        ))}
        <div className="player-badges">
          {!logDriverId && <span className="player-badge">Preview · playback is not logged</span>}
          {!online && <span className="player-badge">Offline · ads still playing</span>}
        </div>
      </div>

      <aside className="player-panel">
        <div key={current.id} className="panel-content">
          <div className="panel-kicker">Rider-exclusive offer</div>
          <div className="panel-offer">{current.offer}</div>
          {qrImages[current.id] ? (
            <img src={qrImages[current.id]} alt={`QR code for the ${current.advertiser} offer`} className="panel-qr" />
          ) : (
            <div className="panel-qr" />
          )}
          <div className="panel-scan">Scan with your phone camera</div>
          <div className="panel-advertiser">{current.advertiser}</div>
        </div>
        <div className="panel-foot">
          {APP_NAME} · {driverCode}
        </div>
      </aside>

      {started && (
        <div className="player-progress" aria-hidden="true">
          <div key={tick} className="player-progress-bar" style={{ animationDuration: `${rotationSeconds}s` }} />
        </div>
      )}

      <button
        type="button"
        className="player-exit"
        aria-label="Hold for 2 seconds to leave the tablet screen"
        onPointerDown={beginHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
      />

      {!started && (
        <div className="player-overlay">
          <div className="stack">
            <h1>{APP_NAME}</h1>
            <p>
              {count} ad{count === 1 ? '' : 's'} · {rotationSeconds} seconds each
            </p>
            <div>
              <button type="button" className="btn btn-primary btn-large" onClick={start}>
                Tap to start
              </button>
            </div>
            <p className="player-hint">To leave this screen later, hold the bottom-left corner for 2 seconds.</p>
            {!wakeLockSupported && (
              <p className="player-hint">
                This browser can’t keep the screen awake by itself. Set the tablet’s screen timeout to “Never”.
              </p>
            )}
            <div>
              <Link to={exitTo} className="btn btn-ghost player-back">
                Back
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
