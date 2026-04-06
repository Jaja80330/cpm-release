import React, { useState, useEffect, useCallback } from 'react'
import {
  Button, Input, Label, MessageBar, MessageBarBody, Spinner,
  Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell,
  TableCellLayout, Dialog, DialogSurface, DialogTitle, DialogContent,
  DialogActions, DialogBody, Select,
} from '@fluentui/react-components'
import {
  bundleIcon,
  AddRegular, AddFilled,
  DeleteRegular, DeleteFilled,
  PeopleRegular, PeopleFilled,
  CopyRegular, CopyFilled,
  ArrowClockwiseRegular, ArrowClockwiseFilled,
} from '@fluentui/react-icons'
import { usersService } from '../services/usersService'

const AddIcon     = bundleIcon(AddFilled,             AddRegular)
const DeleteIcon  = bundleIcon(DeleteFilled,           DeleteRegular)
const PeopleIcon  = bundleIcon(PeopleFilled,           PeopleRegular)
const CopyIcon    = bundleIcon(CopyFilled,             CopyRegular)
const RefreshIcon = bundleIcon(ArrowClockwiseFilled,   ArrowClockwiseRegular)

const ROLES = [
  { value: 'user',            label: 'Utilisateur'      },
  { value: 'contributor',     label: 'Contributeur'     },
  { value: 'project_manager', label: 'Chef de projet'   },
  { value: 'super_admin',     label: 'Super Admin'      },
]
const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

const FL = ({ children }) => (
  <Label style={{ color: 'var(--colorNeutralForeground2)', fontSize: 12, display: 'block', marginBottom: 6 }}>
    {children}
  </Label>
)

const EMPTY_FORM = { username: '', firstName: '', lastName: '', email: '', role: 'user' }

