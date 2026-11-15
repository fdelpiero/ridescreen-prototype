import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { CheckStatusPill, DecisionPill, DriverStatusPill, Link, LoadError, Loading, Notice } from '../../components/ui'
import { store } from '../../data'
import { updateSession } from '../../data/session'
import { formatAbn } from '../../lib/abn'
import { formatWeek, mondayOf, today } from '../../lib/dates'
import { imageToDataUrl } from '../../lib/files'
import { formatAud, formatHours } from '../../lib/format'
import { navigate } from '../../lib/router'
import { useLoad } from '../../lib/useLoad'
import type { Driver } from '../../types'

export function DriverDashboard({ driverId }: { driverId: string }) {
  const { data, error, reload } = useLoad(async () => {
    const driver = await store.getDriver(driverId)
    if (!driver) return null
    const [reports, settings, weekHours] = await Promise.all([
      store.listReportsForDriver(driverId),
      store.getSettings(),
      store.playbackHoursForWeek(driverId, mondayOf(today())),
    ])
    return { driver, reports, settings, weekHours }
  }, driverId)

  // The driver was removed (demo reset in another tab): drop the stale login.
  useEffect(() => {
    if (data === null) {
      updateSession({ driverId: undefined })
      navigate('/driver/login', { replace: true })
    }
  }, [data])

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />
  const { driver, reports, settings, weekHours } = data
  const active = driver.status === 'active'

  return (
    <div className="stack-lg">
      <div className="row row-wrap row-between">
        <div>
          <h1>Hi {driver.name.split(' ')[0]}</h1>
          <p className="muted">
            Driver code <strong>{driver.code}</strong>
            {driver.abn && <> · ABN {formatAbn(driver.abn)}</>}
          </p>
        </div>
        <DriverStatusPill status={driver.status} />
      </div>

      {active ? (
        <section className="card card-accent stack">
          <div>
            <h2>You’re activated</h2>
            <p>Open the tablet screen at the start of your shift and leave it running while you drive.</p>
          </div>
          <div className="row row-wrap">
            <Link to="/player" className="btn btn-primary btn-large">
              Start showing ads
            </Link>
            <span className="muted">Tablet on this week: {formatHours(weekHours)}</span>
          </div>
        </section>
      ) : (
        <Activation driver={driver} onChange={reload} />
      )}

      {active && (
        <section className="card stack">
          <div className="row row-wrap row-between">
            <div>
              <h2>Weekly reports</h2>
              <p className="muted">
                Send your Uber weekly report after each week. An eligible week pays {formatAud(settings.weeklyPaymentAud)}{' '}
                (sample figure).
              </p>
            </div>
            <Link to="/driver/report" className="btn btn-primary">
              Send weekly report
            </Link>
          </div>
          {reports.length === 0 ? (
            <p className="muted">No reports sent yet.</p>
          ) : (
            <ul className="rows">
              {reports.map((report) => (
                <li key={report.id} className="row-item">
                  <div>
                    <strong>{formatWeek(report.weekStart)}</strong>
                    <div className="muted">
                      {formatHours(report.hoursOnTrip)} on trips · tablet on {formatHours(report.playbackHours)}
                    </div>
                  </div>
                  <div className="row row-wrap">
                    <CheckStatusPill status={report.check.status} />
                    <DecisionPill decision={report.decision} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function Activation({ driver, onChange }: { driver: Driver; onChange: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const needsPhoto = driver.status === 'awaiting_photo' || driver.status === 'rejected'

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      setPhoto(await imageToDataUrl(file))
    } catch (err) {
      setPhoto(null)
      setError(err instanceof Error ? err.message : 'Could not read that photo')
    }
  }

  async function send() {
    if (!photo) return
    setBusy(true)
    try {
      await store.saveDriver({
        ...driver,
        status: 'pending_review',
        tabletPhoto: photo,
        photoUploadedAt: new Date().toISOString(),
        reviewNote: undefined,
        reviewedAt: undefined,
      })
      setPhoto(null)
      onChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <h2>Get activated</h2>
      <ol className="steps">
        <li className="step step-done">
          <span className="step-mark">✓</span>
          <div>
            <strong>Account created</strong>
          </div>
        </li>
        <li className={`step ${needsPhoto ? 'step-current' : 'step-done'}`}>
          <span className="step-mark">{needsPhoto ? '2' : '✓'}</span>
          <div className="stack-sm grow">
            <strong>Photo of your mounted tablet</strong>
            {driver.status === 'rejected' && (
              <Notice tone="bad">
                Your photo was not accepted{driver.reviewNote ? `: ${driver.reviewNote}` : '.'} Please send a new one.
              </Notice>
            )}
            {needsPhoto ? (
              <>
                <p className="muted">Mount the tablet on the back of the front seat, facing the rear passengers, and take a photo that shows the whole seat.</p>
                <input type="file" accept="image/*" capture="environment" onChange={choose} aria-label="Tablet photo" />
                {photo && <img src={photo} alt="Your tablet photo" className="photo-preview" />}
                {error && <Notice tone="bad">{error}</Notice>}
                <div>
                  <button type="button" className="btn btn-primary" onClick={send} disabled={!photo || busy}>
                    {busy ? 'Sending…' : 'Send for approval'}
                  </button>
                </div>
              </>
            ) : (
              driver.tabletPhoto && <img src={driver.tabletPhoto} alt="Your tablet photo" className="photo-preview" />
            )}
          </div>
        </li>
        <li className={`step ${driver.status === 'pending_review' ? 'step-current' : ''}`}>
          <span className="step-mark">3</span>
          <div>
            <strong>Approval</strong>
            <p className="muted">
              {driver.status === 'pending_review'
                ? 'Your photo is with the team. You can start showing ads as soon as it’s approved.'
                : 'The team checks your photo before you can start.'}
            </p>
          </div>
        </li>
        <li className="step step-later">
          <span className="step-mark">+</span>
          <div>
            <strong>ID check</strong> <span className="pill pill-neutral">Later phase</span>
            <p className="muted">Identity documents are not collected in this prototype.</p>
          </div>
        </li>
      </ol>
    </section>
  )
}
