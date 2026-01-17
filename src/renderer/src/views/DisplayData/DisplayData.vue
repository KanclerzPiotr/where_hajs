<template src="./DisplayData.html"></template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js'
import { Pie, Bar } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const router = useRouter()
const fileName = ref('')
const projectData = ref(null)
const categories = ref([])
const categoryGroups = ref([])
const transactions = ref([])
const startDate = ref('')
const endDate = ref('')
const appliedStartDate = ref('')
const appliedEndDate = ref('')
const dateFilterApplied = ref(false)
const selectedMonth = ref('')
const hiddenCategories = ref(new Set())
const hiddenGroups = ref(new Set())
const viewMode = ref('categories') // 'categories' or 'groups'

onMounted(() => {
  // Try to load from sessionStorage first, then fallback to history.state
  const sessionData = sessionStorage.getItem('displayData')
  let data = null

  if (sessionData) {
    try {
      data = JSON.parse(sessionData)
      sessionStorage.removeItem('displayData') // Clean up after reading
    } catch (e) {
      console.error('Error parsing session data:', e)
    }
  }

  // Fallback to history.state
  if (!data) {
    const state = history.state
    if (state?.projectData) {
      data = state
    }
  }

  if (!data?.projectData) {
    router.push({ name: 'home' })
    return
  }

  projectData.value = data.projectData
  fileName.value = data.fileName || projectData.value.fileName || 'Nieznany plik'
  categories.value = projectData.value.categories || []
  categoryGroups.value = projectData.value.categoryGroups || []
  transactions.value = projectData.value.transactions || []

  console.log('[DisplayData] Loaded data:')
  console.log('  - Categories:', categories.value.length, categories.value)
  console.log('  - Transactions:', transactions.value.length)
  console.log('  - Sample transaction:', transactions.value[0])

  // Debug chart data
  setTimeout(() => {
    console.log('[DisplayData] Chart data computed:')
    console.log('  - Pie chart data:', pieChartData.value)
    console.log('  - Bar chart data:', barChartData.value)
    console.log('  - Total spent:', totalSpent.value)
  }, 100)
})

const getTransactionDate = (transaction) => {
  // Try common field names for date
  const dateFields = ['Data operacji', 'Data transakcji', 'Data', 'data', 'date', 'Date']
  for (const field of dateFields) {
    if (transaction[field]) {
      return transaction[field]
    }
  }
  return null
}

const parseDate = (dateStr) => {
  if (!dateStr) return null

  // Try to parse different date formats
  // Common formats: DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
  const formats = [
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/ // YYYY-MM-DD
  ]

  for (let i = 0; i < formats.length; i++) {
    const match = dateStr.match(formats[i])
    if (match) {
      if (i === 2) {
        // YYYY-MM-DD format
        return new Date(match[1], match[2] - 1, match[3])
      } else {
        // DD-MM-YYYY or DD.MM.YYYY format
        return new Date(match[3], match[2] - 1, match[1])
      }
    }
  }

  // Try native Date parsing as fallback
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

const filteredTransactions = computed(() => {
  let filtered = transactions.value

  // Apply date filters using applied dates
  if (appliedStartDate.value || appliedEndDate.value) {
    filtered = filtered.filter((transaction) => {
      const transactionDateStr = getTransactionDate(transaction)
      if (!transactionDateStr) return true // Include if no date field

      const transactionDate = parseDate(transactionDateStr)
      if (!transactionDate) return true // Include if date parsing fails

      if (appliedStartDate.value) {
        const start = new Date(appliedStartDate.value)
        if (transactionDate < start) return false
      }

      if (appliedEndDate.value) {
        const end = new Date(appliedEndDate.value)
        end.setHours(23, 59, 59, 999) // Include entire end date
        if (transactionDate > end) return false
      }

      return true
    })
  }

  return filtered
})

const availableMonths = computed(() => {
  if (!transactions.value || transactions.value.length === 0) return []

  const monthsSet = new Set()

  transactions.value.forEach((transaction) => {
    const dateStr = getTransactionDate(transaction)
    if (dateStr) {
      const date = parseDate(dateStr)
      if (date) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthsSet.add(monthKey)
      }
    }
  })

  const months = Array.from(monthsSet).sort().reverse()

  const monthNames = [
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
    'Lipiec',
    'Sierpień',
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień'
  ]

  return months.map((monthKey) => {
    const [year, month] = monthKey.split('-')
    const monthIndex = parseInt(month) - 1
    return {
      value: monthKey,
      label: `${monthNames[monthIndex]} ${year}`
    }
  })
})

const selectMonth = () => {
  if (!selectedMonth.value) return

  const [year, month] = selectedMonth.value.split('-')
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0)

  startDate.value = startOfMonth.toISOString().split('T')[0]
  endDate.value = endOfMonth.toISOString().split('T')[0]

  // Automatically apply the filter
  applyDateFilters()
}

