import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

// Status dot colors (no labels — translated inline)
const STATUS_DOT = {
  checking:     'idle',
  ok:           'success',
  error:        'error',
  unconfigured: 'warning',
}

// ── Composants ─────────────────────────────────────────────────────────────

function StatusBadge({ label, status }) {
  const { t } = useTranslation()
  const STATUS_LABEL = {
    checking:     t('home.statusChecking'),
    ok:           t('home.statusOnline'),
    error:        t('home.statusOffline'),
    unconfigured: t('home.statusUnconfigured'),
  }
  const dot = STATUS_DOT[status] ?? 'idle'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 4,
      background: 'var(--surface-subtle)',
      border: '1px solid var(--border-subtle)',
      fontSize: 11, color: 'var(--text-muted)',
      userSelect: 'none',
    }}>
      {status === 'checking'
        ? <CircularProgress size={6} thickness={5} />
        : <span className={`status-dot ${dot}`} style={{ width: 7, height: 7, flexShrink: 0 }} />
      }
      {label}
      {status !== 'checking' && (
        <span style={{ fontSize: 10, opacity: 0.7 }}>— {STATUS_LABEL[status] ?? status}</span>
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
  const { i18n } = useTranslation()
  const thumb   = project.thumbnail_url || project.thumbnailUrl
  const version = project.latest_version || project.latestVersion
  const size    = project.file_size      || project.fileSize
  const updated = project.updated_at    || project.created_at
  const locale  = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const dateStr = updated
    ? new Date(updated).toLocaleDateString(locale, { day: '2-digit', month: 'short' })
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
        background: 'var(--bg-thumb)',
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
function Launchpad({ settings, isDark }) {
  const { t } = useTranslation()
  const omsiPath   = settings?.omsiPath || ''
  const configured = !!omsiPath

  const [launching,    setLaunching]    = useState(null)
  const [omsiRunning,  setOmsiRunning]  = useState(false)
  const [snackOpen,    setSnackOpen]    = useState(false)

  useEffect(() => {
    window.api.omsi.getProcessStatus().then(({ running }) => setOmsiRunning(running))
    window.api.omsi.onProcessStatus(({ running }) => {
      setOmsiRunning(running)
      if (!running) setLaunching(null)
    })
    return () => window.api.omsi.offProcessStatus()
  }, [])

  const busy = omsiRunning || launching !== null

  const handleLaunch = async (key, fn) => {
    if (omsiRunning) { setSnackOpen(true); return }
    setLaunching(key)
    await fn()
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

  const statusDot = omsiRunning
    ? { color: '#6ccb5f', label: t('home.active') }
    : { color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)', label: t('home.inactive') }

  const notConfiguredTip = t('home.configureOmsiFirst')
  const alreadyRunningTip = t('home.omsiRunning')

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 22,
        right: 26,
        zIndex: 200,
        minWidth: 192,
      }}>
        <div style={{
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${omsiRunning ? 'rgba(108,203,95,0.22)' : 'var(--glass-card-border)'}`,
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
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}>
              {t('home.launchpad')}
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

          {/* LANCER OMSI 2 */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? alreadyRunningTip : ''}
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
                {t('home.launchOmsi')}
              </Button>
            </span>
          </Tooltip>

          {/* LANCER BBS */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? alreadyRunningTip : t('home.bbsTooltip')}
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
                    ? <CircularProgress size={13} sx={{ color: isDark ? 'rgba(255,255,255,0.72)' : 'inherit' }} />
                    : <BusinessIcon sx={{ fontSize: 15 }} />
                }
                sx={{
                  ...btnBase,
                  py: 0.6,
                  ...(isDark ? {
                    color: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.14)',
                    '&:not(.Mui-disabled):hover': {
                      transform: 'scale(1.04)',
                      borderColor: 'rgba(255,255,255,0.38)',
                      background: 'rgba(255,255,255,0.04)',
                    },
                  } : { ...hoverSx }),
                }}
              >
                {t('home.launchBbs')}
              </Button>
            </span>
          </Tooltip>

          {/* ÉDITEUR DE CARTES */}
          <Tooltip
            title={!configured ? notConfiguredTip : omsiRunning ? alreadyRunningTip : 'OMSI 2 Map Editor'}
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
                    ? <CircularProgress size={13} sx={{ color: isDark ? 'rgba(255,255,255,0.72)' : 'inherit' }} />
                    : <MapIcon sx={{ fontSize: 15 }} />
                }
                sx={{
                  ...btnBase,
                  py: 0.6,
                  ...(isDark ? {
                    color: 'rgba(255,255,255,0.72)',
                    borderColor: 'rgba(255,255,255,0.14)',
                    '&:not(.Mui-disabled):hover': {
                      transform: 'scale(1.04)',
                      borderColor: 'rgba(255,255,255,0.38)',
                      background: 'rgba(255,255,255,0.04)',
                    },
                  } : { ...hoverSx }),
                }}
              >
                {t('home.launchEditor')}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Snackbar */}
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
          {t('home.omsiAlreadyRunning')}
        </Alert>
      </Snackbar>
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function HomePage({ onNavigate, isDark = true }) {
  const { t, i18n } = useTranslation()
  const [projects,        setProjects]        = useState([])
  const [settings,        setSettings]        = useState({})
  const [isFirstLaunch,   setIsFirstLaunch]   = useState(false)
  const [apiStatus,       setApiStatus]       = useState('checking')
  const [sftpStatus,      setSftpStatus]      = useState('checking')
  const [activity,        setActivity]        = useState([])
  const [activityStatus,  setActivityStatus]  = useState('loading')

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

  const fmtRelative = (dateStr) => {
    if (!dateStr) return '—'
    const d    = new Date(dateStr)
    const diff = Date.now() - d.getTime()
    const sec  = Math.floor(diff / 1000)
    const min  = Math.floor(sec  / 60)
    const hr   = Math.floor(min  / 60)
    const days = Math.floor(hr   / 24)
    if (sec  <  60) return t('home.timeJustNow')
    if (min  <  60) return t('home.timeMinutes', { count: min })
    if (hr   <  24) return t('home.timeHours',   { count: hr  })
    if (days === 1)  return t('home.timeYesterday')
    if (days  <  7)  return t('home.timeDays',    { count: days })
    const locale = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR'
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
  }

  const sorted = [...projects].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )
  const lastSynced     = sorted[0] ?? null
  const quickProjects  = sorted.slice(0, 8)

  const formatDate = (p) => {
    if (!p) return '—'
    const d = new Date(p.updated_at || p.created_at || 0)
    if (d.getTime() === 0) return '—'
    const locale = i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR'
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const quotaPct = Math.min(Math.round((projects.length / 20) * 100), 100)

  const STATUS_LABEL = {
    checking:     t('home.statusChecking'),
    ok:           t('home.statusOnline'),
    error:        t('home.statusOffline'),
    unconfigured: t('home.statusUnconfigured'),
  }

  // Render welcome message with clickable links
  const renderWelcomeMsg = () => {
    const msg = t('home.welcomeMsg')
    const parts = msg.split('{{settings}}')
    const [middle, after] = (parts[1] || '').split('{{projects}}')
    return (
      <>
        {parts[0]}
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
          onClick={() => onNavigate('settings')}>
          {t('home.welcomeSettings')}
        </span>
        {middle}
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}
          onClick={() => onNavigate('projects')}>
          {t('home.welcomeProjects')}
        </span>
        {after}
      </>
    )
  }

  return (
    <div className="fade-in">

      {/* ── En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14,
      }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">{t('home.title')}</div>
          <div className="page-subtitle">{t('home.subtitle')}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
          <StatusBadge label={t('home.apiStatus')}  status={apiStatus}  />
          <StatusBadge label={t('home.sftpStatus')} status={sftpStatus} />
        </div>
      </div>

      {/* ── Layout 2 colonnes */}
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

            <KpiCard
              icon={GridViewOutlinedIcon}
              iconColor="#42a5f5"
              title={t('home.kpiProjects')}
              sub={t('home.kpiProjectsSub')}
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

            <KpiCard
              icon={CalendarTodayOutlinedIcon}
              iconColor="#f0a030"
              title={t('home.kpiLastSync')}
              sub={lastSynced?.name ?? '—'}
              value={apiStatus === 'checking' ? '…' : formatDate(lastSynced)}
            />

            <KpiCard
              icon={CableOutlinedIcon}
              iconColor={sftpStatus === 'ok' ? '#6ccb5f' : sftpStatus === 'error' ? '#fc3d39' : '#f0a030'}
              title={t('home.kpiSftp')}
              sub={settings.vpsIp || t('home.statusUnconfigured')}
              value={
                <span style={{
                  color: sftpStatus === 'ok'           ? '#6ccb5f'
                       : sftpStatus === 'error'        ? '#fc3d39'
                       : sftpStatus === 'unconfigured' ? '#f0a030'
                       : 'var(--text-muted)',
                  fontSize: 13,
                }}>
                  {STATUS_LABEL[sftpStatus] ?? '—'}
                </span>
              }
              extra={
                sftpStatus !== 'checking' && sftpStatus !== 'unconfigured' ? (
                  <span className={`status-dot ${STATUS_DOT[sftpStatus]}`}
                    style={{ width: 8, height: 8, marginTop: 2 }} />
                ) : null
              }
            />

            <KpiCard
              icon={TrendingUpOutlinedIcon}
              iconColor="#ce93d8"
              title={t('home.kpiTrend')}
              sub={t('home.kpiTrendSub')}
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
                {renderWelcomeMsg()}
              </div>
            </div>
          )}

          {/* Accès rapide */}
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title">
              <DirectionsBusOutlinedIcon sx={{ fontSize: 14 }} />
              {t('home.quickAccess')}
              {quickProjects.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, color: 'var(--text-muted)',
                  background: 'var(--surface-subtle)', padding: '1px 7px', borderRadius: 10,
                }}>
                  {quickProjects.length}
                </span>
              )}
            </div>

            {apiStatus === 'checking' && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: 10 }}>
                <CircularProgress size={18} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('common.loading')}</span>
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
                {t('home.loadError')}
              </div>
            )}

            {apiStatus === 'ok' && quickProjects.length === 0 && (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <div className="empty-state-icon">
                  <DirectionsBusOutlinedIcon sx={{ fontSize: 40, opacity: 0.2 }} />
                </div>
                <div className="empty-state-text">{t('home.noProjects')}</div>
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
              {t('home.recentActivity')}
            </div>

            {activityStatus === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '18px 0', justifyContent: 'center' }}>
                <CircularProgress size={14} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('common.loading')}</span>
              </div>
            )}

            {activityStatus === 'error' && (
              <div style={{ padding: '7px 10px', borderRadius: 5, fontSize: 12,
                color: '#f0a030', background: 'rgba(240,160,48,0.06)',
                border: '1px solid rgba(240,160,48,0.18)',
                display: 'flex', alignItems: 'center', gap: 7 }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} />
                {t('home.activityLoadError')}
              </div>
            )}

            {activityStatus === 'ok' && activity.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)',
                fontStyle: 'italic', padding: '10px 0 4px' }}>
                {t('home.noActivity')}
              </div>
            )}

            {activityStatus === 'ok' && activity.length > 0 && (
              <Timeline
                sx={{
                  p: 0, m: 0,
                  [`& .${timelineItemClasses.root}::before`]: { flex: 0, padding: 0 },
                }}
              >
                {activity.map((event, i) => {
                  const label  = t('home.activityVersion', { version: event.version_number, project: event.project_name })
                  const time   = fmtRelative(event.created_at)
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
                            background: 'var(--border-subtle)', minHeight: 18,
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

      <Launchpad settings={settings} isDark={isDark} />
    </div>
  )
}
