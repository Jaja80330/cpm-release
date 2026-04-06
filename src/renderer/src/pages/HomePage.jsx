import React, { useState, useEffect } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import CableOutlinedIcon from '@mui/icons-material/CableOutlined'
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import { projectService } from '../services/projectService'

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
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      fontSize: 12, fontWeight: 500,
      color: 'var(--text-secondary)',
      userSelect: 'none',
    }}>
      {status === 'checking'
        ? <CircularProgress size={8} thickness={5} />
        : <span className={`status-dot ${cfg.dot}`} style={{ width: 7, height: 7, flexShrink: 0 }} />
      }
      {label}
      {status !== 'checking' && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          — {cfg.label}
        </span>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, value, label, sub, accent }) {
  return (
    <div className="w11-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8, flexShrink: 0,
          background: accent ? 'rgba(25,118,210,0.12)' : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ? '#42a5f5' : 'var(--text-muted)',
        }}>
          <Icon sx={{ fontSize: 20 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: typeof value === 'number' ? 26 : 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {value}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>
            {label}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          )}
        </div>
      </div>
    </div>
  )
}

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
    >
      <div className="project-thumb">
        {thumb
          ? <img src={thumb} alt="" />
          : <DirectionsBusOutlinedIcon sx={{ fontSize: 28, color: 'var(--text-muted)', opacity: 0.4 }} />
        }
      </div>
      <div className="project-card-body">
        <div className="project-name" style={{ fontSize: 13 }}>{project.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 6 }}>
          Modifié le {dateStr}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          marginTop: 6, color: '#1976d2', opacity: 0.7,
        }}>
          <ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />
        </div>
      </div>
    </div>
  )
}

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

      try {
        const data = await projectService.getAll()
        setProjects(Array.isArray(data) ? data : [])
        setApiStatus('ok')
      } catch {
        setApiStatus('error')
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
  const lastSynced      = sorted[0] ?? null
  const recentProjects  = sorted.slice(0, 4)

  const formatDate = (p) => {
    if (!p) return '—'
    const d = new Date(p.updated_at || p.created_at || 0)
    return d.getTime() === 0 ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Tableau de bord</div>
          <div className="page-subtitle">État de la flotte de bus NEROSY</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
          <StatusBadge label="Serveur API"  status={apiStatus}  />
          <StatusBadge label="Service SFTP" status={sftpStatus} />
        </div>
      </div>

      {/* Indicateurs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
        marginBottom: 18,
      }}>
        <MetricCard
          icon={GridViewOutlinedIcon}
          value={apiStatus === 'checking' ? '…' : projects.length}
          label="Projets"
          sub="bus répertoriés sur le serveur"
          accent
        />
        <MetricCard
          icon={CalendarTodayOutlinedIcon}
          value={apiStatus === 'checking' ? '…' : formatDate(lastSynced)}
          label="Dernière synchronisation projet"
          sub={lastSynced ? lastSynced.name : undefined}
        />
      </div>

      {/* Accès rapide */}
      {recentProjects.length > 0 && (
        <div className="w11-card" style={{ marginBottom: 14 }}>
          <div className="w11-card-title">
            <DirectionsBusOutlinedIcon sx={{ fontSize: 14 }} />
            Accès rapide
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10,
          }}>
            {recentProjects.map(p => (
              <QuickCard key={p.id} project={p} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Premier lancement */}
      {isFirstLaunch && (
        <div className="w11-card" style={{
          borderColor: 'rgba(25,118,210,0.35)',
          background: 'rgba(25,118,210,0.06)',
        }}>
          <div style={{ fontSize: 13, color: '#42a5f5', lineHeight: 1.6 }}>
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
