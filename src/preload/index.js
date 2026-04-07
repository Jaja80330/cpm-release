import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close:    () => ipcRenderer.send('window:close')
  },
  store: {
    get:    (key)        => ipcRenderer.invoke('store:get', key),
    set:    (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key)        => ipcRenderer.invoke('store:delete', key)
  },
  projects: {
    getAll:         ()            => ipcRenderer.invoke('projects:getAll'),
    save:           (p)           => ipcRenderer.invoke('projects:save', p),
    zipFolder:      (fp)          => ipcRenderer.invoke('projects:zipFolder', fp),
    package:        (data)        => ipcRenderer.invoke('projects:package', data),
    parseBusFiles:  (vehiclesPath) => ipcRenderer.invoke('projects:parseBusFiles', vehiclesPath),
    onPackStep:     (cb)          => ipcRenderer.on('project:pack:step',     (_, d) => cb(d)),
    offPackStep:    ()            => ipcRenderer.removeAllListeners('project:pack:step'),
    onPackProgress: (cb)          => ipcRenderer.on('project:pack:progress', (_, d) => cb(d)),
    offPackProgress: ()           => ipcRenderer.removeAllListeners('project:pack:progress'),
  },
  settings: {
    get:  ()         => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings)
  },
  dialog: {
    selectFolder: (options)  => ipcRenderer.invoke('dialog:selectFolder', options),
    selectFile:   (options)  => ipcRenderer.invoke('dialog:selectFile',   options),
    selectFiles:  (options)  => ipcRenderer.invoke('dialog:selectFiles',  options),
    saveFile:     (options)  => ipcRenderer.invoke('dialog:saveFile',     options),
  },
  bus: {
    readFile:   (filePath)              => ipcRenderer.invoke('bus:readFile',   filePath),
    writeFile:  (filePath, content)     => ipcRenderer.invoke('bus:writeFile',  filePath, content),
    fileExists: (busDir, relativePath)  => ipcRenderer.invoke('bus:fileExists', busDir, relativePath),
  },
  omsi: {
    launch:            ()         => ipcRenderer.invoke('omsi:launch'),
    launchEditor:      ()         => ipcRenderer.invoke('omsi:launchEditor'),
    launchBBS:         (omsiPath) => ipcRenderer.invoke('omsi:launchBBS', omsiPath),
    validatePath:      (p)        => ipcRenderer.invoke('omsi:validatePath', p),
    parseLog:          (omsiPath) => ipcRenderer.invoke('omsi:parseLog',       omsiPath),
    watchStart:        (omsiPath) => ipcRenderer.invoke('omsi:watchLog:start', omsiPath),
    watchStop:         ()         => ipcRenderer.invoke('omsi:watchLog:stop'),
    onLogUpdate:       (cb)       => ipcRenderer.on('omsi:log:update',      (_, d) => cb(d)),
    offLogUpdate:      ()         => ipcRenderer.removeAllListeners('omsi:log:update'),
    getProcessStatus:  ()         => ipcRenderer.invoke('omsi:getProcessStatus'),
    onProcessStatus:   (cb)       => ipcRenderer.on('omsi:processStatus',   (_, d) => cb(d)),
    offProcessStatus:  ()         => ipcRenderer.removeAllListeners('omsi:processStatus'),
    scanModelFonts:       (vehiclesPath, omsiPath) => ipcRenderer.invoke('omsi:scanModelFonts',   vehiclesPath, omsiPath),
    onScanFontsProgress:  (cb) => ipcRenderer.on('omsi:scanFonts:progress',  (_, d) => cb(d)),
    offScanFontsProgress: ()   => ipcRenderer.removeAllListeners('omsi:scanFonts:progress'),
    scanO3dTextures:      (vehiclesPath, omsiPath) => ipcRenderer.invoke('omsi:scanO3dTextures',  vehiclesPath, omsiPath),
    onO3dProgress:        (cb) => ipcRenderer.on('omsi:scanO3d:progress',    (_, d) => cb(d)),
    offO3dProgress:       ()   => ipcRenderer.removeAllListeners('omsi:scanO3d:progress'),
    fullDiagnostic:       (vehiclesPath) => ipcRenderer.invoke('omsi:fullDiagnostic', vehiclesPath),
    onDiagProgress:       (cb) => ipcRenderer.on('omsi:diagnostic:progress', (_, d) => cb(d)),
    offDiagProgress:      ()   => ipcRenderer.removeAllListeners('omsi:diagnostic:progress'),
  },
  file: {
    readAsDataUrl: (filePath)   => ipcRenderer.invoke('file:readAsDataUrl', filePath),
    readBuffer:    (filePath)   => ipcRenderer.invoke('file:readBuffer',    filePath),
    delete:        (filePath)   => ipcRenderer.invoke('file:delete',        filePath),
    deleteMany:    (filePaths)  => ipcRenderer.invoke('file:deleteMany',    filePaths),
  },
  oft: {
    parse: (oftPath) => ipcRenderer.invoke('oft:parse', oftPath)
  },
  sync: {
    start:       (project, settings, versionMeta) => ipcRenderer.invoke('sync:start', project, settings, versionMeta),
    onStep:      (cb) => ipcRenderer.on('sync:step',     (_, d) => cb(d)),
    offStep:     ()   => ipcRenderer.removeAllListeners('sync:step'),
    onProgress:  (cb) => ipcRenderer.on('sync:progress', (_, d) => cb(d)),
    offProgress: ()   => ipcRenderer.removeAllListeners('sync:progress')
  },
  pull: {
    start:   (project, settings)                      => ipcRenderer.invoke('pull:start',   project, settings),
    install: (project, settings, zipName, versionMeta) => ipcRenderer.invoke('pull:install', project, settings, zipName, versionMeta)
  },
  nativeTheme: {
    isDark:    ()   => ipcRenderer.invoke('nativeTheme:isDark'),
    onChange:  (cb) => ipcRenderer.on('nativeTheme:changed', (_, dark) => cb(dark)),
    offChange: ()   => ipcRenderer.removeAllListeners('nativeTheme:changed')
  },
  cinnamon: {
    readStatus: (project, settings)            => ipcRenderer.invoke('cinnamon:readStatus', project, settings),
    uninstall:  (project, settings)            => ipcRenderer.invoke('cinnamon:uninstall',  project, settings),
    renameCin:  (oldName, newName, settings)   => ipcRenderer.invoke('cinnamon:renameCin',  oldName, newName, settings),
    deleteCin:  (project, settings)            => ipcRenderer.invoke('cinnamon:deleteCin',  project, settings),
  },
  sftp: {
    test:         (settings)          => ipcRenderer.invoke('sftp:test',         settings),
    listVersions: (project, settings) => ipcRenderer.invoke('sftp:listVersions', project, settings)
  },
  ssh: {
    checkKey:     ()  => ipcRenderer.invoke('ssh:checkKey'),
    generateKey:  ()  => ipcRenderer.invoke('ssh:generateKey'),
    getPublicKey: ()  => ipcRenderer.invoke('ssh:getPublicKey')
  }
})
