import type { ReportChecker } from '../checks/reportCheck'
import { ruleBasedChecker } from '../checks/ruleBasedCheck'
import { idbKV } from './kv'
import { seedIfNeeded } from './seed'
import { clearSession } from './session'
import { DataStore } from './store'

// The two swap points for Phase 2: a backend-backed store and an AI report reader.
export const store = new DataStore(idbKV)
export const checker: ReportChecker = ruleBasedChecker

/** Resolves once first-run demo data is in place. */
export const ready: Promise<void> = seedIfNeeded(store)

export async function resetDemo(): Promise<void> {
  await store.clearAll()
  clearSession()
  await seedIfNeeded(store)
}
