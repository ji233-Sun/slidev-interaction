import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LessonManifest } from '@/app/types'

import { usePersistentDraft } from './usePersistentDraft'

const manifest: LessonManifest = {
  id: 'lesson-01-home',
  badge: 'Lesson 01',
  title: '制作 Slidev 的第一页（首页）',
  summary: 'summary',
  objective: 'objective',
  instructions: [],
  hints: [],
  checkpoints: [],
  starterFiles: {
    'slides.md': '# Starter',
  },
  entryFile: 'slides.md',
  storageKey: 'lesson-01-home-draft',
}

const Harness = defineComponent({
  setup() {
    return usePersistentDraft(manifest)
  },
  template: '<div />',
})

describe('usePersistentDraft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })

  it('hydrates a legacy single-file draft into the entry file workspace', async () => {
    window.localStorage.setItem('slidev-interaction:lesson-01-home-draft', JSON.stringify({
      content: '# Legacy draft',
      updatedAt: '2026-04-16T08:00:00.000Z',
    }))

    const wrapper = mount(Harness)
    await flushPromises()

    expect(wrapper.vm.files).toEqual({
      'slides.md': '# Legacy draft',
    })
    expect(wrapper.vm.saveState).toBe('saved')
  })

  it('persists edited files and resets to the starter workspace', async () => {
    const wrapper = mount(Harness)
    await flushPromises()

    wrapper.vm.setFileContent('slides.md', '# Edited deck')
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTimeAsync(450)

    expect(JSON.parse(window.localStorage.getItem('slidev-interaction:lesson-01-home-draft') ?? '{}')).toMatchObject({
      files: {
        'slides.md': '# Edited deck',
      },
    })

    await wrapper.vm.resetToStarter()

    expect(wrapper.vm.files).toEqual({
      'slides.md': '# Starter',
    })
    expect(window.localStorage.getItem('slidev-interaction:lesson-01-home-draft')).toBeNull()
  })
})
