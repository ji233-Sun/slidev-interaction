import { describe, expect, it } from 'vitest'

import type { PreviewDomSnapshot } from '@/shared/lib/validation/types'

import { lesson01HomeModule } from './index'
import { validateLesson01Home } from './validator'

const validSlides = `---
theme: default
title: 现代前端课程
layout: cover
class: text-center
transition: fade
---

# 用 Slidev 搭建互动式课程

用一页封面说明课程主题与学习目标。
`

const domSnapshot: PreviewDomSnapshot = {
  headings: ['用 Slidev 搭建互动式课程'],
  paragraphs: ['用一页封面说明课程主题与学习目标。'],
  currentPage: 1,
  capturedAt: '2026-04-16T00:00:00.000Z',
}

describe('lesson-01-home validator', () => {
  it('keeps the starter lesson partially complete until placeholders are replaced', () => {
    const report = validateLesson01Home({
      manifest: lesson01HomeModule.manifest,
      files: lesson01HomeModule.manifest.starterFiles,
      domSnapshot: null,
    })

    expect(report.completedCount).toBe(1)
    expect(report.items.map(item => [item.id, item.passed])).toEqual([
      ['frontmatter-layout', true],
      ['frontmatter-title', false],
      ['first-slide-heading', false],
      ['first-slide-subtitle', false],
      ['preview-heading', false],
      ['preview-subtitle', false],
    ])
  })

  it('passes all checkpoints for a valid cover slide and matching preview snapshot', () => {
    const report = validateLesson01Home({
      manifest: lesson01HomeModule.manifest,
      files: { 'slides.md': validSlides },
      domSnapshot,
    })

    expect(report.completedCount).toBe(6)
    expect(report.items.every(item => item.passed)).toBe(true)
  })
})
