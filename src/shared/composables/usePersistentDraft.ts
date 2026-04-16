import { onMounted, ref, watch } from 'vue'

import type { LessonManifest } from '@/app/types'
import { createDraftStorage, type DraftRecord, type LegacyDraftRecord } from '@/lib/persistence/draftStorage'

type SaveState = 'loading' | 'saving' | 'saved'

function cloneFiles(files: Record<string, string>) {
  return Object.fromEntries(Object.entries(files))
}

function resolveDraftFiles(
  manifest: LessonManifest,
  draft: DraftRecord | LegacyDraftRecord | null,
) {
  if (!draft) {
    return cloneFiles(manifest.starterFiles)
  }

  if ('files' in draft) {
    return {
      ...cloneFiles(manifest.starterFiles),
      ...draft.files,
    }
  }

  return {
    ...cloneFiles(manifest.starterFiles),
    [manifest.entryFile]: draft.content,
  }
}

export function usePersistentDraft(manifest: LessonManifest) {
  const storage = createDraftStorage(manifest.storageKey)
  const files = ref<Record<string, string>>(cloneFiles(manifest.starterFiles))
  const saveState = ref<SaveState>('loading')
  const lastSavedAt = ref<string | null>(null)
  const isHydrated = ref(false)

  let saveTimer: number | null = null
  let skipNextPersist = false

  function setFileContent(path: string, value: string) {
    files.value = {
      ...files.value,
      [path]: value,
    }
  }

  onMounted(async () => {
    const draft = await storage.get()
    skipNextPersist = true
    files.value = resolveDraftFiles(manifest, draft)

    if (draft) {
      lastSavedAt.value = draft.updatedAt
    }

    isHydrated.value = true
    saveState.value = 'saved'
  })

  watch(files, (value) => {
    if (!isHydrated.value) {
      return
    }

    if (skipNextPersist) {
      skipNextPersist = false
      return
    }

    saveState.value = 'saving'

    if (saveTimer !== null) {
      window.clearTimeout(saveTimer)
    }

    saveTimer = window.setTimeout(async () => {
      const updatedAt = new Date().toISOString()

      await storage.set({
        files: cloneFiles(value),
        updatedAt,
      })

      lastSavedAt.value = updatedAt
      saveState.value = 'saved'
    }, 450)
  }, { deep: true })

  async function resetToStarter() {
    files.value = cloneFiles(manifest.starterFiles)

    if (isHydrated.value) {
      await storage.clear()
      lastSavedAt.value = null
    }
  }

  return {
    files,
    isHydrated,
    lastSavedAt,
    resetToStarter,
    saveState,
    setFileContent,
  }
}
