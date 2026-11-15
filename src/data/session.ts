import { useSyncExternalStore } from 'react'

// Who is using this browser right now. Kept in localStorage so a tablet that
// reloads (or loses power) comes back as the same driver without a connection.
export interface Session {
  driverId?: string
  admin?: boolean
}

const KEY = 'ridescreen.session'
const EMPTY: Session = {}
const listeners = new Set<() => void>()

let cachedRaw: string | null = null
let cachedSession: Session = EMPTY

function read(): Session {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cachedSession
  }
  if (raw === cachedRaw) return cachedSession
  cachedRaw = raw
  try {
    cachedSession = raw ? (JSON.parse(raw) as Session) : EMPTY
  } catch {
    cachedSession = EMPTY
  }
  return cachedSession
}

export function getSession(): Session {
  return read()
}

export function setSession(next: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage blocked (private window): keep the session for this page load only.
    cachedSession = next
  }
  listeners.forEach((notify) => notify())
}

export function updateSession(patch: Session): void {
  setSession({ ...read(), ...patch })
}

export function clearSession(): void {
  setSession({})
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, read)
}
