import { describe, expect, it } from 'vitest'

import type { LessonContext, LessonModule } from './types'

import { resolveEditorValue, resolveFooterHint, resolvePreviewFiles, updateEditorValue } from './runtimeHelpers'

const context: LessonContext = {
  manifest: {
    id: 'lesson-01-home',
    badge: 'Lesson 01',
    title: '制作 Slidev 的第一页（首页）',
    summary: 'summary',
    objective: 'objective',
    instructions: [],
    hints: [],
    checkpoints: [],
    starterFiles: {
      'slides.md': '# Intro',
      'snippets/hero.md': 'Hello',
    },
    entryFile: 'slides.md',
    storageKey: 'lesson-01-home-draft',
  },
  files: {
    'slides.md': '# Intro',
    'snippets/hero.md': 'Hello',
  },
  domSnapshot: null,
}

describe('runtimeHelpers', () => {
  it('reads and updates the configured entry file without touching sibling files', () => {
    expect(resolveEditorValue(context.files, context.manifest.entryFile)).toBe('# Intro')
    expect(updateEditorValue(context.files, context.manifest.entryFile, '# Updated')).toEqual({
      'slides.md': '# Updated',
      'snippets/hero.md': 'Hello',
    })
  })

  it('lets lesson runtime override preview files and footer hints', () => {
    const lesson: LessonModule = {
      manifest: context.manifest,
      validate: () => ({
        items: [],
        completedCount: 0,
        totalCount: 0,
        completionRatio: 0,
      }),
      runtime: {
        getPreviewFiles: () => ({
          'slides.md': '# Preview only',
        }),
        getFooterHint: () => '先完成标题，再检查预览。',
      },
    }

    expect(resolvePreviewFiles(lesson, context)).toEqual({
      'slides.md': '# Preview only',
    })
    expect(resolveFooterHint(lesson, context, 'fallback')).toBe('先完成标题，再检查预览。')
  })
})
