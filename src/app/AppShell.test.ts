import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

import AppShell from './AppShell.vue'

vi.mock('./useLessonRuntime', () => ({
  useLessonRuntime: (lesson: { manifest: { title: string, entryFile: string } }) => ({
    canUseWebContainer: true,
    completionPercent: computed(() => '20%'),
    editorValue: computed({
      get: () => '# Draft',
      set: () => {},
    }),
    ensureStarted: vi.fn(),
    errorMessage: ref(null),
    footerHint: computed(() => 'hint'),
    isBusy: ref(false),
    isHydrated: ref(true),
    lastSavedAt: ref(null),
    logs: ref([]),
    manifest: lesson.manifest,
    nextCheckpoint: computed(() => 'next checkpoint'),
    pendingCount: computed(() => 4),
    previewFrameKey: ref(0),
    previewUrl: ref(null),
    resetToStarter: vi.fn(),
    saveState: ref<'loading' | 'saving' | 'saved'>('saved'),
    status: ref<'idle' | 'booting' | 'installing' | 'running' | 'error'>('idle'),
    validationReport: computed(() => ({
      items: [],
      completedCount: 1,
      totalCount: 5,
      completionRatio: 0.2,
    })),
  }),
}))

vi.mock('@/components/MonacoMarkdownEditor.vue', () => ({
  default: defineComponent({
    props: {
      modelValue: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue'],
    template: '<div class="monaco-stub">{{ modelValue }}</div>',
  }),
}))

vi.mock('@/components/SandboxPreview.vue', () => ({
  default: defineComponent({
    template: '<div class="preview-stub">preview</div>',
  }),
}))

vi.mock('@/components/ValidationChecklist.vue', () => ({
  default: defineComponent({
    template: '<div class="validation-stub">validation</div>',
  }),
}))

describe('AppShell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the lesson track and links to the next lesson', () => {
    const wrapper = mount(AppShell)

    expect(wrapper.text()).toContain('制作 Slidev 的第一页（首页）')
    expect(wrapper.get('[data-lesson-id="lesson-02-agenda"]').attributes('href')).toBe('/?lesson=lesson-02-agenda')
    expect(wrapper.get('[data-nav="next"]').attributes('href')).toBe('/?lesson=lesson-02-agenda')
  })

  it('loads the requested lesson from the URL query', () => {
    window.history.pushState({}, '', '/?lesson=lesson-02-agenda')

    const wrapper = mount(AppShell)

    expect(wrapper.text()).toContain('制作 Slidev 的第二页（议程页）')
    expect(wrapper.get('[data-nav="previous"]').attributes('href')).toBe('/?lesson=lesson-01-home')
  })
})
