import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, Link, Notice } from '../../components/ui'
import { ready, store } from '../../data'
import { SAMPLE_DRIVER_ID } from '../../data/seed'
import { updateSession } from '../../data/session'
import { hashPassword } from '../../lib/password'
import { navigate } from '../../lib/router'

export function DriverLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await ready
      const driver = await store.findDriverByEmail(email)
      // Sample drivers have no password and can only be opened with the button below.
      const matches = driver && driver.passHash !== '' && (await hashPassword(password, driver.passSalt)) === driver.passHash
      if (!driver || !matches) {
        setError('Email or password is not right.')
        return
      }
      updateSession({ driverId: driver.id })
      navigate('/driver')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  async function sampleLogin() {
    await ready
    updateSession({ driverId: SAMPLE_DRIVER_ID })
    navigate('/driver')
  }

  return (
    <div className="narrow stack">
      <h1>Driver log in</h1>
      <form className="card stack" onSubmit={submit} noValidate>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <div className="card stack-sm">
        <p className="muted">Just looking around? The sample driver is already activated and has a report on file.</p>
        <button type="button" className="btn" onClick={sampleLogin}>
          Log in as the sample driver
        </button>
      </div>
      <p className="muted">
        New here? <Link to="/driver/signup">Sign up as a driver</Link>
      </p>
    </div>
  )
}
