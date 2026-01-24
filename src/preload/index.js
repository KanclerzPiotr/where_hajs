import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveProjectFile: (jsonData) => ipcRenderer.invoke('save-project-file', jsonData),
  readProjectFile: (filePath) => ipcRenderer.invoke('read-project-file', filePath),
  onCheckUnsavedChanges: (callback) => ipcRenderer.on('check-unsaved-changes', callback),
  sendCloseResponse: (canClose) => ipcRenderer.send('close-response', canClose),
  focusWindow: () => ipcRenderer.send('focus-window'),
  // Dialog APIs - returns { response: number, checkboxChecked: boolean }
  // response is the index of the clicked button
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
