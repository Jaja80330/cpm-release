/**
 * Parser pour les fichiers .cti OMSI 2 (Color Theme Index)
 *
 * Format :
 *   [item]
 *   Nom du repaint          ← affiché dans l'UI
 *   alias_cible             ← correspond à un [CTCTexture] alias du model.cfg
 *   chemin\vers\tex.dds     ← relatif au dossier CTC (défini par [CTC] dans model.cfg)
 *
 *   [setvar]                ← ignoré pour le rendu
 *   ...
 *
 * Retourne : [{ name, alias, texturePath }]
 */
export function parseCti(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim())
  const items = []
  let i = 0

  while (i < lines.length) {
    if (lines[i].toLowerCase() === '[item]') {
      i++
      const name        = (i < lines.length && lines[i] && !lines[i].startsWith('[')) ? lines[i++] : ''
      const alias       = (i < lines.length && lines[i] && !lines[i].startsWith('[')) ? lines[i++] : ''
      const texturePath = (i < lines.length && lines[i] && !lines[i].startsWith('['))
        ? lines[i++].replace(/\\/g, '/') : ''
      if (name && alias && texturePath) items.push({ name, alias, texturePath })
    } else {
      i++
    }
  }

  return items
}
