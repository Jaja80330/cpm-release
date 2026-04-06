import React, { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Button, Spinner, TabList, Tab, Input, Switch, Checkbox,
  Table, TableHeader, TableBody, TableRow, TableCell, TableHeaderCell, TableCellLayout
} from '@fluentui/react-components'
import {
  bundleIcon,
  ArrowLeftRegular, ArrowLeftFilled,
  ArrowUploadRegular, ArrowUploadFilled,
  ArrowDownloadRegular, ArrowDownloadFilled,
  ArrowClockwiseRegular, ArrowClockwiseFilled,
  VehicleBusRegular, VehicleBusFilled,
  FolderRegular, FolderFilled,
  MusicNote2Regular, MusicNote2Filled,
  TextFontRegular, TextFontFilled,
  DocumentRegular, DocumentFilled,
  ImageRegular, ImageFilled,
  CloudRegular, CloudFilled,
  CalendarRegular, CalendarFilled,
  DeleteRegular, DeleteFilled,
  CheckmarkCircleRegular, CheckmarkCircleFilled,
  DismissCircleRegular, DismissCircleFilled,
  WarningRegular, WarningFilled,
  ArrowSyncRegular, ArrowSyncFilled,
  PersonRegular, PersonFilled,
  PeopleRegular, PeopleFilled,
  PeopleTeamRegular, PeopleTeamFilled,
  PersonAddRegular, PersonAddFilled,
  PersonDeleteRegular, PersonDeleteFilled,
  EyeRegular, EyeFilled,
  HistoryDismissRegular, HistoryDismissFilled
} from '@fluentui/react-icons'
import SyncModal from '../components/SyncModal'
import PushDialog from '../components/PushDialog'
import { projectService } from '../services/projectService'

const BackIcon     = bundleIcon(ArrowLeftFilled,           ArrowLeftRegular)
const PushIcon     = bundleIcon(ArrowUploadFilled,         ArrowUploadRegular)
const PullIcon     = bundleIcon(ArrowDownloadFilled,       ArrowDownloadRegular)
const RefreshIcon  = bundleIcon(ArrowClockwiseFilled,      ArrowClockwiseRegular)
const BusIcon      = bundleIcon(VehicleBusFilled,          VehicleBusRegular)
const FolderIcon   = bundleIcon(FolderFilled,              FolderRegular)
const SoundIcon    = bundleIcon(MusicNote2Filled,          MusicNote2Regular)
const FontIcon     = bundleIcon(TextFontFilled,            TextFontRegular)
const DocIcon      = bundleIcon(DocumentFilled,            DocumentRegular)
const ImageIcon    = bundleIcon(ImageFilled,               ImageRegular)
const CloudIcon    = bundleIcon(CloudFilled,               CloudRegular)
const CalIcon      = bundleIcon(CalendarFilled,            CalendarRegular)
const DeleteIcon   = bundleIcon(DeleteFilled,              DeleteRegular)
const OkIcon        = bundleIcon(CheckmarkCircleFilled,     CheckmarkCircleRegular)
const NotOkIcon     = bundleIcon(DismissCircleFilled,       DismissCircleRegular)
const WarningIcon      = bundleIcon(WarningFilled,          WarningRegular)
const ArrowSyncIcon    = bundleIcon(ArrowSyncFilled,        ArrowSyncRegular)
const PersonIcon       = bundleIcon(PersonFilled,           PersonRegular)
const PeopleIcon       = bundleIcon(PeopleFilled,           PeopleRegular)
const TeamIcon         = bundleIcon(PeopleTeamFilled,       PeopleTeamRegular)
const PersonAddIcon    = bundleIcon(PersonAddFilled,        PersonAddRegular)
const PersonDeleteIcon  = bundleIcon(PersonDeleteFilled,     PersonDeleteRegular)
const PublishIcon       = bundleIcon(EyeFilled,              EyeRegular)
const DeprecateIcon     = bundleIcon(HistoryDismissFilled,   HistoryDismissRegular)

// ── Helpers ────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (!b && b !== 0) return '—'
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

function formatDate(ms) {
  if (!ms) return '—'
  // ssh2-sftp-client renvoie modifyTime en millisecondes
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(ms))
}


