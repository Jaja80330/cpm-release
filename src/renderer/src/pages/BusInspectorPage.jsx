/**
 * Bus Inspector — Visualiseur 3D de bus OMSI 2
 * S'ouvre dans une nouvelle fenêtre Electron avec ?busInspector=1&busFile=...&omsiPath=...
 */

import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { DDSLoader }     from 'three/examples/jsm/loaders/DDSLoader.js'
import { TGALoader }     from 'three/examples/jsm/loaders/TGALoader.js'
import { parseO3D, o3dToBufferGeometry } from '../utils/o3dParser'
import { findModelCfgInBus, parseCfg, parseCfgCTC, pathUtils } from '../utils/cfgParser'
import { parseCti } from '../utils/ctiParser'
import * as BP from '../utils/busParser'

// ── Paramètres uniformes sur toutes les textures ─────────────────────────────
//
// flipY = false : convention DirectX OMSI (V=0 = haut de l'image).
//   Les UVs du parser ne sont PAS flippés (v non inversé).
//   flipY=true sur PNG/Canvas + v: 1-v = double-flip accidentellement correct
//   seulement pour ces formats ; DDS/TGA ont flipY=false par défaut → décalage.
//   Solution : flipY=false partout, les UVs natifs OMSI sont utilisés tels quels.
//
// colorSpace : SRGBColorSpace pour textures couleur (diffuse, envmap)
//              NoColorSpace  pour cartes de données (roughnessMap, metalnessMap, normalMap)
function applyTexParams(tex, colorSpace = THREE.SRGBColorSpace) {
  tex.colorSpace  = colorSpace
  tex.flipY       = false
  tex.wrapS       = THREE.RepeatWrapping
  tex.wrapT       = THREE.RepeatWrapping
  tex.offset.set(0, 0)
  tex.repeat.set(1, 1)
  tex.center.set(0, 0)
  tex.needsUpdate = true
}

// ── Texture UV-Grid pour le debug (grille orange/grise) ──────────────────────
let _uvGridTexture = null
function getUVGridTexture() {
  if (_uvGridTexture) return _uvGridTexture
  const size = 256, cell = 32
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  for (let i = 0; i < size / cell; i++) {
    for (let j = 0; j < size / cell; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#e05a00' : '#555555'
      ctx.fillRect(i * cell, j * cell, cell, cell)
    }
  }
  ctx.strokeStyle = '#ffffff44'
  ctx.lineWidth = 1
  for (let i = 0; i <= size; i += cell) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke()
  }
  // Labels : convention flipY=false → V=0 en haut, V=1 en bas
  ctx.fillStyle = '#ffffffcc'
  ctx.font = 'bold 10px monospace'
  ctx.fillText('UV(0,0)', 2, 12)
  ctx.fillText('UV(1,1)', size - 50, size - 4)
  _uvGridTexture = new THREE.CanvasTexture(canvas)
  applyTexParams(_uvGridTexture)
  return _uvGridTexture
}

// ── Mots-clés pour la détection heuristique de vitres ────────────────────────
const GLASS_RE = /glass|vitre|window|scheibe|fenster|windsh|wscreen/i

// ── Construction d'un matériau Three.js depuis un slot cfg ───────────────────
//
// Hiérarchie des règles (ordre d'application, la suivante écrase la précédente) :
//   1. Calcul de base (roughness / metalness / transparent)
//   2. Heuristique vitres (isGlassHint)
//   3. [matl_illum] (émission)
//   4. [matl_transmap] — DERNIÈRE RÈGLE : force opaque, écrase tout le reste
//
function makeMaterial(texture, matDef = {}, transmapTex = null, debugUV = false,
                      envmapTex = null, roughnessMapOverride = null) {
  const {
    transparent     = false,
    noDepthWrite    = false,
    alphaTest       = 0,
    transmap        = null,
    envmap          = null,
    envmapIntensity = 0.5,
    illum           = false,
  } = matDef

  // ── Heuristique vitres ────────────────────────────────────────────────────
  const texBaseName = pathUtils.basename(matDef.texturePath || '')
  const isGlassHint = !transparent && !noDepthWrite && !transmap && GLASS_RE.test(texBaseName)
  const effectiveTransparent = transparent || isGlassHint

  // useTransmap est actif dès que le tag [matl_transmap] est présent (même sans texture dédiée)
  const useTransmap   = !!(transmap)
  const isTransparent = (effectiveTransparent || noDepthWrite) && !useTransmap

  const effectiveTexture = debugUV ? getUVGridTexture() : texture
  const needsOffset = isTransparent || noDepthWrite

  // Roughness / Metalness de base
  //
  // metalness = 0 TOUJOURS : le bus (peinture, caoutchouc, plastique) est un diélectrique.
  // Un metalness > 0 en PBR réduit l'albedo → la texture devient grise.
  // La réflexion est contrôlée uniquement par roughness + envMapIntensity.
  let roughness
  if (useTransmap) {
    // Carrosserie : peinture avec vernis. roughnessMap (canal alpha) module par pixel.
    roughness = Math.max(0.05, 1.0 - envmapIntensity * 0.9)
  } else if (envmap) {
    // Matériaux avec [matl_envmap] (vitres, cadres, déco).
    roughness = Math.max(0.1, 1.0 - envmapIntensity * 1.5)
  } else {
    roughness = 0.95
  }
  const metalness = 0

  const mat = new THREE.MeshStandardMaterial({
    map:         effectiveTexture || undefined,
    color:       effectiveTexture ? 0xffffff : 0x888888,
    roughness,
    metalness,
    side:        isTransparent || noDepthWrite ? THREE.DoubleSide : THREE.FrontSide,
    transparent: isTransparent,
    alphaTest:   alphaTest > 0 ? alphaTest : (isTransparent ? 0.05 : 0),
    depthWrite:  !isTransparent && !noDepthWrite,
    polygonOffset:       needsOffset,
    polygonOffsetFactor: needsOffset ? -1 : 0,
    polygonOffsetUnits:  needsOffset ? -1 : 0,
  })

  if (isGlassHint) mat.opacity = 0.35

  // envMapIntensity global :
  //   · matériaux avec [matl_envmap] ou [matl_transmap] → valeur CFG ÷ 2
  //   · autres → 0 : empêche scene.environment de griser les textures sans reflets
  mat.envMapIntensity = (useTransmap || envmap) ? envmapIntensity * 0.5 : 0

  // Règle 3 : [matl_illum] — émission (peut être écrasé par transmap)
  if (illum && effectiveTexture) {
    mat.emissiveMap       = effectiveTexture
    mat.emissive          = new THREE.Color(1, 1, 1)
    mat.emissiveIntensity = 1.0
    mat.roughness         = 1
    mat.metalness         = 0
  }

  // ── Règle 4 : [matl_transmap] — DERNIÈRE RÈGLE, PRIORITÉ ABSOLUE ─────────
  //
  // [matl_transmap] = carte de réflexion, PAS de transparence.
  // Cette règle écrase TOUT ce qui précède (heuristique, illum, alpha).
  //
  // Mapping physique OMSI :
  //   · Alpha texture principale → roughnessMap :
  //       alpha=0   → G=0   → roughness=0     (zone brillante : chrome, vernis)
  //       alpha=255 → G=255 → roughness=base  (zone mate : peinture)
  //
  // NOTE : metalness=0 → metalnessMap (transmapTex) est sans effet → non utilisé.
  // NOTE : mat.envMap non défini → Three.js utilise scene.environment (<Environment />)
  //        Le city preset fournit un IBL neutre et de qualité, sans la teinte grise
  //        des textures OMSI spheriques.
  //
  if (useTransmap) {
    mat.transparent = false     // OPAQUE : aucune exception
    mat.opacity     = 1.0
    mat.alphaTest   = 0
    mat.depthWrite  = true
    mat.side        = THREE.FrontSide

    if (roughnessMapOverride) {
      roughnessMapOverride.colorSpace = THREE.NoColorSpace
      mat.roughnessMap = roughnessMapOverride
    }
    // envMapIntensity déjà défini plus haut (envmapIntensity * 0.5)
  }
  // Pour les matériaux avec [matl_envmap] sans transmap : envMapIntensity déjà défini.

  return mat
}

// ── Extraction du canal alpha → roughnessMap ─────────────────────────────────
//
// Utilisé pour les matériaux [matl_transmap] : l'alpha de la texture principale
// encode la réflectivité par pixel (convention OMSI bodywork).
//
// Mapping OMSI :
//   alpha=0   → brilliant (chrome, vernis) → roughness basse → G=0   (canal G du roughnessMap)
//   alpha=255 → mat (peinture)             → roughness haute → G=255
//   Donc G = alpha (copie directe, pas d'inversion)
//
// Fonctionne pour : DataTexture (TGA avec alpha), HTMLImageElement (PNG via TextureLoader)
// Ne fonctionne PAS pour : CompressedTexture (DDS — données inaccessibles côté CPU)
//
function extractAlphaToRoughnessMap(texture) {
  if (!texture) return null
  let pixelData = null, w = 0, h = 0

  if (texture.isDataTexture && texture.image?.data) {
    const img = texture.image
    // Doit être RGBA (4 octets/pixel)
    if (img.data.length < img.width * img.height * 4) return null
    pixelData = img.data; w = img.width; h = img.height
  } else if (texture.image instanceof HTMLImageElement) {
    w = texture.image.naturalWidth  || texture.image.width  || 0
    h = texture.image.naturalHeight || texture.image.height || 0
    if (!w || !h) return null
    const cvs = document.createElement('canvas')
    cvs.width = w; cvs.height = h
    const ctx = cvs.getContext('2d')
    ctx.drawImage(texture.image, 0, 0)
    try { pixelData = ctx.getImageData(0, 0, w, h).data } catch { return null }
  } else {
    return null  // CompressedTexture (DDS) ou format non lisible → skip
  }

  if (!pixelData || pixelData.length < w * h * 4) return null

  // Vérifier que l'alpha n'est pas uniforme (all=255 = texture sans alpha utile)
  let hasVariation = false
  for (let i = 0; i < Math.min(512, w * h); i++) {
    if (pixelData[i * 4 + 3] < 254) { hasVariation = true; break }
  }
  if (!hasVariation) return null

  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    out[i * 4]     = 255                  // R (non utilisé par roughnessMap)
    out[i * 4 + 1] = pixelData[i * 4 + 3] // G = alpha source → roughness
    out[i * 4 + 2] = 0                    // B (non utilisé)
    out[i * 4 + 3] = 255
  }
  const rMap = new THREE.DataTexture(out, w, h, THREE.RGBAFormat)
  rMap.colorSpace = THREE.NoColorSpace   // carte de données, pas de conversion gamma
  rMap.flipY = false; rMap.wrapS = rMap.wrapT = THREE.RepeatWrapping
  rMap.needsUpdate = true
  return rMap
}

