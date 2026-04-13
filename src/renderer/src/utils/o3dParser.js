/**
 * O3D Binary Parser pour OMSI 2
 * Référence : https://github.com/space928/Blender-O3D-IO-Public/blob/main/o3d_io/o3dconvert.py
 *
 * Format binaire :
 *   Header : [0x84][0x19][version:u8]
 *   Si version > 3 : [options:u8][key:u32]
 *     options bit 0 → long triangle indices (u32 vs u16)
 *     options bit 1 → alt encryption seed
 *   Sections (boucle) :
 *     [id:u8]
 *     0x17 = vertices   0x49 = triangles  0x26 = matériaux
 *     0x54 = bones      0x79 = transform
 *
 * Système de coordonnées OMSI (DirectX, gaucher) :
 *   X = droite, Y = haut (up), Z = avant (en profondeur)
 * Three.js (OpenGL, droitier) :
 *   X = droite, Y = haut, Z = vers le spectateur
 *
 * Conversion : inverser Z (position, normale).
 *   → aucune rotation du groupe nécessaire.
 *   → la négation de Z change déjà le sens de rotation (CW→CCW), donc PAS
 *     d'inversion des indices de triangle.
 *   → V est flippé (origine DirectX haut-gauche → OpenGL bas-gauche).
 */

import * as THREE from 'three'

const SEC_VERTEX    = 0x17
const SEC_TRIANGLE  = 0x49
const SEC_MATERIAL  = 0x26
const SEC_BONE      = 0x54
const SEC_TRANSFORM = 0x79

/** Lecture d'une chaîne CP-1252 null-terminée */
function readCp1252(view, offset, maxLen) {
  let str = ''
  for (let i = 0; i < maxLen; i++) {
    const b = view.getUint8(offset + i)
    if (b === 0) break
    str += String.fromCharCode(b)
  }
  return str
}

/**
 * Parse un ArrayBuffer contenant un fichier .o3d
 * Retourne { vertices, triangles, materials, transform, version }
 */
