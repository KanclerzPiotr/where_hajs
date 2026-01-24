<template src="./LandingPage.html"></template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t, locale } = useI18n()

// Dialog helper functions
const showAlert = async (message, type = 'info') => {
  await window.api.showMessageBox({
    type,
    title: type === 'error' ? t('app.error') : t('app.info'),
    message,
    buttons: ['OK']
  })
}

const hasRecentProject = ref(false)
const recentProject = ref(null)
const csvFileInput = ref(null)
const jsonFileInput = ref(null)
const currentLocale = ref(localStorage.getItem('locale') || 'pl')

onMounted(() => {
  // Check for recent project in localStorage
  const saved = localStorage.getItem('recentProject')
  if (saved) {
    try {
      recentProject.value = JSON.parse(saved)
      hasRecentProject.value = true
    } catch (e) {
      console.error('Error loading recent project:', e)
      hasRecentProject.value = false
    }
  }
})

const switchLanguage = () => {
  locale.value = currentLocale.value
  localStorage.setItem('locale', currentLocale.value)
}

const handleOpenCSV = () => {
  csvFileInput.value?.click()
}

const handleLoadProject = () => {
  jsonFileInput.value?.click()
}

const handleLoadRecent = async () => {
  if (!recentProject.value) {
    showAlert(t('errors.noSavedProject'), 'error')
    return
  }

  try {
    if (!recentProject.value.filePath) {
      showAlert(t('errors.cannotLoadProject'), 'error')
      return
    }

    const result = await window.api.readProjectFile(recentProject.value.filePath)

    if (result.success) {
      const projectData = JSON.parse(result.data)

      // Store data in sessionStorage to avoid history.state cloning issues
      sessionStorage.setItem(
        'categorizerData',
        JSON.stringify({
          projectData: projectData,
          fileName: recentProject.value.name
        })
      )

      router.push({ name: 'Categorizer' })
    } else {
      showAlert(
        t('errors.cannotLoadProjectError') + ': ' + (result.error || t('errors.fileNotFound')),
        'error'
      )
      // Clear invalid recent project
      localStorage.removeItem('recentProject')
      hasRecentProject.value = false
      recentProject.value = null
    }
  } catch (error) {
    console.error('Error loading recent project:', error)
    showAlert(t('errors.errorLoadingProject'), 'error')
  }
}

const convertCSVToJSON = (csvText) => {
  const lines = csvText.split('\n').filter((line) => line.trim())

  if (lines.length === 0) {
    return {
      fileName: '',
      headers: [],
      transactions: [],
      categories: [],
      categoryGroups: [],
      createdAt: new Date().toISOString()
    }
  }

  // Parse headers (first line)
  const rawHeaders = parseCSVLine(lines[0])

  // Find "Opis transakcji" column index
  const opisIndex = rawHeaders.findIndex(
    (h) => h.toLowerCase().trim() === 'opis transakcji' || h.toLowerCase().includes('opis')
  )

  // Build clean headers list and track empty header indices after "Opis transakcji"
  const headers = []
  const emptyHeaderIndices = []

  rawHeaders.forEach((header, idx) => {
    const isEmptyHeader = header.trim() === ''

    if (isEmptyHeader && idx > opisIndex && opisIndex !== -1) {
      // This is an empty header after "Opis transakcji" - track it for merging
      emptyHeaderIndices.push(idx)
    } else if (!isEmptyHeader) {
      // Regular header - keep it
      headers.push(header)
    }
  })

  // Parse transactions (remaining lines)
  const transactions = lines.slice(1).map((line, index) => {
    const values = parseCSVLine(line)
    const transaction = {
      id: `txn_${Date.now()}_${index}`,
      categoryId: null // Will be assigned later
    }

    // Map each non-empty header to its value from the correct column
    rawHeaders.forEach((header, idx) => {
      if (header.trim() !== '') {
        transaction[header] = values[idx] || ''
      }
    })

    // Merge values from empty columns into "Opis transakcji"
    if (opisIndex !== -1 && emptyHeaderIndices.length > 0) {
      const opisHeader = rawHeaders[opisIndex]
      const opisValue = transaction[opisHeader] || ''

      // Collect values from empty columns
      const additionalParts = emptyHeaderIndices
        .map((idx) => values[idx] || '')
        .filter((val) => val.trim() !== '')

      // Concatenate: original opis + all values from empty columns
      if (additionalParts.length > 0) {
        const allParts = [opisValue, ...additionalParts].filter((part) => part.trim() !== '')
        transaction[opisHeader] = allParts.join(' ').trim()
      }
    }

    return transaction
  })

  return {
    fileName: '',
    headers: headers,
    transactions: transactions,
    categories: [],
    categoryGroups: [],
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
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

const detectDelimiter = (text) => {
  const firstLine = text.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length

  if (semicolons > commas && semicolons > tabs) return ';'
  if (tabs > commas && tabs > semicolons) return '\t'
  return ','
}

const onCSVSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    // Read file with proper encoding detection for Polish characters
    const arrayBuffer = await file.arrayBuffer()

    // Try multiple encodings common for Polish files
    let text
    const encodings = ['utf-8', 'windows-1250', 'iso-8859-2']

    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding, { fatal: true })
        text = decoder.decode(arrayBuffer)
        // If successful and contains valid characters, use this encoding
        break
      } catch (e) {
        // Try next encoding
        continue
      }
    }

    // Fallback to UTF-8 if all fail
    if (!text) {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      text = decoder.decode(arrayBuffer)
    }

    // Detect delimiter
    const delimiter = detectDelimiter(text)

    // Navigate to ConfigureHeaders for column mapping
    sessionStorage.setItem(
      'configureHeadersData',
      JSON.stringify({
        rawText: text,
        fileName: file.name,
        delimiter: delimiter
      })
    )

    router.push({ name: 'configure-headers' })
  } catch (error) {
    console.error('Error loading CSV:', error)
    showAlert(t('errors.failedToLoadCSV'), 'error')
  } finally {
    // Reset the file input
    event.target.value = ''
  }
}

const onProjectSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const projectData = JSON.parse(text)

    // Store data in sessionStorage to avoid history.state cloning issues
    sessionStorage.setItem(
      'categorizerData',
      JSON.stringify({
        projectData,
        fileName: file.name
      })
    )

    // Navigate to the Categorizer view
    router.push({ name: 'Categorizer' })
  } catch (error) {
    console.error('Error loading project:', error)
    showAlert(t('errors.failedToLoadProject'), 'error')
  } finally {
    // Reset the file input
    event.target.value = ''
  }
}
</script>
