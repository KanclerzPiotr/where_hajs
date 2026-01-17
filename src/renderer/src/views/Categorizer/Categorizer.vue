<template src="./Categorizer.html"></template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Get App.vue's registration functions
const registerProjectData = inject('registerProjectData', null)
const markAsSaved = inject('markAsSaved', null)
const fileName = ref('')
const headers = ref([])
const records = ref([])
const categories = ref([])
const categoryGroups = ref([])
const categoryModal = ref(null)
const newCategoryName = ref('')
const newCategoryColor = ref('#3b82f6')
const newCategoryFilter = ref('')
const newGroupName = ref('')
const newGroupColor = ref('#6366f1')
const selectedGroupCategories = ref([])
const editingGroup = ref(null)
const projectData = ref(null)

// Import/merge state
const importFileInput = ref(null)
const showMergeModal = ref(false)
const mergePreview = ref({ newRecords: [], duplicates: [], toImport: [] })
const selectedTransactionIndex = ref(null)
const dropdownPosition = ref({ top: '0px', left: '0px' })
const categoryDropdown = ref(null)
const hideCategorizedRecords = ref(false)
const selectedCategoryFilter = ref('all') // 'all', 'uncategorized', category ID, or 'group:groupId'

const displayedRecords = computed(() => {
  let filtered = []

  records.value.forEach((record, index) => {
    const transaction = projectData.value?.transactions[index]

    // Apply category filter
    if (selectedCategoryFilter.value === 'all') {
      // Show all records
      filtered.push({
        data: record,
        originalIndex: index
      })
    } else if (selectedCategoryFilter.value === 'uncategorized') {
      // Show only uncategorized
      if (!transaction || !transaction.categoryId) {
        filtered.push({
          data: record,
          originalIndex: index
        })
      }
    } else if (selectedCategoryFilter.value.startsWith('group:')) {
      // Show only transactions from categories in the group
      const groupId = selectedCategoryFilter.value.replace('group:', '')
      const group = categoryGroups.value.find((g) => g.id === groupId)
      if (group && transaction && group.categoryIds.includes(transaction.categoryId)) {
        filtered.push({
          data: record,
          originalIndex: index
        })
      }
    } else {
      // Show only specific category
      if (transaction && transaction.categoryId === selectedCategoryFilter.value) {
        filtered.push({
          data: record,
          originalIndex: index
        })
      }
    }
  })

  // Apply hide categorized filter (only when showing "all")
  if (hideCategorizedRecords.value && selectedCategoryFilter.value === 'all') {
    filtered = filtered.filter((item) => {
      const transaction = projectData.value?.transactions[item.originalIndex]
      return !transaction || !transaction.categoryId
    })
  }

  return filtered
})

onMounted(() => {
  let state = history.state

  console.log('[Categorizer] onMounted - history.state:', state)

  // Try sessionStorage if history.state doesn't have projectData (e.g., coming back from DisplayData)
  if (!state?.projectData) {
    const sessionData = sessionStorage.getItem('categorizerData')
    if (sessionData) {
      try {
        state = JSON.parse(sessionData)
        sessionStorage.removeItem('categorizerData') // Clean up after reading
        console.log('[Categorizer] Loaded data from sessionStorage')
      } catch (e) {
        console.error('[Categorizer] Error parsing sessionStorage data:', e)
      }
    }
  }

  if (!state?.projectData) {
    console.error('[Categorizer] No projectData in state, redirecting to home')
    router.push({ name: 'home' })
    return
  }

  console.log('[Categorizer] Loading project data:', {
    fileName: state.fileName,
    transactionsCount: state.projectData.transactions?.length,
    categoriesCount: state.projectData.categories?.length
  })

  // Load project data (JSON format)
  projectData.value = state.projectData
  fileName.value = state.fileName || projectData.value.fileName || 'Nieznany plik'
  headers.value = projectData.value.headers || []

  // Convert transactions to records format for table display
  records.value = projectData.value.transactions.map((transaction) => {
    return headers.value.map((header) => transaction[header] || '')
  })

  // Load categories from project data (project-specific, not global)
  categories.value = projectData.value.categories || []

  // Load category groups from project data (project-specific, not global)
  categoryGroups.value = projectData.value.categoryGroups || []

  // Ensure projectData has these arrays initialized
  if (!projectData.value.categories) {
    projectData.value.categories = []
  }
  if (!projectData.value.categoryGroups) {
    projectData.value.categoryGroups = []
  }

  // Update project data filename
  projectData.value.fileName = fileName.value

  // Register project data with App.vue for close confirmation
  if (registerProjectData) {
    registerProjectData(projectData.value, fileName.value)
  }

  // Check if returning from import flow
  checkImportReturn()
})

