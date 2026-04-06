import React, { useState } from 'react'
import { Button, Input, Label, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components'
import { bundleIcon, LockClosedRegular, LockClosedFilled } from '@fluentui/react-icons'
import { changePassword } from '../services/authService'

const LockIcon = bundleIcon(LockClosedFilled, LockClosedRegular)

const FL = ({ children }) => (
  <Label style={{ color: 'var(--colorNeutralForeground2)', fontSize: 12, display: 'block', marginBottom: 6 }}>
    {children}
  </Label>
)

export default function ForceChangePasswordPage({ onDone }) {
  const [form,    setForm]    = useState({ current: '', newPwd: '', confirm: '' })
  const [saving,  setSaving]  = useState(false)
  const [status,  setStatus]  = useState(null) // null | 'mismatch' | 'short' | 'error'
  const [errMsg,  setErrMsg]  = useState('')

  const handleChange = (key) => (_, { value } = {}) => {
    setForm(f => ({ ...f, [key]: value ?? '' }))
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
      background: 'var(--colorNeutralBackground2)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--colorNeutralBackground1)',
        border: '1px solid var(--colorNeutralStroke2)',
        borderRadius: 12,
        padding: 32,
      }}>
        {/* Icône + titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'rgba(252,225,0,0.10)',
            border: '1px solid rgba(252,225,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fce100',
          }}>
            <LockIcon fontSize={26} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--colorNeutralForeground1)', marginBottom: 6 }}>
            Changement de mot de passe requis
          </div>
          <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground3)', lineHeight: 1.5 }}>
            Pour des raisons de sécurité, vous devez définir un nouveau mot de passe
            avant d'accéder à l'application.
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          <div>
            <FL>Mot de passe temporaire (actuel)</FL>
            <Input
              type="password"
              value={form.current}
              onChange={handleChange('current')}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <FL>Nouveau mot de passe</FL>
            <Input
              type="password"
              value={form.newPwd}
              onChange={handleChange('newPwd')}
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <FL>Confirmer le nouveau mot de passe</FL>
            <Input
              type="password"
              value={form.confirm}
              onChange={handleChange('confirm')}
              placeholder="••••••••"
              style={{ width: '100%' }}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
            />
          </div>
        </div>

        {/* Feedback */}
        {status === 'mismatch' && (
          <MessageBar intent="warning" style={{ borderRadius: 6, marginBottom: 14 }}>
            <MessageBarBody style={{ fontSize: 12 }}>
              Le nouveau mot de passe et la confirmation ne correspondent pas.
            </MessageBarBody>
          </MessageBar>
        )}
        {status === 'short' && (
          <MessageBar intent="warning" style={{ borderRadius: 6, marginBottom: 14 }}>
            <MessageBarBody style={{ fontSize: 12 }}>
              Le mot de passe doit contenir au moins 6 caractères.
            </MessageBarBody>
          </MessageBar>
        )}
        {status === 'error' && (
          <MessageBar intent="error" style={{ borderRadius: 6, marginBottom: 14 }}>
            <MessageBarBody style={{ fontSize: 12 }}>{errMsg}</MessageBarBody>
          </MessageBar>
        )}

        <Button
          appearance="primary"
          icon={saving ? <Spinner size="tiny" /> : <LockIcon />}
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: '100%' }}
        >
          Définir le nouveau mot de passe
        </Button>
      </div>
    </div>
  )
}
