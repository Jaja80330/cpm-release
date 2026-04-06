import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'

const NAV_ITEMS = [
  { id: 'home',     Icon: HomeOutlinedIcon,      label: 'Tableau de bord' },
  { id: 'projects', Icon: GridViewOutlinedIcon,  label: 'Projets' },
  { id: 'users',    Icon: PeopleAltOutlinedIcon, label: 'Utilisateurs', adminOnly: true },
  { id: 'settings', Icon: SettingsOutlinedIcon,  label: 'Paramètres' },
]

export default function Sidebar({ currentPage, onNavigate, user, onLogout, isDark }) {
  const initials = user
    ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` || '?'
    : '?'
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—'
    : '—'

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{
        padding: '10px 8px 8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 6,
      }}>
        <img
          src={isDark ? './cinnamon_logo_1.png' : './cinnamon_logo_2.png'}
          alt="Cinnamon"
          draggable={false}
          style={{
            height: 32,
            maxWidth: 150,
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      </div>

      <div className="sidebar-section-title">Navigation</div>

      {NAV_ITEMS
        .filter(item => !item.adminOnly || user?.role === 'super_admin')
        .map(({ id, Icon, label }) => {
          const active = currentPage === id
          return (
            <div
              key={id}
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <span className="nav-icon">
                <Icon sx={{ fontSize: 18 }} />
              </span>
              <span>{label}</span>
            </div>
          )
        })}

      <div style={{ flex: 1 }} />

      {/* Utilisateur connecté */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#1976d2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {fullName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email || '—'}
          </div>
        </div>
        <Tooltip title="Se déconnecter" placement="top">
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4,
              flexShrink: 0, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fc3d39'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
