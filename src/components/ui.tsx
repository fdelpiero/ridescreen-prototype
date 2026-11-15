import type { ReactNode } from 'react'
import type { CheckResult, CheckStatus } from '../checks/reportCheck'
import { formatPercent } from '../lib/format'
import type { DriverStatus, ReportDecision } from '../types'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral'

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={`#${to}`} className={className}>
      {children}
    </a>
  )
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

const DRIVER_STATUS: Record<DriverStatus, { label: string; tone: Tone }> = {
  awaiting_photo: { label: 'Photo needed', tone: 'neutral' },
  pending_review: { label: 'Waiting for approval', tone: 'warn' },
  active: { label: 'Active', tone: 'ok' },
  rejected: { label: 'Photo not accepted', tone: 'bad' },
}

export function DriverStatusPill({ status }: { status: DriverStatus }) {
  return <Pill tone={DRIVER_STATUS[status].tone}>{DRIVER_STATUS[status].label}</Pill>
}

const CHECK_STATUS: Record<CheckStatus, { label: string; tone: Tone }> = {
  consistent: { label: 'Consistent', tone: 'ok' },
  needs_review: { label: 'Needs review', tone: 'warn' },
  mismatch: { label: 'Mismatch', tone: 'bad' },
}

export function CheckStatusPill({ status }: { status: CheckStatus }) {
  return <Pill tone={CHECK_STATUS[status].tone}>{CHECK_STATUS[status].label}</Pill>
}

const DECISION: Record<ReportDecision, { label: string; tone: Tone }> = {
  pending: { label: 'Awaiting decision', tone: 'neutral' },
  eligible: { label: 'Payment eligible', tone: 'ok' },
  not_eligible: { label: 'Not eligible', tone: 'bad' },
}

export function DecisionPill({ decision }: { decision: ReportDecision }) {
  return <Pill tone={DECISION[decision].tone}>{DECISION[decision].label}</Pill>
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function Notice({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {children}
    </div>
  )
}

export function Loading() {
  return <p className="muted">Loading…</p>
}

export function LoadError({ message }: { message: string }) {
  return (
    <Notice tone="bad">
      <strong>Could not load this screen.</strong> {message}. If this is a private browsing window, storage may be
      blocked: open the app in a normal window.
    </Notice>
  )
}

/** The verdict of the weekly report check, with every reason spelled out. */
export function CheckSummary({ check }: { check: CheckResult }) {
  const marks = { ok: '✓', warn: '!', fail: '✕' } as const
  return (
    <div className="check">
      <div className="row row-wrap">
        <CheckStatusPill status={check.status} />
        {check.coverage !== null && (
          <span className="muted">Tablet was on for {formatPercent(check.coverage)} of trip hours</span>
        )}
      </div>
      <ul className="findings">
        {check.findings.map((finding, i) => (
          <li key={i} className={`finding finding-${finding.level}`}>
            <span className="finding-mark" aria-hidden="true">
              {marks[finding.level]}
            </span>
            <span>{finding.text}</span>
          </li>
        ))}
      </ul>
      <p className="field-hint">
        {check.method === 'rules-demo'
          ? 'Demo check: fixed rules that compare the numbers you entered with the tablet’s own log. It does not read the uploaded file yet.'
          : 'Checked by the AI document reader.'}
      </p>
    </div>
  )
}
