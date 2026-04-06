import React, { useRef, useEffect } from 'react'
import { Button, ProgressBar, Spinner } from '@fluentui/react-components'
import {
  bundleIcon,
  FolderZipRegular, FolderZipFilled,
  ArrowUploadRegular, ArrowUploadFilled,
  ArrowDownloadRegular, ArrowDownloadFilled,
  FolderOpenRegular, FolderOpenFilled,
  CheckmarkCircleRegular, CheckmarkCircleFilled,
  DismissCircleRegular, DismissCircleFilled
} from '@fluentui/react-icons'

const ArchiveIcon  = bundleIcon(FolderZipFilled,       FolderZipRegular)
const UploadIcon   = bundleIcon(ArrowUploadFilled,     ArrowUploadRegular)
const DownloadIcon = bundleIcon(ArrowDownloadFilled,   ArrowDownloadRegular)
const DeployIcon   = bundleIcon(FolderOpenFilled,      FolderOpenRegular)
const OkIcon       = bundleIcon(CheckmarkCircleFilled, CheckmarkCircleRegular)
const ErrIcon      = bundleIcon(DismissCircleFilled,   DismissCircleRegular)

const PUSH_STEPS = [
  { num: 1, label: 'Archivage',  Icon: ArchiveIcon  },
  { num: 2, label: 'Transfert',  Icon: UploadIcon   }
]
const PULL_STEPS = [
  { num: 1, label: 'Connexion',    Icon: UploadIcon   },
  { num: 2, label: 'Téléchargement', Icon: DownloadIcon },
  { num: 3, label: 'Déploiement',  Icon: DeployIcon   }
]

export default function SyncModal({ open, step, progress, result, onClose, mode = 'push' }) {
  const logEndRef = useRef(null)
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [result?.logs?.length])

  if (!open) return null

  const done    = result !== null
  const success = result?.success
  const STEPS   = mode === 'pull' ? PULL_STEPS : PUSH_STEPS

  const formatBytes = (b) => {
    if (!b && b !== 0) return '—'
    if (b < 1024) return `${b} o`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
    return `${(b / 1048576).toFixed(1)} Mo`
  }

  const progressValue = progress ? progress.percent / 100 : undefined
  const currentStepNum = step?.stepNum ?? 0

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 24
    }}>
      <div style={{
        background: '#2d2d2d',
        border: '1px solid #3d3d3d',
        borderRadius: 8,
        width: '100%', maxWidth: 500,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif"
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid #3d3d3d',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          {!done && <Spinner size="small" />}
          {done && success && <OkIcon fontSize={20} style={{ color: '#6ccb5f' }} />}
          {done && !success && <ErrIcon fontSize={20} style={{ color: '#fc3d39' }} />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>
              {mode === 'pull' ? 'Cinnamon Pull' : 'Cinnamon Sync'}
            </div>
            <div style={{ fontSize: 12, color: '#9d9d9d', marginTop: 1 }}>
              {!done && (mode === 'pull' ? 'Récupération en cours...' : 'Synchronisation en cours...')}
              {done && success && (mode === 'pull' ? `Déploiement réussi — ${result?.deployedCount ?? 0} fichier(s)` : 'Transfert réussi')}
              {done && !success && 'Une erreur est survenue'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map(({ num, label, Icon }, i) => {
              const isDone   = done || currentStepNum > num
              const isActive = currentStepNum === num && !done
              const color    = isDone ? '#6ccb5f' : isActive ? '#60cdff' : '#6d6d6d'
              return (
                <React.Fragment key={num}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? '#1a3a1f' : isActive ? '#0d2a44' : '#383838',
                      border: `1.5px solid ${color}`,
                      transition: 'all 0.25s'
                    }}>
                      {isDone
                        ? <span style={{ color: '#6ccb5f', fontSize: 13 }}>✓</span>
                        : <Icon fontSize={14} style={{ color }} />
                      }
                    </div>
                    <span style={{ fontSize: 12, color, fontWeight: isActive ? 600 : 400 }}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      flex: 1, height: 1, margin: '0 10px',
                      background: currentStepNum > 1 || done ? '#6ccb5f' : '#3d3d3d',
                      transition: 'background 0.3s'
                    }} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Progression active */}
          {!done && (
            <div>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#d1d1d1',
                marginBottom: 10
              }}>
                {step ? `Étape ${step.stepNum}/${step.stepTotal} — ${step.stepLabel}` : 'Initialisation...'}
              </div>

              <ProgressBar
                value={progressValue}
                thickness="medium"
                style={{ borderRadius: 4, marginBottom: 8 }}
              />

              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: '#9d9d9d'
              }}>
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '65%', fontFamily: "'Cascadia Code', 'Consolas', monospace"
                }}>
                  {progress?.label ?? '—'}
                </span>
                <span style={{ flexShrink: 0, fontWeight: 600, color: '#d1d1d1' }}>
                  {progress
                    ? step?.stepNum === 1
                      ? `${progress.current} / ${progress.total} fichiers`
                      : `${formatBytes(progress.current)} / ${formatBytes(progress.total)}`
                    : ''
                  }
                  {progress ? ` · ${progress.percent}%` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Résultat */}
          {done && (
            <div style={{
              padding: '12px 14px',
              background: success ? 'rgba(108,203,95,0.08)' : 'rgba(252,61,57,0.08)',
              border: `1px solid ${success ? 'rgba(108,203,95,0.25)' : 'rgba(252,61,57,0.25)'}`,
              borderRadius: 6,
              fontSize: 13,
            }}>
              {success ? (
                <>
                  <div style={{ fontWeight: 600, color: '#6ccb5f', marginBottom: 3 }}>
                    Archive envoyée avec succès
                  </div>
                  <div style={{ fontSize: 11, color: '#9d9d9d' }}>
                    {result.zipName}
                    {result.zipSizeBytes ? ` · ${formatBytes(result.zipSizeBytes)}` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: '#fc3d39', marginBottom: 3 }}>
                    Échec de la synchronisation
                  </div>
                  <div style={{ fontSize: 11, color: '#9d9d9d' }}>{result.error}</div>
                </>
              )}
            </div>
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
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #3d3d3d',
          display: 'flex', justifyContent: 'flex-end'
        }}>
          <Button
            appearance={done ? 'primary' : 'secondary'}
            disabled={!done}
            onClick={onClose}
          >
            {!done
              ? <><Spinner size="tiny" style={{ marginRight: 8 }} />En cours...</>
              : 'Fermer'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
