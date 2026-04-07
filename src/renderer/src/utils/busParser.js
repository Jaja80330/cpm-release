/**
 * Parser OMSI 2 .bus — Machine à États v2
 *
 * Types de tokens produits :
 *   meta         — commentaire (; ...) ou ligne vide
 *   unknown      — ligne non reconnue hors contexte
 *   single       — [key] + 1 valeur
 *   list         — [key] + compteur N + N items  (script, varnamelist…)
 *   friendlyname — [friendlyname] + Constructeur + Modèle + Peinture
 *   description  — [description] + texte jusqu'à [end]
 *   camera       — [add_camera_*] + N valeurs (collection)
 *   axle         — [newachse] + N valeurs (collection)
 */

// ── Configuration des sections ─────────────────────────────────────────────

/** Sections à compteur : ligne suivante = N, puis N items. */
const LIST_SECTIONS = new Set([
  'script', 'varnamelist', 'stringvarnamelist', 'constfile',
])

/**
 * Sections caméra : chaque occurrence produit un token camera indépendant.
 * fields : noms des valeurs capturées dans l'ordre.
 */
const CAMERA_CONFIG = {
  'add_camera_driver':    { type: 'driver',    fields: ['x','y','z','rotX','rotY','rotZ','fov'] },
  'add_camera_pax':       { type: 'pax',       fields: ['x','y','z','rotX','rotY','rotZ','fov'] },
  'add_camera_reflexion': { type: 'reflexion', fields: ['x','y','z','rotX','rotY','rotZ'] },
}

/** Champs d'un essieu — 6 lignes. */
const AXLE_FIELDS = ['posX', 'posY', 'posZ', 'radius', 'springType', 'brakeType']

// ── Parse ──────────────────────────────────────────────────────────────────

/**
 * Parse le contenu brut d'un fichier .bus.
 * @param {string} rawContent
 * @returns {Token[]}
 */
export function parse(rawContent) {
  const lines = rawContent.split(/\r?\n/)
  const tokens = []
  let i = 0

  while (i < lines.length) {
    const raw     = lines[i]
    const trimmed = raw.trim()

    // ── Ligne vide ou commentaire ──────────────────────────────────────
    if (!trimmed || trimmed.startsWith(';')) {
      tokens.push({ kind: 'meta', raw })
      i++
      continue
    }

    // ── Détection du tag [keyword] ─────────────────────────────────────
    const tagMatch = trimmed.match(/^\[(.+)\]$/)
    if (!tagMatch) {
      tokens.push({ kind: 'unknown', raw })
      i++
      continue
    }

    const key     = tagMatch[1]
    const keyLower = key.toLowerCase()

    // [end] — ferme [description], ignoré ailleurs
    if (keyLower === 'end') {
      tokens.push({ kind: 'meta', raw })
      i++
      continue
    }

    // ── [friendlyname] : Constructeur / Modèle / Peinture ─────────────
    if (keyLower === 'friendlyname') {
      i++
      const manufacturer = (lines[i++] ?? '').trim()
      const model        = (lines[i++] ?? '').trim()
      const paint        = (lines[i++] ?? '').trim()
      tokens.push({ kind: 'friendlyname', key, keyLower, manufacturer, model, paint })
      continue
    }

    // ── [description] : texte libre jusqu'à [end] ─────────────────────
    if (keyLower === 'description') {
      i++
      const textLines = []
      while (i < lines.length) {
        const dl = lines[i].trim()
        if (dl.toLowerCase() === '[end]') { i++; break }
        textLines.push(lines[i])
        i++
      }
      tokens.push({ kind: 'description', key, keyLower, text: textLines.join('\n') })
      continue
    }

    // ── Sections à compteur ────────────────────────────────────────────
    if (LIST_SECTIONS.has(keyLower)) {
      i++
      const countStr = (lines[i++] ?? '').trim()
      const count    = Math.max(0, parseInt(countStr, 10) || 0)
      const items    = []
      for (let j = 0; j < count; j++) {
        items.push((lines[i++] ?? '').trim())
      }
      tokens.push({ kind: 'list', key, keyLower, items })
      continue
    }

    // ── Sections caméra (collections) ─────────────────────────────────
    const camCfg = CAMERA_CONFIG[keyLower]
    if (camCfg) {
      i++
      const values = {}
      for (const field of camCfg.fields) {
        values[field] = (lines[i++] ?? '').trim()
      }
      tokens.push({ kind: 'camera', key, keyLower, cameraType: camCfg.type,
                    fields: camCfg.fields, values })
      continue
    }

    // ── [newachse] : essieu (collection) ──────────────────────────────
    if (keyLower === 'newachse') {
      i++
      const values = {}
      for (const field of AXLE_FIELDS) {
        values[field] = (lines[i++] ?? '').trim()
      }
      tokens.push({ kind: 'axle', key, keyLower, fields: AXLE_FIELDS, values })
      continue
    }

    // ── Valeur unique (défaut) ─────────────────────────────────────────
    i++
    const val = (lines[i++] ?? '').trim()
    tokens.push({ kind: 'single', key, keyLower, value: val })
  }

  return tokens
}

