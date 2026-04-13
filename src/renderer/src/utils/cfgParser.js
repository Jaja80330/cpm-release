/**
 * Parsers pour les fichiers OMSI 2 .bus et model.cfg
 */

/**
 * Extrait le chemin du model.cfg depuis le contenu d'un fichier .bus
 * Le chemin est relatif à la racine OMSI.
 */
export function findModelCfgInBus(busContent) {
  const lines = busContent.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const tag = lines[i].trim().toLowerCase()
    if (tag === '[model]' || tag === '[model_cfg]') {
      const next = lines[i + 1]?.trim()
      if (next && !next.startsWith('[')) return next.replace(/\\/g, '/')
    }
  }
  return null
}

/**
 * Parse un fichier model.cfg OMSI 2
 *
 * Structure retournée :
 * [{
 *   o3dPath:      string,
 *   materials:    [{
 *     texturePath:     string|null,
 *     transparent:     bool,
 *     noDepthWrite:    bool,
 *     alphaTest:       number,
 *     transmap:        string|null,
 *     envmap:          string|null,
 *     envmapIntensity: number,
 *     illum:           bool,
 *   }],
 *   position:     [x, y, z],
 *   rotation:     [rx, ry, rz],
 *   lodDist:      number|null,           // null = hors LOD / toujours visible
 *   visibleVar:   { name, value }|null,  // [visible] — visibilité pilotée par variable
 *   alphascaleVar: string|null,          // [alphascale] — opacité pilotée par variable
 * }]
 */
