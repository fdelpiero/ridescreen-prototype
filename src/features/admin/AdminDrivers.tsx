import { useState } from 'react'
import { DriverStatusPill, LoadError, Loading } from '../../components/ui'
import { store } from '../../data'
import { formatAbn } from '../../lib/abn'
import { formatDateTime, mondayOf, today } from '../../lib/dates'
import { formatHours } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'
import type { Driver } from '../../types'

export function AdminDrivers() {
  const { data, error, reload } = useLoad(async () => {
    const drivers = await store.listDrivers()
    const week = mondayOf(today())
    const hours = await Promise.all(drivers.map((d) => store.playbackHoursForWeek(d.id, week)))
    // Drivers who need a decision come first.
    const rank = (d: Driver) => (d.status === 'pending_review' ? 0 : 1)
    return drivers.map((driver, i) => ({ driver, weekHours: hours[i] })).sort((a, b) => rank(a.driver) - rank(b.driver))
  })

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />

  return (
    <div className="stack">
      <div>
        <h1>Drivers</h1>
        <p className="muted">A driver can only start showing ads after you approve the photo of their mounted tablet.</p>
      </div>
      {data.length === 0 && <p className="muted">No drivers yet.</p>}
      {data.map(({ driver, weekHours }) => (
        <DriverCard key={driver.id} driver={driver} weekHours={weekHours} onChange={reload} />
      ))}
    </div>
  )
}

function DriverCard({ driver, weekHours, onChange }: { driver: Driver; weekHours: number; onChange: () => void }) {
  const [note, setNote] = useState('')
  const [zoom, setZoom] = useState(false)

  async function review(status: 'active' | 'rejected') {
    await store.saveDriver({
      ...driver,
      status,
      reviewNote: status === 'rejected' ? note.trim() || undefined : undefined,
      reviewedAt: new Date().toISOString(),
    })
    setNote('')
    onChange()
  }

  return (
    <article className="card driver-card">
      {driver.tabletPhoto ? (
        <button type="button" className="thumb-button" onClick={() => setZoom((z) => !z)} aria-label="Show the tablet photo larger">
          <img src={driver.tabletPhoto} alt={`Tablet photo from ${driver.name}`} className={zoom ? 'photo-large' : 'thumb'} />
        </button>
      ) : (
        <div className="thumb thumb-empty">No photo yet</div>
      )}
      <div className="stack-sm grow">
        <div className="row row-wrap row-between">
          <div>
            <strong>{driver.name}</strong> <span className="muted">· {driver.code}</span>
            {driver.isSample && <span className="pill pill-neutral">Sample</span>}
          </div>
          <DriverStatusPill status={driver.status} />
        </div>
        <div className="muted">
          {driver.email} · {driver.mobile}
          {driver.abn && <> · ABN {formatAbn(driver.abn)}</>}
        </div>
        <div className="muted">
          Signed up {formatDateTime(driver.createdAt)}
          {driver.status === 'active' && <> · tablet on this week: {formatHours(weekHours)}</>}
        </div>
        {driver.status === 'rejected' && driver.reviewNote && <div className="muted">Reason given: {driver.reviewNote}</div>}

        {driver.status === 'pending_review' && (
          <div className="row row-wrap">
            <button type="button" className="btn btn-primary btn-small" onClick={() => review('active')}>
              Approve
            </button>
            <input
              className="grow"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason, if rejecting (the driver sees this)"
              aria-label="Reason for rejecting"
            />
            <button type="button" className="btn btn-danger btn-small" onClick={() => review('rejected')}>
              Reject
            </button>
          </div>
        )}
        {driver.status === 'active' && (
          <div>
            <button type="button" className="btn btn-small" onClick={() => review('rejected')}>
              Deactivate (ask for a new photo)
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