// ── Serialize ──────────────────────────────────────────────────────────────

/**
 * Reconstruit le fichier .bus depuis les tokens.
 * Préserve les commentaires et lignes vides dans leur ordre d'origine.
 * @param {Token[]} tokens
 * @returns {string}
 */
export function serialize(tokens) {
  const out = []

  for (const tok of tokens) {
    switch (tok.kind) {

      case 'meta':
      case 'unknown':
        out.push(tok.raw)
        break

      case 'single':
        out.push(`[${tok.key}]`)
        out.push(tok.value)
        break

      case 'list':
        out.push(`[${tok.key}]`)
        out.push(String(tok.items.length))
        tok.items.forEach(it => out.push(it))
        break

      case 'friendlyname':
        out.push(`[${tok.key}]`)
        out.push(tok.manufacturer)
        out.push(tok.model)
        out.push(tok.paint)
        break

      case 'description':
        out.push(`[${tok.key}]`)
        tok.text.split('\n').forEach(l => out.push(l))
        out.push('[end]')
        break

      case 'camera':
        out.push(`[${tok.key}]`)
        tok.fields.forEach(f => out.push(tok.values[f] ?? '0'))
        break

      case 'axle':
        out.push(`[${tok.key}]`)
        tok.fields.forEach(f => out.push(tok.values[f] ?? '0'))
        break
    }
  }

  return out.join('\r\n')
}

// ── Accesseurs — Single ────────────────────────────────────────────────────

export function getValue(tokens, keyLower, def = '') {
  const t = tokens.find(t => t.kind === 'single' && t.keyLower === keyLower)
  return t ? t.value : def
}

export function setValue(tokens, keyLower, value) {
  const idx = tokens.findIndex(t => t.kind === 'single' && t.keyLower === keyLower)
  const tok = { kind: 'single', key: keyLower, keyLower, value: String(value) }
  if (idx >= 0) { const c = [...tokens]; c[idx] = { ...c[idx], value: String(value) }; return c }
  return [...tokens, tok]
}

// ── Accesseurs — Friendlyname ──────────────────────────────────────────────

export function getFriendlyname(tokens) {
  const t = tokens.find(t => t.kind === 'friendlyname')
  return t ? { manufacturer: t.manufacturer, model: t.model, paint: t.paint }
           : { manufacturer: '', model: '', paint: '' }
}

export function setFriendlyname(tokens, { manufacturer, model, paint }) {
  const idx = tokens.findIndex(t => t.kind === 'friendlyname')
  const tok = { kind: 'friendlyname', key: 'friendlyname', keyLower: 'friendlyname',
                manufacturer: manufacturer ?? '', model: model ?? '', paint: paint ?? '' }
  if (idx >= 0) { const c = [...tokens]; c[idx] = tok; return c }
  return [...tokens, tok]
}

// ── Accesseurs — Description ───────────────────────────────────────────────

export function getDescription(tokens) {
  const t = tokens.find(t => t.kind === 'description')
  return t ? t.text : ''
}

export function setDescription(tokens, text) {
  const idx = tokens.findIndex(t => t.kind === 'description')
  const tok = { kind: 'description', key: 'description', keyLower: 'description',
                text: String(text) }
  if (idx >= 0) { const c = [...tokens]; c[idx] = tok; return c }
  return [...tokens, tok]
}

// ── Accesseurs — List ──────────────────────────────────────────────────────