export function parseCfg(content) {
  const lines  = content.split(/\r?\n/).map(l => l.trim())
  const meshes = []
  let i = 0
  let currentLod = null   // distance LOD courante (null = pas de LOD / toujours visible)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isTopLevel = (s) =>
    s === '[mesh]' || s === '[newobj]' ||
    s === '[groups_count]' || s === '[lods_count]' || s === '[lod]'

  const isNumber = (s) => s && /^-?[\d.]+$/.test(s)

  const nextLine = () => (i < lines.length ? lines[i] : '')

  while (i < lines.length) {
    const tag = lines[i].toLowerCase()

    // ── [lods_count] — nombre de LODs (valeur ignorée, on lit les [lod] suivants) ─
    if (tag === '[lods_count]') {
      i += 2   // skip tag + valeur
      continue
    }

    // ── [lod] — début d'un nouveau niveau de détail ───────────────────────────
    // La ligne suivante est la distance de visibilité (float).
    if (tag === '[lod]') {
      i++
      if (i < lines.length && isNumber(lines[i])) {
        currentLod = parseFloat(lines[i])
        i++
      }
      continue
    }

    if (tag !== '[mesh]' && tag !== '[newobj]') { i++; continue }

    // ── Nouvelle définition de mesh ────────────────────────────────────────
    const mesh = {
      o3dPath:       null,
      materials:     [],
      position:      [0, 0, 0],
      rotation:      [0, 0, 0],
      lodDist:       currentLod,   // hérité du dernier [lod] rencontré
      visibleVar:    null,         // { name: string, value: 0|1 }
      alphascaleVar: null,         // nom de variable → pilote material.opacity
      isShadow:      false,        // [isshadow] → plan d'ombre projetée OMSI à ignorer
    }

    i++
    if (i < lines.length && lines[i] && !lines[i].startsWith('[')) {
      mesh.o3dPath = lines[i].replace(/\\/g, '/')
      i++
    }

    let currentMat = null   // dernier slot de matériau ouvert

    while (i < lines.length) {
      const sub = lines[i].toLowerCase()

      if (isTopLevel(sub)) break

      // ── [matl] — ouvre un nouveau slot de matériau ─────────────────────
      if (sub === '[matl]') {
        currentMat = {
          texturePath:     null,
          transparent:     false,
          noDepthWrite:    false,
          alphaTest:       0,
          transmap:        null,
          envmap:          null,
          envmapIntensity: 0.5,
          illum:           false,
          visibleVar:      null,   // [visible] → cible ce slot uniquement
          alphascaleVar:   null,   // [alphascale] → opacité de ce slot uniquement
        }
        mesh.materials.push(currentMat)
        i++
        if (i < lines.length && lines[i] && !lines[i].startsWith('[')) {
          currentMat.texturePath = lines[i].replace(/\\/g, '/')
          i++
        }

      // ── [matl_transpa] — transparence binaire ──────────────────────────
      } else if (sub === '[matl_transpa]') {
        if (currentMat) currentMat.transparent = true
        i++

      // ── [matl_nowrite] / [matl_nozwrite] — pas d'écriture Z-buffer ─────
      } else if (sub === '[matl_nowrite]' || sub === '[matl_nozwrite]') {
        if (currentMat) currentMat.noDepthWrite = true
        i++

      // ── [matl_illum] — texture émissive ────────────────────────────────
      } else if (sub === '[matl_illum]') {
        if (currentMat) currentMat.illum = true
        i++

      // ── [matl_alpha] valeur  1=transparent  2=transparent+alphaTest ────
      } else if (sub === '[matl_alpha]') {
        i++
        if (i < lines.length && isNumber(nextLine())) {
          const v = parseInt(lines[i])
          if (currentMat) {
            if (v >= 1) currentMat.transparent = true
            if (v === 2) currentMat.alphaTest = 0.5
          }
          i++
        }

      // ── [matl_transmap] — carte de réflexion (alpha → réflectivité) ────────
      // Deux formes OMSI :
      //   [matl_transmap]          → '__self__' : l'alpha de la texture principale
      //   (ligne vide ou tag)        est utilisé comme carte de réflexion
      //
      //   [matl_transmap]          → chemin d'une texture transmap dédiée
      //   chemin/transmap.tga
      } else if (sub === '[matl_transmap]') {
        i++
        if (i < lines.length && !lines[i].startsWith('[')) {
          const texPath = lines[i].trim()
          if (currentMat) {
            currentMat.transmap    = texPath ? texPath.replace(/\\/g, '/') : '__self__'
            currentMat.transparent = false
          }
          i++
        } else {
          // [matl_transmap] sans aucune ligne suivante (tag immédiat)
          if (currentMat) {
            currentMat.transmap    = '__self__'
            currentMat.transparent = false
          }
        }

      // ── [matl_envmap] texture [intensité] ──────────────────────────────
      } else if (sub === '[matl_envmap]') {
        i++
        if (i < lines.length && !lines[i].startsWith('[')) {
          if (currentMat) currentMat.envmap = lines[i].replace(/\\/g, '/')
          i++
          if (i < lines.length && isNumber(nextLine())) {
            if (currentMat) currentMat.envmapIntensity = parseFloat(lines[i])
            i++
          }
        }

      // ── [static] x y z rx ry rz ────────────────────────────────────────
      } else if (sub === '[static]') {
        i++
        if (i < lines.length) {
          const vals = lines[i].trim().split(/\s+/).map(Number)
          mesh.position = [vals[0] || 0, vals[1] || 0, vals[2] || 0]
          mesh.rotation = [vals[3] || 0, vals[4] || 0, vals[5] || 0]
          i++
        }

      // ── [visible] varName targetValue ──────────────────────────────────
      // Si ce tag apparaît APRÈS un [matl], il cible ce slot de matériau uniquement.
      // Sinon (avant tout [matl]) il s'applique au mesh entier.
      } else if (sub === '[visible]') {
        i++
        if (i < lines.length && lines[i] && !lines[i].startsWith('[')) {
          const varName = lines[i]; i++
          let targetVal = 1
          if (i < lines.length && isNumber(lines[i])) {
            targetVal = parseInt(lines[i]); i++
          }
          const vv = { name: varName, value: targetVal }
          if (currentMat) currentMat.visibleVar = vv
          else             mesh.visibleVar       = vv
        }

      // ── [alphascale] varName ───────────────────────────────────────────
      // Si ce tag apparaît APRÈS un [matl], il cible ce slot uniquement.
      } else if (sub === '[alphascale]') {
        i++
        if (i < lines.length && lines[i] && !lines[i].startsWith('[')) {
          if (currentMat) currentMat.alphascaleVar = lines[i]
          else             mesh.alphascaleVar       = lines[i]
          i++
        }

      // ── [isshadow] — plan d'ombre projetée OMSI ────────────────────────────
      // Ces meshes sont des plans noirs semi-transparents destinés aux ombres
      // au sol dans le moteur OMSI. Cinnamon gère les ombres en temps réel →
      // on les marque pour les exclure du chargement.
      } else if (sub === '[isshadow]') {
        mesh.isShadow = true
        i++

      // ── Tags ignorés ────────────────────────────────────────────────────
      } else {
        i++
      }
    }

    if (mesh.o3dPath && !mesh.isShadow) meshes.push(mesh)
  }

  return meshes
}

