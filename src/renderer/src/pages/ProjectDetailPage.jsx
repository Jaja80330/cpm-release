import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import LinearProgress from '@mui/material/LinearProgress'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import IconButton from '@mui/material/IconButton'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined'
import FontDownloadOutlinedIcon from '@mui/icons-material/FontDownloadOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CloseIcon from '@mui/icons-material/Close'
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined'
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Divider from '@mui/material/Divider'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined'
import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import SyncModal from '../components/SyncModal'
import PushDialog from '../components/PushDialog'
import { projectService } from '../services/projectService'

const PROJECT_PATHS_KEY = 'projectPaths'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (!b && b !== 0) return '—'
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

function formatDate(ms) {
  if (!ms) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(ms))
}

function PathRow({ Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <Icon sx={{ fontSize: 14, color: 'var(--text-muted)', mt: 0.1, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-primary)',
          fontFamily: "'Cascadia Code','Consolas',monospace", wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function StatusTag({ children, color }) {
  const colors = {
    green:  { bg: 'rgba(108,203,95,0.12)',  border: 'rgba(108,203,95,0.3)',  text: '#6ccb5f' },
    orange: { bg: 'rgba(240,160,48,0.12)',  border: 'rgba(240,160,48,0.3)',  text: '#f0a030' },
    red:    { bg: 'rgba(252,61,57,0.12)',   border: 'rgba(252,61,57,0.3)',   text: '#fc3d39' },
    blue:   { bg: 'rgba(66,165,245,0.12)',  border: 'rgba(66,165,245,0.3)',  text: '#42a5f5' },
    gray:   { bg: 'rgba(150,150,150,0.10)', border: 'rgba(150,150,150,0.25)', text: '#9aa0a6' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, textTransform: 'uppercase', letterSpacing: '0.05em'
    }}>
      {children}
    </span>
  )
}

// ── Lightbox ───────────────────────────────────────────────────────────────
function Lightbox({ screenshots, index, onClose, onPrev, onNext }) {
  // Navigation clavier
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  onPrev()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, onClose])

  const shot = screenshots[index]
  if (!shot) return null

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          background: 'rgba(8,9,10,0.96)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          borderRadius: '8px',
          maxWidth: '92vw',
          maxHeight: '92vh',
          overflow: 'hidden',
          position: 'relative',
        }
      }}
      BackdropProps={{ sx: { background: 'rgba(0,0,0,0.88)' } }}
    >
      <Box sx={{ position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center', p: 1 }}>

        {/* Compteur */}
        <Box sx={{
          position: 'absolute', top: 10, left: 12, zIndex: 10,
          fontSize: 11, color: 'rgba(255,255,255,0.45)',
          background: 'rgba(0,0,0,0.45)',
          px: 1, py: 0.25, borderRadius: '4px',
          fontFamily: 'Inter, sans-serif', userSelect: 'none',
        }}>
          {index + 1} / {screenshots.length}
        </Box>

        {/* Fermer */}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            '&:hover': { background: 'rgba(0,0,0,0.8)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 16, color: '#fff' }} />
        </IconButton>

        {/* Précédent */}
        {screenshots.length > 1 && (
          <IconButton
            onClick={onPrev}
            sx={{
              position: 'absolute', left: 8, zIndex: 10,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.08)',
              '&:hover': { background: 'rgba(0,0,0,0.75)' },
            }}
          >
            <NavigateBeforeIcon sx={{ fontSize: 28, color: '#fff' }} />
          </IconButton>
        )}

        {/* Image */}
        <Box
          component="img"
          src={shot.url}
          alt={`Screenshot ${index + 1}`}
          sx={{
            maxWidth: '88vw',
            maxHeight: '86vh',
            objectFit: 'contain',
            display: 'block',
            borderRadius: '4px',
          }}
        />

        {/* Suivant */}
        {screenshots.length > 1 && (
          <IconButton
            onClick={onNext}
            sx={{
              position: 'absolute', right: 8, zIndex: 10,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.08)',
              '&:hover': { background: 'rgba(0,0,0,0.75)' },
            }}
          >
            <NavigateNextIcon sx={{ fontSize: 28, color: '#fff' }} />
          </IconButton>
        )}
      </Box>
    </Dialog>
  )
}