// Watch for project data changes to keep App.vue reference updated
watch(
  projectData,
  (newData) => {
    if (registerProjectData && newData) {
      registerProjectData(newData, fileName.value)
    }
  },
  { deep: true }
)

// Cleanup on unmount
onUnmounted(() => {
  if (registerProjectData) {
    registerProjectData(null, '')
  }
})

const parseCSV = (csvText) => {
  try {
    const lines = csvText.split('\n').filter((line) => line.trim())

    if (lines.length === 0) {
      return
    }

    // Parse headers (first line)
    headers.value = parseCSVLine(lines[0])

    // Parse records (remaining lines)
    records.value = lines.slice(1).map((line) => parseCSVLine(line))
  } catch (error) {
    console.error('Error parsing CSV:', error)
    alert('Błąd podczas parsowania pliku CSV')
  }
}

const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

const goBack = () => {
  router.push({ name: 'home' })
}

const saveProject = async () => {
  if (!projectData.value) {
    alert('Brak danych projektu do zapisania')
    return
  }

  // Update project data with current state
  projectData.value.lastModified = new Date().toISOString()

  // Convert to JSON string
  const jsonString = JSON.stringify(projectData.value, null, 2)

  try {
    // Use Electron API to save file with dialog
    const result = await window.api.saveProjectFile(jsonString)

    if (result.canceled) {
      return // User canceled
    }

    if (!result.success) {
      alert('Nie udało się zapisać pliku: ' + (result.error || 'Nieznany błąd'))
      return
    }

    // Save only project reference to localStorage (not full data)
    const savedTime = new Date().toISOString()
    const recentProject = {
      name: fileName.value,
      savedAt: savedTime,
      filePath: result.filePath
    }
    localStorage.setItem('recentProject', JSON.stringify(recentProject))

    // Mark as saved in App.vue
    if (markAsSaved) {
      markAsSaved(savedTime)
    }

    alert('Projekt został zapisany pomyślnie!')
  } catch (error) {
    console.error('Error saving project:', error)
    alert('Błąd podczas zapisywania projektu')
  }
}

const displayData = () => {
  if (!projectData.value) {
    alert('Brak danych projektu')
    return
  }

  // Store data temporarily in sessionStorage for navigation
  sessionStorage.setItem(
    'displayData',
    JSON.stringify({
      projectData: projectData.value,
      fileName: fileName.value
    })
  )

  router.push({ name: 'DisplayData' })
}

// Category Management Functions
const saveCategories = () => {
  if (projectData.value) {
    projectData.value.categories = categories.value
    projectData.value.lastModified = new Date().toISOString()
  }
}

const openCategoryManager = () => {
  // Close category selector if open
  closeCategorySelector()
  categoryModal.value?.showModal()
}

const closeCategoryManager = () => {
  categoryModal.value?.close()
  newCategoryName.value = ''
  newCategoryColor.value = '#3b82f6'
  newCategoryFilter.value = ''
}

const addCategory = () => {
  if (!newCategoryName.value.trim()) {
    alert('Podaj nazwę kategorii')
    return
  }

  const newCategory = {
    id: Date.now().toString(),
    name: newCategoryName.value.trim(),
    color: newCategoryColor.value,
    filter: newCategoryFilter.value.trim() || null
  }

  categories.value.push(newCategory)
  saveCategories()

  newCategoryName.value = ''
  newCategoryColor.value = '#3b82f6'
  newCategoryFilter.value = ''
}

const deleteCategory = (categoryId) => {
  if (confirm('Czy na pewno chcesz usunąć tę kategorię?')) {
    categories.value = categories.value.filter((cat) => cat.id !== categoryId)
    // Also remove from any groups
    categoryGroups.value.forEach((group) => {
      group.categoryIds = group.categoryIds.filter((id) => id !== categoryId)
    })
    saveCategories()
    saveCategoryGroups()
  }
}

// Category Group Management Functions
const saveCategoryGroups = () => {
  if (projectData.value) {
    projectData.value.categoryGroups = categoryGroups.value
    projectData.value.lastModified = new Date().toISOString()
  }
}

const addCategoryGroup = () => {
  if (!newGroupName.value.trim()) {
    alert('Podaj nazwę grupy')
    return
  }

  if (selectedGroupCategories.value.length === 0) {
    alert('Wybierz przynajmniej jedną kategorię dla grupy')
    return
  }

  const newGroup = {
    id: Date.now().toString(),
    name: newGroupName.value.trim(),
    color: newGroupColor.value,
    categoryIds: [...selectedGroupCategories.value]
  }

  categoryGroups.value.push(newGroup)
  saveCategoryGroups()

  // Reset form
  newGroupName.value = ''
  newGroupColor.value = '#6366f1'
  selectedGroupCategories.value = []
}

