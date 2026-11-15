import { SAMPLE_DRIVER_ID } from './seed'
import type { Session } from './session'

// Walk-through logins for demos. Not secret and not secure: they are printed on the
// login page. The real product replaces these with server-side accounts.
export const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin', label: 'Admin', session: { admin: true } },
  { username: 'driver', password: 'driver', label: 'Activated sample driver', session: { driverId: SAMPLE_DRIVER_ID } },
] as const satisfies readonly { username: string; password: string; label: string; session: Session }[]

export type DemoAccount = (typeof DEMO_ACCOUNTS)[number]

export function matchDemoAccount(username: string, password: string): DemoAccount | undefined {
  const name = username.trim().toLowerCase()
  return DEMO_ACCOUNTS.find((account) => account.username === name && account.password === password)
}
