import React, { useState } from 'react'
import {
  Button, Checkbox, Input, Label, Spinner,
  MessageBar, MessageBarBody
} from '@fluentui/react-components'
import {
  bundleIcon,
  EyeRegular, EyeFilled,
  EyeOffRegular, EyeOffFilled,
  ArrowRightRegular, ArrowRightFilled
} from '@fluentui/react-icons'
import { login } from '../services/authService'

const EyeIcon    = bundleIcon(EyeFilled,   EyeRegular)
const EyeOffIcon = bundleIcon(EyeOffFilled, EyeOffRegular)
const LoginIcon  = bundleIcon(ArrowRightFilled, ArrowRightRegular)

export default function LoginView({ onLoginSuccess }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
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

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit()
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
        background: 'rgba(0,0,0,0.52)',
        pointerEvents: 'none',
      }} />

      {/* Carte de connexion — glassmorphism */}
      <div style={{
        position: 'relative',
        width: 400,
        background: 'rgba(20,20,20,0.55)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        padding: '40px 36px 32px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        WebkitAppRegion: 'no-drag'
      }}>
        {/* Logo + titre */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="./cinnamon_logo_1.png"
            alt="Cinnamon"
            style={{ width: 150, marginBottom: 18, userSelect: 'none', pointerEvents: 'none' }}
          />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            NEROSY Asset Manager · Connexion
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <Label
              htmlFor="cin-email"
              style={{
                display: 'block', marginBottom: 6,
                fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.75)'
              }}
            >
              Adresse e-mail
            </Label>
            <Input
              id="cin-email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(_, { value }) => { setEmail(value); setError(null) }}
              onKeyDown={handleKey}
              disabled={loading}
              autoFocus
              style={{ width: '100%' }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <Label
              htmlFor="cin-password"
              style={{
                display: 'block', marginBottom: 6,
                fontSize: 12, fontWeight: 600,
                color: 'rgba(255,255,255,0.75)'
              }}
            >
              Mot de passe
            </Label>
            <Input
              id="cin-password"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(_, { value }) => { setPassword(value); setError(null) }}
              onKeyDown={handleKey}
              disabled={loading}
              style={{ width: '100%' }}
              contentAfter={
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--colorNeutralForeground3)',
                    display: 'flex', alignItems: 'center', padding: '0 2px'
                  }}
                  title={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <EyeOffIcon fontSize={16} /> : <EyeIcon fontSize={16} />}
                </button>
              }
            />
          </div>

          {/* Rester connecté */}
          <Checkbox
            label="Rester connecté"
            checked={staySignedIn}
            onChange={(_, { checked }) => setStaySignedIn(!!checked)}
            disabled={loading}
            style={{ marginTop: -4 }}
          />

          {/* Message d'erreur */}
          {error && (
            <MessageBar intent="error" style={{ borderRadius: 6 }}>
              <MessageBarBody style={{ fontSize: 12 }}>{error}</MessageBarBody>
            </MessageBar>
          )}

          {/* Bouton */}
          <Button
            type="submit"
            appearance="primary"
            icon={loading ? <Spinner size="tiny" /> : <LoginIcon />}
            disabled={loading || !email.trim() || !password}
            style={{ width: '100%', height: 36, marginTop: 4, fontWeight: 600 }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 24, textAlign: 'center',
          fontSize: 11, color: 'rgba(255,255,255,0.30)'
        }}>
          Accès réservé aux membres NEROSY
        </div>
      </div>

      {/* Version */}
      <div style={{
        position: 'relative',
        marginTop: 20, fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        WebkitAppRegion: 'no-drag'
      }}>
        Cinnamon v1.0.0
      </div>
    </div>
  )
}