export default function UsersPage({ currentUser }) {
  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState(null)
  const [generatedPwd, setGeneratedPwd] = useState(null) // mot de passe affiché après création

  const [deleting,     setDeleting]     = useState(null) // id en cours de suppression
  const [updatingRole, setUpdatingRole] = useState(null) // id en cours de mise à jour de rôle
  const [copied,       setCopied]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await usersService.getAll()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || 'Impossible de charger les utilisateurs.')
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
    if (!form.username)  { setCreateError("Le nom d'utilisateur est requis."); return }
    if (!form.firstName) { setCreateError('Le prénom est requis.'); return }
    if (!form.lastName)  { setCreateError('Le nom est requis.'); return }
    if (!form.email)     { setCreateError("L'adresse e-mail est requise."); return }
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
      setCreateError(err?.response?.data?.message || err?.message || 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (u, newRole) => {
    const prevRole = u.role
    // Optimiste : met à jour localement
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
    setUpdatingRole(u.id)
    try {
      console.log(`PATCH /users/${u.id} — { role: '${newRole}' }`)
      await usersService.updateRole(u.id, newRole)
    } catch (err) {
      // Rollback
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: prevRole } : x))
      setLoadError(err?.response?.data?.message || err?.message || 'Impossible de modifier le rôle.')
      setTimeout(() => setLoadError(null), 4000)
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return // ne pas se supprimer soi-même
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-title">Utilisateurs</div>
          <div className="page-subtitle">Gestion des comptes membres NEROSY</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button appearance="subtle" icon={<RefreshIcon />} onClick={load} disabled={loading} />
          <Button appearance="primary" icon={<AddIcon />} onClick={openModal}>
            Créer un utilisateur
          </Button>
        </div>
      </div>

      {/* Dialog mot de passe temporaire — persistante jusqu'à fermeture manuelle */}
      <Dialog open={!!generatedPwd}>
        <DialogSurface style={{ maxWidth: 480 }}>
          <DialogBody>
            <DialogTitle>
              <span style={{ color: '#6ccb5f' }}>✓</span> Utilisateur créé avec succès
            </DialogTitle>
            <DialogContent>
              <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground2)', marginBottom: 16, lineHeight: 1.6 }}>
                Voici le mot de passe temporaire de ce compte. Notez-le bien —{' '}
                <strong style={{ color: 'var(--colorNeutralForeground1)' }}>
                  il ne sera plus jamais affiché.
                </strong>
              </div>

              {/* Mot de passe en gros */}
              <div style={{
                padding: '14px 18px', borderRadius: 8,
                background: 'rgba(108,203,95,0.08)',
                border: '2px solid rgba(108,203,95,0.4)',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: '#6ccb5f', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Mot de passe temporaire
                </div>
                <code style={{
                  display: 'block',
                  fontSize: 20, fontWeight: 700, letterSpacing: '0.1em',
                  color: 'var(--colorNeutralForeground1)',
                  fontFamily: "'Cascadia Code', 'Consolas', monospace",
                  wordBreak: 'break-all', userSelect: 'all',
                }}>
                  {generatedPwd}
                </code>
              </div>

              <MessageBar intent="warning" style={{ borderRadius: 6 }}>
                <MessageBarBody style={{ fontSize: 12 }}>
                  L'utilisateur devra changer ce mot de passe lors de sa première connexion.
                </MessageBarBody>
              </MessageBar>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="primary"
                icon={<CopyIcon />}
                onClick={copyPassword}
                style={{ background: copied ? '#3d7a32' : undefined }}
              >
                {copied ? 'Copié !' : 'Copier le mot de passe'}
              </Button>
              <Button appearance="subtle" onClick={() => setGeneratedPwd(null)}>
                Fermer
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Erreur chargement */}
      {loadError && (
        <MessageBar intent="error" style={{ borderRadius: 6, marginBottom: 12 }}>
          <MessageBarBody style={{ fontSize: 12 }}>{loadError}</MessageBarBody>
        </MessageBar>
      )}

      {/* Tableau */}
      <div className="w11-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner label="Chargement des utilisateurs…" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <PeopleIcon fontSize={40} style={{ opacity: 0.25 }} />
            <div className="empty-state-text">Aucun utilisateur trouvé.</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: 200 }}>Nom</TableHeaderCell>
                <TableHeaderCell>E-mail</TableHeaderCell>
                <TableHeaderCell style={{ width: 130 }}>Rôle</TableHeaderCell>
                <TableHeaderCell style={{ width: 120 }}>Inscrit le</TableHeaderCell>
                <TableHeaderCell style={{ width: 50 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const fullName = [u.first_name || u.firstName, u.last_name || u.lastName]
                  .filter(Boolean).join(' ') || '—'
                const isSelf = Number(u.id) === Number(currentUser?.id)
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <TableCellLayout>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fullName}</div>
                        {isSelf && (
                          <div style={{ fontSize: 10, color: 'var(--colorBrandForeground1)', marginTop: 2 }}>
                            Vous
                          </div>
                        )}
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 13, color: 'var(--colorNeutralForeground2)' }}>
                        {u.email || '—'}
                      </span>
                    </TableCell>
                    <TableCell style={{ minWidth: 160 }}>
                      {isSelf ? (
                        // Propre compte : badge statique, non modifiable
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 10px', borderRadius: 10,
                          fontSize: 11, fontWeight: 600,
                          background: 'rgba(96,205,255,0.12)',
                          border: '1px solid rgba(96,205,255,0.3)',
                          color: '#60cdff',
                        }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      ) : (
                        // Autre utilisateur : dropdown modifiable
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {updatingRole === u.id && <Spinner size="tiny" />}
                          <Select
                            value={u.role || 'user'}
                            disabled={updatingRole === u.id}
                            onChange={(_, { value }) => handleRoleChange(u, value)}
                            style={{ fontSize: 12, minWidth: 140 }}
                          >
                            {ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span style={{ fontSize: 12, color: 'var(--colorNeutralForeground4)' }}>
                        {formatDate(u.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        appearance="subtle"
                        icon={deleting === u.id ? <Spinner size="tiny" /> : <DeleteIcon />}
                        size="small"
                        disabled={isSelf || deleting === u.id}
                        onClick={() => handleDelete(u.id)}
                        style={{ color: isSelf ? undefined : 'var(--colorStatusDangerForeground1)' }}
                        title={isSelf ? 'Vous ne pouvez pas supprimer votre propre compte' : 'Supprimer'}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de création */}
      <Dialog open={modalOpen} onOpenChange={(_, { open }) => !creating && setModalOpen(open)}>
        <DialogSurface style={{ maxWidth: 420 }}>
          <DialogBody>
            <DialogTitle>Créer un utilisateur</DialogTitle>
            <DialogContent>
              <div style={{ marginBottom: 14 }}>
                <FL>Nom d'utilisateur (identifiant) *</FL>
                <Input
                  value={form.username}
                  onChange={(_, { value }) => setForm(f => ({ ...f, username: value }))}
                  placeholder="jean.dupont"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <FL>Prénom *</FL>
                  <Input
                    value={form.firstName}
                    onChange={(_, { value }) => setForm(f => ({ ...f, firstName: value }))}
                    placeholder="Jean"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <FL>Nom *</FL>
                  <Input
                    value={form.lastName}
                    onChange={(_, { value }) => setForm(f => ({ ...f, lastName: value }))}
                    placeholder="Dupont"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <FL>Adresse e-mail *</FL>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(_, { value }) => setForm(f => ({ ...f, email: value }))}
                  placeholder="jean.dupont@nerosy.fr"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: 6 }}>
                <FL>Rôle</FL>
                <Select
                  value={form.role}
                  onChange={(_, { value }) => setForm(f => ({ ...f, role: value }))}
                  style={{ width: '100%' }}
                >
                  <option value="user">Utilisateur</option>
                  <option value="super_admin">Super Admin</option>
                </Select>
              </div>
              <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)', marginTop: 10 }}>
                Un mot de passe temporaire sera généré automatiquement par le serveur.
              </div>
              {createError && (
                <MessageBar intent="error" style={{ borderRadius: 6, marginTop: 12 }}>
                  <MessageBarBody style={{ fontSize: 12 }}>{createError}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="subtle" onClick={() => setModalOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button
                appearance="primary"
                icon={creating ? <Spinner size="tiny" /> : <AddIcon />}
                onClick={handleCreate}
                disabled={creating || !form.username || !form.firstName || !form.lastName || !form.email}
              >
                Créer
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
