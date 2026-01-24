<template src="./ConfigureHeaders.html"></template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

// Dialog helper functions
const showAlert = async (message, type = 'info') => {
  await window.api.showMessageBox({
    type,
    title: type === 'error' ? t('app.error') : t('app.info'),
    message,
    buttons: ['OK']
  })
}

const showConfirm = async (message) => {
  const result = await window.api.showMessageBox({
    type: 'question',
    title: t('app.confirm'),
    message,
    buttons: [t('app.yes'), t('app.no')],
    defaultId: 1,
    cancelId: 1
  })
  return result.response === 0
}

const fileName = ref('')
const rawText = ref('')
const rows = ref([])
const hasHeaderRow = ref(true)
const delimiter = ref(',')

// Column mappings - arrays to support concatenation
const mappings = ref({
  transactionDate: [],
  accountingDate: [],
  description: [],
  amount: []
})

// Preset management
const presets = ref([])
const selectedPresetId = ref('')
const newPresetName = ref('')
const showSavePresetModal = ref(false)

// Preview settings
const previewRowCount = 10

// Import mode flag
const isImportMode = ref(false)

onMounted(() => {
  // Load data from sessionStorage or history.state
  let data = null

  const sessionData = sessionStorage.getItem('configureHeadersData')
  if (sessionData) {
    try {
      data = JSON.parse(sessionData)
      sessionStorage.removeItem('configureHeadersData')
    } catch (e) {
      console.error('Error parsing session data:', e)
    }
  }

  if (!data) {
    const state = history.state
    if (state?.rawText) {
      data = state
    }
  }

  if (!data?.rawText) {
    console.error('[ConfigureHeaders] No CSV data, redirecting to home')
    router.push({ name: 'home' })
    return
  }

  rawText.value = data.rawText
  fileName.value = data.fileName || t('app.unknownFile')
  delimiter.value = data.delimiter || detectDelimiter(data.rawText)
  isImportMode.value = data.isImport || false

  // Parse CSV into rows
  rows.value = parseCSVRows(rawText.value, delimiter.value)

  // Load saved presets
  loadPresets()

  // Try to auto-detect column mappings
  autoDetectMappings()
})

// Detect delimiter from CSV text
const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  if (semicolons > commas && semicolons > tabs) return ';'
  if (tabs > commas && tabs > semicolons) return '\t'
  return ','
}

// Parse CSV text into array of arrays
const parseCSVRows = (text, delim) => {
  const lines = text.split('\n').filter((line) => line.trim())
  return lines.map((line) => {
    const cleanLine = line.trim()
    return parseCSVLine(cleanLine, delim)
  })
}