// ── Chargement de texture ─────────────────────────────────────────────────────
async function loadTexture(absolutePath) {
  if (!absolutePath) return null
  const ext = pathUtils.extname(absolutePath)

  try {
    if (ext === '.dds') {
      const raw = await window.api.file.readBuffer(absolutePath)
      if (!raw) return null
      const texData = new DDSLoader().parse(toArrayBuffer(raw), true)
      const tex = new THREE.CompressedTexture(
        texData.mipmaps, texData.width, texData.height, texData.format
      )
      tex.minFilter = texData.mipmapCount === 1 ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter
      applyTexParams(tex)
      return tex

    } else if (ext === '.tga') {
      const raw = await window.api.file.readBuffer(absolutePath)
      if (!raw) return null
      const texData = new TGALoader().parse(toArrayBuffer(raw))
      const tex = new THREE.DataTexture(
        texData.data, texData.width, texData.height, texData.format, texData.type
      )
      applyTexParams(tex)
      return tex

    } else {
      const dataUrl = await window.api.file.readAsDataUrl(absolutePath)
      if (!dataUrl) return null
      return new Promise((resolve) => {
        new THREE.TextureLoader().load(
          dataUrl,
          (t) => { applyTexParams(t); resolve(t) },
          undefined,
          () => resolve(null)
        )
      })
    }
  } catch (e) {
    console.warn('[BusInspector] Texture échouée :', absolutePath, e?.message)
    return null
  }
}

// ── Résolution de chemin texture ──────────────────────────────────────────────
//
// Ordre de priorité des extensions (OMSI préfère DDS mais les cfgs demandent parfois TGA) :
//   1. Extension originale du cfg
//   2. .dds → .tga → .png → .bmp
//
// Emplacements testés dans l'ordre :
//   1. Relatif racine OMSI (standard OMSI)
//   2. Relatif au dossier du bus
//   3. /Texture/ dans le dossier du bus
//   4. /Texture/ un niveau au-dessus
//
async function resolveTexturePath(cfgTexPath, busDir, omsiRoot) {
  const origExt  = pathUtils.extname(cfgTexPath)
  const stem     = cfgTexPath.slice(0, cfgTexPath.length - origExt.length)
  const altExts  = ['.dds', '.tga', '.png', '.bmp'].filter(e => e !== origExt)
  const variants = [cfgTexPath, ...altExts.map(e => stem + e)]

  const bases = [
    (p) => pathUtils.join(omsiRoot, p),
    (p) => pathUtils.join(busDir,   p),
    (p) => pathUtils.join(busDir,   'Texture', pathUtils.basename(p)),
    (p) => pathUtils.join(pathUtils.dirname(busDir), 'Texture', pathUtils.basename(p)),
  ]

  for (const mkBase of bases) {
    for (const v of variants) {
      const candidate = mkBase(v)
      try {
        const exists = await window.api.bus.fileExists(
          pathUtils.dirname(candidate), pathUtils.basename(candidate)
        )
        if (exists) return candidate
      } catch { /* ignoré */ }
    }
  }
  return null
}

// ── Parser des caméras du fichier .bus ────────────────────────────────────────
//
// [add_camera_driver] / [add_camera_pax]
//   Valeur 1 : posX          — latéral    (OMSI X)
//   Valeur 2 : posY          — longitudinal (OMSI Y, avant du bus)
//   Valeur 3 : posZ          — hauteur    (OMSI Z)
//   Valeur 4 : neckOffset    — décalage scalaire du pivot (axe longitudinal)
//   Valeur 5 : fov           — champ de vision (degrés)
//   Valeur 6 : rotH          — rotation horizontale initiale (degrés, yaw)
//   Valeur 7 : rotV          — rotation verticale initiale   (degrés, pitch)
//
// Conversion OMSI → Three.js :
//   Three.js X =  -omsiX   (miroir latéral)
//   Three.js Y =   omsiZ   (hauteur → up)
//   Three.js Z =  -omsiY   (longitudinal → profondeur)
//
// Robustesse : lignes vides et commentaires (; //) ignorés,
// valeurs multiples par ligne supportées.
//
function parseBusCameras(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim())
  const cameras = []
  let driverIdx = 0, paxIdx = 0

  const isSkippable = (line) =>
    line === '' || line.startsWith(';') || line.startsWith('//')

  const extractNums = (line) =>
    line.split(/\s+/).map(Number).filter(v => !isNaN(v))

  for (let i = 0; i < lines.length; i++) {
    const tag = lines[i].toLowerCase()
    if (tag !== '[add_camera_driver]' && tag !== '[add_camera_pax]') continue

    const type = tag === '[add_camera_driver]' ? 'driver' : 'pax'

    // Collecte des 7 valeurs numériques suivantes, en ignorant vides/commentaires
    const vals = []
    let j = i + 1
    while (j < lines.length && vals.length < 7) {
      const line = lines[j]
      if (line.startsWith('[')) break
      if (!isSkippable(line)) vals.push(...extractNums(line))
      j++
    }

    // Mapping strict : val[0..2]=pos, val[3]=neckOffset, val[4]=fov, val[5]=rotH, val[6]=rotV
    const [px = 0, py = 0, pz = 0, neckOff = 0, fov = 60, rotH = 0, rotV = 0] = vals

    // Conversion OMSI → Three.js
    // neckOffset est le long de l'axe longitudinal OMSI (Y), soit -Z en Three.js
    const threeX =  px   // pas de miroir : OMSI X gauche = Three.js X gauche
    const threeY =  pz
    const threeZ = -py
    const neckThreeZ = -neckOff   // décalage pivot : OMSI Y → -Three.js Z

    const index = type === 'driver' ? ++driverIdx : ++paxIdx
    cameras.push({
      type, index,
      label: type === 'driver' ? `Conducteur ${index}` : `Passager ${index}`,
      x: threeX, y: threeY, z: threeZ,
      neckX: 0, neckY: 0, neckZ: neckThreeZ,
      fov, rotH, rotV,
    })

    console.log(
      `[BusInspector] Caméra détectée : ${type} à la position [${px}, ${py}, ${pz}] avec FOV ${fov}`
    )
  }
  return cameras
}

// ── Convertit les tokens busParser en caméras Three.js ────────────────────────
//
// Mapping des champs busParser vers les valeurs OMSI sémantiques :
//   x     → posX (latéral)
//   y     → posY (longitudinal)
//   z     → posZ (hauteur)
//   rotX  → neckOffset
//   rotY  → fov
//   rotZ  → rotH (rotation horizontale)
//   fov   → rotV (rotation verticale)
//
function tokensTo3DCameras(tokens) {
  const cameras = []
  let driverIdx = 0, paxIdx = 0

  for (const tok of tokens) {
    if (tok.kind !== 'camera') continue
    if (tok.cameraType !== 'driver' && tok.cameraType !== 'pax') continue

    const type = tok.cameraType
    const v    = tok.values
    const px      = parseFloat(v.x)    || 0
    const py      = parseFloat(v.y)    || 0
    const pz      = parseFloat(v.z)    || 0
    const neckOff = parseFloat(v.rotX) || 0
    const fov     = parseFloat(v.rotY) || 60
    const rotH    = parseFloat(v.rotZ) || 0
    const rotV    = parseFloat(v.fov)  || 0

    const threeX    =  px
    const threeY    =  pz
    const threeZ    = -py
    const neckThreeZ = -neckOff

    const index = type === 'driver' ? ++driverIdx : ++paxIdx
    cameras.push({
      type, index,
      label: type === 'driver' ? `Conducteur ${index}` : `Passager ${index}`,
      x: threeX, y: threeY, z: threeZ,
      neckX: 0, neckY: 0, neckZ: neckThreeZ,
      fov, rotH, rotV,
    })
  }
  return cameras
}

// ── Éditeur de caméras — panneau flottant ─────────────────────────────────────
//
// Mapping champs busParser → labels UI :
//   x    → Pos X    rotX → Pivot   rotY → FOV °
//   y    → Pos Y    rotZ → Rot H °  fov → Rot V °
//   z    → Pos Z
//
const CAM_FIELDS = [
  { key: 'x',    label: 'Pos X' },
  { key: 'y',    label: 'Pos Y' },
  { key: 'z',    label: 'Pos Z' },
  { key: 'rotX', label: 'Pivot' },
  { key: 'rotY', label: 'FOV °' },
  { key: 'rotZ', label: 'Rot H °' },
  { key: 'fov',  label: 'Rot V °' },
]

