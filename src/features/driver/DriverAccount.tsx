import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, LoadError, Loading, Notice } from '../../components/ui'
import { store } from '../../data'
import { SAMPLE_DRIVER_ID } from '../../data/seed'
import { hashPassword, newSalt } from '../../lib/password'
import { useLoad } from '../../lib/useLoad'

export function DriverAccount({ driverId }: { driverId: string }) {
  const { data: driver, error, reload } = useLoad(() => store.getDriver(driverId), driverId)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  if (error) return <LoadError message={error} />
  if (driver === undefined) return <Loading />
  if (!driver) return <p>Account not found. Please log in again.</p>

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (!driver) return
    setProblem(''); setMessage(''); setBusy(true)
    try {
      const correct = driver.id === SAMPLE_DRIVER_ID && !driver.passHash
        ? current === 'driver'
        : !!driver.passHash && await hashPassword(current, driver.passSalt) === driver.passHash
      if (!correct) { setProblem('Your current password is not correct.'); return }
      if (next.length < 6) { setProblem('Use at least 6 characters for the new password.'); return }
      if (next !== confirmation) { setProblem('The new passwords do not match.'); return }
      const salt = newSalt()
      await store.saveDriver({ ...driver, passSalt: salt, passHash: await hashPassword(next, salt) })
      setCurrent(''); setNext(''); setConfirmation(''); setMessage('Password changed for this browser.'); reload()
    } catch { setProblem('Could not change your password. Please try again.') }
    finally { setBusy(false) }
  }

  return <div className="stack-lg">
    <div><h1>Account</h1><p className="muted">Manage your account and payment details.</p></div>
    <DemoBankDetails />
    <form className="card stack" onSubmit={changePassword}>
      <h2>Change password</h2>
      <p className="muted">Prototype only: use a made-up password. Your login stays in this browser.</p>
      <Field label="Current password"><input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required /></Field>
      <Field label="New password" hint="At least 6 characters."><input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" required /></Field>
      <Field label="Confirm new password"><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /></Field>
      {problem && <Notice tone="bad">{problem}</Notice>}
      {message && <Notice tone="ok">{message}</Notice>}
      <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  </div>
}

function DemoBankDetails() {
  const [name, setName] = useState('')
  const [bsb, setBsb] = useState('')
  const [account, setAccount] = useState('')
  const [exampleSaved, setExampleSaved] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setName('')
    setBsb('')
    setAccount('')
    setExampleSaved(true)
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div>
        <h2>Bank details</h2>
        <p className="muted">Demo only: use made-up details. Do not enter your real bank information.</p>
      </div>
      <Field label="Account name">
        <input value={name} onChange={(event) => { setName(event.target.value); setExampleSaved(false) }} placeholder="e.g. Alex Sample" required autoComplete="off" />
      </Field>
      <Field label="BSB">
        <input value={bsb} onChange={(event) => { setBsb(event.target.value); setExampleSaved(false) }} placeholder="e.g. 000-000" required autoComplete="off" inputMode="numeric" />
      </Field>
      <Field label="Account number">
        <input value={account} onChange={(event) => { setAccount(event.target.value); setExampleSaved(false) }} placeholder="e.g. 12345678" required autoComplete="off" inputMode="numeric" />
      </Field>
      {exampleSaved && <Notice tone="ok">Example submitted. No bank details were saved and no payment can be made.</Notice>}
      <div><button type="submit" className="btn btn-primary">Submit example details</button></div>
    </form>
  )
}

