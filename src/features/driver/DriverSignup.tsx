import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, Link, Notice } from '../../components/ui'
import { ready, store } from '../../data'
import { updateSession } from '../../data/session'
import { isValidAbn, normaliseAbn } from '../../lib/abn'
import { newDriverCode, newId } from '../../lib/ids'
import { hashPassword, newSalt } from '../../lib/password'
import { navigate } from '../../lib/router'
import type { Driver } from '../../types'

type Errors = Partial<Record<'name' | 'email' | 'mobile' | 'abn' | 'password' | 'form', string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AU_MOBILE = /^(\+?61|0)4\d{8}$/

export function DriverSignup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [abn, setAbn] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    if (name.trim().length < 2) next.name = 'Enter your full name'
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address'
    if (!AU_MOBILE.test(mobile.replace(/[\s-]/g, ''))) next.mobile = 'Enter an Australian mobile, for example 0412 345 678'
    if (abn.trim() && !isValidAbn(abn)) next.abn = 'That ABN is not valid. Check the 11 digits, or leave it empty'
    if (password.length < 6) next.password = 'Use at least 6 characters'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await ready
      if (await store.findDriverByEmail(email)) {
        setErrors({ email: 'A driver with this email already exists. Log in instead' })
        return
      }
      const salt = newSalt()
      const driver: Driver = {
        id: newId('drv'),
        code: newDriverCode(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        abn: abn.trim() ? normaliseAbn(abn) : undefined,
        passSalt: salt,
        passHash: await hashPassword(password, salt),
        status: 'awaiting_photo',
        createdAt: new Date().toISOString(),
      }
      await store.saveDriver(driver)
      updateSession({ driverId: driver.id })
      navigate('/driver')
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not create the account' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="narrow stack">
      <div>
        <h1>Sign up as a driver</h1>
        <p className="muted">Takes about a minute. After this you’ll send a photo of your mounted tablet.</p>
      </div>
      <form className="card stack" onSubmit={submit} noValidate>
        <Field label="Full name" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        <Field label="Mobile" error={errors.mobile}>
          <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} autoComplete="tel" placeholder="0412 345 678" />
        </Field>
        <Field label="ABN (optional)" hint="Used to pay you as a contractor. You can add it later." error={errors.abn}>
          <input value={abn} onChange={(e) => setAbn(e.target.value)} inputMode="numeric" placeholder="11 digits" />
        </Field>
        <Field label="Password" hint="Prototype only: make one up, don’t reuse a real password." error={errors.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {errors.form && <Notice tone="bad">{errors.form}</Notice>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="muted">
        Already signed up? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
