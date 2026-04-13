import { app, shell, BrowserWindow, ipcMain, dialog, nativeTheme, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import Store from 'electron-store'
import { existsSync, appendFileSync, createWriteStream, readFileSync, watch as fsWatch } from 'fs'
import { readdir, mkdir, readFile, writeFile, unlink, stat, rename, chmod } from 'fs/promises'
import path from 'path'
import archiver from 'archiver'
import JSZip from 'jszip'
import SftpClient from 'ssh2-sftp-client'
import { utils as ssh2Utils } from 'ssh2'
import iconv from 'iconv-lite'
import crypto from 'node:crypto'
import os from 'node:os'
import { exec } from 'child_process'

const store = new Store()

const DEBUG_LOG = path.join(process.cwd(), 'debug_cinnamon.txt')
function debugLog(msg) {
  try { appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`) } catch { /* */ }
}

// ── OFT Parser ────────────────────────────────────────────────────────────
// Les fichiers .oft OMSI 2 sont encodés en Windows-1252 (CP1252).
// On lit le buffer brut puis on décode avec iconv-lite avant de parser.
function parseOftImages(oftPath) {
  try {
    const buffer  = readFileSync(oftPath)
    const content = iconv.decode(buffer, 'win1252')
    const IMG_EXTS = ['.bmp', '.dds', '.tga', '.png', '.jpg']

    return content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && IMG_EXTS.some(ext => l.toLowerCase().endsWith(ext)))
  } catch {
    return []
  }
}

// ── Résolution des assets natifs ─────────────────────────────────────────
function nativeAsset(filename) {
  return is.dev
    ? path.join(process.cwd(), 'resources', filename)
    : path.join(process.resourcesPath, filename)
}

function splashImagePath() {
  return is.dev
    ? path.join(process.cwd(), 'cinnamon-splash.png')
    : path.join(process.resourcesPath, 'cinnamon-splash.png')
}

function splashHtmlPath() {
  return is.dev
    ? path.join(process.cwd(), 'resources', 'splash.html')
    : path.join(process.resourcesPath, 'splash.html')
}

// ── Fenêtre Splash ────────────────────────────────────────────────────────
function createSplashWindow() {
  const splash = new BrowserWindow({
    width:           800,
    height:          450,
    frame:           false,
    transparent:     false,
    resizable:       false,
    movable:         false,
    center:          true,
    alwaysOnTop:     true,
    skipTaskbar:     true,
    backgroundColor: '#1a1a1a',
    show:            false,
    webPreferences:  {
      nodeIntegration: false,
      contextIsolation: true,
      preload: nativeAsset('preload-splash.js')
    }
  })

  splash.loadFile(splashHtmlPath(), {
    query: { img: splashImagePath() }
  })

  splash.once('ready-to-show', () => splash.show())
  return splash
}

// Fondu de fermeture du splash → ouverture de la fenêtre principale
function fadeSplash(splashWindow, mainWindow) {
  let opacity = 1.0
  const STEP = 0.06
  const timer = setInterval(() => {
    opacity -= STEP
    if (opacity <= 0) {
      clearInterval(timer)
      try { splashWindow.close() } catch { /* déjà fermée */ }
      mainWindow.show()
      mainWindow.focus()
    } else {
      try { splashWindow.setOpacity(opacity) } catch { /* ignoré */ }
    }
  }, 16) // ~16 frames × 16 ms ≈ 256 ms
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#202020',
    icon: nativeAsset('cinnamon_icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Le show() est géré par fadeSplash — on ne montre pas ici
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })

  // DevTools automatiques + récupération crash renderer en mode dev
  if (is.dev) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    })
    mainWindow.webContents.on('render-process-gone', (_, details) => {
      console.warn('[Cinnamon] Renderer crashé, rechargement...', details.reason)
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) mainWindow.reload()
      }, 1000)
    })
  }

  // Désactiver tout proxy système pour les requêtes sortantes du renderer
  mainWindow.webContents.session.setProxy({ proxyRules: 'direct://' })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity,OutOfBlinkCors')
app.commandLine.appendSwitch('no-sandbox')

// ── Protocole cinnamon:// ─────────────────────────────────────────────────────
// Permet au renderer du Bus Inspector de charger des textures locales
// (.dds, .tga, .bmp, .png, .jpg) sans restriction CORS/sécurité.
// Enregistrement AVANT app.whenReady() car protocol.registerSchemesAsPrivileged
// doit être appelé avant 'ready'.
protocol.registerSchemesAsPrivileged([
  {
    scheme:     'cinnamon',
    privileges: {
      standard:       true,
      secure:         true,
      supportFetchAPI: true,
      corsEnabled:    false,
      bypassCSP:      true
    }
  }
])

// ── Auto-updater : configuration ────────────────────────────────────────────
autoUpdater.autoDownload    = false  // on déclenche le DL manuellement
autoUpdater.autoInstallOnAppQuit = false

// ── Ouverture du Bus Inspector ────────────────────────────────────────────────
function createBusInspectorWindow(busFilePath) {
  const omsiPath = (store.get('settings', {}).omsiPath || '').replace(/\\/g, '/')

  const win = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        800,
    minHeight:       600,
    show:            true,
    center:          true,
    resizable:       true,
    maximizable:     true,
    minimizable:     true,
    movable:         true,
    autoHideMenuBar: true,
    frame:           true,
    backgroundColor: '#0d0f14',
    title:           'Bus Inspector — Cinnamon',
    icon:            nativeAsset('cinnamon_icon.png'),
    webPreferences:  {
      preload:          join(__dirname, '../preload/index.js'),
      sandbox:          false,
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      false   // nécessaire pour le protocole cinnamon://
    }
  })

  const busFileEncoded  = encodeURIComponent(busFilePath)
  const omsiPathEncoded = encodeURIComponent(omsiPath)
  const query           = `busInspector=1&busFile=${busFileEncoded}&omsiPath=${omsiPathEncoded}`

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?${query}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { busInspector: '1', busFile: busFilePath, omsiPath: omsiPath }
    })
  }

  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.nerosy.cinnamon')
  app.on('browser-window-created', (_, w) => optimizer.watchWindowShortcuts(w))

  // ── Protocole cinnamon:// : sert les fichiers locaux (textures) ────────────
  protocol.registerBufferProtocol('cinnamon', (request, callback) => {
    try {
      // URL : cinnamon:///C:/chemin/vers/fichier.dds
      let rawPath = decodeURIComponent(
        request.url.replace(/^cinnamon:\/\/\/?/, '')
      ).replace(/\//g, '\\')

      // Sur Windows, le chemin commence par la lettre de lecteur (ex: C:\...)
      // Si le premier char est '\', c'est un artefact → on le retire
      if (rawPath.startsWith('\\')) rawPath = rawPath.slice(1)

      const MIME = {
        '.dds':  'image/vnd.ms-dds',
        '.tga':  'image/x-tga',
        '.bmp':  'image/bmp',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg'
      }
      const ext      = path.extname(rawPath).toLowerCase()
      const mimeType = MIME[ext] || 'application/octet-stream'
      const buf      = readFileSync(rawPath)
      callback({ data: buf, mimeType })
    } catch (e) {
      debugLog(`[cinnamon://] Erreur : ${e.message}`)
      callback({ error: -2 })  // net::ERR_FAILED
    }
  })

  // ── Splash screen ────────────────────────────────────────────────────────
  const splash = createSplashWindow()

  // Helper pour envoyer un statut au splash
  function sendSplashStatus(text, progress) {
    if (!splash.isDestroyed()) {
      splash.webContents.send('splash:status', { text, progress })
    }
  }

  // Lance la vérification des mises à jour puis ouvre la fenêtre principale
  function launchApp() {
    const win = createWindow()

    win.once('ready-to-show', () => fadeSplash(splash, win))

    // Filet de sécurité
    setTimeout(() => {
      if (!win.isVisible()) fadeSplash(splash, win)
    }, 8000)

    // Process monitor OMSI (démarré ici car win n'existe pas encore au chargement)
    let processMonitorInterval = null
    win.once('ready-to-show', () => {
      processMonitorInterval = setInterval(async () => {
        if (win.isDestroyed()) { clearInterval(processMonitorInterval); return }
        const running = await isOmsiRunning()
        try { win.webContents.send('omsi:processStatus', { running }) } catch { /* fenêtre détruite */ }
      }, 2500)
    })
    win.on('closed', () => { clearInterval(processMonitorInterval) })

    return win
  }

  // ── Orchestration auto-update ────────────────────────────────────────────
  let win = null

  // Helper : envoie un événement au renderer si la fenêtre principale est ouverte
  function sendUpdaterStatus(payload) {
    if (win && !win.isDestroyed()) win.webContents.send('updater:status', payload)
  }

  autoUpdater.on('checking-for-update', () => {
    sendSplashStatus('Recherche de mises à jour…')
    sendUpdaterStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendSplashStatus('Téléchargement de la mise à jour…', 0)
    sendUpdaterStatus({ state: 'downloading', version: info.version, percent: 0 })
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('download-progress', ({ percent }) => {
    sendSplashStatus('Téléchargement de la mise à jour…', percent)
    sendUpdaterStatus({ state: 'downloading', percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendSplashStatus('Installation…', 100)
    sendUpdaterStatus({ state: 'downloaded', version: info.version })
    setTimeout(() => autoUpdater.quitAndInstall(true, true), 1500)
  })

  autoUpdater.on('update-not-available', (info) => {
    clearTimeout(updateTimeout)
    sendUpdaterStatus({ state: 'up-to-date', version: info.version })
    if (!win) win = launchApp()
  })

  autoUpdater.on('error', (err) => {
    debugLog(`[autoUpdater] Erreur : ${err?.message}`)
    clearTimeout(updateTimeout)
    sendUpdaterStatus({ state: 'error', error: err?.message })
    if (!win) win = launchApp()
  })

  // IPC : vérification manuelle depuis la page Paramètres
  ipcMain.handle('updater:check', async () => {
    // En mode dev, electron-updater saute silencieusement sans émettre d'événement
    if (is.dev) {
      sendUpdaterStatus({ state: 'up-to-date', version: app.getVersion() })
      return { success: true }
    }

    // Timeout de sécurité : si aucun événement n'arrive dans les 20s → erreur
    let settled = false
    const guard = setTimeout(() => {
      if (!settled) {
        settled = true
        sendUpdaterStatus({ state: 'error', error: 'Le serveur de mises à jour ne répond pas.' })
      }
    }, 20000)

    const settle = () => {
      if (!settled) { settled = true; clearTimeout(guard) }
    }
    autoUpdater.once('update-available',    settle)
    autoUpdater.once('update-not-available', settle)
    autoUpdater.once('error',               settle)

    try {
      await autoUpdater.checkForUpdates()
      return { success: true }
    } catch (err) {
      settle()
      debugLog(`[autoUpdater] Vérification manuelle échouée : ${err?.message}`)
      return { success: false, error: err?.message }
    }
  })

  // Fallback de sécurité : si aucun événement updater ne déclenche launchApp
  // (ex. : mode dev, serveur lent, event manqué)
  const updateTimeout = setTimeout(() => {
    if (!win) {
      debugLog('[autoUpdater] Timeout — lancement sans mise à jour')
      win = launchApp()
    }
  }, 12000)

  // Lancer la vérification dès que le splash est visible
  splash.once('ready-to-show', () => {
    // En mode dev, electron-updater saute la vérification sans émettre d'événement
    if (is.dev) {
      clearTimeout(updateTimeout)
      win = launchApp()
      return
    }

    autoUpdater.checkForUpdates().catch((err) => {
      debugLog(`[autoUpdater] checkForUpdates échoué : ${err?.message}`)
      clearTimeout(updateTimeout)
      if (!win) win = launchApp()
    })
  })

  // Window controls — cible la fenêtre émettrice (fonctionne pour la main ET le Bus Inspector)
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.on('window:maximize', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize()
  })
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

  // Native theme
  ipcMain.handle('nativeTheme:isDark', () => nativeTheme.shouldUseDarkColors)
  nativeTheme.on('updated', () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('nativeTheme:changed', nativeTheme.shouldUseDarkColors)
    }
  })


  // ── Bus Inspector ────────────────────────────────────────────────────────────
  ipcMain.handle('busInspector:open', (_, busFilePath) => {
    if (!busFilePath) return { success: false, error: 'Chemin .bus manquant' }
    try {
      createBusInspectorWindow(busFilePath)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Store
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('store:get', (_, key) => store.get(key))
  ipcMain.handle('store:set', (_, key, value) => store.set(key, value))
  ipcMain.handle('store:delete', (_, key) => store.delete(key))

  // Projects
  ipcMain.handle('projects:getAll', () => store.get('projects', []))
  ipcMain.handle('projects:save', (_, projects) => { store.set('projects', projects); return true })

  // Settings
  ipcMain.handle('settings:get', () => {
    const stored = store.get('settings', {})
    return {
      ...stored,
      vpsIp: '158.220.90.1',
      vpsPort: '22',
      vpsUser: 'root',
      sshKeyPath: getCinnamonKeyPath()
    }
  })
  ipcMain.handle('settings:save', (_, s) => { store.set('settings', s); return true })

  // OMSI validation
  ipcMain.handle('omsi:validatePath', (_, p) => existsSync(path.join(p, 'Omsi.exe')))

  // Dialogs
  ipcMain.handle('dialog:selectFolder', async (_, options = {}) => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      defaultPath: options.defaultPath
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:selectFile', async (_, options = {}) => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: options.filters || [],
      defaultPath: options.defaultPath
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:selectFiles', async (_, options = {}) => {
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      filters: options.filters || [],
      defaultPath: options.defaultPath
    })
    return r.canceled ? [] : r.filePaths
  })

  ipcMain.handle('dialog:saveFile', async (_, options = {}) => {
    const r = await dialog.showSaveDialog(win, {
      filters:     options.filters     || [],
      defaultPath: options.defaultPath || '',
    })
    return r.canceled ? null : r.filePath
  })

  // ── Bus editor ───────────────────────────────────────────────────────────
  ipcMain.handle('bus:readFile', async (_, filePath) => {
    try {
      const buf     = await readFile(filePath)
      const content = iconv.decode(buf, 'win1252')
      return { success: true, content }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('bus:writeFile', async (_, filePath, content) => {
    try {
      const buf = iconv.encode(content, 'win1252')
      await writeFile(filePath, buf)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('bus:fileExists', (_, busDir, relativePath) => {
    try {
      return existsSync(path.join(busDir, relativePath))
    } catch {
      return false
    }
  })

  ipcMain.handle('bus:listDir', async (_, dirPath, ext) => {
    try {
      const entries = await readdir(dirPath)
      return entries
        .filter(e => !ext || e.toLowerCase().endsWith(ext.toLowerCase()))
        .map(e => path.join(dirPath, e).replace(/\\/g, '/'))
    } catch {
      return []
    }
  })

  // ── Packaging projet : ZIP structuré + SFTP ──────────────────────────────
  ipcMain.handle('projects:package', async (event, { vehiclesPath, addonsPath, soundsPath, fonts, projectName }) => {
    const s        = event.sender
    const settings = store.get('settings', {})
    const step = (num, total, label) => s.send('project:pack:step',     { stepNum: num, stepTotal: total, label })
    const prog = (pct, label)        => s.send('project:pack:progress', { percent: pct, label })

    const REMOTE_DIR = '/srv/nerosy/backups'
    const sftp = new SftpClient()

    try {
      // ── Étape 1 : Création de l'archive ─────────────────────────────────
      step(1, 3, "Création de l'archive…")
      prog(0, 'Initialisation')

      const now       = new Date()
      const dateStr   = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const safeName  = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
      const archiveName = `${dateStr}_${safeName}.zip`

      const tmpDir  = path.join(app.getPath('temp'), 'cinnamon')
      await mkdir(tmpDir, { recursive: true })
      const zipPath = path.join(tmpDir, archiveName)

      let fileCount = 0
      await new Promise((resolve, reject) => {
        const output = createWriteStream(zipPath)
        const arc    = archiver('zip', { zlib: { level: 6 } })
        arc.pipe(output)
        arc.on('entry', () => { fileCount++; prog(Math.min(25, Math.round(fileCount / 10)), `${fileCount} fichier(s)`) })
        arc.on('error', reject)
        output.on('error', reject)
        output.on('close', resolve)

        if (vehiclesPath && existsSync(vehiclesPath)) arc.directory(vehiclesPath, 'Vehicles')
        if (addonsPath   && existsSync(addonsPath))   arc.directory(addonsPath,   'Addons')
        if (soundsPath   && existsSync(soundsPath))   arc.directory(soundsPath,   'Sounds')
        for (const fp of (fonts || [])) {
          if (existsSync(fp)) arc.file(fp, { name: `Fonts/${path.basename(fp)}` })
        }
        arc.finalize()
      })

      const { size: zipSize } = await stat(zipPath)
      prog(30, `Archive prête — ${(zipSize / 1024).toFixed(0)} Ko`)

      // ── Étape 2 : Connexion + transfert SFTP ────────────────────────────
      if (!settings.vpsIp || !settings.sshKeyPath) {
        throw new Error('Configuration SSH manquante — vérifiez les Paramètres.')
      }

      step(2, 3, 'Connexion au serveur…')
      prog(30, settings.vpsIp)
      await sftp.connect(sshConfig(settings))

      step(2, 3, 'Transfert vers le VPS…')
      await sftp.mkdir(REMOTE_DIR, true)
      await sftp.fastPut(zipPath, `${REMOTE_DIR}/${archiveName}`, {
        step: (transferred, _chunk, total) => {
          prog(
            Math.round(30 + (transferred / total) * 65),
            `${(transferred / 1024).toFixed(0)} Ko / ${(total / 1024).toFixed(0)} Ko`
          )
        }
      })

      prog(95, 'Transfert terminé')
      unlink(zipPath).catch(() => {})

      return {
        success: true,
        archiveName,
        zipSize,
        hasAddons: !!(addonsPath  && existsSync(addonsPath)),
        hasSounds: !!(soundsPath  && existsSync(soundsPath)),
        hasBusPath: !!(vehiclesPath && existsSync(vehiclesPath)),
        busFolderName: vehiclesPath ? path.basename(vehiclesPath) : '',
        fontsCount: (fonts || []).filter(fp => existsSync(fp)).length
      }

    } catch (err) {
      debugLog(`projects:package ERROR: ${err.message}`)
      return { success: false, error: err.message }
    } finally {
      try { await sftp.end() } catch { /* */ }
    }
  })

  // Lire un fichier → Buffer (transmis comme Uint8Array au renderer)
  ipcMain.handle('file:readBuffer', async (_, filePath) => {
    try { return await readFile(filePath) }
    catch { return null }
  })

  // Zipper un dossier → Buffer
  ipcMain.handle('projects:zipFolder', async (_, folderPath) => {
    const tmpDir  = path.join(app.getPath('temp'), 'cinnamon')
    const tmpPath = path.join(tmpDir, `zip_${Date.now()}.zip`)
    await mkdir(tmpDir, { recursive: true })
    await new Promise((resolve, reject) => {
      const output = createWriteStream(tmpPath)
      const arc    = archiver('zip', { zlib: { level: 6 } })
      arc.pipe(output)
      arc.on('error', reject)
      output.on('error', reject)
      output.on('close', resolve)
      arc.directory(folderPath, false)
      arc.finalize()
    })
    const buf = await readFile(tmpPath)
    unlink(tmpPath).catch(() => {})
    return buf
  })

  // Lire une image locale → data URL base64
  ipcMain.handle('file:readAsDataUrl', async (_, filePath) => {
    try {
      const data = await readFile(filePath)
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : 'image/png'
      return `data:${mime};base64,${data.toString('base64')}`
    } catch { return null }
  })

  // OFT Parser
  ipcMain.handle('oft:parse', (_, oftPath) => {
    const images = parseOftImages(oftPath)
    return {
      oftPath,
      images: images.map(img => ({
        name: img,
        path: path.join(path.dirname(oftPath), img),
        exists: existsSync(path.join(path.dirname(oftPath), img))
      }))
    }
  })

  // ── Liste des versions sur le VPS ─────────────────────────────────────────
  ipcMain.handle('sftp:listVersions', async (_, project, settings) => {
    const sftp = new SftpClient()
    try {
      await sftp.connect(sshConfig(settings))
      const remoteDir = `/srv/nerosy/backups/${project.name.replace(/\s+/g, '_')}`
      let versions = []
      try {
        const files = await sftp.list(remoteDir)
        const metaSet = new Set(
          files.filter(f => f.name.endsWith('.meta.json')).map(f => f.name)
        )
        const zips = files.filter(f => f.name.endsWith('.zip'))

        versions = await Promise.all(zips.map(async (f) => {
          let versionName = parseVersionName(f.name, project.name)
          let changelog   = ''
          const metaFile  = `${f.name}.meta.json`
          if (metaSet.has(metaFile)) {
            try {
              const buf  = await sftp.get(`${remoteDir}/${metaFile}`)
              const meta = JSON.parse(buf.toString())
              versionName = meta.versionName || versionName
              changelog   = meta.changelog   || ''
            } catch { /* meta illisible */ }
          }
          return { name: f.name, versionName, changelog, size: f.size, modifyTime: f.modifyTime }
        }))
        versions.sort((a, b) => b.modifyTime - a.modifyTime)
      } catch { /* dossier inexistant — pas encore de push */ }
      return { success: true, versions }
    } catch (err) {
      return { success: false, error: err.message, versions: [] }
    } finally {
      try { await sftp.end() } catch { /* */ }
    }
  })

  // ── PUSH (avec versioning nommé) ──────────────────────────────────────────
  ipcMain.handle('sync:start', async (event, project, settings, versionMeta = {}) => {
    const logs = []
    const s = event.sender
    const log = (msg) => { logs.push({ time: new Date().toISOString(), msg }); debugLog(msg) }
    const step = (n, label, total = 0) => {
      log(`[${n}/2] ${label}`)
      s.send('sync:step', { stepNum: n, stepTotal: 2, stepLabel: label, itemTotal: total })
    }
    const prog = (pct, cur, tot, label) => s.send('sync:progress', { percent: pct, current: cur, total: tot, label })

    debugLog('=== PUSH START ===')
    const sftp = new SftpClient()

    try {
      log(`Projet : ${project.name}`)

      // ── Nom de version ────────────────────────────────────────────────────
      const rawVersionName = (versionMeta?.name || '').trim() || 'Sauvegarde automatique'
      const versionSlug    = rawVersionName
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .replace(/-+/g, '-')
        .slice(0, 40)
      log(`Version : "${rawVersionName}"`)

      // ── Collecte des fichiers ─────────────────────────────────────────────
      const IGNORED = ['.blend', '.psd']
      const filesToArchive = []

      const addDir = async (dirPath, prefix) => {
        if (!dirPath) { log(`  [${prefix}] chemin non configuré`); return }
        if (!existsSync(dirPath)) { log(`  [${prefix}] chemin introuvable : ${dirPath}`); return }
        const files = await scanDir(dirPath, IGNORED)
        files.forEach(f => filesToArchive.push({
          absolute:    f,
          archivePath: `${prefix}/${path.relative(dirPath, f).replace(/\\/g, '/')}`
        }))
        log(`  [${prefix}] ${files.length} fichier(s) → ${dirPath}`)
      }

      await addDir(project.vehicles, 'vehicles')
      await addDir(project.addons,   'addons')
      await addDir(project.sounds,   'sounds')

      for (const oftPath of (project.fonts || [])) {
        if (!existsSync(oftPath)) { log(`  OFT introuvable : ${oftPath}`); continue }
        const oftBase = path.basename(oftPath)
        filesToArchive.push({ absolute: oftPath, archivePath: `fonts/${oftBase}` })
        const images = parseOftImages(oftPath)
        for (const img of images) {
          const imgAbs = path.join(path.dirname(oftPath), img)
          if (existsSync(imgAbs)) filesToArchive.push({ absolute: imgAbs, archivePath: `fonts/${img}` })
        }
        log(`  [fonts] ${oftBase} + ${images.length} image(s)`)
      }

      if (filesToArchive.length === 0) {
        log('Aucun fichier à archiver.')
        return { success: false, logs, error: 'Aucun fichier à archiver.' }
      }

      log(`Total : ${filesToArchive.length} fichier(s)`)

      // ── Étape 1 : Archivage (100 % local) ────────────────────────────────
      step(1, "Création de l'archive", filesToArchive.length)

      const now      = new Date()
      const dateStr  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`
      const safeName = project.name.replace(/\s+/g, '_')
      const zipName  = `${dateStr}_${versionSlug}_${safeName}.zip`
      const tmpDir   = path.join(app.getPath('temp'), 'cinnamon')
      await mkdir(tmpDir, { recursive: true })
      const zipPath  = path.join(tmpDir, zipName)

      const zipSizeBytes = await new Promise((resolve, reject) => {
        const output = createWriteStream(zipPath)
        const arc = archiver('zip', { zlib: { level: 6 } })
        arc.pipe(output)

        let processed = 0, lastSent = 0
        arc.on('entry', (entry) => {
          processed++
          const t = Date.now()
          if (t - lastSent >= 80 || processed === filesToArchive.length) {
            lastSent = t
            prog(Math.round(processed / filesToArchive.length * 100), processed, filesToArchive.length, path.basename(entry.name))
          }
        })
        arc.on('error', reject)
        output.on('error', reject)
        output.on('close', () => resolve(arc.pointer()))
        for (const f of filesToArchive) arc.file(f.absolute, { name: f.archivePath })
        arc.finalize()
      })

      log(`Archive : ${zipName} (${(zipSizeBytes / 1024).toFixed(1)} Ko)`)

      // ── Étape 2 : Connexion + transfert ──────────────────────────────────
      step(2, 'Transfert vers le VPS', zipSizeBytes)

      await sftp.connect(sshConfig(settings))
      log('SSH établie.')

      const remoteDir = `/srv/nerosy/backups/${safeName}`
      await sftp.mkdir(remoteDir, true)

      prog(0, 0, zipSizeBytes, zipName)
      await sftp.fastPut(zipPath, `${remoteDir}/${zipName}`, {
        step: (t, _c, tot) => prog(Math.round(t / tot * 100), t, tot, zipName)
      })
      log('Transfert terminé.')

      // ── Upload du fichier de métadonnées ──────────────────────────────────
      try {
        const meta = JSON.stringify({
          versionName: rawVersionName,
          changelog:   (versionMeta?.changelog || '').trim()
        })
        await sftp.put(Buffer.from(meta), `${remoteDir}/${zipName}.meta.json`)
        log('Métadonnées enregistrées.')
      } catch { log('(meta non sauvegardée — non bloquant)') }

      log(`"${rawVersionName}" envoyée avec succès !`)

      // ── Écriture du manifest .cin ─────────────────────────────────────────
      try {
        const absFiles = filesToArchive.map(f => f.absolute)
        await writeCinManifest(project, settings, rawVersionName, absFiles, zipName)
        log(`Manifest .cin écrit (${absFiles.length} fichier(s)).`)
      } catch (e) { log(`(manifest non écrit : ${e.message})`) }

      debugLog('=== PUSH OK ===')
      return { success: true, logs, zipName, zipSizeBytes, versionName: rawVersionName }

    } catch (err) {
      log(`ERREUR : ${err.message}`)
      debugLog(`STACK : ${err.stack}`)
      return { success: false, logs, error: err.message }
    } finally {
      try { await sftp.end() } catch { /* */ }
    }
  })

  // ── Helper : résolution des chemins de déploiement ──────────────────────────
  // Priorité : champ projet > store local > dérivation automatique depuis omsiPath + bus_path
  function resolveDeployPaths(project, settings) {
    const omsiPath  = settings?.omsiPath || store.get('settings')?.omsiPath || null
    const busPath   = project.bus_path   || ''
    const stored    = (store.get('projectPaths') || {})[project.id] || {}

    const vehicles = project.vehicles || stored.vehiclesPath
      || (omsiPath && busPath ? path.join(omsiPath, 'Vehicles', busPath) : null)
    const addons   = project.addons   || stored.addonsPath
      || (omsiPath && busPath ? path.join(omsiPath, 'Addons',   busPath) : null)
    const sounds   = project.sounds   || stored.soundsPath
      || (omsiPath && busPath ? path.join(omsiPath, 'Sounds',   busPath) : null)
    const fonts    = project.fonts?.length ? project.fonts : (stored.fonts || [])
    const fontsDir = (fonts.length > 0 ? path.dirname(fonts[0]) : null)
      || (omsiPath ? path.join(omsiPath, 'Fonts') : null)

    // Persiste les chemins auto-dérivés dans le store pour les prochains pulls
    if (omsiPath && busPath && (!stored.vehiclesPath)) {
      const allPaths = store.get('projectPaths') || {}
      store.set('projectPaths', {
        ...allPaths,
        [project.id]: { ...stored, vehiclesPath: vehicles, addonsPath: addons, soundsPath: sounds }
      })
    }

    return { vehicles, addons, sounds, fontsDir }
  }

  // ── PULL : installer une version spécifique ───────────────────────────────
  ipcMain.handle('pull:install', async (event, project, settings, zipName, versionMeta = {}) => {
    const logs = []
    const s = event.sender
    const log = (msg) => { logs.push({ time: new Date().toISOString(), msg }); debugLog(msg) }
    const step = (n, label, total = 0) => {
      log(`[${n}/3] ${label}`)
      s.send('sync:step', { stepNum: n, stepTotal: 3, stepLabel: label, itemTotal: total })
    }
    const prog = (pct, cur, tot, label) => s.send('sync:progress', { percent: pct, current: cur, total: tot, label })

    debugLog(`=== PULL:INSTALL ${zipName} ===`)
    const sftp = new SftpClient()

    try {
      // ── 1. Connexion ─────────────────────────────────────────────────────
      step(1, 'Connexion au VPS')
      await sftp.connect(sshConfig(settings))
      log('SSH établie.')

      const remoteDir  = `/srv/nerosy/backups/${project.name.replace(/\s+/g, '_')}`
      const remoteFile = `${remoteDir}/${zipName}`

      // Récupérer la taille pour la barre de progression
      const fileList = await sftp.list(remoteDir)
      const meta = fileList.find(f => f.name === zipName)
      const fileSize = meta?.size || 0
      log(`Fichier : ${zipName} (${(fileSize / 1024).toFixed(1)} Ko)`)

      // ── 2. Téléchargement ─────────────────────────────────────────────────
      step(2, `Téléchargement de ${zipName}`, fileSize)
      const tmpDir = path.join(app.getPath('temp'), 'cinnamon')
      await mkdir(tmpDir, { recursive: true })
      const localZipPath = path.join(tmpDir, zipName)

      prog(0, 0, fileSize, zipName)
      await sftp.fastGet(remoteFile, localZipPath, {
        step: (t, _c, tot) => prog(Math.round(t / tot * 100), t, tot, zipName)
      })
      log('Téléchargement terminé.')

      // ── 3. Extraction + déploiement ───────────────────────────────────────
      step(3, 'Extraction et déploiement')

      const zipData = await readFile(localZipPath)
      const zip = await JSZip.loadAsync(zipData)
      const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)

      // ── Résolution des chemins locaux ────────────────────────────────────────
      const { vehicles, addons, sounds, fontsDir } = resolveDeployPaths(project, settings)

      log(`Chemins : vehicles=${vehicles || '—'} addons=${addons || '—'} sounds=${sounds || '—'} fonts=${fontsDir || '—'}`)

      if (!vehicles && !addons && !sounds) {
        log('ERREUR : Impossible de résoudre les chemins locaux.')
        return { success: false, logs, error: 'Impossible de résoudre les chemins locaux. Vérifiez que le chemin OMSI est configuré dans les Paramètres.' }
      }

      const deployMap = { vehicles, addons, sounds, fonts: fontsDir }

      let deployed = 0, skipped = 0
      const deployedPaths = []
      for (const [filename, file] of entries) {
        deployed++
        prog(Math.round(deployed / entries.length * 100), deployed, entries.length, path.basename(filename))

        const slashIdx = filename.indexOf('/')
        if (slashIdx === -1) { skipped++; continue }

        const prefix    = filename.slice(0, slashIdx)
        const relative  = filename.slice(slashIdx + 1)
        const targetDir = deployMap[prefix]
        if (!targetDir || !relative) { skipped++; continue }

        const targetPath = path.join(targetDir, relative)
        await mkdir(path.dirname(targetPath), { recursive: true })
        await writeFile(targetPath, await file.async('nodebuffer'))
        deployedPaths.push(targetPath)
      }

      // ── Écriture du manifest .cin ─────────────────────────────────────────
      const versionName = versionMeta?.versionName || parseVersionName(zipName, project.name)
      try {
        await writeCinManifest(project, settings, versionName, deployedPaths, zipName)
        log(`Manifest .cin écrit (${deployedPaths.length} fichier(s)).`)
      } catch (e) { log(`(manifest non écrit : ${e.message})`) }

      log(`Déployé : ${deployed - skipped} fichier(s)`)
      log(`Installation de ${zipName} terminée !`)
      debugLog('=== PULL:INSTALL OK ===')
      return { success: true, logs, deployedCount: deployed - skipped, zipName, versionName }

    } catch (err) {
      log(`ERREUR : ${err.message}`)
      debugLog(`STACK : ${err.stack}`)
      return { success: false, logs, error: err.message }
    } finally {
      try { await sftp.end() } catch { /* */ }
    }
  })

  // ── PULL ──────────────────────────────────────────────────────────────────
  ipcMain.handle('pull:start', async (event, project, settings) => {
    const logs = []
    const s = event.sender
    const log = (msg) => { logs.push({ time: new Date().toISOString(), msg }); debugLog(msg) }
    const step = (n, label, total = 0) => {
      log(`[${n}/3] ${label}`)
      s.send('sync:step', { stepNum: n, stepTotal: 3, stepLabel: label, itemTotal: total })
    }
    const prog = (pct, cur, tot, label) => s.send('sync:progress', { percent: pct, current: cur, total: tot, label })

    debugLog('=== PULL START ===')
    const sftp = new SftpClient()

    try {
      // ── 1. Connexion + liste ─────────────────────────────────────────────
      step(1, 'Connexion au VPS')
      await sftp.connect(sshConfig(settings))
      log('SSH établie.')

      const remoteDir = `/srv/nerosy/backups/${project.name.replace(/\s+/g, '_')}`
      const fileList = await sftp.list(remoteDir)
      const zips = fileList
        .filter(f => f.name.endsWith('.zip'))
        .sort((a, b) => b.name.localeCompare(a.name))

      if (zips.length === 0) {
        log('Aucune archive trouvée sur le VPS.')
        return { success: false, logs, error: 'Aucune archive sur le VPS.' }
      }

      const latest = zips[0]
      log(`${zips.length} archive(s) trouvée(s). Dernière : ${latest.name}`)

      // Tenter de lire le nom de version depuis le meta
      let latestVersionName = parseVersionName(latest.name, project.name)
      const metaFileName = `${latest.name}.meta.json`
      if (fileList.find(f => f.name === metaFileName)) {
        try {
          const buf  = await sftp.get(`${remoteDir}/${metaFileName}`)
          const meta = JSON.parse(buf.toString())
          latestVersionName = meta.versionName || latestVersionName
        } catch { /* meta illisible */ }
      }

      // ── 2. Téléchargement ────────────────────────────────────────────────
      step(2, `Téléchargement de ${latest.name}`, latest.size)
      const tmpDir = path.join(app.getPath('temp'), 'cinnamon')
      await mkdir(tmpDir, { recursive: true })
      const localZipPath = path.join(tmpDir, latest.name)

      prog(0, 0, latest.size, latest.name)
      await sftp.fastGet(`${remoteDir}/${latest.name}`, localZipPath, {
        step: (t, _c, tot) => prog(Math.round(t / tot * 100), t, tot, latest.name)
      })
      log(`Archive téléchargée : ${localZipPath}`)

      // ── 3. Extraction + déploiement ──────────────────────────────────────
      step(3, 'Extraction et déploiement')
      const zipData = await readFile(localZipPath)
      const zip = await JSZip.loadAsync(zipData)
      const entries = Object.entries(zip.files).filter(([, f]) => !f.dir)

      // ── Résolution des chemins locaux ────────────────────────────────────────
      const { vehicles, addons, sounds, fontsDir } = resolveDeployPaths(project, settings)

      log(`Chemins : vehicles=${vehicles || '—'} addons=${addons || '—'} sounds=${sounds || '—'} fonts=${fontsDir || '—'}`)

      if (!vehicles && !addons && !sounds) {
        log('ERREUR : Impossible de résoudre les chemins locaux.')
        return { success: false, logs, error: 'Impossible de résoudre les chemins locaux. Vérifiez que le chemin OMSI est configuré dans les Paramètres.' }
      }

      const deployMap = { vehicles, addons, sounds, fonts: fontsDir }

      let deployed = 0, skipped = 0
      const deployedPaths = []
      for (const [filename, file] of entries) {
        deployed++
        prog(Math.round(deployed / entries.length * 100), deployed, entries.length, path.basename(filename))

        const slashIdx = filename.indexOf('/')
        if (slashIdx === -1) { skipped++; continue }

        const prefix   = filename.slice(0, slashIdx)
        const relative = filename.slice(slashIdx + 1)
        const targetDir = deployMap[prefix]

        if (!targetDir || !relative) { skipped++; continue }

        const targetPath = path.join(targetDir, relative)
        await mkdir(path.dirname(targetPath), { recursive: true })
        await writeFile(targetPath, await file.async('nodebuffer'))
        deployedPaths.push(targetPath)
      }

      // ── Écriture du manifest .cin ─────────────────────────────────────────
      try {
        await writeCinManifest(project, settings, latestVersionName, deployedPaths, latest.name)
        log(`Manifest .cin écrit (${deployedPaths.length} fichier(s)).`)
      } catch (e) { log(`(manifest non écrit : ${e.message})`) }

      log(`Déploiement terminé : ${deployed - skipped} fichier(s) restauré(s)`)
      log('PULL terminé avec succès !')
      debugLog('=== PULL OK ===')
      return { success: true, logs, deployedCount: deployed - skipped, zipName: latest.name, versionName: latestVersionName }

    } catch (err) {
      log(`ERREUR : ${err.message}`)
      debugLog(`STACK : ${err.stack}`)
      return { success: false, logs, error: err.message }
    } finally {
      try { await sftp.end() } catch { /* */ }
    }
  })

  // ── Lecture du statut d'installation local (.cin) ─────────────────────────
  ipcMain.handle('cinnamon:readStatus', async (_, project, settings) => {
    if (!settings.omsiPath) return null
    try {
      const data = await readFile(cinFilePath(project, settings), 'utf8')
      return JSON.parse(data)
    } catch {
      return null
    }
  })

  // ── Désinstallation d'un projet (suppression fichiers + .cin) ─────────────
  ipcMain.handle('cinnamon:uninstall', async (_, project, settings) => {
    if (!settings.omsiPath) return { success: false, error: 'Chemin OMSI non configuré.' }
    const cinFile = cinFilePath(project, settings)
    try {
      const data = await readFile(cinFile, 'utf8')
      const manifest = JSON.parse(data)
      let deleted = 0

      // Sécurité : Les polices sont partagées entre les bus, elles ne doivent
      // jamais être supprimées automatiquement.
      const fontsGuard = path.join(settings.omsiPath, 'Fonts').toLowerCase() + path.sep

      for (const relPath of (manifest.files || [])) {
        const absPath = path.join(settings.omsiPath, relPath)
        if (absPath.toLowerCase().startsWith(fontsGuard)) {
          debugLog(`[Uninstall] Polices exclues (partagées) : ${absPath}`)
          continue
        }
        try { await unlink(absPath); deleted++ } catch { /* déjà absent */ }
      }
      await unlink(cinFile)
      debugLog(`Désinstallation ${project.name} : ${deleted} fichier(s) supprimé(s)`)
      return { success: true, deletedCount: deleted }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Renommage du fichier .cin (projet renommé) ───────────────────────────
  ipcMain.handle('cinnamon:renameCin', async (_, oldName, newName, settings) => {
    if (!settings.omsiPath) return { success: true }
    const cinDir  = path.join(settings.omsiPath, '.cinnamon')
    const oldPath = path.join(cinDir, `${oldName.replace(/\s+/g, '_')}.cin`)
    const newPath = path.join(cinDir, `${newName.replace(/\s+/g, '_')}.cin`)
    try {
      if (!existsSync(oldPath)) return { success: true }
      const data = JSON.parse(await readFile(oldPath, 'utf8'))
      data.projectName = newName
      await writeFile(newPath, JSON.stringify(data, null, 2))
      await unlink(oldPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Suppression du seul fichier .cin (sans toucher aux fichiers installés) ─
  ipcMain.handle('cinnamon:deleteCin', async (_, project, settings) => {
    if (!settings.omsiPath) return { success: true }
    try { await unlink(cinFilePath(project, settings)) } catch { /* déjà absent */ }
    return { success: true }
  })

  // ── Parsing des fichiers .bus (friendlyname) ─────────────────────────────
  ipcMain.handle('projects:parseBusFiles', async (_, vehiclesPath) => {
    if (!vehiclesPath) return []
    try {
      const busFiles = await findBusFiles(vehiclesPath)
      const results  = []
      for (const fp of busFiles) {
        try {
          const buffer  = await readFile(fp)
          const content = iconv.decode(buffer, 'win1252')
          const lines   = content.split(/\r?\n/)
          for (let i = 0; i < lines.length - 2; i++) {
            // [friendlyname] doit commencer en colonne 0 (pas d'espace avant)
            if (lines[i].replace(/\s+$/, '') === '[friendlyname]') {
              results.push({
                filename:     path.basename(fp),
                filePath:     fp,
                manufacturer: lines[i + 1]?.trim() || '',
                model:        lines[i + 2]?.trim() || ''
              })
              break
            }
          }
        } catch { /* fichier illisible — on passe */ }
      }
      return results
    } catch {
      return []
    }
  })

  // Test connexion SFTP
  ipcMain.handle('sftp:test', async (_, settings) => {
    const sftp = new SftpClient()
    try {
      await sftp.connect(sshConfig(settings))
      await sftp.end()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Clé SSH Cinnamon ──────────────────────────────────────────────────────

  /**
   * Vérifie si la clé Cinnamon existe ET est au format OpenSSH (généré par ssh2).
   * Détection par en-tête de fichier — aucun parsing cryptographique risqué.
   * Si un ancien format PKCS8 (RSA) est détecté, il est supprimé proprement.
   */
  ipcMain.handle('ssh:checkKey', async () => {
    const keyPath = getCinnamonKeyPath()
    if (!existsSync(keyPath)) return false
    try {
      const keyContent = readFileSync(keyPath, 'utf8')
      if (keyContent.includes('-----BEGIN OPENSSH PRIVATE KEY-----')) return true
      // Ancien format PKCS8/RSA — suppression pour forcer la régénération
      await unlink(keyPath)
      try { await unlink(getCinnamonPubKeyPath()) } catch { /* .pub peut être absent */ }
      return false
    } catch {
      return false
    }
  })

  /** Lit et retourne la clé PUBLIQUE (cinnamon_vault.pub). La clé privée n'est jamais exposée. */
  ipcMain.handle('ssh:getPublicKey', async () => {
    try {
      return await readFile(getCinnamonPubKeyPath(), 'utf8')
    } catch {
      return null
    }
  })

  /**
   * Génère une paire de clés ED25519 dédiée à Cinnamon via ssh2.utils.generateKeyPair.
   * - Privée : userData/ssh/cinnamon_vault  (format OpenSSH, permissions 600 best-effort)
   * - Publique : userData/ssh/cinnamon_vault.pub (format ssh-ed25519 AAAAC3Nza...)
   * N'écrit JAMAIS dans le dossier .ssh de l'utilisateur.
   */
  ipcMain.handle('ssh:generateKey', async () => {
    try {
      const sshDir = path.join(app.getPath('userData'), 'ssh')
      await mkdir(sshDir, { recursive: true })

      // Commentaire : [username_OS]@cinnamon
      const comment = `${os.userInfo().username}@cinnamon`

      // ssh2.utils.generateKeyPair produit directement le format OpenSSH
      // (-----BEGIN OPENSSH PRIVATE KEY-----) que ssh2 peut parser nativement
      const keypair = await new Promise((resolve, reject) => {
        ssh2Utils.generateKeyPair('ed25519', { comment },
          (err, keys) => err ? reject(err) : resolve(keys)
        )
      })

      const privPath = getCinnamonKeyPath()
      const pubPath  = getCinnamonPubKeyPath()

      // keypair.private = "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n"
      // keypair.public  = "ssh-ed25519 AAAAC3Nza... cinnamon@nerosy"
      await writeFile(privPath, keypair.private, { encoding: 'utf8' })
      // Permissions restrictives — sur Windows, best-effort (NTFS protège par compte utilisateur)
      try { await chmod(privPath, 0o600) } catch { /* Windows — non bloquant */ }

      await writeFile(pubPath, keypair.public, { encoding: 'utf8' })

      return { success: true, publicKey: keypair.public }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Launchpad OMSI ───────────────────────────────────────────────────────────

  /** Vérifie si Omsi.exe ou Busbetrieb-Simulator.exe est actif (Windows). */
  function isOmsiRunning() {
    return new Promise((resolve) => {
      exec('tasklist /NH /FO CSV', (err, stdout) => {
        if (err) { resolve(false); return }
        const lower = stdout.toLowerCase()
        resolve(lower.includes('"omsi.exe"') || lower.includes('"busbetrieb-simulator.exe"'))
      })
    })
  }

  // Le process monitor OMSI est démarré dans launchApp() après création de win

  ipcMain.handle('omsi:getProcessStatus', async () => {
    const running = await isOmsiRunning()
    return { running }
  })

  ipcMain.handle('omsi:launch', async () => {
    await shell.openExternal('steam://rungameid/252530')
    return { success: true }
  })

  ipcMain.handle('omsi:launchEditor', async () => {
    await shell.openExternal('steam://run/252530//-editor/')
    return { success: true }
  })

  ipcMain.handle('omsi:launchBBS', (_, omsiPath) => {
    if (!omsiPath) return { success: false, error: 'Chemin OMSI non configuré.' }
    const launcher = path.join(omsiPath, 'Busbetrieb-Simulator', 'launcher.exe')
    if (!existsSync(launcher)) {
      return { success: false, error: `BBS introuvable : ${launcher}` }
    }
    exec(`"${launcher}"`, (err) => {
      if (err) debugLog(`[BBS] Erreur de lancement : ${err.message}`)
    })
    return { success: true }
  })

  // ── Scanner de polices Model.cfg ────────────────────────────────────────────
  // Parcourt tous les .cfg du dossier Model du projet, extrait les noms de
  // polices (.oft) référencés dans les sections [texttexture] (3ème ligne
  // après le tag) et vérifie leur présence dans {omsiPath}/Fonts/.
  ipcMain.handle('omsi:scanModelFonts', async (event, vehiclesPath, omsiPath) => {
    const push = (data) => {
      try { event.sender.send('omsi:scanFonts:progress', JSON.parse(JSON.stringify(data))) } catch { /* fenêtre fermée */ }
    }

    if (!vehiclesPath || !omsiPath) return { success: false, missing: [], all: [], total: 0 }
    try {
      const modelDir = path.join(vehiclesPath, 'Model')
      if (!existsSync(modelDir)) return { success: true, missing: [], all: [], total: 0 }

      // ── Phase 1 : collecte récursive de tous les .cfg dans Model/ ───────────
      push({ phase: 'collecting', current: 0, total: 0, currentFile: '' })
      const cfgFiles = []
      async function walkCfg(dir) {
        let entries
        try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
        for (const e of entries) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) await walkCfg(full)
          else if (e.name.toLowerCase().endsWith('.cfg')) cfgFiles.push(full)
        }
      }
      await walkCfg(modelDir)

      // ── Phase 2 : index des noms de polices depuis les .oft de Fonts/ ───────
      // Chaque .oft contient un tag [newfont] suivi du nom de la police sur la
      // ligne suivante. On construit un Set<string> des noms disponibles.
      const fontsDir     = path.join(omsiPath, 'Fonts')
      const knownFonts   = new Set()   // noms de polices déclarés dans les .oft
      try {
        const oftEntries = await readdir(fontsDir, { withFileTypes: true })
        for (const e of oftEntries) {
          if (!e.name.toLowerCase().endsWith('.oft')) continue
          try {
            const buf  = await readFile(path.join(fontsDir, e.name))
            const txt  = iconv.decode(buf, 'win1252')
            const lns  = txt.split(/\r?\n/)
            for (let j = 0; j < lns.length; j++) {
              if (lns[j].trim().toLowerCase() !== '[newfont]') continue
              const name = (lns[j + 1] ?? '').trim()
              if (name) knownFonts.add(name.toLowerCase())
              break
            }
          } catch { /* .oft illisible, on ignore */ }
        }
      } catch { /* dossier Fonts/ inaccessible */ }

      // ── Phase 3 : analyse des .cfg — extraction du nom à i+2 ────────────────
      const total   = cfgFiles.length
      const missing = []
      const all     = []
      const seen    = new Set()

      for (let idx = 0; idx < cfgFiles.length; idx++) {
        const cfgPath    = cfgFiles[idx]
        push({ phase: 'scanning', current: idx + 1, total, currentFile: path.basename(cfgPath) })

        let content
        try {
          const buffer = await readFile(cfgPath)
          content = iconv.decode(buffer, 'win1252')
        } catch { continue }

        const relCfg = path.relative(vehiclesPath, cfgPath).replace(/\\/g, '/')
        const lines  = content.split(/\r?\n/)

        for (let i = 0; i < lines.length; i++) {
          const tag = lines[i].trim().toLowerCase()
          if (tag !== '[texttexture]' && tag !== '[texttexture_enh]') continue

          // Structure : [texttexture(_enh)] / variable_name / FONT_NAME
          const fontName = (lines[i + 2] ?? '').trim()
          if (!fontName) continue

          const key = fontName.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)

          const present = knownFonts.has(key)
          all.push({ fontName, cfgFile: relCfg, present })
          if (!present) missing.push({ fontName, cfgFile: relCfg })
        }
      }

      const scanResult = {
        success: true,
        total:   Number(total),
        missing: missing.map(f => ({ fontName: String(f.fontName), cfgFile: String(f.cfgFile) })),
        all:     all.map(f => ({ fontName: String(f.fontName), cfgFile: String(f.cfgFile), present: Boolean(f.present) })),
      }
      return JSON.parse(JSON.stringify(scanResult))
    } catch (err) {
      return { success: false, error: String(err?.message || err), missing: [], all: [], total: 0 }
    }
  })

  // ── Scanner binaire .o3d (textures) ─────────────────────────────────────────
  // Lit chaque fichier .o3d en tant que Buffer (latin1), extrait via regex les
  // noms de textures (.tga/.bmp/.dds/.jpg/.png), puis vérifie leur présence
  // dans {vehiclesPath}/Texture/ et {omsiPath}/Texture/.
  ipcMain.handle('omsi:scanO3dTextures', async (event, vehiclesPath, omsiPath) => {
    const push = (data) => {
      try { event.sender.send('omsi:scanO3d:progress', data) } catch { /* fenêtre fermée */ }
    }

    if (!vehiclesPath || !omsiPath) return { success: false, results: [], totalMissing: 0 }

    try {
      push({ phase: 'collecting', current: 0, total: 0, currentFile: '' })

      // Collecte récursive de tous les .o3d
      const o3dFiles = []
      async function walkO3d(dir) {
        let entries
        try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
        for (const e of entries) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) await walkO3d(full)
          else if (e.name.toLowerCase().endsWith('.o3d')) o3dFiles.push(full)
        }
      }
      await walkO3d(vehiclesPath)

      const total = o3dFiles.length
      // Dossiers de textures à vérifier (ordre de priorité)
      const textureDirs = [
        path.join(vehiclesPath, 'Texture'),
        path.join(omsiPath,     'Texture'),
      ]

      const results      = []
      let   totalMissing = 0

      for (let idx = 0; idx < o3dFiles.length; idx++) {
        const o3dPath = o3dFiles[idx]
        const o3dName = path.basename(o3dPath)
        push({ phase: 'scanning', current: idx + 1, total, currentFile: o3dName })

        const textures = []
        try {
          const buffer = await readFile(o3dPath)
          // Décode en latin1 pour préserver tous les octets du binaire
          const str    = buffer.toString('latin1')
          // Extrait les noms de fichiers textures : commence par alnum/underscore,
          // peut contenir tirets/points, finit par une extension image reconnue.
          const regex  = /[a-zA-Z0-9_][a-zA-Z0-9_\-.]{0,62}\.(?:tga|bmp|dds|jpg|jpeg|png)/gi
          const seen   = new Set()

          for (const m of str.matchAll(regex)) {
            const name = m[0].trim()
            const key  = name.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            const found = textureDirs.some(d => existsSync(path.join(d, name)))
            if (!found) totalMissing++
            textures.push({ name, found })
          }
        } catch { /* fichier illisible — on passe */ }

        if (textures.length > 0) {
          results.push({
            o3dFile:    path.relative(vehiclesPath, o3dPath).replace(/\\/g, '/'),
            o3dName,
            textures,
            hasMissing: textures.some(t => !t.found),
          })
        }
      }

      return JSON.parse(JSON.stringify({ success: true, results, total, totalMissing }))
    } catch (err) {
      return { success: false, error: String(err?.message || err), results: [], totalMissing: 0 }
    }
  })

  // ── OMSI Log Parser ─────────────────────────────────────────────────────────
  let omsiWatcher     = null
  let omsiWatchTimer  = null

  /**
   * Lit et parse logfile.txt.
   * - Encodage Windows-1252 (iconv-lite déjà importé)
   * - Extrait la date/heure de lancement dans les 30 premières lignes
   * - Filtre Warning: / Error: avec dédoublonnage par contenu normalisé
   * - Conserve l'heure de la 1ʳᵉ apparition (numéro de ligne)
   */
  function _parseOmsiLog(logPath) {
    const buffer  = readFileSync(logPath)
    const content = iconv.decode(buffer, 'win1252')
    const lines   = content.split(/\r?\n/)

    // Date de lancement : cherche dd.mm.yyyy hh:mm:ss dans les 30 premières lignes
    let launchTime = null
    const DATE_RE = /(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})/
    for (let i = 0; i < Math.min(30, lines.length); i++) {
      const m = lines[i].match(DATE_RE)
      if (m) { launchTime = m[1]; break }
    }

    const seen    = new Set()
    const entries = []
    lines.forEach((raw, idx) => {
      const line = raw.trim()
      if (!line) return
      let type = null
      if (line.includes('Warning:')) type = 'warning'
      else if (line.includes('Error:')) type = 'error'
      if (!type) return
      // Normalise pour le dédoublonnage : retire les préfixes numériques/timestamps
      const key = line.replace(/^[\d\s.:[\]]+/, '').trim() || line
      if (seen.has(key)) return
      seen.add(key)
      entries.push({ lineNum: idx + 1, type, text: line })
    })

    return { launchTime, entries, totalLines: lines.length }
  }

  ipcMain.handle('omsi:parseLog', (_, omsiPath) => {
    try {
      if (!omsiPath) return { success: false, error: 'Chemin OMSI non configuré.' }
      const logPath = path.join(omsiPath, 'logfile.txt')
      if (!existsSync(logPath)) return { success: false, error: `Fichier introuvable : ${logPath}` }
      return { success: true, ..._parseOmsiLog(logPath) }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('omsi:watchLog:start', (event, omsiPath) => {
    try {
      if (!omsiPath) return { success: false, error: 'Chemin OMSI non configuré.' }
      const logPath = path.join(omsiPath, 'logfile.txt')
      if (!existsSync(logPath)) return { success: false, error: `Fichier introuvable : ${logPath}` }

      // Arrête l'éventuel watcher précédent
      if (omsiWatcher) { try { omsiWatcher.close() } catch {} omsiWatcher = null }

      const push = () => {
        try {
          event.sender.send('omsi:log:update', { success: true, ..._parseOmsiLog(logPath) })
        } catch (e) {
          event.sender.send('omsi:log:update', { success: false, error: e.message })
        }
      }

      // Envoi immédiat + debounce 600 ms sur les changements suivants
      push()
      omsiWatcher = fsWatch(logPath, () => {
        clearTimeout(omsiWatchTimer)
        omsiWatchTimer = setTimeout(push, 600)
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('omsi:watchLog:stop', () => {
    clearTimeout(omsiWatchTimer)
    if (omsiWatcher) { try { omsiWatcher.close() } catch {} omsiWatcher = null }
    return { success: true }
  })

  // ── Diagnostic complet : orphelins + textures manquantes ────────────────────
  // Scanne Model/ (binaires .o3d + .cfg), Texture/ racine, .ctc, .bus, .org.
  // Retourne missingTextures, orphanMeshes, orphanTextures avec tailles.
  ipcMain.handle('omsi:fullDiagnostic', async (event, vehiclesPath, omsiPath, projectFontPaths, soundsPath) => {
    const push = (data) => {
      try { event.sender.send('omsi:diagnostic:progress', JSON.parse(JSON.stringify(data))) } catch { /* fenêtre fermée */ }
    }

    if (!vehiclesPath) return { success: false, error: 'Chemin Vehicles non configuré.' }

    try {
      const modelDir   = path.join(vehiclesPath, 'Model')
      const textureDir = path.join(vehiclesPath, 'Texture')
      const IMG_EXTS   = new Set(['.bmp', '.dds', '.tga', '.png', '.jpg', '.jpeg'])
      const MESH_EXTS  = new Set(['.o3d', '.x'])
      const IMG_REGEX  = /[a-zA-Z0-9_][a-zA-Z0-9_\-.]{0,62}\.(?:tga|bmp|dds|jpg|jpeg|png)/gi

      // ── Collecte ────────────────────────────────────────────────────────
      push({ phase: 'collecting', current: 0, total: 0, currentFile: '' })

      async function walk(dir, filterFn) {
        const out = []
        let entries
        try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
        for (const e of entries) {
          const full = path.join(dir, e.name)
          if (e.isDirectory()) out.push(...(await walk(full, filterFn)))
          else if (e.isFile() && filterFn(e.name)) out.push(full)
        }
        return out
      }

      const meshFiles   = existsSync(modelDir)   ? await walk(modelDir,    n => MESH_EXTS.has(path.extname(n).toLowerCase())) : []
      const cfgFiles    = existsSync(modelDir)   ? await walk(modelDir,    n => n.toLowerCase().endsWith('.cfg'))              : []
      const ctcFiles    = await walk(vehiclesPath, n => n.toLowerCase().endsWith('.ctc'))
      const busFiles    = await findBusFiles(vehiclesPath)
      const orgFiles    = await walk(vehiclesPath, n => n.toLowerCase().endsWith('.org'))
      const allBusOrg   = [...new Set([...busFiles, ...orgFiles])]

      // Textures à la RACINE SEULEMENT de Texture/ (pas de sous-dossiers)
      const rootTextureMap = {} // key = name.lower → { name, absPath, size }
      if (existsSync(textureDir)) {
        let texEntries
        try { texEntries = await readdir(textureDir, { withFileTypes: true }) } catch { texEntries = [] }
        for (const e of texEntries) {
          if (!e.isFile()) continue
          if (!IMG_EXTS.has(path.extname(e.name).toLowerCase())) continue
          const absPath = path.join(textureDir, e.name)
          let size = 0
          try { size = (await stat(absPath)).size } catch {}
          rootTextureMap[e.name.toLowerCase()] = { name: e.name, absPath, size }
        }
      }

      // ── Phase scan_meshes : binaire .o3d ──────────────────────────────
      push({ phase: 'scanning_meshes', current: 0, total: meshFiles.length, currentFile: '' })

      const o3dTextureRefs  = new Set() // textures extraites des binaires .o3d
      const meshScanResults = []        // pour textures manquantes

      for (let i = 0; i < meshFiles.length; i++) {
        const meshPath = meshFiles[i]
        const meshName = path.basename(meshPath)
        push({ phase: 'scanning_meshes', current: i + 1, total: meshFiles.length, currentFile: meshName })

        if (!meshPath.toLowerCase().endsWith('.o3d')) continue

        try {
          const buffer   = await readFile(meshPath)
          const str      = buffer.toString('latin1')
          const seen     = new Set()
          const textures = []

          for (const m of str.matchAll(IMG_REGEX)) {
            const name = m[0].trim()
            const key  = name.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            o3dTextureRefs.add(key)
            textures.push({ name, found: Object.prototype.hasOwnProperty.call(rootTextureMap, key) })
          }
          if (textures.length > 0) {
            meshScanResults.push({
              o3dName:    meshName,
              o3dFile:    path.relative(vehiclesPath, meshPath).replace(/\\/g, '/'),
              textures,
              hasMissing: textures.some(t => !t.found),
            })
          }
        } catch { /* fichier illisible */ }
      }

      // ── Phase scanning_cfg : model*.cfg ───────────────────────────────
      push({ phase: 'scanning_cfg', current: 0, total: cfgFiles.length, currentFile: '' })

      const meshCitedInCfg = new Set() // basename.lower des meshes cités dans [mesh]
      const cfgTextureRefs = new Set() // textures (lowercase) citées dans les cfg

      for (let i = 0; i < cfgFiles.length; i++) {
        const cfgPath = cfgFiles[i]
        push({ phase: 'scanning_cfg', current: i + 1, total: cfgFiles.length, currentFile: path.basename(cfgPath) })

        let content
        try {
          const buffer = await readFile(cfgPath)
          content = iconv.decode(buffer, 'win1252')
        } catch { continue }

        const lines = content.split(/\r?\n/)
        for (let j = 0; j < lines.length; j++) {
          const tag = lines[j].trim().toLowerCase()

          // [mesh] → première ligne non-vide suivante = chemin du mesh
          if (tag === '[mesh]') {
            for (let k = j + 1; k < lines.length; k++) {
              const v = lines[k].trim()
              if (!v || v.startsWith(';')) continue
              meshCitedInCfg.add(path.basename(v).toLowerCase())
              break
            }
          }

          // Textures : lignes se terminant par une extension image
          const trimmed = lines[j].trim()
          if (IMG_EXTS.has(path.extname(trimmed).toLowerCase())) {
            cfgTextureRefs.add(path.basename(trimmed).toLowerCase())
          }
        }
      }

      // ── Phase scanning_ctc : fichiers CTC ─────────────────────────────
      push({ phase: 'scanning_ctc', current: 0, total: ctcFiles.length, currentFile: '' })

      const ctcTextureRefs = new Set()

      for (let i = 0; i < ctcFiles.length; i++) {
        push({ phase: 'scanning_ctc', current: i + 1, total: ctcFiles.length, currentFile: path.basename(ctcFiles[i]) })
        try {
          const buf     = await readFile(ctcFiles[i])
          const content = iconv.decode(buf, 'win1252')
          for (const line of content.split(/\r?\n/)) {
            const l = line.trim()
            if (IMG_EXTS.has(path.extname(l).toLowerCase()))
              ctcTextureRefs.add(path.basename(l).toLowerCase())
          }
        } catch { /* ignoré */ }
      }

      // ── Phase scanning_bus : .bus et .org ─────────────────────────────
      push({ phase: 'scanning_bus', current: 0, total: allBusOrg.length, currentFile: '' })

      const busTextureRefs = new Set()

      for (let i = 0; i < allBusOrg.length; i++) {
        push({ phase: 'scanning_bus', current: i + 1, total: allBusOrg.length, currentFile: path.basename(allBusOrg[i]) })
        try {
          const buf     = await readFile(allBusOrg[i])
          const content = iconv.decode(buf, 'win1252')
          for (const line of content.split(/\r?\n/)) {
            const l = line.trim()
            if (IMG_EXTS.has(path.extname(l).toLowerCase()))
              busTextureRefs.add(path.basename(l).toLowerCase())
          }
        } catch { /* ignoré */ }
      }

      // ── Calcul des orphelins ───────────────────────────────────────────
      const orphanMeshes = []
      for (const meshPath of meshFiles) {
        const meshName = path.basename(meshPath)
        if (!meshCitedInCfg.has(meshName.toLowerCase())) {
          let size = 0
          try { size = (await stat(meshPath)).size } catch {}
          orphanMeshes.push({
            name:         meshName,
            relativePath: path.relative(vehiclesPath, meshPath).replace(/\\/g, '/'),
            absPath:      meshPath,
            size,
          })
        }
      }

      const usedTextureKeys = new Set([
        ...cfgTextureRefs,
        ...o3dTextureRefs,
        ...ctcTextureRefs,
        ...busTextureRefs,
      ])

      const orphanTextures = []
      for (const [key, info] of Object.entries(rootTextureMap)) {
        if (!usedTextureKeys.has(key)) orphanTextures.push(info)
      }

      // Textures manquantes (référencées dans .o3d mais absentes de Texture/ racine)
      const missingMap = {}
      for (const item of meshScanResults) {
        for (const tex of item.textures) {
          if (tex.found) continue
          if (!missingMap[tex.name]) missingMap[tex.name] = new Set()
          missingMap[tex.name].add(item.o3dName)
        }
      }
      const missingTextures = Object.entries(missingMap)
        .map(([textureName, set]) => ({ textureName, usedBy: [...set].sort() }))
        .sort((a, b) => a.textureName.localeCompare(b.textureName))

      // ── Phase scanning_fonts : model.cfg → [texttexture*] → nom police ──
      push({ phase: 'scanning_fonts', current: 0, total: cfgFiles.length, currentFile: '' })

      // Helper : lit un .oft et retourne { fontName, textures: string[] }
      // On strip explicitement \r et les espaces de fin/début pour éviter les faux positifs
      // liés aux fins de ligne Windows dans les fichiers encodés en Windows-1252.
      function cleanLine(s) { return (s ?? '').replace(/\r/g, '').trim() }
      async function readOft(oftPath) {
        try {
          const buf  = await readFile(oftPath)
          const txt  = iconv.decode(buf, 'win1252')
          const lns  = txt.split('\n')
          let fontName = null
          const textures = []
          for (let j = 0; j < lns.length; j++) {
            if (cleanLine(lns[j]).toLowerCase() !== '[newfont]') continue
            fontName = cleanLine(lns[j + 1]) || null
            // Textures listées dans le .oft (lignes .bmp / .tga après le nom)
            for (let k = j + 2; k < lns.length; k++) {
              const l = cleanLine(lns[k]).toLowerCase()
              if (l.startsWith('[')) break        // prochain tag → on sort
              if (l.endsWith('.bmp') || l.endsWith('.tga')) textures.push(cleanLine(lns[k]))
            }
            break
          }
          return fontName ? { fontName, textures } : null
        } catch { return null }
      }

      // Niveau 1 : polices déclarées dans les .oft du projet
      const projectFontNames = new Set()
      for (const oftPath of (projectFontPaths || [])) {
        const info = await readOft(oftPath)
        if (info) projectFontNames.add(info.fontName.toLowerCase())
      }

      // Niveau 2 : polices disponibles dans {omsiPath}/Fonts/ + map fontName → { oftPath, textures }
      const omsifontsDir    = omsiPath ? path.join(omsiPath, 'Fonts') : null
      const omsiFont2oft    = new Map()  // fontName.lower → { oftPath, textures }
      if (omsifontsDir && existsSync(omsifontsDir)) {
        let oftEntries = []
        try { oftEntries = await readdir(omsifontsDir, { withFileTypes: true }) } catch {}
        for (const e of oftEntries) {
          if (!e.name.toLowerCase().endsWith('.oft')) continue
          const info = await readOft(path.join(omsifontsDir, e.name))
          if (info) omsiFont2oft.set(info.fontName.toLowerCase(), {
            oftPath:  path.join(omsifontsDir, e.name),
            textures: info.textures,
          })
        }
      }

      // Extraction des noms de polices utilisés dans les .cfg
      const fontSeenSet       = new Set()
      const missingInProject  = []  // Cas A : présente dans OMSI mais pas dans le projet
      const missingEverywhere = []  // Cas B : introuvable dans OMSI ni dans le projet

      for (let i = 0; i < cfgFiles.length; i++) {
        push({ phase: 'scanning_fonts', current: i + 1, total: cfgFiles.length, currentFile: path.basename(cfgFiles[i]) })
        let content
        try {
          const buf = await readFile(cfgFiles[i])
          content = iconv.decode(buf, 'win1252')
        } catch { continue }
        const lines  = content.split('\n')
        const relCfg = path.relative(vehiclesPath, cfgFiles[i]).replace(/\\/g, '/')
        for (let j = 0; j < lines.length; j++) {
          const tag = cleanLine(lines[j]).toLowerCase()
          if (tag !== '[texttexture]' && tag !== '[texttexture_enh]') continue
          const fontName = cleanLine(lines[j + 2])
          if (!fontName) continue
          const key = fontName.toLowerCase()
          if (fontSeenSet.has(key)) continue
          fontSeenSet.add(key)

          // Debug spécifique pour diagnostiquer les faux négatifs de type 's400nf'
          if (key.includes('s400nf') || key.includes('lcd')) {
            debugLog(`[fontMatch] cfg="${fontName}" key="${key}" inProject=${projectFontNames.has(key)} inOmsi=${omsiFont2oft.has(key)}`)
          }

          if (projectFontNames.has(key)) continue   // Niveau 1 OK
          const omsiInfo = omsiFont2oft.get(key)
          if (omsiInfo) {
            missingInProject.push({ fontName, cfgFile: relCfg, oftPath: omsiInfo.oftPath, textures: omsiInfo.textures })
          } else {
            missingEverywhere.push({ fontName, cfgFile: relCfg })
          }
        }
      }

      // ── Phase scanning_sounds : .bus → sound cfg → .wav ──────────────────
      push({ phase: 'scanning_sounds', current: 0, total: busFiles.length, currentFile: '' })

      const AUDIO_EXTS = new Set(['.wav', '.ogg', '.mp3'])

      // Collecte tous les fichiers audio physiquement présents sous vehiclesPath
      // (et soundsPath si distinct et configuré)
      const physicalAudioMap = new Map() // absPath.lower → { name, absPath, size }
      async function collectAudio(dir) {
        const files = await walk(dir, n => AUDIO_EXTS.has(path.extname(n).toLowerCase()))
        for (const fp of files) {
          let sz = 0
          try { sz = (await stat(fp)).size } catch {}
          physicalAudioMap.set(fp.toLowerCase(), { name: path.basename(fp), absPath: fp, size: sz })
        }
      }
      if (existsSync(vehiclesPath)) await collectAudio(vehiclesPath)
      if (soundsPath && soundsPath !== vehiclesPath && existsSync(soundsPath)) await collectAudio(soundsPath)

      // Parsage des .bus pour trouver les sound cfgs ([sound] / [sound_ai])
      const soundCfgPaths = new Set()
      for (let i = 0; i < busFiles.length; i++) {
        push({ phase: 'scanning_sounds', current: i + 1, total: busFiles.length, currentFile: path.basename(busFiles[i]) })
        try {
          const buf     = await readFile(busFiles[i])
          const content = iconv.decode(buf, 'win1252')
          const lines   = content.split('\n')
          const busDir  = path.dirname(busFiles[i])
          for (let j = 0; j < lines.length - 1; j++) {
            const tag = cleanLine(lines[j]).toLowerCase()
            if (tag !== '[sound]' && tag !== '[sound_ai]') continue
            const rel = cleanLine(lines[j + 1])
            if (!rel || rel.startsWith('[')) continue
            if (!rel.toLowerCase().endsWith('.cfg')) continue
            soundCfgPaths.add(path.resolve(busDir, rel.replace(/\\/g, path.sep)))
          }
        } catch { /* bus illisible */ }
      }

      // Parsage des sound cfgs pour extraire les références audio
      const referencedAudio = new Map() // absPath.lower → { name, absPath, cfgFile }
      const soundCfgArr = [...soundCfgPaths]
      push({ phase: 'scanning_sounds', current: 0, total: soundCfgArr.length, currentFile: '' })
      for (let i = 0; i < soundCfgArr.length; i++) {
        const cfgPath = soundCfgArr[i]
        push({ phase: 'scanning_sounds', current: i + 1, total: soundCfgArr.length, currentFile: path.basename(cfgPath) })
        try {
          const buf     = await readFile(cfgPath)
          const content = iconv.decode(buf, 'win1252')
          const cfgDir  = path.dirname(cfgPath)
          const relCfg  = path.relative(vehiclesPath, cfgPath).replace(/\\/g, '/')
          const lines   = content.split('\n')
          for (let j = 0; j < lines.length - 1; j++) {
            const tag = cleanLine(lines[j]).toLowerCase()
            if (tag !== '[sound]' && tag !== '[loopsound]') continue
            const wavRel = cleanLine(lines[j + 1])
            if (!wavRel || wavRel.startsWith('[')) continue
            if (!AUDIO_EXTS.has(path.extname(wavRel).toLowerCase())) continue
            const wavAbs = path.resolve(cfgDir, wavRel.replace(/\\/g, path.sep))
            const key    = wavAbs.toLowerCase()
            if (!referencedAudio.has(key))
              referencedAudio.set(key, { name: path.basename(wavRel), absPath: wavAbs, cfgFile: relCfg })
          }
        } catch { /* cfg illisible */ }
      }

      // Manquants : référencés mais absents du disque
      const missingSounds = []
      for (const [key, info] of referencedAudio) {
        if (!physicalAudioMap.has(key))
          missingSounds.push({ file: String(info.name), absPath: String(info.absPath), cfgFile: String(info.cfgFile) })
      }
      missingSounds.sort((a, b) => a.file.localeCompare(b.file))

      // Orphelins : présents sur le disque mais jamais référencés
      const orphanSounds = []
      for (const [key, info] of physicalAudioMap) {
        if (!referencedAudio.has(key))
          orphanSounds.push({ name: String(info.name), absPath: String(info.absPath), size: Number(info.size) })
      }
      orphanSounds.sort((a, b) => b.size - a.size)

      // Sérialisation explicite : on reconstruit chaque objet avec des primitives pures
      // pour éviter toute référence non-clonable (Map, Set, Dirent, Stats, closures…)
      const safeResult = {
        success:            true,
        totalMeshesScanned: Number(meshFiles.length),
        totalCfgScanned:    Number(cfgFiles.length),
        missingTextures: missingTextures.map(t => ({
          textureName: String(t.textureName),
          usedBy:      (t.usedBy || []).map(String),
        })),
        orphanMeshes: orphanMeshes.map(f => ({
          name:         String(f.name),
          relativePath: String(f.relativePath),
          absPath:      String(f.absPath),
          size:         Number(f.size),
        })),
        orphanTextures: orphanTextures.map(f => ({
          name:    String(f.name),
          absPath: String(f.absPath),
          size:    Number(f.size),
        })),
        fontResults: {
          missingInProject: missingInProject.map(f => ({
            fontName: String(f.fontName),
            cfgFile:  String(f.cfgFile),
            oftPath:  String(f.oftPath),
            textures: (f.textures || []).map(String),
          })),
          missingEverywhere: missingEverywhere.map(f => ({
            fontName: String(f.fontName),
            cfgFile:  String(f.cfgFile),
          })),
        },
        soundResults: {
          missingSounds:  missingSounds,
          orphanSounds:   orphanSounds,
          totalScanned:   Number(referencedAudio.size),
          cfgsFound:      Number(soundCfgPaths.size),
        },
      }
      return JSON.parse(JSON.stringify(safeResult))
    } catch (err) {
      return { success: false, error: String(err?.message || err) }
    }
  })

  // ── Suppression fichier unique ─────────────────────────────────────────────
  ipcMain.handle('file:delete', async (_, filePath) => {
    try {
      await unlink(filePath)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Suppression de plusieurs fichiers ──────────────────────────────────────
  ipcMain.handle('file:deleteMany', async (_, filePaths) => {
    const results = await Promise.allSettled(filePaths.map(fp => unlink(fp)))
    const deleted = []
    const errors  = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') deleted.push(filePaths[i])
      else errors.push({ path: filePaths[i], error: r.reason?.message })
    })
    return { success: errors.length === 0, deleted, errors }
  })

  // ── Constfile Parser ────────────────────────────────────────────────────────
  ipcMain.handle('constfile:parse', async (_, filePath) => {
    try {
      const buffer  = await readFile(filePath)
      const content = iconv.decode(buffer, 'win1252')
      const lines   = content.split(/\r?\n/).map(l => l.trim())
      const entries = []
      let id = 0

      for (let i = 0; i < lines.length; i++) {
        const lc = lines[i].toLowerCase()
        if (lc === '[const]') {
          const name  = lines[i + 1] ?? ''
          const value = lines[i + 2] ?? ''
          if (name) entries.push({ id: String(id++), type: 'const', name, value })
          i += 2
        } else if (lc === '[newcurve]') {
          const name   = lines[i + 1] ?? ''
          const points = []
          let j = i + 2
          while (j < lines.length) {
            const jlc = lines[j].toLowerCase()
            if (jlc === '[const]' || jlc === '[newcurve]') break
            if (jlc === '[pnt]') {
              const x = parseFloat((lines[j + 1] ?? '').replace(',', '.'))
              const y = parseFloat((lines[j + 2] ?? '').replace(',', '.'))
              if (!isNaN(x) && !isNaN(y)) points.push({ x, y })
              j += 3
            } else { j++ }
          }
          if (name) entries.push({ id: String(id++), type: 'curve', name, points })
          i = j - 1
        }
      }

      if (entries.length === 0) {
        return { success: false, error: 'Fichier non-conforme ou corrompu' }
      }
      return { success: true, entries }
    } catch (err) {
      return { success: false, error: String(err.message) }
    }
  })

  ipcMain.handle('constfile:save', async (_, filePath, rawEntries) => {
    try {
      // Sérialisation stricte : on ne transfère que des primitives
      const lines = []
      for (const entry of rawEntries) {
        if (entry.type === 'const') {
          lines.push('[const]', String(entry.name ?? ''), String(entry.value ?? ''), '')
        } else if (entry.type === 'curve') {
          lines.push('[newcurve]', String(entry.name ?? ''))
          for (const pt of (entry.points ?? [])) {
            lines.push('[pnt]', String(pt.x), String(pt.y))
          }
          lines.push('')
        }
      }
      const content = lines.join('\r\n')
      await writeFile(filePath, iconv.encode(content, 'win1252'))
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err.message) }
    }
  })

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ── Helpers ───────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }

// ── Clé SSH dédiée Cinnamon ───────────────────────────────────────────────
// Stockée dans userData/ssh/ — n'affecte JAMAIS le dossier .ssh de l'utilisateur
function getCinnamonKeyPath()    { return path.join(app.getPath('userData'), 'ssh', 'cinnamon_vault') }
function getCinnamonPubKeyPath() { return path.join(app.getPath('userData'), 'ssh', 'cinnamon_vault.pub') }


/**
 * Connexion SSH — paramètres constants NEROSY.
 * La clé privée est toujours celle générée par Cinnamon (userData/ssh/cinnamon_vault).
 * Ne lit JAMAIS settings.sshKeyPath ni settings.vpsIp.
 */
function sshConfig(_settings) {
  return {
    host:              '158.220.90.1',
    port:              22,
    username:          'root',
    privateKey:        readFileSync(getCinnamonKeyPath()),
    algorithms: {
      serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
    },
    readyTimeout:      30000,
    keepaliveInterval: 10000,
    retries:           1
  }
}

// Extrait le nom de version lisible depuis un nom de fichier ZIP
// Ancien format : v{N}_{date}_{time}_{projet}.zip  → "v1", "v2"...
// Nouveau format : {date}_{time}_{slug}_{projet}.zip → slug humanisé
function parseVersionName(filename, projectName) {
  const noExt = filename.replace(/\.zip$/, '')

  // Ancien format
  if (/^v\d+_/.test(noExt)) {
    return noExt.split('_')[0]   // "v1", "v2", etc.
  }

  // Nouveau format : retirer le slug projet en suffixe
  const projectSlug    = projectName.replace(/\s+/g, '_')
  const suffix         = `_${projectSlug}`
  const withoutProject = noExt.endsWith(suffix) ? noExt.slice(0, -suffix.length) : noExt
  // withoutProject = {date}_{time}_{versionSlug}
  const m = withoutProject.match(/^\d{4}-\d{2}-\d{2}_\d{2}h\d{2}_(.+)$/)
  if (m) return m[1].replace(/-/g, ' ')

  return noExt
}

// ── .cinnamon manifest helpers ────────────────────────────────────────────
function cinFilePath(project, settings) {
  return path.join(settings.omsiPath, '.cinnamon', `${project.name.replace(/\s+/g, '_')}.cin`)
}

async function writeCinManifest(project, settings, versionName, deployedAbsPaths, zipName) {
  if (!settings.omsiPath) return
  const cinDir = path.join(settings.omsiPath, '.cinnamon')
  await mkdir(cinDir, { recursive: true })
  const files = deployedAbsPaths.map(p =>
    path.relative(settings.omsiPath, p).replace(/\\/g, '/')
  )
  const manifest = {
    projectName: project.name,
    versionName: versionName || 'Inconnue',
    zipName:     zipName || '',
    installDate: new Date().toISOString(),
    files
  }
  await writeFile(cinFilePath(project, settings), JSON.stringify(manifest, null, 2))
}

// Trouve récursivement tous les fichiers .bus dans un dossier (profondeur max 4)
async function findBusFiles(dirPath, depth = 4) {
  if (depth <= 0) return []
  const results = []
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        results.push(...await findBusFiles(full, depth - 1))
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.bus')) {
        results.push(full)
      }
    }
  } catch { /* dossier inaccessible */ }
  return results
}

async function scanDir(dirPath, ignoredExts) {
  const results = []
  const entries = await readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      results.push(...await scanDir(full, ignoredExts))
    } else if (entry.isFile()) {
      if (!ignoredExts.includes(path.extname(entry.name).toLowerCase())) {
        results.push(full)
      }
    }
  }
  return results
}
