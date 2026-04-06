import React, { useState } from 'react'
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

export default function LoginView({ onLoginSuccess }) {
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
      if (!token) throw new Error('Aucun token reçu du serveur.')
      onLoginSuccess(token, data, staySignedIn)
    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || err?.message
        || 'Erreur de connexion.'
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
      {/* Overlay sombre */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />

      {/* Carte de connexion — glassmorphism */}
      <div style={{
        position: 'relative',
        width: 380,
        background: 'rgba(15,19,23,0.70)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '36px 32px 28px',
        boxShadow: '0 16px 56px rgba(0,0,0,0.55)',
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
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            NEROSY Asset Manager · Connexion
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            id="cin-email"
            type="email"
            label="Adresse e-mail"
            placeholder="vous@exemple.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            disabled={loading}
            autoFocus
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.05)' } }}
          />

          <TextField
            id="cin-password"
            type={showPwd ? 'text' : 'password'}
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.05)' } }}
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
            label={<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Rester connecté</span>}
            style={{ marginTop: -4, marginBottom: -4 }}
          />

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
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          fontSize: 10, color: 'rgba(255,255,255,0.25)'
        }}>
          Accès réservé aux membres NEROSY
        </div>
      </div>

      {/* Version */}
      <div style={{
        position: 'relative',
        marginTop: 16, fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        WebkitAppRegion: 'no-drag'
      }}>
        Cinnamon v1.1.0
      </div>
    </div>
  )
}
