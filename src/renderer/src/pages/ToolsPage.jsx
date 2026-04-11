import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
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
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined'
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined'
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined'

// ── Palette console ──────────────────────────────────────────────────────────
const PALETTE = {
  dark: {
    bg:      '#07090c',
    bgCard:  '#0d1014',
    bgRow:   '#0f1318',
    bgRowAlt:'#111519',
    warning: '#f0a030',
    error:   '#fc3d39',
    muted:   '#5a6270',
    border:  'rgba(255,255,255,0.06)',
    scrollbar: 'rgba(255,255,255,0.1) transparent',
    textFaint:  'rgba(255,255,255,0.35)',
    textHint:   'rgba(255,255,255,0.45)',
    textStrong: 'rgba(255,255,255,0.7)',
    textBtn:    'rgba(255,255,255,0.5)',
    chipActive: 'rgba(255,255,255,0.1)',
    chipBorder: 'rgba(255,255,255,0.08)',
    chipBorderActive: 'rgba(255,255,255,0.3)',
    chipHover:  'rgba(255,255,255,0.07)',
  },
  light: {
    bg:      'var(--bg-default)',
    bgCard:  'var(--bg-paper)',
    bgRow:   '#f6f8fb',
    bgRowAlt:'#eef1f5',
    warning: '#d48a00',
    error:   '#d32f2f',
    muted:   '#8a9ab0',
    border:  'rgba(0,0,0,0.06)',
    scrollbar: 'rgba(0,0,0,0.12) transparent',
    textFaint:  'rgba(0,0,0,0.35)',
    textHint:   'rgba(0,0,0,0.45)',
    textStrong: 'rgba(0,0,0,0.7)',
    textBtn:    'rgba(0,0,0,0.5)',
    chipActive: 'rgba(0,0,0,0.08)',
    chipBorder: 'rgba(0,0,0,0.08)',
    chipBorderActive: 'rgba(0,0,0,0.3)',
    chipHover:  'rgba(0,0,0,0.05)',
  },
}

const MONO = "'Cascadia Code', 'Consolas', 'Courier New', monospace"

// ── Helpers ──────────────────────────────────────────────────────────────────
function countByType(entries) {
  let w = 0, e = 0
  entries.forEach(en => { if (en.type === 'warning') w++; else e++ })
  return { warnings: w, errors: e }
}

// ── Composant Logfile ─────────────────────────────────────────────────────────
function TabLogfile({ omsiPath, isDark }) {
  const { t, i18n } = useTranslation()
  const C = isDark ? PALETTE.dark : PALETTE.light
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
            {t('tools.noOmsiPath')}
          </div>
          <div style={{ fontSize: 12, color: C.textHint, lineHeight: 1.6 }}>
            {t('tools.noOmsiPathDesc').split(t('tools.noOmsiPathSettings'))[0]}
            <strong style={{ color: C.textStrong }}>{t('tools.noOmsiPathSettings')}</strong>
            {t('tools.noOmsiPathDesc').split(t('tools.noOmsiPathSettings'))[1]}
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
            {parsing ? t('tools.parsing') : result ? t('tools.reParse') : t('tools.parse')}
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
              {t('tools.liveMode')}
            </span>
          }
          sx={{ m: 0 }}
        />

        <div style={{ flex: 1 }} />

        {/* Filtres */}
        {result && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all',     label: t('tools.filterAll',      { count: entries.length }), color: undefined },
              { key: 'warning', label: t('tools.filterWarnings', { count: warnings }),       color: C.warning },
              { key: 'error',   label: t('tools.filterErrors',   { count: errors }),         color: C.error },
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
                    ? (color ? `${color}22` : C.chipActive)
                    : 'transparent',
                  border: `1px solid ${filter === key
                    ? (color || C.chipBorderActive)
                    : C.chipBorder}`,
                  color: filter === key ? (color || 'var(--text-primary)') : 'var(--text-muted)',
                  '&:hover': { background: color ? `${color}18` : C.chipHover },
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
            <span style={{ fontSize: 11, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {t('tools.lastLaunch')}
            </span>
            <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600,
              color: '#42a5f5', fontFamily: MONO }}>
              {result.launchTime}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12,
            fontSize: 11, color: 'var(--text-muted)' }}>
            <span>{result.totalLines?.toLocaleString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'en' ? 'en-US' : 'fr-FR')} {t('tools.linesAnalyzed')}</span>
            <span style={{ color: C.warning }}>⚠ {t('tools.warningCount', { count: warnings })}</span>
            <span style={{ color: C.error }}>✗ {t('tools.errorCount', { count: errors })}</span>
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
              scrollbarColor: C.scrollbar,
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
                      borderBottom: idx < filtered.length - 1 ? `1px solid var(--border-subtle)` : 'none',
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
          <div>Cliquez sur <strong style={{ color: C.textBtn }}>Lancer le parsing</strong> pour analyser le logfile OMSI 2.</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>Chemin : {omsiPath}\logfile.txt</div>
        </div>
      )}

    </div>
  )
}

