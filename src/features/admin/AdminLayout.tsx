import { Link } from '../../components/ui'
import { AdminAds } from './AdminAds'
import { AdminDrivers } from './AdminDrivers'
import { AdminOverview } from './AdminOverview'
import { AdminReports } from './AdminReports'
import { AdminSettings } from './AdminSettings'

const TABS = [
  { path: '/admin', label: 'Overview' },
  { path: '/admin/drivers', label: 'Drivers' },
  { path: '/admin/ads', label: 'Ads' },
  { path: '/admin/reports', label: 'Weekly reports' },
  { path: '/admin/settings', label: 'Settings' },
]

export function AdminLayout({ route }: { route: string }) {
  return (
    <div className="stack-lg">
      <nav className="tabs" aria-label="Admin sections">
        {TABS.map((tab) => (
          <Link key={tab.path} to={tab.path} className={`tab ${route === tab.path ? 'tab-current' : ''}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
      {route === '/admin/drivers' ? (
        <AdminDrivers />
      ) : route === '/admin/ads' ? (
        <AdminAds />
      ) : route === '/admin/reports' ? (
        <AdminReports />
      ) : route === '/admin/settings' ? (
        <AdminSettings />
      ) : (
        <AdminOverview />
      )}
    </div>
  )
}
