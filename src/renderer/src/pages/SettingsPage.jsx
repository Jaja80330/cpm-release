import React, { useState, useEffect } from 'react'
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
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined'
import { updateProfile, changePassword } from '../services/authService'

const SFTP_HOST = '158.220.90.1'
const SFTP_PORT = 22
const SFTP_USER = 'root'

const THEME_OPTIONS = [
  { id: 'system', label: 'Système', desc: 'Suit Windows',    Icon: DesktopWindowsOutlinedIcon },
  { id: 'dark',   label: 'Sombre',  desc: 'Toujours sombre', Icon: DarkModeOutlinedIcon       },
  { id: 'light',  label: 'Clair',   desc: 'Toujours clair',  Icon: LightModeOutlinedIcon      }
]

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

function SecBtn({ onClick, disabled, children }) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={onClick}
      disabled={disabled}
      sx={{ fontSize: 12, whiteSpace: 'nowrap' }}
    >
      {children}
    </Button>
  )
}

export default function SettingsPage({ onThemeChange, user, onUserChange }) {
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
      setProfileError(err?.response?.data?.message || err?.message || 'Erreur lors de la sauvegarde.')
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
  const handleChange = (key) => (e) => {
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

      {/* Modale clé publique */}
      {pubKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => { if (e.target === e.currentTarget) setPubKeyModal(false) }}>
          <div style={{ background: '#1e2328', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
            width: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)', overflow: 'hidden' }}>

            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyOutlinedIcon sx={{ fontSize: 15, color: '#42a5f5' }} /> Clé publique SSH Cinnamon
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  Fichier : <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>cinnamon_vault.pub</code>
                  {' '}— Ajoutez cette clé dans <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>~/.ssh/authorized_keys</code> de votre serveur.
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
                fontSize: 11, color: '#b0b0b0', fontFamily: "'Cascadia Code', 'Consolas', monospace",
                background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: 6,
                wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0,
                border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.6
              }}>
                {pubKeyContent}
              </pre>
              <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 5,
                background: 'rgba(108,203,95,0.06)', border: '1px solid rgba(108,203,95,0.15)',
                fontSize: 11, color: '#6ccb5f', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <SecurityOutlinedIcon sx={{ fontSize: 13, flexShrink: 0, mt: 0.1 }} />
                Cette clé est unique à Cinnamon et n'affecte pas vos autres clés SSH.
                La clé privée ne quitte jamais votre machine.
              </div>
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="outlined" size="small" onClick={() => setPubKeyModal(false)}>Fermer</Button>
              <Button
                variant="contained"
                size="small"
                startIcon={copySuccess ? <CheckCircleOutlinedIcon /> : <ContentCopyOutlinedIcon />}
                onClick={copyToClipboard}
                sx={copySuccess ? { background: '#3d7a32' } : {}}>
                {copySuccess ? 'Copié !' : 'Copier dans le presse-papier'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mon profil */}
      <SectionCard title="Mon profil" icon={PersonOutlinedIcon}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <TextField label="Prénom" value={profile.firstName}
            onChange={handleProfileChange('firstName')} placeholder="Jean" size="small" fullWidth />
          <TextField label="Nom" value={profile.lastName}
            onChange={handleProfileChange('lastName')} placeholder="Dupont" size="small" fullWidth />
        </div>
        <div style={{ marginBottom: 14 }}>
          <TextField label="Téléphone" value={profile.phone}
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
            {profileStatus === 'ok' ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </Button>
          {profileStatus === 'error' && (
            <Alert severity="error" sx={{ fontSize: 12, py: 0.3 }}>{profileError}</Alert>
          )}
        </div>
      </SectionCard>

      {/* Sécurité / Mot de passe */}
      <SectionCard title="Sécurité — Changer le mot de passe" icon={LockOutlinedIcon}>
        <div style={{ display: 'grid', gap: 10, maxWidth: 360 }}>
          <TextField type="password" label="Mot de passe actuel"
            value={pwdForm.current} onChange={handlePwdChange('current')}
            placeholder="••••••••" size="small" fullWidth />
          <TextField type="password" label="Nouveau mot de passe"
            value={pwdForm.newPwd} onChange={handlePwdChange('newPwd')}
            placeholder="••••••••" size="small" fullWidth />
          <TextField type="password" label="Confirmer le nouveau mot de passe"
            value={pwdForm.confirm} onChange={handlePwdChange('confirm')}
            placeholder="••••••••" size="small" fullWidth />
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={pwdSaving ? <CircularProgress size={13} color="inherit" /> : <LockOutlinedIcon />}
            onClick={savePassword}
            disabled={pwdSaving || !pwdForm.current || !pwdForm.newPwd || !pwdForm.confirm}
          >
            {pwdStatus === 'ok' ? 'Mis à jour ✓' : 'Mettre à jour le mot de passe'}
          </Button>
        </div>
        {pwdStatus === 'ok' && <Alert severity="success" sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>Mot de passe mis à jour avec succès.</Alert>}
        {pwdStatus === 'mismatch' && <Alert severity="warning" sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>Les mots de passe ne correspondent pas.</Alert>}
        {pwdStatus === 'error' && <Alert severity="error" sx={{ fontSize: 12, py: 0.3, mt: 1.2 }}>{pwdError}</Alert>}
      </SectionCard>

      {/* Thème */}
      <SectionCard title="Thème de l'application" icon={DesktopWindowsOutlinedIcon}>
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
          Le thème s'applique instantanément. Il sera sauvegardé avec les autres paramètres.
        </div>
      </SectionCard>

      {/* OMSI */}
      <SectionCard title="Répertoire OMSI 2 (global)" icon={FolderOutlinedIcon}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Ce chemin est partagé par tous les projets. OMSI doit y être installé
          (<code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>Omsi.exe</code> détecté).
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
            Parcourir &amp; Vérifier
          </Button>
        </div>
        {settings.omsiPath && (
          <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
            color: settings.omsiValid ? '#6ccb5f' : '#fc3d39' }}>
            {settings.omsiValid
              ? <><CheckCircleOutlinedIcon sx={{ fontSize: 13 }} /> Omsi.exe détecté — chemin valide</>
              : <><CancelOutlinedIcon sx={{ fontSize: 13 }} /> Omsi.exe introuvable — vérifiez le chemin</>
            }
          </div>
        )}
      </SectionCard>

      {/* Connexion SSH / SFTP */}
      <SectionCard title="Connexion au serveur — SSH / SFTP" icon={CableOutlinedIcon}>
        {/* Paramètres constants */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
          {[['Serveur', SFTP_HOST], ['Port', String(SFTP_PORT)], ['Utilisateur', SFTP_USER]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <code style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{v}</code>
            </div>
          ))}
        </div>

        {/* Clé SSH */}
        <div style={{ marginBottom: 18 }}>
          <FL>Clé SSH Cinnamon</FL>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: sshKeyExists ? '#6ccb5f' : '#fc3d39',
              boxShadow: sshKeyExists ? '0 0 6px #6ccb5f' : '0 0 6px #fc3d39'
            }} />
            <span style={{ fontSize: 13, color: sshKeyExists ? '#6ccb5f' : '#fc3d39', fontWeight: 500 }}>
              {sshKeyExists ? 'Clé Cinnamon présente et active' : 'Aucune clé Cinnamon détectée'}
            </span>
          </div>

          {sshKeyExists ? (
            <Button variant="outlined" size="small" startIcon={<KeyOutlinedIcon />} onClick={viewPublicKey}>
              Voir ma clé publique Cinnamon
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              startIcon={generatingKey ? <CircularProgress size={13} color="inherit" /> : <KeyOutlinedIcon />}
              onClick={generateKey}
              disabled={generatingKey}
            >
              {generatingKey ? 'Génération en cours...' : 'Créer une clé SSH Cinnamon'}
            </Button>
          )}

          {generateResult === 'ok' && (
            <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 5,
              background: 'rgba(108,203,95,0.07)', border: '1px solid rgba(108,203,95,0.2)',
              fontSize: 12, color: '#6ccb5f', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 13, flexShrink: 0, mt: 0.1 }} />
              <span>
                Paire de clés RSA 4096 bits générée avec succès.
                Ajoutez la clé publique à <code style={{ fontFamily: 'monospace' }}>~/.ssh/authorized_keys</code> sur le serveur.
              </span>
            </div>
          )}
          {generateResult === 'error' && (
            <Alert severity="error" sx={{ mt: 1, fontSize: 12, py: 0.3 }}>Erreur : {generateError}</Alert>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            La clé est stockée dans le dossier de données de Cinnamon.
            Elle est unique à cette application et n'affecte pas vos autres clés SSH.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveOutlinedIcon />}
            onClick={saveSettings}
          >
            {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={testing ? <CircularProgress size={13} /> : <CableOutlinedIcon />}
            onClick={testConnection}
            disabled={!sshKeyExists || testing}
          >
            {testing ? 'Test en cours...' : 'Tester la connexion'}
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
              ? '✓ Connexion SSH établie avec succès !'
              : `✗ Échec : ${testResult.error}`
            }
          </div>
        )}
      </SectionCard>

      {/* Chemin distant */}
      <SectionCard title="Chemin de sauvegarde distant" icon={InfoOutlinedIcon}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Les archives ZIP sont déposées dans :{' '}
          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4,
            color: 'var(--text-primary)', fontFamily: "'Cascadia Code', 'Consolas', monospace", fontSize: 12 }}>
            /srv/nerosy/backups/[NomDuProjet]/
          </code>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
          Le dossier est créé automatiquement lors du premier transfert.
        </div>
      </SectionCard>

      {/* Fichiers ignorés */}
      <SectionCard title="Fichiers ignorés" icon={BlockOutlinedIcon}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Ces extensions sont exclues automatiquement lors de l'archivage :
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
          Fichiers Blender et Photoshop exclus — réduisent la taille de l'archive.
        </div>
      </SectionCard>

      {/* À propos */}
      <SectionCard title="À propos" icon={InfoOutlinedIcon}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Application', 'Cinnamon v1.1.0'],
            ['Éditeur',     'NEROSY'],
            ['Framework',   'Electron + React'],
            ['UI',          'Material UI v5 (Dark)'],
            ['Transfert',   'SSH2 / SFTP'],
            ['Archivage',   'archiver (streams)']
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