// ── Constfile : helpers ───────────────────────────────────────────────────────
const CF_PAD = { l: 58, r: 22, t: 18, b: 40 }

function cfDomain(pts) {
  if (!pts.length) return { x0: -1, x1: 1, y0: -1, y1: 1 }
  const xs = pts.map(p => Number(p.x)), ys = pts.map(p => Number(p.y))
  const xMn = Math.min(...xs), xMx = Math.max(...xs)
  const yMn = Math.min(...ys), yMx = Math.max(...ys)
  const xR = (xMx - xMn) || 1, yR = (yMx - yMn) || 1
  return { x0: xMn - xR * 0.12, x1: xMx + xR * 0.12, y0: yMn - yR * 0.12, y1: yMx + yR * 0.12 }
}

function cfFmt(n) {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs < 0.001 || abs >= 1e6) return n.toExponential(1)
  if (abs < 1) return (Math.round(n * 1000) / 1000).toString()
  return (Math.round(n * 10) / 10).toString()
}

function cfTicks(lo, hi, n = 5) {
  return Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo))
}

// ── CurveChart — responsive SVG + verrouillage (Shift) + pan (Alt) + zoom ────
function CurveChart({ points, onChange, selectedPoint, onSelectPoint, isDark }) {
  const containerRef = useRef(null)
  const svgRef       = useRef(null)
  const pointsRef    = useRef(points)
  const dragDomRef   = useRef(null)
  const dragOrigRef  = useRef(null)
  const lockAxisRef  = useRef(null)
  const prevLockRef  = useRef(null)
  const sizeRef      = useRef({ w: 560, h: 300 })
  const viewportRef  = useRef(null)   // null = auto-domain

  const [size,        setSize]        = useState({ w: 560, h: 300 })
  const [dragging,    setDragging]    = useState(null)
  const [lockDisplay, setLockDisplay] = useState(null)
  const [viewport,    setViewport]    = useState(null)   // { x0,x1,y0,y1 } | null
  const [panning,     setPanning]     = useState(null)   // { startX,startY,origVp } | null
  const [altHeld,     setAltHeld]     = useState(false)

  useEffect(() => { pointsRef.current = points },   [points])
  useEffect(() => { sizeRef.current   = size },     [size])
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 30 && height > 30) setSize({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Suivi touche Alt (curseur)
  useEffect(() => {
    const dn = (e) => { if (e.key === 'Alt') { e.preventDefault(); setAltHeld(true)  } }
    const up = (e) => { if (e.key === 'Alt') setAltHeld(false) }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Zoom molette (passive: false obligatoire pour preventDefault)
  useEffect(() => {
    const el = svgRef.current; if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const { w: cW, h: cH } = sizeRef.current
      const cPW = cW - CF_PAD.l - CF_PAD.r
      const cPH = cH - CF_PAD.t - CF_PAD.b
      const vp  = viewportRef.current ?? cfDomain(pointsRef.current)
      // Position souris en coords données
      const svgX = ((e.clientX - rect.left)  / rect.width)  * cW
      const svgY = ((e.clientY - rect.top)   / rect.height) * cH
      const mx = vp.x0 + ((svgX - CF_PAD.l) / cPW) * (vp.x1 - vp.x0)
      const my = vp.y0 + ((CF_PAD.t + cPH - svgY) / cPH) * (vp.y1 - vp.y0)
      const f  = e.deltaY > 0 ? 1.15 : 1 / 1.15
      setViewport({
        x0: mx + (vp.x0 - mx) * f,  x1: mx + (vp.x1 - mx) * f,
        y0: my + (vp.y0 - my) * f,  y1: my + (vp.y1 - my) * f,
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])  // une seule fois — accède aux données via refs

  // Pan (Alt + drag)
  useEffect(() => {
    if (!panning) return
    const onMove = (e) => {
      const svg = svgRef.current; if (!svg) return
      const rect = svg.getBoundingClientRect()
      const { w: cW, h: cH } = sizeRef.current
      const cPW = cW - CF_PAD.l - CF_PAD.r
      const cPH = cH - CF_PAD.t - CF_PAD.b
      const { origVp } = panning
      const dpx = ((e.clientX - panning.startX) / rect.width)  * cW
      const dpy = ((e.clientY - panning.startY) / rect.height) * cH
      const ddx = (dpx / cPW) * (origVp.x1 - origVp.x0)
      const ddy = (dpy / cPH) * (origVp.y1 - origVp.y0)
      setViewport({
        x0: origVp.x0 - ddx,  x1: origVp.x1 - ddx,
        y0: origVp.y0 + ddy,  y1: origVp.y1 + ddy,
      })
    }
    const onUp = () => setPanning(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [panning])

  // Drag de point
  useEffect(() => {
    if (dragging === null) return
    const onMove = (e) => {
      const svg = svgRef.current; if (!svg) return
      const rect = svg.getBoundingClientRect()
      const { w: cW, h: cH } = sizeRef.current
      const cPW = cW - CF_PAD.l - CF_PAD.r
      const cPH = cH - CF_PAD.t - CF_PAD.b
      const svgX = ((e.clientX - rect.left)  / rect.width)  * cW
      const svgY = ((e.clientY - rect.top)   / rect.height) * cH
      const d    = dragDomRef.current
      const nx   = d.x0 + ((svgX - CF_PAD.l) / cPW) * (d.x1 - d.x0)
      const ny   = d.y0 + ((CF_PAD.t + cPH - svgY) / cPH) * (d.y1 - d.y0)
      let fx = Math.round(nx * 10000) / 10000
      let fy = Math.round(ny * 10000) / 10000
      let newLock = null
      if (e.shiftKey) {
        const orig = dragOrigRef.current
        const adx = Math.abs(nx - orig.x), ady = Math.abs(ny - orig.y)
        if (lockAxisRef.current === null && (adx > 0.0001 || ady > 0.0001)) {
          lockAxisRef.current = adx >= ady ? 'y' : 'x'
        }
        newLock = lockAxisRef.current
        if (newLock === 'y') fy = orig.y
        if (newLock === 'x') fx = orig.x
      } else {
        lockAxisRef.current = null; newLock = null
      }
      if (newLock !== prevLockRef.current) { prevLockRef.current = newLock; setLockDisplay(newLock) }
      onChange(pointsRef.current.map((p, i) => i === dragging ? { x: fx, y: fy } : p))
    }
    const onUp = () => { setDragging(null); setLockDisplay(null); lockAxisRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, onChange])

  const onPtDown = useCallback((e, idx) => {
    e.preventDefault(); e.stopPropagation()
    onSelectPoint(idx)
    const d = viewportRef.current ?? cfDomain(pointsRef.current)
    dragDomRef.current  = d
    dragOrigRef.current = { x: Number(pointsRef.current[idx].x), y: Number(pointsRef.current[idx].y) }
    lockAxisRef.current = null; prevLockRef.current = null
    setLockDisplay(null); setDragging(idx)
  }, [onSelectPoint])

  const onSvgDown = useCallback((e) => {
    if (e.altKey) {
      e.preventDefault()
      const vp = viewportRef.current ?? cfDomain(pointsRef.current)
      setPanning({ startX: e.clientX, startY: e.clientY, origVp: vp })
    }
  }, [])

  const onSvgDblClick = useCallback(() => setViewport(null), [])

  // ── Calculs de rendu ────────────────────────────────────────────────────────
  const { w: W, h: H } = size
  const PW = W - CF_PAD.l - CF_PAD.r
  const PH = H - CF_PAD.t - CF_PAD.b

  const dom     = viewport ?? cfDomain(points)
  const toSvgX  = (x, d = dom) => CF_PAD.l + ((Number(x) - d.x0) / (d.x1 - d.x0)) * PW
  const toSvgY  = (y, d = dom) => CF_PAD.t + PH - ((Number(y) - d.y0) / (d.y1 - d.y0)) * PH

  const C       = isDark ? PALETTE.dark : PALETTE.light
  const sorted  = [...points].sort((a, b) => Number(a.x) - Number(b.x))
  const linePts = sorted.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')
  const xTicks  = cfTicks(dom.x0, dom.x1, Math.max(2, Math.floor(PW / 70)))
  const yTicks  = cfTicks(dom.y0, dom.y1, Math.max(2, Math.floor(PH / 45)))
  const locked  = lockDisplay !== null
  const cursor  = panning
    ? 'grabbing'
    : dragging !== null
      ? locked ? (lockDisplay === 'y' ? 'ew-resize' : 'ns-resize') : 'grabbing'
      : altHeld ? 'grab' : 'default'

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg ref={svgRef} width={W} height={H}
        style={{ display: 'block', cursor, userSelect: 'none', position: 'absolute', top: 0, left: 0 }}
        onMouseDown={onSvgDown}
        onDoubleClick={onSvgDblClick}
      >
        {/* Fond zone graphique */}
        <rect x={CF_PAD.l} y={CF_PAD.t} width={PW} height={PH}
          fill={isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.025)'}
          stroke={C.border} strokeWidth={1} />

        {/* Grilles X */}
        {xTicks.map((t, i) => (
          <g key={`gx${i}`}>
            <line x1={toSvgX(t)} y1={CF_PAD.t} x2={toSvgX(t)} y2={CF_PAD.t + PH}
              stroke={C.border} strokeWidth={0.7} />
            <text x={toSvgX(t)} y={CF_PAD.t + PH + 16} textAnchor="middle"
              fontSize={10} fill={C.textFaint}>{cfFmt(t)}</text>
          </g>
        ))}

        {/* Grilles Y */}
        {yTicks.map((t, i) => (
          <g key={`gy${i}`}>
            <line x1={CF_PAD.l} y1={toSvgY(t)} x2={CF_PAD.l + PW} y2={toSvgY(t)}
              stroke={C.border} strokeWidth={0.7} />
            <text x={CF_PAD.l - 7} y={toSvgY(t) + 4} textAnchor="end"
              fontSize={10} fill={C.textFaint}>{cfFmt(t)}</text>
          </g>
        ))}

        {/* Axes principaux */}
        <line x1={CF_PAD.l} y1={CF_PAD.t} x2={CF_PAD.l} y2={CF_PAD.t + PH} stroke={C.textFaint} strokeWidth={1} />
        <line x1={CF_PAD.l} y1={CF_PAD.t + PH} x2={CF_PAD.l + PW} y2={CF_PAD.t + PH} stroke={C.textFaint} strokeWidth={1} />

        {/* ── Repères zéro ──────────────────────────────────────────────── */}
        {dom.x0 <= 0 && 0 <= dom.x1 && (
          <line x1={toSvgX(0)} y1={CF_PAD.t} x2={toSvgX(0)} y2={CF_PAD.t + PH}
            stroke="rgba(239,68,68,0.65)" strokeWidth={1.4} />
        )}
        {dom.y0 <= 0 && 0 <= dom.y1 && (
          <line x1={CF_PAD.l} y1={toSvgY(0)} x2={CF_PAD.l + PW} y2={toSvgY(0)}
            stroke="rgba(239,68,68,0.65)" strokeWidth={1.4} />
        )}

        {/* Polyligne — orange si axe verrouillé */}
        {sorted.length > 1 && (
          <polyline points={linePts} fill="none"
            stroke={locked ? '#f59e0b' : '#1976d2'}
            strokeWidth={locked ? 2.2 : 1.8} opacity={0.82} />
        )}

        {/* Guide de verrouillage d'axe */}
        {locked && dragging !== null && dragging < points.length && (() => {
          const p = points[dragging]
          return lockDisplay === 'y'
            ? <line x1={CF_PAD.l} y1={toSvgY(p.y)} x2={CF_PAD.l + PW} y2={toSvgY(p.y)}
                stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.65} />
            : <line x1={toSvgX(p.x)} y1={CF_PAD.t} x2={toSvgX(p.x)} y2={CF_PAD.t + PH}
                stroke="#f59e0b" strokeWidth={1.2} strokeDasharray="6 3" opacity={0.65} />
        })()}

        {/* Points */}
        {points.map((p, i) => {
          const cx = toSvgX(p.x), cy = toSvgY(p.y)
          const isSel = selectedPoint === i
          const isDrg = dragging === i
          const isLk  = isDrg && locked
          return (
            <circle key={i} cx={cx} cy={cy}
              r={isDrg ? 8 : isSel ? 7 : 5}
              fill={isLk ? '#f59e0b' : isSel ? '#42a5f5' : isDark ? '#60cdff' : '#1976d2'}
              stroke={isDark ? '#07090c' : '#fff'} strokeWidth={2}
              style={{ cursor: 'grab' }}
              onMouseDown={e => onPtDown(e, i)}
            />
          )
        })}

        {/* Tooltip point sélectionné */}
        {selectedPoint !== null && selectedPoint < points.length && (() => {
          const p  = points[selectedPoint]
          const cx = toSvgX(p.x), cy = toSvgY(p.y)
          const tx = cx + (cx > W * 0.72 ? -96 : 12)
          const ty = cy + (cy > H * 0.72 ? -20 : 16)
          const lk = lockDisplay === 'y' ? ' ← X' : lockDisplay === 'x' ? ' ↕ Y' : ''
          const lb = `(${cfFmt(Number(p.x))}, ${cfFmt(Number(p.y))})${lk}`
          return (
            <g>
              <rect x={tx - 4} y={ty - 13} width={lb.length * 6.5 + 8} height={17} rx={3}
                fill={isDark ? '#1e2328' : '#fff'} stroke={C.border} strokeWidth={0.8} opacity={0.95} />
              <text x={tx} y={ty} fontSize={10}
                fill={locked ? '#f59e0b' : isDark ? '#42a5f5' : '#1565c0'}
                fontFamily={MONO}>{lb}</text>
            </g>
          )
        })()}

        {/* Hints en haut à droite */}
        {dragging !== null ? (
          <text x={W - CF_PAD.r - 2} y={CF_PAD.t + 11} textAnchor="end" fontSize={9}
            fill={locked ? '#f59e0b' : C.textFaint} opacity={0.8}>
            {lockDisplay === 'y' ? '⇔ axe X' : lockDisplay === 'x' ? '⇕ axe Y' : 'Maj = verrouiller axe'}
          </text>
        ) : viewport !== null ? (
          <text x={W - CF_PAD.r - 2} y={CF_PAD.t + 11} textAnchor="end" fontSize={9}
            fill={C.textFaint} opacity={0.75}>
            Double-clic = réinitialiser la vue
          </text>
        ) : (
          <text x={W - CF_PAD.r - 2} y={CF_PAD.t + 11} textAnchor="end" fontSize={9}
            fill={C.textFaint} opacity={0.45}>
            Alt+glisser · molette = naviguer
          </text>
        )}
      </svg>
    </div>
  )
}

// ── Constfile : compteur d'ID unique ─────────────────────────────────────────
let _cfId = 0
function cfNewId() { return `cf_${Date.now()}_${_cfId++}` }

// ── TabConstfileParser ────────────────────────────────────────────────────────
function TabConstfileParser({ isDark }) {
  const C = isDark ? PALETTE.dark : PALETTE.light

  const [filePath,   setFilePath]   = useState(null)
  const [entries,    setEntries]    = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [dirty,      setDirty]      = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [loadError,  setLoadError]  = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saveOk,     setSaveOk]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)
  const [addAnchor,  setAddAnchor]  = useState(null)
  const [chartSel,   setChartSel]   = useState(null)

  const selectedEntry = entries.find(e => e.id === selectedId) ?? null

  useEffect(() => { setChartSel(null) }, [selectedId])

  // ── Ouvrir un fichier ─────────────────────────────────────────────────────
  const openFile = async () => {
    const fp = await window.api.dialog.selectFile({ filters: [{ name: 'Constfile OMSI', extensions: ['txt'] }] })
    if (!fp) return
    setLoading(true); setLoadError(null)
    const res = await window.api.constfile.parse(fp)
    setLoading(false)
    if (!res.success) { setLoadError(res.error || 'Fichier non-conforme ou corrompu'); return }
    setFilePath(fp); setEntries(res.entries)
    setSelectedId(res.entries[0]?.id ?? null); setDirty(false)
  }

  // ── Nouveau fichier ────────────────────────────────────────────────────────
  const newFile = async () => {
    const fp = await window.api.dialog.saveFile({
      filters: [{ name: 'Constfile OMSI', extensions: ['txt'] }],
      defaultPath: 'Const.txt'
    })
    if (!fp) return
    setFilePath(fp); setEntries([]); setSelectedId(null); setDirty(false); setLoadError(null)
  }

  // ── Enregistrer ────────────────────────────────────────────────────────────
  const save = async () => {
    if (!filePath) return
    setSaving(true); setSaveError(null); setSaveOk(false)
    const res = await window.api.constfile.save(filePath, entries)
    setSaving(false)
    if (res.success) { setDirty(false); setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    else setSaveError(res.error)
  }

  // ── Ajouter une entrée ─────────────────────────────────────────────────────
  const addEntry = (type) => {
    setAddAnchor(null)
    const e = type === 'const'
      ? { id: cfNewId(), type: 'const', name: 'Nouvelle_Constante', value: '0' }
      : { id: cfNewId(), type: 'curve', name: 'Nouvelle_Courbe', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }
    setEntries(prev => [...prev, e])
    setSelectedId(e.id); setDirty(true)
  }

  // ── Supprimer l'entrée sélectionnée ───────────────────────────────────────
  const deleteEntry = () => {
    if (!selectedId) return
    const idx = entries.findIndex(e => e.id === selectedId)
    const next = entries.filter(e => e.id !== selectedId)
    setEntries(next)
    setSelectedId(next[Math.min(idx, next.length - 1)]?.id ?? null)
    setDirty(true)
  }

  // ── Modifier une entrée ───────────────────────────────────────────────────
  const updateEntry = useCallback((id, patch) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    setDirty(true)
  }, [])

  const updatePoints = useCallback((id, pts) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, points: pts } : e))
    setDirty(true)
  }, [])

  // ── Ajouter / supprimer un point ──────────────────────────────────────────
  const addPoint = () => {
    if (!selectedEntry || selectedEntry.type !== 'curve') return
    const pts = selectedEntry.points
    const lastX = pts.length ? Number(pts[pts.length - 1].x) : 0
    updateEntry(selectedEntry.id, { points: [...pts, { x: Math.round((lastX + 1) * 100) / 100, y: 0 }] })
  }

  const deletePoint = () => {
    if (!selectedEntry || selectedEntry.type !== 'curve' || chartSel === null) return
    const newPts = selectedEntry.points.filter((_, i) => i !== chartSel)
    updateEntry(selectedEntry.id, { points: newPts })
    setChartSel(null)
  }

  // ── Zone vide ────────────────────────────────────────────────────────────
  const toolbar = (compact = false) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      padding: '8px 12px', borderRadius: 8,
      background: C.bgCard, border: `1px solid ${C.border}`
    }}>
      <Button variant={compact ? 'text' : 'contained'} size="small"
        startIcon={loading ? <CircularProgress size={13} color="inherit" /> : <FolderOpenOutlinedIcon />}
        onClick={openFile} disabled={loading}
        sx={{ fontSize: 12, textTransform: 'none', ...(compact && { color: C.textBtn }) }}>
        Ouvrir
      </Button>
      <Button variant="outlined" size="small"
        startIcon={<NoteAddOutlinedIcon />} onClick={newFile}
        sx={{ fontSize: 12, textTransform: 'none' }}>
        Nouveau Constfile
      </Button>

      {compact && <>
        <div style={{ width: 1, height: 18, background: C.border }} />
        <Button variant="contained" size="small"
          startIcon={saving ? <CircularProgress size={13} color="inherit" /> : <SaveOutlinedIcon />}
          onClick={save} disabled={saving || !dirty}
          sx={{ fontSize: 12, textTransform: 'none' }}>
          {saveOk ? 'Enregistré ✓' : 'Enregistrer'}
        </Button>
        <div style={{ width: 1, height: 18, background: C.border }} />
        <Button variant="outlined" size="small"
          startIcon={<AddOutlinedIcon />}
          onClick={e => setAddAnchor(e.currentTarget)}
          sx={{ fontSize: 12, textTransform: 'none' }}>
          Ajouter une entrée
        </Button>
        <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
          <MenuItem onClick={() => addEntry('const')} sx={{ fontSize: 13, gap: 1 }}>
            <NumbersOutlinedIcon sx={{ fontSize: 15 }} /> Constante [const]
          </MenuItem>
          <MenuItem onClick={() => addEntry('curve')} sx={{ fontSize: 13, gap: 1 }}>
            <ShowChartOutlinedIcon sx={{ fontSize: 15 }} /> Courbe [newcurve]
          </MenuItem>
        </Menu>
        <Button variant="text" size="small"
          startIcon={<DeleteOutlinedIcon />} onClick={deleteEntry}
          disabled={!selectedId}
          sx={{ fontSize: 12, textTransform: 'none', color: selectedId ? C.error : undefined }}>
          Supprimer
        </Button>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textFaint,
          maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dirty && <span style={{ color: '#f59e0b', marginRight: 4 }}>●</span>}
          {filePath?.split(/[\\/]/).pop()}
        </div>
      </>}
    </div>
  )

  if (!filePath) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        {toolbar(false)}
        {loadError && (
          <div style={{
            marginTop: 8, padding: '10px 14px', borderRadius: 6, fontSize: 12,
            background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.2)', color: C.error
          }}>{loadError}</div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, color: C.textFaint }}>
        <TuneOutlinedIcon sx={{ fontSize: 40, opacity: 0.2 }} />
        <span style={{ fontSize: 13 }}>Ouvrez un fichier .txt ou créez un nouveau Constfile OMSI 2</span>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Barre d'outils + erreur sauvegarde ─────────────────────────── */}
      <div style={{ flexShrink: 0, paddingBottom: 8 }}>
        {toolbar(true)}
        {saveError && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
            background: 'rgba(252,61,57,0.07)', border: '1px solid rgba(252,61,57,0.2)', color: C.error
          }}>{saveError}</div>
        )}
      </div>

      {/* ── Layout principal ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 10 }}>

        {/* Sidebar */}
        <div style={{
          width: 300, flexShrink: 0, background: C.bgCard,
          border: `1px solid ${C.border}`, borderRadius: 8,
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            padding: '8px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color: C.textFaint,
            borderBottom: `1px solid ${C.border}`, flexShrink: 0
          }}>
            Entrées ({entries.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {entries.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: C.textFaint, textAlign: 'center' }}>
                Aucune entrée
              </div>
            ) : entries.map(e => {
              const active = e.id === selectedId
              return (
                <div key={e.id} onClick={() => setSelectedId(e.id)} style={{
                  padding: '7px 12px', cursor: 'pointer',
                  background: active ? (isDark ? 'rgba(25,118,210,0.14)' : 'rgba(25,118,210,0.07)') : 'transparent',
                  borderLeft: active ? '2px solid #1976d2' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.08s'
                }}>
                  {e.type === 'const'
                    ? <NumbersOutlinedIcon sx={{ fontSize: 13, color: active ? '#42a5f5' : C.textFaint, flexShrink: 0 }} />
                    : <ShowChartOutlinedIcon sx={{ fontSize: 13, color: active ? '#42a5f5' : C.textFaint, flexShrink: 0 }} />
                  }
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: 12, fontWeight: active ? 600 : 400,
                      color: active ? (isDark ? '#e8eaed' : '#1a1a1a') : C.textStrong,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{e.name || '—'}</div>
                    <div style={{ fontSize: 10, color: C.textFaint }}>
                      {e.type === 'const' ? 'constante' : `courbe · ${(e.points || []).length} pts`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Zone d'édition */}
        <div style={{
          flex: 1, minHeight: 0, background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '16px 18px', boxSizing: 'border-box',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>

          {!selectedEntry ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, color: C.textFaint
            }}>
              <TuneOutlinedIcon sx={{ fontSize: 32, opacity: 0.2 }} />
              <span style={{ fontSize: 13 }}>Sélectionnez une entrée dans la liste</span>
            </div>

          ) : selectedEntry.type === 'const' ? (
            /* ── Éditeur Constante ──────────────────────────────────────── */
            <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO }}>
                [const]
              </div>
              <TextField label="Nom" value={selectedEntry.name}
                onChange={e => updateEntry(selectedEntry.id, { name: e.target.value })}
                size="small" fullWidth
                inputProps={{ style: { fontFamily: MONO, fontSize: 13 } }} />
              <TextField label="Valeur" value={selectedEntry.value}
                onChange={e => updateEntry(selectedEntry.id, { value: e.target.value })}
                size="small" fullWidth
                inputProps={{ style: { fontFamily: MONO, fontSize: 13 } }} />
            </div>

          ) : (
            /* ── Éditeur Courbe ─────────────────────────────────────────── */
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* En-tête + nom */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: MONO }}>
                  [newcurve]
                </div>
                <TextField label="Nom" value={selectedEntry.name}
                  onChange={e => updateEntry(selectedEntry.id, { name: e.target.value })}
                  size="small" sx={{ maxWidth: 380 }}
                  inputProps={{ style: { fontFamily: MONO, fontSize: 13 } }} />

                {/* Barre outils graphique */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small"
                    startIcon={<AddOutlinedIcon />} onClick={addPoint}
                    sx={{ fontSize: 12, textTransform: 'none' }}>
                    Ajouter un point
                  </Button>
                  <Button variant="text" size="small"
                    startIcon={<DeleteOutlinedIcon />} onClick={deletePoint}
                    disabled={chartSel === null}
                    sx={{ fontSize: 12, textTransform: 'none',
                      color: chartSel !== null ? C.error : undefined }}>
                    Supprimer le point sélectionné
                  </Button>
                </div>
              </div>

              {/* Graphique — remplit l'espace restant */}
              {selectedEntry.points.length === 0 ? (
                <div style={{
                  flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px dashed ${C.border}`, borderRadius: 6,
                  fontSize: 12, color: C.textFaint
                }}>
                  Aucun point — ajoutez-en un avec le bouton ci-dessus
                </div>
              ) : (
                <div style={{
                  flex: 1, minHeight: 0,
                  border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden',
                  background: isDark ? '#07090c' : '#fafbfc'
                }}>
                  <CurveChart
                    points={selectedEntry.points}
                    onChange={pts => updatePoints(selectedEntry.id, pts)}
                    selectedPoint={chartSel}
                    onSelectPoint={setChartSel}
                    isDark={isDark}
                  />
                </div>
              )}

              {/* Tableau de saisie précise des points */}
              {selectedEntry.points.length > 0 && (
                <div style={{ flexShrink: 0, maxHeight: 160, overflowY: 'auto' }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: C.textFaint, marginBottom: 6
                  }}>
                    Points [pnt]
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 1fr',
                    gap: '3px 8px', alignItems: 'center',
                    fontSize: 11
                  }}>
                    <span style={{ color: C.textFaint, fontWeight: 700 }}>#</span>
                    <span style={{ color: C.textFaint, fontWeight: 700, fontFamily: MONO }}>X</span>
                    <span style={{ color: C.textFaint, fontWeight: 700, fontFamily: MONO }}>Y</span>
                    {selectedEntry.points.map((pt, i) => {
                      const sel = chartSel === i
                      const inputStyle = {
                        background: sel ? (isDark ? 'rgba(25,118,210,0.15)' : 'rgba(25,118,210,0.06)') : 'transparent',
                        border: `1px solid ${sel ? 'rgba(25,118,210,0.5)' : C.border}`,
                        borderRadius: 4, padding: '3px 7px',
                        fontSize: 11, fontFamily: MONO,
                        color: isDark ? '#e8eaed' : '#1a1a1a',
                        width: '100%', outline: 'none', boxSizing: 'border-box'
                      }
                      return (
                        <React.Fragment key={i}>
                          <span style={{ color: C.textFaint, opacity: 0.6 }}>{i + 1}</span>
                          <input type="number" value={pt.x} style={inputStyle}
                            onClick={() => setChartSel(i)}
                            onChange={ev => {
                              const n = parseFloat(ev.target.value)
                              if (!isNaN(n)) updatePoints(selectedEntry.id,
                                selectedEntry.points.map((p, j) => j === i ? { ...p, x: n } : p))
                            }} />
                          <input type="number" value={pt.y} style={inputStyle}
                            onClick={() => setChartSel(i)}
                            onChange={ev => {
                              const n = parseFloat(ev.target.value)
                              if (!isNaN(n)) updatePoints(selectedEntry.id,
                                selectedEntry.points.map((p, j) => j === i ? { ...p, y: n } : p))
                            }} />
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page Outils ───────────────────────────────────────────────────────────────
export default function ToolsPage({ isDark = true }) {
  const { t } = useTranslation()
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

  // Onglet Constfile Parser : neutralise le padding/scroll du conteneur parent
  useEffect(() => {
    const el = document.querySelector('.content-area')
    if (!el) return
    if (activeTab === 2) {
      el.style.overflow      = 'hidden'
      el.style.padding       = '0'
      el.style.display       = 'flex'
      el.style.flexDirection = 'column'
    } else {
      el.style.overflow      = ''
      el.style.padding       = ''
      el.style.display       = ''
      el.style.flexDirection = ''
    }
    return () => {
      el.style.overflow      = ''
      el.style.padding       = ''
      el.style.display       = ''
      el.style.flexDirection = ''
    }
  }, [activeTab])

  const isConstfile = activeTab === 2

  return (
    <div className="fade-in" style={isConstfile
      ? { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : undefined}>

      {/* ── En-tête page ────────────────────────────────────────────────── */}
      {!isConstfile && (
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BuildOutlinedIcon sx={{ fontSize: 20, color: 'var(--text-muted)' }} />
            <div>
              <div className="page-title">{t('tools.title')}</div>
              <div className="page-subtitle">{t('tools.subtitle')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          borderBottom: '1px solid var(--border-subtle)',
          mb: isConstfile ? 0 : 2,
          minHeight: 36,
          flexShrink: 0,
          ...(isConstfile && { px: 2 })
        }}
      >
        <Tab
          label={t('tools.tabLogfile')}
          icon={<DescriptionOutlinedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
          sx={{ minHeight: 36, fontSize: 13, textTransform: 'none' }}
        />
        <Tab
          label={t('tools.tabBusEditor')}
          icon={<BuildOutlinedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
          sx={{ minHeight: 36, fontSize: 13, textTransform: 'none' }}
        />
        <Tab
          label="Constfile Parser"
          icon={<TuneOutlinedIcon sx={{ fontSize: 15 }} />}
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
        <TabLogfile omsiPath={omsiPath} isDark={isDark} />
      ) : activeTab === 1 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pt: 8, gap: 1.5, color: 'var(--text-muted)' }}>
          <BuildOutlinedIcon sx={{ fontSize: 36, opacity: 0.25 }} />
          <span style={{ fontSize: 14 }}>{t('tools.wip')}</span>
        </Box>
      ) : activeTab === 2 ? (
        <div style={{ flex: 1, minHeight: 0, padding: '10px 16px 10px', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column' }}>
          <TabConstfileParser isDark={isDark} />
        </div>
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
