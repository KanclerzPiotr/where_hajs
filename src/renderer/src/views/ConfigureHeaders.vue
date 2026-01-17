<template>
  <div class="min-h-screen bg-base-200 p-8">
    <div class="container mx-auto max-w-4xl">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h1 class="card-title text-3xl mb-4">Configure CSV Headers</h1>
          <p class="text-base-content/70 mb-6">
            File: <span class="font-semibold">{{ filename }}</span>
          </p>

          <div class="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              class="stroke-current shrink-0 w-6 h-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>This is where you'll configure headers and convert CSV to JSON</span>
          </div>

          <div class="card-actions justify-end mt-6">
            <button class="btn btn-ghost" @click="goBack">Cancel</button>
            <button class="btn btn-primary" @click="convertToJSON">Convert to JSON</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const filename = ref(route.query.filename || 'Unknown')

const goBack = () => {
  router.push('/')
}

const convertToJSON = () => {
  // TODO: Implement CSV to JSON conversion
  alert('CSV to JSON conversion coming soon!')
  router.push({ name: 'transactions' })
}
</script>
