import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Field, Link, LoadError, Loading, Notice, Pill } from '../../components/ui'
import { ROTATION_OPTIONS } from '../../config'
import type { RotationSeconds } from '../../config'
import { store } from '../../data'
import { imageToDataUrl } from '../../lib/files'
import { newId } from '../../lib/ids'
import { isHttpUrl } from '../../lib/qr'
import { useLoad } from '../../lib/useLoad'
import type { Ad } from '../../types'

const OFFER_MAX = 90

export function AdminAds() {
  const { data, error, reload } = useLoad(async () => {
    const [ads, settings] = await Promise.all([store.listAds(), store.getSettings()])
    return { ads, settings }
  })
  // 'new' opens an empty form, an Ad opens it for editing, null hides it.
  const [editing, setEditing] = useState<Ad | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (error) return <LoadError message={error} />
  if (!data) return <Loading />
  const { ads, settings } = data
  const activeCount = ads.filter((a) => a.active).length
  const loopSeconds = activeCount * settings.rotationSeconds

  async function setRotation(rotationSeconds: RotationSeconds) {
    await store.saveSettings({ ...settings, rotationSeconds })
    reload()
  }

  async function toggle(ad: Ad) {
    await store.saveAd({ ...ad, active: !ad.active })
    reload()
  }

  async function move(ad: Ad, direction: -1 | 1) {
    await store.moveAd(ad.id, direction)
    reload()
  }

  async function remove(ad: Ad) {
    await store.deleteAd(ad.id)
    setConfirmDelete(null)
    if (editing !== 'new' && editing?.id === ad.id) setEditing(null)
    reload()
  }

  return (
    <div className="stack-lg">
      <div className="row row-wrap row-between">
        <div>
          <h1>Ads</h1>
          <p className="muted">Tablets play the switched-on ads from top to bottom, then start again.</p>
        </div>
        <div className="row row-wrap">
          <Link to="/player/preview" className="btn">
            Preview the tablet screen
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            Add an ad
          </button>
        </div>
      </div>

      <section className="card row row-wrap row-between">
        <div>
          <h2>Rotation</h2>
          <p className="muted">
            Each ad stays on screen for {settings.rotationSeconds} seconds.
            {activeCount > 0 && ` With ${activeCount} ad${activeCount === 1 ? '' : 's'} on, a full loop takes ${loopSeconds} seconds.`}
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Seconds per ad">
          {ROTATION_OPTIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              className={`segment ${settings.rotationSeconds === seconds ? 'segment-current' : ''}`}
              aria-pressed={settings.rotationSeconds === seconds}
              onClick={() => setRotation(seconds)}
            >
              {seconds} seconds
            </button>
          ))}
        </div>
      </section>

      {editing && (
        <AdForm
          key={editing === 'new' ? 'new' : editing.id}
          ad={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            reload()
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {ads.length === 0 && <Notice tone="warn">There are no ads yet, so tablets have nothing to show. Add one to get started.</Notice>}
      {ads.length > 0 && activeCount === 0 && <Notice tone="warn">Every ad is switched off, so tablets have nothing to show.</Notice>}

      <ol className="ad-list">
        {ads.map((ad, i) => (
          <li key={ad.id} className={`card ad-row ${ad.active ? '' : 'ad-row-off'}`}>
            <img src={ad.image} alt={`Creative for ${ad.advertiser}`} className="ad-thumb" />
            <div className="stack-sm grow">
              <div className="row row-wrap">
                <strong>{ad.advertiser}</strong>
                <Pill tone={ad.active ? 'ok' : 'neutral'}>{ad.active ? 'On' : 'Off'}</Pill>
              </div>
              <div>{ad.offer}</div>
              <div className="muted break">QR opens {ad.qrUrl}</div>
              <div className="row row-wrap">
                <button type="button" className="btn btn-small" onClick={() => toggle(ad)}>
                  {ad.active ? 'Switch off' : 'Switch on'}
                </button>
                <button type="button" className="btn btn-small" onClick={() => move(ad, -1)} disabled={i === 0} aria-label={`Move ${ad.advertiser} earlier`}>
                  ↑ Earlier
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => move(ad, 1)}
                  disabled={i === ads.length - 1}
                  aria-label={`Move ${ad.advertiser} later`}
                >
                  ↓ Later
                </button>
                <button type="button" className="btn btn-small" onClick={() => setEditing(ad)}>
                  Edit
                </button>
                {confirmDelete === ad.id ? (
                  <>
                    <button type="button" className="btn btn-danger btn-small" onClick={() => remove(ad)}>
                      Yes, delete
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmDelete(ad.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

type Errors = Partial<Record<'advertiser' | 'offer' | 'qrUrl' | 'image' | 'form', string>>

function AdForm({ ad, onDone, onCancel }: { ad: Ad | null; onDone: () => void; onCancel: () => void }) {
  const [advertiser, setAdvertiser] = useState(ad?.advertiser ?? '')
  const [offer, setOffer] = useState(ad?.offer ?? '')
  const [qrUrl, setQrUrl] = useState(ad?.qrUrl ?? 'https://')
  const [image, setImage] = useState<string | null>(ad?.image ?? null)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setImage(await imageToDataUrl(file))
      setErrors((e) => ({ ...e, image: undefined }))
    } catch (err) {
      setErrors((e) => ({ ...e, image: err instanceof Error ? err.message : 'Could not read that image' }))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    if (!advertiser.trim()) next.advertiser = 'Enter the advertiser’s name'
    if (!offer.trim()) next.offer = 'Enter the offer riders get'
    else if (offer.trim().length > OFFER_MAX) next.offer = `Keep the offer under ${OFFER_MAX} characters so it reads at a glance`
    if (!isHttpUrl(qrUrl.trim())) next.qrUrl = 'Enter a full web address starting with https://'
    if (!image) next.image = 'Choose the ad image'
    setErrors(next)
    if (Object.keys(next).length > 0 || !image) return

    setBusy(true)
    try {
      await store.saveAd({
        id: ad?.id ?? newId('ad'),
        advertiser: advertiser.trim(),
        offer: offer.trim(),
        qrUrl: qrUrl.trim(),
        image,
        active: ad?.active ?? true,
        order: ad?.order ?? (await store.nextAdOrder()),
        createdAt: ad?.createdAt ?? new Date().toISOString(),
      })
      onDone()
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not save the ad' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card card-accent stack" onSubmit={submit} noValidate>
      <h2>{ad ? `Edit ${ad.advertiser}` : 'Add an ad'}</h2>
      <div className="grid-2">
        <div className="stack">
          <Field label="Advertiser" error={errors.advertiser}>
            <input value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} />
          </Field>
          <Field label="Rider-exclusive offer" hint={`Shown beside the QR code. ${offer.trim().length}/${OFFER_MAX} characters.`} error={errors.offer}>
            <input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. 5% off your first order" />
          </Field>
          <Field label="Where the QR code goes" hint="The advertiser’s offer page." error={errors.qrUrl}>
            <input type="url" value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} inputMode="url" />
          </Field>
        </div>
        <div className="stack">
          <Field label={ad ? 'Ad image (choose a file to replace it)' : 'Ad image'} hint="Landscape works best, about 1600 × 1000 pixels." error={errors.image}>
            <input type="file" accept="image/*" onChange={chooseImage} />
          </Field>
          {image && <img src={image} alt="Ad preview" className="ad-preview" />}
        </div>
      </div>
      {errors.form && <Notice tone="bad">{errors.form}</Notice>}
      <div className="row row-wrap">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : ad ? 'Save changes' : 'Add ad'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
