import { describe, expect, it } from 'vitest'
import { matchDemoAccount } from './demoAccounts'
import { SAMPLE_DRIVER_ID } from './seed'

describe('matchDemoAccount', () => {
  it('opens the admin area with admin / admin', () => {
    expect(matchDemoAccount('admin', 'admin')?.session).toEqual({ admin: true })
  })

  it('opens the sample driver with driver / driver, ignoring case and spaces in the username', () => {
    expect(matchDemoAccount(' Driver ', 'driver')?.session).toEqual({ driverId: SAMPLE_DRIVER_ID })
  })

  it('rejects a wrong password and unknown names', () => {
    expect(matchDemoAccount('admin', 'Admin')).toBeUndefined()
    expect(matchDemoAccount('admin', '')).toBeUndefined()
    expect(matchDemoAccount('someone@example.com', 'admin')).toBeUndefined()
  })
})
