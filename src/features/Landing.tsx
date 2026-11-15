import { useState } from 'react'
import { Link, Notice } from '../components/ui'
import { APP_NAME, APP_TAGLINE } from '../config'
import { resetDemo } from '../data'
import { useSession } from '../data/session'

export function Landing() {
  const session = useSession()
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function reset() {
    await resetDemo()
    setConfirmReset(false)
    setMessage('Demo data has been reset to the starting sample.')
  }

  return (
    <div className="stack-lg">
      <section className="hero">
        <p className="kicker">Clickable prototype</p>
        <h1>{APP_NAME}</h1>
        <p className="lead">{APP_TAGLINE}. Drivers mount a tablet behind the front seat, riders see ads with an exclusive offer, and drivers earn a weekly payment.</p>
      </section>

      {message && <Notice tone="ok">{message}</Notice>}

      <section className="grid-3">
        <article className="card role-card">
          <h2>Driver</h2>
          <p className="muted">Sign up, send a photo of the mounted tablet, start showing ads and send the weekly report.</p>
          <div className="stack-sm">
            {session.driverId ? (
              <Link to="/driver" className="btn btn-primary">
                Continue as driver
              </Link>
            ) : (
              <>
                <Link to="/driver/signup" className="btn btn-primary">
                  Sign up as a driver
                </Link>
                <Link to="/login" className="btn">
                  Log in
                </Link>
                <p className="field-hint">
                  Demo login: <code>driver</code> / <code>driver</code> (already activated)
                </p>
              </>
            )}
          </div>
        </article>

        <article className="card role-card">
          <h2>Admin</h2>
          <p className="muted">Approve drivers, upload ads, set how fast they rotate and review weekly reports.</p>
          <div className="stack-sm">
            {session.admin ? (
              <Link to="/admin" className="btn btn-primary">
                Open admin
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">
                  Log in as admin
                </Link>
                <p className="field-hint">
                  Demo login: <code>admin</code> / <code>admin</code>. The real product has a secure admin login.
                </p>
              </>
            )}
          </div>
        </article>

        <article className="card role-card">
          <h2>Tablet screen</h2>
          <p className="muted">What riders see in the back seat: the ad loop with a QR code for the offer.</p>
          <div className="stack-sm">
            <Link to={session.admin ? '/player/preview' : '/login'} className="btn btn-primary">
              Preview the tablet screen
            </Link>
            <p className="field-hint">Needs the admin login. Preview mode does not count towards any driver’s hours.</p>
          </div>
        </article>
      </section>

      <section className="card">
        <h2>Suggested walk-through</h2>
        <ol className="walkthrough">
          <li>
            <strong>Driver:</strong> sign up, then send a photo of the mounted tablet.
          </li>
          <li>
            <strong>Admin:</strong> approve the driver, upload an ad and choose 15 or 30 second rotation.
          </li>
          <li>
            <strong>Driver:</strong> tap “Start showing ads” to run the tablet screen. Scan a QR code with a phone.
          </li>
          <li>
            <strong>Driver:</strong> send the weekly Uber report and see the consistency check.
          </li>
          <li>
            <strong>Admin:</strong> review the report and mark the week as payment eligible.
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>About this prototype</h2>
        <ul className="plain-list">
          <li>Everything is stored in this browser only. Driver, admin and tablet screen need to be shown on the same device.</li>
          <li>Logins are for demonstration and are not secure. Please don’t enter real personal details.</li>
          <li>The weekly report check uses fixed rules. It does not read the uploaded file yet.</li>
          <li>Not included yet: scan counts, payments, location targeting, ID checks and any link to Uber.</li>
        </ul>
        <div className="row row-wrap">
          {confirmReset ? (
            <>
              <span>Delete all drivers, ads and reports in this browser and restore the samples?</span>
              <button type="button" className="btn btn-danger btn-small" onClick={reset}>
                Yes, reset
              </button>
              <button type="button" className="btn btn-small" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-small" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
