import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'

const NAV_ITEMS = [
  { id: 'home',     Icon: HomeOutlinedIcon,      label: 'Tableau de bord' },
  { id: 'projects', Icon: GridViewOutlinedIcon,  label: 'Projets' },
  { id: 'users',    Icon: PeopleAltOutlinedIcon, label: 'Utilisateurs', adminOnly: true },
  { id: 'tools',    Icon: BuildOutlinedIcon,     label: 'Outils' },
  { id: 'settings', Icon: SettingsOutlinedIcon,  label: 'Paramètres' },
]

const W_EXPANDED  = 260
const W_COLLAPSED = 70

export default function Sidebar({ currentPage, onNavigate, user, onLogout, isDark, isCollapsed, onToggleCollapse }) {
  const initials = user
    ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` || '?'
    : '?'
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—'
    : '—'

  return (
    <nav className="sidebar" style={{ width: isCollapsed ? W_COLLAPSED : W_EXPANDED }}>

      {/* ── Header : logo + bouton collapse ── */}
      <div style={{
        padding: isCollapsed ? '8px 6px 6px' : '10px 12px 8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 4,
        minHeight: 46,
        gap: 4,
      }}>
        <img
          src={isCollapsed ? './cinnamon_icon.png' : (isDark ? './cinnamon_logo_1.png' : './cinnamon_logo_2.png')}
          alt="Cinnamon"
          draggable={false}
          style={isCollapsed
            ? { width: 30, height: 30, objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none', flexShrink: 0 }
            : { height: 28, maxWidth: 150, objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none', flexShrink: 0 }
          }
        />
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{
            color: 'var(--text-muted)',
            p: '3px',
            flexShrink: 0,
            '&:hover': { color: 'var(--text-primary)', background: 'rgba(255,255,255,0.07)' },
          }}
        >
          {isCollapsed
            ? <ChevronRightIcon sx={{ fontSize: 15 }} />
            : <ChevronLeftIcon  sx={{ fontSize: 15 }} />
          }
        </IconButton>
      </div>

      {/* ── Navigation ── */}
      {NAV_ITEMS
        .filter(item => !item.adminOnly || user?.role === 'super_admin')
        .map(({ id, Icon, label }) => {
          const active = currentPage === id
          const item = (
            <div
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => onNavigate(id)}
              style={{
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '9px 0' : '8px 10px',
                gap: isCollapsed ? 0 : 10,
              }}
            >
              <span className="nav-icon">
                <Icon sx={{ fontSize: 20 }} />
              </span>
              <span style={{
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 200,
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, max-width 0.2s ease',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
          )

          return isCollapsed ? (
            <Tooltip key={id} title={label} placement="right">
              {item}
            </Tooltip>
          ) : (
            <React.Fragment key={id}>{item}</React.Fragment>
          )
        })}

      <div style={{ flex: 1 }} />

      {/* ── Profil utilisateur ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: isCollapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: isCollapsed ? 4 : 8,
        padding: isCollapsed ? '8px 4px 6px' : '8px 10px',
      }}>
        <Tooltip title={`${fullName}${user?.email ? ' · ' + user.email : ''}`} placement="right">
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#1976d2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff',
            cursor: 'default', flexShrink: 0,
          }}>
            {initials}
          </div>
        </Tooltip>

        <div style={{
          overflow: 'hidden',
          flex: 1,
          minWidth: 0,
          opacity: isCollapsed ? 0 : 1,
          maxWidth: isCollapsed ? 0 : 200,
          transition: 'opacity 0.2s ease, max-width 0.2s ease',
        }}>
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

        <Tooltip title="Se déconnecter" placement="right">
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4,
              transition: 'color 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fc3d39'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
        </Tooltip>
      </div>
    </nav>
  )
}
