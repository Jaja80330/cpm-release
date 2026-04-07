import React, { useState, useCallback, useEffect } from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import * as BP from '../utils/busParser'

// ── Constantes de style ───────────────────────────────────────────────────
const MONO  = "'Cascadia Code','Consolas','Courier New',monospace"
const CARD  = {
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
  padding: '14px 16px',
  marginBottom: 12,
}

// ── Helper : chemin relatif (renderer, Windows) ───────────────────────────
function toRelative(busDir, absPath) {
  const dir = busDir.replace(/[/\\]+$/, '').replace(/\\/g, '/')
  const abs = absPath.replace(/\\/g, '/')
  if (abs.toLowerCase().startsWith(dir.toLowerCase() + '/')) {
    return abs.slice(dir.length + 1).replace(/\//g, '\\')
  }
  return absPath
}

// ── Icône de validation ───────────────────────────────────────────────────
function ValidationIcon({ state }) {
  if (state === null)  return <CircularProgress size={12} sx={{ color: '#42a5f5' }} />
  if (state === true)  return <CheckCircleOutlinedIcon sx={{ fontSize: 14, color: '#6ccb5f' }} />
  if (state === false) return (
    <Tooltip title="Fichier introuvable sur le disque">
      <ErrorOutlineOutlinedIcon sx={{ fontSize: 14, color: '#fc3d39' }} />
    </Tooltip>
  )
  return <HelpOutlineOutlinedIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }} />
}

// ── Éditeur de liste de fichiers ──────────────────────────────────────────
function FileListSection({ label, hint, files, busDir, extensions, validations, onChange, onValidate }) {
  const [addMode,  setAddMode]  = useState(false)
  const [addValue, setAddValue] = useState('')

  const handleAddConfirm = () => {
    const v = addValue.trim()
    if (!v) return
    onChange([...files, v])
    onValidate(v)
    setAddValue('')
    setAddMode(false)
  }

  const handleBrowse = async (idx) => {
    const ext = extensions ?? []
    const sel = await window.api.dialog.selectFile({
      filters: ext.length ? [{ name: 'Fichiers', extensions: ext }] : [],
    })
    if (!sel || !busDir) return
    const rel = toRelative(busDir, sel)
    const next = [...files]
    next[idx] = rel
    onChange(next)
    onValidate(rel)
  }

  const handleBrowseNew = async () => {
    const ext = extensions ?? []
    const sel = await window.api.dialog.selectFile({
      filters: ext.length ? [{ name: 'Fichiers', extensions: ext }] : [],
    })
    if (!sel || !busDir) return
    const rel = toRelative(busDir, sel)
    onChange([...files, rel])
    onValidate(rel)
  }

  const handleRemove = (idx) => onChange(files.filter((_, i) => i !== idx))

  const handlePatch = (idx, val) => {
    const next = [...files]
    next[idx] = val
    onChange(next)
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Titre de section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {label}
          </span>
          {files.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
              {files.length}
            </span>
          )}
          {hint && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{hint}</div>
          )}
        </div>
      </div>

      {/* Liste */}
      {files.length === 0 && !addMode && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
          padding: '6px 0' }}>
          Aucun fichier.
        </div>
      )}

      {files.map((f, idx) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px', marginBottom: 4,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 6,
          borderLeft: validations[f] === false
            ? '2px solid #fc3d39'
            : validations[f] === true
              ? '2px solid rgba(108,203,95,0.4)'
              : '2px solid rgba(255,255,255,0.06)',
        }}>
          <ValidationIcon state={validations[f]} />

          {/* Champ éditable inline */}
          <input
            value={f}
            onChange={e => handlePatch(idx, e.target.value)}
            onBlur={e => onValidate(e.target.value.trim())}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, fontFamily: MONO, color: validations[f] === false
                ? '#ff9090' : 'var(--text-primary)',
            }}
          />

          {/* Parcourir */}
          <Tooltip title="Parcourir…">
            <IconButton size="small" onClick={() => handleBrowse(idx)}
              sx={{ p: '3px', color: 'var(--text-muted)',
                '&:hover': { color: 'var(--text-primary)' } }}>
              <FolderOutlinedIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>

          {/* Supprimer */}
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={() => handleRemove(idx)}
              sx={{ p: '3px', color: 'var(--text-muted)',
                '&:hover': { color: '#fc3d39' } }}>
              <DeleteOutlinedIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </div>
      ))}

      {/* Ligne d'ajout */}
      {addMode ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <input
            autoFocus
            value={addValue}
            onChange={e => setAddValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddConfirm(); if (e.key === 'Escape') setAddMode(false) }}
            placeholder="Script\fichier.osc"
            style={{
              flex: 1, background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 5, padding: '5px 10px',
              fontSize: 12, fontFamily: MONO, color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <Button size="small" variant="contained" onClick={handleAddConfirm}
            sx={{ fontSize: 11, textTransform: 'none', borderRadius: '5px', py: 0.4 }}>
            Ajouter
          </Button>
          <Button size="small" onClick={handleBrowseNew}
            sx={{ fontSize: 11, textTransform: 'none', borderRadius: '5px', py: 0.4 }}>
            Parcourir
          </Button>
          <Button size="small" onClick={() => setAddMode(false)}
            sx={{ fontSize: 11, textTransform: 'none', borderRadius: '5px', py: 0.4,
              color: 'var(--text-muted)' }}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button
          size="small"
          startIcon={<AddOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={() => setAddMode(true)}
          sx={{ mt: 0.5, fontSize: 11, textTransform: 'none', borderRadius: '5px',
            color: 'var(--text-muted)', '&:hover': { color: 'var(--text-primary)' } }}
        >
          Ajouter un fichier
        </Button>
      )}
    </div>
  )
}

