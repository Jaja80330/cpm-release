import React, { useState, useEffect, useRef, useCallback } from 'react'
import BusEditorTab from './BusEditorTab'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import StopOutlinedIcon from '@mui/icons-material/StopOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

// ── Palette console ──────────────────────────────────────────────────────────
const C = {
  bg:      '#07090c',
  bgCard:  '#0d1014',
  bgRow:   '#0f1318',
  bgRowAlt:'#111519',
  warning: '#f0a030',
  error:   '#fc3d39',
  muted:   '#5a6270',
  border:  'rgba(255,255,255,0.06)',
}

const MONO = "'Cascadia Code', 'Consolas', 'Courier New', monospace"

// ── Helpers ──────────────────────────────────────────────────────────────────
function countByType(entries) {
  let w = 0, e = 0
  entries.forEach(en => { if (en.type === 'warning') w++; else e++ })
  return { warnings: w, errors: e }
}

// ── Composant Logfile ─────────────────────────────────────────────────────────
function TabLogfile({ omsiPath }) {
  const [filter,   setFilter]   = useState('all')   // 'all' | 'warning' | 'error'
  const [liveMode, setLiveMode] = useState(false)
  const [parsing,  setParsing]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [errMsg,   setErrMsg]   = useState(null)
  const listRef = useRef(null)

  // ── Parsing manuel ──────────────────────────────────────────────────────
  const runParse = useCallback(async () => {
    if (!omsiPath) return
    setParsing(true); setErrMsg(null)
    try {
      const res = await window.api.omsi.parseLog(omsiPath)
      if (res.success) setResult(res)
      else setErrMsg(res.error)
    } catch (e) {
      setErrMsg(e.message)
    } finally {
      setParsing(false)
    }
  }, [omsiPath])

  // ── Mode Live ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!liveMode || !omsiPath) return

    window.api.omsi.onLogUpdate((data) => {
      if (data.success) setResult(data)
      else setErrMsg(data.error)
    })
    window.api.omsi.watchStart(omsiPath).then(res => {
      if (!res.success) { setErrMsg(res.error); setLiveMode(false) }
    })
    return () => {
      window.api.omsi.watchStop()
      window.api.omsi.offLogUpdate()
    }
  }, [liveMode, omsiPath])

  // Auto-scroll en bas quand live
  useEffect(() => {
    if (liveMode && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [result, liveMode])

  // ── Données filtrées ─────────────────────────────────────────────────────
  const entries   = result?.entries || []
  const filtered  = filter === 'all' ? entries : entries.filter(e => e.type === filter)
  const { warnings, errors } = countByType(entries)

  // ── Pas de chemin configuré ──────────────────────────────────────────────
  if (!omsiPath) {
    return (
      <div style={{
        margin: '32px auto', maxWidth: 480, padding: '18px 20px',
        borderRadius: 8, background: 'rgba(240,160,48,0.06)',
        border: '1px solid rgba(240,160,48,0.22)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <SettingsOutlinedIcon sx={{ color: '#f0a030', mt: 0.2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0a030', marginBottom: 4 }}>
            Chemin OMSI 2 non configuré
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
            Rendez-vous dans <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Paramètres → Répertoire OMSI 2</strong> pour
            définir le chemin d'installation, puis revenez ici.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Barre d'outils ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '8px 12px', borderRadius: 8,
        background: C.bgCard, border: `1px solid ${C.border}`,
      }}>

        {/* Bouton Parse / Refresh */}
        {!liveMode && (
          <Button
            variant="contained"
            size="small"
            startIcon={parsing
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : result ? <RefreshOutlinedIcon /> : <PlayArrowOutlinedIcon />}
            disabled={parsing}
            onClick={runParse}
            sx={{ fontSize: 12, textTransform: 'none', borderRadius: '6px' }}
          >
            {parsing ? 'Parsing…' : result ? 'Re-parser' : 'Lancer le parsing'}
          </Button>
        )}

        {/* Mode Live */}
        <FormControlLabel
          control={
            <Switch
              checked={liveMode}
              size="small"
              onChange={(e) => {
                const v = e.target.checked
                setLiveMode(v)
                if (!v) { window.api.omsi.watchStop(); window.api.omsi.offLogUpdate() }
              }}
              sx={{ '& .MuiSwitch-thumb': { width: 12, height: 12 } }}
            />
          }
          label={
            <span style={{ fontSize: 12, color: liveMode ? '#42a5f5' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              {liveMode && (
                <FiberManualRecordIcon sx={{ fontSize: 8, color: '#fc3d39',
                  animation: 'pulse 1.2s ease-in-out infinite' }} />
              )}
              Mode Live
            </span>
          }
          sx={{ m: 0 }}
        />

        <div style={{ flex: 1 }} />

        {/* Filtres */}
        {result && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all',     label: `Tous (${entries.length})`,      color: undefined },
              { key: 'warning', label: `Warnings (${warnings})`,        color: C.warning },
              { key: 'error',   label: `Erreurs (${errors})`,           color: C.error },
            ].map(({ key, label, color }) => (
              <Chip
                key={key}
                label={label}
                size="small"
                onClick={() => setFilter(key)}
                sx={{
                  fontSize: 11,
                  height: 24,
                  cursor: 'pointer',
                  borderRadius: '6px',
                  background: filter === key
                    ? (color ? `${color}22` : 'rgba(255,255,255,0.1)')
                    : 'transparent',
                  border: `1px solid ${filter === key
                    ? (color || 'rgba(255,255,255,0.3)')
                    : 'rgba(255,255,255,0.08)'}`,
                  color: filter === key ? (color || 'var(--text-primary)') : 'var(--text-muted)',
                  '&:hover': { background: color ? `${color}18` : 'rgba(255,255,255,0.07)' },
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Erreur ────────────────────────────────────────────────────────── */}
      {errMsg && (
        <div style={{
          padding: '7px 12px', borderRadius: 6, fontSize: 12,
          color: C.error, background: 'rgba(252,61,57,0.07)',
          border: `1px solid rgba(252,61,57,0.22)`,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 15, flexShrink: 0 }} />
          {errMsg}
        </div>
      )}

      {/* ── Header : date de lancement ────────────────────────────────────── */}
      {result?.launchTime && (
        <div style={{
          padding: '8px 14px', borderRadius: 8,
          background: 'rgba(66,165,245,0.06)',
          border: '1px solid rgba(66,165,245,0.18)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 15, color: '#42a5f5', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Dernier lancement OMSI 2
            </span>
            <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600,
              color: '#42a5f5', fontFamily: MONO }}>
              {result.launchTime}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12,
            fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{result.totalLines?.toLocaleString('fr-FR')} lignes analysées</span>
            <span style={{ color: C.warning }}>⚠ {warnings} warning{warnings !== 1 ? 's' : ''}</span>
            <span style={{ color: C.error }}>✗ {errors} erreur{errors !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* ── Liste des entrées ─────────────────────────────────────────────── */}
      {result && (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          {/* En-tête colonne */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            padding: '5px 12px',
            background: C.bgCard,
            borderBottom: `1px solid ${C.border}`,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: C.muted,
          }}>
            <span>Ligne</span>
            <span>Message</span>
          </div>

          {/* Corps scrollable */}
          <div
            ref={listRef}
            style={{
              maxHeight: 520,
              overflowY: 'auto',
              background: C.bg,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center',
                fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
                {entries.length === 0
                  ? 'Aucun warning ni erreur trouvé dans ce logfile.'
                  : `Aucune entrée pour le filtre "${filter}".`}
              </div>
            ) : (
              filtered.map((entry, idx) => {
                const isWarning = entry.type === 'warning'
                const accent    = isWarning ? C.warning : C.error
                return (
                  <div
                    key={`${entry.lineNum}-${idx}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr',
                      padding: '4px 12px',
                      alignItems: 'baseline',
                      background: idx % 2 === 0 ? C.bgRow : C.bgRowAlt,
                      borderLeft: `2px solid ${accent}`,
                      borderBottom: idx < filtered.length - 1 ? `1px solid rgba(255,255,255,0.03)` : 'none',
                    }}
                  >
                    {/* Numéro de ligne */}
                    <span style={{
                      fontSize: 10, color: C.muted,
                      fontFamily: MONO,
                    }}>
                      {entry.lineNum}
                    </span>

                    {/* Message */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                      {isWarning
                        ? <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: C.warning, flexShrink: 0, mt: '2px' }} />
                        : <ErrorOutlineOutlinedIcon sx={{ fontSize: 13, color: C.error,   flexShrink: 0, mt: '2px' }} />
                      }
                      <span style={{
                        fontSize: 12, fontFamily: MONO,
                        color: isWarning ? '#ffd08a' : '#ff9090',
                        lineHeight: 1.5,
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {entry.text}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Empty state avant premier parse ──────────────────────────────── */}
      {!result && !parsing && !errMsg && (
        <div style={{
          textAlign: 'center', padding: '44px 0',
          color: C.muted, fontSize: 13,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 36, opacity: 0.2 }} />
          <div>Cliquez sur <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Lancer le parsing</strong> pour analyser le logfile OMSI 2.</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Chemin : {omsiPath}\logfile.txt</div>
        </div>
      )}

    </div>
  )
}

// ── Page Outils ───────────────────────────────────────────────────────────────
export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [omsiPath,  setOmsiPath]  = useState(null) // null = chargement

  useEffect(() => {
    window.api.settings.get().then(s => {
      setOmsiPath(s?.omsiPath || '')
    })
    // Arrête tout watcher si on quitte la page
    return () => {
      window.api.omsi.watchStop()
      window.api.omsi.offLogUpdate()
    }
  }, [])

  return (
    <div className="fade-in">

      {/* ── En-tête page ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BuildOutlinedIcon sx={{ fontSize: 20, color: 'var(--text-muted)' }} />
          <div>
            <div className="page-title">Outils</div>
            <div className="page-subtitle">Utilitaires de diagnostic OMSI 2</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.07)', mb: 2, minHeight: 36 }}
      >
        <Tab
          label="Logfile"
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
          sx={{ minHeight: 36, fontSize: 13, textTransform: 'none' }}
        />
        <Tab
          label="Éditeur .bus"
          icon={<BuildOutlinedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
          sx={{ minHeight: 36, fontSize: 13, textTransform: 'none' }}
        />
      </Tabs>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      {omsiPath === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress size={24} />
        </Box>
      ) : activeTab === 0 ? (
        <TabLogfile omsiPath={omsiPath} />
      ) : activeTab === 1 ? (
        <BusEditorTab />
      ) : null}

      {/* ── Animation pulse pour le point live ──────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
