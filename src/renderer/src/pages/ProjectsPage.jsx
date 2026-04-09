import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import CloseIcon from '@mui/icons-material/Close'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined'
import FontDownloadOutlinedIcon from '@mui/icons-material/FontDownloadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { projectService } from '../services/projectService'
import api from '../services/authService'

const LOCAL_IDS_KEY    = 'localProjectIds'
const PROJECT_PATHS_KEY = 'projectPaths'
const MAX_THUMB_BYTES   = 5 * 1024 * 1024

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
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

const normalizeVersion = (v) => (v || '').trim().replace(/^v/i, '').toLowerCase()

function VersionChip({ versionName }) {
  return (
    <Chip
      icon={<CloudOutlinedIcon sx={{ fontSize: '12px !important' }} />}
      label={versionName?.trim() || 'Inconnu'}
      size="small"
      variant="outlined"
      sx={{ fontSize: 10, height: 18, color: '#42a5f5', borderColor: 'rgba(66,165,245,0.3)', '& .MuiChip-icon': { color: '#42a5f5' } }}
    />
  )
}

function StatusChip({ cinStatus, versionName }) {
  const { t } = useTranslation()
  const localVersion = cinStatus?.versionName
  if (!localVersion) {
    return <Chip label={t('projects.notInstalled')} size="small" sx={{ fontSize: 10, height: 18 }} />
  }
  const upToDate = normalizeVersion(localVersion) === normalizeVersion(versionName)
  return upToDate
    ? <Chip label={t('projects.upToDate')} size="small" color="success" sx={{ fontSize: 10, height: 18 }} />
    : <Chip label="Update" size="small" color="warning" sx={{ fontSize: 10, height: 18 }} />
}

// ── Carte projet (16:9) ────────────────────────────────────────────────────
function ProjectCard({ project, hasLocalPaths, onEdit, onDelete, onPush, onClick, canCreate, canPush, canPull, versionName, cinStatus }) {
  const { t } = useTranslation()
  const thumb = project.thumbnail_url || project.thumbnailUrl
  return (
    <div className="project-card" onClick={() => onClick(project)}>
      {/* Thumbnail 16:9 */}
      <div className="project-thumb">
        {thumb
          ? <img src={thumb} alt="" />
          : <DirectionsBusOutlinedIcon sx={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.3 }} />
        }
        {/* Overlay boutons */}
        <div
          style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, zIndex: 2 }}
          onClick={e => e.stopPropagation()}
        >
          {canPush && hasLocalPaths && (
            <IconButton
              size="small"
              onClick={() => onPush(project)}
              title={t('projects.pushToCloud')}
              sx={{
                background: 'rgba(20,25,30,0.85)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#42a5f5', p: '4px', backdropFilter: 'blur(4px)',
                '&:hover': { background: 'rgba(25,118,210,0.3)' }
              }}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          )}
          {canCreate && (
            <IconButton
              size="small"
              onClick={() => onEdit(project)}
              title={t('common.edit')}
              sx={{
                background: 'rgba(20,25,30,0.85)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-secondary)', p: '4px', backdropFilter: 'blur(4px)',
                '&:hover': { background: 'rgba(255,255,255,0.1)' }
              }}
            >
              <EditOutlinedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          )}
          {canCreate && (
            <IconButton
              size="small"
              onClick={() => onDelete(project.id)}
              title={t('common.delete')}
              sx={{
                background: 'rgba(20,25,30,0.85)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#fc3d39', p: '4px', backdropFilter: 'blur(4px)',
                '&:hover': { background: 'rgba(252,61,57,0.2)' }
              }}
            >
              <DeleteOutlinedIcon sx={{ fontSize: 12 }} />
            </IconButton>
          )}
        </div>
      </div>

      <div className="project-card-body">
        <div className="project-name">{project.name}</div>
        {project.description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {project.description}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <VersionChip versionName={versionName} />
          {canPull && <StatusChip cinStatus={cinStatus} versionName={versionName} />}
        </div>
      </div>
    </div>
  )
}

