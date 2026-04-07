import React, { useState, useEffect } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import { timelineItemClasses } from '@mui/lab/TimelineItem'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CableOutlinedIcon from '@mui/icons-material/CableOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import BusinessIcon from '@mui/icons-material/Business'
import MapIcon from '@mui/icons-material/Map'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { projectService } from '../services/projectService'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtBytes(b) {
  if (!b) return null
  if (b < 1048576) return `${(b / 1024).toFixed(0)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

// Mock tendance syncs (à remplacer par vraies données)
const SPARKLINE_DATA = [2, 4, 3, 7, 5, 9, 11, 8, 13, 10]

// ── Formatage date relative ────────────────────────────────────────────────
function fmtRelative(dateStr) {
  if (!dateStr) return '—'
  const d    = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const sec  = Math.floor(diff / 1000)
  const min  = Math.floor(sec  / 60)
  const hr   = Math.floor(min  / 60)
  const days = Math.floor(hr   / 24)
  if (sec  <  60) return 'À l\'instant'
  if (min  <  60) return `Il y a ${min} min`
  if (hr   <  24) return `Il y a ${hr}h`
  if (days === 1)  return 'Hier'
  if (days  <  7)  return `Il y a ${days} jours`
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(d)
}

// ── STATUS ─────────────────────────────────────────────────────────────────
const STATUS = {
  checking:     { dot: 'idle',    label: 'Vérification…' },
  ok:           { dot: 'success', label: 'En ligne'      },
  error:        { dot: 'error',   label: 'Hors ligne'    },
  unconfigured: { dot: 'warning', label: 'Non configuré' },
}

// ── Composants ─────────────────────────────────────────────────────────────

function StatusBadge({ label, status }) {
  const cfg = STATUS[status] ?? STATUS.checking
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 4,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      fontSize: 11, color: 'var(--text-muted)',
      userSelect: 'none',
    }}>
      {status === 'checking'
        ? <CircularProgress size={6} thickness={5} />
        : <span className={`status-dot ${cfg.dot}`} style={{ width: 7, height: 7, flexShrink: 0 }} />
      }
      {label}
      {status !== 'checking' && (
        <span style={{ fontSize: 10, opacity: 0.7 }}>— {cfg.label}</span>
      )}
    </div>
  )
}

function Sparkline({ data = SPARKLINE_DATA, color = '#42a5f5', w = 72, h = 28 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / rng) * (h - 3) - 1.5,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  )
}

function KpiCard({ icon: Icon, iconColor = '#42a5f5', title, value, sub, extra }) {
  return (
    <div className="w11-card" style={{ marginBottom: 0, padding: '12px 13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: `${iconColor}1A`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor,
        }}>
          <Icon sx={{ fontSize: 15 }} />
        </div>
        {extra && <div style={{ flexShrink: 0 }}>{extra}</div>}
      </div>
      <div style={{
        fontSize: typeof value === 'number' ? 24 : 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.15,
        marginBottom: 3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function QuickCard({ project, onNavigate }) {
  const thumb   = project.thumbnail_url || project.thumbnailUrl
  const version = project.latest_version || project.latestVersion
  const size    = project.file_size      || project.fileSize
  const updated = project.updated_at    || project.created_at
  const dateStr = updated
    ? new Date(updated).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '—'

  return (
    <div
      onClick={() => onNavigate('project-detail', project)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 7, overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.14s, box-shadow 0.14s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(25,118,210,0.4)'
        e.currentTarget.style.boxShadow   = '0 3px 14px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      {/* Thumbnail 16:9 */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: '#1a1f25',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <DirectionsBusOutlinedIcon sx={{ fontSize: 20, color: 'var(--text-muted)', opacity: 0.25 }} />
        }
      </div>

      {/* Body */}
      <div style={{ padding: '7px 9px 8px' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {project.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {version && <span style={{ color: '#42a5f5', marginRight: 4 }}>{version}</span>}
            {dateStr}
          </div>
          {size && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
              {fmtBytes(size)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Launchpad ──────────────────────────────────────────────────────────────
function Launchpad({ settings }) {
  const omsiPath   = settings?.omsiPath || ''
  const configured = !!omsiPath

  // null | 'omsi' | 'bbs' | 'editor'
  const [launching,    setLaunching]    = useState(null)
  const [omsiRunning,  setOmsiRunning]  = useState(false)
  const [snackOpen,    setSnackOpen]    = useState(false)

  // Sync initial + abonnement au monitoring
  useEffect(() => {
    window.api.omsi.getProcessStatus().then(({ running }) => setOmsiRunning(running))
    window.api.omsi.onProcessStatus(({ running }) => {
      setOmsiRunning(running)
      // Quand le processus se ferme, libérer le spinner
      if (!running) setLaunching(null)
    })
    return () => window.api.omsi.offProcessStatus()
  }, [])

  const busy = omsiRunning || launching !== null

  const handleLaunch = async (key, fn) => {
    if (omsiRunning) { setSnackOpen(true); return }
    setLaunching(key)
    await fn()
    // Le spinner sera levé dès que le monitoring détecte le process actif
    // puis fermé. Si OMSI ne démarre pas du tout (erreur Steam), on libère
    // après un délai de sécurité de 12 s.
    setTimeout(() => setLaunching(prev => prev === key ? null : prev), 12000)
  }

  const btnBase = {
    fontSize: 12,
    textTransform: 'none',
    borderRadius: '7px',
    justifyContent: 'flex-start',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
  }
  const hoverSx = {
    '&:not(.Mui-disabled):hover': { transform: 'scale(1.04)' },
  }

  // Indicateur de statut dans le header (point coloré)
  const statusDot = omsiRunning
    ? { color: '#6ccb5f', label: 'En cours' }
    : { color: 'rgba(255,255,255,0.18)', label: 'Inactif' }

  const notConfiguredTip = 'Veuillez configurer le chemin d\'OMSI 2 dans les paramètres'

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 22,
        right: 26,
        zIndex: 200,
        minWidth: 192,
      }}>
        {/* Carte glassmorphism */}
        <div style={{
          background: 'rgba(10,13,18,0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${omsiRunning ? 'rgba(108,203,95,0.22)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 12,
          padding: '10px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          transition: 'border-color 0.3s',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 2,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.25)',
              fontFamily: 'Inter, sans-serif',
            }}>
              Launchpad
            </span>
            <Tooltip title={statusDot.label} placement="left">
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: statusDot.color,
                boxShadow: omsiRunning ? '0 0 6px #6ccb5f88' : 'none',
                display: 'inline-block',
                transition: 'background 0.3s, box-shadow 0.3s',
              }} />
            </Tooltip>
          </div>

          {/* LANCER OMSI 2 — bouton principal */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? 'OMSI est déjà en cours d\'exécution' : ''}
            placement="left"
          >
            <span>
              <Button
                variant="contained"
                fullWidth
                disabled={!configured || busy}
                onClick={() => handleLaunch('omsi', () => window.api.omsi.launch())}
                startIcon={
                  launching === 'omsi'
                    ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                    : <PlayArrowIcon sx={{ fontSize: 18 }} />
                }
                sx={{
                  ...btnBase,
                  py: 0.9,
                  fontSize: 13,
                  fontWeight: 700,
                  ...hoverSx,
                  '&:not(.Mui-disabled):hover': {
                    transform: 'scale(1.04)',
                    boxShadow: '0 4px 20px rgba(25,118,210,0.45)',
                  },
                }}
              >
                LANCER OMSI 2
              </Button>
            </span>
          </Tooltip>

          {/* LANCER BBS */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? 'OMSI est déjà en cours d\'exécution' : 'Busbetrieb-Simulator'}
            placement="left"
          >
            <span>
              <Button
                variant="outlined"
                fullWidth
                disabled={!configured || busy}
                onClick={() => handleLaunch('bbs', () => window.api.omsi.launchBBS(omsiPath))}
                startIcon={
                  launching === 'bbs'
                    ? <CircularProgress size={13} sx={{ color: 'rgba(255,255,255,0.72)' }} />
                    : <BusinessIcon sx={{ fontSize: 15 }} />
                }
                sx={{
                  ...btnBase,
                  py: 0.6,
                  color: 'rgba(255,255,255,0.72)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  ...hoverSx,
                  '&:not(.Mui-disabled):hover': {
                    transform: 'scale(1.04)',
                    borderColor: 'rgba(255,255,255,0.38)',
                    background: 'rgba(255,255,255,0.04)',
                  },
                }}
              >
                LANCER BBS
              </Button>
            </span>
          </Tooltip>

          {/* ÉDITEUR DE CARTES */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? 'OMSI est déjà en cours d\'exécution' : 'OMSI 2 Map Editor'}
            placement="left"
          >
            <span>
              <Button
                variant="outlined"
                fullWidth
                disabled={!configured || busy}
                onClick={() => handleLaunch('editor', () => window.api.omsi.launchEditor())}
                startIcon={
                  launching === 'editor'
                    ? <CircularProgress size={13} sx={{ color: 'rgba(255,255,255,0.72)' }} />
                    : <MapIcon sx={{ fontSize: 15 }} />
                }
                sx={{
                  ...btnBase,
                  py: 0.6,
                  color: 'rgba(255,255,255,0.72)',
                  borderColor: 'rgba(255,255,255,0.14)',
                  ...hoverSx,
                  '&:not(.Mui-disabled):hover': {
                    transform: 'scale(1.04)',
                    borderColor: 'rgba(255,255,255,0.38)',
                    background: 'rgba(255,255,255,0.04)',
                  },
                }}
              >
                ÉDITEUR DE CARTES
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Snackbar — instance déjà en cours */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ fontSize: 13, borderRadius: '8px' }}
        >
          Une instance d'OMSI ou d'un outil associé est déjà en cours d'exécution.
        </Alert>
      </Snackbar>
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function HomePage({ onNavigate }) {
  const [projects,        setProjects]        = useState([])
  const [settings,        setSettings]        = useState({})
  const [isFirstLaunch,   setIsFirstLaunch]   = useState(false)
  const [apiStatus,       setApiStatus]       = useState('checking')
  const [sftpStatus,      setSftpStatus]      = useState('checking')
  const [activity,        setActivity]        = useState([])
  const [activityStatus,  setActivityStatus]  = useState('loading') // 'loading' | 'ok' | 'error'

  useEffect(() => {
    const load = async () => {
      const [s, launched] = await Promise.all([
        window.api.settings.get(),
        window.api.store.get('hasLaunched'),
      ])
      setSettings(s || {})

      if (!launched) {
        setIsFirstLaunch(true)
        await window.api.store.set('hasLaunched', true)
      }

      try {
        const data = await projectService.getAll()
        setProjects(Array.isArray(data) ? data : [])
        setApiStatus('ok')
      } catch {
        setApiStatus('error')
      }

      // Activité récente — indépendant du statut API principal
      try {
        const acts = await projectService.getRecentActivity()
        setActivity(Array.isArray(acts) ? acts : [])
        setActivityStatus('ok')
      } catch {
        setActivityStatus('error')
      }

      const configured = s?.vpsIp && s?.vpsUser && s?.sshKeyPath
      if (!configured) { setSftpStatus('unconfigured'); return }
      try {
        const res = await window.api.sftp.test(s)
        setSftpStatus(res?.success !== false ? 'ok' : 'error')
      } catch {
        setSftpStatus('error')
      }
    }
    load()
  }, [])

  const sorted = [...projects].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )
  const lastSynced     = sorted[0] ?? null
  const quickProjects  = sorted.slice(0, 8)

  const formatDate = (p) => {
    if (!p) return '—'
    const d = new Date(p.updated_at || p.created_at || 0)
    return d.getTime() === 0 ? '—'
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const quotaPct = Math.min(Math.round((projects.length / 20) * 100), 100)

  return (
    <div className="fade-in">

      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14,
      }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Tableau de bord</div>
          <div className="page-subtitle">État de la flotte de bus NEROSY</div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
          <StatusBadge label="Serveur API"  status={apiStatus}  />
          <StatusBadge label="Service SFTP" status={sftpStatus} />
        </div>
      </div>

      {/* ── Layout 2 colonnes ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 262px',
        gap: 12,
        alignItems: 'flex-start',
      }}>

        {/* ════ COLONNE GAUCHE ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>

            {/* KPI 1 — Projets + quota */}
            <KpiCard
              icon={GridViewOutlinedIcon}
              iconColor="#42a5f5"
              title="Projets"
              sub="bus sur le serveur"
              value={apiStatus === 'checking' ? <CircularProgress size={18} /> : projects.length}
              extra={
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress
                    variant="determinate"
                    value={apiStatus === 'checking' ? 0 : quotaPct}
                    size={32}
                    thickness={3}
                    sx={{ color: '#42a5f5', opacity: 0.55 }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#42a5f5' }}>
                      {apiStatus === 'checking' ? '…' : `${quotaPct}%`}
                    </span>
                  </div>
                </div>
              }
            />

            {/* KPI 2 — Dernière synchro */}
            <KpiCard
              icon={CalendarTodayOutlinedIcon}
              iconColor="#f0a030"
              title="Dernière synchro"
              sub={lastSynced?.name ?? '—'}
              value={apiStatus === 'checking' ? '…' : formatDate(lastSynced)}
            />

            {/* KPI 3 — Statut SFTP */}
            <KpiCard
              icon={CableOutlinedIcon}
              iconColor={sftpStatus === 'ok' ? '#6ccb5f' : sftpStatus === 'error' ? '#fc3d39' : '#f0a030'}
              title="Connexion SFTP"
              sub={settings.vpsIp || 'Non configuré'}
              value={
                <span style={{
                  color: sftpStatus === 'ok'           ? '#6ccb5f'
                       : sftpStatus === 'error'        ? '#fc3d39'
                       : sftpStatus === 'unconfigured' ? '#f0a030'
                       : 'var(--text-muted)',
                  fontSize: 13,
                }}>
                  {STATUS[sftpStatus]?.label ?? '—'}
                </span>
              }
              extra={
                sftpStatus !== 'checking' && sftpStatus !== 'unconfigured' ? (
                  <span className={`status-dot ${STATUS[sftpStatus].dot}`}
                    style={{ width: 8, height: 8, marginTop: 2 }} />
                ) : null
              }
            />

            {/* KPI 4 — Tendance */}
            <KpiCard
              icon={TrendingUpOutlinedIcon}
              iconColor="#ce93d8"
              title="Tendance syncs"
              sub="10 derniers points (mock)"
              value={`+${SPARKLINE_DATA[SPARKLINE_DATA.length - 1]}`}
              extra={<Sparkline color="#ce93d8" />}
            />
          </div>

          {/* Bannière premier lancement */}
          {isFirstLaunch && (
            <div className="w11-card" style={{
              marginBottom: 0, padding: '10px 14px',
              borderColor: 'rgba(25,118,210,0.3)',
              background: 'rgba(25,118,210,0.05)',
            }}>
              <div style={{ fontSize: 12, color: '#42a5f5', lineHeight: 1.65 }}>
                Bienvenue dans Cinnamon ! Configurez d'abord votre connexion dans les{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => onNavigate('settings')}>
                  Paramètres
                </span>
                , puis créez un premier projet dans{' '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => onNavigate('projects')}>
                  Projets
                </span>.
              </div>
            </div>
          )}

          {/* Accès rapide */}
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title">
              <DirectionsBusOutlinedIcon sx={{ fontSize: 14 }} />
              Accès rapide
              {quickProjects.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10,
                }}>
                  {quickProjects.length}
                </span>
              )}
            </div>

            {apiStatus === 'checking' && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: 10 }}>
                <CircularProgress size={18} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chargement…</span>
              </div>
            )}

            {apiStatus === 'error' && (
              <div style={{
                padding: '8px 10px', borderRadius: 5, fontSize: 12,
                color: '#fc3d39', background: 'rgba(252,61,57,0.06)',
                border: '1px solid rgba(252,61,57,0.2)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 14 }} />
                Impossible de charger les projets. Vérifiez votre connexion.
              </div>
            )}

            {apiStatus === 'ok' && quickProjects.length === 0 && (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <div className="empty-state-icon">
                  <DirectionsBusOutlinedIcon sx={{ fontSize: 40, opacity: 0.2 }} />
                </div>
                <div className="empty-state-text">Aucun projet pour l'instant.</div>
              </div>
            )}

            {apiStatus === 'ok' && quickProjects.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 8,
              }}>
                {quickProjects.map(p => (
                  <QuickCard key={p.id} project={p} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ COLONNE DROITE : Activité récente ════ */}
        <div>
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title" style={{ marginBottom: 6 }}>
              <RocketLaunchOutlinedIcon sx={{ fontSize: 14 }} />
              Activité récente
            </div>

            {/* Chargement */}
            {activityStatus === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '18px 0', justifyContent: 'center' }}>
                <CircularProgress size={14} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</span>
              </div>
            )}

            {/* Erreur */}
            {activityStatus === 'error' && (
              <div style={{ padding: '7px 10px', borderRadius: 5, fontSize: 12,
                color: '#f0a030', background: 'rgba(240,160,48,0.06)',
                border: '1px solid rgba(240,160,48,0.18)',
                display: 'flex', alignItems: 'center', gap: 7 }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} />
                Impossible de charger l'activité.
              </div>
            )}

            {/* Vide */}
            {activityStatus === 'ok' && activity.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)',
                fontStyle: 'italic', padding: '10px 0 4px' }}>
                Aucune activité récente pour le moment.
              </div>
            )}

            {/* Timeline */}
            {activityStatus === 'ok' && activity.length > 0 && (
              <Timeline
                sx={{
                  p: 0, m: 0,
                  [`& .${timelineItemClasses.root}::before`]: { flex: 0, padding: 0 },
                }}
              >
                {activity.map((event, i) => {
                  const label = `Version ${event.version_number} de ${event.project_name}`
                  const time  = fmtRelative(event.created_at)
                  const isLast = i === activity.length - 1
                  return (
                    <TimelineItem key={event.id}>
                      <TimelineSeparator>
                        <TimelineDot sx={{
                          background: '#1976d2',
                          boxShadow: '0 0 0 3px rgba(25,118,210,0.18)',
                          p: '4px', mt: '4px', mb: 0,
                        }}>
                          <RocketLaunchOutlinedIcon sx={{ fontSize: 11 }} />
                        </TimelineDot>
                        {!isLast && (
                          <TimelineConnector sx={{
                            background: 'rgba(255,255,255,0.07)', minHeight: 18,
                          }} />
                        )}
                      </TimelineSeparator>
                      <TimelineContent sx={{
                        py: '4px', px: 1.5,
                        pb: isLast ? '2px' : '10px',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600,
                          color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          {time}
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  )
                })}
              </Timeline>
            )}
          </div>
        </div>

      </div>

      <Launchpad settings={settings} />
    </div>
  )
}
