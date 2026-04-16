import { computed } from 'vue'

import type { LessonModule } from './types'

import { resolveEditorValue, resolveFooterHint, resolvePreviewFiles, updateEditorValue } from './runtimeHelpers'
import { usePersistentDraft } from '@/shared/composables/usePersistentDraft'
import { useSlidevSandbox } from '@/shared/composables/useSlidevSandbox'

const defaultFooterHint = '建议先改标题和副标题，再观察预览与校验区的变化。'

export function useLessonRuntime(lesson: LessonModule) {
  const manifest = lesson.manifest

  const {
    files,
    isHydrated,
    lastSavedAt,
    resetToStarter,
    saveState,
    setFileContent,
  } = usePersistentDraft(manifest)

  const previewFiles = computed(() => resolvePreviewFiles(lesson, {
    manifest,
    files: files.value,
    domSnapshot: null,
  }))

  const {
    canUseWebContainer,
    domSnapshot,
    ensureStarted,
    errorMessage,
    isBusy,
    logs,
    previewFrameKey,
    previewUrl,
    status,
  } = useSlidevSandbox(previewFiles, computed(() => manifest.entryFile))

  const lessonContext = computed(() => ({
    manifest,
    files: files.value,
    domSnapshot: domSnapshot.value,
  }))

  const validationReport = computed(() => lesson.validate(lessonContext.value))
  const pendingCount = computed(() => validationReport.value.totalCount - validationReport.value.completedCount)
  const nextCheckpoint = computed(
    () => validationReport.value.items.find(item => !item.passed)?.label ?? '全部检查已通过',
  )
  const completionPercent = computed(() => `${Math.round(validationReport.value.completionRatio * 100)}%`)

  const editorValue = computed({
    get: () => resolveEditorValue(files.value, manifest.entryFile),
    set: (value: string) => {
      const nextFiles = updateEditorValue(files.value, manifest.entryFile, value)
      setFileContent(manifest.entryFile, nextFiles[manifest.entryFile] ?? '')
    },
  })

  const footerHint = computed(() => resolveFooterHint(lesson, lessonContext.value, defaultFooterHint))

  return {
    canUseWebContainer,
    completionPercent,
    editorValue,
    ensureStarted,
    errorMessage,
    files,
    footerHint,
    isBusy,
    isHydrated,
    lastSavedAt,
    logs,
    manifest,
    nextCheckpoint,
    pendingCount,
    previewFrameKey,
    previewUrl,
    resetToStarter,
    saveState,
    status,
    validationReport,
  }
}
