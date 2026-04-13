/**
 * Bus Inspector — Visualiseur 3D de bus OMSI 2
 * S'ouvre dans une nouvelle fenêtre Electron avec ?busInspector=1&busFile=...&omsiPath=...
 */

import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { DDSLoader }     from 'three/examples/jsm/loaders/DDSLoader.js'
import { TGALoader }     from 'three/examples/jsm/loaders/TGALoader.js'
import { parseO3D, o3dToBufferGeometry } from '../utils/o3dParser'
import { findModelCfgInBus, parseCfg, pathUtils } from '../utils/cfgParser'

// ── Paramètres uniformes sur toutes les textures ─────────────────────────────
//
// flipY = false : convention DirectX OMSI (V=0 = haut de l'image).
//   Les UVs du parser ne sont PAS flippés (v non inversé).
//   flipY=true sur PNG/Canvas + v: 1-v = double-flip accidentellement correct
//   seulement pour ces formats ; DDS/TGA ont flipY=false par défaut → décalage.
//   Solution : flipY=false partout, les UVs natifs OMSI sont utilisés tels quels.
//
function applyTexParams(tex) {
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
  let roughness, metalness
  if (useTransmap) {
    roughness = Math.max(0.05, 1.0 - envmapIntensity * 0.90)
    metalness = Math.min(1.0,  envmapIntensity * 0.65)
  } else if (envmap) {
    roughness = Math.max(0.1, 1 - envmapIntensity * 0.9)
    metalness = Math.min(1.0, envmapIntensity * 0.7)
  } else {
    roughness = 0.95
    metalness = 0
  }

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
  //       alpha=0   → G=0   → roughness=0          (zone brillante : chrome, vernis)
  //       alpha=255 → G=255 → roughness=base (0.05) (zone mate : peinture)
  //   · transmapTex → metalnessMap (canal B = luminance pour grayscale)
  //   · envmapTex   → mat.envMap   (réflexion d'environnement)
  //   · envmapIntensity → mat.envMapIntensity
  //
  if (useTransmap) {
    mat.transparent = false     // OPAQUE : aucune exception
    mat.opacity     = 1.0
    mat.alphaTest   = 0
    mat.depthWrite  = true
    mat.side        = THREE.FrontSide   // carrosserie vue de l'extérieur uniquement

    if (roughnessMapOverride) mat.roughnessMap = roughnessMapOverride
    if (transmapTex)          mat.metalnessMap = transmapTex   // absent si '__self__'
    if (envmapTex)            mat.envMap = envmapTex
    mat.envMapIntensity = envmapIntensity

  } else if (envmapTex) {
    // Matériau standard avec [matl_envmap] sans transmap (caoutchouc, châssis, déco) :
    // le sphere map OMSI est lié comme envMap PBR → reflets visibles sur fond sombre.
    mat.envMap          = envmapTex
    mat.envMapIntensity = envmapIntensity
  }

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

// ── Composant caméra : auto-fit après chargement ─────────────────────────────
function CameraAutoFit({ groupRef, ready }) {
  const { camera, gl } = useThree()
  const orbitRef = useRef()

  useEffect(() => {
    if (!ready || !groupRef.current) return
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
    camera.updateProjectionMatrix()
    camera.lookAt(center)
    if (gl.__orbitControls) {
      gl.__orbitControls.target.copy(center)
      gl.__orbitControls.update()
    }
  }, [ready, groupRef, camera, gl])

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
  borderRadius: 4, padding: '3px 8px', fontSize: 11,
  cursor: 'pointer', fontFamily: 'monospace', border: '1px solid',
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
  const [selectedLod,   setSelectedLod]   = useState('all')

  // ── Variables de visibilité ──
  // varDefs : [{ name, type: 'visible'|'alphascale' }]
  // variables : { [name]: number }   visible → 0|1   alphascale → 0.0–1.0
  const [varDefs,       setVarDefs]       = useState([])
  const [variables,     setVariables]     = useState({})
  const [showVarsPanel, setShowVarsPanel] = useState(false)

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
          const mat = makeMaterial(s.texture, s.matDef, s.transmapTex, debugUV, s.envmapTex, s.roughnessMap)

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
              //   Carrosserie opaque. alpha → intensité des reflets uniquement.
              mat.transparent     = false
              mat.opacity         = 1.0
              mat.depthWrite      = true
              mat.envMapIntensity = alpha * (s.matDef.envmapIntensity ?? 0.5)

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
                mat.envMapIntensity = alpha * (s.matDef.envmapIntensity ?? 0.5)
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
              // CAS A
              mat.transparent     = false
              mat.opacity         = 1.0
              mat.depthWrite      = true
              mat.envMapIntensity = alpha * (slotDef.envmapIntensity ?? 0.5)
            } else if (slotDef.transparent || slotDef.alphaTest > 0) {
              // CAS B
              mat.transparent = true; mat.opacity = alpha
              mat.alphaTest = 0; mat.side = THREE.DoubleSide
              mat.depthWrite = alpha > 0.99
            } else {
              // CAS C — opaque sans transmap : envmap seulement, jamais d'opacité
              mat.transparent = false; mat.opacity = 1.0; mat.depthWrite = true
              if (slotDef.envmap) mat.envMapIntensity = alpha * (slotDef.envmapIntensity ?? 0.5)
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
  }, [rawMeshes, debugUV, selectedLod, variables])

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

      // ── Collecte des LODs disponibles ─────────────────────────────────────
      const lodSet = new Set(meshDefs.map(m => m.lodDist).filter(l => l !== null))
      setAvailableLods([...lodSet].sort((a, b) => b - a))

      // ── Collecte des variables de visibilité ──────────────────────────────
      // Les variables peuvent être déclarées au niveau mesh (fallback) OU au niveau
      // matériau (cas standard : [visible]/[alphascale] après un [matl] dans le cfg).
      const varMap = {}
      const varDefsArr = []

      const registerVar = (name, type, defaultVal) => {
        if (name && !(name in varMap)) {
          varMap[name] = defaultVal
          varDefsArr.push({ name, type })
        }
      }

      for (const def of meshDefs) {
        // Niveau mesh (fallback : tag avant tout [matl])
        if (def.visibleVar)    registerVar(def.visibleVar.name, 'visible',    def.visibleVar.value)
        if (def.alphascaleVar) registerVar(def.alphascaleVar,   'alphascale', 1.0)
        // Niveau matériau (cas courant : tag dans un bloc [matl])
        for (const mat of def.materials) {
          if (mat.visibleVar)    registerVar(mat.visibleVar.name, 'visible',    mat.visibleVar.value)
          if (mat.alphascaleVar) registerVar(mat.alphascaleVar,   'alphascale', 1.0)
        }
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
          <div style={{ color: '#666', fontSize: 12 }}>
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
            color: '#aaa', fontSize: 12, background: '#1a1a1a',
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
            resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
          >
            {/* Environment HDRI pour les réflexions envmap (metalnessMap + envMapIntensity) */}
            <Environment preset="city" background={false} />

            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 20, 10]}  intensity={0.8} castShadow />
            <directionalLight position={[-10, 15, -5]} intensity={0.4} />
            <gridHelper args={[200, 40, 0x333333, 0x222222]} />
            <axesHelper args={[5]} />

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

            <CameraAutoFit groupRef={groupRef} ready={isReady} />
          </Canvas>

          {/* ── Overlays ── */}
          {isReady && (
            <>
              {/* Légende bas-centre */}
              <div style={{
                position: 'absolute', bottom: 14, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 20, color: '#555', fontSize: 11,
                pointerEvents: 'none'
              }}>
                <span>Gauche : rotation</span>
                <span>Molette : zoom</span>
                <span>Droit : déplacement</span>
              </div>

              {/* ── Sélecteur LOD — centré en haut ── */}
              {availableLods.length > 0 && (
                <div style={{
                  position: 'absolute', top: 10, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex', gap: 4, alignItems: 'center', zIndex: 10
                }}>
                  <span style={{ color: '#555', fontSize: 10, marginRight: 4, fontFamily: 'monospace' }}>
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
                <div style={{ color: '#555', fontSize: 11, pointerEvents: 'none' }}>
                  {loadedMeshes.length} mesh{loadedMeshes.length > 1 ? 'es' : ''}
                </div>

                <button onClick={() => setDebugUV(d => !d)} style={debugUV ? btnOn : btnOff}>
                  UV debug {debugUV ? 'ON' : 'OFF'}
                </button>

                {varDefs.length > 0 && (
                  <button
                    onClick={() => setShowVarsPanel(v => !v)}
                    style={showVarsPanel ? btnOn : btnOff}
                  >
                    Variables {showVarsPanel ? '▲' : '▼'}
                  </button>
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
                  <div style={{ color: '#777', fontSize: 10, marginBottom: 8, letterSpacing: 1, fontFamily: 'monospace' }}>
                    VARIABLES
                  </div>
                  {varDefs.map(v => (
                    <div key={v.name} style={{
                      marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4
                    }}>
                      <div style={{ color: '#aaa', fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {v.name}
                      </div>

                      {v.type === 'visible' ? (
                        // Toggle 0 / 1
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => setVar(v.name, 0)}
                            style={{ ...((variables[v.name] === 0) ? btnOn : btnOff), flex: 1 }}
                          >
                            0 (caché)
                          </button>
                          <button
                            onClick={() => setVar(v.name, 1)}
                            style={{ ...((variables[v.name] === 1) ? btnOn : btnOff), flex: 1 }}
                          >
                            1 (visible)
                          </button>
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
                          <span style={{ color: '#888', fontSize: 10, fontFamily: 'monospace', minWidth: 28 }}>
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
