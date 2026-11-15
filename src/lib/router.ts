import { useSyncExternalStore } from 'react'

// A tiny hash router (#/admin/ads). Hash routes need no server rewrites, so the
// app works from any static host and from the offline cache.

function currentPath(): string {
  const hash = window.location.hash.slice(1)
  return hash.startsWith('/') ? hash : '/'
}

function subscribe(notify: () => void): () => void {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentPath)
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.location.replace(`#${path}`)
  else window.location.hash = path
}
