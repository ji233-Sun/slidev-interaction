import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { lesson01HomeModule } from '@/lessons/lesson-01-home'

import { useLessonRuntime } from './useLessonRuntime'

vi.mock('@/shared/composables/usePersistentDraft', () => {
  const files = ref({
    'slides.md': lesson01HomeModule.manifest.starterFiles['slides.md'] ?? '',
  })

  return {
    usePersistentDraft: () => ({
      files,
      isHydrated: ref(true),
      lastSavedAt: ref(null),
      resetToStarter: vi.fn(),
      saveState: ref<'loading' | 'saving' | 'saved'>('saved'),
      setFileContent: (path: string, value: string) => {
        files.value = {
          ...files.value,
          [path]: value,
        }
      },
    }),
  }
})

vi.mock('@/shared/composables/useSlidevSandbox', () => ({
  useSlidevSandbox: () => ({
    canUseWebContainer: true,
    domSnapshot: ref(null),
    ensureStarted: vi.fn(),
    errorMessage: ref(null),
    isBusy: ref(false),
    logs: ref([]),
    previewFrameKey: ref(0),
    previewUrl: ref(null),
    status: ref<'idle' | 'booting' | 'installing' | 'running' | 'error'>('idle'),
  }),
}))

describe('lesson runtime wiring', () => {
  it('exposes the default lesson state through a single runtime composable', async () => {
    const Harness = defineComponent({
      setup() {
        return useLessonRuntime(lesson01HomeModule)
      },
      template: '<div />',
    })

    const wrapper = mount(Harness)
    await flushPromises()

    expect(wrapper.vm.manifest.title).toBe('制作 Slidev 的第一页（首页）')
    expect(wrapper.vm.editorValue).toContain('# 请填写首页标题')
    expect(wrapper.vm.nextCheckpoint).toBe('更新演示文稿标题')
    expect(wrapper.vm.footerHint).toBe('建议先改标题和副标题，再观察预览与校验区的变化。')
  })
})
