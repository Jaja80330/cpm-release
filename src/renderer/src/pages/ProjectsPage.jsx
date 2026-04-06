import React, { useState, useEffect, useCallback } from 'react'
import { Badge, Button, Input, Label, ProgressBar, Spinner, Textarea } from '@fluentui/react-components'
import {
  bundleIcon,
  AddRegular, AddFilled,
  EditRegular, EditFilled,
  DeleteRegular, DeleteFilled,
  VehicleBusRegular, VehicleBusFilled,
  CloudRegular, CloudFilled,
  ArrowUploadRegular, ArrowUploadFilled,
  DismissRegular, DismissFilled,
  ArrowClockwiseRegular, ArrowClockwiseFilled,
  FolderRegular, FolderFilled,
  MusicNote2Regular, MusicNote2Filled,
  TextFontRegular, TextFontFilled,
  ImageRegular, ImageFilled
} from '@fluentui/react-icons'
import { projectService } from '../services/projectService'
import api from '../services/authService'

const AddIcon      = bundleIcon(AddFilled,          AddRegular)
const EditIcon     = bundleIcon(EditFilled,          EditRegular)
const DeleteIcon   = bundleIcon(DeleteFilled,        DeleteRegular)
const BusIcon      = bundleIcon(VehicleBusFilled,    VehicleBusRegular)
const CloudIcon    = bundleIcon(CloudFilled,         CloudRegular)
const PushIcon     = bundleIcon(ArrowUploadFilled,   ArrowUploadRegular)
const DismissIcon  = bundleIcon(DismissFilled,       DismissRegular)
const RefreshIcon  = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular)
const FolderIcon   = bundleIcon(FolderFilled,        FolderRegular)
const SoundIcon    = bundleIcon(MusicNote2Filled,    MusicNote2Regular)
const FontIcon     = bundleIcon(TextFontFilled,      TextFontRegular)
const ImageIcon    = bundleIcon(ImageFilled,         ImageRegular)

const LOCAL_IDS_KEY    = 'localProjectIds'
const PROJECT_PATHS_KEY = 'projectPaths'
const MAX_THUMB_BYTES   = 5 * 1024 * 1024 // 5 Mo

// Redimensionne une image (data URL) via Canvas, max 1280 px de large, JPEG 0.85
function resizeImage(dataUrl, maxWidth = 1280, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio  = Math.min(1, maxWidth / img.width)
      const w      = Math.round(img.width  * ratio)
      const h      = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl) // image illisible → on garde l'original
    img.src = dataUrl
  })
}

// ── Helpers UI ─────────────────────────────────────────────────────────────
function FL({ children }) {
  return <Label style={{ color: '#d1d1d1', fontSize: 12, display: 'block', marginBottom: 5 }}>{children}</Label>
}
function SecBtn({ onClick, children, icon, disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      padding: '5px 10px', background: 'rgba(255,255,255,0.06)',
      border: '1px solid #3d3d3d', color: disabled ? '#555' : '#d1d1d1',
      borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap'
    }}>
      {icon}{children}
    </button>
  )
}

// ── Badges version / statut ────────────────────────────────────────────────
const normalizeVersion = (v) => (v || '').trim().replace(/^v/i, '').toLowerCase()

function VersionBadge({ versionName }) {
  return (
    <Badge appearance="tint" color="informative" size="small" icon={<CloudIcon />}>
      {versionName?.trim() || 'Inconnu'}
    </Badge>
  )
}

function StatusBadge({ cinStatus, versionName }) {
  const localVersion = cinStatus?.versionName
  if (!localVersion) {
    return <Badge appearance="tint" color="subtle" size="small">Non installé</Badge>
  }
  const upToDate = normalizeVersion(localVersion) === normalizeVersion(versionName)
  return upToDate
    ? <Badge appearance="tint" color="success" size="small">À jour</Badge>
    : <Badge appearance="tint" color="warning" size="small">Update</Badge>
}

