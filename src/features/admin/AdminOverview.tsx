import { Link, LoadError, Loading } from '../../components/ui'
import { store } from '../../data'
import { mondayOf, today } from '../../lib/dates'
import { formatHours } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'

export function AdminOverview() {
  const { data, error } = useLoad(async () => {
    const [drivers, ads, reports, settings] = await Promise.all([
      store.listDrivers(),
      store.listAds(),
      store.listReports(),
      store.getSettings(),
    ])
    const week = mondayOf(today())
    const hours = await Promise.all(drivers.map((d) => store.playbackHoursForWeek(d.id, week)))
    return {
      pendingDrivers: drivers.filter((d) => d.status === 'pending_review').length,
      activeDrivers: drivers.filter((d) => d.status === 'active').length,
      activeAds: ads.filter((a) => a.active).length,
      totalAds: ads.length,
      pendingReports: reports.filter((r) => r.decision === 'pending').length,
      hoursThisWeek: hours.reduce((sum, h) => sum + h, 0),
      rotationSeconds: settings.rotationSeconds,
    }
  })

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />

  return (
    <div className="stack-lg">
      <h1>Admin overview</h1>
      <div className="grid-4">
        <Link to="/admin/drivers" className="card stat">
          <span className="stat-value">{data.pendingDrivers}</span>
          <span className="stat-label">Drivers waiting for approval</span>
        </Link>
        <Link to="/admin/drivers" className="card stat">
          <span className="stat-value">{data.activeDrivers}</span>
          <span className="stat-label">Active drivers</span>
        </Link>
        <Link to="/admin/ads" className="card stat">
          <span className="stat-value">
            {data.activeAds}
            <small> of {data.totalAds}</small>
          </span>
          <span className="stat-label">Ads switched on · {data.rotationSeconds}s each</span>
        </Link>
        <Link to="/admin/reports" className="card stat">
          <span className="stat-value">{data.pendingReports}</span>
          <span className="stat-label">Reports awaiting a decision</span>
        </Link>
      </div>
      <section className="card row row-wrap row-between">
        <div>
          <h2>Tablets this week</h2>
          <p className="muted">{formatHours(data.hoursThisWeek)} of ads on screen across all drivers since Monday.</p>
        </div>
        <Link to="/player/preview" className="btn">
          Preview the tablet screen
        </Link>
      </section>
    </div>
  )
}
