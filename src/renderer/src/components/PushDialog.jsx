import React, { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PushDialog({ open, projectName, onConfirm, onCancel }) {
  const [versionName, setVersionName] = useState('')
  const [changelog,   setChangelog]   = useState('')

  useEffect(() => {
    if (open) { setVersionName(''); setChangelog('') }
  }, [open])

  const handleConfirm = () => {
    onConfirm({
      name:      versionName.trim() || 'Sauvegarde automatique',
      changelog: changelog.trim()
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  const filePreview = (() => {
    const now   = new Date()
    const date  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const time  = `${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`
    const slug  = (versionName.trim() || 'Sauvegarde-automatique')
      .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').replace(/-+/g, '-').slice(0, 40)
    const proj  = (projectName || '').replace(/\s+/g, '_')
    return `${date}_${time}_${slug}_${proj}.zip`
  })()

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      onKeyDown={handleKeyDown}
    >
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
        Nouvelle version — {projectName}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField
          autoFocus
          label="Nom de la version"
          placeholder='Ex : "Release 1.0", "Fix textures moteur"'
          helperText='Laissez vide pour "Sauvegarde automatique"'
          value={versionName}
          onChange={e => setVersionName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Notes de version"
          placeholder={"- Correction des textures\n- Ajout du son moteur\n- Optimisation des fichiers..."}
          helperText="Optionnel — décrit les modifications apportées. Supporte le Markdown."
          value={changelog}
          onChange={e => setChangelog(e.target.value)}
          multiline
          rows={5}
          fullWidth
          size="small"
        />
        {/* Aperçu du nom de fichier */}
        <Box sx={{
          p: '8px 12px',
          background: 'rgba(25,118,210,0.08)',
          border: '1px solid rgba(66,165,245,0.2)',
          borderRadius: 1.5,
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            Fichier généré :
          </Typography>
          <code style={{ fontSize: 11, color: '#42a5f5', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {filePreview}
          </code>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleConfirm}>
          Lancer le PUSH
        </Button>
      </DialogActions>
    </Dialog>
  )
}
