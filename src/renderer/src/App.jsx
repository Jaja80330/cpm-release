import React, { useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { muiDarkTheme } from './theme'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import SettingsPage from './pages/SettingsPage'
import LoginView from './pages/LoginView'
import UsersPage from './pages/UsersPage'
import ToolsPage from './pages/ToolsPage'
import ForceChangePasswordPage from './pages/ForceChangePasswordPage'
import { setAuthToken, getProfile } from './services/authService'

const TOKEN_KEY   = 'authToken'
const PROFILE_KEY = 'userProfile'

function extractUser(data) {
  const u = data?.user || data || {}
  return {
    id:                u.id                || u._id              || null,
    firstName:         u.firstName         || u.first_name        || '',
    lastName:          u.lastName          || u.last_name         || '',
    email:             u.email             || '',
    phone:             u.phone             || u.phoneNumber       || '',
    role:              u.role              || 'user',
    mustChangePassword: !!(u.must_change_password || u.mustChangePassword),
  }
}

export default function App() {
  const [currentPage,      setCurrentPage]      = useState('home')
  const [activeProject,    setActiveProject]    = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auth
  const [token,       setToken]       = useState(null)
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Thème : 'system' | 'dark' | 'light'
  const [themePref,  setThemePref]  = useState('system')
  const [systemDark, setSystemDark] = useState(false)

  // ── Initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [s, savedToken, savedProfile] = await Promise.all([
        window.api.settings.get(),
        window.api.store.get(TOKEN_KEY),
        window.api.store.get(PROFILE_KEY)
      ])
      setThemePref(s?.theme || 'system')

      if (savedToken) {
        setAuthToken(savedToken)
        try {
          const fresh = await getProfile()
          const profile = extractUser(fresh)
          await window.api.store.set(PROFILE_KEY, profile)
          setToken(savedToken)
          setUser(profile)
          setCurrentPage('home')
        } catch {
          await Promise.all([
            window.api.store.delete(TOKEN_KEY),
            window.api.store.delete(PROFILE_KEY)
          ])
          setAuthToken(null)
        }
      }
      setAuthLoading(false)
    }
    init()

    window.api.nativeTheme.isDark().then(setSystemDark)
    window.api.nativeTheme.onChange(setSystemDark)
    return () => window.api.nativeTheme.offChange()
  }, [])

  const isDark = themePref === 'dark' || (themePref === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // ── Auth ────────────────────────────────────────────────────────────────
  const handleLoginSuccess = async (newToken, data, staySignedIn) => {
    const profile = extractUser(data)
    if (staySignedIn) {
      await Promise.all([
        window.api.store.set(TOKEN_KEY, newToken),
        window.api.store.set(PROFILE_KEY, profile)
      ])
    } else {
      await Promise.all([
        window.api.store.delete(TOKEN_KEY),
        window.api.store.delete(PROFILE_KEY)
      ])
    }
    setAuthToken(newToken)
    setToken(newToken)
    setUser(profile)
    setCurrentPage('home')
  }

  const handleLogout = async () => {
    await Promise.all([
      window.api.store.delete(TOKEN_KEY),
      window.api.store.delete(PROFILE_KEY)
    ])
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setCurrentPage('home')
  }

  // ── Navigation ──────────────────────────────────────────────────────────
  const navigate = (page, project = null) => {
    setCurrentPage(page)
    if (project) setActiveProject(project)
    if (page !== 'project-detail') setActiveProject(null)
  }

  const sidebarPage = currentPage === 'project-detail' ? 'projects' : currentPage

  const renderPage = () => {
    switch (currentPage) {
      case 'home':           return <HomePage onNavigate={navigate} />
      case 'projects':       return <ProjectsPage onNavigate={navigate} user={user} />
      case 'project-detail': return <ProjectDetailPage project={activeProject} onNavigate={navigate} user={user} />
      case 'settings':       return <SettingsPage onThemeChange={setThemePref} onLogout={handleLogout} user={user} onUserChange={setUser} />
      case 'users':          return <UsersPage currentUser={user} />
      case 'tools':          return <ToolsPage user={user} />
      default:               return <HomePage onNavigate={navigate} />
    }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <ThemeProvider theme={muiDarkTheme}>
        <CssBaseline />
        <Box sx={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0b0e11' }}>
          <CircularProgress size={32} />
        </Box>
      </ThemeProvider>
    )
  }

  if (!token) {
    return (
      <ThemeProvider theme={muiDarkTheme}>
        <CssBaseline />
        <TitleBar />
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    )
  }

  if (user?.mustChangePassword) {
    const handlePasswordChanged = async () => {
      const updated = { ...user, mustChangePassword: false }
      setUser(updated)
      if (token) await window.api.store.set(PROFILE_KEY, updated)
    }
    return (
      <ThemeProvider theme={muiDarkTheme}>
        <CssBaseline />
        <div className="app-container">
          <TitleBar />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ForceChangePasswordPage onDone={handlePasswordChanged} />
          </div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={muiDarkTheme}>
      <CssBaseline />
      <div className="app-container">
        <TitleBar />
        <div className="main-layout">
          <Sidebar
            currentPage={sidebarPage}
            onNavigate={navigate}
            user={user}
            onLogout={handleLogout}
            isDark={isDark}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          />
          <main className="content-area">
            {renderPage()}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
