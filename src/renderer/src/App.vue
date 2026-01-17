<template>
  <router-view />

  <!-- Close Confirmation Modal -->
  <dialog ref="closeModal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Zamknij aplikację?</h3>
      <p class="py-4">Czy chcesz zapisać sesję przed zamknięciem?</p>
      <div class="modal-action">
        <button class="btn btn-ghost" @click="handleCloseCancel">Anuluj</button>
        <button class="btn btn-error" @click="handleCloseDiscard">Nie zapisuj</button>
        <button class="btn btn-primary" @click="handleCloseSave">Zapisz i zamknij</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="handleCloseCancel">close</button>
    </form>
  </dialog>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'

const closeModal = ref(null)
const projectDataRef = ref(null)
const lastSavedTime = ref(null)
const fileNameRef = ref('')

// Provide functions for child components to register project data
provide('registerProjectData', (data, fileName) => {
  projectDataRef.value = data
  fileNameRef.value = fileName || ''
})

provide('markAsSaved', (savedTime) => {
  lastSavedTime.value = savedTime
})

provide('getLastSavedTime', () => lastSavedTime.value)

const hasUnsavedChanges = () => {
  if (!projectDataRef.value) return false
  if (!lastSavedTime.value) return true // Never saved
  const lastModified = projectDataRef.value.lastModified
  if (!lastModified) return true
  return new Date(lastModified) > new Date(lastSavedTime.value)
}

onMounted(() => {
  // Listen for close confirmation request from main process
  window.api?.onCheckUnsavedChanges(() => {
    // Only show dialog if there are unsaved changes
    if (hasUnsavedChanges()) {
      closeModal.value?.showModal()
    } else {
      // No unsaved changes, just close
      window.api?.sendCloseResponse(true)
    }
  })
})

const handleCloseCancel = () => {
  closeModal.value?.close()
  window.api?.sendCloseResponse(false)
}

const handleCloseDiscard = () => {
  closeModal.value?.close()
  window.api?.sendCloseResponse(true)
}

const handleCloseSave = async () => {
  if (projectDataRef.value) {
    try {
      projectDataRef.value.lastModified = new Date().toISOString()
      const jsonString = JSON.stringify(projectDataRef.value, null, 2)
      const result = await window.api.saveProjectFile(jsonString)

      if (result.canceled) {
        closeModal.value?.close()
        window.api?.sendCloseResponse(false)
        return
      }

      if (!result.success) {
        alert('Nie udało się zapisać pliku: ' + (result.error || 'Nieznany błąd'))
        closeModal.value?.close()
        window.api?.sendCloseResponse(false)
        return
      }

      // Update recentProject in localStorage
      const recentProject = {
        name: fileNameRef.value || projectDataRef.value.fileName || 'Projekt',
        savedAt: new Date().toISOString(),
        filePath: result.filePath
      }
      localStorage.setItem('recentProject', JSON.stringify(recentProject))
    } catch (error) {
      console.error('Error saving on close:', error)
      alert('Błąd podczas zapisywania')
      closeModal.value?.close()
      window.api?.sendCloseResponse(false)
      return
    }
  }

  closeModal.value?.close()
  window.api?.sendCloseResponse(true)
}
</script>