const parseCSVLine = (line, delim) => {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (!inQuotes) {
        inQuotes = true
      } else if (nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = false
      }
    } else if (char === delim && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// Column count
const columnCount = computed(() => {
  if (rows.value.length === 0) return 0
  return Math.max(...rows.value.map((row) => row.length))
})

// Column headers (from first row if hasHeaderRow, or generated)
const columnHeaders = computed(() => {
  if (rows.value.length === 0) return []

  if (hasHeaderRow.value) {
    return rows.value[0].map((header, index) => ({
      index,
      name: header || `${t('configureHeaders.column')} ${index + 1}`,
      originalName: header
    }))
  } else {
    return Array.from({ length: columnCount.value }, (_, index) => ({
      index,
      name: `${t('configureHeaders.column')} ${index + 1}`,
      originalName: null
    }))
  }
})

// Data rows (excluding header if present)
const dataRows = computed(() => {
  if (rows.value.length === 0) return []
  return hasHeaderRow.value ? rows.value.slice(1) : rows.value
})

// Preview rows
const previewRows = computed(() => {
  return dataRows.value.slice(0, previewRowCount)
})

// Auto-detect column mappings based on header names
const autoDetectMappings = () => {
  if (!hasHeaderRow.value || rows.value.length === 0) return

  const headers = rows.value[0].map((h) => (h || '').toLowerCase())

  // Date detection
  const dateKeywords = ['data operacji', 'data transakcji', 'data', 'date', 'transaction date']
  const accountingDateKeywords = [
    'data księgowania',
    'data waluty',
    'data rozliczenia',
    'accounting date'
  ]
  const descriptionKeywords = [
    'opis transakcji',
    'opis',
    'tytuł',
    'description',
    'title',
    'transaction description'
  ]
  const amountKeywords = ['kwota', 'amount', 'wartość', 'value', 'suma']

  headers.forEach((header, index) => {
    if (
      dateKeywords.some((k) => header.includes(k)) &&
      mappings.value.transactionDate.length === 0
    ) {
      mappings.value.transactionDate = [index]
    }
    if (
      accountingDateKeywords.some((k) => header.includes(k)) &&
      mappings.value.accountingDate.length === 0
    ) {
      mappings.value.accountingDate = [index]
    }
    if (descriptionKeywords.some((k) => header.includes(k))) {
      if (!mappings.value.description.includes(index)) {
        mappings.value.description.push(index)
      }
    }
    if (amountKeywords.some((k) => header.includes(k)) && mappings.value.amount.length === 0) {
      mappings.value.amount = [index]
    }
  })
}

// Toggle column selection for a mapping
const toggleColumnMapping = (field, columnIndex) => {
  const arr = mappings.value[field]
  const idx = arr.indexOf(columnIndex)

  if (field === 'amount') {
    // Amount should be single select
    mappings.value[field] = idx === -1 ? [columnIndex] : []
  } else {
    // Other fields support multi-select
    if (idx === -1) {
      arr.push(columnIndex)
      arr.sort((a, b) => a - b)
    } else {
      arr.splice(idx, 1)
    }
  }
}

// Check if column is selected for a mapping
const isColumnSelected = (field, columnIndex) => {
  return mappings.value[field].includes(columnIndex)
}

// Get concatenated value for preview
const getConcatenatedValue = (row, columnIndices) => {
  if (!columnIndices || columnIndices.length === 0) return '-'
  return columnIndices
    .map((i) => row[i] || '')
    .filter((v) => v)
    .join(' ')
}

// Preview result for a row
const getPreviewResult = (row) => {
  return {
    transactionDate: getConcatenatedValue(row, mappings.value.transactionDate),
    accountingDate: getConcatenatedValue(row, mappings.value.accountingDate),
    description: getConcatenatedValue(row, mappings.value.description),
    amount: getConcatenatedValue(row, mappings.value.amount)
  }
}

// Validation
const isValid = computed(() => {
  return (
    mappings.value.transactionDate.length > 0 &&
    mappings.value.description.length > 0 &&
    mappings.value.amount.length > 0
  )
})

const validationErrors = computed(() => {
  const errors = []
  if (mappings.value.transactionDate.length === 0)
    errors.push(t('configureHeaders.validation.transactionDateRequired'))
  if (mappings.value.description.length === 0)
    errors.push(t('configureHeaders.validation.descriptionRequired'))
  if (mappings.value.amount.length === 0)
    errors.push(t('configureHeaders.validation.amountRequired'))
  return errors
})

// Preset management
const loadPresets = () => {
  const saved = localStorage.getItem('columnMappingPresets')
  if (saved) {
    presets.value = JSON.parse(saved)
  }
}

const savePreset = async () => {
  if (!newPresetName.value.trim()) {
    await showAlert(t('errors.provideConfigName'), 'error')
    return
  }

  const preset = {
    id: Date.now().toString(),
    name: newPresetName.value.trim(),
    hasHeaderRow: hasHeaderRow.value,
    mappings: JSON.parse(JSON.stringify(mappings.value)),
    createdAt: new Date().toISOString()
  }

  presets.value.push(preset)
  localStorage.setItem('columnMappingPresets', JSON.stringify(presets.value))

  newPresetName.value = ''
  showSavePresetModal.value = false
  selectedPresetId.value = preset.id
}

const applyPreset = () => {
  if (!selectedPresetId.value) return

  const preset = presets.value.find((p) => p.id === selectedPresetId.value)
  if (preset) {
    hasHeaderRow.value = preset.hasHeaderRow
    mappings.value = JSON.parse(JSON.stringify(preset.mappings))
  }
}

const deletePreset = async () => {
  if (!selectedPresetId.value) return

  if (await showConfirm(t('confirm.deleteConfig'))) {
    presets.value = presets.value.filter((p) => p.id !== selectedPresetId.value)
    localStorage.setItem('columnMappingPresets', JSON.stringify(presets.value))
    selectedPresetId.value = ''
  }
}

// Watch for preset selection
watch(selectedPresetId, () => {
  if (selectedPresetId.value) {
    applyPreset()
  }
})

// Convert and continue
const continueToCategizer = async () => {
  if (!isValid.value) {
    await showAlert(
      t('errors.fillRequiredFields') + ':\n' + validationErrors.value.join('\n'),
      'error'
    )
    return
  }

  // Build headers array - use internal keys, not translated labels
  const headers = ['Data operacji', 'Data księgowania', 'Opis transakcji', 'Kwota']

  // Add extra columns (unmapped)
  const mappedIndices = new Set([
    ...mappings.value.transactionDate,
    ...mappings.value.accountingDate,
    ...mappings.value.description,
    ...mappings.value.amount
  ])

  columnHeaders.value.forEach((col) => {
    if (!mappedIndices.has(col.index)) {
      headers.push(col.name)
    }
  })

  // Build transactions
  const transactions = dataRows.value.map((row, index) => {
    const transaction = {
      id: `txn_${Date.now()}_${index}`,
      categoryId: null,
      'Data operacji': getConcatenatedValue(row, mappings.value.transactionDate),
      'Data księgowania':
        getConcatenatedValue(row, mappings.value.accountingDate) ||
        getConcatenatedValue(row, mappings.value.transactionDate),
      'Opis transakcji': getConcatenatedValue(row, mappings.value.description),
      Kwota: getConcatenatedValue(row, mappings.value.amount)
    }

    // Add extra columns
    columnHeaders.value.forEach((col) => {
      if (!mappedIndices.has(col.index)) {
        transaction[col.name] = row[col.index] || ''
      }
    })

    return transaction
  })

  // Build project data
  const projectData = {
    fileName: fileName.value,
    headers,
    transactions,
    categories: [],
    categoryGroups: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }

  // Check if this is an import operation
  if (isImportMode.value) {
    // Store imported data for merge
    sessionStorage.setItem('importMergeData', JSON.stringify(projectData))

    // Restore original project data and navigate back
    const returnData = sessionStorage.getItem('importReturnData')
    if (returnData) {
      sessionStorage.removeItem('importReturnData')
      const parsed = JSON.parse(returnData)
      sessionStorage.setItem('categorizerData', JSON.stringify(parsed))
    }

    router.push({ name: 'Categorizer' })
    return
  }

  // Store data in sessionStorage to avoid history.state cloning issues
  sessionStorage.setItem(
    'categorizerData',
    JSON.stringify({
      projectData,
      fileName: fileName.value
    })
  )

  // Navigate to Categorizer (normal flow)
  router.push({ name: 'Categorizer' })
}

const goBack = () => {
  // If in import mode, restore original project and go back to Categorizer
  if (isImportMode.value) {
    const returnData = sessionStorage.getItem('importReturnData')
    if (returnData) {
      sessionStorage.removeItem('importReturnData')
      const parsed = JSON.parse(returnData)
      sessionStorage.setItem('categorizerData', JSON.stringify(parsed))
      router.push({ name: 'Categorizer' })
      return
    }
  }
  router.push({ name: 'home' })
}
</script>
