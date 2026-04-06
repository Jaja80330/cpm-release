import React, { useState } from 'react'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { changePassword } from '../services/authService'

export default function ForceChangePasswordPage({ onDone }) {
  const [form,    setForm]    = useState({ current: '', newPwd: '', confirm: '' })
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState(null) // null | 'mismatch' | 'short' | 'error'
  const [errMsg,  setErrMsg]  = useState('')

  const handleChange = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setStatus(null)
  }

  const handleSubmit = async () => {
    if (form.newPwd !== form.confirm) { setStatus('mismatch'); return }
    if (form.newPwd.length < 6) { setStatus('short'); return }
    setSaving(true)
    setStatus(null)
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.newPwd })
      onDone()
    } catch (err) {
      const code = err?.response?.status
      const msg  = code === 401
        ? 'Mot de passe actuel incorrect.'
        : (err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour.')
      setErrMsg(msg)
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = form.current && form.newPwd && form.confirm && !saving

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0e11',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#1a1f25',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 32,
      }}>
        {/* Icône + titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'rgba(240,160,48,0.10)',
            border: '1px solid rgba(240,160,48,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#f0a030',
          }}>
            <LockOutlinedIcon sx={{ fontSize: 24 }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
            Changement de mot de passe requis
          </div>
          <div style={{ fontSize: 12, color: '#9aa0a6', lineHeight: 1.55 }}>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe
            avant d'accéder à l'application.
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <TextField
            type="password"
            label="Mot de passe temporaire (actuel)"
            placeholder="••••••••"
            value={form.current}
            onChange={handleChange('current')}
            fullWidth size="small"
          />
          <TextField
            type="password"
            label="Nouveau mot de passe"
            placeholder="••••••••"
            value={form.newPwd}
            onChange={handleChange('newPwd')}
            fullWidth size="small"
          />
          <TextField
            type="password"
            label="Confirmer le nouveau mot de passe"
            placeholder="••••••••"
            value={form.confirm}
            onChange={handleChange('confirm')}
            onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            fullWidth size="small"
          />
        </div>

        {status === 'mismatch' && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
            Le nouveau mot de passe et la confirmation ne correspondent pas.
          </Alert>
        )}
        {status === 'short' && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
            Le mot de passe doit contenir au moins 6 caractères.
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>{errMsg}</Alert>
        )}

        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <LockOutlinedIcon />}
          onClick={handleSubmit}
          disabled={!canSubmit}
          fullWidth
          sx={{ mt: 0.5 }}
        >
          Définir le nouveau mot de passe
        </Button>
      </div>
    </div>
  )
}
