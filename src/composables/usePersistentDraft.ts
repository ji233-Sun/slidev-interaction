import { onMounted, ref, watch } from 'vue'

import { createDraftStorage } from '@/lib/persistence/draftStorage'
import type { SlidevLessonTask } from '@/tasks/slidevHomeTask'

type SaveState = 'loading' | 'saving' | 'saved'

export function usePersistentDraft(task: SlidevLessonTask) {
  const storage = createDraftStorage(task.storageKey)

  const content = ref(task.starterCode)
  const saveState = ref<SaveState>('loading')
  const lastSavedAt = ref<string | null>(null)
  const isHydrated = ref(false)

  let saveTimer: number | null = null

  onMounted(async () => {
    const draft = await storage.get()

    if (draft?.content) {
      content.value = draft.content
      lastSavedAt.value = draft.updatedAt
    }

    isHydrated.value = true
    saveState.value = 'saved'
  })

  watch(content, (value) => {
    if (!isHydrated.value) {
      return
    }

    saveState.value = 'saving'

    if (saveTimer !== null) {
      window.clearTimeout(saveTimer)
    }

    saveTimer = window.setTimeout(async () => {
      const updatedAt = new Date().toISOString()

      await storage.set({
        content: value,
        updatedAt,
      })

      lastSavedAt.value = updatedAt
      saveState.value = 'saved'
    }, 450)
  })

  async function resetToStarter() {
    content.value = task.starterCode

    if (isHydrated.value) {
      await storage.clear()
      lastSavedAt.value = null
    }
  }

  return {
    content,
    isHydrated,
    lastSavedAt,
    resetToStarter,
    saveState,
  }
}
