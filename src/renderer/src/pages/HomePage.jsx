import React, { useState, useEffect } from 'react'
import { Spinner } from '@fluentui/react-components'
import {
  bundleIcon,
  GridRegular, GridFilled,
  CalendarRegular, CalendarFilled,
  ServerRegular, ServerFilled,
  PlugConnectedRegular, PlugConnectedFilled,
  VehicleBusRegular, VehicleBusFilled,
  ArrowRightRegular, ArrowRightFilled,
} from '@fluentui/react-icons'
import { projectService } from '../services/projectService'

const GridIcon    = bundleIcon(GridFilled,          GridRegular)
const CalendarIcon = bundleIcon(CalendarFilled,     CalendarRegular)
const ServerIcon  = bundleIcon(ServerFilled,        ServerRegular)
const SftpIcon    = bundleIcon(PlugConnectedFilled, PlugConnectedRegular)
const BusIcon     = bundleIcon(VehicleBusFilled,    VehicleBusRegular)
const ArrowIcon   = bundleIcon(ArrowRightFilled,    ArrowRightRegular)

// ── Statut ───────────────────────────────────────────────────────────────────
const STATUS = {
  checking:     { dot: 'idle',    label: 'Vérification…' },
  ok:           { dot: 'success', label: 'En ligne'      },
  error:        { dot: 'error',   label: 'Hors ligne'    },
  unconfigured: { dot: 'warning', label: 'Non configuré' },
}

function StatusBadge({ label, status }) {
  const cfg = STATUS[status] ?? STATUS.checking
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 6,
      background: 'var(--colorNeutralBackground1)',
      border: '1px solid var(--colorNeutralStroke2)',
      fontSize: 12, fontWeight: 500,
      color: 'var(--colorNeutralForeground2)',
      userSelect: 'none',
    }}>
      {status === 'checking'
        ? <Spinner size="extra-tiny" />
        : <span className={`status-dot ${cfg.dot}`} style={{ width: 7, height: 7, flexShrink: 0 }} />
      }
      {label}
      {status !== 'checking' && (
        <span style={{ fontSize: 10, color: 'var(--colorNeutralForeground4)' }}>
          — {cfg.label}
        </span>
      )}
    </div>
  )
}

// ── Carte métrique ───────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, value, label, sub, accent }) {
  return (
    <div className="w11-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: accent ? 'rgba(96,205,255,0.12)' : 'var(--colorNeutralBackground3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? '#60cdff' : 'var(--colorNeutralForeground3)',
        }}>
          <Icon fontSize={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: typeof value === 'number' ? 26 : 15,
            fontWeight: 700,
            color: 'var(--colorNeutralForeground1)',
            lineHeight: 1.15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--colorNeutralForeground2)', marginTop: 4 }}>
            {label}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)', marginTop: 2 }}>
              {sub}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Carte accès rapide ────────────────────────────────────────────────────────
function QuickCard({ project, onNavigate }) {
  const thumb = project.thumbnail_url || project.thumbnailUrl
  const updated = project.updated_at || project.created_at
  const dateStr = updated
    ? new Date(updated).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div
      className="project-card"
      onClick={() => onNavigate('project-detail', project)}
      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
    >
      {/* Miniature */}
      <div style={{
        height: 80, borderRadius: '6px 6px 0 0',
        background: 'var(--colorNeutralBackground3)',
        overflow: 'hidden', margin: '-18px -18px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {thumb
          ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <BusIcon fontSize={28} style={{ color: 'var(--colorNeutralForeground4)' }} />
        }
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--colorNeutralForeground1)', marginBottom: 4 }}>
        {project.name}
      </div>
      <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)', marginTop: 'auto' }}>
        Modifié le {dateStr}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        marginTop: 8, color: 'var(--colorBrandForeground1)', opacity: 0.7,
      }}>
        <ArrowIcon fontSize={14} />
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function HomePage({ onNavigate }) {
  const [projects,      setProjects]      = useState([])
  const [settings,      setSettings]      = useState({})
  const [isFirstLaunch, setIsFirstLaunch] = useState(false)
  const [apiStatus,     setApiStatus]     = useState('checking')
  const [sftpStatus,    setSftpStatus]    = useState('checking')

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

      // Serveur API
      try {
        const data = await projectService.getAll()
        setProjects(Array.isArray(data) ? data : [])
        setApiStatus('ok')
      } catch {
        setApiStatus('error')
      }

      // Service SFTP
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

  // Tri par date décroissante
  const sorted = [...projects].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )

  const lastSynced   = sorted[0] ?? null
  const recentProjects = sorted.slice(0, 4)

  const formatDate = (p) => {
    if (!p) return '—'
    const d = new Date(p.updated_at || p.created_at || 0)
    return d.getTime() === 0 ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="fade-in">

      {/* ── En-tête + pastilles services ──────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Tableau de bord</div>
          <div className="page-subtitle">État de la flotte de bus NEROSY</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
          <StatusBadge label="Serveur API"  status={apiStatus}  />
          <StatusBadge label="Service SFTP" status={sftpStatus} />
        </div>
      </div>

      {/* ── Indicateurs ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        <MetricCard
          icon={GridIcon}
          value={apiStatus === 'checking' ? '…' : projects.length}
          label="Projets"
          sub="bus répertoriés sur le serveur"
          accent
        />
        <MetricCard
          icon={CalendarIcon}
          value={apiStatus === 'checking' ? '…' : formatDate(lastSynced)}
          label="Dernière synchronisation projet"
          sub={lastSynced ? lastSynced.name : undefined}
        />
      </div>

      {/* ── Accès rapide ──────────────────────────────────────────────────── */}
      {recentProjects.length > 0 && (
        <div className="w11-card" style={{ marginBottom: 16 }}>
          <div className="w11-card-title">
            <BusIcon fontSize={16} />
            Accès rapide
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}>
            {recentProjects.map(p => (
              <QuickCard key={p.id} project={p} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* ── Premier lancement ─────────────────────────────────────────────── */}
      {isFirstLaunch && (
        <div className="w11-card" style={{
          borderColor: 'rgba(15,108,189,0.4)',
          background: 'rgba(15,108,189,0.06)',
        }}>
          <div style={{ fontSize: 13, color: '#60cdff', lineHeight: 1.6 }}>
            Bienvenue dans Cinnamon ! Configurez d'abord votre connexion dans les{' '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onNavigate('settings')}>
              Paramètres
            </span>
            , puis créez un premier projet dans{' '}
            <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onNavigate('projects')}>
              Projets
            </span>
            .
          </div>
        </div>
      )}

    </div>
  )
}
