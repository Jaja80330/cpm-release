import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import CableOutlinedIcon from '@mui/icons-material/CableOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined'
import DownloadingOutlinedIcon from '@mui/icons-material/DownloadingOutlined'
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import { updateProfile, changePassword } from '../services/authService'

const SFTP_HOST = '158.220.90.1'
const SFTP_PORT = 22
const SFTP_USER = 'root'

// ── Modale de mise à jour ─────────────────────────────────────────────────
function UpdateModal({ state, version, percent, error, onClose }) {
  const busy = state === 'checking' || state === 'downloading' || state === 'downloaded'

  const STATUS = {
    checking:   { color: '#60cdff', label: 'Recherche de mises à jour…'        },
    downloading:{ color: '#60cdff', label: 'Téléchargement en cours…'          },
    downloaded: { color: '#6ccb5f', label: 'Installation en cours…'            },
    'up-to-date':{ color: '#6ccb5f', label: 'Votre application est à jour !'   },
    error:      { color: '#fc3d39', label: 'Une erreur est survenue'            },
    idle:       { color: 'var(--text-muted)', label: ''                         },
  }

  const { color, label } = STATUS[state] || STATUS.idle

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}
      onClick={e => { if (!busy && e.target === e.currentTarget) onClose() }}>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-base)',
        borderRadius: 10, width: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* En-tête */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            <SystemUpdateAltOutlinedIcon sx={{ fontSize: 15, color: '#60cdff' }} />
            Mises à jour
          </div>
          <button onClick={onClose} disabled={busy} style={{
            background: 'none', border: 'none', color: busy ? 'var(--text-muted)' : 'var(--text-secondary)',
            cursor: busy ? 'not-allowed' : 'pointer', fontSize: 16,
            padding: '2px 6px', borderRadius: 4, opacity: busy ? 0.4 : 1
          }}>✕</button>
        </div>

        {/* Corps */}
        <div style={{ padding: '24px 20px' }}>

          {/* Icône centrale */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            {(state === 'checking') && (
              <CircularProgress size={48} thickness={2.5} sx={{ color: '#60cdff' }} />
            )}
            {state === 'downloading' && (
              <DownloadingOutlinedIcon sx={{ fontSize: 48, color: '#60cdff' }} />
            )}
            {state === 'downloaded' && (
              <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#6ccb5f' }} />
            )}
            {state === 'up-to-date' && (
              <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#6ccb5f' }} />
            )}
            {state === 'error' && (
              <ErrorOutlineOutlinedIcon sx={{ fontSize: 48, color: '#fc3d39' }} />
            )}
          </div>

          {/* Label principal */}
          <div style={{
            textAlign: 'center', fontSize: 15, fontWeight: 600,
            color, marginBottom: 6
          }}>
            {label}
          </div>

          {/* Sous-titre contextuel */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, minHeight: 18 }}>
            {state === 'checking'    && 'Connexion au serveur de mises à jour…'}
            {state === 'up-to-date' && version && `Vous utilisez la dernière version (${version})`}
            {state === 'downloading' && version && `Version ${version} disponible`}
            {state === 'downloaded'  && 'L\'application va redémarrer automatiquement'}
            {state === 'error'       && error}
          </div>

          {/* Barre de progression (visible uniquement en téléchargement) */}
          <div style={{
            height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
            overflow: 'hidden', marginBottom: 8,
            opacity: state === 'downloading' ? 1 : 0,
            transition: 'opacity 0.2s'
          }}>
            <div style={{
              height: '100%', borderRadius: 2, background: '#60cdff',
              width: `${percent}%`, transition: 'width 0.3s ease'
            }} />
          </div>
          {state === 'downloading' && (
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
              {Math.round(percent)} %
            </div>
          )}
        </div>

        {/* Pied */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <Button variant="outlined" size="small" onClick={onClose} disabled={busy}>
            {state === 'up-to-date' || state === 'error' ? 'Fermer' : 'Annuler'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="w11-card">
      <div className="w11-card-title">
        {Icon && <Icon sx={{ fontSize: 14 }} />}
        {title}
      </div>
      {children}
    </div>
  )
}

