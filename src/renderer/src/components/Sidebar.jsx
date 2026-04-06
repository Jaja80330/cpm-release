import React from 'react'
import { Tooltip } from '@fluentui/react-components'
import {
  bundleIcon,
  HomeRegular, HomeFilled,
  GridRegular, GridFilled,
  SettingsRegular, SettingsFilled,
  ArrowExitRegular, ArrowExitFilled,
  PeopleRegular, PeopleFilled,
} from '@fluentui/react-icons'

const LogoutIcon  = bundleIcon(ArrowExitFilled,  ArrowExitRegular)
const HomeIcon     = bundleIcon(HomeFilled,       HomeRegular)
const ProjectsIcon = bundleIcon(GridFilled,       GridRegular)
const UsersIcon    = bundleIcon(PeopleFilled,     PeopleRegular)
const SettingsIcon = bundleIcon(SettingsFilled,   SettingsRegular)

const NAV_ITEMS = [
  { id: 'home',     Icon: HomeIcon,     label: 'Tableau de bord' },
  { id: 'projects', Icon: ProjectsIcon, label: 'Projets' },
  { id: 'users',    Icon: UsersIcon,    label: 'Utilisateurs',   adminOnly: true },
  { id: 'settings', Icon: SettingsIcon, label: 'Paramètres' },
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
      {/* Logo NEROSY / Cinnamon — bascule selon le thème */}
      <div style={{
        padding: '14px 14px 10px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid var(--colorNeutralStroke3)',
        marginBottom: 4,
      }}>
        <img
          src={isDark ? './cinnamon_logo_1.png' : './cinnamon_logo_2.png'}
          alt="Cinnamon"
          draggable={false}
          style={{
            height: 36,
            maxWidth: 160,
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
                <Icon fontSize={18} />
              </span>
              <span>{label}</span>
            </div>
          )
        })}

      <div style={{ flex: 1 }} />

      {/* Utilisateur connecté */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--colorNeutralStroke3)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--colorBrandBackground)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 600,
            color: 'var(--colorNeutralForeground1)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {fullName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--colorNeutralForeground4)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email || '—'}
          </div>
        </div>
        <Tooltip content="Se déconnecter" relationship="label" positioning="above">
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--colorNeutralForeground3)',
              display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4,
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--colorStatusDangerForeground1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--colorNeutralForeground3)'}
          >
            <LogoutIcon fontSize={16} />
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