function PathRow({ Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '9px 0', borderBottom: '1px solid #3d3d3d' }}>
      <Icon fontSize={15} style={{ color: '#9d9d9d', marginTop: 1, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#6d6d6d', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#d1d1d1',
          fontFamily: "'Cascadia Code','Consolas',monospace", wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Description ─────────────────────────────────────────────────────
function TabDescription({ project, thumb, cinStatus, onUninstall, isUninstalling,
                          latestCloudVersion, onInstallLatest, busFiles, knownZipNames,
                          canDeploy }) {
  const installDate = cinStatus?.installDate
    ? new Date(cinStatus.installDate).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : null

  // Paquet externe : .cin présent mais le zip est absent des versions connues en base
  // knownZipNames = null → données pas encore chargées (pas de faux positif au démarrage)
  // knownZipNames = Set vide → chargé mais 0 versions publiées → tout installé est externe
  const isExternalPackage = !!cinStatus && knownZipNames != null && !knownZipNames.has(cinStatus.zipName)
  const isOutdated = !isExternalPackage && !!cinStatus && !!latestCloudVersion
    && cinStatus.zipName !== latestCloudVersion.name

  // Couleur de l'icône d'en-tête
  const headerIcon = isExternalPackage
    ? <NotOkIcon fontSize={15} style={{ color: '#fc3d39' }} />
    : isOutdated
      ? <WarningIcon fontSize={15} style={{ color: '#f0a030' }} />
      : cinStatus
        ? <OkIcon    fontSize={15} style={{ color: '#6ccb5f' }} />
        : <NotOkIcon fontSize={15} style={{ color: '#9d9d9d' }} />

  const uninstallBtn = (
    <Button
      appearance="subtle"
      icon={isUninstalling ? <Spinner size="tiny" /> : <DeleteIcon />}
      disabled={isUninstalling}
      onClick={onUninstall}
      style={{ color: '#fc3d39', borderColor: 'rgba(252,61,57,0.3)', flexShrink: 0 }}
    >
      {isUninstalling ? 'Désinstallation...' : 'Désinstaller'}
    </Button>
  )

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

      {/* Colonne gauche */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Déploiement — visible uniquement si canPull ou propriétaire/admin */}
        {canDeploy && <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title">{headerIcon} Déploiement</div>

          {/* ── Paquet externe ── */}
          {isExternalPackage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#fc3d39', fontWeight: 600 }}>
                      ✗ Installé — Paquet externe
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#ffffff',
                      background: 'rgba(252,61,57,0.12)', border: '1px solid rgba(252,61,57,0.25)',
                      padding: '1px 10px', borderRadius: 4
                    }}>
                      {cinStatus.versionName}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6d6d6d', marginTop: 4 }}>
                    Installé le {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                </div>
                {uninstallBtn}
              </div>
              {/* Bannière d'avertissement */}
              <div style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.25)'
              }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <WarningIcon fontSize={14} style={{ color: '#fc3d39', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#fc3d39', lineHeight: 1.55 }}>
                    Cette version est inconnue du système NEROSY. Soyez prudent, l'intégrité du paquet ne peut être vérifiée.
                  </span>
                </div>
              </div>
            </div>

          /* ── Installé (à jour ou non) ── */
          ) : cinStatus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isOutdated ? (
                      <span style={{ fontSize: 13, color: '#f0a030', fontWeight: 600 }}>
                        ⚠ Mise à jour disponible
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#6ccb5f', fontWeight: 600 }}>
                        ✓ Installé · À jour
                      </span>
                    )}
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: '#ffffff',
                      background: isOutdated ? 'rgba(240,160,48,0.12)' : 'rgba(108,203,95,0.12)',
                      border: `1px solid ${isOutdated ? 'rgba(240,160,48,0.25)' : 'rgba(108,203,95,0.25)'}`,
                      padding: '1px 10px', borderRadius: 4
                    }}>
                      {cinStatus.versionName}
                    </span>
                    {isOutdated && latestCloudVersion && (
                      <span style={{ fontSize: 11, color: '#6d6d6d' }}>
                        → {latestCloudVersion.versionName} disponible
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6d6d6d', marginTop: 4 }}>
                    Installé le {installDate} · {cinStatus.files?.length || 0} fichier(s)
                  </div>
                </div>
                {uninstallBtn}
              </div>
              {isOutdated && (
                <Button appearance="primary" icon={<ArrowSyncIcon />} onClick={onInstallLatest}
                  style={{ alignSelf: 'flex-start' }}>
                  Mettre à jour vers {latestCloudVersion.versionName}
                </Button>
              )}
            </div>

          /* ── Non installé ── */
          ) : (
            <div style={{ fontSize: 13, color: '#6d6d6d', fontStyle: 'italic',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <NotOkIcon fontSize={14} /> Non installé localement
            </div>
          )}
        </div>}

        {/* Description */}
        <div style={{ display: 'grid', gridTemplateColumns: thumb ? '200px 1fr' : '1fr', gap: 12 }}>
          {thumb && (
            <div style={{ borderRadius: 8, overflow: 'hidden', background: '#383838',
              maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title"><DocIcon fontSize={15} /> Description</div>
            {project.description ? (
              <div style={{ fontSize: 13, color: '#d1d1d1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {project.description}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#6d6d6d', fontStyle: 'italic' }}>
                Aucune description renseignée.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panneau droit — Bus détectés */}
      {busFiles.length > 0 && (
        <div style={{ width: 260, flexShrink: 0 }}>
          <div className="w11-card" style={{ marginBottom: 0 }}>
            <div className="w11-card-title">
              <BusIcon fontSize={15} /> Bus détectés
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6d6d6d',
                background: '#383838', padding: '2px 8px', borderRadius: 10 }}>
                {busFiles.length}
              </span>
            </div>
            {busFiles.map((bus, i) => (
              <div key={`bus-${i}`} style={{
                padding: '8px 0',
                borderBottom: i < busFiles.length - 1 ? '1px solid #3d3d3d' : 'none'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#d1d1d1' }}>
                  {bus.model || '—'}
                </div>
                {bus.manufacturer && (
                  <div style={{ fontSize: 11, color: '#9d9d9d', marginTop: 1 }}>
                    {bus.manufacturer}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#4d4d4d', fontFamily: 'monospace',
                  marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={bus.filename}>
                  {bus.filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Contenu ─────────────────────────────────────────────────────────
function TabContenu({ project, fontDetails }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Dossiers */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><FolderIcon fontSize={15} /> Dossiers synchronisés</div>
        <PathRow Icon={BusIcon}    label="Vehicles (obligatoire)" value={project.vehicles} />
        <PathRow Icon={FolderIcon} label="Addons (facultatif)"    value={project.addons} />
        <PathRow Icon={SoundIcon}  label="Sounds (facultatif)"    value={project.sounds} />
        {!project.vehicles && !project.addons && !project.sounds && (
          <div style={{ fontSize: 13, color: '#6d6d6d', padding: '8px 0' }}>
            Aucun dossier configuré.
          </div>
        )}
      </div>

      {/* Polices OFT */}
      {(project.fonts?.length || 0) > 0 && (
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title">
            <FontIcon fontSize={15} /> Polices OMSI — {project.fonts.length} fichier(s) .oft
          </div>
          {fontDetails.map((detail, i) => {
            if (!detail) return null
            const name = detail.oftPath.split(/[\\/]/).pop()
            return (
              <div key={`font-${detail.oftPath}-${i}`} style={{ padding: '10px 0',
                borderBottom: i < fontDetails.length - 1 ? '1px solid #3d3d3d' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <FontIcon fontSize={14} style={{ color: '#9d9d9d' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#d1d1d1' }}>{name}</span>
                  <span style={{ fontSize: 11, color: '#6d6d6d', fontFamily: 'monospace' }}>
                    (Windows-1252)
                  </span>
                </div>
                {detail.images.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 22 }}>
                    {detail.images.map((img, imgIdx) => (
                      <span key={`${img.name}-${imgIdx}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: img.exists ? 'rgba(108,203,95,0.08)' : 'rgba(252,61,57,0.08)',
                        border: `1px solid ${img.exists ? 'rgba(108,203,95,0.2)' : 'rgba(252,61,57,0.2)'}`,
                        color: img.exists ? '#6ccb5f' : '#fc3d39',
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace'
                      }}>
                        {img.exists ? '✓' : '✗'} {img.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#6d6d6d', paddingLeft: 22 }}>
                    Aucune image détectée dans ce .oft
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Chemin distant */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><CloudIcon fontSize={15} /> Dossier distant</div>
        <code style={{ fontSize: 12, color: '#d1d1d1', background: '#383838',
          padding: '4px 10px', borderRadius: 4, fontFamily: 'monospace', display: 'inline-block' }}>
          /srv/nerosy/backups/{project.name.replace(/\s+/g, '_')}/
        </code>
      </div>
    </div>
  )
}

// ── Modale Détail Version ──────────────────────────────────────────────────
function VersionDetailModal({ v, project, isAdmin, userCanPull, cinStatus,
                               installedEntry, isOperating, installing,
                               onInstall, onTogglePublish, onDeprecate,
                               actionLoading, onClose }) {
  const [showDowngradeWarning, setShowDowngradeWarning] = useState(false)

  const isPublished  = v.id === null || !!v.is_published
  const isDeprecated = !!v.is_deprecated
  const isDraft      = v.id !== null && !v.is_published
  const isInstalled  = !!cinStatus?.zipName && cinStatus.zipName === v.name
  const isActioning  = actionLoading === v.id
  const isDowngrade  = !isInstalled && installedEntry && v.modifyTime < installedEntry.modifyTime
  const isThis       = installing === v.name

  const handleInstallClick = () => {
    if (isDowngrade && !showDowngradeWarning) { setShowDowngradeWarning(true); return }
    onInstall(v)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#252525', border: '1px solid #3d3d3d', borderRadius: 10,
        width: 480, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.65)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #333',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: isDeprecated ? '#9d9d9d' : '#fff' }}>
                {v.version_name ?? v.versionName}
              </span>
              {isDraft && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(150,150,150,0.15)', border: '1px solid rgba(150,150,150,0.3)',
                  color: '#9d9d9d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Brouillon
                </span>
              )}
              {isDeprecated && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(252,61,57,0.12)', border: '1px solid rgba(252,61,57,0.3)',
                  color: '#fc3d39', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Périmée
                </span>
              )}
              {isInstalled && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(108,203,95,0.15)', border: '1px solid rgba(108,203,95,0.35)',
                  color: '#6ccb5f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Installée
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#6d6d6d', marginTop: 5 }}>
              <CalIcon fontSize={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {v.modifyTime ? formatDate(v.modifyTime) : '—'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            color: '#6d6d6d', cursor: 'pointer', fontSize: 16, padding: '2px 6px',
            borderRadius: 4, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
            ✕
          </button>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px',
          display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Section Admin */}
          {isAdmin && v.id != null && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid #3a3a3a', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Checkbox
                checked={isPublished}
                disabled={isActioning}
                onChange={(_, d) => onTogglePublish(v, d.checked)}
                label={<span style={{ fontSize: 13, color: '#d1d1d1' }}>Publier</span>}
              />
              {!isDeprecated && (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={isActioning ? <Spinner size="tiny" /> : <DeprecateIcon />}
                  onClick={() => onDeprecate(v)}
                  disabled={isActioning}
                  style={{ color: '#f0a030' }}>
                  Deprecate
                </Button>
              )}
              {isActioning && <Spinner size="tiny" />}
            </div>
          )}

          {/* Infos fichier */}
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: '#6d6d6d', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Taille
              </div>
              <div style={{ fontSize: 13, color: '#d1d1d1' }}>
                {formatBytes(v.file_size ?? v.size)}
              </div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: '#6d6d6d', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fichier
              </div>
              <div style={{ fontSize: 11, color: '#5d5d5d', fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={v.name}>
                {v.name || '—'}
              </div>
            </div>
          </div>

          {/* Changelog */}
          <div>
            <div style={{ fontSize: 11, color: '#6d6d6d', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Changelog
            </div>
            {isDeprecated ? (
              <div style={{ fontSize: 12, color: '#6d6d6d', fontStyle: 'italic', lineHeight: 1.6,
                padding: '8px 12px', background: 'rgba(252,61,57,0.05)',
                border: '1px solid rgba(252,61,57,0.15)', borderRadius: 5 }}>
                Le contenu de cette version n'est plus disponible (Version périmée).
              </div>
            ) : v.changelog ? (
              <div style={{
                fontSize: 13, color: '#b0b0b0', lineHeight: 1.7,
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.25)', borderRadius: 5,
                borderLeft: '2px solid #3d3d3d',
                overflowX: 'auto'
              }}
                className="cin-markdown"
              >
                <ReactMarkdown>{v.changelog}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#5d5d5d', fontStyle: 'italic' }}>
                Aucun changement renseigné.
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #333' }}>
          {/* Bandeau downgrade */}
          {showDowngradeWarning && (
            <div style={{ padding: '8px 12px', borderRadius: 5, marginBottom: 10,
              background: 'rgba(240,160,48,0.09)', border: '1px solid rgba(240,160,48,0.3)',
              display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <WarningIcon fontSize={14} style={{ color: '#f0a030', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12, color: '#f0a030', lineHeight: 1.55 }}>
                Cette version est antérieure à la version actuellement installée.
                Continuer peut provoquer des incompatibilités.
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button appearance="secondary" onClick={onClose}>Fermer</Button>
            {userCanPull && !isDeprecated && (
              <Button
                appearance="primary"
                style={showDowngradeWarning ? { background: '#f0a030', borderColor: 'transparent' } : {}}
                icon={isThis ? <Spinner size="tiny" /> : isInstalled ? <ArrowSyncIcon /> : <PullIcon />}
                onClick={handleInstallClick}
                disabled={isOperating || !!installing}>
                {isThis
                  ? 'Installation...'
                  : showDowngradeWarning
                    ? 'Continuer quand même'
                    : isInstalled
                      ? 'Réparer'
                      : 'Installer'}
              </Button>
            )}
            {!userCanPull && !isDeprecated && (
              <Button appearance="secondary" disabled>Permission requise</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Onglet Versions ────────────────────────────────────────────────────────
function TabVersions({ project, settings, onInstall, isOperating, cinStatus, refreshTrigger, userCanPull, userCanPush, user }) {
  const [versions,        setVersions]        = useState([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [installing,      setInstalling]      = useState(null)
  const [actionLoading,   setActionLoading]   = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)

  const isAdmin = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  const isConfigured = settings.vpsIp && settings.vpsUser && settings.sshKeyPath

  const loadVersions = useCallback(async () => {
    if (!isConfigured) return
    setLoading(true); setError(null)
    try {
      const [sftpRes, apiVersions] = await Promise.allSettled([
        window.api.sftp.listVersions(project, settings),
        projectService.getVersions(project.id)
      ])

      if (sftpRes.status === 'rejected' || !sftpRes.value?.success) {
        setError(sftpRes.value?.error || sftpRes.reason?.message || 'Erreur SFTP')
        return
      }

      const sftpByZip         = {}
      const sftpByVersionName = {}
      sftpRes.value.versions.forEach(v => {
        sftpByZip[v.name] = v
        if (v.versionName) sftpByVersionName[v.versionName] = v
      })

      if (apiVersions.status === 'fulfilled') {
        const raw     = apiVersions.value
        const sqlList = Array.isArray(raw) ? raw : (raw?.versions || raw?.history || [])
        const merged  = sqlList.map(m => {
          const zipKey = m.zip_name || m.zipName
          const sftp   = sftpByZip[zipKey] || (!zipKey ? sftpByVersionName[m.version_name] : null)
          return {
            name:          sftp?.name || zipKey || '',
            versionName:   sftp?.versionName || m.version_name,
            modifyTime:    sftp?.modifyTime   || 0,
            id:            m.id ?? m.version_id ?? null,
            version_name:  m.version_name,
            zip_name:      sftp?.name || zipKey,
            file_size:     m.file_size ?? sftp?.size,
            is_published:  m.is_published,
            is_deprecated: m.is_deprecated,
            changelog:     m.changelog
          }
        })
        setVersions([...merged].sort((a, b) => b.modifyTime - a.modifyTime))
      } else {
        const fallback = sftpRes.value.versions.map(v => ({ ...v, id: null, is_published: null, is_deprecated: false }))
        setVersions([...fallback].sort((a, b) => b.modifyTime - a.modifyTime))
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [project, settings, isConfigured])

  useEffect(() => { loadVersions() }, [loadVersions])
  useEffect(() => { if (refreshTrigger > 0) loadVersions() }, [refreshTrigger])

  // Synchronise la version sélectionnée après un reload (publish/deprecate)
  useEffect(() => {
    if (!selectedVersion) return
    const updated = versions.find(v => v.id != null && v.id === selectedVersion.id)
                 || versions.find(v => v.name === selectedVersion.name)
    if (updated) setSelectedVersion(updated)
  }, [versions])

  const doInstall = async (v) => {
    setInstalling(v.name)
    await onInstall(v.name, { versionName: v.version_name ?? v.versionName, changelog: v.changelog })
    setInstalling(null)
    loadVersions()
  }

  const installedEntry = cinStatus?.zipName
    ? versions.find(v => v.name === cinStatus.zipName) : null

  const handleTogglePublish = async (v, checked) => {
    if (!v.id) return
    setActionLoading(v.id)
    try {
      if (checked) await projectService.publishVersion(project.id, v.id)
      else         await projectService.unpublishVersion(project.id, v.id)
      await loadVersions()
    } catch (e) {
      console.error('[Cinnamon] Erreur toggle publication:', e?.response?.data || e.message)
    } finally { setActionLoading(null) }
  }

  const handleDeprecate = async (v) => {
    if (!v.id) return
    setActionLoading(v.id)
    try {
      await projectService.deprecateVersion(project.id, v.id)
      await loadVersions()
    } catch (e) {
      console.error('[Cinnamon] Erreur dépréciation:', e?.response?.data || e.message)
    } finally { setActionLoading(null) }
  }

  if (!isConfigured) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <div style={{ fontSize: 13, color: '#fce100' }}>
          Configurez d'abord la connexion au serveur dans les Paramètres.
        </div>
      </div>
    )
  }

  const visibleVersions = versions.filter(
    v => userCanPush || (v.id !== null && !!v.is_published)
  )

  return (
    <>
      {/* ── Modale Détail Version ── */}
      {selectedVersion && (
        <VersionDetailModal
          v={selectedVersion}
          project={project}
          isAdmin={isAdmin}
          userCanPull={userCanPull}
          cinStatus={cinStatus}
          installedEntry={installedEntry}
          isOperating={isOperating}
          installing={installing}
          onInstall={doInstall}
          onTogglePublish={handleTogglePublish}
          onDeprecate={handleDeprecate}
          actionLoading={actionLoading}
          onClose={() => setSelectedVersion(null)}
        />
      )}

      <div className="w11-card" style={{ marginBottom: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="w11-card-title" style={{ marginBottom: 0 }}>
            <CloudIcon fontSize={15} /> Versions disponibles
            {visibleVersions.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6d6d6d',
                background: '#383838', padding: '2px 8px', borderRadius: 10 }}>
                {visibleVersions.length}
              </span>
            )}
          </div>
          <Button appearance="subtle" icon={<RefreshIcon />} onClick={loadVersions} disabled={loading}>
            {loading ? <Spinner size="tiny" /> : 'Actualiser'}
          </Button>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0', gap: 10 }}>
            <Spinner size="small" />
            <span style={{ color: '#9d9d9d', fontSize: 13 }}>Connexion au serveur...</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '12px 14px', background: 'rgba(252,61,57,0.08)',
            border: '1px solid rgba(252,61,57,0.25)', borderRadius: 6, fontSize: 13, color: '#fc3d39' }}>
            Impossible de se connecter : {error}
          </div>
        )}

        {!loading && !error && visibleVersions.length === 0 && (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-icon"><CloudIcon fontSize={40} /></div>
            <div style={{ fontSize: 13, color: '#9d9d9d' }}>Aucune version disponible.</div>
            <div style={{ fontSize: 11, color: '#6d6d6d' }}>
              Effectuez un premier PUSH pour créer une version.
            </div>
          </div>
        )}

        {!loading && !error && visibleVersions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleVersions.map((v, i) => {
              const isLatest     = i === 0
              const isPublished  = v.id === null || !!v.is_published
              const isDraft      = v.id !== null && !v.is_published
              const isDeprecated = !!v.is_deprecated
              const isInstalled  = !!cinStatus?.zipName && cinStatus.zipName === v.name
              return (
                <div
                  key={v.name}
                  onClick={() => { console.log('Détails de la version ouverte :', v); setSelectedVersion(v) }}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 14px', borderRadius: 6,
                    background: isDeprecated ? 'rgba(252,61,57,0.04)' : isDraft ? 'rgba(255,255,255,0.03)' : isLatest ? 'rgba(15,108,189,0.08)' : '#383838',
                    border: `1px solid ${isDeprecated ? 'rgba(252,61,57,0.2)' : isDraft ? '#454545' : isLatest ? 'rgba(96,205,255,0.25)' : '#454545'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    transition: 'filter 0.1s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.12)'}
                  onMouseLeave={e => e.currentTarget.style.filter = ''}
                >
                  {/* Nom + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isDeprecated ? '#9d9d9d' : '#fff' }}>
                      {v.version_name ?? v.versionName}
                    </span>
                    {isLatest && !isDraft && !isDeprecated && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(15,108,189,0.3)', border: '1px solid rgba(96,205,255,0.4)',
                        color: '#60cdff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Dernière
                      </span>
                    )}
                    {isDraft && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(150,150,150,0.15)', border: '1px solid rgba(150,150,150,0.3)',
                        color: '#9d9d9d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Brouillon
                      </span>
                    )}
                    {isDeprecated && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(252,61,57,0.12)', border: '1px solid rgba(252,61,57,0.3)',
                        color: '#fc3d39', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Périmée
                      </span>
                    )}
                    {isInstalled && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                        background: 'rgba(108,203,95,0.15)', border: '1px solid rgba(108,203,95,0.35)',
                        color: '#6ccb5f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Installée
                      </span>
                    )}
                  </div>
                  {/* Date */}
                  <span style={{ fontSize: 11, color: '#6d6d6d', flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CalIcon fontSize={11} /> {formatDate(v.modifyTime)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Onglet Équipe ──────────────────────────────────────────────────────────
function TabTeam({ project, user }) {
  const [members,       setMembers]       = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [searchError,   setSearchError]   = useState(null)
  const [adding,        setAdding]        = useState(false)
  const [updatingId,    setUpdatingId]    = useState(null)
  const [removingId,    setRemovingId]    = useState(null)
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const searchRef = useRef(null)

  const ownerEmail = project.owner?.email || ''

  // Propriétaire ou super_admin — Number() neutralise les écarts string/int
  const isAdmin = user && project && (
    Number(user.id) === Number(project.owner_id) ||
    user.role === 'super_admin'
  )

  // Fermer le dropdown en cliquant en dehors
  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const loadMembers = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await projectService.getMembers(project.id)
      setMembers(Array.isArray(data) ? data : (data?.members || []))
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Erreur lors du chargement.')
    } finally { setLoading(false) }
  }, [project.id])

  useEffect(() => { loadMembers() }, [loadMembers])

  // Recherche avec debounce 400 ms → GET /users/search?q=...
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]); setDropdownOpen(false); return
    }
    const timer = setTimeout(async () => {
      setSearching(true); setSearchError(null)
      try {
        const data = await projectService.searchUsers(searchQuery)
        const results = Array.isArray(data) ? data : (data?.users || [])
        setSearchResults(results)
        setDropdownOpen(results.length > 0 || true) // ouvre même si vide (afficher "aucun résultat")
      } catch (e) {
        setSearchError(e?.response?.data?.message || e?.message || 'Erreur de recherche.')
        setSearchResults([])
        setDropdownOpen(true)
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Résout l'user_id réel d'un membre : priorité à user_id (ID utilisateur)
  // puis fallback sur id (ID de ligne project_members) si user_id absent
  const resolveUid = (m) => String(m.user_id ?? m.id)

  // Set des user_ids déjà membres (pour la détection "Déjà membre" dans la recherche)
  const memberIdSet = new Set(members.map(resolveUid))

  const handleAdd = async (found) => {
    setAdding(true); setSearchError(null)
    try {
      console.log('POST /projects/:id/members — payload:', { user_id: found.id, can_pull: true, can_push: false })
      await projectService.addMember(project.id, { user_id: found.id, can_pull: true, can_push: false })
      setSearchQuery(''); setSearchResults([]); setDropdownOpen(false)
      await loadMembers()
    } catch (e) {
      setSearchError(e?.response?.data?.message || e?.message || 'Impossible d\'ajouter ce membre.')
    } finally { setAdding(false) }
  }

  const handlePermission = async (userId, field, value) => {
    const uid = String(userId)
    setUpdatingId(uid)
    // Sauvegarde de l'état précédent pour rollback
    const previous = members.find(m => resolveUid(m) === uid)
    // Mise à jour optimiste
    setMembers(prev => prev.map(m => resolveUid(m) === uid ? { ...m, [field]: value } : m))
    try {
      console.log(`PATCH /projects/${project.id}/members/${userId} —`, { [field]: value })
      await projectService.updateMember(project.id, userId, { [field]: value })
    } catch (e) {
      // Rollback ciblé
      if (previous) {
        setMembers(prev => prev.map(m => resolveUid(m) === uid ? previous : m))
      } else {
        await loadMembers()
      }
      setError(e?.response?.data?.message || e?.message || 'Mise à jour impossible.')
      setTimeout(() => setError(null), 4000)
    } finally { setUpdatingId(null) }
  }

  const handleRemove = async (userId) => {
    setRemovingId(String(userId))
    try {
      await projectService.removeMember(project.id, userId)
      setMembers(prev => prev.filter(m => resolveUid(m) !== String(userId)))
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Suppression impossible.')
    } finally { setRemovingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Propriétaire */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div className="w11-card-title"><PersonIcon fontSize={15} /> Propriétaire</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: 'rgba(96,205,255,0.15)',
            border: '1px solid rgba(96,205,255,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <PersonIcon fontSize={18} style={{ color: '#60cdff' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d1d1' }}>
              {project.owner
                ? `${project.owner.first_name || ''} ${project.owner.last_name || ''}`.trim()
                  + (project.owner.username ? ` (@${project.owner.username})` : '')
                : 'Chargement…'}
            </div>
            {ownerEmail && (
              <div style={{ fontSize: 11, color: '#6d6d6d' }}>{ownerEmail}</div>
            )}
          </div>
        </div>
      </div>

      {/* Liste des membres */}
      <div className="w11-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="w11-card-title" style={{ marginBottom: 0 }}>
            <PeopleIcon fontSize={15} /> Membres de l'équipe
            {members.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#6d6d6d',
                background: '#383838', padding: '2px 8px', borderRadius: 10 }}>
                {members.length}
              </span>
            )}
          </div>
          <Button appearance="subtle" icon={<RefreshIcon />} onClick={loadMembers} disabled={loading} />
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: 8 }}>
            <Spinner size="small" />
            <span style={{ color: '#9d9d9d', fontSize: 13 }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '10px 14px', background: 'rgba(252,61,57,0.08)',
            border: '1px solid rgba(252,61,57,0.25)', borderRadius: 6, fontSize: 13, color: '#fc3d39' }}>
            {error}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div style={{ fontSize: 13, color: '#6d6d6d', fontStyle: 'italic', padding: '8px 0' }}>
            Aucun membre pour le moment.
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ color: '#9d9d9d', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Utilisateur
                </TableHeaderCell>
                {/* Largeurs fixes pour aligner les switches */}
                <TableHeaderCell style={{ width: 80, color: '#9d9d9d', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>Pull</div>
                </TableHeaderCell>
                <TableHeaderCell style={{ width: 80, color: '#9d9d9d', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>Push</div>
                </TableHeaderCell>
                {isAdmin && <TableHeaderCell style={{ width: 44 }} />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                // uid = user_id réel (pour l'API et la comparaison owner)
                const uid       = resolveUid(m)
                // rowKey = id de la ligne project_members (unique pour React)
                const rowKey    = String(m.id ?? uid)
                const isOwner   = Number(m.user_id ?? m.id) === Number(project.owner_id)
                const fullName  = `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim() || m.email
                const isUpdating = updatingId === uid
                const isRemoving = removingId === uid
                // Switches non-modifiables pour le propriétaire (non présent dans project_members)
                const switchDisabled = !isAdmin || isUpdating || isOwner
                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      <TableCellLayout>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isOwner ? 'rgba(96,205,255,0.15)' : '#454545',
                            border: isOwner ? '1px solid rgba(96,205,255,0.3)' : 'none',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0
                          }}>
                            <PersonIcon fontSize={14} style={{ color: isOwner ? '#60cdff' : '#9d9d9d' }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, color: '#d1d1d1', fontWeight: 500 }}>{fullName}</span>
                              {isOwner && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, color: '#60cdff',
                                  background: 'rgba(96,205,255,0.12)',
                                  border: '1px solid rgba(96,205,255,0.25)',
                                  padding: '1px 6px', borderRadius: 4,
                                }}>
                                  Propriétaire
                                </span>
                              )}
                            </div>
                            {m.email && fullName !== m.email && (
                              <div style={{ fontSize: 11, color: '#6d6d6d' }}>{m.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCellLayout>
                    </TableCell>

                    {/* Cellule Pull — switch centré + spinner pendant la requête */}
                    <TableCell style={{ width: 80, padding: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                        height: '100%', minHeight: 36 }}>
                        {isUpdating
                          ? <Spinner size="tiny" />
                          : (
                            <Switch
                              checked={isOwner ? true : !!m.can_pull}
                              disabled={switchDisabled}
                              onChange={(_, { checked }) => handlePermission(uid, 'can_pull', checked)}
                            />
                          )
                        }
                      </div>
                    </TableCell>

                    {/* Cellule Push */}
                    <TableCell style={{ width: 80, padding: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                        height: '100%', minHeight: 36 }}>
                        {isUpdating
                          ? <Spinner size="tiny" />
                          : (
                            <Switch
                              checked={isOwner ? true : !!m.can_push}
                              disabled={switchDisabled}
                              onChange={(_, { checked }) => handlePermission(uid, 'can_push', checked)}
                            />
                          )
                        }
                      </div>
                    </TableCell>

                    {isAdmin && (
                      <TableCell style={{ width: 44, padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={isRemoving ? <Spinner size="tiny" /> : <PersonDeleteIcon />}
                            disabled={!!removingId || isOwner}
                            onClick={() => handleRemove(uid)}
                            style={{ color: '#fc3d39' }}
                            title="Retirer de l'équipe"
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invitation — visible seulement pour le propriétaire / admin */}
      {isAdmin && (
        <div className="w11-card" style={{ marginBottom: 0 }}>
          <div className="w11-card-title"><PersonAddIcon fontSize={15} /> Inviter un utilisateur</div>

          <div style={{ position: 'relative' }}>
            {/* Champ de recherche avec ref pour fermeture click-outside */}
            <div ref={searchRef} style={{ position: 'relative' }}>
              <Input
                value={searchQuery}
                onChange={(_, { value }) => { setSearchQuery(value); setDropdownOpen(true) }}
                onFocus={() => searchQuery.length >= 2 && setDropdownOpen(true)}
                placeholder="Rechercher par nom, username ou e-mail…"
                style={{ width: '100%' }}
                contentAfter={searching ? <Spinner size="tiny" /> : undefined}
                disabled={adding}
              />

              {/* Dropdown résultats — z-index élevé, jamais clippé */}
              {dropdownOpen && searchQuery.length >= 2 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  zIndex: 200, borderRadius: 6, overflow: 'hidden',
                  background: 'var(--colorNeutralBackground1)',
                  border: '1px solid var(--colorNeutralStroke1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {/* Ligne "chargement" */}
                  {searching && (
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                      color: 'var(--colorNeutralForeground4)', fontSize: 12 }}>
                      <Spinner size="tiny" /> Recherche en cours…
                    </div>
                  )}

                  {/* Résultats */}
                  {!searching && searchResults.map(u => {
                    const uName = `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim()
                      || u.username || u.email
                    const alreadyMember = memberIdSet.has(String(u.id))
                    return (
                      <div key={u.id} style={{
                        padding: '9px 14px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', gap: 12,
                        borderBottom: '1px solid var(--colorNeutralStroke3)',
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--colorNeutralForeground1)', fontWeight: 500 }}>
                            {uName}
                            {u.username && uName !== u.username && (
                              <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)', marginLeft: 6 }}>
                                @{u.username}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)' }}>{u.email}</div>
                        </div>
                        {alreadyMember ? (
                          <span style={{ fontSize: 11, color: 'var(--colorNeutralForeground4)', whiteSpace: 'nowrap',
                            fontStyle: 'italic' }}>
                            Déjà membre
                          </span>
                        ) : (
                          <Button
                            size="small"
                            appearance="primary"
                            icon={adding ? <Spinner size="tiny" /> : <PersonAddIcon />}
                            disabled={adding}
                            onClick={() => handleAdd(u)}
                          >
                            Ajouter
                          </Button>
                        )}
                      </div>
                    )
                  })}

                  {/* Aucun résultat */}
                  {!searching && searchResults.length === 0 && (
                    <div style={{ padding: '10px 14px', fontSize: 12,
                      color: 'var(--colorNeutralForeground4)', fontStyle: 'italic' }}>
                      Aucun utilisateur trouvé pour « {searchQuery} ».
                    </div>
                  )}
                </div>
              )}
            </div>

            {searchError && (
              <div style={{ fontSize: 12, color: '#fc3d39', marginTop: 6 }}>{searchError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────
export default function ProjectDetailPage({ project, onNavigate, user }) {
  const [settings,       setSettings]       = useState({})
  const [thumb,          setThumb]          = useState(null)
  const [fontDetails,    setFontDetails]    = useState([])
  const [activeTab,      setActiveTab]      = useState('description')
  const [cinStatus,           setCinStatus]           = useState(null)
  const [isUninstalling,      setIsUninstalling]      = useState(false)
  const [versionsRefreshTrigger, setVersionsRefreshTrigger] = useState(0)
  const [latestCloudVersion,  setLatestCloudVersion]  = useState(null)
  const [knownZipNames,       setKnownZipNames]       = useState(new Set())
  // null = pas encore chargé (évite faux positif "Paquet externe" au démarrage)
  // Set vide = chargé, aucune version publiée → tout paquet installé est externe
  const [publishedZipNames,   setPublishedZipNames]   = useState(null)
  const [allSqlZipNames,      setAllSqlZipNames]      = useState(null)
  const [busFiles,            setBusFiles]            = useState([])
  // Version enrichie du projet (avec owner, membres, etc.) récupérée depuis GET /projects/:id
  const [fullProject,         setFullProject]         = useState(project)

  // Dialog de nommage PUSH
  const [pushDialogOpen, setPushDialogOpen] = useState(false)

  // Modale PUSH
  const [pushOpen,     setPushOpen]     = useState(false)
  const [pushStep,     setPushStep]     = useState(null)
  const [pushProgress, setPushProgress] = useState(null)
  const [pushResult,   setPushResult]   = useState(null)

  // Modale PULL (install)
  const [pullOpen,     setPullOpen]     = useState(false)
  const [pullStep,     setPullStep]     = useState(null)
  const [pullProgress, setPullProgress] = useState(null)
  const [pullResult,   setPullResult]   = useState(null)

  useEffect(() => {
    // Récupère la version enrichie du projet (owner + permissions via LEFT JOIN)
    projectService.getById(project.id)
      .then(data => {
        const p = data?.project || data
        console.log('[Cinnamon] getById réponse brute:', p)
        if (p?.id) setFullProject(prev => ({ ...prev, ...p }))
      })
      .catch(() => {}) // silencieux — on garde le projet de la liste

    window.api.settings.get().then(s => {
      setSettings(s)
      window.api.cinnamon.readStatus(project, s).then(setCinStatus)
    })
    if (project.thumbnailPath) {
      window.api.file.readAsDataUrl(project.thumbnailPath).then(setThumb)
    }
    Promise.all([...new Set(project.fonts || [])].map(f => window.api.oft.parse(f))).then(setFontDetails)
    // Scanne les fichiers .bus du dossier Vehicles
    if (project.vehicles) {
      window.api.projects.parseBusFiles(project.vehicles).then(setBusFiles).catch(() => {})
    }
  }, [project])

  const refreshCinStatus = useCallback(() => {
    window.api.cinnamon.readStatus(project, settings).then(setCinStatus)
  }, [project, settings])

  // Recharge les métadonnées SQL + SFTP pour la section Description > Déploiement
  const refreshDeploymentData = useCallback(() => {
    if (!settings.vpsIp || !settings.vpsUser || !settings.sshKeyPath) return
    Promise.all([
      window.api.sftp.listVersions(project, settings),
      projectService.getVersions(project.id).catch(() => null)
    ]).then(([sftpRes, sqlVersions]) => {
      const sftpByVersionName = {}
      if (sftpRes?.success) {
        sftpRes.versions.forEach(v => { if (v.versionName) sftpByVersionName[v.versionName] = v.name })
        setKnownZipNames(new Set(sftpRes.versions.map(v => v.name)))
      }
      if (sqlVersions) {
        const list = Array.isArray(sqlVersions) ? sqlVersions : (sqlVersions?.versions || [])
        const resolveZip = m => m.zip_name || m.zipName || sftpByVersionName[m.version_name] || null
        setAllSqlZipNames(new Set(list.map(resolveZip).filter(Boolean)))
        const pubList = list.filter(v => !!v.is_published && !v.is_deprecated)
        setPublishedZipNames(new Set(pubList.map(resolveZip).filter(Boolean)))
        const latestPub = pubList
          .map(m => ({ name: resolveZip(m), versionName: m.version_name, changelog: m.changelog }))
          .filter(e => e.name)
          .sort((a, b) => b.name.localeCompare(a.name))[0] || null
        setLatestCloudVersion(latestPub)
      } else if (sftpRes?.success && sftpRes.versions?.length > 0) {
        const sorted = [...sftpRes.versions].sort((a, b) => b.modifyTime - a.modifyTime)
        setLatestCloudVersion(sorted[0])
      }
    }).catch(() => {})
  }, [project, settings])

  // Chargement initial des données de déploiement (après que settings soit prêt)
  useEffect(() => { refreshDeploymentData() }, [refreshDeploymentData])
  // Rafraîchissement après push/publish/unpublish/deprecate
  useEffect(() => { if (versionsRefreshTrigger > 0) refreshDeploymentData() }, [versionsRefreshTrigger, refreshDeploymentData])

  if (!project) return null

  const isConfigured = settings.vpsIp && settings.vpsUser && settings.sshKeyPath
  const isOperating  = pushOpen || pullOpen

  // Droits de l'utilisateur courant
  const isOwnerOrAdmin = user && fullProject && (
    Number(user.id) === Number(fullProject.owner_id) ||
    user.role === 'super_admin'
  )
  // Cherche le membre courant dans members[] OU dans les champs directs du projet (LEFT JOIN backend)
  const currentMember = fullProject?.members?.find(
    m => Number(m.user_id ?? m.id) === Number(user?.id)
  )
  const memberCanPush = !!(currentMember?.can_push ?? fullProject?.can_push)
  const memberCanPull = !!(currentMember?.can_pull ?? fullProject?.can_pull)
  const userCanPush = isOwnerOrAdmin || memberCanPush
  const userCanPull = isOwnerOrAdmin || memberCanPull

  console.log('[Cinnamon] Droits calculés pour l\'UI:', {
    userId: user?.id,
    ownerId: fullProject?.owner_id,
    isOwnerOrAdmin,
    currentMember,
    memberCanPush,
    memberCanPull,
    userCanPush,
    userCanPull,
    fullProjectKeys: fullProject ? Object.keys(fullProject) : null
  })

  // ── PUSH ─────────────────────────────────────────────────────────────────
  const openPushDialog = () => setPushDialogOpen(true)

  const startPush = async (versionMeta) => {
    setPushDialogOpen(false)
    setPushOpen(true); setPushStep(null); setPushProgress(null); setPushResult(null)
    window.api.sync.offStep(); window.api.sync.offProgress()
    window.api.sync.onStep(setPushStep)
    window.api.sync.onProgress(setPushProgress)
    try {
      const result = await window.api.sync.start(project, settings, versionMeta)
      setPushResult(result)
      if (result?.success) {
        // Enregistre la version dans la base SQL
        try {
          await projectService.registerVersion(project.id, {
            version_name: result.versionName,
            zip_name:     result.zipName,
            file_size:    result.zipSizeBytes,
            changelog:    versionMeta?.changelog || ''
          })
        } catch (e) {
          console.warn('[Cinnamon] Version non enregistrée en base:', e?.response?.data || e.message)
        }
        refreshCinStatus()
        setVersionsRefreshTrigger(t => t + 1)
      }
    } catch (e) {
      setPushResult({ success: false, logs: [], error: e.message })
    } finally {
      window.api.sync.offStep(); window.api.sync.offProgress()
    }
  }

  const closePush = () => {
    setPushOpen(false); setPushStep(null); setPushProgress(null); setPushResult(null)
  }

  // ── PULL (version spécifique depuis onglet Versions) ──────────────────────
  const installVersion = async (zipName, versionMeta) => {
    setPullOpen(true); setPullStep(null); setPullProgress(null); setPullResult(null)
    window.api.sync.offStep(); window.api.sync.offProgress()
    window.api.sync.onStep(setPullStep)
    window.api.sync.onProgress(setPullProgress)
    try {
      const result = await window.api.pull.install(project, settings, zipName, versionMeta)
      setPullResult(result)
    } catch (e) {
      setPullResult({ success: false, logs: [], error: e.message })
    } finally {
      window.api.sync.offStep(); window.api.sync.offProgress()
    }
  }

  const closePull = () => {
    setPullOpen(false); setPullStep(null); setPullProgress(null); setPullResult(null)
    refreshCinStatus()
  }

  // ── Mise à jour rapide (depuis section Déploiement) ──────────────────────
  const handleInstallLatest = () => {
    if (!latestCloudVersion) return
    installVersion(latestCloudVersion.name, {
      versionName: latestCloudVersion.versionName,
      changelog:   latestCloudVersion.changelog
    })
  }

  // ── Désinstallation ───────────────────────────────────────────────────────
  const handleUninstall = async () => {
    setIsUninstalling(true)
    try {
      await window.api.cinnamon.uninstall(project, settings)
      setCinStatus(null)
    } finally {
      setIsUninstalling(false)
    }
  }

  return (
    <div className="fade-in">
      {/* Dialog de nommage */}
      <PushDialog
        open={pushDialogOpen}
        projectName={project.name}
        onConfirm={startPush}
        onCancel={() => setPushDialogOpen(false)}
      />

      {/* Modales */}
      <SyncModal open={pushOpen} step={pushStep} progress={pushProgress}
        result={pushResult} onClose={closePush} mode="push" />
      <SyncModal open={pullOpen} step={pullStep} progress={pullProgress}
        result={pullResult} onClose={closePull} mode="pull" />

      {/* ── Barre de titre / Breadcrumb ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, gap: 12 }}>

        {/* Breadcrumb gauche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button appearance="subtle" icon={<BackIcon />}
            onClick={() => onNavigate('projects')}
            style={{ color: '#9d9d9d', padding: '4px 10px' }}>
            Projets
          </Button>
          <span style={{ color: '#4d4d4d', fontSize: 14 }}>/</span>
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>{project.name}</span>
        </div>

        {/* Bouton PUSH droite — grisé si pas de permission ou chemins locaux non configurés */}
        {(() => {
          const hasLocalPaths = !!(project.vehicles || project.addons || project.sounds || project.fonts?.length)
          const pushDisabled  = !isConfigured || isOperating || !userCanPush || !hasLocalPaths
          const pushTitle     = !userCanPush   ? 'Permission requise'
                              : !hasLocalPaths ? 'Configurez les chemins locaux du projet (icône crayon)'
                              : undefined
          const pushLabel     = !userCanPush   ? 'Permission requise'
                              : !hasLocalPaths ? 'Chemins non configurés'
                              : 'PUSH vers le serveur'
          return (
            <Button
              appearance="primary"
              icon={<PushIcon />}
              onClick={pushDisabled ? undefined : openPushDialog}
              disabled={pushDisabled}
              title={pushTitle}
            >
              {pushLabel}
            </Button>
          )
        })()}
      </div>

      {/* ── Hero compact ───────────────────────────────────────────────────── */}
      <div className="w11-card" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden',
          background: '#383838', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {thumb
            ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <BusIcon fontSize={32} style={{ color: '#4d4d4d' }} />
          }
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{project.name}</div>
          {project.description && (
            <div style={{ fontSize: 12, color: '#9d9d9d', marginTop: 2, maxWidth: 500,
              overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {project.description}
            </div>
          )}
          {!isConfigured && (
            <div style={{ fontSize: 11, color: '#fce100', marginTop: 4 }}>
              ⚠ Serveur non configuré — rendez-vous dans les Paramètres
            </div>
          )}
        </div>
      </div>

      {/* ── TabList ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, { value }) => setActiveTab(value)}
        >
          <Tab value="description" icon={<ImageIcon />}>Description</Tab>
          {userCanPull && (
            <Tab value="contenu" icon={<FolderIcon />}>Contenu</Tab>
          )}
          <Tab value="versions" icon={<CloudIcon />}>Dépôts</Tab>
          {isOwnerOrAdmin && (
            <Tab value="team" icon={<TeamIcon />}>Équipe</Tab>
          )}
        </TabList>
      </div>

      {/* ── Contenu des onglets ─────────────────────────────────────────────── */}
      {activeTab === 'description' && (
        <TabDescription
          project={project}
          thumb={thumb}
          cinStatus={cinStatus}
          onUninstall={handleUninstall}
          isUninstalling={isUninstalling}
          latestCloudVersion={latestCloudVersion}
          onInstallLatest={handleInstallLatest}
          busFiles={busFiles}
          knownZipNames={userCanPush ? allSqlZipNames : publishedZipNames}
          canDeploy={userCanPull || isOwnerOrAdmin}
        />
      )}

      {activeTab === 'contenu' && userCanPull && (
        <TabContenu project={project} fontDetails={fontDetails} />
      )}

      {activeTab === 'versions' && (
        <TabVersions
          project={fullProject || project}
          settings={settings}
          onInstall={installVersion}
          isOperating={isOperating}
          cinStatus={cinStatus}
          refreshTrigger={versionsRefreshTrigger}
          userCanPull={userCanPull}
          userCanPush={userCanPush}
          user={user}
        />
      )}

      {activeTab === 'team' && isOwnerOrAdmin && (
        <TabTeam project={fullProject} user={user} />
      )}
    </div>
  )
}