export function getList(tokens, keyLower) {
  const t = tokens.find(t => t.kind === 'list' && t.keyLower === keyLower)
  return t ? [...t.items] : []
}

export function setList(tokens, keyLower, items) {
  const idx = tokens.findIndex(t => t.kind === 'list' && t.keyLower === keyLower)
  if (idx >= 0) {
    const c = [...tokens]
    c[idx] = { ...c[idx], items: [...items] }
    return c
  }
  return [...tokens, { kind: 'list', key: keyLower, keyLower, items: [...items] }]
}

// ── Accesseurs — Caméras ───────────────────────────────────────────────────

/**
 * Retourne toutes les caméras d'un type donné.
 * @param {Token[]} tokens
 * @param {'driver'|'pax'|'reflexion'} cameraType
 * @returns {object[]}  — tableaux de { x, y, z, rotX, rotY, rotZ, fov? }
 */
export function getCameras(tokens, cameraType) {
  return tokens
    .filter(t => t.kind === 'camera' && t.cameraType === cameraType)
    .map(t => ({ ...t.values }))
}

/** Met à jour les valeurs d'une caméra à l'index donné (immuable). */
export function setCameraAt(tokens, cameraType, index, newValues) {
  let n = 0
  return tokens.map(t => {
    if (t.kind !== 'camera' || t.cameraType !== cameraType) return t
    return n++ === index ? { ...t, values: { ...t.values, ...newValues } } : t
  })
}

/** Ajoute une nouvelle caméra par défaut à la fin des tokens. */
export function addCamera(tokens, cameraType) {
  const cfg = Object.entries(CAMERA_CONFIG).find(([, c]) => c.type === cameraType)
  if (!cfg) return tokens
  const [key, { fields }] = cfg
  const values = {}
  fields.forEach(f => { values[f] = '0' })
  return [...tokens, { kind: 'camera', key, keyLower: key, cameraType, fields, values }]
}

/** Supprime la caméra à l'index donné. */
export function removeCamera(tokens, cameraType, index) {
  let n = 0
  return tokens.filter(t => {
    if (t.kind !== 'camera' || t.cameraType !== cameraType) return true
    return n++ !== index
  })
}

// ── Accesseurs — Essieux ───────────────────────────────────────────────────

export function getAxles(tokens) {
  return tokens.filter(t => t.kind === 'axle').map(t => ({ ...t.values }))
}

export function setAxleAt(tokens, index, newValues) {
  let n = 0
  return tokens.map(t => {
    if (t.kind !== 'axle') return t
    return n++ === index ? { ...t, values: { ...t.values, ...newValues } } : t
  })
}

export function addAxle(tokens) {
  const values = {}
  AXLE_FIELDS.forEach(f => { values[f] = '0' })
  return [...tokens, { kind: 'axle', key: 'newachse', keyLower: 'newachse',
                       fields: AXLE_FIELDS, values }]
}

export function removeAxle(tokens, index) {
  let n = 0
  return tokens.filter(t => { if (t.kind !== 'axle') return true; return n++ !== index })
}

// ── Template nouveau fichier ───────────────────────────────────────────────

export function defaultTokens() {
  return [
    { kind: 'meta',         raw: '; Fichier .bus généré par Cinnamon — NEROSY' },
    { kind: 'meta',         raw: '; OMSI 2 Bus Configuration' },
    { kind: 'meta',         raw: '' },
    { kind: 'friendlyname', key: 'friendlyname', keyLower: 'friendlyname',
      manufacturer: '', model: '', paint: '' },
    { kind: 'meta',         raw: '' },
    { kind: 'description',  key: 'description',  keyLower: 'description', text: '' },
    { kind: 'meta',         raw: '' },
    { kind: 'single',       key: 'length',       keyLower: 'length',       value: '12.0' },
    { kind: 'single',       key: 'passengers',   keyLower: 'passengers',   value: '80' },
    { kind: 'single',       key: 'health',       keyLower: 'health',       value: '1.0' },
    { kind: 'meta',         raw: '' },
    { kind: 'list',         key: 'script',       keyLower: 'script',       items: [] },
    { kind: 'meta',         raw: '' },
    { kind: 'list',         key: 'varnamelist',  keyLower: 'varnamelist',  items: [] },
  ]
}