const applyDateFilters = () => {
  appliedStartDate.value = startDate.value
  appliedEndDate.value = endDate.value
  dateFilterApplied.value = !!(startDate.value || endDate.value)
}

const totalTransactions = computed(() => filteredTransactions.value.length)

const categorizedTransactions = computed(() => {
  return filteredTransactions.value.filter(
    (t) => t.categoryId !== null && t.categoryId !== undefined
  ).length
})

const uncategorizedTransactions = computed(() => {
  return filteredTransactions.value.filter((t) => !t.categoryId).length
})

const getCategoryTransactions = (categoryId) => {
  return filteredTransactions.value.filter((t) => t.categoryId === categoryId)
}

const getCategoryTransactionsCount = (categoryId) => {
  return getCategoryTransactions(categoryId).length
}

const getUncategorizedTransactions = () => {
  return filteredTransactions.value.filter((t) => !t.categoryId)
}

const clearDateFilters = () => {
  startDate.value = ''
  endDate.value = ''
  appliedStartDate.value = ''
  appliedEndDate.value = ''
  dateFilterApplied.value = false
  selectedMonth.value = ''
}

const getTransactionDescription = (transaction) => {
  // Try common field names for description
  const descriptionFields = ['Opis transakcji', 'opis', 'description', 'Opis']
  for (const field of descriptionFields) {
    if (transaction[field]) {
      return transaction[field]
    }
  }
  return 'Brak opisu'
}

const getTransactionAmount = (transaction) => {
  // Try common field names for amount
  const amountFields = ['Kwota', 'kwota', 'amount', 'Amount', 'Wartość']
  for (const field of amountFields) {
    if (transaction[field] !== undefined && transaction[field] !== null) {
      return transaction[field]
    }
  }
  return '0'
}

