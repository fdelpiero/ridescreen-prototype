import { formatDateTime, parseISODate } from '../../lib/dates'
import { formatPlaybackMinutes } from '../../lib/playback'
import type { PlaybackLog, TabletSession } from '../../types'

const dateFormat = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' })

export function TabletActivity({ sessions, playback }: { sessions: TabletSession[]; playback: PlaybackLog }) {
  const days = Object.entries(playback).sort(([a], [b]) => b.localeCompare(a))
  return <section className="card stack" aria-labelledby="tablet-activity-heading">
    <div>
      <h2 id="tablet-activity-heading">Daily ad display time</h2>
      <p className="muted">Time the ad slideshow was visible on this device. Pauses and hidden screens are not counted.</p>
    </div>
    {days.length === 0 ? <p className="muted">No ad display time recorded yet.</p> :
      <ul className="rows">{days.map(([date, minutes]) => <li className="row-item" key={date}>
        <strong>{dateFormat.format(parseISODate(date))}</strong><strong>{formatPlaybackMinutes(minutes)}</strong>
      </li>)}</ul>}
    {sessions.length > 0 && <details>
      <summary>View start and finish times</summary>
      <ul className="rows">{sessions.map((session) => <li className="row-item" key={session.id}>
        <div><strong>Started: {formatDateTime(session.startedAt)}</strong><div className="muted">
          {session.endedAt ? `Finished: ${formatDateTime(session.endedAt)}` : 'Finish time not recorded — the session may still be open or the tablet closed unexpectedly.'}
        </div></div>
      </li>)}</ul>
    </details>}
  </section>
}
