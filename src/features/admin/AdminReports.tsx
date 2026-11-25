import { useState } from 'react'
import { CheckSummary, DecisionPill, LoadError, Loading } from '../../components/ui'
import { store } from '../../data'
import { formatDateTime, formatWeek } from '../../lib/dates'
import { formatBytes } from '../../lib/files'
import { formatAud, formatHours } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'
import type { ReportDecision, WeeklyReport } from '../../types'

export function AdminReports() {
  const { data, error, reload } = useLoad(async () => {
    const [reports, drivers, settings] = await Promise.all([store.listReports(), store.listDrivers(), store.getSettings()])
    const names = new Map(drivers.map((d) => [d.id, `${d.name} · ${d.code}`]))
    return { reports, names, settings }
  })

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />
  const { reports, names, settings } = data

  return (
    <div className="stack">
      <div>
        <h1>Weekly reports</h1>
        <p className="muted">
          The check compares weekly totals; it does not verify trip-by-trip overlap or read the uploaded file. You make the final call on whether a week is paid ({formatAud(settings.weeklyPaymentAud)}{' '}
          per eligible week, sample figure). No money moves in this prototype.
        </p>
      </div>
      {reports.length === 0 && <p className="muted">No reports have been sent yet.</p>}
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} driverLabel={names.get(report.driverId) ?? 'Removed driver'} onChange={reload} />
      ))}
    </div>
  )
}

function ReportCard({ report, driverLabel, onChange }: { report: WeeklyReport; driverLabel: string; onChange: () => void }) {
  const [confirmOverride, setConfirmOverride] = useState(false)

  async function decide(decision: ReportDecision) {
    await store.saveReport({ ...report, decision, decisionAt: decision === 'pending' ? undefined : new Date().toISOString() })
    setConfirmOverride(false)
    onChange()
  }

  return (
    <article className="card stack">
      <div className="row row-wrap row-between">
        <div>
          <strong>{driverLabel}</strong>
          <div className="muted">Week of {formatWeek(report.weekStart)} · sent {formatDateTime(report.submittedAt)}</div>
        </div>
        <DecisionPill decision={report.decision} />
      </div>

      <dl className="facts">
        <div>
          <dt>Hours online</dt>
          <dd>{formatHours(report.hoursOnline)}</dd>
        </div>
        <div>
          <dt>Uber Active time</dt>
          <dd>{formatHours(report.hoursOnTrip)}</dd>
        </div>
        <div>
          <dt>Trips</dt>
          <dd>{report.trips}</dd>
        </div>
        <div>
          <dt>Tablet on</dt>
          <dd>{formatHours(report.playbackHours)}</dd>
        </div>
      </dl>

      <CheckSummary check={report.check} />

      <div className="row row-wrap row-between">
        <a href={report.fileDataUrl} download={report.fileName} className="btn btn-small">
          Download {report.fileName} ({formatBytes(report.fileSize)})
        </a>
        <div className="row row-wrap">
          {report.decision !== 'pending' ? (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => decide('pending')}>
              Undo decision
            </button>
          ) : confirmOverride ? (
            <>
              <span>The check found a mismatch. Mark as eligible anyway?</span>
              <button type="button" className="btn btn-primary btn-small" onClick={() => decide('eligible')}>
                Yes, eligible
              </button>
              <button type="button" className="btn btn-small" onClick={() => setConfirmOverride(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => (report.check.status === 'mismatch' ? setConfirmOverride(true) : decide('eligible'))}
              >
                Mark payment eligible
              </button>
              <button type="button" className="btn btn-small" onClick={() => decide('not_eligible')}>
                Not eligible
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