export function parseO3D(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer)) {
    const u8 = arrayBuffer
    arrayBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
  }
  if (arrayBuffer.byteLength < 3) throw new Error('Fichier O3D trop petit')

  const view = new DataView(arrayBuffer)
  let   off  = 0

  // ── Header ────────────────────────────────────────────────────────────────
  const m0      = view.getUint8(off++)
  const m1      = view.getUint8(off++)
  const version = view.getUint8(off++)

  if (m0 !== 0x84 || m1 !== 0x19) {
    throw new Error(`Magic O3D invalide : 0x${m0.toString(16)} 0x${m1.toString(16)}`)
  }

  // l_header : les compteurs (vertex count, triangle count) sont en uint32
  const l_header = version > 3

  // longTriIdx : les indices de triangle sont en uint32 (bit 0 de options)
  let longTriIdx = false

  if (l_header) {
    const options = view.getUint8(off++);           // bit 0 = long tri idx
    longTriIdx    = (options & 1) !== 0
    const key     = view.getUint32(off, true); off += 4
    if (key !== 0xFFFFFFFF) throw new Error('Fichiers O3D chiffrés non supportés')
  }

  // ── Sections ──────────────────────────────────────────────────────────────
  let vertices  = []
  let triangles = []
  let materials = []
  let transform = null

  try {
    while (off < view.byteLength - 1) {
      const sec = view.getUint8(off++)

      // ── Vertices ──────────────────────────────────────────────────────────
      if (sec === SEC_VERTEX) {
        let count
        if (l_header) { count = view.getUint32(off, true); off += 4 }
        else           { count = view.getUint16(off, true); off += 2 }

        vertices = new Array(count)
        for (let i = 0; i < count; i++) {
          // struct "<ffffffff" = 8 floats × 4 bytes = 32 bytes/vertex
          // [0:3] position (xp,yp,zp)  [3:6] normale (xn,yn,zn)  [6:8] UV (u,v)
          const px = view.getFloat32(off,      true)
          const py = view.getFloat32(off +  4, true)
          const pz = view.getFloat32(off +  8, true)
          const nx = view.getFloat32(off + 12, true)
          const ny = view.getFloat32(off + 16, true)
          const nz = view.getFloat32(off + 20, true)
          const u  = view.getFloat32(off + 24, true)
          const v  = view.getFloat32(off + 28, true)
          off += 32

          // Conversion DirectX (gaucher) → OpenGL/Three.js (droitier) :
          //   · Inverser Z sur la position et la normale.
          //   · V NON flippé ici : on force flipY = false sur toutes les textures
          //     dans BusInspectorPage, ce qui préserve la convention DirectX
          //     (V=0 = haut de l'image) sans double-inversion.
          //     Un flip V dans le parser + flipY=true (défaut Three.js) sur PNG/Canvas
          //     donnait le bon résultat pour ces formats, mais causait une inversion
          //     sur DDS/TGA qui ont flipY=false par défaut → décalage texture réelle.
          vertices[i] = { px, py, pz: -pz, nx, ny, nz: -nz, u, v }
        }

      // ── Triangles ─────────────────────────────────────────────────────────
      } else if (sec === SEC_TRIANGLE) {
        let count
        if (l_header) { count = view.getUint32(off, true); off += 4 }
        else           { count = view.getUint16(off, true); off += 2 }

        triangles = new Array(count)
        for (let i = 0; i < count; i++) {
          let i0, i1, i2, matIdx
          if (longTriIdx) {
            // struct "<IIIH" = 3×u32 + 1×u16 = 14 bytes
            i0     = view.getUint32(off,     true); off += 4
            i1     = view.getUint32(off,     true); off += 4
            i2     = view.getUint32(off,     true); off += 4
            matIdx = view.getUint16(off,     true); off += 2
          } else {
            // struct "<HHHH" = 4×u16 = 8 bytes
            i0     = view.getUint16(off,     true); off += 2
            i1     = view.getUint16(off,     true); off += 2
            i2     = view.getUint16(off,     true); off += 2
            matIdx = view.getUint16(off,     true); off += 2
          }
          // Inversion du winding : OMSI DirectX (CW) → Three.js OpenGL (CCW)
          // Confirmé par o3dconvert.py : t[0:3][::-1]
          // La négation de Z ne suffit PAS — il faut aussi inverser les indices.
          triangles[i] = { i0: i2, i1, i2: i0, matIdx }
        }

      // ── Matériaux ─────────────────────────────────────────────────────────
      } else if (sec === SEC_MATERIAL) {
        // Les matériaux utilisent toujours un compteur uint16 (pas l_header)
        const count = view.getUint16(off, true); off += 2

        materials = new Array(count)
        for (let i = 0; i < count; i++) {
          // struct "<fffffffffffB" = 11 floats + 1 byte = 45 bytes
          // · diffuse RGBA  (4f)
          // · specular RGB  (3f)
          // · emission RGB  (3f)
          // · specular power (1f)
          // · rawLen (B) = longueur réelle - 1 (pascal string)
          off += 44                                   // skip 11 floats

          const rawLen     = view.getUint8(off++)     // = struct B (m[-1])
          let   textureName = null
          if (rawLen > 0) {
            textureName = readCp1252(view, off, rawLen).replace(/\\/g, '/').trim()
          }
          off += rawLen

          materials[i] = { textureName }
        }

      // ── Transform (matrice 4×4) ────────────────────────────────────────────
      } else if (sec === SEC_TRANSFORM) {
        const m = []
        for (let i = 0; i < 16; i++) { m.push(view.getFloat32(off, true)); off += 4 }
        // OMSI stocke en row-major → Three.js Matrix4 prend les lignes
        transform = new THREE.Matrix4().set(
          m[0],  m[1],  m[2],  m[3],
          m[4],  m[5],  m[6],  m[7],
          m[8],  m[9],  m[10], m[11],
          m[12], m[13], m[14], m[15]
        )

      // ── Bones (ignorés pour le rendu statique) ────────────────────────────
      } else if (sec === SEC_BONE) {
        let count
        if (l_header) { count = view.getUint32(off, true); off += 4 }
        else           { count = view.getUint16(off, true); off += 2 }
        // Structure bone variable (pascal string + weights) → skip approximatif
        off += count * 68
        if (off > view.byteLength) break

      } else {
        break  // section inconnue → arrêt propre
      }
    }
  } catch {
    // Parse partiel acceptable si on a déjà vertices + triangles
  }

  return { vertices, triangles, materials, transform, version }
}

/**
 * Convertit le résultat de parseO3D en THREE.BufferGeometry.
 *
 * Les triangles sont triés par matIdx puis regroupés via geo.addGroup() :
 *   group(start, count, materialIndex)
 * Cela permet d'associer un tableau de matériaux THREE à un seul mesh.
 */
export function o3dToBufferGeometry(parsed) {
  const { vertices, triangles } = parsed
  if (!vertices.length || !triangles.length) return null

  const sorted = triangles.slice().sort((a, b) => a.matIdx - b.matIdx)

  const positions = new Float32Array(vertices.length * 3)
  const normals   = new Float32Array(vertices.length * 3)
  const uvs       = new Float32Array(vertices.length * 2)

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i]
    positions[i * 3]     = v.px
    positions[i * 3 + 1] = v.py
    positions[i * 3 + 2] = v.pz
    normals[i * 3]       = v.nx
    normals[i * 3 + 1]   = v.ny
    normals[i * 3 + 2]   = v.nz
    uvs[i * 2]           = v.u
    uvs[i * 2 + 1]       = v.v
  }

  const useU32  = vertices.length > 65535
  const indices = new (useU32 ? Uint32Array : Uint16Array)(sorted.length * 3)
  for (let i = 0; i < sorted.length; i++) {
    indices[i * 3]     = sorted[i].i0
    indices[i * 3 + 1] = sorted[i].i1
    indices[i * 3 + 2] = sorted[i].i2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal',   new THREE.BufferAttribute(normals,   3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))

  if (sorted.length > 0) {
    let groupStart = 0
    let curMat     = sorted[0].matIdx
    for (let i = 1; i <= sorted.length; i++) {
      const nextMat = i < sorted.length ? sorted[i].matIdx : -1
      if (nextMat !== curMat) {
        geo.addGroup(groupStart * 3, (i - groupStart) * 3, curMat)
        groupStart = i
        curMat     = nextMat
      }
    }
  }

  return geo
}