// ── Dialog Push (depuis la liste) ──────────────────────────────────────────
function PushDialogInline({ project, onPushed, onClose }) {
  const { t } = useTranslation()
  const [localPaths,  setLocalPaths]  = useState(null)
  const [pathsLoaded, setPathsLoaded] = useState(false)
  const [upload,      setUpload]      = useState(null)
  const [error,       setError]       = useState(null)
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
    }}>
      <Box sx={{
        background: '#1e2328', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
        width: '100%', maxWidth: 460,
        display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {t('projects.pushToCloud')} — {project.name}
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Résumé */}
        <Box sx={{ p: '14px 18px', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary',
            textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>
            {t('projects.archiveContent')}
          </Typography>
          {[
            { label: 'Vehicles', path: localPaths?.vehiclesPath },
            { label: 'Addons',   path: localPaths?.addonsPath   },
            { label: 'Sounds',   path: localPaths?.soundsPath   },
          ].map(({ label, path }) => (
            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', width: 70, flexShrink: 0 }}>{label}</span>
              <span style={{ color: path ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {path || '—'}
              </span>
            </div>
          ))}
          {localPaths?.fonts?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', width: 70, flexShrink: 0 }}>Fonts</span>
              <span style={{ color: 'var(--text-primary)' }}>{t('projects.fontsCount', { count: localPaths.fonts.length })}</span>
            </div>
          )}

          {!hasPaths && pathsLoaded && (
            <Typography sx={{ color: '#fc3d39', fontSize: 12, mt: 0.5 }}>
              {t('projects.noLocalPathsWarning')}
            </Typography>
          )}
          {error && (
            <Box sx={{ p: '6px 10px', borderRadius: 1, fontSize: 12, mt: 0.5,
              background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39' }}>
              ✗ {error}
            </Box>
          )}
        </Box>

        {/* Progression */}
        {upload && (
          <Box sx={{ px: '18px', pb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, fontSize: 12 }}>
              <span style={{ color: 'var(--text-primary)' }}>{upload.phase}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{upload.label}</span>
            </Box>
            <LinearProgress
              variant={upload.percent > 0 ? 'determinate' : 'indeterminate'}
              value={upload.percent ?? 0}
              sx={{ borderRadius: 1, height: 5 }}
            />
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ p: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            size="small"
            startIcon={busy ? <CircularProgress size={13} color="inherit" /> : <CloudUploadOutlinedIcon />}
            onClick={handlePush}
            disabled={busy || !hasPaths}
          >
            {busy ? '…' : t('push.launch')}
          </Button>
        </Box>
      </Box>
    </div>
  )
}

// ── Dialog création / édition ──────────────────────────────────────────────
function ProjectDialog({ project, localPaths: initPaths, onCreated, onEdited, onClose }) {
  const { t } = useTranslation()
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
    const dataUrl = await resizeImage(raw)
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

    if (form.thumbnailUrl?.startsWith('data:')) {
      const approxBytes = (form.thumbnailUrl.length * 3) / 4
      if (approxBytes > MAX_THUMB_BYTES) {
        setError(t('projects.thumbTooLarge'))
        return
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
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
        || JSON.stringify(err?.response?.data) || err?.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24
    }}>
      <Box sx={{
        background: '#1e2328', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
        width: '100%', maxWidth: 540, maxHeight: '92vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <Box sx={{ p: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {isEdit ? t('projects.editTitle') : t('projects.newProject')}
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Body */}
        <Box sx={{ p: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Nom */}
          <TextField
            label={t('projects.nameLabel')}
            value={form.name}
            onChange={e => setKV('name', e.target.value)}
            placeholder={t('projects.namePlaceholder')}
            fullWidth size="small"
            autoFocus
            disabled={saving}
          />

          {/* Description */}
          <TextField
            label={t('projects.description')}
            value={form.description}
            onChange={e => setKV('description', e.target.value)}
            placeholder={t('projects.descriptionPlaceholder')}
            multiline rows={3}
            fullWidth size="small"
            disabled={saving}
          />

          {/* Thumbnail */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ImageOutlinedIcon sx={{ fontSize: 13 }} /> {t('projects.thumbnail')}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 70, height: 70, borderRadius: 6, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {form.thumbPreview
                  ? <img src={form.thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => setForm(f => ({ ...f, thumbPreview: null }))} />
                  : <ImageOutlinedIcon sx={{ fontSize: 24, color: 'var(--text-muted)', opacity: 0.4 }} />
                }
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Button variant="outlined" size="small" startIcon={<ImageOutlinedIcon />} onClick={pickThumbnail} disabled={saving}>
                    {t('common.browse')}
                  </Button>
                  {(form.thumbnailUrl || form.thumbnailPath) && (
                    <Button variant="text" size="small" onClick={clearThumbnail} disabled={saving}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </Button>
                  )}
                </div>
                <TextField
                  value={form.thumbnailPath ? '' : form.thumbnailUrl}
                  onChange={e => handleUrlInput(e.target.value)}
                  placeholder={t('projects.imageUrl')}
                  disabled={saving || !!form.thumbnailPath}
                  size="small" fullWidth
                />
              </div>
            </div>
          </div>

          {/* Chemins locaux */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('projects.localPaths')}
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('projects.localPathsHint')}</span>
            </div>

            {[
              { key: 'vehiclesPath', label: 'Vehicles', Icon: DirectionsBusOutlinedIcon },
              { key: 'addonsPath',   label: 'Addons',   Icon: FolderOutlinedIcon        },
              { key: 'soundsPath',   label: 'Sounds',   Icon: MusicNoteOutlinedIcon     },
            ].map(({ key, label, Icon }) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon sx={{ fontSize: 12 }} />{label}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{
                    flex: 1, fontSize: 12, color: form[key] ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4,
                    padding: '5px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {form[key] || t('projects.notSelected')}
                  </div>
                  <Button variant="outlined" size="small" startIcon={<FolderOutlinedIcon />} onClick={() => pickFolder(key)} disabled={saving}>
                    {t('common.browse')}
                  </Button>
                  {form[key] && (
                    <Button variant="text" size="small" onClick={() => setKV(key, null)} disabled={saving}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Fonts */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FontDownloadOutlinedIcon sx={{ fontSize: 12 }} /> {t('projects.fonts')}
                </div>
                <Button variant="outlined" size="small" startIcon={<AddOutlinedIcon />} onClick={pickFonts} disabled={saving}>
                  {t('projects.addFont')}
                </Button>
              </div>
              {form.fonts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {form.fonts.map(f => (
                    <div key={f} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 10px', background: 'rgba(255,255,255,0.04)',
                      borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <FontDownloadOutlinedIcon sx={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.split(/[\\/]/).pop()}
                      </span>
                      <button onClick={() => removeFont(f)} disabled={saving} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: saving ? 'not-allowed' : 'pointer', padding: 2, display: 'flex'
                      }}>
                        <CloseIcon sx={{ fontSize: 11 }} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 4,
                  border: '1px dashed rgba(255,255,255,0.1)' }}>
                  {t('projects.noFonts')}
                </div>
              )}
            </div>
          </div>

          {error && (
            <Box sx={{ p: '6px 10px', borderRadius: 1, fontSize: 12,
              background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39' }}>
              ✗ {error}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
          <Button variant="outlined" size="small" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            startIcon={saving ? <CircularProgress size={13} color="inherit" /> : undefined}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </Box>
      </Box>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProjectsPage({ onNavigate, user }) {
  const { t } = useTranslation()
  const [projects,       setProjects]       = useState([])
  const [localIds,       setLocalIds]       = useState(new Set())
  const [localPaths,     setLocalPaths]     = useState({})
  const [cinStatuses,    setCinStatuses]    = useState({})
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
      setLoadError(err?.response?.data?.message || err?.message || t('projects.loading'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreated = useCallback(async (newProject, paths) => {
    const project = newProject?.id ? newProject : (newProject?.data ?? newProject?.project ?? newProject)
    console.log('handleCreated — projet reçu:', project)
    console.log('handleCreated — paths:', paths)

    if (project?.id && paths) {
      const updated = { ...localPaths, [project.id]: paths }
      setLocalPaths(updated)
      await window.api.store.set(PROJECT_PATHS_KEY, updated)
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
      alert(err?.response?.data?.message || err?.message || t('projects.deleteError'))
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
          <div className="page-title">{t('projects.title')}</div>
          <div className="page-subtitle">
            {loading ? t('common.loading') : t('projects.subtitle', { count: projects.length })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title={t('common.refresh')}>
            <span>
              <IconButton size="small" onClick={loadProjects} disabled={loading}>
                <RefreshOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          {canCreate && (
            <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={() => setEditingProject({})}>
              {t('projects.new')}
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 }}>
          <CircularProgress size={28} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('projects.loading')}</span>
        </div>
      )}

      {!loading && loadError && (
        <div style={{ padding: '14px 18px', borderRadius: 8, margin: '0 0 18px',
          background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.25)', color: '#fc3d39', fontSize: 13 }}>
          ✗ {loadError}
          <button onClick={loadProjects} style={{ marginLeft: 12, background: 'none', border: 'none',
            color: '#fc3d39', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !loadError && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><CloudOutlinedIcon sx={{ fontSize: 48, opacity: 0.25 }} /></div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('projects.noProjects')}</div>
          <div className="empty-state-text">
            {canCreate ? t('projects.createFirst') : t('projects.noProjects')}
          </div>
          {canCreate && (
            <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />}
              onClick={() => setEditingProject({})} style={{ marginTop: 8 }}>
              {t('projects.new')}
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
        <PushDialogInline
          project={pushTarget}
          localPaths={localPaths[pushTarget.id]}
          onPushed={handlePushed}
          onClose={() => setPushTarget(null)}
        />
      )}

      {/* Confirm suppression */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle sx={{ fontSize: 14, fontWeight: 600 }}>{t('projects.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {t('projects.deleteBody')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" size="small" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" size="small" color="error"
            onClick={() => deleteProject(deleteConfirm)}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