const editGroup = (group) => {
  editingGroup.value = group.id
  newGroupName.value = group.name
  newGroupColor.value = group.color
  selectedGroupCategories.value = [...group.categoryIds]
}

const updateCategoryGroup = () => {
  if (!editingGroup.value) return

  const group = categoryGroups.value.find((g) => g.id === editingGroup.value)
  if (group) {
    group.name = newGroupName.value.trim()
    group.color = newGroupColor.value
    group.categoryIds = [...selectedGroupCategories.value]
    saveCategoryGroups()
  }

  cancelEditGroup()
}

const cancelEditGroup = () => {
  editingGroup.value = null
  newGroupName.value = ''
  newGroupColor.value = '#6366f1'
  selectedGroupCategories.value = []
}

const deleteCategoryGroup = (groupId) => {
  if (confirm('Czy na pewno chcesz usunąć tę grupę?')) {
    categoryGroups.value = categoryGroups.value.filter((g) => g.id !== groupId)
    saveCategoryGroups()
  }
}

const toggleCategoryInGroup = (categoryId) => {
  const index = selectedGroupCategories.value.indexOf(categoryId)
  if (index === -1) {
    selectedGroupCategories.value.push(categoryId)
  } else {
    selectedGroupCategories.value.splice(index, 1)
  }
}

const getCategoryGroup = (categoryId) => {
  return categoryGroups.value.find((g) => g.categoryIds.includes(categoryId)) || null
}

const generateRandomColor = () => {
  // Generate vibrant colors with good saturation
  const hue = Math.floor(Math.random() * 360)
  const saturation = 65 + Math.floor(Math.random() * 25) // 65-90%
  const lightness = 45 + Math.floor(Math.random() * 15) // 45-60%

  // Convert HSL to hex
  const hslToHex = (h, s, l) => {
    l /= 100
    const a = (s * Math.min(l, 1 - l)) / 100
    const f = (n) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  return hslToHex(hue, saturation, lightness)
}

const getContrastColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

const applyCategoryFilters = () => {
  if (!projectData.value || !projectData.value.transactions) {
    alert('Brak danych transakcji')
    return
  }

  let matchCount = 0

  // Get the description field name (could be "Opis transakcji", "opis", etc.)
  const descriptionFields = ['Opis transakcji', 'opis', 'description', 'Opis']
  let descField = null

  if (projectData.value.transactions.length > 0) {
    const firstTransaction = projectData.value.transactions[0]
    descField = descriptionFields.find((field) => field in firstTransaction)
  }

  if (!descField) {
    alert('Nie znaleziono pola z opisem transakcji')
    return
  }

  // Apply filters to each transaction
  projectData.value.transactions.forEach((transaction) => {
    // Skip if already has a category
    if (transaction.categoryId) return

    const description = (transaction[descField] || '').toUpperCase()

    // Try to match with category filters
    for (const category of categories.value) {
      if (category.filter && category.filter.trim() !== '') {
        const filterText = category.filter.toUpperCase()

        if (description.includes(filterText)) {
          transaction.categoryId = category.id
          matchCount++
          break // Stop after first match
        }
      }
    }
  })

  // Update project data
  projectData.value.lastModified = new Date().toISOString()

  alert(`Automatycznie skategoryzowano ${matchCount} transakcji`)

  // Refresh records display
  records.value = projectData.value.transactions.map((transaction) => {
    return headers.value.map((header) => transaction[header] || '')
  })

  // Close modal
  closeCategoryManager()
}

const getTransactionCategory = (index) => {
  if (!projectData.value || !projectData.value.transactions[index]) {
    return null
  }

  const transaction = projectData.value.transactions[index]
  const categoryId = transaction.categoryId

  if (!categoryId) return null

  return categories.value.find((cat) => cat.id === categoryId) || null
}

const openCategorySelector = (index, event) => {
  selectedTransactionIndex.value = index

  // Calculate position near the clicked button
  const button = event.currentTarget
  const rect = button.getBoundingClientRect()

  // Position dropdown below and to the right of the button
  const top = rect.bottom + window.scrollY + 5
  const left = rect.left + window.scrollX

  // Adjust if dropdown would go off-screen
  const dropdownWidth = 256 // w-64 = 16rem = 256px
  const dropdownHeight = 320 // max-h-80 = 20rem = 320px

  let finalTop = top
  let finalLeft = left

  // Check if dropdown goes beyond right edge
  if (left + dropdownWidth > window.innerWidth) {
    finalLeft = rect.right + window.scrollX - dropdownWidth
  }

  // Check if dropdown goes beyond bottom edge
  if (top + dropdownHeight > window.innerHeight + window.scrollY) {
    finalTop = rect.top + window.scrollY - dropdownHeight - 5
  }

  dropdownPosition.value = {
    top: `${finalTop}px`,
    left: `${finalLeft}px`
  }
}

const closeCategorySelector = () => {
  selectedTransactionIndex.value = null
}

const assignCategory = (index, categoryId) => {
  if (!projectData.value || !projectData.value.transactions[index]) {
    return
  }

  // If categoryId is null or clicking same category badge, remove category
  const transaction = projectData.value.transactions[index]
  if (transaction.categoryId === categoryId) {
    transaction.categoryId = null
  } else {
    transaction.categoryId = categoryId
  }

  // Update project data
  projectData.value.lastModified = new Date().toISOString()

  // Close selector
  closeCategorySelector()
}

const removeCategory = (index) => {
  if (!projectData.value || !projectData.value.transactions[index]) {
    return
  }

  // Remove category from transaction
  projectData.value.transactions[index].categoryId = null

  // Update project data
  projectData.value.lastModified = new Date().toISOString()
}

// Import/Merge Functions
const openImportDialog = () => {
  importFileInput.value?.click()
}

const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  if (semicolons > commas && semicolons > tabs) return ';'
  if (tabs > commas && tabs > semicolons) return '\t'
  return ','
}

const onImportFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const arrayBuffer = await file.arrayBuffer()
    const encodings = ['utf-8', 'windows-1250', 'iso-8859-2']
    let text

    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true })
        text = decoder.decode(arrayBuffer)
        break
      } catch (e) {
        continue
      }
    }

    if (!text) {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(arrayBuffer)
    }

    const delimiter = detectDelimiter(text)

    // Store current project data in sessionStorage for return
    sessionStorage.setItem(
      'importReturnData',
      JSON.stringify({
        projectData: projectData.value,
        fileName: fileName.value
      })
    )

    // Navigate to ConfigureHeaders for column mapping
    sessionStorage.setItem(
      'configureHeadersData',
      JSON.stringify({
        rawText: text,
        fileName: file.name,
        delimiter: delimiter,
        isImport: true
      })
    )

    router.push({ name: 'configure-headers' })
  } catch (error) {
    console.error('Error loading import file:', error)
    alert('Nie udało się wczytać pliku.')
  } finally {
    event.target.value = ''
  }
}

const getTransactionKey = (transaction) => {
  const date = transaction['Data operacji'] || ''
  const amount = transaction['Kwota'] || ''
  const desc = (transaction['Opis transakcji'] || '').substring(0, 50)
  return `${date}|${amount}|${desc}`
}

const processImportedData = (importedProjectData) => {
  if (!projectData.value || !importedProjectData) return

  const existingKeys = new Set(projectData.value.transactions.map((t) => getTransactionKey(t)))

  const newRecords = []
  const duplicates = []

  importedProjectData.transactions.forEach((transaction) => {
    const key = getTransactionKey(transaction)
    if (existingKeys.has(key)) {
      duplicates.push(transaction)
    } else {
      newRecords.push(transaction)
    }
  })

  mergePreview.value = {
    newRecords,
    duplicates,
    toImport: [...newRecords]
  }

  showMergeModal.value = true
}

const toggleDuplicateImport = (transaction) => {
  const key = getTransactionKey(transaction)
  const idx = mergePreview.value.toImport.findIndex((t) => getTransactionKey(t) === key)
  if (idx === -1) {
    mergePreview.value.toImport.push(transaction)
  } else {
    mergePreview.value.toImport.splice(idx, 1)
  }
}

const isDuplicateSelected = (transaction) => {
  const key = getTransactionKey(transaction)
  return mergePreview.value.toImport.some((t) => getTransactionKey(t) === key)
}

const confirmMerge = () => {
  if (!projectData.value) return

  const toImport = mergePreview.value.toImport.map((t, i) => ({
    ...t,
    id: `txn_${Date.now()}_import_${i}`,
    categoryId: null
  }))

  projectData.value.transactions.push(...toImport)
  projectData.value.lastModified = new Date().toISOString()

  // Refresh records display
  records.value = projectData.value.transactions.map((transaction) => {
    return headers.value.map((header) => transaction[header] || '')
  })

  const msg = `Zaimportowano ${toImport.length} transakcji.`
  alert(msg)

  closeMergeModal()
}

const closeMergeModal = () => {
  showMergeModal.value = false
  mergePreview.value = { newRecords: [], duplicates: [], toImport: [] }
}

// Check for import return data on mount
const checkImportReturn = () => {
  const importData = sessionStorage.getItem('importMergeData')
  if (importData) {
    sessionStorage.removeItem('importMergeData')
    try {
      const parsed = JSON.parse(importData)
      processImportedData(parsed)
    } catch (e) {
      console.error('Error processing import data:', e)
    }
  }
}
</script>