const getCategoryTotal = (categoryId) => {
  const categoryTransactions = getCategoryTransactions(categoryId)
  const total = categoryTransactions.reduce((sum, transaction) => {
    const amount = parseFloat(
      getTransactionAmount(transaction)
        .toString()
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
    )
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  return total.toFixed(2)
}

const getUncategorizedTotal = () => {
  const uncategorized = getUncategorizedTransactions()
  const total = uncategorized.reduce((sum, transaction) => {
    const amount = parseFloat(
      getTransactionAmount(transaction)
        .toString()
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
    )
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  return total.toFixed(2)
}

// Category visibility functions
const toggleCategoryVisibility = (categoryId) => {
  if (hiddenCategories.value.has(categoryId)) {
    hiddenCategories.value.delete(categoryId)
  } else {
    hiddenCategories.value.add(categoryId)
  }
  // Trigger reactivity
  hiddenCategories.value = new Set(hiddenCategories.value)
}

const isCategoryVisible = (categoryId) => {
  return !hiddenCategories.value.has(categoryId)
}

const toggleGroupVisibility = (groupId) => {
  if (hiddenGroups.value.has(groupId)) {
    hiddenGroups.value.delete(groupId)
  } else {
    hiddenGroups.value.add(groupId)
  }
  // Trigger reactivity
  hiddenGroups.value = new Set(hiddenGroups.value)
}

const isGroupVisible = (groupId) => {
  return !hiddenGroups.value.has(groupId)
}

const showAllCategories = () => {
  hiddenCategories.value = new Set()
}

const hideAllCategories = () => {
  hiddenCategories.value = new Set(categories.value.map((c) => c.id))
}

const showAllGroups = () => {
  hiddenGroups.value = new Set()
}

const hideAllGroups = () => {
  hiddenGroups.value = new Set(categoryGroups.value.map((g) => g.id))
}

// Group-related functions
const getGroupTransactions = (groupId) => {
  const group = categoryGroups.value.find((g) => g.id === groupId)
  if (!group) return []
  return filteredTransactions.value.filter((t) => group.categoryIds.includes(t.categoryId))
}

const getGroupTransactionsCount = (groupId) => {
  return getGroupTransactions(groupId).length
}

const getGroupTotal = (groupId) => {
  const groupTransactions = getGroupTransactions(groupId)
  const total = groupTransactions.reduce((sum, transaction) => {
    const amount = parseFloat(
      getTransactionAmount(transaction)
        .toString()
        .replace(',', '.')
        .replace(/[^\d.-]/g, '')
    )
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  return total.toFixed(2)
}

const ungroupedCategories = computed(() => {
  const groupedCategoryIds = new Set()
  categoryGroups.value.forEach((group) => {
    group.categoryIds.forEach((id) => groupedCategoryIds.add(id))
  })
  return categories.value.filter((cat) => !groupedCategoryIds.has(cat.id))
})

const getContrastColor = (hexColor) => {
  if (!hexColor) return '#000000'
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

const goBack = () => {
  // Navigate back to Categorizer with state
  if (!projectData.value) {
    console.error('[DisplayData] No projectData to pass back')
    router.push({ name: 'home' })
    return
  }

  console.log('[DisplayData] Going back to Categorizer with data:', {
    fileName: fileName.value,
    transactionsCount: transactions.value.length,
    categoriesCount: categories.value.length
  })

  // Store data in sessionStorage for Categorizer to read
  sessionStorage.setItem(
    'categorizerData',
    JSON.stringify({
      projectData: projectData.value,
      fileName: fileName.value
    })
  )

  router.push({ name: 'Categorizer' })
}

// Chart data
const pieChartData = computed(() => {
  // Explicitly depend on filteredTransactions and hidden state for reactivity
  const _ = filteredTransactions.value.length
  const __ = hiddenCategories.value.size
  const ___ = hiddenGroups.value.size
  const ____ = viewMode.value

  const labels = []
  const data = []
  const backgroundColor = []

  if (viewMode.value === 'groups' && categoryGroups.value.length > 0) {
    // Group view mode
    categoryGroups.value.forEach((group) => {
      if (!isGroupVisible(group.id)) return
      const total = Math.abs(parseFloat(getGroupTotal(group.id)))
      if (total > 0) {
        labels.push(group.name)
        data.push(total)
        backgroundColor.push(group.color)
      }
    })

    // Add ungrouped categories
    ungroupedCategories.value.forEach((category) => {
      if (!isCategoryVisible(category.id)) return
      const total = Math.abs(parseFloat(getCategoryTotal(category.id)))
      if (total > 0) {
        labels.push(category.name)
        data.push(total)
        backgroundColor.push(category.color)
      }
    })
  } else {
    // Category view mode
    categories.value.forEach((category) => {
      if (!isCategoryVisible(category.id)) return
      const total = Math.abs(parseFloat(getCategoryTotal(category.id)))
      if (total > 0) {
        labels.push(category.name)
        data.push(total)
        backgroundColor.push(category.color)
      }
    })
  }

  // If no data, show placeholder
  if (data.length === 0) {
    return {
      labels: ['Brak danych'],
      datasets: [
        {
          data: [1],
          backgroundColor: ['#cccccc'],
          borderWidth: 2,
          borderColor: '#1f2937'
        }
      ]
    }
  }

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor,
        borderWidth: 2,
        borderColor: '#1f2937'
      }
    ]
  }
})

const barChartData = computed(() => {
  // Explicitly depend on filteredTransactions and hidden state for reactivity
  const _ = filteredTransactions.value.length
  const __ = hiddenCategories.value.size
  const ___ = hiddenGroups.value.size
  const ____ = viewMode.value

  const labels = []
  const data = []
  const backgroundColor = []

  if (viewMode.value === 'groups' && categoryGroups.value.length > 0) {
    // Group view mode
    categoryGroups.value.forEach((group) => {
      if (!isGroupVisible(group.id)) return
      const total = parseFloat(getGroupTotal(group.id))
      if (Math.abs(total) > 0) {
        labels.push(group.name)
        data.push(total)
        backgroundColor.push(group.color)
      }
    })

    // Add ungrouped categories
    ungroupedCategories.value.forEach((category) => {
      if (!isCategoryVisible(category.id)) return
      const total = parseFloat(getCategoryTotal(category.id))
      if (Math.abs(total) > 0) {
        labels.push(category.name)
        data.push(total)
        backgroundColor.push(category.color)
      }
    })
  } else {
    // Category view mode
    categories.value.forEach((category) => {
      if (!isCategoryVisible(category.id)) return
      const total = parseFloat(getCategoryTotal(category.id))
      if (Math.abs(total) > 0) {
        labels.push(category.name)
        data.push(total)
        backgroundColor.push(category.color)
      }
    })
  }

  // If no data, show placeholder
  if (data.length === 0) {
    return {
      labels: ['Brak danych'],
      datasets: [
        {
          label: 'Kwota (zł)',
          data: [0],
          backgroundColor: ['#cccccc'],
          borderWidth: 2,
          borderColor: '#1f2937'
        }
      ]
    }
  }

  return {
    labels,
    datasets: [
      {
        label: 'Kwota (zł)',
        data,
        backgroundColor,
        borderWidth: 2,
        borderColor: '#1f2937'
      }
    ]
  }
})

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = ((value / total) * 100).toFixed(1)
          return `${label}: ${value.toFixed(2)} zł (${percentage}%)`
        }
      }
    }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.parsed.y.toFixed(2)} zł`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function (value) {
          return value.toFixed(0) + ' zł'
        }
      }
    }
  }
}

const totalSpent = computed(() => {
  // Explicitly depend on filteredTransactions for reactivity
  const _ = filteredTransactions.value.length

  const total = categories.value.reduce((sum, category) => {
    return sum + Math.abs(parseFloat(getCategoryTotal(category.id)))
  }, 0)
  return total.toFixed(2)
})
</script>