// ── Carte projet ───────────────────────────────────────────────────────────
const btnOverlayStyle = {
  background: 'rgba(30,30,30,0.85)', border: '1px solid #4d4d4d',
  color: '#d1d1d1', padding: '4px', borderRadius: 4, cursor: 'pointer',
  display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)'
}

function ProjectCard({ project, isLocal, hasLocalPaths, onEdit, onDelete, onPush, onClick, canCreate, canPush, canPull, versionName, cinStatus }) {
  const thumb = project.thumbnail_url || project.thumbnailUrl
  return (
    <div className="project-card" onClick={() => onClick(project)}>
      <div style={{
        height: 120, borderRadius: '6px 6px 0 0', background: '#383838',
        overflow: 'hidden', margin: '-18px -18px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <BusIcon fontSize={40} style={{ color: '#4d4d4d' }} />
        }
        <div
          style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}
          onClick={e => e.stopPropagation()}
        >
          {canPush && hasLocalPaths && (
            <button onClick={() => onPush(project)} style={{ ...btnOverlayStyle, color: '#6499ff' }} title="Push vers le Cloud">
              <PushIcon fontSize={12} />
            </button>
          )}
          {canCreate && (
            <button onClick={() => onEdit(project)} style={btnOverlayStyle} title="Modifier">
              <EditIcon fontSize={12} />
            </button>
          )}
          {canCreate && (
            <button onClick={() => onDelete(project.id)} style={{ ...btnOverlayStyle, color: '#fc3d39' }} title="Supprimer">
              <DeleteIcon fontSize={12} />
            </button>
          )}
        </div>
      </div>

      <div className="project-name">{project.name}</div>
      {project.description && (
        <div style={{ fontSize: 12, color: '#9d9d9d', marginBottom: 8, lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </div>
      )}
      <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <VersionBadge versionName={versionName} />
        {canPull && <StatusBadge cinStatus={cinStatus} versionName={versionName} />}
      </div>
    </div>
  )
}

// ── Dialog Push ────────────────────────────────────────────────────────────
function PushDialog({ project, onPushed, onClose }) {
  // Lecture directe depuis le store — indépendant de l'état React de la page
  const [localPaths, setLocalPaths] = useState(null)
  const [pathsLoaded, setPathsLoaded] = useState(false)
  const [upload, setUpload] = useState(null)
  const [error,  setError]  = useState(null)
  const busy = upload !== null

  useEffect(() => {
    window.api.store.get(PROJECT_PATHS_KEY).then(all => {
      const paths = (all || {})[project.id] || null
      console.log('PushDialog — paths depuis store pour id', project.id, ':', paths)
      setLocalPaths(paths)
      setPathsLoaded(true)
    })
  }, [project.id])

  useEffect(() => {
    window.api.projects.onPackStep(({ stepNum, stepTotal, label }) =>
      setUpload(prev => ({ ...prev, phase: `[${stepNum}/${stepTotal}] ${label}` }))
    )
    window.api.projects.onPackProgress(({ percent, label }) =>
      setUpload(prev => ({ ...prev, percent, label }))
    )
    return () => {
      window.api.projects.offPackStep()
      window.api.projects.offPackProgress()
    }
  }, [])

  const hasPaths = localPaths && (
    localPaths.vehiclesPath || localPaths.addonsPath ||
    localPaths.soundsPath   || localPaths.fonts?.length > 0
  )

  const handlePush = async () => {
    setError(null)
    setUpload({ phase: 'Démarrage…', percent: 0, label: '' })

    let result
    try {
      result = await window.api.projects.package({
        projectName:  project.name,
        vehiclesPath: localPaths?.vehiclesPath || null,
        addonsPath:   localPaths?.addonsPath   || null,
        soundsPath:   localPaths?.soundsPath   || null,
        fonts:        localPaths?.fonts        || [],
      })
    } catch (err) {
      console.error('Push — IPC error:', err)
      setError(`Erreur IPC : ${err?.message || err}`)
      setUpload(null)
      return
    }

    console.log('Push — result:', result)

    if (!result?.success) {
      setError(result?.error || 'Échec du transfert SFTP.')
      setUpload(null)
      return
    }

    setUpload({ phase: '[3/3] Mise à jour du projet…', percent: 99, label: '' })
    try {
      const updated = await projectService.patch(project.id, {
        archive_name: result.archiveName,
        has_addons:   result.hasAddons,
        has_sounds:   result.hasSounds,
        fonts_count:  result.fontsCount,
      })
      onPushed(updated || { ...project, archive_name: result.archiveName })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erreur API après transfert.')
      setUpload(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: 8,
        width: '100%', maxWidth: 460,
        display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #3d3d3d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            Push vers le Cloud — {project.name}
          </span>
          <button onClick={onClose} disabled={busy}
            style={{ background: 'none', border: 'none', color: '#9d9d9d', cursor: busy ? 'not-allowed' : 'pointer' }}>
            <DismissIcon fontSize={16} />
          </button>
        </div>

        {/* Résumé des chemins */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6d6d6d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Contenu de l'archive
          </div>
          {[
            { label: 'Vehicles', path: localPaths?.vehiclesPath },
            { label: 'Addons',   path: localPaths?.addonsPath   },
            { label: 'Sounds',   path: localPaths?.soundsPath   },
          ].map(({ label, path }) => (
            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ color: '#6d6d6d', width: 70, flexShrink: 0 }}>{label}</span>
              <span style={{ color: path ? '#d1d1d1' : '#4d4d4d', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {path || '—'}
              </span>
            </div>
          ))}
          {localPaths?.fonts?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ color: '#6d6d6d', width: 70, flexShrink: 0 }}>Fonts</span>
              <span style={{ color: '#d1d1d1' }}>{localPaths.fonts.length} police(s)</span>
            </div>
          )}

          {!hasPaths && (
            <div style={{ color: '#fc3d39', fontSize: 12, marginTop: 4 }}>
              Aucun chemin local configuré. Modifiez le projet pour les ajouter.
            </div>
          )}
          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12, marginTop: 4,
              background: 'rgba(252,61,57,0.08)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39' }}>
              ✗ {error}
            </div>
          )}
        </div>

        {/* Progression */}
        {upload && (
          <div style={{ padding: '0 20px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: '#d1d1d1' }}>{upload.phase}</span>
              <span style={{ color: '#9d9d9d' }}>{upload.label}</span>
            </div>
            <ProgressBar
              value={upload.percent != null ? upload.percent / 100 : undefined}
              shape="rounded"
              thickness="medium"
            />
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #3d3d3d',
          display: 'flex', justifyContent: 'flex-end', gap: 8
        }}>
          <Button appearance="secondary" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button
            appearance="primary"
            icon={busy ? <Spinner size="tiny" /> : <PushIcon />}
            onClick={handlePush}
            disabled={busy || !hasPaths}
          >
            {busy ? '…' : 'Lancer le Push'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Dialog création / édition ──────────────────────────────────────────────
function ProjectDialog({ project, localPaths: initPaths, onCreated, onEdited, onClose }) {
  const isEdit = !!project?.id
  const existingThumb = project?.thumbnail_url || project?.thumbnailUrl || null
  const [form, setForm] = useState({
    name:          project?.name        || '',
    description:   project?.description || '',
    thumbnailPath: null,
    thumbnailUrl:  existingThumb || '',
    thumbPreview:  existingThumb || null,
    vehiclesPath:  initPaths?.vehiclesPath || null,
    addonsPath:    initPaths?.addonsPath   || null,
    soundsPath:    initPaths?.soundsPath   || null,
    fonts:         initPaths?.fonts        || [],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const setKV = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const pickFolder = async (key) => {
    const p = await window.api.dialog.selectFolder()
    if (p) setKV(key, p)
  }
  const pickThumbnail = async () => {
    const p = await window.api.dialog.selectFile({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
    })
    if (!p) return
    const raw     = await window.api.file.readAsDataUrl(p)
    const dataUrl = await resizeImage(raw) // redimensionné ≤ 1280 px, JPEG 0.85
    setForm(f => ({ ...f, thumbnailPath: p, thumbnailUrl: dataUrl, thumbPreview: dataUrl }))
  }

  const clearThumbnail = () =>
    setForm(f => ({ ...f, thumbnailPath: null, thumbnailUrl: '', thumbPreview: null }))

  const handleUrlInput = (val) =>
    setForm(f => ({ ...f, thumbnailUrl: val, thumbnailPath: null, thumbPreview: val.trim() || null }))
  const pickFonts = async () => {
    const files = await window.api.dialog.selectFiles({
      filters: [{ name: 'Polices OMSI', extensions: ['oft'] }]
    })
    if (files.length > 0) setForm(f => ({ ...f, fonts: [...new Set([...f.fonts, ...files])] }))
  }
  const removeFont = (fp) => setForm(f => ({ ...f, fonts: f.fonts.filter(x => x !== fp) }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setError(null)

    // Vérifie la taille de la miniature avant envoi
    if (form.thumbnailUrl?.startsWith('data:')) {
      const approxBytes = (form.thumbnailUrl.length * 3) / 4
      if (approxBytes > MAX_THUMB_BYTES) {
        setError('La miniature est trop volumineuse (> 5 Mo). Choisissez une image plus petite.')
        return
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
        // Édition : PUT simple (pas de fichiers, pas de push)
        const updated = await projectService.update(project.id, {
          name:          form.name,
          description:   form.description,
          thumbnail_url: form.thumbnailUrl || null,
        })
        const paths = {
          vehiclesPath: form.vehiclesPath,
          addonsPath:   form.addonsPath,
          soundsPath:   form.soundsPath,
          fonts:        form.fonts,
        }
        onEdited(project.id, updated || { ...project, name: form.name, description: form.description }, paths, project.name)
      } else {
        // Création : POST JSON (le serveur n'accepte pas multipart sur cette route)
        const payload = {
          name:          form.name.trim(),
          description:   form.description  || '',
          bus_path:      form.vehiclesPath  ? form.vehiclesPath.split(/[\\/]/).pop() : '',
          has_addons:    !!form.addonsPath,
          has_sounds:    !!form.soundsPath,
          fonts_count:   form.fonts.length,
          thumbnail_url: null,
        }
        console.log('POST /projects payload:', payload)
        const response = await api.post('/projects', payload)

        const paths = {
          vehiclesPath: form.vehiclesPath,
          addonsPath:   form.addonsPath,
          soundsPath:   form.soundsPath,
          fonts:        form.fonts,
        }
        onCreated(response.data, paths)
      }
    } catch (err) {
      console.error('=== POST /projects ERROR ===')
      console.error('Status :', err?.response?.status)
      console.error('Data   :', JSON.stringify(err?.response?.data, null, 2))
      console.error('Message:', err?.message)
      setError(err?.response?.data?.message || err?.response?.data?.error
        || JSON.stringify(err?.response?.data) || err?.message || 'Erreur lors de l\'enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
    }}>
      <div style={{
        background: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: 8,
        width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #3d3d3d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {isEdit ? 'Modifier le projet' : 'Nouveau projet'}
          </span>
          <button onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', color: '#9d9d9d', cursor: saving ? 'not-allowed' : 'pointer' }}>
            <DismissIcon fontSize={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Nom */}
          <div>
            <FL>Nom du projet *</FL>
            <Input
              value={form.name}
              onChange={(_, { value }) => setKV('name', value)}
              placeholder="Ex : Agora 2002"
              style={{ width: '100%' }}
              disabled={saving}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <FL>Description</FL>
            <Textarea
              value={form.description}
              onChange={(_, { value }) => setKV('description', value)}
              placeholder="Description, version, notes…"
              resize="vertical"
              style={{ width: '100%', minHeight: 60 }}
              disabled={saving}
            />
          </div>

          {/* Thumbnail */}
          <div>
            <FL><ImageIcon fontSize={12} style={{ marginRight: 4 }} />Miniature du projet</FL>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Prévisualisation */}
              <div style={{
                width: 72, height: 72, borderRadius: 6, background: '#383838',
                border: '1px solid #454545', flexShrink: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {form.thumbPreview
                  ? <img src={form.thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setForm(f => ({ ...f, thumbPreview: null }))} />
                  : <ImageIcon fontSize={26} style={{ color: '#555' }} />
                }
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Boutons fichier local */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <SecBtn onClick={pickThumbnail} icon={<ImageIcon fontSize={13} />} disabled={saving}>
                    Parcourir…
                  </SecBtn>
                  {(form.thumbnailUrl || form.thumbnailPath) && (
                    <SecBtn onClick={clearThumbnail} icon={<DismissIcon fontSize={13} />} disabled={saving} />
                  )}
                  {form.thumbnailPath && (
                    <span style={{ fontSize: 11, color: '#9d9d9d', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {form.thumbnailPath.split(/[\\/]/).pop()}
                    </span>
                  )}
                </div>

                {/* Champ URL */}
                <Input
                  value={form.thumbnailPath ? '' : form.thumbnailUrl}
                  onChange={(_, { value }) => handleUrlInput(value)}
                  placeholder="Ou saisissez une URL d'image…"
                  disabled={saving || !!form.thumbnailPath}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Chemins locaux (création + édition) */}
          <div style={{ borderTop: '1px solid #3d3d3d', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6d6d6d', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Chemins locaux (pour le Push)
              </div>
              <span style={{ fontSize: 10, color: '#4d4d4d' }}>Utilisés uniquement lors du Push</span>
            </div>

            {[
              { key: 'vehiclesPath', label: 'Vehicles', Icon: BusIcon    },
              { key: 'addonsPath',   label: 'Addons',   Icon: FolderIcon },
              { key: 'soundsPath',   label: 'Sounds',   Icon: SoundIcon  },
            ].map(({ key, label, Icon }) => (
              <div key={key}>
                <FL><Icon fontSize={12} style={{ marginRight: 4 }} />{label}</FL>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{
                    flex: 1, fontSize: 12, color: form[key] ? '#d1d1d1' : '#555',
                    background: '#383838', border: '1px solid #454545', borderRadius: 4,
                    padding: '5px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {form[key] || 'Non sélectionné'}
                  </div>
                  <SecBtn onClick={() => pickFolder(key)} icon={<FolderIcon fontSize={13} />} disabled={saving}>
                    Parcourir
                  </SecBtn>
                  {form[key] && (
                    <SecBtn onClick={() => setKV(key, null)} icon={<DismissIcon fontSize={13} />} disabled={saving} />
                  )}
                </div>
              </div>
            ))}

            {/* Fonts */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <FL><FontIcon fontSize={12} style={{ marginRight: 4 }} />Polices (.oft)</FL>
                <SecBtn onClick={pickFonts} icon={<AddIcon fontSize={13} />} disabled={saving}>Ajouter .oft</SecBtn>
              </div>
              {form.fonts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {form.fonts.map(f => (
                    <div key={f} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 10px', background: '#383838', borderRadius: 4, border: '1px solid #454545'
                    }}>
                      <FontIcon fontSize={12} style={{ color: '#9d9d9d', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, color: '#d1d1d1', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.split(/[\\/]/).pop()}
                      </span>
                      <button onClick={() => removeFont(f)} disabled={saving} style={{
                        background: 'none', border: 'none', color: '#9d9d9d',
                        cursor: saving ? 'not-allowed' : 'pointer', padding: 2, display: 'flex'
                      }}>
                        <DismissIcon fontSize={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 10, textAlign: 'center', color: '#555', fontSize: 12,
                  background: '#383838', borderRadius: 4, border: '1px dashed #454545' }}>
                  Aucune police sélectionnée
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12,
              background: 'rgba(252,61,57,0.08)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39' }}>
              ✗ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #3d3d3d',
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0
        }}>
          <Button appearance="secondary" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            icon={saving ? <Spinner size="tiny" /> : undefined}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProjectsPage({ onNavigate, user }) {
  const [projects,       setProjects]       = useState([])
  const [localIds,       setLocalIds]       = useState(new Set())
  const [localPaths,     setLocalPaths]     = useState({}) // { [id]: { vehiclesPath, addonsPath, soundsPath, fonts } }
  const [cinStatuses,    setCinStatuses]    = useState({}) // { [id]: cinData | null }
  const [loading,        setLoading]        = useState(true)
  const [loadError,      setLoadError]      = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [pushTarget,     setPushTarget]     = useState(null)
  const [deleteConfirm,  setDeleteConfirm]  = useState(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [data, ids, paths, settings] = await Promise.all([
        projectService.getAll(),
        window.api.store.get(LOCAL_IDS_KEY).then(v => new Set(v || [])),
        window.api.store.get(PROJECT_PATHS_KEY).then(v => v || {}),
        window.api.settings.get().catch(() => null)
      ])
      const list = Array.isArray(data) ? data : data?.projects || []
      setProjects(list)
      setLocalIds(ids)
      setLocalPaths(paths)
      // Lire le statut .cin pour chaque projet en parallèle
      if (settings) {
        const entries = await Promise.all(
          list.map(p =>
            window.api.cinnamon.readStatus(p, settings)
              .then(s => [p.id, s])
              .catch(() => [p.id, null])
          )
        )
        setCinStatuses(Object.fromEntries(entries))
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Impossible de charger les projets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreated = useCallback(async (newProject, paths) => {
    // Normalise la réponse serveur (certaines API enveloppent dans .data ou .project)
    const project = newProject?.id ? newProject : (newProject?.data ?? newProject?.project ?? newProject)
    console.log('handleCreated — projet reçu:', project)
    console.log('handleCreated — paths:', paths)

    if (project?.id && paths) {
      const updated = { ...localPaths, [project.id]: paths }
      setLocalPaths(updated)
      await window.api.store.set(PROJECT_PATHS_KEY, updated)
      console.log('handleCreated — localPaths sauvegardés sous id:', project.id)
    } else {
      console.warn('handleCreated — ID introuvable dans la réponse, les paths ne seront pas sauvegardés')
    }
    setProjects(prev => [...prev, project])
    setEditingProject(null)
  }, [localPaths])

  const handleEdited = useCallback(async (id, updated, paths, oldName) => {
    if (paths) {
      const updatedPaths = { ...localPaths, [id]: paths }
      setLocalPaths(updatedPaths)
      await window.api.store.set(PROJECT_PATHS_KEY, updatedPaths)
    }
    // Renommer le .cin si le nom du projet a changé
    if (oldName && updated.name && oldName !== updated.name) {
      try {
        const s = await window.api.settings.get()
        await window.api.cinnamon.renameCin(oldName, updated.name, s)
      } catch { /* silencieux */ }
    }
    setProjects(prev => prev.map(p => p.id === id ? updated : p))
    setEditingProject(null)
  }, [localPaths])

  const handlePushed = useCallback((updated) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    setPushTarget(null)
  }, [])

  const deleteProject = async (id) => {
    const proj = projects.find(p => p.id === id)
    try {
      await projectService.remove(id)
      // Supprimer le fichier .cin local si présent
      if (proj) {
        try {
          const s = await window.api.settings.get()
          await window.api.cinnamon.deleteCin(proj, s)
        } catch { /* silencieux */ }
      }
      setProjects(prev => prev.filter(p => p.id !== id))
      const { [id]: _, ...rest } = localPaths
      setLocalPaths(rest)
      await window.api.store.set(PROJECT_PATHS_KEY, rest)
      if (localIds.has(id)) {
        const next = new Set(localIds)
        next.delete(id)
        setLocalIds(next)
        await window.api.store.set(LOCAL_IDS_KEY, [...next])
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de la suppression.')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const canCreate = user?.role === 'super_admin' || user?.role === 'project_manager'

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title">Projets</div>
          <div className="page-subtitle">
            {loading ? 'Chargement…' : `${projects.length} projet${projects.length !== 1 ? 's' : ''} sur le cloud`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="subtle" icon={<RefreshIcon />} onClick={loadProjects} disabled={loading} title="Rafraîchir" />
          {canCreate && (
            <Button appearance="primary" icon={<AddIcon />} onClick={() => setEditingProject({})}>
              Créer un projet
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Spinner size="large" label="Chargement des projets…" />
        </div>
      )}

      {!loading && loadError && (
        <div style={{ padding: '20px 24px', borderRadius: 8, margin: '0 0 20px',
          background: 'rgba(252,61,57,0.08)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39', fontSize: 13 }}>
          ✗ {loadError}
          <button onClick={loadProjects} style={{ marginLeft: 12, background: 'none', border: 'none',
            color: '#fc3d39', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && !loadError && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><CloudIcon fontSize={48} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#9d9d9d' }}>Aucun projet</div>
          <div className="empty-state-text">
            {canCreate ? 'Créez votre premier projet de bus OMSI 2' : 'Aucun projet disponible pour le moment.'}
          </div>
          {canCreate && (
            <Button appearance="primary" icon={<AddIcon />} onClick={() => setEditingProject({})} style={{ marginTop: 8 }}>
              Créer un projet
            </Button>
          )}
        </div>
      )}

      {!loading && !loadError && projects.length > 0 && (
        <div className="project-grid">
          {projects.map(p => {
            const canPull = user?.role === 'super_admin' || Number(user?.id) === Number(p.owner_id)
            return (
            <ProjectCard
              key={p.id}
              project={p}
              isLocal={localIds.has(p.id)}
              hasLocalPaths={!!(localPaths[p.id] && (
                localPaths[p.id].vehiclesPath || localPaths[p.id].addonsPath ||
                localPaths[p.id].soundsPath   || localPaths[p.id].fonts?.length > 0
              ))}
              canCreate={canCreate}
              canPush={
                user?.role === 'super_admin' ||
                Number(user?.id) === Number(p.owner_id)
              }
              canPull={canPull}
              versionName={p.version_name || null}
              cinStatus={cinStatuses[p.id] ?? null}
              onEdit={p  => setEditingProject(p)}
              onDelete={id => setDeleteConfirm(id)}
              onPush={p  => setPushTarget(p)}
              onClick={p => onNavigate('project-detail', {
                ...p,
                vehicles: localPaths[p.id]?.vehiclesPath || null,
                addons:   localPaths[p.id]?.addonsPath   || null,
                sounds:   localPaths[p.id]?.soundsPath   || null,
                fonts:    localPaths[p.id]?.fonts        || [],
              })}
            />
          )
          })}
        </div>
      )}

      {/* Dialog création/édition */}
      {editingProject !== null && (
        <ProjectDialog
          project={editingProject?.id ? editingProject : null}
          localPaths={editingProject?.id ? localPaths[editingProject.id] : null}
          onCreated={handleCreated}
          onEdited={handleEdited}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* Dialog push */}
      {pushTarget && (
        <PushDialog
          project={pushTarget}
          localPaths={localPaths[pushTarget.id]}
          onPushed={handlePushed}
          onClose={() => setPushTarget(null)}
        />
      )}

      {/* Confirm suppression */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#2d2d2d', border: '1px solid #3d3d3d', borderRadius: 8,
            width: 340, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Supprimer ce projet ?</div>
            <div style={{ fontSize: 13, color: '#9d9d9d', marginBottom: 20 }}>
              Le projet sera supprimé du cloud et son fichier manifest local (.cin) sera effacé. Cette action est irréversible.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button appearance="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
              <Button appearance="primary" style={{ background: '#c42b1c', borderColor: 'transparent' }}
                onClick={() => deleteProject(deleteConfirm)}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
