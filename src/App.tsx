import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from './components/ui'
import { APP_NAME } from './config'
import { clearSession, useSession } from './data/session'
import type { Session } from './data/session'
import { Landing } from './features/Landing'
import { AdminLayout } from './features/admin/AdminLayout'
import { DriverDashboard } from './features/driver/DriverDashboard'
import { DriverLogin } from './features/driver/DriverLogin'
import { DriverReport } from './features/driver/DriverReport'
import { DriverSignup } from './features/driver/DriverSignup'
import { Player } from './features/player/Player'
import { navigate, useRoute } from './lib/router'

const ADMIN_ROUTES = ['/admin', '/admin/drivers', '/admin/ads', '/admin/reports', '/admin/settings']

export default function App() {
  const route = useRoute()
  const session = useSession()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // The tablet screen fills the display, so it sits outside the normal page frame.
  if (route === '/player') return session.driverId ? <Player preview={false} /> : <Redirect to="/driver/login" />
  if (route === '/player/preview') return session.admin ? <Player preview /> : <Redirect to="/" />

  return <Shell session={session}>{page(route, session)}</Shell>
}

function page(route: string, session: Session): ReactNode {
  if (route === '/') return <Landing />
  if (route === '/driver/signup') return <DriverSignup />
  if (route === '/driver/login') return <DriverLogin />
  if (route === '/driver') {
    return session.driverId ? <DriverDashboard driverId={session.driverId} /> : <Redirect to="/driver/login" />
  }
  if (route === '/driver/report') {
    return session.driverId ? <DriverReport driverId={session.driverId} /> : <Redirect to="/driver/login" />
  }
  if (ADMIN_ROUTES.includes(route)) return session.admin ? <AdminLayout route={route} /> : <Redirect to="/" />
  return <NotFound />
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true })
  }, [to])
  return null
}

function NotFound() {
  return (
    <div className="narrow stack">
      <h1>Page not found</h1>
      <p className="muted">That address doesn’t match a screen in this prototype.</p>
      <div>
        <Link to="/" className="btn btn-primary">
          Back to the start
        </Link>
      </div>
    </div>
  )
}

function Shell({ session, children }: { session: Session; children: ReactNode }) {
  const signedIn = Boolean(session.driverId || session.admin)

  function logOut() {
    clearSession()
    navigate('/')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            {APP_NAME}
          </Link>
          <nav className="topnav" aria-label="Main">
            {session.driverId && <Link to="/driver">Driver</Link>}
            {session.admin && <Link to="/admin">Admin</Link>}
            {signedIn && (
              <button type="button" className="topnav-button" onClick={logOut}>
                Log out
              </button>
            )}
          </nav>
        </div>
      </header>
      <div className="banner" role="note">
        Prototype · data stays in this browser · don’t enter real personal details
      </div>
      <main className="container">{children}</main>
      <footer className="footer">Prototype by Matelab.ai</footer>
    </div>
  )
}
