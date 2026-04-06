import React, { useRef, useEffect } from 'react'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'

const PUSH_STEPS = [
  { num: 1, label: 'Archivage',    Icon: FolderZipOutlinedIcon  },
  { num: 2, label: 'Transfert',    Icon: CloudUploadOutlinedIcon }
]
const PULL_STEPS = [
  { num: 1, label: 'Connexion',      Icon: CloudUploadOutlinedIcon   },
  { num: 2, label: 'Téléchargement', Icon: CloudDownloadOutlinedIcon },
  { num: 3, label: 'Déploiement',    Icon: FolderOpenOutlinedIcon    }
]

const formatBytes = (b) => {
  if (!b && b !== 0) return '—'
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

export default function SyncModal({ open, step, progress, result, onClose, mode = 'push' }) {
  const logEndRef = useRef(null)
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [result?.logs?.length])

  if (!open) return null

  const done    = result !== null
  const success = result?.success
  const STEPS   = mode === 'pull' ? PULL_STEPS : PUSH_STEPS
  const currentStepNum = step?.stepNum ?? 0
  const progressValue = progress ? progress.percent : 0

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 24
    }}>
      <Box sx={{
        background: '#1a1f25',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        width: '100%', maxWidth: 500,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <Box sx={{
          p: '16px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 1.5
        }}>
          {!done && <CircularProgress size={18} thickness={4} />}
          {done && success && <CheckCircleOutlinedIcon sx={{ color: '#6ccb5f', fontSize: 20 }} />}
          {done && !success && <CancelOutlinedIcon sx={{ color: '#fc3d39', fontSize: 20 }} />}
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {mode === 'pull' ? 'Cinnamon Pull' : 'Cinnamon Sync'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2 }}>
              {!done && (mode === 'pull' ? 'Récupération en cours...' : 'Synchronisation en cours...')}
              {done && success && (mode === 'pull' ? `Déploiement réussi — ${result?.deployedCount ?? 0} fichier(s)` : 'Transfert réussi')}
              {done && !success && 'Une erreur est survenue'}
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ p: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Stepper */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {STEPS.map(({ num, label, Icon }, i) => {
              const isDone   = done || currentStepNum > num
              const isActive = currentStepNum === num && !done
              const color    = isDone ? '#6ccb5f' : isActive ? '#42a5f5' : '#5f6368'
              return (
                <React.Fragment key={num}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Box sx={{
                      width: 26, height: 26, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'rgba(108,203,95,0.12)' : isActive ? 'rgba(66,165,245,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${color}`,
                      transition: 'all 0.25s',
                    }}>
                      {isDone
                        ? <span style={{ color: '#6ccb5f', fontSize: 12, fontWeight: 700 }}>✓</span>
                        : <Icon sx={{ fontSize: 13, color }} />
                      }
                    </Box>
                    <Typography sx={{ fontSize: 12, color, fontWeight: isActive ? 600 : 400 }}>
                      {label}
                    </Typography>
                  </Box>
                  {i < STEPS.length - 1 && (
                    <Box sx={{
                      flex: 1, height: '1px', mx: 1,
                      background: currentStepNum > 1 || done ? '#6ccb5f' : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s'
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </Box>

          {/* Progression active */}
          {!done && (
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                {step ? `Étape ${step.stepNum}/${step.stepTotal} — ${step.stepLabel}` : 'Initialisation...'}
              </Typography>
              <LinearProgress
                variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
                value={progressValue}
                sx={{ borderRadius: 1, mb: 0.8, height: 5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'text.secondary' }}>
                <Typography component="span" sx={{
                  fontSize: 11, color: 'text.secondary',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '65%', fontFamily: 'monospace'
                }}>
                  {progress?.label ?? '—'}
                </Typography>
                <Typography component="span" sx={{ fontSize: 11, flexShrink: 0, fontWeight: 600 }}>
                  {progress
                    ? step?.stepNum === 1
                      ? `${progress.current} / ${progress.total} fichiers`
                      : `${formatBytes(progress.current)} / ${formatBytes(progress.total)}`
                    : ''
                  }
                  {progress ? ` · ${progress.percent}%` : ''}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Résultat */}
          {done && (
            <Box sx={{
              p: '10px 14px',
              background: success ? 'rgba(108,203,95,0.07)' : 'rgba(252,61,57,0.07)',
              border: `1px solid ${success ? 'rgba(108,203,95,0.25)' : 'rgba(252,61,57,0.25)'}`,
              borderRadius: 1.5,
            }}>
              {success ? (
                <>
                  <Typography sx={{ fontWeight: 600, color: '#6ccb5f', fontSize: 13, mb: 0.4 }}>
                    Archive envoyée avec succès
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {result.zipName}
                    {result.zipSizeBytes ? ` · ${formatBytes(result.zipSizeBytes)}` : ''}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 600, color: '#fc3d39', fontSize: 13, mb: 0.4 }}>
                    Échec de la synchronisation
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{result.error}</Typography>
                </>
              )}
            </Box>
          )}

          {/* Log */}
          {done && result?.logs?.length > 0 && (
            <div className="sync-log">
              {result.logs.map((entry, i) => {
                const isErr = entry.msg.startsWith('ERREUR')
                const isOk  = entry.msg.includes('succès')
                return (
                  <div key={i} className={`sync-log-entry${isErr ? ' error' : isOk ? ' success' : ''}`}>
                    <span className="time">{entry.time.substring(11, 19)}</span>
                    {entry.msg}
                  </div>
                )
              })}
              <div ref={logEndRef} />
            </div>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{
          p: '10px 20px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <Button
            variant={done ? 'contained' : 'outlined'}
            disabled={!done}
            onClick={onClose}
            size="small"
          >
            {!done ? 'En cours...' : 'Fermer'}
          </Button>
        </Box>
      </Box>
    </div>
  )
}
