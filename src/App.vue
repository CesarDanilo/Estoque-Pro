<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppLayout from '@/components/AppLayout.vue'
import FeedbackAlert from '@/components/ui-kit/FeedbackAlert.vue'

const route = useRoute()

const usaLayoutPadrao = computed(() => !route.meta.public)
</script>

<template>
  <AppLayout v-if="usaLayoutPadrao" />
  <RouterView v-else />
  <FeedbackAlert />
</template>