// ── Section Screenshots ────────────────────────────────────────────────────
function ScreenshotsSection({ screenshots = [], isOwnerOrAdmin, onAdd, onDelete }) {
  const { t } = useTranslation()
  const addInputRef = useRef(null)
  const [uploading,  setUploading]  = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [lbIndex,    setLbIndex]    = useState(null) // null = fermé

  const hasShots = screenshots.length > 0

  // Masqué si vide et pas propriétaire
  if (!hasShots && !isOwnerOrAdmin) return null

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try { await onAdd(files) }
    finally {
      setUploading(false)
      if (addInputRef.current) addInputRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try { await onDelete(id) }
    finally { setDeletingId(null) }
  }

  const goPrev = () => setLbIndex(i => (i - 1 + screenshots.length) % screenshots.length)
  const goNext = () => setLbIndex(i => (i + 1) % screenshots.length)

  return (
    <>
      <div className="w11-card" style={{ marginBottom: 0 }}>
        {/* En-tête */}
        <div className="w11-card-title" style={{ display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: hasShots ? 10 : 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CollectionsOutlinedIcon sx={{ fontSize: 14 }} />
            Captures d'écran
            {hasShots && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                {screenshots.length}
              </span>
            )}
          </span>
          {isOwnerOrAdmin && (
            <>
              <input
                ref={addInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={uploading}
                startIcon={uploading
                  ? <CircularProgress size={12} />
                  : <AddPhotoAlternateOutlinedIcon />}
                onClick={() => addInputRef.current?.click()}
                sx={{ fontSize: 11, textTransform: 'none', borderRadius: '6px',
                  py: 0.25, minWidth: 0 }}
              >
                {uploading ? t('common.loading') : t('common.add')}
              </Button>
            </>
          )}
        </div>

        {/* Grille */}
        {hasShots ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))',
            gap: 7,
          }}>
            {screenshots.map((shot, idx) => (
              <Box
                key={shot.id}
                sx={{
                  position: 'relative',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  aspectRatio: '16 / 9',
                  background: '#12151a',
                  cursor: 'pointer',
                  '&:hover .ss-hover': { opacity: 1 },
                  '&:hover img': { transform: 'scale(1.05)' },
                }}
              >
                {/* Miniature */}
                <Box
                  component="img"
                  src={shot.url}
                  alt={`Screenshot ${idx + 1}`}
                  onClick={() => setLbIndex(idx)}
                  sx={{
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.2s ease',
                  }}
                />

                {/* Overlay hover */}
                <Box
                  className="ss-hover"
                  onClick={() => setLbIndex(idx)}
                  sx={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.38)',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                  }}
                >
                  <VisibilityOutlinedIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.85)' }} />
                </Box>

                {/* Bouton supprimer (owner uniquement) */}
                {isOwnerOrAdmin && (
                  <IconButton
                    size="small"
                    disabled={!!deletingId}
                    onClick={(e) => { e.stopPropagation(); handleDelete(shot.id) }}
                    sx={{
                      position: 'absolute', top: 3, right: 3,
                      p: '3px',
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      opacity: deletingId === shot.id ? 1 : undefined,
                      '&:hover': { background: 'rgba(180,30,20,0.80)' },
                    }}
                  >
                    {deletingId === shot.id
                      ? <CircularProgress size={11} sx={{ color: '#fff' }} />
                      : <DeleteOutlinedIcon sx={{ fontSize: 12, color: '#fff' }} />
                    }
                  </IconButton>
                )}
              </Box>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: 2 }}>
            {t('detail.noScreenshots')}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lbIndex !== null && (
        <Lightbox
          screenshots={screenshots}
          index={lbIndex}
          onClose={() => setLbIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </>
  )
}

// ── Onglet Description ─────────────────────────────────────────────────────
function TabDescription({ project, thumb, cinStatus, onUninstall, isUninstalling,
                          latestCloudVersion, onInstallLatest, busFiles, knownZipNames, canDeploy,
                          screenshots, isOwnerOrAdmin, onAddScreenshots, onDeleteScreenshot }) {
  const { t } = useTranslation()
  const installDate = cinStatus?.installDate
    ? new Date(cinStatus.installDate).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : null

  const isExternalPackage = !!cinStatus && knownZipNames != null && !knownZipNames.has(cinStatus.zipName)
  const isOutdated = !isExternalPackage && !!cinStatus && !!latestCloudVersion
    && cinStatus.zipName !== latestCloudVersion.name

  const headerIcon = isExternalPackage
    ? <CancelOutlinedIcon sx={{ fontSize: 14, color: '#fc3d39' }} />
    : isOutdated
      ? <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: '#f0a030' }} />
      : cinStatus
        ? <CheckCircleOutlinedIcon sx={{ fontSize: 14, color: '#6ccb5f' }} />
        : <CancelOutlinedIcon sx={{ fontSize: 14, color: 'var(--text-muted)' }} />

  const uninstallBtn = (
    <Button
      variant="outlined"
      size="small"
      startIcon={isUninstalling ? <CircularProgress size={13} /> : <DeleteOutlinedIcon />}
      disabled={isUninstalling}
      onClick={onUninstall}
      sx={{ color: '#fc3d39', borderColor: 'rgba(252,61,57,0.3)', flexShrink: 0,
        '&:hover': { borderColor: '#fc3d39', background: 'rgba(252,61,57,0.06)' } }}
    >
      {isUninstalling ? t('detail.uninstalling') : t('detail.uninstall')}
    </Button>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 10, alignItems: 'flex-start' }}>

      {/* ── Colonne gauche ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Description + vignette */}
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title"><DescriptionOutlinedIcon sx={{ fontSize: 14 }} /> Description</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {thumb && (
              <div style={{ width: 110, height: 72, borderRadius: 6, overflow: 'hidden',
                flexShrink: 0, background: '#1e2328' }}>
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              {project.description ? (
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {project.description}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Aucune description renseignée.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Screenshots */}
        <ScreenshotsSection
          screenshots={screenshots}
          isOwnerOrAdmin={isOwnerOrAdmin}
          onAdd={onAddScreenshots}
          onDelete={onDeleteScreenshot}
        />

        {/* Changelog de la dernière version */}
        {latestCloudVersion?.changelog && (
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title">
              <CloudOutlinedIcon sx={{ fontSize: 14 }} /> Changelog
              {latestCloudVersion.versionName && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                  {latestCloudVersion.versionName}
                </span>
              )}
            </div>
            <div className="cin-markdown" style={{
              fontSize: 13, color: '#b0b0b0', lineHeight: 1.7,
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.2)', borderRadius: 5,
              borderLeft: '2px solid rgba(66,165,245,0.25)',
              overflowX: 'auto',
            }}>
              <ReactMarkdown>{latestCloudVersion.changelog}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* ── Colonne droite : Projet Info ───────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title" style={{ marginBottom: 10 }}>
            <ImageOutlinedIcon sx={{ fontSize: 14 }} /> Projet Info
          </div>

          {/* Déploiement compact */}
          {canDeploy && (
            <div style={{ marginBottom: busFiles.length > 0 ? 12 : 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 4 }}>
                {headerIcon} Déploiement
              </div>

              {isExternalPackage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#fc3d39', fontWeight: 600 }}>✗ Paquet externe</span>
                    <StatusTag color="red">{cinStatus.versionName}</StatusTag>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                  {uninstallBtn}
                  <div style={{ marginTop: 3, padding: '5px 8px', borderRadius: 5,
                    background: 'rgba(252,61,57,0.06)', border: '1px solid rgba(252,61,57,0.18)',
                    display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                    <WarningAmberOutlinedIcon sx={{ fontSize: 12, color: '#fc3d39', flexShrink: 0, mt: 0.1 }} />
                    <span style={{ fontSize: 11, color: '#fc3d39', lineHeight: 1.5 }}>
                      Intégrité non vérifiable par NEROSY.
                    </span>
                  </div>
                </div>

              ) : cinStatus ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {isOutdated ? (
                      <span style={{ fontSize: 12, color: '#f0a030', fontWeight: 600 }}>⚠ Mise à jour dispo</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#6ccb5f', fontWeight: 600 }}>✓ Installé · À jour</span>
                    )}
                    <StatusTag color={isOutdated ? 'orange' : 'green'}>{cinStatus.versionName}</StatusTag>
                  </div>
                  {isOutdated && latestCloudVersion && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      → {latestCloudVersion.versionName} disponible
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {uninstallBtn}
                    {isOutdated && (
                      <Button variant="contained" size="small" startIcon={<SyncOutlinedIcon />}
                        onClick={onInstallLatest} sx={{ fontSize: 11 }}>
                        Mettre à jour
                      </Button>
                    )}
                  </div>
                </div>

              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CancelOutlinedIcon sx={{ fontSize: 13 }} /> {t('detail.notInstalled')}
                </div>
              )}
            </div>
          )}

          {/* Séparateur */}
          {canDeploy && busFiles.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }} />
          )}

          {/* Bus détectés — dense */}
          {busFiles.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 4 }}>
                <DirectionsBusOutlinedIcon sx={{ fontSize: 12 }} />
                Bus détectés
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px',
                  borderRadius: 8, fontSize: 10 }}>
                  {busFiles.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {busFiles.map((bus, i) => (
                  <div key={`bus-${i}`} style={{
                    padding: '6px 8px', borderRadius: 5,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {bus.model || '—'}
                    </div>
                    {bus.manufacturer && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {bus.manufacturer}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                      {bus.size != null && (
                        <span style={{ fontSize: 10, color: '#42a5f5', fontWeight: 500 }}>
                          {formatBytes(bus.size)}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={bus.filename}>
                        {bus.filename}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canDeploy && busFiles.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucune information disponible.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Bouton "Copier le nom" avec feedback visuel ────────────────────────────
function CopyButton({ text }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }
  return (
    <Button
      size="small"
      variant={copied ? 'contained' : 'outlined'}
      onClick={handleCopy}
      startIcon={
        copied
          ? <CheckCircleOutlinedIcon style={{ fontSize: 13 }} />
          : <ContentCopyOutlinedIcon style={{ fontSize: 13 }} />
      }
      sx={{
        borderRadius: '6px', textTransform: 'none', fontSize: 11, flexShrink: 0,
        minWidth: 120,
        transition: 'all 0.2s ease',
        ...(copied ? {
          background: 'rgba(108,203,95,0.15)',
          borderColor: 'rgba(108,203,95,0.4)',
          color: '#6ccb5f',
          '&:hover': { background: 'rgba(108,203,95,0.2)' },
        } : {
          borderColor: 'rgba(255,255,255,0.14)',
          color: 'var(--text-muted)',
          '&:hover': { borderColor: 'rgba(255,255,255,0.3)', color: 'var(--text-secondary)' },
        }),
      }}
    >
      {copied ? t('detail.nameCopied') : t('detail.copyName')}
    </Button>
  )
}

// ── Modale de progression — Diagnostic complet ─────────────────────────────
function DiagProgressModal({ open, progress }) {
  const { t } = useTranslation()
  const PHASE_ORDER  = ['collecting', 'scanning_meshes', 'scanning_cfg', 'scanning_ctc', 'scanning_bus', 'scanning_fonts', 'scanning_sounds']
  const PHASE_LABELS = {
    collecting:      t('diag.collecting'),
    scanning_meshes: t('diag.scanningMeshes'),
    scanning_cfg:    t('diag.scanningCfg'),
    scanning_ctc:    t('diag.scanningCtc'),
    scanning_bus:    t('diag.scanningBus'),
    scanning_fonts:  t('diag.scanningFonts'),
    scanning_sounds: t('diag.scanningSounds'),
  }

  const phase       = progress?.phase       ?? 'collecting'
  const current     = progress?.current     ?? 0
  const total       = progress?.total       ?? 0
  const currentFile = progress?.currentFile ?? ''
  const phaseIdx    = Math.max(0, PHASE_ORDER.indexOf(phase))
  const phasePct    = total > 0 ? current / total : 0
  const overallPct  = Math.min(99, Math.round(((phaseIdx + phasePct) / PHASE_ORDER.length) * 100))

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          background: 'var(--bg-paper)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }
      }}
    >
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, pb: 0.5 }}>
        {t('diag.title')}
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>

          {/* Pourcentage global */}
          <div style={{
            textAlign: 'center', fontSize: 40, fontWeight: 800,
            letterSpacing: '-2px', color: '#42a5f5',
            fontFamily: 'Inter, sans-serif', lineHeight: 1,
          }}>
            {overallPct}&nbsp;%
          </div>

          {/* Barre globale */}
          <LinearProgress
            variant="determinate"
            value={overallPct}
            sx={{
              height: 7, borderRadius: 4,
              backgroundColor: 'var(--border-subtle)',
              '& .MuiLinearProgress-bar': { borderRadius: 4 },
            }}
          />

          {/* Étapes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 2 }}>
            {PHASE_ORDER.map((p, i) => {
              const isActive = p === phase
              const isDone   = i < phaseIdx
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{
                    width: 14, flexShrink: 0, textAlign: 'center', fontWeight: 700,
                    color: isDone ? '#6ccb5f' : isActive ? '#42a5f5' : 'var(--text-muted)',
                  }}>
                    {isDone ? '✓' : isActive ? '›' : '·'}
                  </span>
                  <span style={{
                    flex: 1,
                    color: isDone ? '#6ccb5f' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {PHASE_LABELS[p]}
                  </span>
                  {isActive && total > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {current} / {total}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Fichier courant */}
          {currentFile && (
            <div style={{
              textAlign: 'center', fontSize: 11,
              color: 'var(--text-muted)', fontFamily: 'monospace', minHeight: 16,
            }}>
              {currentFile}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Ligne fichier orphelin ─────────────────────────────────────────────────
function OrphanRow({ name, relativePath, size, onDelete }) {
  const { t } = useTranslation()
  function fmt(b) {
    if (!b) return '—'
    if (b < 1024)    return `${b} o`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
    return `${(b / 1048576).toFixed(1)} Mo`
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 10px', borderRadius: 6, marginBottom: 4,
      background: 'rgba(240,160,48,0.04)',
      border: '1px solid rgba(240,160,48,0.14)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        {relativePath && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>
            {relativePath}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(size)}</span>
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={onDelete}
        sx={{
          fontSize: 10, textTransform: 'none', py: 0.3, px: 1.2,
          minWidth: 'auto', borderRadius: '5px', flexShrink: 0,
          borderColor: 'rgba(252,61,57,0.4)',
          '&:hover': { borderColor: '#fc3d39', background: 'rgba(252,61,57,0.07)' },
        }}
      >
        {t('common.delete')}
      </Button>
    </div>
  )
}

// ── Onglet Contrôle & Alertes ──────────────────────────────────────────────
function TabAvertissements({
  fontWarnings, allFonts, scanProgress, fontTotal,
  diagResult, diagScanned,
  onScanDiag, onDeleteFile, onDeleteAll, onImportFont,
  canScan,
}) {
  const { t } = useTranslation()
  const isScanning = scanProgress !== null
  const isDone     = !isScanning && fontTotal !== null
  const total      = scanProgress?.total   ?? fontTotal ?? 0
  const current    = scanProgress?.current ?? 0
  const pct        = total > 0 ? Math.round((current / total) * 100) : 0

  const [confirmFile, setConfirmFile] = useState(null)   // { absPath, name } | null
  const [cleanStep1,  setCleanStep1]  = useState(false)
  const [cleanStep2,  setCleanStep2]  = useState(false)

  const ACCORD_SX = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px !important',
    '&:before': { display: 'none' },
    boxShadow: 'none',
    '&.Mui-expanded': { margin: '0 !important' },
  }
  const ACCORD_SUM_SX = {
    minHeight: 40, px: 1.5,
    '&.Mui-expanded': { minHeight: 40 },
    '& .MuiAccordionSummary-content': { my: '8px', alignItems: 'center', gap: 1 },
  }

  const orphanMeshes      = diagResult?.orphanMeshes    || []
  const orphanTextures    = diagResult?.orphanTextures  || []
  const missingTextures   = diagResult?.missingTextures || []
  const missingInProject  = diagResult?.fontResults?.missingInProject  || []
  const missingEverywhere = diagResult?.fontResults?.missingEverywhere || []
  const missingSounds     = diagResult?.soundResults?.missingSounds || []
  const orphanSounds      = diagResult?.soundResults?.orphanSounds  || []
  const hasOrphans        = orphanMeshes.length > 0 || orphanTextures.length > 0 || orphanSounds.length > 0
  const totalOrphanSize   = [...orphanMeshes, ...orphanTextures, ...orphanSounds].reduce((a, f) => a + (f.size || 0), 0)
  const [importingFont,   setImportingFont]  = useState(null)  // fontName en cours d'import

  function fmt(b) {
    if (!b) return '—'
    if (b < 1024)    return `${b} o`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
    return `${(b / 1048576).toFixed(1)} Mo`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── BLOC FONTS ────────────────────────────────────────────────────── */}
      <div className="w11-card" style={{ marginBottom: 0 }}>

        {/* En-tête */}
        <div className="w11-card-title" style={{ marginBottom: 10 }}>
          <FontDownloadOutlinedIcon sx={{ fontSize: 14 }} />
          {t('detail.scanFonts')}
          {isDone && total > 0 && (
            <span style={{
              marginLeft: 'auto', fontSize: 10,
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 8px', borderRadius: 10,
            }}>
              {t('detail.cfgAnalyzed', { count: total })}
            </span>
          )}
        </div>

        {/* ── En cours de scan ────────────────────────────────────────── */}
        {isScanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {scanProgress.phase === 'collecting'
                  ? t('detail.collectingFiles')
                  : (
                    <>
                      {t('detail.scanInProgress')}{' '}
                      <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 11 }}>
                        {scanProgress.currentFile}
                      </code>
                      …
                    </>
                  )
                }
              </span>
              {total > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, ml: 1 }}>
                  {current} / {total}
                </span>
              )}
            </div>
            <LinearProgress
              variant={total > 0 ? 'determinate' : 'indeterminate'}
              value={pct}
              sx={{
                height: 5, borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.07)',
                '& .MuiLinearProgress-bar': { borderRadius: 3 },
              }}
            />
            {total > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                {pct}%
              </div>
            )}
          </div>
        )}

        {/* ── Aucun .cfg trouvé ────────────────────────────────────────── */}
        {isDone && total === 0 && (
          <Alert severity="info" variant="outlined" sx={{ borderRadius: '7px', fontSize: 13 }}>
            {t('detail.noModelConfig')}
          </Alert>
        )}

        {/* ── Tout OK ──────────────────────────────────────────────────── */}
        {isDone && total > 0 && fontWarnings.length === 0 && (
          <Alert severity="success" variant="outlined" sx={{ borderRadius: '7px', fontSize: 13 }}>
            {t('detail.fontAllOk')}
          </Alert>
        )}

        {/* ── Polices manquantes ───────────────────────────────────────── */}
        {isDone && fontWarnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ borderRadius: '7px', fontSize: 13, lineHeight: 1.55 }}
            >
              {t('detail.fontsWarning', { count: fontWarnings.length })}
            </Alert>

            {/* Chips des polices manquantes */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {t('detail.missingFiles')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {fontWarnings.map((w, i) => (
                  <Tooltip key={`fw-${i}`} title={`Référencé dans : ${w.cfgFile}`} placement="top">
                    <Chip
                      icon={<WarningAmberOutlinedIcon style={{ fontSize: 13 }} />}
                      label={w.fontName}
                      size="small"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: '#f0a030',
                        borderColor: 'rgba(240,160,48,0.35)',
                        background: 'rgba(240,160,48,0.07)',
                        '& .MuiChip-icon': { color: '#f0a030' },
                      }}
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Note de sécurité */}
            <Alert
              severity="info"
              variant="outlined"
              icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
              sx={{ borderRadius: '7px', fontSize: 12, lineHeight: 1.6 }}
            >
              {t('detail.fontSafetyNote')}
            </Alert>
          </div>
        )}

      </div>

      {/* ── BLOC BIBLIOTHÈQUE DES POLICES ────────────────────────────────── */}
      {isDone && allFonts.length > 0 && (
        <div className="w11-card" style={{ marginBottom: 0 }}>

          {/* En-tête */}
          <div className="w11-card-title" style={{ marginBottom: 10 }}>
            <FontDownloadOutlinedIcon sx={{ fontSize: 14 }} />
            {t('detail.fontLibrary')}
            <span style={{
              marginLeft: 'auto', fontSize: 10,
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 8px', borderRadius: 10,
            }}>
              {t('detail.fontUnique', { count: allFonts.length })}
            </span>
          </div>

          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '42%', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.07)',
                  py: 0.75, px: 1.5 }}>
                  {t('detail.fontColName')}
                </TableCell>
                <TableCell sx={{ width: '40%', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.07)',
                  py: 0.75, px: 1.5 }}>
                  {t('detail.fontColSource')}
                </TableCell>
                <TableCell sx={{ width: '18%', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em', color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.07)',
                  py: 0.75, px: 1.5 }}>
                  {t('detail.fontColStatus')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allFonts.map((f, i) => (
                  <TableRow key={`af-${i}`} sx={{
                    '&:hover': { background: 'rgba(255,255,255,0.025)' },
                    '& td': { borderColor: 'rgba(255,255,255,0.05)' },
                  }}>
                    {/* Nom de la police (tel qu'extrait du .cfg) */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <span style={{
                        fontFamily: "'Cascadia Code','Consolas',monospace",
                        fontSize: 11,
                        color: f.present ? 'var(--text-primary)' : '#fc3d39',
                      }}>
                        {f.fontName}
                      </span>
                    </TableCell>
                    {/* Fichier source */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      <Tooltip title={f.cfgFile} placement="top">
                        <span style={{
                          fontFamily: "'Cascadia Code','Consolas',monospace",
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}>
                          {f.cfgFile}
                        </span>
                      </Tooltip>
                    </TableCell>
                    {/* Statut : .oft trouvé via [newfont] dans Fonts/ */}
                    <TableCell sx={{ py: 0.75, px: 1.5 }}>
                      {f.present
                        ? <Chip size="small" label={t('detail.fontFound')} sx={{
                            fontSize: 10, height: 18,
                            background: 'rgba(108,203,95,0.10)',
                            color: '#6ccb5f',
                            border: '1px solid rgba(108,203,95,0.28)',
                          }} />
                        : <Tooltip title={t('detail.fontNotDeclared')} placement="left">
                            <Chip
                              icon={<WarningAmberOutlinedIcon style={{ fontSize: 11 }} />}
                              size="small"
                              label={t('detail.fontMissing')}
                              sx={{
                                fontSize: 10, height: 18,
                                background: 'rgba(252,61,57,0.10)',
                                color: '#fc3d39',
                                border: '1px solid rgba(252,61,57,0.30)',
                                '& .MuiChip-icon': { color: '#fc3d39' },
                              }} />
                          </Tooltip>
                      }
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── BLOC ANALYSE DES SOURCES ─────────────────────────────────────── */}
      <div className="w11-card" style={{ marginBottom: 0 }}>

        <div className="w11-card-title" style={{ marginBottom: 10 }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 14 }} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
            {t('detail.sources')}
          </span>
          {diagScanned && missingTextures.length === 0 && !hasOrphans && missingInProject.length === 0 && missingEverywhere.length === 0 && missingSounds.length === 0 && (
            <CheckCircleOutlinedIcon sx={{ fontSize: 15, color: '#6ccb5f', ml: 'auto' }} />
          )}
          {diagScanned && (missingTextures.length > 0 || hasOrphans || missingInProject.length > 0 || missingEverywhere.length > 0 || missingSounds.length > 0) && (
            <Tooltip title={`${missingTextures.length} texture(s) manquante(s) · ${orphanMeshes.length + orphanTextures.length + orphanSounds.length} orphelin(s) · ${missingInProject.length + missingEverywhere.length} police(s) · ${missingSounds.length} son(s)`}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: '#f0a030', ml: 'auto' }} />
            </Tooltip>
          )}
        </div>

        {/* État initial */}
        {!diagScanned && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: t('detail.sourcesLongDesc') }}
            />
            <Tooltip
              title={!canScan ? t('detail.configureVehicles') : ''}
              placement="right"
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!canScan}
                  startIcon={<DescriptionOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => onScanDiag()}
                  sx={{
                    borderRadius: '7px', textTransform: 'none', fontSize: 13,
                    borderColor: 'rgba(255,255,255,0.18)',
                    '&:hover': { borderColor: '#42a5f5', color: '#42a5f5' },
                  }}
                >
                  {t('detail.launchDiag')}
                </Button>
              </span>
            </Tooltip>
          </div>
        )}

        {/* Résultats */}
        {diagScanned && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* ── Résumé unifié : 3 piliers ─────────────────────────────── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              {/* Pilier Textures */}
              <Chip size="small" icon={<ImageOutlinedIcon style={{ fontSize: 12 }} />}
                label={`${missingTextures.length} texture${missingTextures.length !== 1 ? 's' : ''} manquante${missingTextures.length !== 1 ? 's' : ''}`}
                sx={{ fontSize: 11,
                  background: missingTextures.length > 0 ? 'rgba(252,61,57,0.10)' : 'rgba(108,203,95,0.10)',
                  color:      missingTextures.length > 0 ? '#fc3d39' : '#6ccb5f',
                  border:     `1px solid ${missingTextures.length > 0 ? 'rgba(252,61,57,0.30)' : 'rgba(108,203,95,0.30)'}`,
                  '& .MuiChip-icon': { color: missingTextures.length > 0 ? '#fc3d39' : '#6ccb5f' },
                }} />
              {/* Pilier Modèles */}
              <Chip size="small" icon={<DescriptionOutlinedIcon style={{ fontSize: 12 }} />}
                label={`${orphanMeshes.length} mesh${orphanMeshes.length !== 1 ? 'es' : ''} orphelin${orphanMeshes.length !== 1 ? 's' : ''}`}
                sx={{ fontSize: 11,
                  background: orphanMeshes.length > 0 ? 'rgba(240,160,48,0.10)' : 'rgba(108,203,95,0.10)',
                  color:      orphanMeshes.length > 0 ? '#f0a030' : '#6ccb5f',
                  border:     `1px solid ${orphanMeshes.length > 0 ? 'rgba(240,160,48,0.30)' : 'rgba(108,203,95,0.30)'}`,
                  '& .MuiChip-icon': { color: orphanMeshes.length > 0 ? '#f0a030' : '#6ccb5f' },
                }} />
              <Chip size="small" icon={<ImageOutlinedIcon style={{ fontSize: 12 }} />}
                label={`${orphanTextures.length} texture${orphanTextures.length !== 1 ? 's' : ''} orpheline${orphanTextures.length !== 1 ? 's' : ''}`}
                sx={{ fontSize: 11,
                  background: orphanTextures.length > 0 ? 'rgba(240,160,48,0.10)' : 'rgba(108,203,95,0.10)',
                  color:      orphanTextures.length > 0 ? '#f0a030' : '#6ccb5f',
                  border:     `1px solid ${orphanTextures.length > 0 ? 'rgba(240,160,48,0.30)' : 'rgba(108,203,95,0.30)'}`,
                  '& .MuiChip-icon': { color: orphanTextures.length > 0 ? '#f0a030' : '#6ccb5f' },
                }} />
              {/* Pilier Polices */}
              <Chip size="small" icon={<FontDownloadOutlinedIcon style={{ fontSize: 12 }} />}
                label={`${missingInProject.length + missingEverywhere.length} police${(missingInProject.length + missingEverywhere.length) !== 1 ? 's' : ''} manquante${(missingInProject.length + missingEverywhere.length) !== 1 ? 's' : ''}`}
                sx={{ fontSize: 11,
                  background: (missingInProject.length + missingEverywhere.length) > 0 ? 'rgba(240,160,48,0.10)' : 'rgba(108,203,95,0.10)',
                  color:      (missingInProject.length + missingEverywhere.length) > 0 ? '#f0a030' : '#6ccb5f',
                  border:     `1px solid ${(missingInProject.length + missingEverywhere.length) > 0 ? 'rgba(240,160,48,0.30)' : 'rgba(108,203,95,0.30)'}`,
                  '& .MuiChip-icon': { color: (missingInProject.length + missingEverywhere.length) > 0 ? '#f0a030' : '#6ccb5f' },
                }} />
              {/* Pilier Sons */}
              <Chip size="small" icon={<MusicNoteOutlinedIcon style={{ fontSize: 12 }} />}
                label={`${missingSounds.length} son${missingSounds.length !== 1 ? 's' : ''} manquant${missingSounds.length !== 1 ? 's' : ''}${orphanSounds.length > 0 ? ` · ${orphanSounds.length} orphelin${orphanSounds.length !== 1 ? 's' : ''}` : ''}`}
                sx={{ fontSize: 11,
                  background: missingSounds.length > 0 ? 'rgba(252,61,57,0.10)' : orphanSounds.length > 0 ? 'rgba(240,160,48,0.10)' : 'rgba(108,203,95,0.10)',
                  color:      missingSounds.length > 0 ? '#fc3d39'              : orphanSounds.length > 0 ? '#f0a030'              : '#6ccb5f',
                  border:     `1px solid ${missingSounds.length > 0 ? 'rgba(252,61,57,0.30)' : orphanSounds.length > 0 ? 'rgba(240,160,48,0.30)' : 'rgba(108,203,95,0.30)'}`,
                  '& .MuiChip-icon': { color: missingSounds.length > 0 ? '#fc3d39' : orphanSounds.length > 0 ? '#f0a030' : '#6ccb5f' },
                }} />
              {hasOrphans && totalOrphanSize > 0 && (
                <Chip size="small"
                  label={`Gain potentiel : ${fmt(totalOrphanSize)}`}
                  sx={{ fontSize: 11, fontWeight: 700,
                    background: 'rgba(66,165,245,0.10)', color: '#42a5f5',
                    border: '1px solid rgba(66,165,245,0.28)' }} />
              )}
            </div>

            {/* ── Accordion Textures manquantes ─────────────────────────── */}
            {missingTextures.length > 0 && (
              <Accordion defaultExpanded sx={ACCORD_SX}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                  <CancelOutlinedIcon sx={{ fontSize: 14, color: '#fc3d39' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fc3d39' }}>
                    Textures manquantes ({missingTextures.length})
                  </span>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                    Référencées dans les binaires .o3d mais introuvables dans{' '}
                    <code style={{ fontFamily: 'monospace' }}>Texture/</code>.
                  </div>
                  {missingTextures.map(({ textureName, usedBy }) => (
                    <div key={textureName} style={{
                      background: 'rgba(252,61,57,0.035)',
                      border: '1px solid rgba(252,61,57,0.18)',
                      borderRadius: 9, padding: '10px 14px 12px', marginBottom: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <CancelOutlinedIcon sx={{ fontSize: 13, color: '#fc3d39', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                          color: '#fc3d39', flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {textureName}
                        </span>
                        <CopyButton text={textureName} />
                      </div>
                      <div style={{ paddingLeft: 23 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                          letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Utilisée par :
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {usedBy.map((o3dName, i) => (
                            <Chip key={`ub-${i}`} label={o3dName} size="small" variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: 11,
                                color: 'var(--text-secondary)',
                                borderColor: 'rgba(255,255,255,0.12)',
                                background: 'rgba(255,255,255,0.04)' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {/* ── Accordion Modèles 3D orphelins ────────────────────────── */}
            <Accordion defaultExpanded={orphanMeshes.length > 0} sx={ACCORD_SX}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                <DescriptionOutlinedIcon sx={{ fontSize: 14,
                  color: orphanMeshes.length > 0 ? '#f0a030' : '#6ccb5f' }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1,
                  color: orphanMeshes.length > 0 ? '#f0a030' : 'var(--text-secondary)' }}>
                  🏗️ Modèles 3D orphelins — .o3d / .x ({orphanMeshes.length})
                </span>
                {orphanMeshes.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 10 }}>
                    {fmt(orphanMeshes.reduce((a, f) => a + (f.size || 0), 0))}
                  </span>
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                {orphanMeshes.length === 0 ? (
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: '7px', fontSize: 12 }}>
                    Aucun modèle 3D orphelin détecté.
                  </Alert>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
                      Présents dans <code style={{ fontFamily: 'monospace' }}>Model/</code> mais jamais
                      cités sous la balise{' '}
                      <code style={{ fontFamily: 'monospace' }}>[mesh]</code> dans les model*.cfg.
                    </div>
                    {orphanMeshes.map(m => (
                      <OrphanRow key={m.absPath} name={m.name} relativePath={m.relativePath}
                        size={m.size} onDelete={() => setConfirmFile({ absPath: m.absPath, name: m.name })} />
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            {/* ── Accordion Textures orphelines ─────────────────────────── */}
            <Accordion defaultExpanded={orphanTextures.length > 0} sx={ACCORD_SX}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                <ImageOutlinedIcon sx={{ fontSize: 14,
                  color: orphanTextures.length > 0 ? '#f0a030' : '#6ccb5f' }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1,
                  color: orphanTextures.length > 0 ? '#f0a030' : 'var(--text-secondary)' }}>
                  🖼️ Textures orphelines — racine Texture/ ({orphanTextures.length})
                </span>
                {orphanTextures.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 10 }}>
                    {fmt(orphanTextures.reduce((a, f) => a + (f.size || 0), 0))}
                  </span>
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                {orphanTextures.length === 0 ? (
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: '7px', fontSize: 12 }}>
                    Aucune texture orpheline à la racine de Texture/.
                  </Alert>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
                      À la racine de <code style={{ fontFamily: 'monospace' }}>Texture/</code> mais
                      non citées dans .o3d, model*.cfg, .ctc, .bus ni .org.
                      {t('detail.subFoldersExcluded')}
                    </div>
                    {orphanTextures.map(t => (
                      <OrphanRow key={t.absPath} name={t.name} relativePath=""
                        size={t.size} onDelete={() => setConfirmFile({ absPath: t.absPath, name: t.name })} />
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            {/* ── Accordion Polices manquantes dans le projet (Cas A) ───── */}
            <Accordion defaultExpanded={missingInProject.length > 0} sx={ACCORD_SX}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                <FontDownloadOutlinedIcon sx={{ fontSize: 14, color: missingInProject.length > 0 ? '#f0a030' : '#6ccb5f' }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1,
                  color: missingInProject.length > 0 ? '#f0a030' : 'var(--text-secondary)' }}>
                  🔤 Polices absentes du projet ({missingInProject.length})
                </span>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                {missingInProject.length === 0 ? (
                  <Alert severity="success" variant="outlined" sx={{ borderRadius: '7px', fontSize: 12 }}>
                    Toutes les polices utilisées sont packagées avec le projet.
                  </Alert>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                      Présentes dans OMSI 2 mais <strong>non packagées avec le projet</strong>.
                      Les utilisateurs sans ces polices ne verront pas les girouettes correctement.
                    </div>
                    {missingInProject.map((f, i) => (
                      <div key={`mip-${i}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 7, marginBottom: 4,
                        background: 'rgba(240,160,48,0.05)',
                        border: '1px solid rgba(240,160,48,0.18)',
                      }}>
                        <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: '#f0a030', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: "'Cascadia Code','Consolas',monospace",
                            fontSize: 12, color: '#f0a030', fontWeight: 600 }}>
                            {f.fontName}
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)',
                            fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            ← {f.cfgFile}
                          </span>
                        </div>
                        <Button size="small" variant="outlined"
                          disabled={importingFont === f.fontName}
                          startIcon={importingFont === f.fontName
                            ? <CircularProgress size={10} />
                            : <FontDownloadOutlinedIcon sx={{ fontSize: 12 }} />}
                          onClick={async () => {
                            setImportingFont(f.fontName)
                            await onImportFont(f.fontName, f.oftPath)
                            setImportingFont(null)
                          }}
                          sx={{ fontSize: 11, textTransform: 'none', borderRadius: '6px', flexShrink: 0,
                            borderColor: 'rgba(240,160,48,0.40)', color: '#f0a030',
                            '&:hover': { borderColor: '#f0a030', background: 'rgba(240,160,48,0.08)' } }}>
                          {importingFont === f.fontName ? 'Importation…' : 'Importer'}
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            {/* ── Accordion Polices introuvables partout (Cas B) ───────────── */}
            {missingEverywhere.length > 0 && (
              <Accordion defaultExpanded sx={ACCORD_SX}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                  <CancelOutlinedIcon sx={{ fontSize: 14, color: '#fc3d39' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fc3d39', flex: 1 }}>
                    🚫 Polices totalement introuvables ({missingEverywhere.length})
                  </span>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <Alert severity="error" variant="outlined" sx={{ borderRadius: '7px', fontSize: 12, mb: 1 }}>
                    Absentes du projet <strong>et</strong> d'OMSI 2. Installation OMSI corrompue ou polices jamais installées.
                  </Alert>
                  {missingEverywhere.map((f, i) => (
                    <div key={`mev-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7, marginBottom: 4,
                      background: 'rgba(252,61,57,0.05)',
                      border: '1px solid rgba(252,61,57,0.18)',
                    }}>
                      <CancelOutlinedIcon sx={{ fontSize: 13, color: '#fc3d39', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Cascadia Code','Consolas',monospace",
                          fontSize: 12, color: '#fc3d39', fontWeight: 600 }}>
                          {f.fontName}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ← {f.cfgFile}
                        </span>
                      </div>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {/* ── Accordion Sons manquants ──────────────────────────────── */}
            {missingSounds.length > 0 && (
              <Accordion defaultExpanded sx={ACCORD_SX}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                  <CancelOutlinedIcon sx={{ fontSize: 14, color: '#fc3d39' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fc3d39' }}>
                    Sons manquants ({missingSounds.length})
                  </span>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                    Référencés dans les fichiers <code style={{ fontFamily: 'monospace' }}>sound.cfg</code> mais absents du dossier physique.
                  </div>
                  {missingSounds.map((s, i) => (
                    <div key={`ms-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7, marginBottom: 4,
                      background: 'rgba(252,61,57,0.05)',
                      border: '1px solid rgba(252,61,57,0.18)',
                    }}>
                      <CancelOutlinedIcon sx={{ fontSize: 13, color: '#fc3d39', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Cascadia Code','Consolas',monospace",
                          fontSize: 12, color: '#fc3d39', fontWeight: 600 }}>
                          {s.file}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ← {s.cfgFile}
                        </span>
                      </div>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {/* ── Accordion Sons orphelins ──────────────────────────────── */}
            {orphanSounds.length > 0 && (
              <Accordion defaultExpanded sx={ACCORD_SX}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={ACCORD_SUM_SX}>
                  <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: '#f0a030' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0a030' }}>
                    Sons orphelins ({orphanSounds.length}) — {fmt(orphanSounds.reduce((a, s) => a + s.size, 0))}
                  </span>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                    Présents dans le dossier Sound/ mais jamais référencés dans aucun fichier .cfg. Peuvent être supprimés pour réduire le poids du push.
                  </div>
                  {orphanSounds.map((s, i) => (
                    <div key={`os-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7, marginBottom: 4,
                      background: 'rgba(240,160,48,0.05)',
                      border: '1px solid rgba(240,160,48,0.18)',
                    }}>
                      <MusicNoteOutlinedIcon sx={{ fontSize: 13, color: '#f0a030', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: "'Cascadia Code','Consolas',monospace",
                          fontSize: 12, color: '#f0a030', fontWeight: 600 }}>
                          {s.name}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                          {fmt(s.size)}
                        </span>
                      </div>
                      <Tooltip title="Supprimer ce fichier">
                        <IconButton size="small" onClick={() => onDeleteFile(s.absPath)}
                          sx={{ color: 'rgba(252,61,57,0.6)', '&:hover': { color: '#fc3d39' }, p: '3px' }}>
                          <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </div>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {/* Actions globales */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <Button size="small" variant="text" onClick={() => onScanDiag()}
                sx={{ fontSize: 11, textTransform: 'none', color: 'var(--text-muted)',
                  '&:hover': { color: '#42a5f5' } }}>
                {t('detail.relaunchDiag')}
              </Button>
              {hasOrphans && (
                <Button size="small" variant="contained" color="error"
                  onClick={() => setCleanStep1(true)}
                  sx={{ fontSize: 12, textTransform: 'none', borderRadius: '7px', fontWeight: 700 }}>
                  Tout nettoyer ({fmt(totalOrphanSize)})
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation suppression individuelle ──────────────────────────── */}
      <Dialog open={!!confirmFile} onClose={() => setConfirmFile(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px', background: '#0c0f14',
          border: '1px solid rgba(255,255,255,0.09)' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 0.5 }}>{t('detail.confirmDelete')}</DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('detail.confirmDeleteBody')}
          </div>
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 6,
            background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.2)' }}>
            <code style={{ fontSize: 12, color: '#fc3d39', fontFamily: 'monospace' }}>
              {confirmFile?.name}
            </code>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFile(null)} sx={{ textTransform: 'none' }}>{t('common.cancel')}</Button>
          <Button color="error" variant="outlined"
            onClick={() => { onDeleteFile(confirmFile.absPath); setConfirmFile(null) }}
            sx={{ textTransform: 'none' }}>
            {t('detail.deleteFile')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Tout nettoyer — Étape 1 ────────────────────────────────────────── */}
      <Dialog open={cleanStep1} onClose={() => setCleanStep1(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px', background: '#0c0f14',
          border: '1px solid rgba(255,255,255,0.09)' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 0.5 }}>{t('detail.confirmClean')}</DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Vous allez supprimer{' '}
            <strong style={{ color: '#f0a030' }}>
              {orphanMeshes.length + orphanTextures.length} fichier{orphanMeshes.length + orphanTextures.length !== 1 ? 's' : ''} orphelin{orphanMeshes.length + orphanTextures.length !== 1 ? 's' : ''}
            </strong>{' '}
            représentant{' '}
            <strong style={{ color: '#42a5f5' }}>{fmt(totalOrphanSize)}</strong>{' '}
            d'espace disque.
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: 'rgba(252,61,57,0.05)', border: '1px solid rgba(252,61,57,0.18)',
            fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            ⚠ Cette action est <strong style={{ color: '#fc3d39' }}>irréversible</strong> — les
            fichiers seront supprimés définitivement du disque.
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanStep1(false)} sx={{ textTransform: 'none' }}>{t('common.cancel')}</Button>
          <Button color="warning" variant="outlined"
            onClick={() => { setCleanStep1(false); setCleanStep2(true) }}
            sx={{ textTransform: 'none' }}>
            {t('detail.confirmCleanBody')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Tout nettoyer — Étape 2 (dernière confirmation) ───────────────── */}
      <Dialog open={cleanStep2} onClose={() => setCleanStep2(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px', background: '#0c0f14',
          border: '1px solid rgba(255,255,255,0.09)' } }}>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700, pb: 0.5, color: '#fc3d39' }}>
          ⚠️ Dernière confirmation
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Confirmer la suppression définitive de{' '}
            <strong style={{ color: '#fc3d39' }}>
              {orphanMeshes.length + orphanTextures.length} fichier{orphanMeshes.length + orphanTextures.length !== 1 ? 's' : ''}
            </strong>{' '}
            orphelins ?
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Il n'y a aucun moyen d'annuler cette opération.
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanStep2(false)} sx={{ textTransform: 'none' }}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained"
            onClick={() => {
              setCleanStep2(false)
              onDeleteAll([
                ...orphanMeshes.map(m => m.absPath),
                ...orphanTextures.map(t => t.absPath),
                ...orphanSounds.map(s => s.absPath),
              ])
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            SUPPRIMER DÉFINITIVEMENT
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  )
}

// ── Onglet Contenu ─────────────────────────────────────────────────────────
function TabContenu({ project, fontDetails }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><FolderOutlinedIcon sx={{ fontSize: 14 }} /> {t('detail.syncFolders')}</div>
        <PathRow Icon={DirectionsBusOutlinedIcon} label="Vehicles (obligatoire)" value={project.vehicles} />
        <PathRow Icon={FolderOutlinedIcon}        label="Addons (facultatif)"    value={project.addons} />
        <PathRow Icon={MusicNoteOutlinedIcon}     label="Sounds (facultatif)"    value={project.sounds} />
        {!project.vehicles && !project.addons && !project.sounds && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            Aucun dossier configuré.
          </div>
        )}
      </div>

      {(project.fonts?.length || 0) > 0 && (
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title">
            <FontDownloadOutlinedIcon sx={{ fontSize: 14 }} /> Polices OMSI — {project.fonts.length} fichier(s) .oft
          </div>
          {fontDetails.map((detail, i) => {
            if (!detail) return null
            const name = detail.oftPath.split(/[\\/]/).pop()
            return (
              <div key={`font-${detail.oftPath}-${i}`} style={{ padding: '9px 0',
                borderBottom: i < fontDetails.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <FontDownloadOutlinedIcon sx={{ fontSize: 13, color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    (Windows-1252)
                  </span>
                </div>
                {detail.images.length > 0 ? (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingLeft: 21 }}>
                    {detail.images.map((img, imgIdx) => (
                      <span key={`${img.name}-${imgIdx}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: img.exists ? 'rgba(108,203,95,0.07)' : 'rgba(252,61,57,0.07)',
                        border: `1px solid ${img.exists ? 'rgba(108,203,95,0.2)' : 'rgba(252,61,57,0.2)'}`,
                        color: img.exists ? '#6ccb5f' : '#fc3d39',
                        fontSize: 11, padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace'
                      }}>
                        {img.exists ? '✓' : '✗'} {img.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 21 }}>
                    Aucune image détectée dans ce .oft
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><CloudOutlinedIcon sx={{ fontSize: 14 }} /> Dossier distant</div>
        <code style={{ fontSize: 12, color: 'var(--text-primary)', background: 'rgba(255,255,255,0.06)',
          padding: '3px 10px', borderRadius: 4, fontFamily: 'monospace', display: 'inline-block' }}>
          /srv/nerosy/backups/{project.name.replace(/\s+/g, '_')}/
        </code>
      </div>
    </div>
  )
}

// ── Modale Détail Version ──────────────────────────────────────────────────
function VersionDetailModal({ v, project, isAdmin, userCanPull, cinStatus,
                               installedEntry, isOperating, installing,
                               onInstall, onTogglePublish, onDeprecate,
                               actionLoading, onClose }) {
  const { t } = useTranslation()
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false)

  const isPublished  = v.id === null || !!v.is_published
  const isDeprecated = !!v.is_deprecated
  const isDraft      = v.id !== null && !v.is_published
  const isInstalled  = !!cinStatus?.zipName && cinStatus.zipName === v.name
  const isActioning  = actionLoading === v.id
  const isDowngrade  = !isInstalled && installedEntry && v.modifyTime < installedEntry.modifyTime
  const isThis       = installing === v.name

  const handleInstallClick = () => {
    if (isDowngrade && !showDowngradeWarning) { setShowDowngradeWarning(true); return }
    onInstall(v)
    onClose()
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { maxHeight: '88vh' } }}>
      <DialogTitle sx={{ pb: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: isDeprecated ? 'var(--text-muted)' : '#fff' }}>
                {v.version_name ?? v.versionName}
              </span>
              {isDraft      && <StatusTag color="gray">{t('detail.statusDraft')}</StatusTag>}
              {isDeprecated && <StatusTag color="red">{t('detail.statusOutdated')}</StatusTag>}
              {isInstalled  && <StatusTag color="green">{t('detail.statusInstalled')}</StatusTag>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.5 }} />
              {v.modifyTime ? formatDate(v.modifyTime) : '—'}
            </div>
          </div>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', mt: -0.5 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Section Admin */}
        {isAdmin && v.id != null && (
          <Box sx={{ p: '8px 12px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1.5,
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPublished}
                  disabled={isActioning}
                  onChange={e => onTogglePublish(v, e.target.checked)}
                  size="small"
                />
              }
              label={<span style={{ fontSize: 13 }}>Publier</span>}
            />
            {!isDeprecated && (
              <Button
                variant="text"
                size="small"
                startIcon={isActioning ? <CircularProgress size={13} /> : <BlockOutlinedIcon />}
                onClick={() => onDeprecate(v)}
                disabled={isActioning}
                sx={{ color: '#f0a030' }}
              >
                Deprecate
              </Button>
            )}
          </Box>
        )}

        {/* Infos fichier */}
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taille</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              {formatBytes(v.file_size ?? v.size)}
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fichier</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={v.name}>
              {v.name || '—'}
            </div>
          </div>
        </div>

        {/* Changelog */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Changelog
          </div>
          {isDeprecated ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6,
              padding: '7px 10px', background: 'rgba(252,61,57,0.05)',
              border: '1px solid rgba(252,61,57,0.15)', borderRadius: 5 }}>
              Le contenu de cette version n'est plus disponible (Version périmée).
            </div>
          ) : v.changelog ? (
            <div style={{
              fontSize: 13, color: '#b0b0b0', lineHeight: 1.7,
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.2)', borderRadius: 5,
              borderLeft: '2px solid rgba(255,255,255,0.1)',
              overflowX: 'auto'
            }}
              className="cin-markdown"
            >
              <ReactMarkdown>{v.changelog}</ReactMarkdown>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Aucun changement renseigné.
            </div>
          )}
        </div>
      </DialogContent>

      <DialogActions sx={{ p: '12px 20px', flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {/* Bandeau downgrade */}
        {showDowngradeWarning && (
          <Box sx={{ p: '7px 10px', borderRadius: 1.5, mb: 0.5,
            background: 'rgba(240,160,48,0.08)', border: '1px solid rgba(240,160,48,0.3)',
            display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: '#f0a030', flexShrink: 0, mt: 0.1 }} />
            <Typography sx={{ fontSize: 12, color: '#f0a030', lineHeight: 1.55 }}>
              Cette version est antérieure à la version actuellement installée.
              Continuer peut provoquer des incompatibilités.
            </Typography>
          </Box>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="outlined" size="small" onClick={onClose}>{t('common.close')}</Button>
          {userCanPull && !isDeprecated && (
            <Button
              variant="contained"
              size="small"
              sx={showDowngradeWarning ? { background: '#f0a030', '&:hover': { background: '#c87d20' } } : {}}
              startIcon={isThis ? <CircularProgress size={13} color="inherit" /> : isInstalled ? <SyncOutlinedIcon /> : <CloudDownloadOutlinedIcon />}
              onClick={handleInstallClick}
              disabled={isOperating || !!installing}
            >
              {isThis
                ? t('detail.installing')
                : showDowngradeWarning
                  ? 'Continuer quand même'
                  : isInstalled
                    ? 'Réparer'
                    : t('detail.install')}
            </Button>
          )}
          {!userCanPull && !isDeprecated && (
            <Button variant="outlined" size="small" disabled>Permission requise</Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  )
}

// ── Onglet Versions ────────────────────────────────────────────────────────
function TabVersions({ project, settings, onInstall, isOperating, cinStatus, refreshTrigger, userCanPull, userCanPush, user }) {
  const { t } = useTranslation()
  const [versions,        setVersions]        = useState([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [installing,      setInstalling]      = useState(null)
  const [actionLoading,   setActionLoading]   = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)

  const isAdmin = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  const isConfigured = settings.vpsIp && settings.vpsUser && settings.sshKeyPath

  const loadVersions = useCallback(async () => {
    if (!isConfigured) return
    setLoading(true); setError(null)
    try {
      const [sftpRes, apiVersions] = await Promise.allSettled([
        window.api.sftp.listVersions(project, settings),
        projectService.getVersions(project.id)
      ])

      if (sftpRes.status === 'rejected' || !sftpRes.value?.success) {
        setError(sftpRes.value?.error || sftpRes.reason?.message || 'Erreur SFTP')
        return
      }

      const sftpByZip         = {}
      const sftpByVersionName = {}
      sftpRes.value.versions.forEach(v => {
        sftpByZip[v.name] = v
        if (v.versionName) sftpByVersionName[v.versionName] = v
      })

      if (apiVersions.status === 'fulfilled') {
        const raw     = apiVersions.value
        const sqlList = Array.isArray(raw) ? raw : (raw?.versions || raw?.history || [])
        const merged  = sqlList.map(m => {
          const zipKey = m.zip_name || m.zipName
          const sftp   = sftpByZip[zipKey] || (!zipKey ? sftpByVersionName[m.version_name] : null)
          return {
            name:          sftp?.name || zipKey || '',
            versionName:   sftp?.versionName || m.version_name,
            modifyTime:    sftp?.modifyTime   || 0,
            id:            m.id ?? m.version_id ?? null,
            version_name:  m.version_name,
            zip_name:      sftp?.name || zipKey,
            file_size:     m.file_size ?? sftp?.size,
            is_published:  m.is_published,
            is_deprecated: m.is_deprecated,
            changelog:     m.changelog
          }
        })
        setVersions([...merged].sort((a, b) => b.modifyTime - a.modifyTime))
      } else {
        const fallback = sftpRes.value.versions.map(v => ({ ...v, id: null, is_published: null, is_deprecated: false }))
        setVersions([...fallback].sort((a, b) => b.modifyTime - a.modifyTime))
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [project, settings, isConfigured])

  useEffect(() => { loadVersions() }, [loadVersions])
  useEffect(() => { if (refreshTrigger > 0) loadVersions() }, [refreshTrigger])

  useEffect(() => {
    if (!selectedVersion) return
    const updated = versions.find(v => v.id != null && v.id === selectedVersion.id)
                 || versions.find(v => v.name === selectedVersion.name)
    if (updated) setSelectedVersion(updated)
  }, [versions])

  const doInstall = async (v) => {
    setInstalling(v.name)
    await onInstall(v.name, { versionName: v.version_name ?? v.versionName, changelog: v.changelog })
    setInstalling(null)
    loadVersions()
  }

  const installedEntry = cinStatus?.zipName
    ? versions.find(v => v.name === cinStatus.zipName) : null

  const handleTogglePublish = async (v, checked) => {
    if (!v.id) return
    setActionLoading(v.id)
    try {
      if (checked) await projectService.publishVersion(project.id, v.id)
      else         await projectService.unpublishVersion(project.id, v.id)
      await loadVersions()
    } catch (e) {
      console.error('[Cinnamon] Erreur toggle publication:', e?.response?.data || e.message)
    } finally { setActionLoading(null) }
  }

  const handleDeprecate = async (v) => {
    if (!v.id) return
    setActionLoading(v.id)
    try {
      await projectService.deprecateVersion(project.id, v.id)
      await loadVersions()
    } catch (e) {
      console.error('[Cinnamon] Erreur dépréciation:', e?.response?.data || e.message)
    } finally { setActionLoading(null) }
  }

  if (!isConfigured) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <div style={{ fontSize: 13, color: '#f0a030' }}>
          Configurez d'abord la connexion au serveur dans les Paramètres.
        </div>
      </div>
    )
  }

  const visibleVersions = versions.filter(
    v => userCanPush || (v.id !== null && !!v.is_published)
  )

  return (
    <>
      {selectedVersion && (
        <VersionDetailModal
          v={selectedVersion}
          project={project}
          isAdmin={isAdmin}
          userCanPull={userCanPull}
          cinStatus={cinStatus}
          installedEntry={installedEntry}
          isOperating={isOperating}
          installing={installing}
          onInstall={doInstall}
          onTogglePublish={handleTogglePublish}
          onDeprecate={handleDeprecate}
          actionLoading={actionLoading}
          onClose={() => setSelectedVersion(null)}
        />
      )}

      <div className="w11-card" style={{ marginBottom: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="w11-card-title" style={{ marginBottom: 0 }}>
            <CloudOutlinedIcon sx={{ fontSize: 14 }} /> Versions disponibles
            {visibleVersions.length > 0 && (
              <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                {visibleVersions.length}
              </span>
            )}
          </div>
          <Button variant="text" size="small" startIcon={loading ? <CircularProgress size={13} /> : <RefreshOutlinedIcon />}
            onClick={loadVersions} disabled={loading}>
            {t('common.refresh')}
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0', gap: 10 }}>
            <CircularProgress size={20} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Connexion au serveur...</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '10px 12px', background: 'rgba(252,61,57,0.07)',
            border: '1px solid rgba(252,61,57,0.25)', borderRadius: 6, fontSize: 13, color: '#fc3d39' }}>
            Impossible de se connecter : {error}
          </div>
        )}

        {!loading && !error && visibleVersions.length === 0 && (
          <div className="empty-state" style={{ padding: '28px 0' }}>
            <div className="empty-state-icon"><CloudOutlinedIcon sx={{ fontSize: 40, opacity: 0.25 }} /></div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Aucune version disponible.</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Effectuez un premier PUSH pour créer une version.
            </div>
          </div>
        )}

        {!loading && !error && visibleVersions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {visibleVersions.map((v, i) => {
              const isLatest     = i === 0
              const isPublished  = v.id === null || !!v.is_published
              const isDraft      = v.id !== null && !v.is_published
              const isDeprecated = !!v.is_deprecated
              const isInstalled  = !!cinStatus?.zipName && cinStatus.zipName === v.name
              return (
                <div
                  key={v.name}
                  onClick={() => { console.log('Détails de la version ouverte :', v); setSelectedVersion(v) }}
                  style={{
                    cursor: 'pointer',
                    padding: '9px 12px', borderRadius: 6,
                    background: isDeprecated ? 'rgba(252,61,57,0.04)' : isDraft ? 'rgba(255,255,255,0.03)' : isLatest ? 'rgba(25,118,210,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isDeprecated ? 'rgba(252,61,57,0.18)' : isDraft ? 'rgba(255,255,255,0.08)' : isLatest ? 'rgba(66,165,245,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    transition: 'filter 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                  onMouseLeave={e => e.currentTarget.style.filter = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isDeprecated ? 'var(--text-muted)' : '#fff' }}>
                      {v.version_name ?? v.versionName}
                    </span>
                    {isLatest && !isDraft && !isDeprecated && <StatusTag color="blue">{t('detail.statusLatest')}</StatusTag>}
                    {isDraft      && <StatusTag color="gray">{t('detail.statusDraft')}</StatusTag>}
                    {isDeprecated && <StatusTag color="red">{t('detail.statusOutdated')}</StatusTag>}
                    {isInstalled  && <StatusTag color="green">{t('detail.statusInstalled')}</StatusTag>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 11 }} /> {formatDate(v.modifyTime)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Onglet Équipe ──────────────────────────────────────────────────────────
function TabTeam({ project, projectLoading, user, onProjectUpdate }) {
  const { t } = useTranslation()
  const [members,       setMembers]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [searchError,   setSearchError]   = useState(null)
  const [adding,        setAdding]        = useState(false)
  const [updatingId,    setUpdatingId]    = useState(null)
  const [removingId,    setRemovingId]    = useState(null)
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [backlogEnabled,  setBacklogEnabled]  = useState(!!(project.backlog_enabled))
  const [ticketingEnabled, setTicketingEnabled] = useState(!!(project.ticketing_enabled))
  const searchRef = useRef(null)

  // Sync des switches depuis la prop dès que fullProject est chargé depuis l'API
  useEffect(() => {
    setBacklogEnabled(!!(project.backlog_enabled))
    setTicketingEnabled(!!(project.ticketing_enabled))
  }, [project.backlog_enabled, project.ticketing_enabled])

  const ownerEmail = project.owner?.email || ''

  const isAdmin = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const loadMembers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await projectService.getMembers(project.id)
      setMembers(Array.isArray(data) ? data : (data?.members || []))
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Erreur lors du chargement.')
    } finally { setLoading(false) }
  }, [project.id])

  useEffect(() => { loadMembers() }, [loadMembers])

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]); setDropdownOpen(false); return
    }
    const timer = setTimeout(async () => {
      setSearching(true); setSearchError(null)
      try {
        const data = await projectService.searchUsers(searchQuery)
        const results = Array.isArray(data) ? data : (data?.users || [])
        setSearchResults(results)
        setDropdownOpen(results.length > 0 || true)
      } catch (e) {
        setSearchError(e?.response?.data?.message || e?.message || 'Erreur de recherche.')
        setSearchResults([])
        setDropdownOpen(true)
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const resolveUid = (m) => String(m.user_id ?? m.id)
  const memberIdSet = new Set(members.map(resolveUid))

  const handleAdd = async (found) => {
    setAdding(true); setSearchError(null)
    try {
      console.log('POST /projects/:id/members — payload:', { user_id: found.id, can_pull: true, can_push: false })
      await projectService.addMember(project.id, { user_id: found.id, can_pull: true, can_push: false })
      setSearchQuery(''); setSearchResults([]); setDropdownOpen(false)
      await loadMembers()
    } catch (e) {
      setSearchError(e?.response?.data?.message || e?.message || "Impossible d'ajouter ce membre.")
    } finally { setAdding(false) }
  }

  const handlePermission = async (userId, field, value) => {
    const uid = String(userId)
    setUpdatingId(uid)
    const previous = members.find(m => resolveUid(m) === uid)
    try {
      console.log(`PATCH /projects/${project.id}/members/${userId} —`, { [field]: value })
      const res = await projectService.updateMember(project.id, userId, { [field]: value })
      console.log('Nouveau statut membre:', res.data)
      if (res.data) {
        setMembers(prev => prev.map(m => resolveUid(m) === uid ? { ...m, ...res.data } : m))
      }
    } catch (e) {
      if (previous) {
        setMembers(prev => prev.map(m => resolveUid(m) === uid ? previous : m))
      } else {
        await loadMembers()
      }
      setError(e?.response?.data?.message || e?.message || 'Mise à jour impossible.')
      setTimeout(() => setError(null), 4000)
    } finally { setUpdatingId(null) }
  }

  const handleRemove = async (userId) => {
    setRemovingId(String(userId))
    try {
      await projectService.removeMember(project.id, userId)
      setMembers(prev => prev.filter(m => resolveUid(m) !== String(userId)))
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Suppression impossible.')
    } finally { setRemovingId(null) }
  }

  const handleToggleFeature = async (field, value) => {
    setSavingFeatures(true)
    try {
      const updated = await projectService.updateFeatures(project.id, { [field]: value })
      // Confirmation 200 reçue — on met à jour l'état visuel et le parent
      const confirmed = updated?.[field] ?? value
      if (field === 'backlog_enabled')   setBacklogEnabled(!!(confirmed))
      if (field === 'ticketing_enabled') setTicketingEnabled(!!(confirmed))
      if (onProjectUpdate) onProjectUpdate({ [field]: confirmed })
    } catch (e) {
      console.error('[Cinnamon] Erreur mise à jour fonctionnalités:', e.message)
    } finally { setSavingFeatures(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Paramètres du projet (owner only) */}
      {isAdmin && (
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title"><TuneOutlinedIcon sx={{ fontSize: 14 }} /> Paramètres du projet</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('detail.enableBacklogs')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('detail.backlogsDesc')}</div>
              </div>
              {projectLoading
                ? <CircularProgress size={16} sx={{ flexShrink: 0 }} />
                : <Switch
                    checked={backlogEnabled}
                    onChange={(e) => handleToggleFeature('backlog_enabled', e.target.checked)}
                    disabled={savingFeatures}
                    size="small"
                  />
              }
            </div>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Activer Ticketing</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Permet de soumettre et suivre des tickets de bug ou support</div>
              </div>
              {projectLoading
                ? <CircularProgress size={16} sx={{ flexShrink: 0 }} />
                : <Switch
                    checked={ticketingEnabled}
                    onChange={(e) => handleToggleFeature('ticketing_enabled', e.target.checked)}
                    disabled={savingFeatures}
                    size="small"
                  />
              }
            </div>
          </div>
        </div>
      )}

      {/* Propriétaire */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><PersonOutlinedIcon sx={{ fontSize: 14 }} /> {t('detail.owner')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(66,165,245,0.12)',
            border: '1px solid rgba(66,165,245,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <PersonOutlinedIcon sx={{ fontSize: 18, color: '#42a5f5' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {project.owner
                ? `${project.owner.first_name || ''} ${project.owner.last_name || ''}`.trim()
                  + (project.owner.username ? ` (@${project.owner.username})` : '')
                : t('common.loading')}
            </div>
            {ownerEmail && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ownerEmail}</div>
            )}
          </div>
        </div>
      </div>

      {/* Liste des membres */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="w11-card-title" style={{ marginBottom: 0 }}>
            <PeopleAltOutlinedIcon sx={{ fontSize: 14 }} /> {t('detail.teamMembers')}
            {members.length > 0 && (
              <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                {members.length}
              </span>
            )}
          </div>
          <IconButton size="small" onClick={loadMembers} disabled={loading}>
            <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0', gap: 8 }}>
            <CircularProgress size={18} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('common.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '8px 12px', background: 'rgba(252,61,57,0.07)',
            border: '1px solid rgba(252,61,57,0.25)', borderRadius: 6, fontSize: 13, color: '#fc3d39' }}>
            {error}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
            Aucun membre pour le moment.
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary' }}>
                  Utilisateur
                </TableCell>
                <TableCell sx={{ width: 80, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', textAlign: 'center' }}>
                  Pull
                </TableCell>
                <TableCell sx={{ width: 80, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', textAlign: 'center' }}>
                  Push
                </TableCell>
                {backlogEnabled && (
                  <TableCell sx={{ width: 90, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', textAlign: 'center' }}>
                    Backlogs
                  </TableCell>
                )}
                {ticketingEnabled && (
                  <TableCell sx={{ width: 90, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', textAlign: 'center' }}>
                    Ticketing
                  </TableCell>
                )}
                {isAdmin && <TableCell sx={{ width: 44 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map(m => {
                const uid       = resolveUid(m)
                const rowKey    = String(m.id ?? uid)
                const isOwner   = Number(m.user_id ?? m.id) === Number(project.owner_id)
                const fullName  = `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim() || m.email
                const isUpdating = updatingId === uid
                const isRemoving = removingId === uid
                const switchDisabled = !isAdmin || isUpdating || isOwner
                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: isOwner ? 'rgba(66,165,245,0.12)' : 'rgba(255,255,255,0.06)',
                          border: isOwner ? '1px solid rgba(66,165,245,0.3)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <PersonOutlinedIcon sx={{ fontSize: 14, color: isOwner ? '#42a5f5' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{fullName}</span>
                            {isOwner && <StatusTag color="blue">{t('detail.owner')}</StatusTag>}
                          </div>
                          {m.email && fullName !== m.email && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell sx={{ width: 80, textAlign: 'center' }}>
                      {isUpdating
                        ? <CircularProgress size={14} />
                        : (
                          <Switch
                            checked={isOwner ? true : !!m.can_pull}
                            disabled={switchDisabled}
                            size="small"
                            onChange={e => handlePermission(uid, 'can_pull', e.target.checked)}
                          />
                        )
                      }
                    </TableCell>

                    <TableCell sx={{ width: 80, textAlign: 'center' }}>
                      {isUpdating
                        ? <CircularProgress size={14} />
                        : (
                          <Switch
                            checked={isOwner ? true : !!m.can_push}
                            disabled={switchDisabled}
                            size="small"
                            onChange={e => handlePermission(uid, 'can_push', e.target.checked)}
                          />
                        )
                      }
                    </TableCell>

                    {backlogEnabled && (
                      <TableCell sx={{ width: 90, textAlign: 'center' }}>
                        {isUpdating
                          ? <CircularProgress size={14} />
                          : (
                            <Switch
                              checked={isOwner ? true : !!m.backlog_access}
                              disabled={switchDisabled}
                              size="small"
                              onChange={e => handlePermission(uid, 'backlog_access', e.target.checked)}
                            />
                          )
                        }
                      </TableCell>
                    )}

                    {ticketingEnabled && (
                      <TableCell sx={{ width: 90, textAlign: 'center' }}>
                        {isUpdating
                          ? <CircularProgress size={14} />
                          : (
                            <Switch
                              checked={isOwner ? true : !!m.ticketing_access}
                              disabled={switchDisabled}
                              size="small"
                              onChange={e => handlePermission(uid, 'ticketing_access', e.target.checked)}
                            />
                          )
                        }
                      </TableCell>
                    )}

                    {isAdmin && (
                      <TableCell sx={{ width: 44, textAlign: 'center' }}>
                        <Tooltip title={t('detail.removeFromTeam')}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={!!removingId || isOwner}
                              onClick={() => handleRemove(uid)}
                              sx={{ color: '#fc3d39', p: '4px' }}
                            >
                              {isRemoving
                                ? <CircularProgress size={14} />
                                : <PersonRemoveOutlinedIcon sx={{ fontSize: 15 }} />
                              }
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invitation */}
      {isAdmin && (
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title"><PersonAddOutlinedIcon sx={{ fontSize: 14 }} /> Inviter un utilisateur</div>
          <div style={{ position: 'relative' }}>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <TextField
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setDropdownOpen(true) }}
                onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
                placeholder="Rechercher par nom, username ou e-mail…"
                fullWidth
                size="small"
                disabled={adding}
                InputProps={{
                  endAdornment: searching ? <CircularProgress size={14} /> : undefined
                }}
              />

              {dropdownOpen && searchQuery.length >= 2 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  zIndex: 200, borderRadius: 6, overflow: 'hidden',
                  background: '#1e2328',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {searching && (
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                      color: 'var(--text-muted)', fontSize: 12 }}>
                      <CircularProgress size={12} /> Recherche en cours…
                    </div>
                  )}
                  {!searching && searchResults.map(u => {
                    const uName = `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim()
                      || u.username || u.email
                    const alreadyMember = memberIdSet.has(String(u.id))
                    return (
                      <div key={u.id} style={{
                        padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: 12,
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                            {uName}
                            {u.username && uName !== u.username && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>
                                @{u.username}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                        {alreadyMember ? (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                            Déjà membre
                          </span>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={adding ? <CircularProgress size={12} color="inherit" /> : <PersonAddOutlinedIcon />}
                            disabled={adding}
                            onClick={() => handleAdd(u)}
                          >
                            Ajouter
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  {!searching && searchResults.length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: 12,
                      color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Aucun utilisateur trouvé pour « {searchQuery} ».
                    </div>
                  )}
                </div>
              )}
            </div>
            {searchError && (
              <div style={{ fontSize: 12, color: '#fc3d39', marginTop: 5 }}>{searchError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modale Apparence (bannière / logo) ─────────────────────────────────────
function AppearanceModal({ open, onClose, project, onUpdate }) {
  const { t } = useTranslation()
  const bannerInputRef = useRef(null)
  const logoInputRef   = useRef(null)
  const [bannerLoading, setBannerLoading] = useState(false)
  const [logoLoading,   setLogoLoading]   = useState(false)
  const [errorMsg,      setErrorMsg]      = useState(null)

  const bannerUrl = project?.banner_url
  const logoUrl   = project?.logo_url

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerLoading(true); setErrorMsg(null)
    try {
      const data = await projectService.uploadBanner(project.id, file)
      onUpdate(data)
    } catch { setErrorMsg('Erreur lors de l\'upload de la bannière.') }
    finally { setBannerLoading(false); if (bannerInputRef.current) bannerInputRef.current.value = '' }
  }

  const handleBannerDelete = async () => {
    setBannerLoading(true); setErrorMsg(null)
    try { const data = await projectService.deleteBanner(project.id); onUpdate(data) }
    catch { setErrorMsg('Erreur lors de la suppression de la bannière.') }
    finally { setBannerLoading(false) }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoLoading(true); setErrorMsg(null)
    try {
      const data = await projectService.uploadLogo(project.id, file)
      onUpdate(data)
    } catch { setErrorMsg('Erreur lors de l\'upload du logo.') }
    finally { setLogoLoading(false); if (logoInputRef.current) logoInputRef.current.value = '' }
  }

  const handleLogoDelete = async () => {
    setLogoLoading(true); setErrorMsg(null)
    try { const data = await projectService.deleteLogo(project.id); onUpdate(data) }
    catch { setErrorMsg('Erreur lors de la suppression du logo.') }
    finally { setLogoLoading(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '8px', background: '#1a1d21' } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrushOutlinedIcon sx={{ fontSize: 17, color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              {t('detail.editAppearance')}
            </span>
          </div>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        {errorMsg && (
          <div style={{ marginBottom: 14, padding: '7px 12px', borderRadius: 6,
            background: 'rgba(252,61,57,0.08)', border: '1px solid rgba(252,61,57,0.22)',
            fontSize: 12, color: '#fc3d39', fontFamily: 'Inter, sans-serif' }}>
            {errorMsg}
          </div>
        )}

        {/* ── Bannière ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10,
            fontFamily: 'Inter, sans-serif' }}>
            Bannière
            <span style={{ marginLeft: 8, fontWeight: 400, letterSpacing: 0,
              textTransform: 'none', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              Format recommandé : 1920 × 400 px
            </span>
          </div>

          {/* Aperçu bannière */}
          <Box sx={{
            position: 'relative',
            width: '100%',
            height: bannerUrl ? 130 : 60,
            borderRadius: '8px',
            overflow: 'hidden',
            mb: 1.5,
            background: bannerUrl ? '#0d0d0d'
              : 'linear-gradient(135deg, rgba(13,71,161,0.15) 0%, rgba(26,35,126,0.20) 100%)',
            border: bannerUrl ? 'none' : '1px dashed rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {bannerUrl ? (
              <>
                <Box component="img" src={bannerUrl}
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center top' }} />
                <Box sx={{ position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 60%)',
                  pointerEvents: 'none' }} />
              </>
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Inter, sans-serif' }}>
                Aucune bannière définie
              </span>
            )}
          </Box>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input ref={bannerInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleBannerUpload} />
            <Button variant="outlined" size="small" disabled={bannerLoading}
              startIcon={bannerLoading ? <CircularProgress size={12} /> : <CloudUploadOutlinedIcon />}
              onClick={() => bannerInputRef.current?.click()}
              sx={{ borderRadius: '6px', fontSize: 12, textTransform: 'none' }}>
              {bannerUrl ? 'Remplacer la bannière' : 'Uploader une bannière'}
            </Button>
            {bannerUrl && (
              <Button variant="outlined" size="small" disabled={bannerLoading}
                startIcon={bannerLoading ? <CircularProgress size={12} /> : <DeleteOutlinedIcon />}
                onClick={handleBannerDelete}
                sx={{ borderRadius: '6px', fontSize: 12, textTransform: 'none',
                  color: '#fc3d39', borderColor: 'rgba(252,61,57,0.3)',
                  '&:hover': { borderColor: '#fc3d39', background: 'rgba(252,61,57,0.06)' } }}>
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        {/* ── Logo ─────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10,
            fontFamily: 'Inter, sans-serif' }}>
            Logo du projet
            <span style={{ marginLeft: 8, fontWeight: 400, letterSpacing: 0,
              textTransform: 'none', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
              PNG transparent recommandé · max-height 120 px
            </span>
          </div>

          {/* Aperçu logo */}
          <Box sx={{
            width: '100%', height: logoUrl ? 'auto' : 60,
            minHeight: logoUrl ? 70 : 60,
            borderRadius: '8px', mb: 1.5,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: logoUrl ? 2 : 0,
          }}>
            {logoUrl ? (
              <Box component="img" src={logoUrl}
                sx={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain',
                  filter: 'drop-shadow(0px 2px 6px rgba(0,0,0,0.4))' }} />
            ) : (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)',
                fontFamily: 'Inter, sans-serif' }}>
                Aucun logo défini
              </span>
            )}
          </Box>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input ref={logoInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleLogoUpload} />
            <Button variant="outlined" size="small" disabled={logoLoading}
              startIcon={logoLoading ? <CircularProgress size={12} /> : <CloudUploadOutlinedIcon />}
              onClick={() => logoInputRef.current?.click()}
              sx={{ borderRadius: '6px', fontSize: 12, textTransform: 'none' }}>
              {logoUrl ? 'Remplacer le logo' : 'Uploader un logo'}
            </Button>
            {logoUrl && (
              <Button variant="outlined" size="small" disabled={logoLoading}
                startIcon={logoLoading ? <CircularProgress size={12} /> : <DeleteOutlinedIcon />}
                onClick={handleLogoDelete}
                sx={{ borderRadius: '6px', fontSize: 12, textTransform: 'none',
                  color: '#fc3d39', borderColor: 'rgba(252,61,57,0.3)',
                  '&:hover': { borderColor: '#fc3d39', background: 'rgba(252,61,57,0.06)' } }}>
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Helpers Backlog/Ticket ─────────────────────────────────────────────────

const BACKLOG_STATUSES = [
  { value: 'nouveau',    label: 'Nouveau',    color: 'default' },
  { value: 'a_l_etude',  label: 'À l\'étude', color: 'info'    },
  { value: 'approuve',   label: 'Approuvé',   color: 'success' },
  { value: 'rejete',     label: 'Rejeté',     color: 'error'   },
]

const TICKET_STATUSES = [
  { value: 'nouveau',           label: 'Nouveau',           color: 'default' },
  { value: 'confirme',          label: 'Confirmé',          color: 'info'    },
  { value: 'en_cours',          label: 'En cours',          color: 'warning' },
  { value: 'termine',           label: 'Terminé',           color: 'success' },
  { value: 'rejete',            label: 'Rejeté',            color: 'error'   },
  { value: 'reprod_impossible', label: 'Reprod impossible', color: 'default' },
]

function formatApiError(e) {
  if (e?.response?.status === 404) return 'Route API manquante, vérifiez le montage du serveur.'
  return e?.response?.data?.message || e?.message || 'Erreur inattendue.'
}

const TICKET_PRIORITIES = [
  { value: 'bas',      label: 'Bas',      color: '#9aa0a6' },
  { value: 'normal',   label: 'Normal',   color: '#42a5f5' },
  { value: 'urgent',   label: 'Urgent',   color: '#f0a030' },
  { value: 'critique', label: 'Critique', color: '#fc3d39' },
]

function BacklogStatusChip({ status }) {
  const s = BACKLOG_STATUSES.find(x => x.value === status) || BACKLOG_STATUSES[0]
  return <Chip label={s.label} color={s.color} size="small" sx={{ fontSize: 10, height: 20 }} />
}

function TicketStatusChip({ status }) {
  const s = TICKET_STATUSES.find(x => x.value === status) || TICKET_STATUSES[0]
  return <Chip label={s.label} color={s.color} size="small" sx={{ fontSize: 10, height: 20 }} />
}

function PriorityChip({ priority }) {
  const p = TICKET_PRIORITIES.find(x => x.value === priority) || TICKET_PRIORITIES[1]
  return (
    <Chip
      label={p.label}
      size="small"
      sx={{
        fontSize: 10, height: 20,
        background: p.color + '22',
        color: p.color,
        border: `1px solid ${p.color}55`,
        fontWeight: 700,
      }}
    />
  )
}

// ── Composant générique de liste Backlog/Ticket ─────────────────────────────
function ItemDetailView({ item, isOwner, projectId, onBack, onRefresh, type }) {
  const { t } = useTranslation()
  const [newComment,     setNewComment]     = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingImg,   setUploadingImg]   = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [localItem,      setLocalItem]      = useState(item)
  const [inlineError,    setInlineError]    = useState(null)
  const imgInputRef = useRef(null)

  const handleSendComment = async () => {
    if (!newComment.trim()) return
    setSendingComment(true)
    try {
      if (type === 'backlog') {
        await projectService.addBacklogComment(projectId, localItem.id, newComment.trim())
      } else {
        await projectService.addTicketComment(projectId, localItem.id, newComment.trim())
      }
      setNewComment('')
      await onRefresh(localItem.id, (updated) => setLocalItem(updated))
    } catch (e) {
      setInlineError(formatApiError(e))
    } finally { setSendingComment(false) }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    try {
      if (type === 'backlog') {
        await projectService.uploadBacklogImage(projectId, localItem.id, file)
      } else {
        await projectService.uploadTicketImage(projectId, localItem.id, file)
      }
      await onRefresh(localItem.id, (updated) => setLocalItem(updated))
    } catch (e) {
      setInlineError(formatApiError(e))
    } finally {
      setUploadingImg(false)
      if (imgInputRef.current) imgInputRef.current.value = ''
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!isOwner) return
    setUpdatingStatus(true)
    try {
      if (type === 'backlog') {
        await projectService.updateBacklog(projectId, localItem.id, { status: newStatus })
      } else {
        await projectService.updateTicket(projectId, localItem.id, { status: newStatus })
      }
      setLocalItem(prev => ({ ...prev, status: newStatus }))
    } catch (e) {
      console.error('[Cinnamon] Erreur statut:', e.message)
    } finally { setUpdatingStatus(false) }
  }

  const handlePriorityChange = async (newPriority) => {
    if (!isOwner) return
    try {
      await projectService.updateTicket(projectId, localItem.id, { priority: newPriority })
      setLocalItem(prev => ({ ...prev, priority: newPriority }))
    } catch (e) {
      console.error('[Cinnamon] Erreur priorité:', e.message)
    }
  }

  const comments  = localItem.comments  || []
  const images    = localItem.images    || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Barre retour */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIosNewOutlinedIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('detail.back')}</span>
      </div>

      {/* En-tête */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
              #{localItem.id}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {localItem.subject || localItem.title || '—'}
            </div>
            {localItem.description && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {localItem.description}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
            {/* Statut */}
            {isOwner ? (
              <FormControl size="small" sx={{ minWidth: 160 }} disabled={updatingStatus}>
                <InputLabel sx={{ fontSize: 11 }}>Statut</InputLabel>
                <Select
                  value={localItem.status || 'nouveau'}
                  label="Statut"
                  onChange={(e) => handleStatusChange(e.target.value)}
                  sx={{ fontSize: 12 }}
                >
                  {(type === 'ticket' ? TICKET_STATUSES : BACKLOG_STATUSES).map(s => (
                    <MenuItem key={s.value} value={s.value} sx={{ fontSize: 12 }}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              type === 'ticket'
                ? <TicketStatusChip status={localItem.status} />
                : <BacklogStatusChip status={localItem.status} />
            )}

            {/* Priorité (tickets uniquement) */}
            {type === 'ticket' && (
              isOwner ? (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel sx={{ fontSize: 11 }}>Priorité</InputLabel>
                  <Select
                    value={localItem.priority || 'normal'}
                    label="Priorité"
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    sx={{ fontSize: 12 }}
                  >
                    {TICKET_PRIORITIES.map(p => (
                      <MenuItem key={p.value} value={p.value} sx={{ fontSize: 12 }}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <PriorityChip priority={localItem.priority} />
              )
            )}
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="w11-card-title" style={{ marginBottom: 0 }}>
            <ImageOutlinedIcon sx={{ fontSize: 14 }} /> Images jointes
          </div>
          <div>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={uploadingImg ? <CircularProgress size={12} /> : <AttachFileOutlinedIcon />}
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingImg}
              sx={{ fontSize: 11 }}
            >
              Joindre
            </Button>
          </div>
        </div>
        {images.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune image jointe.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {images.map((img, i) => (
              <Box
                key={i}
                component="img"
                src={typeof img === 'string' ? img : img.url}
                alt={`Image ${i + 1}`}
                sx={{ height: 80, borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
              />
            ))}
          </div>
        )}
      </div>

      {inlineError && (
        <Alert severity="error" sx={{ fontSize: 12 }} onClose={() => setInlineError(null)}>{inlineError}</Alert>
      )}

      {/* Commentaires */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title">
          <PersonOutlinedIcon sx={{ fontSize: 14 }} /> Commentaires
          {comments.length > 0 && (
            <span style={{ marginLeft: 7, fontSize: 10, color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
              {comments.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {comments.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun commentaire.</div>
          )}
          {comments.map((c, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: '#42a5f5',
                }}>
                  {[c.author_firstname, c.author_lastname].filter(Boolean).join(' ') || 'Utilisateur'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {c.created_at ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(c.created_at)) : ''}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.content}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <TextField
            multiline
            minRows={2}
            maxRows={5}
            size="small"
            fullWidth
            placeholder="Ajouter un commentaire…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ fontSize: 13 }}
          />
          <IconButton
            onClick={handleSendComment}
            disabled={!newComment.trim() || sendingComment}
            color="primary"
            sx={{ flexShrink: 0 }}
          >
            {sendingComment ? <CircularProgress size={16} /> : <SendOutlinedIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}

// ── Formulaire de création ─────────────────────────────────────────────────
function CreateItemForm({ type, projectId, onCreated, onCancel }) {
  const { t } = useTranslation()
  const [subject,     setSubject]     = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState('normal')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)

  const handleSubmit = async () => {
    if (!subject.trim()) { setError('Le sujet est requis.'); return }
    setSaving(true); setError(null)
    try {
      if (type === 'backlog') {
        await projectService.createBacklog(projectId, { subject: subject.trim(), description: description.trim(), status: 'nouveau' })
      } else {
        await projectService.createTicket(projectId, { subject: subject.trim(), description: description.trim(), status: 'nouveau', priority })
      }
      onCreated()
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Erreur lors de la création.')
    } finally { setSaving(false) }
  }

  return (
    <div className="w11-card" style={{ marginBottom: 0 }}>
      <div className="w11-card-title">
        <AddOutlinedIcon sx={{ fontSize: 14 }} /> {type === 'backlog' ? 'Nouveau backlog' : 'Nouveau ticket'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextField
          label="Sujet"
          size="small"
          fullWidth
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <TextField
          label="Description"
          size="small"
          fullWidth
          multiline
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {type === 'ticket' && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Priorité</InputLabel>
            <Select value={priority} label="Priorité" onChange={(e) => setPriority(e.target.value)}>
              {TICKET_PRIORITIES.map(p => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {error && (
          <Alert severity="error" sx={{ py: 0, fontSize: 12 }}>{error}</Alert>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={onCancel} disabled={saving}>{t('common.cancel')}</Button>
          <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving || !subject.trim()}>
            {saving ? <CircularProgress size={14} /> : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab Backlogs ───────────────────────────────────────────────────────────
function TabBacklogs({ project, user }) {
  const { t } = useTranslation()
  const [items,          setItems]          = useState([])
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [selectedId,     setSelectedId]     = useState(null)
  const [showCreate,     setShowCreate]     = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting,       setDeleting]       = useState(false)

  const isOwner = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  const loadItems = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await projectService.getBacklogs(project.id)
      setItems(Array.isArray(data) ? data : (data?.backlogs || []))
    } catch (e) {
      setError(formatApiError(e))
    } finally { setLoading(false) }
  }, [project.id])

  useEffect(() => { loadItems() }, [loadItems])

  const handleRefreshItem = async (itemId, onDone) => {
    try {
      const data = await projectService.getBacklogs(project.id)
      const list = Array.isArray(data) ? data : (data?.backlogs || [])
      setItems(list)
      const updated = list.find(x => x.id === itemId)
      if (updated && onDone) onDone(updated)
    } catch {}
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    try {
      await projectService.deleteBacklog(project.id, deleteConfirmId)
      setItems(prev => prev.filter(x => x.id !== deleteConfirmId))
      setDeleteConfirmId(null)
    } catch (e) {
      setError(formatApiError(e))
      setDeleteConfirmId(null)
    } finally { setDeleting(false) }
  }

  const selected = selectedId != null ? items.find(x => x.id === selectedId) : null

  if (selected) {
    return (
      <ItemDetailView
        item={selected}
        isOwner={isOwner}
        projectId={project.id}
        type="backlog"
        onBack={() => setSelectedId(null)}
        onRefresh={handleRefreshItem}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{t('detail.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>
            Supprimer ce backlog ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>{t('common.cancel')}</Button>
          <Button size="small" variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={14} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barre d'outils */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {items.length} backlog{items.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconButton size="small" onClick={loadItems} disabled={loading}>
            <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowCreate(v => !v)}>
            Nouveau
          </Button>
        </div>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <CreateItemForm
          type="backlog"
          projectId={project.id}
          onCreated={() => { setShowCreate(false); loadItems() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: 8 }}>
          <CircularProgress size={18} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chargement…</span>
        </div>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ fontSize: 12 }}>{error}</Alert>
      )}

      {!loading && !error && items.length === 0 && !showCreate && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
          Aucun backlog pour le moment.
        </div>
      )}

      {!loading && items.map((item, idx) => (
        <div
          key={item.id}
          className="w11-card"
          onClick={() => setSelectedId(item.id)}
          style={{ marginBottom: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{item.id || (idx + 1)}
                </span>
                <BacklogStatusChip status={item.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.subject || item.title || '(Sans titre)'}
              </div>
              {(item.author_firstname || item.author_lastname) && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  par {[item.author_firstname, item.author_lastname].filter(Boolean).join(' ')}
                </div>
              )}
              {item.description && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              {(item.comments?.length > 0) && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>💬 {item.comments.length}</span>
              )}
              {isOwner && (
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id) }}
                    sx={{ color: '#fc3d39', p: '4px', '&:hover': { background: 'rgba(252,61,57,0.1)' } }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab Ticketing ──────────────────────────────────────────────────────────
function TabTicketing({ project, user }) {
  const { t } = useTranslation()
  const [items,           setItems]           = useState([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [selectedId,      setSelectedId]      = useState(null)
  const [showCreate,      setShowCreate]      = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting,        setDeleting]        = useState(false)

  const isOwner = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  const loadItems = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await projectService.getTickets(project.id)
      setItems(Array.isArray(data) ? data : (data?.tickets || []))
    } catch (e) {
      setError(formatApiError(e))
    } finally { setLoading(false) }
  }, [project.id])

  useEffect(() => { loadItems() }, [loadItems])

  const handleRefreshItem = async (itemId, onDone) => {
    try {
      const data = await projectService.getTickets(project.id)
      const list = Array.isArray(data) ? data : (data?.tickets || [])
      setItems(list)
      const updated = list.find(x => x.id === itemId)
      if (updated && onDone) onDone(updated)
    } catch {}
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    try {
      await projectService.deleteTicket(project.id, deleteConfirmId)
      setItems(prev => prev.filter(x => x.id !== deleteConfirmId))
      setDeleteConfirmId(null)
    } catch (e) {
      setError(formatApiError(e))
      setDeleteConfirmId(null)
    } finally { setDeleting(false) }
  }

  const selected = selectedId != null ? items.find(x => x.id === selectedId) : null

  if (selected) {
    return (
      <ItemDetailView
        item={selected}
        isOwner={isOwner}
        projectId={project.id}
        type="ticket"
        onBack={() => setSelectedId(null)}
        onRefresh={handleRefreshItem}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 700 }}>{t('detail.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>
            Supprimer ce ticket ? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>{t('common.cancel')}</Button>
          <Button size="small" variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={14} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barre d'outils */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {items.length} ticket{items.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <IconButton size="small" onClick={loadItems} disabled={loading}>
            <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Button size="small" variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setShowCreate(v => !v)}>
            Nouveau
          </Button>
        </div>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <CreateItemForm
          type="ticket"
          projectId={project.id}
          onCreated={() => { setShowCreate(false); loadItems() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: 8 }}>
          <CircularProgress size={18} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chargement…</span>
        </div>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ fontSize: 12 }}>{error}</Alert>
      )}

      {!loading && !error && items.length === 0 && !showCreate && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
          Aucun ticket pour le moment.
        </div>
      )}

      {!loading && items.map((item, idx) => (
        <div
          key={item.id}
          className="w11-card"
          onClick={() => setSelectedId(item.id)}
          style={{ marginBottom: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{item.id || (idx + 1)}
                </span>
                <TicketStatusChip status={item.status} />
                <PriorityChip priority={item.priority} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {item.subject || item.title || '(Sans titre)'}
              </div>
              {(item.author_firstname || item.author_lastname) && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                  par {[item.author_firstname, item.author_lastname].filter(Boolean).join(' ')}
                </div>
              )}
              {item.description && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              {(item.comments?.length > 0) && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>💬 {item.comments.length}</span>
              )}
              {isOwner && (
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id) }}
                    sx={{ color: '#fc3d39', p: '4px', '&:hover': { background: 'rgba(252,61,57,0.1)' } }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProjectDetailPage({ project, onNavigate, user }) {
  const { t } = useTranslation()
  const [settings,       setSettings]       = useState({})
  const [thumb,          setThumb]          = useState(null)
  const [fontDetails,    setFontDetails]    = useState([])
  const [activeTab,      setActiveTab]      = useState(0)
  const [cinStatus,           setCinStatus]           = useState(null)
  const [isUninstalling,      setIsUninstalling]      = useState(false)
  const [versionsRefreshTrigger, setVersionsRefreshTrigger] = useState(0)
  const [latestCloudVersion,  setLatestCloudVersion]  = useState(null)
  const [knownZipNames,       setKnownZipNames]       = useState(new Set())
  const [publishedZipNames,   setPublishedZipNames]   = useState(null)
  const [allSqlZipNames,      setAllSqlZipNames]      = useState(null)
  const [busFiles,            setBusFiles]            = useState([])
  const [fullProject,         setFullProject]         = useState(project)
  const [projectLoading,      setProjectLoading]      = useState(true)
  const [fontWarnings,        setFontWarnings]        = useState([])
  const [allFonts,            setAllFonts]            = useState([])     // toutes les polices trouvées
  const [fontTotal,           setFontTotal]           = useState(null)   // null = pas encore scanné
  const [scanProgress,        setScanProgress]        = useState(null)   // null | {phase,current,total,currentFile}
  const [localFonts,    setLocalFonts]    = useState(project.fonts || [])  // copie mutable de project.fonts
  const [diagResult,    setDiagResult]    = useState(null)
  const [diagScanned,   setDiagScanned]   = useState(false)
  const [diagProgress,  setDiagProgress]  = useState(null)
  const [diagModalOpen, setDiagModalOpen] = useState(false)

  const [appearanceOpen,  setAppearanceOpen]  = useState(false)
  const [pushDialogOpen, setPushDialogOpen] = useState(false)
  const [pushOpen,     setPushOpen]     = useState(false)
  const [pushStep,     setPushStep]     = useState(null)
  const [pushProgress, setPushProgress] = useState(null)
  const [pushResult,   setPushResult]   = useState(null)
  const [pullOpen,     setPullOpen]     = useState(false)
  const [pullStep,     setPullStep]     = useState(null)
  const [pullProgress, setPullProgress] = useState(null)
  const [pullResult,   setPullResult]   = useState(null)

  useEffect(() => {
    setProjectLoading(true)
    projectService.getById(project.id)
      .then(data => {
        const p = data?.project || data
        console.log('[Cinnamon] getById réponse brute:', p)
        if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
      })
      .catch(() => {})
      .finally(() => setProjectLoading(false))

    const init = async () => {
      // ── Charger les chemins locaux depuis le store si absents du prop ───
      // (cas : navigation depuis HomePage qui ne les joint pas)
      const allStoredPaths = await window.api.store.get(PROJECT_PATHS_KEY).catch(() => ({})) || {}
      const stored = allStoredPaths[project.id] || {}
      const vehicles = project.vehicles || stored.vehiclesPath || null
      const addons   = project.addons   || stored.addonsPath   || null
      const sounds   = project.sounds   || stored.soundsPath   || null
      const fonts    = project.fonts?.length ? project.fonts : (stored.fonts || [])

      if (!project.vehicles && vehicles) {
        setFullProject(prev => ({ ...prev, vehicles, addons, sounds, fonts }))
        setLocalFonts(fonts)
      }

      const s = await window.api.settings.get()
      setSettings(s)
      window.api.cinnamon.readStatus(project, s).then(setCinStatus)

      // Scan des polices manquantes dans les Model.cfg du projet
      if (vehicles && s?.omsiPath) {
        window.api.omsi.offScanFontsProgress()
        window.api.omsi.onScanFontsProgress(setScanProgress)
        setScanProgress({ phase: 'collecting', current: 0, total: 0, currentFile: '' })
        window.api.omsi.scanModelFonts(vehicles, s.omsiPath)
          .then(res => {
            setFontWarnings(res?.missing || [])
            setAllFonts(res?.all || [])
            setFontTotal(res?.total ?? 0)
            setScanProgress(null)
            window.api.omsi.offScanFontsProgress()
          })
          .catch(() => {
            setFontTotal(0)
            setScanProgress(null)
            window.api.omsi.offScanFontsProgress()
          })
      } else {
        setFontTotal(0)
      }

      Promise.all([...new Set(fonts)].map(f => window.api.oft.parse(f))).then(setFontDetails)
      if (vehicles) {
        window.api.projects.parseBusFiles(vehicles).then(setBusFiles).catch(() => {})
      }
    }

    init()

    if (project.thumbnailPath) {
      window.api.file.readAsDataUrl(project.thumbnailPath).then(setThumb)
    }
  }, [project])

  const handleAddScreenshots = useCallback(async (files) => {
    const data = await projectService.addScreenshots(fullProject.id, files)
    // Le backend peut retourner { screenshots } ou le projet complet
    if (Array.isArray(data?.screenshots)) {
      setFullProject(prev => ({ ...prev, screenshots: data.screenshots }))
    } else {
      const p = data?.project || data
      if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
    }
  }, [fullProject?.id])

  const handleDeleteScreenshot = useCallback(async (screenshotId) => {
    const data = await projectService.deleteScreenshot(fullProject.id, screenshotId)
    if (Array.isArray(data?.screenshots)) {
      setFullProject(prev => ({ ...prev, screenshots: data.screenshots }))
    } else {
      const p = data?.project || data
      if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
      else setFullProject(prev => ({
        ...prev,
        screenshots: (prev.screenshots || []).filter(s => String(s.id) !== String(screenshotId))
      }))
    }
  }, [fullProject?.id])

  // overrideFonts : permet de passer une liste à jour sans attendre le re-render de localFonts.
  // On vérifie que c'est bien un tableau (pas un SyntheticEvent passé par onClick).
  const handleFullDiag = useCallback(async (overrideFonts) => {
    if (!fullProject.vehicles) return
    const fontsToUse = Array.isArray(overrideFonts) ? overrideFonts : localFonts
    window.api.omsi.offDiagProgress()
    window.api.omsi.onDiagProgress(setDiagProgress)
    setDiagModalOpen(true)
    setDiagProgress({ phase: 'collecting', current: 0, total: 0, currentFile: '' })
    try {
      const res = await window.api.omsi.fullDiagnostic(
        fullProject.vehicles,
        settings?.omsiPath || null,
        fontsToUse,
        fullProject.sounds || null
      )
      setDiagResult(res || null)
      setDiagScanned(true)
    } finally {
      setDiagProgress(null)
      setDiagModalOpen(false)
      window.api.omsi.offDiagProgress()
    }
  }, [project, settings, localFonts])

  // Ajoute le chemin .oft OMSI directement à project.fonts (pas de copie de fichier)
  const handleImportFont = useCallback(async (fontName, oftPath) => {
    if (!oftPath) return
    const updated = [...new Set([...localFonts, oftPath])]
    // Persiste dans le store sous la même clé que ProjectsPage (projectPaths[project.id].fonts)
    const allPaths = (await window.api.store.get(PROJECT_PATHS_KEY)) || {}
    const existing = allPaths[project.id] || {}
    await window.api.store.set(PROJECT_PATHS_KEY, {
      ...allPaths,
      [project.id]: { ...existing, fonts: updated }
    })
    setLocalFonts(updated)
    // Relance le diagnostic avec la liste à jour (contourne la closure périmée)
    handleFullDiag(updated)
  }, [project.id, localFonts, handleFullDiag])

  const handleDeleteFile = useCallback(async (absPath) => {
    const res = await window.api.file.delete(absPath)
    if (res?.success) {
      setDiagResult(prev => {
        if (!prev) return prev
        return {
          ...prev,
          orphanMeshes:   (prev.orphanMeshes   || []).filter(f => f.absPath !== absPath),
          orphanTextures: (prev.orphanTextures  || []).filter(f => f.absPath !== absPath),
          soundResults: prev.soundResults ? {
            ...prev.soundResults,
            orphanSounds: (prev.soundResults.orphanSounds || []).filter(s => s.absPath !== absPath),
          } : prev.soundResults,
        }
      })
    }
  }, [])

  const handleDeleteAll = useCallback(async (paths) => {
    const res = await window.api.file.deleteMany(paths)
    if (res?.deleted?.length) {
      const deletedSet = new Set(res.deleted)
      setDiagResult(prev => {
        if (!prev) return prev
        return {
          ...prev,
          orphanMeshes:   (prev.orphanMeshes   || []).filter(f => !deletedSet.has(f.absPath)),
          orphanTextures: (prev.orphanTextures  || []).filter(f => !deletedSet.has(f.absPath)),
          soundResults: prev.soundResults ? {
            ...prev.soundResults,
            orphanSounds: (prev.soundResults.orphanSounds || []).filter(s => !deletedSet.has(s.absPath)),
          } : prev.soundResults,
        }
      })
    }
  }, [])

  const refreshCinStatus = useCallback(() => {
    window.api.cinnamon.readStatus(project, settings).then(setCinStatus)
  }, [project, settings])

  const refreshDeploymentData = useCallback(() => {
    if (!settings.vpsIp || !settings.vpsUser || !settings.sshKeyPath) return
    Promise.all([
      window.api.sftp.listVersions(project, settings),
      projectService.getVersions(project.id).catch(() => null)
    ]).then(([sftpRes, sqlVersions]) => {
      const sftpByVersionName = {}
      if (sftpRes?.success) {
        sftpRes.versions.forEach(v => { if (v.versionName) sftpByVersionName[v.versionName] = v.name })
        setKnownZipNames(new Set(sftpRes.versions.map(v => v.name)))
      }
      if (sqlVersions) {
        const list = Array.isArray(sqlVersions) ? sqlVersions : (sqlVersions?.versions || [])
        const resolveZip = m => m.zip_name || m.zipName || sftpByVersionName[m.version_name] || null
        setAllSqlZipNames(new Set(list.map(resolveZip).filter(Boolean)))
        const pubList = list.filter(v => !!v.is_published && !v.is_deprecated)
        setPublishedZipNames(new Set(pubList.map(resolveZip).filter(Boolean)))
        const latestPub = pubList
          .map(m => ({ name: resolveZip(m), versionName: m.version_name, changelog: m.changelog }))
          .filter(e => e.name)
          .sort((a, b) => b.name.localeCompare(a.name))[0] || null
        setLatestCloudVersion(latestPub)
      } else if (sftpRes?.success && sftpRes.versions?.length > 0) {
        const sorted = [...sftpRes.versions].sort((a, b) => b.modifyTime - a.modifyTime)
        setLatestCloudVersion(sorted[0])
      }
    }).catch(() => {})
  }, [project, settings])

  useEffect(() => { refreshDeploymentData() }, [refreshDeploymentData])
  useEffect(() => { if (versionsRefreshTrigger > 0) refreshDeploymentData() }, [versionsRefreshTrigger, refreshDeploymentData])

  if (!project) return null

  const isConfigured = settings.vpsIp && settings.vpsUser && settings.sshKeyPath
  const isOperating  = pushOpen || pullOpen

  const isOwnerOrAdmin = user && fullProject && (
    Number(user.id) === Number(fullProject.owner_id) ||
    user.role === 'super_admin'
  )
  const currentMember = fullProject?.members?.find(
    m => Number(m.user_id ?? m.id) === Number(user?.id)
  )
  const memberCanPush     = !!(currentMember?.can_push     ?? fullProject?.can_push)
  const memberCanPull     = !!(currentMember?.can_pull     ?? fullProject?.can_pull)
  const memberCanBacklogs = !!(currentMember?.backlog_access ?? fullProject?.backlog_access)
  const memberCanTicketing = !!(currentMember?.ticketing_access ?? fullProject?.ticketing_access)
  const userCanPush     = isOwnerOrAdmin || memberCanPush
  const userCanPull     = isOwnerOrAdmin || memberCanPull
  const userCanBacklogs = isOwnerOrAdmin || memberCanBacklogs
  const userCanTicketing = isOwnerOrAdmin || memberCanTicketing
  const projectBacklogEnabled   = !!(fullProject?.backlog_enabled)
  const projectTicketingEnabled = !!(fullProject?.ticketing_enabled)

  console.log('[Cinnamon] Droits calculés pour l\'UI:', {
    userId: user?.id, ownerId: fullProject?.owner_id,
    isOwnerOrAdmin, currentMember, memberCanPush, memberCanPull,
    userCanPush, userCanPull, fullProjectKeys: fullProject ? Object.keys(fullProject) : null
  })

  // ── PUSH ─────────────────────────────────────────────────────────────────
  const openPushDialog = () => setPushDialogOpen(true)

  const startPush = async (versionMeta) => {
    setPushDialogOpen(false)
    setPushOpen(true); setPushStep(null); setPushProgress(null); setPushResult(null)
    window.api.sync.offStep(); window.api.sync.offProgress()
    window.api.sync.onStep(setPushStep)
    window.api.sync.onProgress(setPushProgress)
    try {
      const result = await window.api.sync.start(fullProject, settings, versionMeta)
      setPushResult(result)
      if (result?.success) {
        try {
          await projectService.registerVersion(project.id, {
            version_name: result.versionName,
            zip_name:     result.zipName,
            file_size:    result.zipSizeBytes,
            changelog:    versionMeta?.changelog || ''
          })
        } catch (e) {
          console.warn('[Cinnamon] Version non enregistrée en base:', e?.response?.data || e.message)
        }
        refreshCinStatus()
        setVersionsRefreshTrigger(t => t + 1)
      }
    } catch (e) {
      setPushResult({ success: false, logs: [], error: e.message })
    } finally {
      window.api.sync.offStep(); window.api.sync.offProgress()
    }
  }

  const closePush = () => {
    setPushOpen(false); setPushStep(null); setPushProgress(null); setPushResult(null)
  }

  // ── PULL ─────────────────────────────────────────────────────────────────
  const installVersion = async (zipName, versionMeta) => {
    setPullOpen(true); setPullStep(null); setPullProgress(null); setPullResult(null)
    window.api.sync.offStep(); window.api.sync.offProgress()
    window.api.sync.onStep(setPullStep)
    window.api.sync.onProgress(setPullProgress)
    try {
      const result = await window.api.pull.install(fullProject, settings, zipName, versionMeta)
      setPullResult(result)
    } catch (e) {
      setPullResult({ success: false, logs: [], error: e.message })
    } finally {
      window.api.sync.offStep(); window.api.sync.offProgress()
    }
  }

  const closePull = () => {
    setPullOpen(false); setPullStep(null); setPullProgress(null); setPullResult(null)
    refreshCinStatus()
  }

  const handleInstallLatest = () => {
    if (!latestCloudVersion) return
    installVersion(latestCloudVersion.name, {
      versionName: latestCloudVersion.versionName,
      changelog:   latestCloudVersion.changelog
    })
  }

  const handleUninstall = async () => {
    setIsUninstalling(true)
    try {
      await window.api.cinnamon.uninstall(project, settings)
      setCinStatus(null)
    } finally {
      setIsUninstalling(false)
    }
  }

  // Tab index → string mapping
  const TAB_IDS = [
    'description',
    userCanPull ? 'contenu' : null,
    'versions',
    'alertes',
    (projectBacklogEnabled && userCanBacklogs) ? 'backlogs' : null,
    (projectTicketingEnabled && userCanTicketing) ? 'ticketing' : null,
    isOwnerOrAdmin ? 'team' : null,
  ].filter(Boolean)

  return (
    <div className="fade-in">
      <PushDialog
        open={pushDialogOpen}
        projectName={project.name}
        onConfirm={startPush}
        onCancel={() => setPushDialogOpen(false)}
      />
      <SyncModal open={pushOpen} step={pushStep} progress={pushProgress}
        result={pushResult} onClose={closePush} mode="push" />
      <SyncModal open={pullOpen} step={pullStep} progress={pullProgress}
        result={pullResult} onClose={closePull} mode="pull" />
      <DiagProgressModal open={diagModalOpen} progress={diagProgress} />

      {appearanceOpen && (
        <AppearanceModal
          open={appearanceOpen}
          onClose={() => setAppearanceOpen(false)}
          project={fullProject}
          onUpdate={(data) => {
            const p = data?.project || data
            if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
          }}
        />
      )}

      {/* Barre de titre */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button variant="text" size="small" startIcon={<ArrowBackOutlinedIcon />}
            onClick={() => onNavigate('projects')}
            sx={{ color: 'text.secondary' }}>
            Projets
          </Button>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>/</span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{project.name}</span>
        </div>

        {(() => {
          const hasLocalPaths = !!(fullProject.vehicles || fullProject.addons || fullProject.sounds || fullProject.fonts?.length)
          const pushDisabled  = !isConfigured || isOperating || !userCanPush || !hasLocalPaths
          const pushTitle     = !userCanPush   ? 'Permission requise'
                              : !hasLocalPaths ? 'Configurez les chemins locaux du projet (icône crayon)'
                              : undefined
          const pushLabel     = !userCanPush   ? 'Permission requise'
                              : !hasLocalPaths ? 'Chemins non configurés'
                              : 'PUSH vers le serveur'
          return (
            <Tooltip title={pushTitle || ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudUploadOutlinedIcon />}
                  onClick={pushDisabled ? undefined : openPushDialog}
                  disabled={pushDisabled}
                >
                  {pushLabel}
                </Button>
              </span>
            </Tooltip>
          )
        })()}
      </div>

      {!isConfigured && (
        <div style={{ marginBottom: 8, padding: '5px 10px', borderRadius: 5,
          background: 'rgba(240,160,48,0.07)', border: '1px solid rgba(240,160,48,0.2)',
          fontSize: 11, color: '#f0a030' }}>
          ⚠ Serveur non configuré — rendez-vous dans les Paramètres
        </div>
      )}

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      {(() => {
        const bannerUrl = fullProject?.banner_url
        const logoUrl   = fullProject?.logo_url
        const hasBanner = !!bannerUrl

        if (!hasBanner && !logoUrl && !isOwnerOrAdmin) return null

        return (
          <Box sx={{
            position: 'relative',
            width: '100%',
            // Ratio 4.8:1 calqué sur 1920×400 — height fixe adapté à la colonne de contenu
            height: hasBanner ? 400 : (isOwnerOrAdmin ? 64 : 0),
            borderRadius: '8px',
            overflow: 'hidden',
            mb: 1.5,
            flexShrink: 0,
            background: hasBanner
              ? '#0d0d0d'
              : 'linear-gradient(135deg, rgba(13,71,161,0.20) 0%, rgba(26,35,126,0.25) 100%)',
            border: !hasBanner && isOwnerOrAdmin
              ? '1px dashed rgba(255,255,255,0.10)'
              : 'none',
          }}>

            {/* Image de fond — object-fit: cover pour simuler 1920×400 */}
            {hasBanner && (
              <Box
                component="img"
                src={bannerUrl}
                sx={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                }}
              />
            )}

            {/* Overlay dégradé — du bas vers le haut */}
            {hasBanner && (
              <Box sx={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Logo — coin inférieur gauche */}
            {logoUrl && (
              <Box
                component="img"
                src={logoUrl}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: 20,
                  maxHeight: '120px',
                  maxWidth: '220px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.55))',
                  borderRadius: '4px',
                }}
              />
            )}

            {/* Placeholder texte si pas de bannière et admin */}
            {!hasBanner && isOwnerOrAdmin && (
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 1,
                color: 'rgba(255,255,255,0.22)',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                userSelect: 'none',
              }}>
                <BrushOutlinedIcon sx={{ fontSize: 14 }} />
                Aucune bannière — cliquez sur l'icône pour en ajouter une
              </Box>
            )}

            {/* Bouton Éditer l'apparence — coin supérieur droit */}
            {isOwnerOrAdmin && (
              <Tooltip title={t('detail.editAppearance')}>
                <IconButton
                  size="small"
                  onClick={() => setAppearanceOpen(true)}
                  sx={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(0,0,0,0.50)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px',
                    p: '6px',
                    '&:hover': {
                      background: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(255,255,255,0.22)',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BrushOutlinedIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.88)' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )
      })()}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.07)', mb: 1, minHeight: 36 }}
      >
        <Tab label="Description" icon={<ImageOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
        {userCanPull && <Tab label={t('detail.tabContent')} icon={<FolderOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
        <Tab label={t('detail.tabDepots')} icon={<CloudOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
        <Tab
          iconPosition="start"
          icon={<WarningAmberOutlinedIcon sx={{ fontSize: 15 }} />}
          label={
            <Badge
              badgeContent={(fontWarnings.length + (diagResult?.fontResults?.missingInProject?.length || 0) + (diagResult?.fontResults?.missingEverywhere?.length || 0)) || null}
              color="error"
              invisible={fontWarnings.length === 0 && !diagResult?.fontResults?.missingInProject?.length && !diagResult?.fontResults?.missingEverywhere?.length}
              sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 16, height: 16, right: -8, top: -2 } }}
            >
              {t('detail.tabControls')}
            </Badge>
          }
        />
        {projectBacklogEnabled && userCanBacklogs && <Tab label="Backlogs" icon={<AssignmentOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
        {projectTicketingEnabled && userCanTicketing && <Tab label={t('detail.tabTickets')} icon={<BugReportOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
        {isOwnerOrAdmin && <Tab label={t('detail.tabTeam')} icon={<GroupsOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
      </Tabs>

      {/* Contenu des onglets */}
      {TAB_IDS[activeTab] === 'description' && (
        <TabDescription
          project={project}
          thumb={thumb}
          cinStatus={cinStatus}
          onUninstall={handleUninstall}
          isUninstalling={isUninstalling}
          latestCloudVersion={latestCloudVersion}
          onInstallLatest={handleInstallLatest}
          busFiles={busFiles}
          knownZipNames={userCanPush ? allSqlZipNames : publishedZipNames}
          canDeploy={userCanPull || isOwnerOrAdmin}
          screenshots={fullProject?.screenshots || []}
          isOwnerOrAdmin={isOwnerOrAdmin}
          onAddScreenshots={handleAddScreenshots}
          onDeleteScreenshot={handleDeleteScreenshot}
        />
      )}
      {TAB_IDS[activeTab] === 'contenu' && userCanPull && (
        <TabContenu project={project} fontDetails={fontDetails} />
      )}
      {TAB_IDS[activeTab] === 'versions' && (
        <TabVersions
          project={fullProject || project}
          settings={settings}
          onInstall={installVersion}
          isOperating={isOperating}
          cinStatus={cinStatus}
          refreshTrigger={versionsRefreshTrigger}
          userCanPull={userCanPull}
          userCanPush={userCanPush}
          user={user}
        />
      )}
      {TAB_IDS[activeTab] === 'alertes' && (
        <TabAvertissements
          fontWarnings={fontWarnings}
          allFonts={allFonts}
          scanProgress={scanProgress}
          fontTotal={fontTotal}
          diagResult={diagResult}
          diagScanned={diagScanned}
          onScanDiag={handleFullDiag}
          onDeleteFile={handleDeleteFile}
          onDeleteAll={handleDeleteAll}
          onImportFont={handleImportFont}
          canScan={!!project.vehicles}
        />
      )}
      {TAB_IDS[activeTab] === 'backlogs' && projectBacklogEnabled && userCanBacklogs && (
        <TabBacklogs project={fullProject} user={user} />
      )}
      {TAB_IDS[activeTab] === 'ticketing' && projectTicketingEnabled && userCanTicketing && (
        <TabTicketing project={fullProject} user={user} />
      )}
      {TAB_IDS[activeTab] === 'team' && isOwnerOrAdmin && (
        <TabTeam
          project={fullProject}
          projectLoading={projectLoading}
          user={user}
          onProjectUpdate={(updates) => setFullProject(prev => ({ ...prev, ...updates }))}
        />
      )}
    </div>
  )
}
