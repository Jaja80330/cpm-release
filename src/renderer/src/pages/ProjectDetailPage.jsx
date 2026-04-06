import React, { useState, useEffect, useCallback, useRef } from 'react'
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
import SyncModal from '../components/SyncModal'
import PushDialog from '../components/PushDialog'
import { projectService } from '../services/projectService'

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

// ── Onglet Description ─────────────────────────────────────────────────────
function TabDescription({ project, thumb, cinStatus, onUninstall, isUninstalling,
                          latestCloudVersion, onInstallLatest, busFiles, knownZipNames, canDeploy }) {
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
      {isUninstalling ? 'Désinstallation...' : 'Désinstaller'}
    </Button>
  )

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Colonne gauche */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Déploiement */}
        {canDeploy && <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title">{headerIcon} Déploiement</div>

          {isExternalPackage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#fc3d39', fontWeight: 600 }}>
                      ✗ Installé — Paquet externe
                    </span>
                    <StatusTag color="red">{cinStatus.versionName}</StatusTag>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Installé le {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                </div>
                {uninstallBtn}
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 6,
                background: 'rgba(252,61,57,0.06)', border: '1px solid rgba(252,61,57,0.2)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: '#fc3d39', flexShrink: 0, mt: 0.1 }} />
                  <span style={{ fontSize: 12, color: '#fc3d39', lineHeight: 1.55 }}>
                    Cette version est inconnue du système NEROSY. Soyez prudent, l'intégrité du paquet ne peut être vérifiée.
                  </span>
                </div>
              </div>
            </div>

          ) : cinStatus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isOutdated ? (
                      <span style={{ fontSize: 13, color: '#f0a030', fontWeight: 600 }}>
                        ⚠ Mise à jour disponible
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#6ccb5f', fontWeight: 600 }}>
                        ✓ Installé · À jour
                      </span>
                    )}
                    <StatusTag color={isOutdated ? 'orange' : 'green'}>{cinStatus.versionName}</StatusTag>
                    {isOutdated && latestCloudVersion && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        → {latestCloudVersion.versionName} disponible
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Installé le {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                </div>
                {uninstallBtn}
              </div>
              {isOutdated && (
                <Button variant="contained" size="small" startIcon={<SyncOutlinedIcon />} onClick={onInstallLatest}
                  sx={{ alignSelf: 'flex-start' }}>
                  Mettre à jour vers {latestCloudVersion.versionName}
                </Button>
              )}
            </div>

          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <CancelOutlinedIcon sx={{ fontSize: 14 }} /> Non installé localement
            </div>
          )}
        </div>}

        {/* Description */}
        <div style={{ display: 'grid', gridTemplateColumns: thumb ? '190px 1fr' : '1fr', gap: 12 }}>
          {thumb && (
            <div style={{ borderRadius: 8, overflow: 'hidden', background: '#1e2328',
              maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title"><DescriptionOutlinedIcon sx={{ fontSize: 14 }} /> Description</div>
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

      {/* Panneau droit — Bus détectés */}
      {busFiles.length > 0 && (
        <div style={{ width: 250, flexShrink: 0 }}>
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title">
              <DirectionsBusOutlinedIcon sx={{ fontSize: 14 }} /> Bus détectés
              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                {busFiles.length}
              </span>
            </div>
            {busFiles.map((bus, i) => (
              <div key={`bus-${i}`} style={{
                padding: '7px 0',
                borderBottom: i < busFiles.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {bus.model || '—'}
                </div>
                {bus.manufacturer && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {bus.manufacturer}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace',
                  marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={bus.filename}>
                  {bus.filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Contenu ─────────────────────────────────────────────────────────
function TabContenu({ project, fontDetails }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><FolderOutlinedIcon sx={{ fontSize: 14 }} /> Dossiers synchronisés</div>
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
              {isDraft      && <StatusTag color="gray">Brouillon</StatusTag>}
              {isDeprecated && <StatusTag color="red">Périmée</StatusTag>}
              {isInstalled  && <StatusTag color="green">Installée</StatusTag>}
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
          <Button variant="outlined" size="small" onClick={onClose}>Fermer</Button>
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
                ? 'Installation...'
                : showDowngradeWarning
                  ? 'Continuer quand même'
                  : isInstalled
                    ? 'Réparer'
                    : 'Installer'}
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
            Actualiser
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
                    {isLatest && !isDraft && !isDeprecated && <StatusTag color="blue">Dernière</StatusTag>}
                    {isDraft      && <StatusTag color="gray">Brouillon</StatusTag>}
                    {isDeprecated && <StatusTag color="red">Périmée</StatusTag>}
                    {isInstalled  && <StatusTag color="green">Installée</StatusTag>}
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
function TabTeam({ project, user }) {
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
  const searchRef = useRef(null)

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
    setMembers(prev => prev.map(m => resolveUid(m) === uid ? { ...m, [field]: value } : m))
    try {
      console.log(`PATCH /projects/${project.id}/members/${userId} —`, { [field]: value })
      await projectService.updateMember(project.id, userId, { [field]: value })
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Propriétaire */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><PersonOutlinedIcon sx={{ fontSize: 14 }} /> Propriétaire</div>
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
                : 'Chargement…'}
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
            <PeopleAltOutlinedIcon sx={{ fontSize: 14 }} /> Membres de l'équipe
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
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Chargement…</span>
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
                            {isOwner && <StatusTag color="blue">Propriétaire</StatusTag>}
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

                    {isAdmin && (
                      <TableCell sx={{ width: 44, textAlign: 'center' }}>
                        <Tooltip title="Retirer de l'équipe">
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

// ── Page principale ────────────────────────────────────────────────────────
export default function ProjectDetailPage({ project, onNavigate, user }) {
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
    projectService.getById(project.id)
      .then(data => {
        const p = data?.project || data
        console.log('[Cinnamon] getById réponse brute:', p)
        if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
      })
      .catch(() => {})

    window.api.settings.get().then(s => {
      setSettings(s)
      window.api.cinnamon.readStatus(project, s).then(setCinStatus)
    })
    if (project.thumbnailPath) {
      window.api.file.readAsDataUrl(project.thumbnailPath).then(setThumb)
    }
    Promise.all([...new Set(project.fonts || [])].map(f => window.api.oft.parse(f))).then(setFontDetails)
    if (project.vehicles) {
      window.api.projects.parseBusFiles(project.vehicles).then(setBusFiles).catch(() => {})
    }
  }, [project])

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
  const memberCanPush = !!(currentMember?.can_push ?? fullProject?.can_push)
  const memberCanPull = !!(currentMember?.can_pull ?? fullProject?.can_pull)
  const userCanPush = isOwnerOrAdmin || memberCanPush
  const userCanPull = isOwnerOrAdmin || memberCanPull

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
      const result = await window.api.sync.start(project, settings, versionMeta)
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
      const result = await window.api.pull.install(project, settings, zipName, versionMeta)
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
  const TAB_IDS = ['description', userCanPull ? 'contenu' : null, 'versions', isOwnerOrAdmin ? 'team' : null].filter(Boolean)

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

      {/* Barre de titre */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, gap: 12 }}>
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
          const hasLocalPaths = !!(project.vehicles || project.addons || project.sounds || project.fonts?.length)
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

      {/* Hero compact */}
      <div className="w11-card" style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
          background: '#1e2328', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {thumb
            ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <DirectionsBusOutlinedIcon sx={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.3 }} />
          }
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>{project.name}</div>
          {project.description && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 500,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {project.description}
            </div>
          )}
          {!isConfigured && (
            <div style={{ fontSize: 11, color: '#f0a030', marginTop: 3 }}>
              ⚠ Serveur non configuré — rendez-vous dans les Paramètres
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.07)', mb: 1.5, minHeight: 40 }}
      >
        <Tab label="Description" icon={<ImageOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
        {userCanPull && <Tab label="Contenu" icon={<FolderOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
        <Tab label="Dépôts" icon={<CloudOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
        {isOwnerOrAdmin && <Tab label="Équipe" icon={<GroupsOutlinedIcon sx={{ fontSize: 15 }} />} iconPosition="start" />}
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
      {TAB_IDS[activeTab] === 'team' && isOwnerOrAdmin && (
        <TabTeam project={fullProject} user={user} />
      )}
    </div>
  )
}
