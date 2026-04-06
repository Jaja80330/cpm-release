import React, { useState, useEffect } from 'react'
import { Button, Input, Label, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components'
import {
  bundleIcon,
  PlugConnectedRegular, PlugConnectedFilled,
  SaveRegular, SaveFilled,
  FolderRegular, FolderFilled,
  InfoRegular, InfoFilled,
  ProhibitedRegular, ProhibitedFilled,
  CheckmarkRegular, CheckmarkFilled,
  DismissRegular, DismissFilled,
  WeatherSunnyRegular, WeatherSunnyFilled,
  WeatherMoonRegular, WeatherMoonFilled,
  DesktopRegular, DesktopFilled,
  PersonRegular, PersonFilled,
  LockClosedRegular, LockClosedFilled,
  KeyRegular, KeyFilled,
  ClipboardRegular, ClipboardFilled,
  ShieldRegular, ShieldFilled,
} from '@fluentui/react-icons'
import { updateProfile, changePassword } from '../services/authService'

const ThemeSunIcon   = bundleIcon(WeatherSunnyFilled,    WeatherSunnyRegular)
const ThemeMoonIcon  = bundleIcon(WeatherMoonFilled,     WeatherMoonRegular)
const ThemeSysIcon   = bundleIcon(DesktopFilled,         DesktopRegular)
const PersonIcon     = bundleIcon(PersonFilled,          PersonRegular)
const LockIcon       = bundleIcon(LockClosedFilled,      LockClosedRegular)
const ConnectIcon    = bundleIcon(PlugConnectedFilled,   PlugConnectedRegular)
const SaveIcon       = bundleIcon(SaveFilled,            SaveRegular)
const FolderIcon     = bundleIcon(FolderFilled,          FolderRegular)
const InfoIcon       = bundleIcon(InfoFilled,            InfoRegular)
const ProhibitIcon   = bundleIcon(ProhibitedFilled,      ProhibitedRegular)
const OkIcon         = bundleIcon(CheckmarkFilled,       CheckmarkRegular)
const ErrIcon        = bundleIcon(DismissFilled,         DismissRegular)
const KeyIcon        = bundleIcon(KeyFilled,             KeyRegular)
const ClipboardIcon  = bundleIcon(ClipboardFilled,       ClipboardRegular)
const ShieldIcon     = bundleIcon(ShieldFilled,          ShieldRegular)

const SFTP_HOST = '158.220.90.1'
const SFTP_PORT = 22
const SFTP_USER = 'root'

const FieldLabel = ({ children }) => (
  <Label style={{ color: '#d1d1d1', fontSize: 12, display: 'block', marginBottom: 6 }}>
    {children}
  </Label>
)

const BtnSecondary = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '0 14px', height: '100%', minHeight: 32,
    background: 'rgba(255,255,255,0.06)', border: '1px solid #3d3d3d',
    color: disabled ? '#6d6d6d' : '#d1d1d1', borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12,
    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
  }}>
    {children}
  </button>
)

const THEME_OPTIONS = [
  { id: 'system', label: 'Système', desc: 'Suit Windows',    Icon: ThemeSysIcon  },
  { id: 'dark',   label: 'Sombre',  desc: 'Toujours sombre', Icon: ThemeMoonIcon },
  { id: 'light',  label: 'Clair',   desc: 'Toujours clair',  Icon: ThemeSunIcon  }
]

