import React, { useState, useEffect } from 'react'
import {
  Dialog, DialogSurface, DialogTitle, DialogBody, DialogContent, DialogActions,
  Button, Input, Textarea, Field
} from '@fluentui/react-components'
import {
  bundleIcon,
  ArrowUploadRegular, ArrowUploadFilled,
  DismissRegular, DismissFilled
} from '@fluentui/react-icons'

const PushIcon  = bundleIcon(ArrowUploadFilled, ArrowUploadRegular)
const CloseIcon = bundleIcon(DismissFilled,     DismissRegular)

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

  return (
    <Dialog open={open} onOpenChange={(_, { open: o }) => { if (!o) onCancel() }}>
      <DialogSurface style={{ maxWidth: 500 }} onKeyDown={handleKeyDown}>
        <DialogTitle style={{ fontSize: 16, fontWeight: 700 }}>
          Nouvelle version — {projectName}
        </DialogTitle>
        <DialogBody>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
            <Field
              label="Nom de la version"
              hint='Laissez vide pour "Sauvegarde automatique"'
            >
              <Input
                autoFocus
                placeholder='Ex : "Release 1.0", "Fix textures moteur"'
                value={versionName}
                onChange={(_, { value }) => setVersionName(value)}
                style={{ width: '100%' }}
              />
            </Field>

            <Field
              label="Notes de version"
              hint="Optionnel — décrit les modifications apportées"
            >
              <Textarea
                placeholder={"- Correction des textures\n- Ajout du son moteur\n- Optimisation des fichiers..."}
                value={changelog}
                onChange={(_, { value }) => setChangelog(value)}
                rows={6}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ marginTop: 5, fontSize: 11, color: '#6d6d6d' }}>
                Supporte le Markdown (ex&nbsp;: <code style={{ color: '#9d9d9d' }}># Titre</code>,{' '}
                <code style={{ color: '#9d9d9d' }}>- Liste</code>,{' '}
                <code style={{ color: '#9d9d9d' }}>**Gras**</code>)
              </div>
            </Field>

            {/* Aperçu du nom de fichier */}
            <div style={{
              padding: '8px 12px',
              background: 'rgba(15,108,189,0.08)',
              border: '1px solid rgba(96,205,255,0.15)',
              borderRadius: 6,
              fontSize: 11,
              color: '#9d9d9d'
            }}>
              <span style={{ color: '#6d6d6d' }}>Fichier généré : </span>
              <code style={{ color: '#60cdff', fontFamily: 'monospace' }}>
                {(() => {
                  const now   = new Date()
                  const date  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
                  const time  = `${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`
                  const slug  = (versionName.trim() || 'Sauvegarde-automatique')
                    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').replace(/-+/g, '-').slice(0, 40)
                  const proj  = projectName.replace(/\s+/g, '_')
                  return `${date}_${time}_${slug}_${proj}.zip`
                })()}
              </code>
            </div>
          </DialogContent>

          <DialogActions style={{ paddingTop: 12 }}>
            <Button appearance="secondary" icon={<CloseIcon />} onClick={onCancel}>
              Annuler
            </Button>
            <Button appearance="primary" icon={<PushIcon />} onClick={handleConfirm}>
              Lancer le PUSH
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