function FL({ children }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
      {children}
    </div>
  )
}

export default function SettingsPage({ onThemeChange, onLangChange, user, onUserChange }) {
  const { t, i18n } = useTranslation()

  const THEME_OPTIONS = [
    { id: 'system', label: t('settings.themeSystem'), desc: t('settings.themeSystemSub'), Icon: DesktopWindowsOutlinedIcon },
    { id: 'dark',   label: t('settings.themeDark'),   desc: t('settings.themeDarkSub'),   Icon: DarkModeOutlinedIcon       },
    { id: 'light',  label: t('settings.themeLight'),  desc: t('settings.themeLightSub'),  Icon: LightModeOutlinedIcon      }
  ]

  const LANG_OPTIONS = [
    { id: 'fr', label: t('settings.langFr'), flag: '🇫🇷' },
    { id: 'en', label: t('settings.langEn'), flag: '🇬🇧' },
    { id: 'de', label: t('settings.langDe'), flag: '🇩🇪' },
  ]

  const [settings, setSettings] = useState({
    omsiPath: '', omsiValid: false,
    theme: 'system'
  })
  const [saved,        setSaved]        = useState(false)
  const [testing,      setTesting]      = useState(false)
  const [testResult,   setTestResult]   = useState(null)
  const [omsiChecking, setOmsiChecking] = useState(false)

  const [profile,       setProfile]       = useState({ firstName: '', lastName: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileError,  setProfileError]  = useState('')

  const [pwdForm,   setPwdForm]   = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdStatus, setPwdStatus] = useState(null)
  const [pwdError,  setPwdError]  = useState('')

  const [sshKeyExists,   setSshKeyExists]   = useState(false)
  const [generatingKey,  setGeneratingKey]  = useState(false)
  const [generateResult, setGenerateResult] = useState(null)
  const [generateError,  setGenerateError]  = useState('')
  const [pubKeyModal,    setPubKeyModal]    = useState(false)
  const [pubKeyContent,  setPubKeyContent]  = useState('')
  const [copySuccess,    setCopySuccess]    = useState(false)
  const [appVersion,     setAppVersion]     = useState('…')

  // ── Mise à jour ───────────────────────────────────────────────────────────
  // state: idle | checking | downloading | downloaded | up-to-date | error
  const [updateState,   setUpdateState]   = useState('idle')
  const [updateVersion, setUpdateVersion] = useState(null)
  const [updatePercent, setUpdatePercent] = useState(0)
  const [updateError,   setUpdateError]   = useState('')
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  useEffect(() => {
    window.api.updater.onStatus(({ state, version, percent, error }) => {
      setUpdateState(state)
      if (version !== undefined) setUpdateVersion(version)
      if (percent !== undefined) setUpdatePercent(percent)
      if (error   !== undefined) setUpdateError(error)
    })
    return () => window.api.updater.offStatus()
  }, [])

  const checkForUpdates = useCallback(async () => {
    setUpdateState('checking')
    setUpdateVersion(null)
    setUpdatePercent(0)
    setUpdateError('')
    setShowUpdateModal(true)
    const result = await window.api.updater.check()
    if (!result.success) {
      setUpdateState('error')
      setUpdateError(result.error || 'Erreur inconnue')
    }
  }, [])

  useEffect(() => {
    window.api.app.getVersion().then(setAppVersion)
    window.api.settings.get().then(s => {
      if (s && Object.keys(s).length > 0) {
        setSettings({ omsiPath: s.omsiPath || '', omsiValid: s.omsiValid || false, theme: s.theme || 'system' })
      }
    })
    window.api.ssh.checkKey().then(setSshKeyExists)
  }, [])

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        phone:     user.phone     || '',
      })
    }
  }, [user])

  // ── Profil ──────────────────────────────────────────────────────────────
  const handleProfileChange = (key) => (e) => {
    setProfile(p => ({ ...p, [key]: e.target.value }))
    setProfileStatus(null)
  }

  const saveProfile = async () => {
    setProfileSaving(true); setProfileStatus(null)
    try {
      const updated = await updateProfile(profile)
      const raw = updated?.user || updated || {}
      const fromServer = {
        firstName: raw.firstName || raw.first_name  || profile.firstName,
        lastName:  raw.lastName  || raw.last_name   || profile.lastName,
        phone:     raw.phone     || raw.phoneNumber  || profile.phone,
        email:     raw.email     || user?.email      || '',
      }
      const merged = { ...(user || {}), ...fromServer }
      onUserChange?.(merged)
      await window.api.store.set('userProfile', merged)
      setProfileStatus('ok')
      setTimeout(() => setProfileStatus(null), 3000)
    } catch (err) {
      setProfileError(err?.response?.data?.message || err?.message || t('settings.saveError'))
      setProfileStatus('error')
    } finally { setProfileSaving(false) }
  }

  // ── Mot de passe ─────────────────────────────────────────────────────────
  const handlePwdChange = (key) => (e) => {
    setPwdForm(f => ({ ...f, [key]: e.target.value }))
    setPwdStatus(null)
  }

  const savePassword = async () => {
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdStatus('mismatch'); return }
    if (pwdForm.newPwd.length < 6) {
      setPwdError(t('settings.passwordTooShort'))
      setPwdStatus('error'); return
    }
    setPwdSaving(true); setPwdStatus(null)
    try {
      await changePassword({ currentPassword: pwdForm.current, newPassword: pwdForm.newPwd })
      setPwdForm({ current: '', newPwd: '', confirm: '' })
      setPwdStatus('ok')
      setTimeout(() => setPwdStatus(null), 4000)
    } catch (err) {
      const status = err?.response?.status
      const serverMsg = err?.response?.data?.message
      setPwdError(status === 401 ? t('settings.passwordWrong') : (serverMsg || err?.message || t('settings.saveError')))
      setPwdStatus('error')
    } finally { setPwdSaving(false) }
  }

  // ── Paramètres généraux ──────────────────────────────────────────────────
  const handleChange = (key) => (e) => {
    const val = typeof e === 'string' ? e : e.target.value
    setSettings(s => ({ ...s, [key]: val })); setSaved(false)
  }

  const handleThemeChange = async (themeId) => {
    setSettings(s => ({ ...s, theme: themeId }))
    onThemeChange?.(themeId)
    const current = await window.api.settings.get()
    await window.api.settings.save({ ...current, theme: themeId })
  }

  const saveSettings = async () => {
    await window.api.settings.save(settings)
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const selectOmsiFolder = async () => {
    const folder = await window.api.dialog.selectFolder()
    if (!folder) return
    setOmsiChecking(true)
    const valid = await window.api.omsi.validatePath(folder)
    setSettings(s => ({ ...s, omsiPath: folder, omsiValid: valid }))
    setSaved(false); setOmsiChecking(false)
  }

  // ── Clé SSH Cinnamon ─────────────────────────────────────────────────────
  const generateKey = async () => {
    setGeneratingKey(true); setGenerateResult(null)
    const result = await window.api.ssh.generateKey()
    if (result.success) {
      setSshKeyExists(true)
      setPubKeyContent(result.publicKey)
      setGenerateResult('ok')
      setTimeout(() => setGenerateResult(null), 5000)
    } else {
      setGenerateError(result.error || t('common.error'))
      setGenerateResult('error')
    }
    setGeneratingKey(false)
  }

  const viewPublicKey = async () => {
    const pub = await window.api.ssh.getPublicKey()
    if (pub) { setPubKeyContent(pub); setPubKeyModal(true) }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pubKeyContent)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2500)
    } catch { /* clipboard non disponible */ }
  }

  const testConnection = async () => {
    setTesting(true); setTestResult(null)
    const result = await window.api.sftp.test({})
    setTestResult(result); setTesting(false)
  }

  const currentLang = i18n.language || 'fr'

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">{t('settings.title')}</div>
        <div className="page-subtitle">{t('settings.subtitle')}</div>
      </div>

      {/* Modale mise à jour */}
      {showUpdateModal && (
        <UpdateModal
          state={updateState}
          version={updateVersion}
          percent={updatePercent}
          error={updateError}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Modale clé publique */}
      {pubKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => { if (e.target === e.currentTarget) setPubKeyModal(false) }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-base)', borderRadius: 10,
            width: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)', overflow: 'hidden' }}>

            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyOutlinedIcon sx={{ fontSize: 15, color: '#42a5f5' }} /> {t('settings.pubKeyTitle')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {t('settings.pubKeyDesc')}
                </div>
              </div>
              <button onClick={() => setPubKeyModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              <pre style={{
                fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'Cascadia Code', 'Consolas', monospace",
                background: 'var(--bg-default)', padding: '12px 14px', borderRadius: 6,
                wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0,
                border: '1px solid var(--border-subtle)', lineHeight: 1.6
              }}>
                {pubKeyContent}
              </pre>
              <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 5,
                background: 'rgba(108,203,95,0.06)', border: '1px solid rgba(108,203,95,0.15)',
                fontSize: 11, color: '#6ccb5f', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <SecurityOutlinedIcon sx={{ fontSize: 13, flexShrink: 0, mt: 0.1 }} />
                {t('settings.pubKeyNote')}
              </div>
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)',
              display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" onClick={() => setPubKeyModal(false)}>{t('common.close')}</Button>
              <Button
                variant="contained"
                size="small"
                startIcon={copySuccess ? <CheckCircleOutlinedIcon /> : <ContentCopyOutlinedIcon />}
                onClick={copyToClipboard}
                sx={copySuccess ? { background: '#3d7a32' } : {}}>
                {copySuccess ? t('common.copied') : t('settings.pubKeyCopy')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mon profil */}
      <SectionCard title={t('settings.profile')} icon={PersonOutlinedIcon}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <TextField label={t('settings.firstName')} value={profile.firstName}
            onChange={handleProfileChange('firstName')} placeholder="Jean" size="small" fullWidth />
          <TextField label={t('settings.lastName')} value={profile.lastName}
            onChange={handleProfileChange('lastName')} placeholder="Dupont" size="small" fullWidth />
        </div>
        <div style={{ marginBottom: 14 }}>
          <TextField label={t('settings.phone')} value={profile.phone}
            onChange={handleProfileChange('phone')} placeholder="+33 6 00 00 00 00"
            size="small" style={{ maxWidth: 280 }} fullWidth />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={profileSaving ? <CircularProgress size={13} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={saveProfile}
            disabled={profileSaving}
          >
            {profileStatus === 'ok' ? t('common.saved') : t('common.save')}
          </Button>
          {profileStatus === 'error' && (
            <Alert severity="error" sx={{ fontSize: 12, py: 0.3 }}>{profileError}</Alert>
          )}
        </div>
      </SectionCard>

      {/* Sécurité / Mot de passe */}
      <SectionCard title={t('settings.security')} icon={LockOutlinedIcon}>
        <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
          <TextField type="password" label={t('settings.currentPassword')}
            value={pwdForm.current} onChange={handlePwdChange('current')}
            placeholder={t('common.placeholder_password')} size="small" fullWidth />
          <TextField type="password" label={t('settings.newPassword')}
            value={pwdForm.newPwd} onChange={handlePwdChange('newPwd')}
            placeholder={t('common.placeholder_password')} size="small" fullWidth />
          <TextField type="password" label={t('settings.confirmPassword')}
            value={pwdForm.confirm} onChange={handlePwdChange('confirm')}
            placeholder={t('common.placeholder_password')} size="small" fullWidth />
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={pwdSaving ? <CircularProgress size={13} color="inherit" /> : <LockOutlinedIcon />}
            onClick={savePassword}
            disabled={pwdSaving || !pwdForm.current || !pwdForm.newPwd || !pwdForm.confirm}
          >
            {pwdStatus === 'ok' ? t('common.updated') : t('settings.updatePassword')}
          </Button>
        </div>
        {pwdStatus === 'ok'       && <Alert severity="success" sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>{t('settings.passwordSuccess')}</Alert>}
        {pwdStatus === 'mismatch' && <Alert severity="warning" sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>{t('settings.passwordMismatch')}</Alert>}
        {pwdStatus === 'error'    && <Alert severity="error"   sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>{pwdError}</Alert>}
      </SectionCard>

      {/* Thème */}
      <SectionCard title={t('settings.theme')} icon={DesktopWindowsOutlinedIcon}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEME_OPTIONS.map(({ id, label, desc, Icon }) => {
            const active = (settings.theme || 'system') === id
            return (
              <div key={id} onClick={() => handleThemeChange(id)} style={{
                padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${active ? '#1976d2' : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(25,118,210,0.12)' : 'transparent',
                color: active ? '#42a5f5' : 'var(--text-secondary)',
                transition: 'all 0.12s', minWidth: 100, userSelect: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <Icon sx={{ fontSize: 15 }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {t('settings.themeHint')}
        </div>
      </SectionCard>

      {/* Langue */}
      <SectionCard title={t('settings.language')} icon={LanguageOutlinedIcon}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {LANG_OPTIONS.map(({ id, label, flag }) => {
            const active = currentLang === id
            return (
              <div key={id} onClick={() => onLangChange?.(id)} style={{
                padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${active ? '#1976d2' : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(25,118,210,0.12)' : 'transparent',
                color: active ? '#42a5f5' : 'var(--text-secondary)',
                transition: 'all 0.12s', minWidth: 110, userSelect: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{flag}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {t('settings.languageHint')}
        </div>
      </SectionCard>

      {/* OMSI */}
      <SectionCard title={t('settings.omsiDir')} icon={FolderOutlinedIcon}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          {t('settings.omsiDirHint')}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField
            value={settings.omsiPath || ''}
            onChange={handleChange('omsiPath')}
            placeholder="C:\OMSI 2"
            size="small"
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={omsiChecking ? <CircularProgress size={13} /> : <FolderOutlinedIcon />}
            onClick={selectOmsiFolder}
            disabled={omsiChecking}
          >
            {t('settings.omsiDirBrowse')}
          </Button>
        </div>
        {settings.omsiPath && (
          <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            color: settings.omsiValid ? '#6ccb5f' : '#fc3d39' }}>
            {settings.omsiValid
              ? <><CheckCircleOutlinedIcon sx={{ fontSize: 13 }} /> {t('settings.omsiValid')}</>
              : <><CancelOutlinedIcon sx={{ fontSize: 13 }} /> {t('settings.omsiInvalid')}</>
            }
          </div>
        )}
      </SectionCard>

      {/* Connexion SSH / SFTP */}
      <SectionCard title={t('settings.ssh')} icon={CableOutlinedIcon}>
        {/* Paramètres constants */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
          {[
            [t('settings.server'),  SFTP_HOST],
            [t('settings.port'),    String(SFTP_PORT)],
            [t('settings.sshUser'), SFTP_USER]
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <code style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{v}</code>
            </div>
          ))}
        </div>

        {/* Clé SSH */}
        <div style={{ marginBottom: 18 }}>
          <FL>{t('settings.sshKey')}</FL>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: sshKeyExists ? '#6ccb5f' : '#fc3d39',
              boxShadow: sshKeyExists ? '0 0 6px #6ccb5f' : '0 0 6px #fc3d39'
            }} />
            <span style={{ fontSize: 13, color: sshKeyExists ? '#6ccb5f' : '#fc3d39', fontWeight: 500 }}>
              {sshKeyExists ? t('settings.sshKeyPresent') : t('settings.sshKeyMissing')}
            </span>
          </div>

          {sshKeyExists ? (
            <Button variant="outlined" size="small" startIcon={<KeyOutlinedIcon />} onClick={viewPublicKey}>
              {t('settings.viewPublicKey')}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              startIcon={generatingKey ? <CircularProgress size={13} color="inherit" /> : <KeyOutlinedIcon />}
              onClick={generateKey}
              disabled={generatingKey}
            >
              {generatingKey ? t('settings.generatingKey') : t('settings.generateKey')}
            </Button>
          )}

          {generateResult === 'ok' && (
            <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 5,
              background: 'rgba(108,203,95,0.07)', border: '1px solid rgba(108,203,95,0.2)',
              fontSize: 12, color: '#6ccb5f', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 13, flexShrink: 0, mt: 0.1 }} />
              <span>{t('settings.keyGenSuccess')}</span>
            </div>
          )}
          {generateResult === 'error' && (
            <Alert severity="error" sx={{ mt: 1, fontSize: 12, py: 0.3 }}>{generateError}</Alert>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {t('settings.sshKeyStoredNote')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveOutlinedIcon />}
            onClick={saveSettings}
          >
            {saved ? t('common.saved') : t('settings.saveAll')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={testing ? <CircularProgress size={13} /> : <CableOutlinedIcon />}
            onClick={testConnection}
            disabled={!sshKeyExists || testing}
          >
            {testing ? t('settings.testingConnection') : t('settings.testConnection')}
          </Button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13,
            background: testResult.success ? 'rgba(108,203,95,0.07)' : 'rgba(252,61,57,0.07)',
            border: `1px solid ${testResult.success ? 'rgba(108,203,95,0.25)' : 'rgba(252,61,57,0.25)'}`,
            color: testResult.success ? '#6ccb5f' : '#fc3d39'
          }}>
            {testResult.success
              ? t('settings.testSuccess')
              : t('settings.testFail', { error: testResult.error })
            }
          </div>
        )}
      </SectionCard>

      {/* Chemin distant */}
      <SectionCard title={t('settings.backupPath')} icon={InfoOutlinedIcon}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {t('settings.backupPathDesc')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          {t('settings.backupPathHint')}
        </div>
      </SectionCard>

      {/* Fichiers ignorés */}
      <SectionCard title={t('settings.ignoredFiles')} icon={BlockOutlinedIcon}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          {t('settings.ignoredFilesDesc')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['.blend', '.psd'].map(ext => (
            <code key={ext} style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12,
              fontFamily: "'Cascadia Code', 'Consolas', monospace" }}>
              {ext}
            </code>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          {t('settings.ignoredFilesNote')}
        </div>
      </SectionCard>

      {/* À propos */}
      <SectionCard title={t('settings.about')} icon={InfoOutlinedIcon}>
        <div style={{ marginBottom: 16 }}>
          {[
            [t('settings.aboutApplication'), `Cinnamon v${appVersion}`],
            [t('settings.aboutEditor'),      'NEROSY'],
            [t('settings.aboutFramework'),   'Electron 29 + React 18'],
            [t('settings.aboutUI'),          'Material UI v7'],
            [t('settings.aboutTransfer'),    'SSH2 / SFTP'],
            [t('settings.aboutArchiving'),   'archiver (streams)']
          ].map(([k, v], i, arr) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              fontSize: 13
            }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Bouton mise à jour */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<SystemUpdateAltOutlinedIcon />}
          onClick={checkForUpdates}
          disabled={updateState === 'checking' || updateState === 'downloading' || updateState === 'downloaded'}
        >
          Rechercher des mises à jour
        </Button>
      </SectionCard>
    </div>
  )
}