export default function SettingsPage({ onThemeChange, user, onUserChange }) {
  const [settings, setSettings] = useState({
    omsiPath: '', omsiValid: false,
    theme: 'system'
  })
  const [saved,        setSaved]        = useState(false)
  const [testing,      setTesting]      = useState(false)
  const [testResult,   setTestResult]   = useState(null)
  const [omsiChecking, setOmsiChecking] = useState(false)

  // Profil utilisateur
  const [profile,       setProfile]       = useState({ firstName: '', lastName: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileError,  setProfileError]  = useState('')

  // Changement de mot de passe
  const [pwdForm,   setPwdForm]   = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdStatus, setPwdStatus] = useState(null)
  const [pwdError,  setPwdError]  = useState('')

  // Clé SSH Cinnamon
  const [sshKeyExists,   setSshKeyExists]   = useState(false)
  const [generatingKey,  setGeneratingKey]  = useState(false)
  const [generateResult, setGenerateResult] = useState(null) // null | 'ok' | 'error'
  const [generateError,  setGenerateError]  = useState('')
  const [pubKeyModal,    setPubKeyModal]    = useState(false)
  const [pubKeyContent,  setPubKeyContent]  = useState('')
  const [copySuccess,    setCopySuccess]    = useState(false)

  useEffect(() => {
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
  const handleProfileChange = (key) => (_, { value } = {}) => {
    setProfile(p => ({ ...p, [key]: value ?? '' }))
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
      setProfileError(err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde.')
      setProfileStatus('error')
    } finally { setProfileSaving(false) }
  }

  // ── Mot de passe ─────────────────────────────────────────────────────────
  const handlePwdChange = (key) => (_, { value } = {}) => {
    setPwdForm(f => ({ ...f, [key]: value ?? '' }))
    setPwdStatus(null)
  }

  const savePassword = async () => {
    if (pwdForm.newPwd !== pwdForm.confirm) { setPwdStatus('mismatch'); return }
    if (pwdForm.newPwd.length < 6) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
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
      setPwdError(status === 401 ? 'Mot de passe actuel incorrect.' : (serverMsg || err?.message || 'Erreur lors de la mise à jour.'))
      setPwdStatus('error')
    } finally { setPwdSaving(false) }
  }

  // ── Paramètres généraux ──────────────────────────────────────────────────
  const handleChange   = (key) => (e) => {
    const val = typeof e === 'string' ? e : e.target.value
    setSettings(s => ({ ...s, [key]: val })); setSaved(false)
  }

  const handleThemeChange = (themeId) => {
    setSettings(s => ({ ...s, theme: themeId }))
    onThemeChange?.(themeId); setSaved(false)
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
      setGenerateError(result.error || 'Erreur inconnue')
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

  // Test connexion
  const testConnection = async () => {
    setTesting(true); setTestResult(null)
    const result = await window.api.sftp.test({})
    setTestResult(result); setTesting(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Paramètres</div>
        <div className="page-subtitle">Configuration globale de Cinnamon</div>
      </div>

      {/* ── Modale clé publique ─────────────────────────────────────────── */}
      {pubKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => { if (e.target === e.currentTarget) setPubKeyModal(false) }}>
          <div style={{ background: '#252525', border: '1px solid #3d3d3d', borderRadius: 10,
            width: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #333',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyIcon fontSize={16} style={{ color: '#60cdff' }} /> Clé publique SSH Cinnamon
                </div>
                <div style={{ fontSize: 11, color: '#6d6d6d', marginTop: 4 }}>
                  Fichier : <code style={{ fontFamily: 'monospace', color: '#9d9d9d' }}>cinnamon_vault.pub</code>
                  {' '}— Ajoutez cette clé dans <code style={{ fontFamily: 'monospace', color: '#9d9d9d' }}>~/.ssh/authorized_keys</code> de votre serveur.
                </div>
              </div>
              <button onClick={() => setPubKeyModal(false)}
                style={{ background: 'none', border: 'none', color: '#6d6d6d',
                  cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <pre style={{
                fontSize: 11, color: '#b0b0b0', fontFamily: "'Cascadia Code', 'Consolas', monospace",
                background: '#1a1a1a', padding: '14px 16px', borderRadius: 6,
                wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0,
                border: '1px solid #2d2d2d', lineHeight: 1.6
              }}>
                {pubKeyContent}
              </pre>
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 5,
                background: 'rgba(108,203,95,0.06)', border: '1px solid rgba(108,203,95,0.15)',
                fontSize: 11, color: '#6ccb5f', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <ShieldIcon fontSize={13} style={{ flexShrink: 0, marginTop: 1 }} />
                Cette clé est unique à Cinnamon et n'affecte pas vos autres clés SSH.
                La clé privée ne quitte jamais votre machine.
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #333',
              display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button appearance="secondary" onClick={() => setPubKeyModal(false)}>Fermer</Button>
              <Button
                appearance="primary"
                icon={copySuccess ? <OkIcon /> : <ClipboardIcon />}
                onClick={copyToClipboard}
                style={copySuccess ? { background: '#6ccb5f', borderColor: 'transparent' } : {}}>
                {copySuccess ? 'Copié !' : 'Copier dans le presse-papier'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mon profil ──────────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><PersonIcon fontSize={16} /> Mon profil</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <FieldLabel>Prénom</FieldLabel>
            <Input value={profile.firstName} onChange={handleProfileChange('firstName')}
              placeholder="Jean" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Nom</FieldLabel>
            <Input value={profile.lastName} onChange={handleProfileChange('lastName')}
              placeholder="Dupont" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Téléphone</FieldLabel>
          <Input value={profile.phone} onChange={handleProfileChange('phone')}
            placeholder="+33 6 00 00 00 00" style={{ width: '100%', maxWidth: 280 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button appearance="primary"
            icon={profileSaving ? <Spinner size="tiny" /> : <SaveIcon />}
            onClick={saveProfile} disabled={profileSaving}>
            {profileStatus === 'ok' ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </Button>
          {profileStatus === 'error' && (
            <MessageBar intent="error" style={{ borderRadius: 6 }}>
              <MessageBarBody style={{ fontSize: 12 }}>{profileError}</MessageBarBody>
            </MessageBar>
          )}
        </div>
      </div>

      {/* ── Sécurité / Mot de passe ─────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><LockIcon fontSize={16} /> Sécurité — Changer le mot de passe</div>
        <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
          <div>
            <FieldLabel>Mot de passe actuel</FieldLabel>
            <Input type="password" value={pwdForm.current} onChange={handlePwdChange('current')}
              placeholder="••••••••" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Nouveau mot de passe</FieldLabel>
            <Input type="password" value={pwdForm.newPwd} onChange={handlePwdChange('newPwd')}
              placeholder="••••••••" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Confirmer le nouveau mot de passe</FieldLabel>
            <Input type="password" value={pwdForm.confirm} onChange={handlePwdChange('confirm')}
              placeholder="••••••••" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button appearance="primary"
            icon={pwdSaving ? <Spinner size="tiny" /> : <LockIcon />}
            onClick={savePassword}
            disabled={pwdSaving || !pwdForm.current || !pwdForm.newPwd || !pwdForm.confirm}>
            {pwdStatus === 'ok' ? 'Mis à jour ✓' : 'Mettre à jour le mot de passe'}
          </Button>
        </div>
        {pwdStatus === 'ok' && (
          <MessageBar intent="success" style={{ borderRadius: 6, marginTop: 12 }}>
            <MessageBarBody style={{ fontSize: 12 }}>Mot de passe mis à jour avec succès.</MessageBarBody>
          </MessageBar>
        )}
        {pwdStatus === 'mismatch' && (
          <MessageBar intent="warning" style={{ borderRadius: 6, marginTop: 12 }}>
            <MessageBarBody style={{ fontSize: 12 }}>Les mots de passe ne correspondent pas.</MessageBarBody>
          </MessageBar>
        )}
        {pwdStatus === 'error' && (
          <MessageBar intent="error" style={{ borderRadius: 6, marginTop: 12 }}>
            <MessageBarBody style={{ fontSize: 12 }}>{pwdError}</MessageBarBody>
          </MessageBar>
        )}
      </div>

      {/* ── Thème ────────────────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><ThemeSysIcon fontSize={16} /> Thème de l'application</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEME_OPTIONS.map(({ id, label, desc, Icon }) => {
            const active = (settings.theme || 'system') === id
            return (
              <div key={id} onClick={() => handleThemeChange(id)} style={{
                padding: '12px 18px', borderRadius: 6, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--colorBrandBackground)' : 'var(--colorNeutralStroke2)'}`,
                background: active ? 'var(--colorBrandBackground2)' : 'transparent',
                color: active ? 'var(--colorBrandForeground2)' : 'var(--colorNeutralForeground2)',
                transition: 'all 0.12s', minWidth: 110, userSelect: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon fontSize={16} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--colorNeutralForeground4)' }}>
          Le thème s'applique instantanément. Il sera sauvegardé avec les autres paramètres.
        </div>
      </div>

      {/* ── OMSI ─────────────────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><FolderIcon fontSize={16} /> Répertoire OMSI 2 (global)</div>
        <div style={{ fontSize: 12, color: '#9d9d9d', marginBottom: 12 }}>
          Ce chemin est partagé par tous les projets. OMSI doit y être installé
          (<code style={{ fontFamily: 'monospace', color: '#d1d1d1' }}>Omsi.exe</code> détecté).
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 32 }}>
          <Input value={settings.omsiPath || ''} onChange={handleChange('omsiPath')}
            placeholder="C:\OMSI 2" style={{ flex: 1 }} />
          <BtnSecondary onClick={selectOmsiFolder} disabled={omsiChecking}>
            {omsiChecking ? <Spinner size="tiny" /> : <FolderIcon fontSize={14} />}
            Parcourir &amp; Vérifier
          </BtnSecondary>
        </div>
        {settings.omsiPath && (
          <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            color: settings.omsiValid ? '#6ccb5f' : '#fc3d39' }}>
            {settings.omsiValid
              ? <><OkIcon fontSize={14} /> Omsi.exe détecté — chemin valide</>
              : <><ErrIcon fontSize={14} /> Omsi.exe introuvable — vérifiez le chemin</>
            }
          </div>
        )}
      </div>

      {/* ── Connexion SSH / SFTP ─────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><ConnectIcon fontSize={16} /> Connexion au serveur — SSH / SFTP</div>

        {/* Paramètres constants (lecture seule) */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 18, padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid #3a3a3a', borderRadius: 6 }}>
          {[['Serveur', SFTP_HOST], ['Port', String(SFTP_PORT)], ['Utilisateur', SFTP_USER]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: '#6d6d6d', marginBottom: 2 }}>{k}</div>
              <code style={{ fontSize: 13, color: '#9d9d9d', fontFamily: 'monospace' }}>{v}</code>
            </div>
          ))}
        </div>

        {/* Section clé SSH Cinnamon */}
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Clé SSH Cinnamon</FieldLabel>

          {/* Statut clé */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: sshKeyExists ? '#6ccb5f' : '#fc3d39',
              boxShadow: sshKeyExists ? '0 0 6px #6ccb5f' : '0 0 6px #fc3d39'
            }} />
            <span style={{ fontSize: 13, color: sshKeyExists ? '#6ccb5f' : '#fc3d39', fontWeight: 500 }}>
              {sshKeyExists ? 'Clé Cinnamon présente et active' : 'Aucune clé Cinnamon détectée'}
            </span>
          </div>

          {/* Bouton dynamique */}
          {sshKeyExists ? (
            <Button appearance="secondary" icon={<KeyIcon />} onClick={viewPublicKey}>
              Voir ma clé publique Cinnamon
            </Button>
          ) : (
            <Button
              appearance="primary"
              icon={generatingKey ? <Spinner size="tiny" /> : <KeyIcon />}
              onClick={generateKey}
              disabled={generatingKey}>
              {generatingKey ? 'Génération en cours...' : 'Créer une clé SSH Cinnamon'}
            </Button>
          )}

          {/* Feedback génération */}
          {generateResult === 'ok' && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 5,
              background: 'rgba(108,203,95,0.08)', border: '1px solid rgba(108,203,95,0.25)',
              fontSize: 12, color: '#6ccb5f', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <OkIcon fontSize={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Paire de clés RSA 4096 bits générée avec succès.
                Ajoutez la clé publique à <code style={{ fontFamily: 'monospace' }}>~/.ssh/authorized_keys</code> sur le serveur.
              </span>
            </div>
          )}
          {generateResult === 'error' && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 5,
              background: 'rgba(252,61,57,0.08)', border: '1px solid rgba(252,61,57,0.25)',
              fontSize: 12, color: '#fc3d39' }}>
              Erreur : {generateError}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 11, color: '#6d6d6d', lineHeight: 1.55 }}>
            La clé est stockée dans le dossier de données de Cinnamon.
            Elle est unique à cette application et n'affecte pas vos autres clés SSH.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button appearance="primary" icon={<SaveIcon />} onClick={saveSettings}>
            {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </Button>
          <Button appearance="secondary" icon={<ConnectIcon />}
            onClick={testConnection} disabled={!sshKeyExists || testing}>
            {testing
              ? <><Spinner size="tiny" style={{ marginRight: 8 }} />Test en cours...</>
              : 'Tester la connexion'
            }
          </Button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: 13,
            background: testResult.success ? 'rgba(108,203,95,0.08)' : 'rgba(252,61,57,0.08)',
            border: `1px solid ${testResult.success ? 'rgba(108,203,95,0.25)' : 'rgba(252,61,57,0.25)'}`,
            color: testResult.success ? '#6ccb5f' : '#fc3d39'
          }}>
            {testResult.success
              ? '✓ Connexion SSH établie avec succès !'
              : `✗ Échec : ${testResult.error}`
            }
          </div>
        )}
      </div>

      {/* ── Chemin distant ───────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><InfoIcon fontSize={16} /> Chemin de sauvegarde distant</div>
        <div style={{ fontSize: 13, color: '#9d9d9d', lineHeight: 1.7 }}>
          Les archives ZIP sont déposées dans :{' '}
          <code style={{ background: '#383838', padding: '2px 8px', borderRadius: 4,
            color: '#d1d1d1', fontFamily: "'Cascadia Code', 'Consolas', monospace", fontSize: 12 }}>
            /srv/nerosy/backups/[NomDuProjet]/
          </code>
        </div>
        <div style={{ fontSize: 11, color: '#6d6d6d', marginTop: 6 }}>
          Le dossier est créé automatiquement lors du premier transfert.
        </div>
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><ProhibitIcon fontSize={16} /> Fichiers ignorés</div>
        <div style={{ fontSize: 13, color: '#9d9d9d', marginBottom: 10 }}>
          Ces extensions sont exclues automatiquement lors de l'archivage :
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['.blend', '.psd'].map(ext => (
            <code key={ext} style={{ padding: '4px 12px', background: '#383838',
              border: '1px solid #454545', borderRadius: 4, color: '#d1d1d1', fontSize: 12,
              fontFamily: "'Cascadia Code', 'Consolas', monospace" }}>
              {ext}
            </code>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#6d6d6d', marginTop: 8 }}>
          Fichiers Blender et Photoshop exclus — réduisent la taille de l'archive.
        </div>
      </div>

      {/* ── À propos ─────────────────────────────────────────────────────────── */}
      <div className="w11-card">
        <div className="w11-card-title"><InfoIcon fontSize={16} /> À propos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Application', 'Cinnamon v1.1.0'],
            ['Éditeur',     'NEROSY'],
            ['Framework',   'Electron + React'],
            ['UI',          'Fluent UI v9 (webDarkTheme)'],
            ['Transfert',   'SSH2 / SFTP'],
            ['Archivage',   'archiver (streams)']
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '7px 0', borderBottom: '1px solid #3d3d3d', fontSize: 13 }}>
              <span style={{ color: '#9d9d9d' }}>{k}</span>
              <span style={{ color: '#d1d1d1' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
