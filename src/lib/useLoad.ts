import { useCallback, useEffect, useRef, useState } from 'react'
import { ready } from '../data'

export interface Loaded<T> {
  data: T | undefined
  error: string | null
  reload: () => void
}

/**
 * Loads data for a screen once the demo data is seeded. Reloads when `key`
 * changes, when `reload()` is called, and when the tab regains focus, so a
 * change made in another tab (admin approves a driver) shows up on return.
 */
export function useLoad<T>(load: () => Promise<T>, key: string = ''): Loaded<T> {
  const [state, setState] = useState<{ key: string; data: T | undefined; error: string | null }>({ key, data: undefined, error: null })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  // Always call the latest closure without making it an effect dependency.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let cancelled = false
    ready
      .then(() => loadRef.current())
      .then(
        (data) => {
          if (!cancelled) setState({ key, data, error: null })
        },
        (err: unknown) => {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : String(err)
            // Keep what is on screen only if it belongs to the same key.
            setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: message }))
          }
        },
      )
    return () => {
      cancelled = true
    }
  }, [version, key])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  // While a new key is loading, the previous key's data must not be shown.
  if (state.key !== key) return { data: undefined, error: null, reload }
  return { data: state.data, error: state.error, reload }
}
