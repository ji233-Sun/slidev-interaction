import { describe, expect, it } from 'vitest'

import type { PreviewDomSnapshot } from '@/shared/lib/validation/types'

import { lesson02AgendaModule } from './index'
import { validateLesson02Agenda } from './validator'

const validSlides = `---
theme: default
title: 现代前端课程
layout: cover
class: text-center
transition: fade
---

# 用 Slidev 搭建互动式课程

用一页封面说明课程主题与学习目标。

---

## 今天会学什么

- 为什么要把演示拆成多页
- 如何用 --- 新增下一页
- 如何让内容页的结构更清楚
`

const domSnapshot: PreviewDomSnapshot = {
  headings: ['今天会学什么'],
  paragraphs: [],
  currentPage: 2,
  capturedAt: '2026-04-16T00:00:00.000Z',
}

describe('lesson-02-agenda validator', () => {
  it('keeps the starter lesson partially complete until the second slide is finished', () => {
    const report = validateLesson02Agenda({
      manifest: lesson02AgendaModule.manifest,
      files: lesson02AgendaModule.manifest.starterFiles,
      domSnapshot: null,
    })

    expect(report.completedCount).toBe(1)
    expect(report.items.map(item => [item.id, item.passed])).toEqual([
      ['second-slide-divider', true],
      ['second-slide-heading', false],
      ['second-slide-list', false],
      ['preview-page-two', false],
      ['preview-second-slide-heading', false],
    ])
  })

  it('passes all checkpoints for a valid second slide and page-two preview snapshot', () => {
    const report = validateLesson02Agenda({
      manifest: lesson02AgendaModule.manifest,
      files: { 'slides.md': validSlides },
      domSnapshot,
    })

    expect(report.completedCount).toBe(5)
    expect(report.items.every(item => item.passed)).toBe(true)
  })
})
