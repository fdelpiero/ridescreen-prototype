import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CheckSummary, Field, Link, LoadError, Loading, Notice } from '../../components/ui'
import { REPORT_ACCEPTED_TYPES, REPORT_MAX_BYTES } from '../../config'
import { checker, store } from '../../data'
import { addDays, formatWeek, lastCompleteWeekStart, mondayOf, today, weekDates } from '../../lib/dates'
import { formatBytes, readAsDataUrl, reportFileType } from '../../lib/files'
import { formatHours } from '../../lib/format'
import { newId } from '../../lib/ids'
import { parseReportHours } from '../../lib/reportTime'
import { formatPlaybackMinutes } from '../../lib/playback'
import { useLoad } from '../../lib/useLoad'
import type { WeeklyReport } from '../../types'

type Errors = Partial<Record<'week' | 'hoursOnline' | 'hoursOnTrip' | 'trips' | 'file' | 'form', string>>

const MAX_SIMULATED_HOURS = 100

function parseAmount(text: string): number | null {
  // Plain decimals only: Number() alone would also accept "1e3" and "0x10".
  if (!/^\d+(\.\d+)?$/.test(text.trim())) return null
  const value = Number(text.trim())
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function DriverReport({ driverId }: { driverId: string }) {
  const todayIso = today()
  const thisWeek = mondayOf(todayIso)
  // The current week (allowed, but flagged as unfinished) and the four before it.
  const weeks = [0, 1, 2, 3, 4].map((n) => addDays(thisWeek, -7 * n))

  const [chosenWeek, setChosenWeek] = useState<string | null>(null)
  const [hoursOnline, setHoursOnline] = useState('')
  const [hoursOnTrip, setHoursOnTrip] = useState('')
  const [trips, setTrips] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState<WeeklyReport | null>(null)
  const [simulateHours, setSimulateHours] = useState('10')
  const [simulateError, setSimulateError] = useState('')

  const { data, error, reload } = useLoad(async () => {
    const [driver, reports, hours] = await Promise.all([
      store.getDriver(driverId),
      store.listReportsForDriver(driverId),
      Promise.all(weeks.map((week) => store.playbackHoursForWeek(driverId, week))),
    ])
    const playbackByWeek: Record<string, number> = Object.fromEntries(weeks.map((week, i) => [week, hours[i]]))
    return { driver, submittedWeeks: reports.map((r) => r.weekStart), playbackByWeek }
  }, driverId)

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />
  const { driver, submittedWeeks, playbackByWeek } = data

  // Open on the most recent finished week that still needs a report.
  const firstOpenWeek = weeks.find((week) => week !== thisWeek && !submittedWeeks.includes(week))
  const weekStart = chosenWeek ?? firstOpenWeek ?? lastCompleteWeekStart(todayIso)
  const playbackHours = playbackByWeek[weekStart] ?? 0

  if (!driver || driver.status !== 'active') {
    return (
      <div className="narrow stack">
        <Notice tone="warn">Weekly reports open once your tablet photo has been approved.</Notice>
        <Link to="/driver" className="btn">
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="narrow stack">
        <h1>Report sent</h1>
        <section className="card stack">
          <div>
            <strong>{formatWeek(submitted.weekStart)}</strong>
            <div className="muted">
              {formatPlaybackMinutes(submitted.hoursOnline * 60)} online · {formatPlaybackMinutes(submitted.hoursOnTrip * 60)} active · {submitted.trips} trips
            </div>
          </div>
          <CheckSummary check={submitted.check} />
          <p className="muted">The team reviews every report before a week is marked as payment eligible.</p>
        </section>
        <Link to="/driver" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    )
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setErrors((e) => ({ ...e, file: undefined }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!driver) return
    const online = parseReportHours(hoursOnline)
    const onTrip = parseReportHours(hoursOnTrip)
    const tripCount = parseAmount(trips)
    const fileType = file ? reportFileType(file.name, file.type) : ''

    const next: Errors = {}
    if (submittedWeeks.includes(weekStart)) next.week = 'You already sent a report for this week'
    if (online === null) next.hoursOnline = 'Enter Online time, for example 15:44'
    if (onTrip === null) next.hoursOnTrip = 'Enter Active time, for example 13:20'
    if (tripCount === null || !Number.isInteger(tripCount)) next.trips = 'Enter the number of trips as a whole number'
    if (!file) next.file = 'Attach your weekly report'
    else if (!REPORT_ACCEPTED_TYPES.includes(fileType)) next.file = 'Use a PDF, a screenshot (PNG or JPG) or a CSV file'
    else if (file.size > REPORT_MAX_BYTES) next.file = `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(REPORT_MAX_BYTES)}`
    setErrors(next)
    if (Object.keys(next).length > 0 || online === null || onTrip === null || tripCount === null || !file) return

    setBusy(true)
    try {
      // Read the tablet log again at the moment of submission.
      const loggedHours = await store.playbackHoursForWeek(driver.id, weekStart)
      const input = {
        weekStart,
        hoursOnline: online,
        hoursOnTrip: onTrip,
        trips: tripCount,
        file: { name: file.name, type: fileType, size: file.size },
      }
      const check = await checker.check(input, {
        today: today(),
        driverStatus: driver.status,
        alreadySubmittedWeeks: submittedWeeks,
        playbackHours: loggedHours,
      })
      const report: WeeklyReport = {
        id: newId('rep'),
        driverId: driver.id,
        weekStart,
        hoursOnline: online,
        hoursOnTrip: onTrip,
        trips: tripCount,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fileDataUrl: await readAsDataUrl(file),
        playbackHours: loggedHours,
        check,
        decision: 'pending',
        submittedAt: new Date().toISOString(),
      }
      await store.saveReport(report)
      setSubmitted(report)
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not send the report' })
    } finally {
      setBusy(false)
    }
  }

  async function simulate() {
    const hours = parseAmount(simulateHours)
    if (!driver) return
    // A week only has 168 hours, so an oversized figure is a typo, not a test case.
    if (hours === null || hours === 0 || hours > MAX_SIMULATED_HOURS) {
      setSimulateError(`Enter a number of hours between 1 and ${MAX_SIMULATED_HOURS}`)
      return
    }
    setSimulateError('')
    const minutesPerDay = (hours * 60) / 7
    for (const day of weekDates(weekStart)) await store.addPlaybackMinutes(driver.id, day, minutesPerDay)
    reload()
  }

  return (
    <div className="narrow stack">
      <div>
        <h1>Send weekly report</h1>
        <p className="muted">Copy Online time, Active time and trips from your Uber weekly summary, then attach the screenshot. The file is not read automatically.</p>
      </div>

      <form className="card stack" onSubmit={submit} noValidate>
        <Field
          label="Week"
          error={submittedWeeks.includes(weekStart) ? 'You already sent a report for this week. Choose another week' : errors.week}
        >
          <select value={weekStart} onChange={(e) => setChosenWeek(e.target.value)}>
            {weeks.map((week) => (
              <option key={week} value={week} disabled={submittedWeeks.includes(week)}>
                {formatWeek(week)}
                {week === thisWeek ? ' (this week, not finished)' : ''}
                {submittedWeeks.includes(week) ? ' (already sent)' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Notice>
          Your tablet logged <strong>{formatHours(playbackHours)}</strong> of ads on screen in this week. The check compares
          this with the Active time you enter below. Weekly totals do not prove the ads played during trips.
        </Notice>

        <div className="grid-2">
          <Field label="Online time" hint="From the Uber screenshot: hours:minutes or decimal hours." error={errors.hoursOnline}>
            <input value={hoursOnline} onChange={(e) => setHoursOnline(e.target.value)} inputMode="text" placeholder="e.g. 15:44" />
          </Field>
          <Field label="Active time" hint="Copy the Active figure shown by Uber." error={errors.hoursOnTrip}>
            <input value={hoursOnTrip} onChange={(e) => setHoursOnTrip(e.target.value)} inputMode="text" placeholder="e.g. 13:20" />
          </Field>
        </div>
        {parseReportHours(hoursOnTrip) !== null && parseReportHours(hoursOnTrip)! > 0 && (
          <Notice>
            <strong>Weekly comparison:</strong> {formatPlaybackMinutes(playbackHours * 60)} of ads displayed ÷ {formatPlaybackMinutes(parseReportHours(hoursOnTrip)! * 60)} Uber Active time = {Math.round(playbackHours / parseReportHours(hoursOnTrip)! * 100)}%.
            This compares totals only; it does not establish when trips occurred. Approval is a separate decision.
          </Notice>
        )}
        <Field label="Number of trips" error={errors.trips}>
          <input value={trips} onChange={(e) => setTrips(e.target.value)} inputMode="numeric" placeholder="e.g. 92" />
        </Field>
        <Field label="Uber weekly report" hint="PDF, screenshot (PNG or JPG) or CSV, up to 5 MB." error={errors.file}>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv" onChange={chooseFile} />
        </Field>

        {errors.form && <Notice tone="bad">{errors.form}</Notice>}
        <div className="row row-wrap">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Checking…' : 'Send and check'}
          </button>
          <Link to="/driver" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>

      <details className="card demo-tool">
        <summary>Demo tool: pretend the tablet was on</summary>
        <div className="stack-sm">
          <p className="muted">
            For demonstrations only. Adds tablet hours to the selected week so you can show a consistent result or a
            mismatch without driving for a week. The real product has no such button.
          </p>
          <div className="row row-wrap">
            <input
              className="input-short"
              value={simulateHours}
              onChange={(e) => setSimulateHours(e.target.value)}
              inputMode="decimal"
              aria-label="Hours to add"
            />
            <button type="button" className="btn btn-small" onClick={simulate}>
              Add hours to {formatWeek(weekStart)}
            </button>
          </div>
          {simulateError && (
            <span className="field-error" role="alert">
              {simulateError}
            </span>
          )}
        </div>
      </details>
    </div>
  )
}
