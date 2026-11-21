import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, Link, Notice } from '../components/ui'
import { ready, store } from '../data'
import { DEMO_ACCOUNTS, matchDemoAccount } from '../data/demoAccounts'
import { SAMPLE_DRIVER_ID } from '../data/seed'
import { setSession } from '../data/session'
import { hashPassword } from '../lib/password'
import { navigate } from '../lib/router'

// One login for everyone: the demo accounts (admin / driver) or a driver's own
// email and password from sign-up. Each login replaces the previous role.
export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await ready
      if (username.trim().toLowerCase() === 'driver') {
        const sample = await store.getDriver(SAMPLE_DRIVER_ID)
        const matches = sample && (sample.passHash ? await hashPassword(password, sample.passSalt) === sample.passHash : password === 'driver')
        if (!matches) { setError('Username or password is not right.'); return }
        setSession({ driverId: SAMPLE_DRIVER_ID })
        navigate('/driver')
        return
      }
      const demo = matchDemoAccount(username, password)
      if (demo) {
        setSession(demo.session)
        navigate('admin' in demo.session ? '/admin' : '/driver')
        return
      }
      const driver = await store.findDriverByEmail(username)
      // Sample drivers have no password of their own; they open with the demo login.
      const matches = driver && driver.passHash !== '' && (await hashPassword(password, driver.passSalt)) === driver.passHash
      if (!driver || !matches) {
        setError('Username or password is not right.')
        return
      }
      setSession({ driverId: driver.id })
      navigate('/driver')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow stack">
      <h1>Log in</h1>
      <form className="card stack" onSubmit={submit} noValidate>
        <Field label="Email or username">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
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
        <h2>Demo logins</h2>
        <ul className="plain-list">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.username}>
              <strong>{account.label}:</strong> <code>{account.username}</code> / <code>{account.password}</code>
            </li>
          ))}
        </ul>
        <p className="field-hint">The sample driver password is driver until changed in Account or the demo is reset. Signed-up drivers use their own email and password in this browser.</p>
      </div>
      <p className="muted">
        New driver? <Link to="/driver/signup">Sign up</Link>
      </p>
    </div>
  )
}