/**
 * Parse les tags [CTC] et [CTCTexture] d'un model.cfg
 *
 * Retourne :
 *   ctcDir    : string | null          — répertoire des .cti (relatif à la racine véhicule)
 *   ctcAliases: Map<alias, basename>   — ex: 'body' → '2008_citelis12_3d_body.tga'
 */
export function parseCfgCTC(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim())
  let ctcDir = null
  const ctcAliases = new Map()
  let i = 0

  while (i < lines.length) {
    const tag = lines[i].toLowerCase()

    if (tag === '[ctc]') {
      i++
      // Ligne 1 : nom d'affichage (ignoré)
      if (i < lines.length && lines[i] && !lines[i].startsWith('[')) i++
      // Ligne 2 : chemin répertoire CTC
      if (i < lines.length && lines[i] && !lines[i].startsWith('[')) {
        ctcDir = lines[i].replace(/\\/g, '/').trim()
        i++
      }
      // Ligne 3 : flag numérique (ignoré)
      if (i < lines.length && /^\d+$/.test(lines[i])) i++

    } else if (tag === '[ctctexture]') {
      i++
      const alias = (i < lines.length && lines[i] && !lines[i].startsWith('['))
        ? lines[i++].trim() : null
      const defaultBase = (alias && i < lines.length && lines[i] && !lines[i].startsWith('['))
        ? lines[i++].trim() : null
      if (alias && defaultBase) ctcAliases.set(alias, defaultBase)

    } else {
      i++
    }
  }

  return { ctcDir, ctcAliases }
}

/**
 * Utilitaires de chemin (browser-compatible, sans Node.js path)
 */
export const pathUtils = {
  /** Normalise les séparateurs → forward slashes */
  normalize: (p) => (p || '').replace(/\\/g, '/'),

  /** Répertoire parent */
  dirname: (p) => {
    const n = pathUtils.normalize(p)
    const idx = n.lastIndexOf('/')
    return idx === -1 ? '' : n.slice(0, idx)
  },

  /** Nom de fichier */
  basename: (p) => {
    const n = pathUtils.normalize(p)
    return n.slice(n.lastIndexOf('/') + 1)
  },

  /** Extension (avec le point, en minuscules) */
  extname: (p) => {
    const b = pathUtils.basename(p)
    const idx = b.lastIndexOf('.')
    return idx === -1 ? '' : b.slice(idx).toLowerCase()
  },

  /** Concaténation de segments de chemin */
  join: (...parts) =>
    parts
      .map(p => pathUtils.normalize(p))
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, ''),

  /** Résolution de chemin (base + relatif) */
  resolve: (base, rel) => {
    const r = pathUtils.normalize(rel)
    if (/^[A-Za-z]:\//.test(r) || r.startsWith('/')) return r
    return pathUtils.join(pathUtils.dirname(pathUtils.normalize(base)), r)
  }
}
