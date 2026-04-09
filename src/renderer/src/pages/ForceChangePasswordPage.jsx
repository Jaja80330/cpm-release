import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { changePassword } from '../services/authService'

export default function ForceChangePasswordPage({ onDone }) {
  const { t } = useTranslation()
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
        ? t('changePassword.wrongCurrent')
        : (err?.response?.data?.message || err?.message || t('common.error'))
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
            {t('changePassword.title')}
          </div>
          <div style={{ fontSize: 12, color: '#9aa0a6', lineHeight: 1.55 }}>
            {t('changePassword.subtitle')}
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <TextField
            type="password"
            label={t('changePassword.currentPassword')}
            placeholder={t('common.placeholder_password')}
            value={form.current}
            onChange={handleChange('current')}
            fullWidth size="small"
          />
          <TextField
            type="password"
            label={t('changePassword.newPassword')}
            placeholder={t('common.placeholder_password')}
            value={form.newPwd}
            onChange={handleChange('newPwd')}
            fullWidth size="small"
          />
          <TextField
            type="password"
            label={t('changePassword.confirmPassword')}
            placeholder={t('common.placeholder_password')}
            value={form.confirm}
            onChange={handleChange('confirm')}
            onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            fullWidth size="small"
          />
        </div>

        {status === 'mismatch' && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
            {t('changePassword.mismatch')}
          </Alert>
        )}
        {status === 'short' && (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12, py: 0.5 }}>
            {t('changePassword.tooShort')}
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
          {t('changePassword.submit')}
        </Button>
      </div>
    </div>
  )
}
