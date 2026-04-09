import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { usersService } from '../services/usersService'

const ROLE_KEYS = ['user', 'contributor', 'project_manager', 'super_admin']

const EMPTY_FORM = { username: '', firstName: '', lastName: '', email: '', role: 'user' }

export default function UsersPage({ currentUser }) {
  const { t } = useTranslation()
  const ROLE_LABEL_MAP = {
    user:            t('users.roleUser'),
    contributor:     t('users.roleContributor'),
    project_manager: t('users.roleProjectManager'),
    super_admin:     t('users.roleSuperAdmin'),
  }
  const ROLES = ROLE_KEYS.map(v => ({ value: v, label: ROLE_LABEL_MAP[v] }))
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState(null)
  const [generatedPwd, setGeneratedPwd] = useState(null)

  const [deleting,     setDeleting]     = useState(null)
  const [updatingRole, setUpdatingRole] = useState(null)
  const [copied,       setCopied]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await usersService.getAll()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || t('users.loadError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = () => {
    setForm(EMPTY_FORM)
    setCreateError(null)
    setModalOpen(true)
  }

  const handleCreate = async () => {
    if (!form.username)  { setCreateError(t('users.validationUsername')); return }
    if (!form.firstName) { setCreateError(t('users.validationFirstName')); return }
    if (!form.lastName)  { setCreateError(t('users.validationLastName')); return }
    if (!form.email)     { setCreateError(t('users.validationEmail')); return }
    setCreating(true)
    setCreateError(null)
    try {
      const userData = {
        username:   form.username,
        email:      form.email,
        first_name: form.firstName,
        last_name:  form.lastName,
        role:       form.role,
      }
      console.log('Payload Création Utilisateur:', userData)
      const result = await usersService.create(userData)
      setModalOpen(false)
      setGeneratedPwd(result?.temporaryPassword || result?.password || null)
      await load()
    } catch (err) {
      setCreateError(err?.response?.data?.message || err?.message || t('users.createError'))
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (u, newRole) => {
    const prevRole = u.role
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    setUpdatingRole(u.id)
    try {
      console.log(`PATCH /users/${u.id} — { role: '${newRole}' }`)
      await usersService.updateRole(u.id, newRole)
    } catch (err) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: prevRole } : x))
      setLoadError(err?.response?.data?.message || err?.message || t('users.roleError'))
      setTimeout(() => setLoadError(null), 4000)
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return
    setDeleting(id)
    try {
      await usersService.remove(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { /* silencieux */ }
    finally { setDeleting(null) }
  }

  const copyPassword = () => {
    if (!generatedPwd) return
    navigator.clipboard.writeText(generatedPwd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="fade-in">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">{t('users.title')}</div>
          <div className="page-subtitle">{t('users.subtitle')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="text" size="small" startIcon={<RefreshOutlinedIcon />} onClick={load} disabled={loading} />
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openModal}>
            {t('users.create')}
          </Button>
        </div>
      </div>

      {/* Dialog mot de passe temporaire */}
      <Dialog open={!!generatedPwd} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlinedIcon sx={{ color: '#6ccb5f', fontSize: 18 }} />
          {t('users.createSuccess')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            {t('users.tempPasswordMsg')}{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {t('users.tempPasswordWarn')}
            </strong>
          </Typography>
          <Box sx={{
            p: '12px 16px', borderRadius: 2,
            background: 'rgba(108,203,95,0.07)',
            border: '2px solid rgba(108,203,95,0.35)',
            mb: 2,
          }}>
            <Typography sx={{ fontSize: 10, color: '#6ccb5f', fontWeight: 700, mb: 0.8,
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('users.tempPasswordLabel')}
            </Typography>
            <code style={{
              display: 'block',
              fontSize: 18, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--text-primary)',
              fontFamily: "'Cascadia Code', 'Consolas', monospace",
              wordBreak: 'break-all', userSelect: 'all',
            }}>
              {generatedPwd}
            </code>
          </Box>
          <Alert severity="warning" sx={{ fontSize: 12, py: 0.5 }}>
            {t('users.tempPasswordAlert')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            size="small"
            startIcon={<ContentCopyOutlinedIcon />}
            onClick={copyPassword}
            sx={copied ? { background: '#3d7a32' } : {}}
          >
            {copied ? t('common.copied') : t('users.copyPassword')}
          </Button>
          <Button variant="text" size="small" onClick={() => setGeneratedPwd(null)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {loadError && (
        <Alert severity="error" sx={{ fontSize: 12, py: 0.5, mb: 1.5 }}>{loadError}</Alert>
      )}

      {/* Tableau */}
      <div className="w11-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <CircularProgress size={28} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <PeopleAltOutlinedIcon sx={{ fontSize: 40, opacity: 0.25 }} />
            <div className="empty-state-text">{t('users.noUsers')}</div>
          </div>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', width: 200 }}>{t('users.colName')}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('users.colEmail')}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', width: 160 }}>{t('users.colRole')}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', width: 120 }}>{t('users.colCreated')}</TableCell>
                <TableCell sx={{ width: 50 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => {
                const fullName = [u.first_name || u.firstName, u.last_name || u.lastName]
                  .filter(Boolean).join(' ') || '—'
                const isSelf = Number(u.id) === Number(currentUser?.id)
                return (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{fullName}</div>
                      {isSelf && (
                        <div style={{ fontSize: 10, color: '#42a5f5', marginTop: 1 }}>{t('users.you')}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', borderRadius: 10,
                          fontSize: 11, fontWeight: 600,
                          background: 'rgba(66,165,245,0.12)',
                          border: '1px solid rgba(66,165,245,0.3)',
                          color: '#42a5f5',
                        }}>
                          {ROLE_LABEL_MAP[u.role] || u.role}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {updatingRole === u.id && <CircularProgress size={12} />}
                          <FormControl size="small" disabled={updatingRole === u.id} sx={{ minWidth: 140 }}>
                            <Select
                              value={u.role || 'user'}
                              onChange={e => handleRoleChange(u, e.target.value)}
                              sx={{ fontSize: 12 }}
                            >
                              {ROLES.map(r => (
                                <MenuItem key={r.value} value={r.value} sx={{ fontSize: 12 }}>
                                  {r.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(u.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        size="small"
                        disabled={isSelf || deleting === u.id}
                        onClick={() => handleDelete(u.id)}
                        sx={{ minWidth: 0, color: isSelf ? undefined : '#fc3d39', p: '4px' }}
                        title={isSelf ? t('users.cantDeleteSelf') : t('users.deleteTooltip')}
                      >
                        {deleting === u.id
                          ? <CircularProgress size={14} />
                          : <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                        }
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal création */}
      <Dialog open={modalOpen} onClose={() => !creating && setModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('users.create')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '12px !important' }}>
          <TextField
            label={t('users.username')}
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder={t('users.usernamePlaceholder')}
            fullWidth size="small"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <TextField
              label={t('users.firstNameLabel')}
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder={t('users.firstNamePlaceholder')}
              size="small" fullWidth
            />
            <TextField
              label={t('users.lastNameLabel')}
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder={t('users.lastNamePlaceholder')}
              size="small" fullWidth
            />
          </div>
          <TextField
            type="email"
            label={t('users.emailLabel')}
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder={t('users.emailPlaceholder')}
            fullWidth size="small"
          />
          <FormControl size="small" fullWidth>
            <Select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              sx={{ fontSize: 12 }}
            >
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value} sx={{ fontSize: 12 }}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {t('users.tempPasswordAuto')}
          </Typography>
          {createError && (
            <Alert severity="error" sx={{ fontSize: 12, py: 0.3 }}>{createError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="text" size="small" onClick={() => setModalOpen(false)} disabled={creating}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={creating ? <CircularProgress size={13} color="inherit" /> : <AddOutlinedIcon />}
            onClick={handleCreate}
            disabled={creating || !form.username || !form.firstName || !form.lastName || !form.email}
          >
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