function CameraEditorPanel({ tokens, onTokensChange, onSave, isSaving, isDirty, activeCamera, onSelectCamera }) {
  // ── Édition en direct ──────────────────────────────────────────────────────
  const [editingCam, setEditingCam] = useState(null) // { type, localIndex }
  const [editVals,   setEditVals]   = useState({})
  const [origVals,   setOrigVals]   = useState({})   // snapshot pour Annuler

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const dragSrc  = useRef(null)                   // { type, index } — source du drag
  const [dragOver,       setDragOver]       = useState(null) // { type, index } — survol actuel
  const [recentlyDropped, setRecentlyDropped] = useState(null) // { type, index } — flash post-drop

  const drivers = BP.getCameras(tokens, 'driver')
  const paxes   = BP.getCameras(tokens, 'pax')
  const stdRaw  = BP.getValue(tokens, 'set_camera_std')
  const stdIdx  = stdRaw !== '' ? parseInt(stdRaw, 10) : -1

  const globalIdx = (type, localIdx) =>
    type === 'driver' ? localIdx : drivers.length + localIdx

  // ── Handlers édition ──────────────────────────────────────────────────────
  const handleSetStd = (type, i) =>
    onTokensChange(BP.setValue(tokens, 'set_camera_std', String(globalIdx(type, i))))

  const handleAdd = (type) => onTokensChange(BP.addCamera(tokens, type))

  const handleDelete = (type, i) => {
    if (editingCam?.type === type && editingCam?.localIndex === i) setEditingCam(null)
    onTokensChange(BP.removeCamera(tokens, type, i))
  }

  const startEdit = (type, localIndex) => {
    const vals = { ...(type === 'driver' ? drivers : paxes)[localIndex] }
    setEditingCam({ type, localIndex })
    setEditVals(vals)
    setOrigVals(vals)
  }

  // Mise à jour en direct : modifie les tokens à chaque frappe
  const handleFieldChange = (key, value) => {
    const newVals = { ...editVals, [key]: value }
    setEditVals(newVals)
    onTokensChange(BP.setCameraAt(tokens, editingCam.type, editingCam.localIndex, newVals))
  }

  const cancelEdit = () => {
    onTokensChange(BP.setCameraAt(tokens, editingCam.type, editingCam.localIndex, origVals))
    setEditingCam(null)
  }

  const closeEdit = () => setEditingCam(null)

  // ── Handlers drag-and-drop ────────────────────────────────────────────────
  const handleDragStart = (e, type, index) => {
    dragSrc.current = { type, index }
    e.dataTransfer.effectAllowed = 'move'
    // Fantôme transparent (le curseur CSS suffit)
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e, type, index) => {
    e.preventDefault()
    if (dragSrc.current?.type !== type) return
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ type, index })
  }

  const handleDrop = (e, type, index) => {
    e.preventDefault()
    const src = dragSrc.current
    if (!src || src.type !== type || src.index === index) { setDragOver(null); return }

    const from = src.index
    const to   = index

    let newTokens = BP.reorderCameras(tokens, type, from, to)

    // ── Mise à jour de [set_camera_std] si la caméra standard est affectée ──
    // Les indices globaux des caméras de l'autre type ne bougent pas.
    // Seules les caméras du type déplacé changent d'index local.
    if (stdIdx >= 0) {
      const dCount = drivers.length
      // Convertir stdIdx en index local dans le type courant (si applicable)
      let stdLocal = -1
      if (type === 'driver' && stdIdx < dCount) {
        stdLocal = stdIdx
      } else if (type === 'pax' && stdIdx >= dCount) {
        stdLocal = stdIdx - dCount
      }

      if (stdLocal >= 0) {
        // Calculer le nouvel index local après le déplacement
        let newLocal = stdLocal
        if (stdLocal === from) {
          newLocal = to
        } else if (from < to && stdLocal > from && stdLocal <= to) {
          newLocal = stdLocal - 1        // décalage vers l'arrière
        } else if (from > to && stdLocal >= to && stdLocal < from) {
          newLocal = stdLocal + 1        // décalage vers l'avant
        }

        if (newLocal !== stdLocal) {
          const newGlobal = type === 'driver' ? newLocal : dCount + newLocal
          newTokens = BP.setValue(newTokens, 'set_camera_std', String(newGlobal))
        }
      }
    }

    // Ferme le formulaire d'édition
    setEditingCam(null)
    onTokensChange(newTokens)
    dragSrc.current = null
    setDragOver(null)

    // Flash sur la caméra déposée + sélection 3D
    const newGlobalIdx = globalIdx(type, to)
    onSelectCamera(newGlobalIdx + 1)
    setRecentlyDropped({ type, index: to })
    setTimeout(() => setRecentlyDropped(null), 900)
  }

  const handleDragEnd = () => { dragSrc.current = null; setDragOver(null) }

  // ── Styles helpers ────────────────────────────────────────────────────────
  const panelBtn = (label, onClick, opts = {}) => (
    <button
      onClick={onClick}
      disabled={opts.disabled}
      title={opts.title}
      style={{
        ...btnBase,
        background: opts.active ? '#e05a00' : '#1a1c22',
        color: opts.active ? '#fff' : (opts.disabled ? '#444' : '#999'),
        borderColor: opts.active ? '#e05a00' : '#2e3140',
        padding: '2px 6px', fontSize: 13, lineHeight: '18px',
        minWidth: opts.minWidth ?? 24,
      }}
    >
      {label}
    </button>
  )

  // ── Formulaire d'édition inline ───────────────────────────────────────────
  const renderEditForm = () => (
    <div style={{
      margin: '2px 0 6px 22px', padding: '8px 10px',
      background: '#12141a', border: '1px solid #2e3140', borderRadius: 4,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 8px', marginBottom: 8 }}>
        {CAM_FIELDS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: '#555', fontSize: 11 }}>{label}</span>
            <input
              type="number" step="any"
              value={editVals[key] ?? '0'}
              onChange={e => handleFieldChange(key, e.target.value)}
              style={{
                background: '#1a1c22', color: '#ddd', border: '1px solid #333',
                borderRadius: 3, padding: '2px 4px', fontSize: 12, width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {panelBtn('Annuler', cancelEdit)}
        {panelBtn('OK', closeEdit, { active: true })}
      </div>
    </div>
  )

  // ── Section (driver | pax) ────────────────────────────────────────────────
  const renderSection = (type, cams, label) => {
    const count = cams.length
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 4,
        }}>
          <span style={{ color: '#666', fontSize: 11, letterSpacing: 1 }}>
            {label} <span style={{ color: '#444' }}>({count})</span>
          </span>
          {panelBtn('+', () => handleAdd(type),
            { title: `Ajouter une caméra ${label.toLowerCase()}`, minWidth: 20 })}
        </div>

        {count === 0 && (
          <div style={{ color: '#444', fontSize: 12, padding: '4px 0 2px 4px', fontStyle: 'italic' }}>
            Aucune caméra
          </div>
        )}

        {cams.map((_, i) => {
          const gIdx    = globalIdx(type, i)
          const isStd   = gIdx === stdIdx
          const isEdit  = editingCam?.type === type && editingCam?.localIndex === i
          const is3D    = activeCamera === gIdx + 1
          const isDragTarget  = dragOver?.type === type && dragOver?.index === i
          const isJustDropped = recentlyDropped?.type === type && recentlyDropped?.index === i

          return (
            <div key={`${type}-${i}`}>
              {/* ── Ligne caméra ── */}
              <div
                draggable
                onDragStart={e => handleDragStart(e, type, i)}
                onDragOver={e  => handleDragOver(e, type, i)}
                onDrop={e      => handleDrop(e, type, i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 4px', borderRadius: 3,
                  marginBottom: 2, userSelect: 'none',
                  background: isJustDropped ? '#1a2e1a'
                            : isDragTarget  ? '#1e2a3a'
                            : is3D          ? '#1e2030'
                            : isEdit        ? '#181a26'
                            : 'transparent',
                  border: `1px solid ${
                    isJustDropped ? '#3a6a3a'
                    : isDragTarget ? '#3a5a8a'
                    : is3D         ? '#2e3a5a'
                    : 'transparent'
                  }`,
                  transition: isJustDropped
                    ? 'background 0.9s ease-out, border-color 0.9s ease-out'
                    : 'background 0.1s, border-color 0.1s',
                }}
              >
                {/* Poignée drag */}
                <span
                  title="Glisser pour réorganiser"
                  style={{
                    cursor: 'grab', color: '#333', fontSize: 14, padding: '0 2px',
                    lineHeight: 1, flexShrink: 0,
                  }}
                >
                  ⠿
                </span>

                {/* Index */}
                <span style={{ fontSize: 11, minWidth: 16, textAlign: 'right', color: '#444', flexShrink: 0 }}>
                  {i}
                </span>

                {/* Label — clic → active la caméra 3D */}
                <span
                  onClick={() => onSelectCamera(gIdx + 1)}
                  style={{
                    flex: 1, fontSize: 13, cursor: 'pointer',
                    color: is3D ? '#e05a00' : '#bbb',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {isStd ? '★ ' : ''}{type === 'driver' ? `Conducteur ${i}` : `Passager ${i}`}
                </span>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {type === 'driver' && panelBtn('★', () => handleSetStd(type, i),
                    { active: isStd, title: '[set_camera_std]', minWidth: 20 })}
                  {panelBtn('✎', () => isEdit ? closeEdit() : startEdit(type, i),
                    { active: isEdit, title: 'Modifier', minWidth: 20 })}
                  {panelBtn('✕', () => handleDelete(type, i),
                    { title: 'Supprimer', minWidth: 20 })}
                </div>
              </div>

              {/* ── Formulaire édition ── */}
              {isEdit && renderEditForm()}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      background: '#161820', border: '1px solid #252836', borderRadius: 6,
      padding: '10px 10px 8px', width: 290, maxHeight: 'calc(100vh - 80px)',
      overflowY: 'auto', fontSize: 13,
    }}>
      {renderSection('driver', drivers, 'CONDUCTEUR')}
      <div style={{ height: 1, background: '#1e2030', margin: '6px 0' }} />
      {renderSection('pax', paxes, 'PASSAGERS')}

      {isDirty && (
        <>
          <div style={{ height: 1, background: '#1e2030', margin: '8px 0 6px' }} />
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{
              ...btnBase, width: '100%', textAlign: 'center',
              background: isSaving ? '#1a1c22' : '#e05a00',
              color: isSaving ? '#666' : '#fff',
              borderColor: isSaving ? '#333' : '#e05a00',
              padding: '5px 0', fontSize: 13,
            }}
          >
            {isSaving ? 'Sauvegarde…' : '● Sauvegarder'}
          </button>
        </>
      )}
    </div>
  )
}

// ── Overlay physique — Bounding Box, Essieux, Centre de gravité ──────────────
//
// Rendu R3F à l'intérieur du Canvas.
// Système de coordonnées OMSI → Three.js :
//   X_three =  X_omsi   (latéral, identique)
//   Y_three =  Z_omsi   (hauteur → up)
//   Z_three = -Y_omsi   (longitudinal, inversé)
//
function PhysicsOverlay({ tokens }) {
  const bbox  = BP.getBoundingBox(tokens)
  const axles = BP.getAxles(tokens)

  const cgRaw      = BP.getValue(tokens, 'schwerpunkt')
  const cgY        = cgRaw !== '' ? parseFloat(cgRaw) : null

  const rotPntRaw  = BP.getValue(tokens, 'rot_pnt_long')
  const rotPntLong = rotPntRaw !== '' ? parseFloat(rotPntRaw) : null

  return (
    <group>

      {/* ── Bounding Box (fil de fer vert) ── */}
      {bbox && (
        <mesh position={[-bbox.offsetX, bbox.offsetZ, -bbox.offsetY]}>
          <boxGeometry args={[bbox.width, bbox.height, bbox.length]} />
          <meshBasicMaterial color="#00ff88" wireframe />
        </mesh>
      )}

      {/* ── Essieux ── */}
      {axles.map((axle, i) => {
        const long     = parseFloat(axle.achse_long)           || 0
        const maxW     = parseFloat(axle.achse_maxwidth)       || 2.4
        const diameter = parseFloat(axle.achse_raddurchmesser) || 0
        const r        = diameter / 2   // rayon réel de la roue

        return (
          <group key={i} position={[0, 0, -long]}>
            {/* Barre d'essieu */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, maxW, 8]} />
              <meshBasicMaterial color="#ffcc44" />
            </mesh>

            {/* Cercles de roue gauche et droite */}
            {r > 0 && [-1, 1].map(side => (
              <mesh key={side}
                position={[side * maxW / 2, r, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[r, r, 0.06, 32]} />
                <meshBasicMaterial color="#ff8800" wireframe />
              </mesh>
            ))}

            {/* Anneau au sol */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.06, 0.12, 20]} />
              <meshBasicMaterial color="#ff8800" side={2} />
            </mesh>
          </group>
        )
      })}

      {/* ── Centre de gravité ([schwerpunkt]) — sphère rouge ── */}
      {cgY !== null && !isNaN(cgY) && (
        <group position={[0, cgY, 0]}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#ff2222" />
          </mesh>
          {[
            [[0.35, 0, 0], [0, 0, Math.PI / 2]],
            [[0, 0.35, 0], [0, 0, 0]],
            [[0, 0, 0.35], [Math.PI / 2, 0, 0]],
          ].map(([pos, rot], j) => (
            <mesh key={j} position={pos} rotation={rot}>
              <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
          ))}
        </group>
      )}

      {/* ── Point de rotation ([rot_pnt_long]) — repère bleu vertical ── */}
      {rotPntLong !== null && !isNaN(rotPntLong) && (
        <group position={[0, 0, -rotPntLong]}>
          {/* Tige verticale */}
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 3.0, 8]} />
            <meshBasicMaterial color="#2288ff" />
          </mesh>
          {/* Disque au sol */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.22, 24]} />
            <meshBasicMaterial color="#2288ff" side={2} />
          </mesh>
          {/* Croix horizontale */}
          {[[Math.PI / 2, 0, 0], [Math.PI / 2, 0, Math.PI / 2]].map((rot, j) => (
            <mesh key={j} position={[0, 0.05, 0]} rotation={rot}>
              <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
              <meshBasicMaterial color="#44aaff" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

// ── Contrôleur de caméra (libre + caméras bus) ────────────────────────────────
//
// activeCamera = 0      → caméra libre (OrbitControls plein)
// activeCamera = N ≥ 1  → caméra bus N (position fixe, pivot = cou, OrbitControls restreint)
//
function CameraController({ groupRef, ready, cameras, activeCamera, freeFov }) {
  const { camera, gl } = useThree()
  const orbitRef  = useRef()
  const hasFit    = useRef(false)

  // ── Auto-fit initial : une seule fois au chargement ──────────────────────
  useEffect(() => {
    if (!ready || !groupRef.current || hasFit.current) return
    hasFit.current = true
    const box = new THREE.Box3().setFromObject(groupRef.current)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fovRad = (camera.fov * Math.PI) / 180
    const dist   = (maxDim / 2) / Math.tan(fovRad / 2) * 1.6
    camera.position.set(center.x + maxDim * 0.3, center.y + maxDim * 0.4, center.z + dist)
    camera.near = dist * 0.001
    camera.far  = dist * 50
    camera.fov  = freeFov
    camera.updateProjectionMatrix()
    camera.lookAt(center)
    const oc = orbitRef.current
    if (oc) { oc.target.copy(center); oc.minDistance = 0; oc.maxDistance = Infinity; oc.update() }
    if (gl) gl.__orbitControls = oc
  }, [ready, groupRef, camera, gl, freeFov])

  // ── Changement de caméra ─────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    const oc = orbitRef.current
    if (activeCamera === 0) {
      // Caméra libre — rétablit OrbitControls sans contrainte
      camera.fov = freeFov
      camera.updateProjectionMatrix()
      if (oc) {
        oc.minDistance = 0
        oc.maxDistance = Infinity
        oc.enablePan   = true
        oc.enableZoom  = true
        oc.update()
      }
    } else {
      const cam = cameras[activeCamera - 1]
      if (!cam) return

      // ── Position (convertie OMSI→Three.js dans parseBusCameras) ──────────
      const worldPos = new THREE.Vector3(cam.x, cam.y, cam.z)
      camera.position.copy(worldPos)
      camera.fov = cam.fov
      camera.updateProjectionMatrix()

      // ── Direction de regard depuis les angles OMSI (degrés → radians) ────
      //
      // OMSI utilise un repère main-gauche ; Three.js est main-droite.
      // La conversion implique de NÉGATIVER les deux angles de rotation :
      //   · -rotH : OMSI horaire vu du dessus = Three.js anti-horaire (Y+)
      //   · -rotV : OMSI+ = regard vers le bas ; Three.js pitch+ = regard vers le haut
      //
      // PAS de +Math.PI sur radH :
      //   Le vecteur de base (0,0,-1) pointe déjà vers l'avant du bus (Three.js -Z).
      //   Ajouter π le retournerait vers l'arrière.
      //
      // oc.update() appelle camera.lookAt(target) → écrase tout rotation.set() manuel.
      // On place orbitTarget dans la direction voulue pour que OrbitControls
      // oriente la caméra correctement lors de son update().
      //
      const radH = -(cam.rotH * Math.PI) / 180   // yaw   — axe Y  (signe inversé)
      const radV =  (cam.rotV * Math.PI) / 180   // pitch — axe X  (même signe : OMSI+ = bas = Three.js pitch-)

      // Vecteur de regard : base -Z (avant Three.js), ordre YXZ (yaw avant pitch)
      const lookDir = new THREE.Vector3(0, 0, -1)
      lookDir.applyEuler(new THREE.Euler(radV, radH, 0, 'YXZ'))

      // Target fixe à 0.1 m devant la caméra (pivot de rotation tête)
      const pivotDist  = 0.1
      const orbitTarget = worldPos.clone().addScaledVector(lookDir, pivotDist)

      if (oc) {
        oc.target.copy(orbitTarget)
        oc.minDistance = pivotDist
        oc.maxDistance = pivotDist
        oc.enablePan   = false
        oc.enableZoom  = false
        oc.update()  // sync état interne + lookAt(orbitTarget) = orientation finale
      }
    }
  }, [activeCamera, cameras, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mise à jour FOV en mode libre ─────────────────────────────────────────
  useEffect(() => {
    if (activeCamera !== 0 || !ready) return
    camera.fov = freeFov
    camera.updateProjectionMatrix()
  }, [freeFov, activeCamera, camera, ready])

  return (
    <OrbitControls
      ref={(ref) => { orbitRef.current = ref; if (ref && gl) gl.__orbitControls = ref }}
      enableDamping dampingFactor={0.05}
      mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    />
  )
}

// ── Mesh individuel rendu en R3F ──────────────────────────────────────────────
function BusMesh({ geometry, material, position, rotation, renderOrder = 0, visible = true }) {
  if (!geometry) return null
  return (
    <mesh
      geometry={geometry} material={material}
      position={position} rotation={rotation}
      renderOrder={renderOrder} visible={visible}
      castShadow receiveShadow
    />
  )
}

// ── Style partagé pour les petits boutons de l'overlay ───────────────────────
const btnBase = {
  borderRadius: 4, padding: '4px 10px', fontSize: 14,
  cursor: 'pointer', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", border: '1px solid',
}
const btnOff  = { ...btnBase, background: '#1a1c22', color: '#888', borderColor: '#333' }
const btnOn   = { ...btnBase, background: '#e05a00', color: '#fff', borderColor: '#e05a00' }

// ── Composant principal ───────────────────────────────────────────────────────
export default function BusInspectorPage() {
  const [status,       setStatus]       = useState('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [progress,     setProgress]     = useState({ loaded: 0, total: 0 })
  const [rawMeshes,    setRawMeshes]    = useState([])
  const [debugUV,      setDebugUV]      = useState(false)

  // ── LOD ──
  const [availableLods, setAvailableLods] = useState([])  // [0.1, 0.05, ...]
  const [selectedLod,   setSelectedLod]   = useState('0.1')

  // ── Variables de visibilité ──
  // varDefs : [{ name, type: 'visible'|'alphascale', values?: number[] }]
  //   visible    → values : liste triée des targetValues ([visible] tag), bouton par valeur
  //   alphascale → slider 0.0–1.0
  // variables : { [name]: number }
  const [varDefs,       setVarDefs]       = useState([])
  const [variables,     setVariables]     = useState({})
  const [showVarsPanel, setShowVarsPanel] = useState(false)

  // ── Repaints (CTC) ──
  // ctcAliases  : Map<alias, defaultBasename>   ex: 'body' → '2008_citelis12_3d_body.tga'
  // repaints    : [{ name, replacements: Map<alias, absPath> }]
  //               Le premier élément est toujours { name: '__default__', replacements: Map vide }
  // repaintTextures : Map<alias, THREE.Texture> — textures actives du repaint sélectionné
  const [ctcAliases,      setCtcAliases]      = useState(new Map())
  const [repaints,        setRepaints]        = useState([])
  const [selectedRepaint, setSelectedRepaint] = useState('__default__')
  const [repaintTextures, setRepaintTextures] = useState(new Map())
  const [repaintLoading,  setRepaintLoading]  = useState(false)

  // ── Caméras ──
  const [cameras,      setCameras]      = useState([])
  const [activeCamera, setActiveCamera] = useState(0)
  const [freeFov,      setFreeFov]      = useState(50)

  // ── Physique ──
  const [showPhysics, setShowPhysics] = useState(false)

  // ── Éditeur de caméras ──
  const [busTokens,       setBusTokens]       = useState(null)
  const [cameraDirty,     setCameraDirty]     = useState(false)
  const [cameraSaving,    setCameraSaving]    = useState(false)
  const [showCameraPanel, setShowCameraPanel] = useState(false)
  const busFilePathRef = useRef(null)

  // Cache de textures : absPath → THREE.Texture
  // Évite de recharger une texture déjà en mémoire et permet l'invalidation ciblée (Refresh).
  const textureCacheRef = useRef(new Map())

  const groupRef = useRef()

  // ── Calcul des meshes à rendre ─────────────────────────────────────────────
  const loadedMeshes = useMemo(() => {
    return rawMeshes
      // Filtrage par LOD sélectionné
      .filter(m => {
        if (selectedLod === 'all') return true
        const target = parseFloat(selectedLod)
        // Affiche le LOD cible OU les meshes hors LOD (lodDist=null = toujours visible)
        return m.lodDist === target || m.lodDist === null
      })
      .map(m => {
        // ── Construction des matériaux avec variables par slot ────────────────
        // Chaque slot correspond à un [matl] dans le cfg.
        // [visible] et [alphascale] déclarés DANS ce [matl] ne ciblent QUE ce slot,
        // pas les autres — ex : rain_window (slot 1) invisible sans masquer la vitre (slot 0).
        const matArray = m.slots.map(s => {
          // ── Résolution de la texture active (repaint ou défaut) ───────────────
          // On cherche l'alias CTC de ce slot en comparant le basename de sa
          // texturePath avec les valeurs de ctcAliases.
          // Si un repaint actif remplace cet alias, on utilise sa texture.
          let activeTexture    = s.texture
          let activeRoughnessMap = s.roughnessMap
          if (ctcAliases.size > 0 && s.matDef.texturePath) {
            const slotBase = pathUtils.basename(s.matDef.texturePath).toLowerCase()
            for (const [alias, defaultBase] of ctcAliases) {
              if (defaultBase.toLowerCase() === slotBase && repaintTextures.has(alias)) {
                activeTexture = repaintTextures.get(alias)
                // Recalcul du roughnessMap si transmap (l'alpha de la nouvelle texture peut différer)
                if (s.matDef.transmap) activeRoughnessMap = extractAlphaToRoughnessMap(activeTexture)
                break
              }
            }
          }

          const mat = makeMaterial(activeTexture, s.matDef, s.transmapTex, debugUV, s.envmapTex, activeRoughnessMap)

          // ── [alphascale] au niveau matériau ────────────────────────────────
          //
          // CAS A — Matériau avec [matl_transmap] (carrosserie, chrome) :
          //   La variable pilote l'INTENSITÉ DES REFLETS, PAS l'opacité.
          //   Le bus reste 100% opaque. envMapIntensity → 0 = mat, 1 = brillant.
          //   Si envir_brightness = 0 → plus de reflets, mais la carrosserie reste visible.
          //
          // CAS B — Matériau sans transmap (pluie, poussière, overlay) :
          //   La variable pilote l'opacité → fondu progressif.
          //
          if (s.matDef.alphascaleVar) {
            const alpha = Math.max(0, Math.min(1, variables[s.matDef.alphascaleVar] ?? 1.0))

            if (s.matDef.transmap) {
              // CAS A — [matl_transmap] présent :
              //   alpha → intensité des reflets. Texture toujours visible (pas de noir).
              //   Quand alpha=0 : plus de reflets ET metalness→0 pour éviter l'assombrissement
              //   PBR (un matériau métallique sans envMap = quasi-noir en PBR).
              const baseMetal = mat.metalness
              const baseRough = mat.roughness
              mat.transparent     = false
              mat.opacity         = 1.0
              mat.depthWrite      = true
              mat.envMapIntensity = alpha * (s.matDef.envmapIntensity ?? 0.5) * 0.5
              mat.metalness       = alpha * baseMetal
              mat.roughness       = baseRough + (0.95 - baseRough) * (1 - alpha)

            } else if (s.matDef.transparent || s.matDef.alphaTest > 0) {
              // CAS B — [matl_alpha] sans transmap (pluie, overlay wet, vitres alpha) :
              //   Matériau intrinsèquement transparent → alpha pilote l'opacité.
              mat.transparent = true
              mat.opacity     = alpha
              mat.alphaTest   = 0
              mat.side        = THREE.DoubleSide
              mat.depthWrite  = alpha > 0.99

            } else {
              // CAS C — matériau opaque sans transmap (caoutchouc, châssis, déco) :
              //   L'objet reste toujours visible. alpha → envMapIntensity si envmap présent,
              //   sinon ignoré — pas de modification d'opacité.
              mat.transparent = false
              mat.opacity     = 1.0
              mat.depthWrite  = true
              if (s.matDef.envmap) {
                mat.envMapIntensity = alpha * (s.matDef.envmapIntensity ?? 0.5) * 0.5
              }
            }
            mat.needsUpdate = true
          }

          // ── [visible] au niveau matériau ────────────────────────────────────
          // Binaire : montre ou masque ce slot sans affecter les autres slots du mesh.
          if (s.matDef.visibleVar) {
            const cur = variables[s.matDef.visibleVar.name]
            if (cur !== undefined) mat.visible = (cur === s.matDef.visibleVar.value)
          }

          // ── Verrou final transmap ────────────────────────────────────────────
          // Garantie absolue : aucun code ci-dessus ne peut rendre un slot transmap
          // transparent — même si une variable mal configurée modifiait mat.opacity.
          if (s.matDef.transmap) {
            mat.transparent = false
            mat.opacity     = 1.0
          }

          return mat
        })

        let material = matArray.length === 0
          ? makeMaterial(null, {}, null, debugUV)
          : matArray.length === 1 ? matArray[0] : matArray

        // ── Variables de niveau mesh (fallback : tag avant tout [matl]) ───────
        // Applique sur tous les matériaux du mesh.
        // Pour les slots transmap dans ce mesh, on applique aussi le CAS A.
        if (m.alphascaleVar) {
          const alpha = Math.max(0, Math.min(1, variables[m.alphascaleVar] ?? 1.0))
          const mats  = Array.isArray(material) ? material : [material]
          const slots = m.slots || []
          mats.forEach((mat, idx) => {
            const slotDef = slots[idx]?.matDef || {}
            if (slotDef.transmap) {
              // CAS A — interpolation metalness+roughness (même logique que le cas slot-level)
              const bMetal = mat.metalness
              const bRough = mat.roughness
              mat.transparent     = false
              mat.opacity         = 1.0
              mat.depthWrite      = true
              mat.envMapIntensity = alpha * (slotDef.envmapIntensity ?? 0.5) * 0.5
              mat.metalness       = alpha * bMetal
              mat.roughness       = bRough + (0.95 - bRough) * (1 - alpha)
            } else if (slotDef.transparent || slotDef.alphaTest > 0) {
              // CAS B
              mat.transparent = true; mat.opacity = alpha
              mat.alphaTest = 0; mat.side = THREE.DoubleSide
              mat.depthWrite = alpha > 0.99
            } else {
              // CAS C — opaque sans transmap : envmap seulement, jamais d'opacité
              mat.transparent = false; mat.opacity = 1.0; mat.depthWrite = true
              if (slotDef.envmap) mat.envMapIntensity = alpha * (slotDef.envmapIntensity ?? 0.5) * 0.5
            }
            mat.needsUpdate = true
          })
        }

        let visible = true
        if (m.visibleVar) {
          const cur = variables[m.visibleVar.name]
          if (cur !== undefined) visible = (cur === m.visibleVar.value)
        }

        return {
          geometry: m.geometry, material,
          position: m.position, rotation: m.rotation,
          renderOrder: m.meshIdx, visible,
        }
      })
  }, [rawMeshes, debugUV, selectedLod, variables, ctcAliases, repaintTextures])

  // ── Chargement des textures du repaint sélectionné ───────────────────────
  useEffect(() => {
    if (selectedRepaint === '__default__') {
      setRepaintTextures(new Map())
      return
    }
    const repaint = repaints.find(r => r.name === selectedRepaint)
    if (!repaint) return

    let cancelled = false
    setRepaintLoading(true)

    ;(async () => {
      const cache = textureCacheRef.current
      const newMap = new Map()
      for (const [alias, absPath] of repaint.replacements) {
        if (cancelled) break
        let tex = cache.get(absPath)
        if (!tex) {
          tex = await loadTexture(absPath)
          if (tex) cache.set(absPath, tex)
        }
        if (tex) newMap.set(alias, tex)
      }
      if (!cancelled) {
        setRepaintTextures(newMap)
        setRepaintLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [selectedRepaint, repaints]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh : invalide le cache et recharge les textures du repaint actif ─
  const handleRepaintRefresh = async () => {
    const repaint = repaints.find(r => r.name === selectedRepaint)
    if (!repaint || selectedRepaint === '__default__') return

    setRepaintLoading(true)
    const cache = textureCacheRef.current
    const newMap = new Map()

    for (const [alias, absPath] of repaint.replacements) {
      // Invalider l'entrée de cache existante
      const old = cache.get(absPath)
      if (old) { old.dispose(); cache.delete(absPath) }
      // Recharger depuis le disque
      const tex = await loadTexture(absPath)
      if (tex) { cache.set(absPath, tex); newMap.set(alias, tex) }
    }

    setRepaintTextures(newMap)
    setRepaintLoading(false)
  }

  // ── Synchronisation caméras 3D ← tokens éditeur ──────────────────────────
  useEffect(() => {
    if (!busTokens) return
    setCameras(tokensTo3DCameras(busTokens))
  }, [busTokens])

  // ── Sauvegarde du fichier .bus depuis les tokens éditeur ──────────────────
  const handleSaveCameras = async () => {
    if (!busFilePathRef.current || !busTokens) return
    setCameraSaving(true)
    try {
      const content = BP.serialize(busTokens)
      const res = await window.api.bus.writeFile(busFilePathRef.current, content)
      if (res?.success) setCameraDirty(false)
      else console.error('[BusInspector] Erreur sauvegarde :', res?.error)
    } finally {
      setCameraSaving(false)
    }
  }

  // ── Mise à jour tokens depuis l'éditeur ───────────────────────────────────
  const handleTokensChange = (newTokens) => {
    setBusTokens(newTokens)
    setCameraDirty(true)
  }

  // ── Pipeline de chargement ─────────────────────────────────────────────────
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const busFile  = params.get('busFile')
    const omsiPath = params.get('omsiPath')
    if (!busFile) { setStatus('error'); setErrorMsg('Aucun fichier .bus spécifié.'); return }

    const busDir  = pathUtils.dirname(busFile.replace(/\\/g, '/'))
    const omsiRoot = omsiPath
      ? omsiPath.replace(/\\/g, '/')
      : pathUtils.join(busDir, '../..')

    const name = pathUtils.basename(busFile).replace(/\.bus$/i, '')
    document.title = `Bus Inspector — ${name}`

    loadBus(busFile, busDir, omsiRoot)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBus(busFile, busDir, omsiRoot) {
    setStatus('loading')
    try {
      // ── Étape 1 : .bus → chemin model.cfg ────────────────────────────────
      const busResult = await window.api.bus.readFile(busFile)
      if (!busResult?.success) throw new Error(`Impossible de lire : ${busFile}`)

      // Parse les caméras via les tokens (synchronise aussi cameras via l'effect)
      busFilePathRef.current = busFile
      setBusTokens(BP.parse(busResult.content))
      setActiveCamera(0)

      const cfgRelPath = findModelCfgInBus(busResult.content)
      if (!cfgRelPath) throw new Error('Aucune entrée [model_cfg] dans le .bus')

      const cfgFullPath = await resolveFirstExisting([
        pathUtils.join(omsiRoot, cfgRelPath),
        pathUtils.join(busDir,   cfgRelPath),
      ])
      if (!cfgFullPath) throw new Error(`model.cfg introuvable : ${cfgRelPath}`)

      const cfgDir = pathUtils.dirname(cfgFullPath)

      // ── Étape 2 : Parse model.cfg ─────────────────────────────────────────
      const cfgResult = await window.api.bus.readFile(cfgFullPath)
      if (!cfgResult?.success) throw new Error(`Impossible de lire le cfg : ${cfgFullPath}`)

      const meshDefs = parseCfg(cfgResult.content)
      if (!meshDefs.length) throw new Error('Aucun mesh dans le model.cfg')

      // ── Étape 2b : Parse CTC (repaints) ──────────────────────────────────
      const { ctcDir, ctcAliases: parsedAliases } = parseCfgCTC(cfgResult.content)
      setCtcAliases(parsedAliases)

      if (ctcDir) {
        // Résolution du dossier CTC : relatif à la racine véhicule (busDir)
        // avec fallback sur omsiRoot (certains packs utilisent un chemin absolu OMSI).
        const ctcAbsDirs = [
          pathUtils.join(busDir,   ctcDir),
          pathUtils.join(omsiRoot, ctcDir),
        ]
        let ctcAbsDir = null
        for (const candidate of ctcAbsDirs) {
          const ctiList = await window.api.bus.listDir(candidate, '.cti')
          if (ctiList.length > 0) { ctcAbsDir = candidate; break }
        }

        if (ctcAbsDir) {
          try {
            const ctiFiles = await window.api.bus.listDir(ctcAbsDir, '.cti')
            // repaintMap : nom → Map<alias, absPath>
            const repaintMap = new Map()

            for (const ctiFile of ctiFiles) {
              const ctiResult = await window.api.bus.readFile(ctiFile)
              if (!ctiResult?.success) continue
              for (const item of parseCti(ctiResult.content)) {
                if (!repaintMap.has(item.name)) repaintMap.set(item.name, new Map())
                // chemin absolu = ctcAbsDir / chemin relatif dans le .cti
                repaintMap.get(item.name).set(
                  item.alias,
                  pathUtils.join(ctcAbsDir, item.texturePath)
                )
              }
            }

            const repaintsArr = [{ name: '__default__', replacements: new Map() }]
            for (const [name, replacements] of repaintMap) {
              repaintsArr.push({ name, replacements })
            }
            setRepaints(repaintsArr)
            setSelectedRepaint('__default__')
          } catch (e) {
            console.warn('[BusInspector] Lecture CTC échouée :', e)
          }
        }
      }

      // ── Collecte des LODs disponibles ─────────────────────────────────────
      const lodSet = new Set(meshDefs.map(m => m.lodDist).filter(l => l !== null))
      setAvailableLods([...lodSet].sort((a, b) => b - a))

      // ── Collecte des variables de visibilité ──────────────────────────────
      //
      // 1. Lecture de visual_varlist.txt (script/visual_varlist.txt dans le dossier bus)
      //    → filtre : seules les variables présentes dans ce fichier sont listées.
      //    Si le fichier est absent, on liste tout (fallback).
      //
      // 2. Pour les variables [visible] : collecte de tous les targetValues utilisés
      //    dans le cfg (ex : 0, 1, 2 pour des portes multi-états).
      //
      // 3. Défauts alphascale : Rain_*_Wetness → 0, Envir_Brightness → 1 (tous les autres → 1).

      const ALPHASCALE_DEFAULTS = {
        'Rain_Window_Norm_Wetness':  0,
        'Rain_Window_Front_Wetness': 0,
        'Rain_Window_Wiped_Wetness': 0,
        'Envir_Brightness':          1,
      }
      const getAlphascaleDefault = (name) => ALPHASCALE_DEFAULTS[name] ?? 1.0

      // Lire visual_varlist.txt
      let visualVarSet = null  // null = pas de filtre
      try {
        const vvlPath   = pathUtils.join(busDir, 'script', 'visual_varlist.txt')
        const vvlResult = await window.api.bus.readFile(vvlPath)
        if (vvlResult?.success) {
          visualVarSet = new Set(
            vvlResult.content
              .split(/\r?\n/)
              .map(l => l.trim())
              .filter(l => l && !l.startsWith('//') && !l.startsWith(';'))
          )
        }
      } catch { /* fichier absent : pas de filtre */ }

      // Collecte depuis le CFG
      // visibleValuesMap : varName → Set<targetValue>
      // alphascaleNames  : Set<varName>
      const visibleValuesMap = new Map()
      const alphascaleNames  = new Set()

      const registerVisible = (name, value) => {
        if (!name) return
        if (!visibleValuesMap.has(name)) visibleValuesMap.set(name, new Set())
        visibleValuesMap.get(name).add(value)
      }
      const registerAlphascale = (name) => { if (name) alphascaleNames.add(name) }

      for (const def of meshDefs) {
        if (def.visibleVar)    registerVisible(def.visibleVar.name, def.visibleVar.value)
        if (def.alphascaleVar) registerAlphascale(def.alphascaleVar)
        for (const mat of def.materials) {
          if (mat.visibleVar)    registerVisible(mat.visibleVar.name, mat.visibleVar.value)
          if (mat.alphascaleVar) registerAlphascale(mat.alphascaleVar)
        }
      }

      // Filtre + construction de varDefs / varMap
      const varDefsArr = []
      const varMap     = {}

      // Variables [visible] : filtrées par visual_varlist.txt si présent
      for (const [name, valSet] of visibleValuesMap) {
        if (visualVarSet && !visualVarSet.has(name)) continue
        const values = [...valSet].sort((a, b) => a - b)
        // Ajoute 0 comme option implicite si absent (état initial = caché)
        if (!valSet.has(0)) values.unshift(0)
        varDefsArr.push({ name, type: 'visible', values })
        // Défaut = 0 (état initial du véhicule)
        varMap[name] = 0
      }

      // Variables [alphascale] : jamais filtrées par visual_varlist.txt,
      // toujours listées si présentes dans le CFG.
      for (const name of alphascaleNames) {
        varDefsArr.push({ name, type: 'alphascale' })
        varMap[name] = getAlphascaleDefault(name)
      }

      setVarDefs(varDefsArr)
      setVariables(varMap)

      setProgress({ loaded: 0, total: meshDefs.length })

      // ── Étape 3 : Chargement des meshes ──────────────────────────────────
      const results = []

      for (let idx = 0; idx < meshDefs.length; idx++) {
        const def = meshDefs[idx]
        try {
          const o3dPath = await resolveFirstExisting([
            pathUtils.join(omsiRoot, def.o3dPath),
            pathUtils.join(cfgDir,   def.o3dPath),
            pathUtils.join(busDir,   def.o3dPath),
          ])

          let geometry = null
          let o3dMats  = []

          if (o3dPath) {
            const rawBuffer = await window.api.file.readBuffer(o3dPath)
            if (rawBuffer) {
              const parsed = parseO3D(toArrayBuffer(rawBuffer))
              o3dMats  = parsed.materials || []
              geometry = o3dToBufferGeometry(parsed)
              // Pas de remap des triangles : le tableau de slots sera indexé
              // directement par O3D matIdx (voir ci-dessous).
            }
          }

          // ── Résolution des slots de matériaux ─────────────────────────────
          //
          // Règle OMSI : les [matl] du CFG sont des OVERRIDES par nom de texture.
          //
          //   • Pour chaque matériau O3D, on cherche un [matl] CFG dont le
          //     basename (sans extension) est identique.
          //   • Si une correspondance est trouvée → le slot CFG est utilisé
          //     (il apporte envmap, alphascale, transmap, etc.).
          //   • Si aucune correspondance → le matériau garde sa texture O3D
          //     native avec des propriétés par défaut (ex : doors.tga).
          //
          // Le tableau résultant est indexé par O3D matIdx, ce qui correspond
          // directement aux geo.group(materialIndex) produits par o3dToBufferGeometry.
          //
          const matStem = (p) =>
            pathUtils.basename(p || '').toLowerCase().replace(/\.[^.]+$/, '')

          let slotDefs   // un slot par O3D matIdx
          if (o3dMats.length > 0) {
            const cfgByName = new Map()
            for (const cfgSlot of def.materials) {
              const s = matStem(cfgSlot.texturePath)
              if (s) cfgByName.set(s, cfgSlot)
            }
            slotDefs = o3dMats.map(o3dMat => {
              const match = cfgByName.get(matStem(o3dMat.textureName))
              return match ?? {
                // Pas de [matl] CFG pour ce matériau → texture native O3D
                texturePath:     o3dMat.textureName,
                transparent:     false,
                noDepthWrite:    false,
                alphaTest:       0,
                transmap:        null,
                envmap:          null,
                envmapIntensity: 0.5,
                illum:           false,
                visibleVar:      null,
                alphascaleVar:   null,
              }
            })
          } else {
            // O3D sans section matériaux → positional CFG (ou vide)
            slotDefs = def.materials
          }

          const slots = []
          for (const slot of slotDefs) {
            let texture    = null
            let transmapTex = null
            let envmapTex  = null
            let roughnessMap = null

            if (slot.texturePath) {
              const absPath = await resolveTexturePath(slot.texturePath, busDir, omsiRoot)
              if (absPath) texture = await loadTexture(absPath)
            }
            if (slot.transmap) {
              // '__self__' = alpha de la texture principale (pas de fichier externe)
              if (slot.transmap !== '__self__') {
                const tmPath = await resolveTexturePath(slot.transmap, busDir, omsiRoot)
                if (tmPath) transmapTex = await loadTexture(tmPath)
              }
              // Dans les deux cas, extraire l'alpha → roughnessMap
              roughnessMap = extractAlphaToRoughnessMap(texture)
            }
            if (slot.envmap) {
              const evPath = await resolveTexturePath(slot.envmap, busDir, omsiRoot)
              if (evPath) {
                envmapTex = await loadTexture(evPath)
                if (envmapTex) envmapTex.mapping = THREE.EquirectangularReflectionMapping
              }
            }

            slots.push({ texture, matDef: slot, transmapTex, envmapTex, roughnessMap })
          }

          const [sx, sy, sz] = def.position
          const [rx, ry, rz] = def.rotation
          const threePos = [sx,  sy, -sz]
          const threeRot = [
            THREE.MathUtils.degToRad(-rx),
            THREE.MathUtils.degToRad(-ry),
            THREE.MathUtils.degToRad(rz),
          ]

          if (geometry) {
            results.push({
              geometry, slots,
              position: threePos, rotation: threeRot,
              meshIdx:       idx,
              lodDist:       def.lodDist,
              visibleVar:    def.visibleVar,
              alphascaleVar: def.alphascaleVar,
            })
          }
        } catch (meshErr) {
          console.warn(`[BusInspector] Mesh ${def.o3dPath} ignoré :`, meshErr)
        }
        setProgress({ loaded: idx + 1, total: meshDefs.length })
      }

      if (!results.length) throw new Error('Aucun mesh chargé avec succès.')
      setRawMeshes(results)
      setStatus('ready')

    } catch (err) {
      console.error('[BusInspector]', err)
      setErrorMsg(err.message || String(err))
      setStatus('error')
    }
  }

  // ── Utilitaire : mise à jour d'une variable ────────────────────────────────
  const setVar = (name, value) => setVariables(prev => ({ ...prev, [name]: value }))

  // ── Navigation clavier : ← → pour cycler entre les caméras ──────────────
  useEffect(() => {
    if (status !== 'ready') return
    const total = cameras.length  // 0 = caméra libre uniquement
    if (total === 0) return
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        setActiveCamera(prev => (prev <= 0 ? total : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveCamera(prev => (prev >= total ? 0 : prev + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status, cameras]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const isReady = status === 'ready'

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0d0f14',
      position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif'
    }}>

      {/* ── Chargement ── */}
      {status === 'loading' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 20
        }}>
          <div style={{ color: '#e05a00', fontSize: 24, marginBottom: 16 }}>⚙</div>
          <div style={{ color: '#ccc', fontSize: 14, marginBottom: 20 }}>Chargement des modèles 3D…</div>
          <div style={{ width: 320, height: 6, background: '#222', borderRadius: 3, overflow: 'hidden', margin: '0 auto 12px' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #e05a00, #ff8c42)',
              width: `${progress.total ? (progress.loaded / progress.total) * 100 : 0}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>
            {progress.loaded} / {progress.total} objets chargés
          </div>
        </div>
      )}

      {/* ── Erreur ── */}
      {status === 'error' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', zIndex: 20, maxWidth: 520, padding: 32
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
          <div style={{ color: '#ff6b6b', fontSize: 15, marginBottom: 12 }}>Échec du chargement</div>
          <div style={{
            color: '#aaa', fontSize: 14, background: '#1a1a1a',
            borderRadius: 8, padding: 16, textAlign: 'left',
            fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.7
          }}>
            {errorMsg}
          </div>
        </div>
      )}

      {/* ── Canvas 3D ── */}
      {(isReady || status === 'loading') && (
        <div style={{
          position: 'absolute', inset: 0,
          opacity: isReady ? 1 : 0, transition: 'opacity 0.4s'
        }}>
          <Canvas
            style={{ width: '100%', height: '100%' }}
            camera={{ fov: 50, near: 0.01, far: 10000, position: [0, 5, 20] }}
            gl={{ antialias: true, outputColorSpace: THREE.SRGBColorSpace }}
            onCreated={({ gl }) => {
              gl.toneMapping         = THREE.NoToneMapping
              gl.toneMappingExposure = 1.0
            }}
            resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          >
            {/* Environment HDRI pour les réflexions envmap (metalnessMap + envMapIntensity) */}
            <Environment preset="city" background={false} />

            {/* Éclairage studio neutre — fidélité colorimétrique maximale */}
            <ambientLight intensity={1.0} color={0xffffff} />
            <directionalLight position={[-10, 20, 10]}  intensity={0.8} />
            <directionalLight position={[10,  15, -10]} intensity={0.8} />

            <gridHelper args={[200, 40, 0x333333, 0x222222]} />
            <axesHelper args={[5]} />

            <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={30} blur={2} far={20} resolution={512} />

            <Suspense fallback={null}>
              <group ref={groupRef}>
                {loadedMeshes.map((m, i) => (
                  <BusMesh
                    key={i}
                    geometry={m.geometry} material={m.material}
                    position={m.position} rotation={m.rotation}
                    renderOrder={m.renderOrder} visible={m.visible}
                  />
                ))}
              </group>
            </Suspense>

            {showPhysics && busTokens && <PhysicsOverlay tokens={busTokens} />}

            <CameraController groupRef={groupRef} ready={isReady} cameras={cameras} activeCamera={activeCamera} freeFov={freeFov} />
          </Canvas>

          {/* ── Overlays ── */}
          {isReady && (
            <>
              {/* Légende bas-centre */}
              <div style={{
                position: 'absolute', bottom: 14, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 20, color: '#555', fontSize: 13,
                pointerEvents: 'none'
              }}>
                {activeCamera === 0 ? (
                  <>
                    <span>Gauche : rotation</span>
                    <span>Molette : zoom</span>
                    <span>Droit : déplacement</span>
                    {cameras.length > 0 && <span>← → : caméras</span>}
                  </>
                ) : (
                  <>
                    <span>Gauche : rotation tête</span>
                    {cameras.length > 0 && <span>← → : caméras</span>}
                  </>
                )}
              </div>

              {/* ── Caméras — haut gauche ── */}
              {busTokens && (
                <div style={{
                  position: 'absolute', top: 10, left: 14,
                  display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
                  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                }}>
                  {/* Bouton toggle panneau */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => setShowCameraPanel(v => !v)}
                      style={{
                        ...btnBase,
                        background: showCameraPanel ? '#252836' : '#1a1c22',
                        color: showCameraPanel ? '#ccc' : '#888',
                        borderColor: showCameraPanel ? '#3a3f55' : '#333',
                        padding: '3px 10px', fontSize: 14,
                      }}
                    >
                      Caméras {showCameraPanel ? '▲' : '▼'}
                      {cameraDirty && <span style={{ color: '#e05a00', marginLeft: 6 }}>●</span>}
                    </button>

                    {/* Vue libre */}
                    <button
                      onClick={() => setActiveCamera(0)}
                      style={activeCamera === 0 ? btnOn : btnOff}
                      title="Vue libre"
                    >
                      ⊙
                    </button>
                  </div>

                  {/* Slider FOV — visible seulement en mode libre */}
                  {activeCamera === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#555', fontSize: 13 }}>FOV</span>
                      <input
                        type="range" min="20" max="120" step="1"
                        value={freeFov}
                        onChange={e => setFreeFov(Number(e.target.value))}
                        style={{ width: 100, accentColor: '#e05a00' }}
                      />
                      <span style={{ color: '#666', fontSize: 13, minWidth: 28 }}>
                        {freeFov}°
                      </span>
                    </div>
                  )}

                  {/* Panneau éditeur */}
                  {showCameraPanel && (
                    <CameraEditorPanel
                      tokens={busTokens}
                      onTokensChange={handleTokensChange}
                      onSave={handleSaveCameras}
                      isSaving={cameraSaving}
                      isDirty={cameraDirty}
                      activeCamera={activeCamera}
                      onSelectCamera={setActiveCamera}
                    />
                  )}
                </div>
              )}

              {/* ── Sélecteur LOD — centré en haut ── */}
              {availableLods.length > 0 && (
                <div style={{
                  position: 'absolute', top: 10, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: 4, alignItems: 'center', zIndex: 10
                }}>
                  <span style={{ color: '#555', fontSize: 13, marginRight: 4, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
                    LOD
                  </span>
                  <button
                    onClick={() => setSelectedLod('all')}
                    style={selectedLod === 'all' ? btnOn : btnOff}
                  >
                    Tout
                  </button>
                  {availableLods.map(lod => (
                    <button
                      key={lod}
                      onClick={() => setSelectedLod(String(lod))}
                      style={selectedLod === String(lod) ? btnOn : btnOff}
                    >
                      {lod}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Contrôles haut-droite ── */}
              <div style={{
                position: 'absolute', top: 10, right: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6
              }}>
                <div style={{ color: '#555', fontSize: 14, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", pointerEvents: 'none' }}>
                  {loadedMeshes.length} mesh{loadedMeshes.length > 1 ? 'es' : ''}
                </div>

                <button onClick={() => setDebugUV(d => !d)} style={debugUV ? btnOn : btnOff}>
                  UV debug {debugUV ? 'ON' : 'OFF'}
                </button>

                {busTokens && (
                  <>
                    <button onClick={() => setShowPhysics(v => !v)} style={showPhysics ? btnOn : btnOff}>
                      Physics {showPhysics ? 'ON' : 'OFF'}
                    </button>

                    {/* ── Panneau debug valeurs brutes ── */}
                    {showPhysics && (() => {
                      const axles   = BP.getAxles(busTokens)
                      const bbox    = BP.getBoundingBox(busTokens)
                      const cg      = BP.getValue(busTokens, 'schwerpunkt')
                      const rotPnt  = BP.getValue(busTokens, 'rot_pnt_long')
                      const monoStyle = { fontFamily: 'monospace', fontSize: 11 }
                      const row = (label, val) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: '#555' }}>{label}</span>
                          <span style={{ color: '#aaa' }}>{val}</span>
                        </div>
                      )
                      return (
                        <div style={{
                          background: '#161820', border: '1px solid #252836', borderRadius: 6,
                          padding: '8px 10px', minWidth: 210, ...monoStyle,
                        }}>
                          {bbox && <>
                            <div style={{ color: '#00ff88', fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>BOUNDINGBOX</div>
                            {row('width',   bbox.width)}
                            {row('length',  bbox.length)}
                            {row('height',  bbox.height)}
                            {row('offsetX', bbox.offsetX)}
                            {row('offsetY', bbox.offsetY)}
                            {row('offsetZ', bbox.offsetZ)}
                          </>}

                          {axles.length > 0 && <>
                            <div style={{ color: '#ff8800', fontSize: 10, letterSpacing: 1, margin: '6px 0 4px' }}>ESSIEUX ({axles.length})</div>
                            {axles.map((a, i) => (
                              <div key={i} style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #1e2030' }}>
                                <div style={{ color: '#666', fontSize: 10, marginBottom: 2 }}>#{i}</div>
                                {row('achse_long',           a.achse_long)}
                                {row('achse_maxwidth',       a.achse_maxwidth)}
                                {row('achse_minwidth',       a.achse_minwidth)}
                                {row('achse_raddurchmesser', a.achse_raddurchmesser)}
                                {row('achse_antrieb',        a.achse_antrieb)}
                              </div>
                            ))}
                          </>}

                          {(cg || rotPnt) && <>
                            <div style={{ color: '#aaaaff', fontSize: 10, letterSpacing: 1, margin: '6px 0 4px' }}>PHYSIQUE</div>
                            {cg     && row('schwerpunkt',  cg)}
                            {rotPnt && row('rot_pnt_long', rotPnt)}
                          </>}
                        </div>
                      )
                    })()}
                  </>
                )}

                {varDefs.length > 0 && (
                  <button
                    onClick={() => setShowVarsPanel(v => !v)}
                    style={showVarsPanel ? btnOn : btnOff}
                  >
                    Variables {showVarsPanel ? '▲' : '▼'}
                  </button>
                )}

                {/* ── Sélecteur de repaint (CTC) ── */}
                {repaints.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <select
                      value={selectedRepaint}
                      onChange={e => setSelectedRepaint(e.target.value)}
                      disabled={repaintLoading}
                      style={{
                        background: '#1a1c22', color: repaintLoading ? '#555' : '#ccc',
                        border: '1px solid #333', borderRadius: 4,
                        padding: '3px 6px', fontSize: 14, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                        cursor: 'pointer', maxWidth: 160,
                      }}
                    >
                      <option value="__default__">— Défaut —</option>
                      {repaints.filter(r => r.name !== '__default__').map(r => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleRepaintRefresh}
                      disabled={repaintLoading || selectedRepaint === '__default__'}
                      title="Recharger les textures depuis le disque"
                      style={{
                        ...btnBase,
                        background: '#1a1c22',
                        color: (repaintLoading || selectedRepaint === '__default__') ? '#444' : '#aaa',
                        borderColor: '#333',
                        padding: '3px 6px',
                      }}
                    >
                      {repaintLoading ? '…' : '↺'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Panneau Variables ── */}
              {showVarsPanel && varDefs.length > 0 && (
                <div style={{
                  position: 'absolute', top: 100, right: 14,
                  background: '#161820', border: '1px solid #2a2d38',
                  borderRadius: 6, padding: '10px 12px',
                  minWidth: 220, zIndex: 30, maxHeight: 'calc(100vh - 130px)',
                  overflowY: 'auto',
                }}>
                  <div style={{ color: '#777', fontSize: 13, marginBottom: 8, letterSpacing: 1, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
                    VARIABLES
                  </div>
                  {varDefs.map(v => (
                    <div key={v.name} style={{
                      marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4
                    }}>
                      <div style={{ color: '#aaa', fontSize: 13, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", wordBreak: 'break-all' }}>
                        {v.name}
                      </div>

                      {v.type === 'visible' ? (
                        // Bouton par valeur (déterminée depuis le cfg : 0, 1, 2, …)
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(v.values ?? [0, 1]).map(val => (
                            <button
                              key={val}
                              onClick={() => setVar(v.name, val)}
                              style={{ ...((variables[v.name] === val) ? btnOn : btnOff), flex: 1 }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      ) : (
                        // Slider 0.0–1.0
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={variables[v.name] ?? 1}
                            onChange={e => setVar(v.name, parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: '#e05a00' }}
                          />
                          <span style={{ color: '#888', fontSize: 13, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", minWidth: 34 }}>
                            {(variables[v.name] ?? 1).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toArrayBuffer(raw) {
  if (raw instanceof ArrayBuffer) return raw
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
}

async function resolveFirstExisting(candidates) {
  for (const candidate of candidates) {
    const dir  = pathUtils.dirname(candidate)
    const file = pathUtils.basename(candidate)
    if (!file) continue
    try {
      const exists = await window.api.bus.fileExists(dir, file)
      if (exists) return candidate
    } catch { /* ignoré */ }
  }
  return null
}
