import { useState } from 'react'
import type { FormEvent } from 'react'
import { Field, LoadError, Loading, Notice } from '../../components/ui'
import { resetDemo, store } from '../../data'
import { formatAud } from '../../lib/format'
import { navigate } from '../../lib/router'
import { useLoad } from '../../lib/useLoad'

export function AdminSettings() {
  const { data: settings, error, reload } = useLoad(() => store.getSettings())
  const [payment, setPayment] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  if (error) return <LoadError message={error} />
  if (!settings) return <Loading />
  const paymentText = payment ?? String(settings.weeklyPaymentAud)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    const amount = Number(paymentText)
    if (paymentText.trim() === '' || !Number.isFinite(amount) || amount < 0) {
      setFieldError('Enter an amount in dollars, zero or more')
      return
    }
    setFieldError(undefined)
    await store.saveSettings({ ...settings, weeklyPaymentAud: Math.round(amount) })
    setPayment(null)
    setSaved(true)
    reload()
  }

  async function reset() {
    await resetDemo()
    navigate('/')
  }

  return (
    <div className="stack-lg">
      <h1>Settings</h1>

      <form className="card stack narrow-card" onSubmit={save} noValidate>
        <h2>Weekly driver payment</h2>
        <p className="muted">
          Shown to drivers as what an eligible week pays. Currently {formatAud(settings.weeklyPaymentAud)}. This is a sample
          figure: the prototype does not pay anyone.
        </p>
        <Field label="Amount per eligible week (AUD)" error={fieldError}>
          <input
            className="input-short"
            value={paymentText}
            onChange={(e) => {
              setPayment(e.target.value)
              setSaved(false)
            }}
            inputMode="numeric"
          />
        </Field>
        {saved && <Notice tone="ok">Saved.</Notice>}
        <div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>

      <section className="card stack narrow-card">
        <h2>Rotation speed</h2>
        <p className="muted">
          Each ad shows for {settings.rotationSeconds} seconds. Change it on the <a href="#/admin/ads">Ads</a> page.
        </p>
      </section>

      <section className="card stack narrow-card">
        <h2>Reset demo data</h2>
        <p className="muted">Deletes every driver, ad and report stored in this browser and restores the starting samples.</p>
        <div className="row row-wrap">
          {confirmReset ? (
            <>
              <button type="button" className="btn btn-danger" onClick={reset}>
                Yes, reset everything
              </button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