// ── Sous-onglet Général ───────────────────────────────────────────────────
function TabGeneral({ tokens, onChange }) {
  const name = BP.getValue(tokens, 'friendlyname')
  const desc = BP.getValue(tokens, 'description')
  const patch = (key, val) => onChange(BP.setValue(tokens, key, val))

  return (
    <div style={{ ...CARD, maxWidth: 560 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField
          label="Nom du bus (friendlyname)"
          value={name}
          onChange={e => patch('friendlyname', e.target.value)}
          size="small"
          fullWidth
          InputProps={{ style: { fontSize: 13 } }}
        />
        <TextField
          label="Description"
          value={desc}
          onChange={e => patch('description', e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={3}
          InputProps={{ style: { fontSize: 13, fontFamily: MONO } }}
        />
      </div>
    </div>
  )
}

// ── Sous-onglet Fichiers ──────────────────────────────────────────────────
function TabFiles({ tokens, busDir, validations, onChange, onValidate, onValidateAll }) {
  const scripts = BP.getList(tokens, 'script')
  const vars    = BP.getList(tokens, 'vars')

  return (
    <div style={CARD}>
      {/* Bouton validation globale */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button
          size="small"
          startIcon={<SearchOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={onValidateAll}
          disabled={!busDir}
          sx={{ fontSize: 11, textTransform: 'none', borderRadius: '6px' }}
        >
          Valider tous les fichiers
        </Button>
      </div>

      <FileListSection
        label="Scripts (.osc)"
        hint="Fichiers de script OMSI — bloc [script]"
        files={scripts}
        busDir={busDir}
        extensions={['osc']}
        validations={validations}
        onChange={files => onChange(BP.setList(tokens, 'script', files))}
        onValidate={onValidate}
      />

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '8px 0 16px' }} />

      <FileListSection
        label="Variables (.cfg)"
        hint="Fichiers de variables — bloc [vars]"
        files={vars}
        busDir={busDir}
        extensions={['cfg']}
        validations={validations}
        onChange={files => onChange(BP.setList(tokens, 'vars', files))}
        onValidate={onValidate}
      />
    </div>
  )
}

// ── Sous-onglet Physique ──────────────────────────────────────────────────
function TabPhysics({ tokens, onChange }) {
  const patch = (key, val) => onChange(BP.setValue(tokens, key, val))

  const fields = [
    { key: 'length',     label: 'Longueur (m)',              type: 'number', step: 0.1 },
    { key: 'axles',      label: 'Nombre d\'essieux',         type: 'number', step: 1   },
    { key: 'passengers', label: 'Capacité passagers',        type: 'number', step: 1   },
    { key: 'health',     label: 'Santé initiale (0.0–1.0)',  type: 'number', step: 0.01 },
    { key: 'maxspeed',   label: 'Vitesse max (km/h)',        type: 'number', step: 1   },
  ]

  return (
    <div style={{ ...CARD, maxWidth: 400 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(({ key, label, step }) => (
          <TextField
            key={key}
            label={label}
            value={BP.getValue(tokens, key)}
            onChange={e => patch(key, e.target.value)}
            size="small"
            type="number"
            inputProps={{ step }}
            InputProps={{ style: { fontSize: 13, fontFamily: MONO } }}
            sx={{ maxWidth: 260 }}
          />
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '8px 10px', borderRadius: 6,
        background: 'rgba(66,165,245,0.05)', border: '1px solid rgba(66,165,245,0.15)',
        fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
        Les sections absentes du fichier seront ajoutées lors de la sauvegarde uniquement
        si leur valeur est non vide.
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────
export default function BusEditorTab() {
  const [busFilePath, setBusFilePath] = useState(null) // chemin absolu
  const [busDir,      setBusDir]      = useState(null) // répertoire du .bus
  const [tokens,      setTokens]      = useState([])
  const [dirty,       setDirty]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errMsg,      setErrMsg]      = useState(null)
  const [subTab,      setSubTab]      = useState(0)
  const [validations, setValidations] = useState({}) // path → true | false | null

  // ── Validation d'un chemin unique ─────────────────────────────────────
  const validatePath = useCallback(async (relativePath) => {
    if (!busDir || !relativePath) return
    setValidations(prev => ({ ...prev, [relativePath]: null }))
    const exists = await window.api.bus.fileExists(busDir, relativePath)
    setValidations(prev => ({ ...prev, [relativePath]: exists }))
  }, [busDir])

  // ── Validation de tous les fichiers référencés ─────────────────────────
  const validateAll = useCallback(async (tok) => {
    if (!busDir) return
    const allPaths = [
      ...BP.getList(tok, 'script'),
      ...BP.getList(tok, 'vars'),
    ].filter(Boolean)
    const initial = {}
    allPaths.forEach(p => { initial[p] = null })
    setValidations(initial)
    for (const p of allPaths) {
      const exists = await window.api.bus.fileExists(busDir, p)
      setValidations(prev => ({ ...prev, [p]: exists }))
    }
  }, [busDir])

  // ── Ouvrir un fichier .bus ──────────────────────────────────────────────
  const openFile = async () => {
    const fp = await window.api.dialog.selectFile({
      filters: [{ name: 'Fichiers Bus OMSI', extensions: ['bus'] }],
    })
    if (!fp) return
    setLoading(true); setErrMsg(null)
    try {
      const res = await window.api.bus.readFile(fp)
      if (!res.success) { setErrMsg(res.error); return }
      const tok = BP.parse(res.content)
      const dir = fp.replace(/[/\\][^/\\]+$/, '') // dirname
      setBusFilePath(fp)
      setBusDir(dir)
      setTokens(tok)
      setDirty(false)
      setValidations({})
      await validateAll(tok)
    } finally {
      setLoading(false)
    }
  }

  // ── Nouveau fichier ─────────────────────────────────────────────────────
  const newFile = () => {
    setBusFilePath(null)
    setBusDir(null)
    setTokens(BP.defaultTokens())
    setDirty(true)
    setValidations({})
    setErrMsg(null)
  }

  // ── Sauvegarder ────────────────────────────────────────────────────────
  const saveFile = async () => {
    let fp = busFilePath
    if (!fp) {
      fp = await window.api.dialog.saveFile({
        filters: [{ name: 'Fichiers Bus OMSI', extensions: ['bus'] }],
        defaultPath: `${BP.getValue(tokens, 'friendlyname') || 'NouveauBus'}.bus`,
      })
      if (!fp) return
      const dir = fp.replace(/[/\\][^/\\]+$/, '')
      setBusFilePath(fp)
      setBusDir(dir)
    }
    setSaving(true); setErrMsg(null)
    try {
      const content = BP.serialize(tokens)
      const res     = await window.api.bus.writeFile(fp, content)
      if (!res.success) setErrMsg(res.error)
      else setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Mise à jour des tokens (mutation immuable) ─────────────────────────
  const handleChange = useCallback((nextTokens) => {
    setTokens(nextTokens)
    setDirty(true)
  }, [])

  // ── Nom court du fichier pour l'affichage ──────────────────────────────
  const shortPath = busFilePath
    ? busFilePath.replace(/.*[/\\]/, '')
    : null

  const hasFile = tokens.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Barre d'outils ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FolderOpenOutlinedIcon />}
          onClick={openFile}
          disabled={loading}
          sx={{ fontSize: 12, textTransform: 'none', borderRadius: '6px' }}
        >
          Ouvrir un .bus
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<NoteAddOutlinedIcon />}
          onClick={newFile}
          disabled={loading}
          sx={{ fontSize: 12, textTransform: 'none', borderRadius: '6px' }}
        >
          Nouveau .bus
        </Button>

        {/* Chemin courant */}
        {shortPath && (
          <Tooltip title={busFilePath}>
            <span style={{
              fontSize: 12, fontFamily: MONO,
              color: dirty ? '#f0a030' : 'var(--text-muted)',
              background: 'rgba(0,0,0,0.3)',
              padding: '3px 10px', borderRadius: 5,
              border: `1px solid ${dirty ? 'rgba(240,160,48,0.3)' : 'rgba(255,255,255,0.06)'}`,
              maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {shortPath}{dirty ? ' •' : ''}
            </span>
          </Tooltip>
        )}

        <div style={{ flex: 1 }} />

        {hasFile && (
          <Button
            size="small"
            variant="contained"
            startIcon={saving
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : <SaveOutlinedIcon />}
            onClick={saveFile}
            disabled={saving || !dirty}
            sx={{ fontSize: 12, textTransform: 'none', borderRadius: '6px' }}
          >
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        )}
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────── */}
      {errMsg && (
        <div style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12,
          color: '#fc3d39', background: 'rgba(252,61,57,0.07)',
          border: '1px solid rgba(252,61,57,0.22)',
          display: 'flex', gap: 8, alignItems: 'center' }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
          {errMsg}
        </div>
      )}

      {/* ── Chargement ──────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3 }}>
          <CircularProgress size={18} />
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chargement…</Typography>
        </Box>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && !hasFile && (
        <div style={{ textAlign: 'center', padding: '52px 0',
          color: 'rgba(255,255,255,0.18)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 40, opacity: 0.2 }} />
          <div style={{ fontSize: 13 }}>
            Ouvrez un fichier <strong style={{ color: 'rgba(255,255,255,0.35)' }}>.bus</strong> existant
            ou créez-en un nouveau.
          </div>
        </div>
      )}

      {/* ── Éditeur (sous-onglets) ───────────────────────────────────────── */}
      {!loading && hasFile && (
        <>
          <Tabs
            value={subTab}
            onChange={(_, v) => setSubTab(v)}
            sx={{
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              minHeight: 34,
              '& .MuiTab-root': { minHeight: 34, py: 0.5 },
            }}
          >
            <Tab label="Général"  sx={{ fontSize: 12, textTransform: 'none' }} />
            <Tab
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  Fichiers
                  {/* Badge rouge si des fichiers sont manquants */}
                  {Object.values(validations).some(v => v === false) && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%',
                      background: '#fc3d39', display: 'inline-block' }} />
                  )}
                </span>
              }
              sx={{ fontSize: 12, textTransform: 'none' }}
            />
            <Tab label="Physique" sx={{ fontSize: 12, textTransform: 'none' }} />
          </Tabs>

          <div style={{ paddingTop: 4 }}>
            {subTab === 0 && (
              <TabGeneral tokens={tokens} onChange={handleChange} />
            )}
            {subTab === 1 && (
              <TabFiles
                tokens={tokens}
                busDir={busDir}
                validations={validations}
                onChange={handleChange}
                onValidate={validatePath}
                onValidateAll={() => validateAll(tokens)}
              />
            )}
            {subTab === 2 && (
              <TabPhysics tokens={tokens} onChange={handleChange} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
