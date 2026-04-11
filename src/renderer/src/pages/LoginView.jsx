import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { login } from '../services/authService'

export default function LoginView({ onLoginSuccess, isDark = true, blockedReason = false }) {
  const { t } = useTranslation()
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPwd,       setShowPwd]       = useState(false)
  const [staySignedIn,  setStaySignedIn]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)
    try {
      const data = await login(email.trim(), password)
      const token = data?.token || data?.access_token || data?.accessToken
      if (!token) throw new Error(t('auth.noToken'))
      onLoginSuccess(token, data, staySignedIn)
    } catch (err) {
      const code = err?.response?.data?.code
      const msg = code === 'ACCOUNT_BLOCKED'
        ? t('auth.accountBlocked')
        : (err?.response?.data?.message
            || err?.response?.data?.error
            || err?.message
            || t('auth.defaultError'))
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      position: 'relative',
      backgroundImage: 'url("./cinnamon_background.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      WebkitAppRegion: 'drag'
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.45)',
        pointerEvents: 'none',
      }} />

      {/* Carte de connexion — glassmorphism */}
      <div style={{
        position: 'relative',
        width: 380,
        background: isDark ? 'rgba(15,19,23,0.70)' : 'rgba(255,255,255,0.85)',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.12)',
        borderRadius: 16,
        padding: '36px 32px 28px',
        boxShadow: isDark ? '0 16px 56px rgba(0,0,0,0.55)' : '0 16px 56px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        WebkitAppRegion: 'no-drag'
      }}>
        {/* Logo + titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="./cinnamon_logo_1.png"
            alt="Cinnamon"
            style={{ width: 140, marginBottom: 16, userSelect: 'none', pointerEvents: 'none' }}
          />
          <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>
            {t('auth.subtitle')}
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            id="cin-email"
            type="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            disabled={loading}
            autoFocus
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' } }}
          />

          <TextField
            id="cin-password"
            type={showPwd ? 'text' : 'password'}
            label={t('auth.password')}
            placeholder={t('common.placeholder_password')}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPwd(v => !v)}
                    edge="end"
                    tabIndex={-1}
                  >
                    {showPwd
                      ? <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
                      : <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                    }
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={staySignedIn}
                onChange={e => setStaySignedIn(e.target.checked)}
                disabled={loading}
                size="small"
              />
            }
            label={<span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>{t('auth.staySignedIn')}</span>}
            style={{ marginTop: -4, marginBottom: -4 }}
          />

          {blockedReason && !error && (
            <Alert severity="error" sx={{ fontSize: 12, py: 0.5 }}>
              {t('auth.accountBlocked')}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ fontSize: 12, py: 0.5 }}>{error}</Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            endIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ArrowForwardIcon />}
            disabled={loading || !email.trim() || !password}
            fullWidth
            sx={{ height: 38, fontWeight: 600, mt: 0.5 }}
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          fontSize: 10, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'
        }}>
          {t('auth.reserved')}
        </div>
      </div>

      {/* Version */}
      <div style={{
        position: 'relative',
        marginTop: 16, fontSize: 10,
        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
        WebkitAppRegion: 'no-drag'
      }}>
        {t('auth.version')}
      </div>
    </div>
  )
}
