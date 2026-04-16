import type { LessonManifest } from '@/app/types'

export interface Lesson02Placeholders {
  pageTitle: string
  bulletItems: string[]
}

export interface Lesson02AgendaManifest extends LessonManifest {
  placeholders: Lesson02Placeholders
}

export const lesson02AgendaManifest: Lesson02AgendaManifest = {
  id: 'lesson-02-agenda',
  storageKey: 'slidev-second-slide-mvp-draft',
  title: '制作 Slidev 的第二页（议程页）',
  badge: 'Lesson 02',
  summary: '在封面之后补一页议程，让观众马上知道接下来会讲什么。',
  objective: '学会用 --- 新增页面，并用标题加列表搭出一页清晰的内容页。',
  instructions: [
    '保留已经完成的首页，不要删除 frontmatter 和封面内容。',
    '在首页内容后使用 --- 新增第二页，而不是改动顶部 frontmatter 的分隔线。',
    '为第二页写一个二级标题，告诉观众这一页要讲什么。',
    '用至少 3 条列表要点，概括这次演示的核心内容。',
  ],
  hints: [
    '正文里的 --- 会把内容切成新的一页，这和文件顶部的 frontmatter 分隔线不是一回事。',
    '第二页可以直接使用 ## 标题和 - 列表，不需要额外组件。',
    'DOM 校验只会读取当前预览页，所以要记得切到第 2 页再看结果。',
  ],
  checkpoints: [
    {
      id: 'second-slide-divider',
      label: '新增第二页分隔符',
      description: '首页内容后需要有 --- 作为新一页的分隔。',
      source: 'ast',
    },
    {
      id: 'second-slide-heading',
      label: '编写第二页标题',
      description: '第二页需要有一个非占位的二级标题。',
      source: 'ast',
    },
    {
      id: 'second-slide-list',
      label: '补充第二页要点',
      description: '第二页需要至少 3 条有意义的列表要点。',
      source: 'ast',
    },
    {
      id: 'preview-page-two',
      label: '预览切换到第 2 页',
      description: '预览区需要切换到第二页，才能继续 DOM 校验。',
      source: 'dom',
    },
    {
      id: 'preview-second-slide-heading',
      label: '预览中出现第二页标题',
      description: 'Slidev 预览第 2 页应渲染出可见标题。',
      source: 'dom',
    },
  ],
  starterFiles: {
    'slides.md': `---
theme: default
title: 现代前端课程
layout: cover
class: text-center
transition: fade
---

# 用 Slidev 搭建互动式课程

用一页封面说明课程主题与学习目标。

---

## 请填写第二页标题

- 请填写第一个要点
- 请填写第二个要点
- 请填写第三个要点
`,
  },
  entryFile: 'slides.md',
  placeholders: {
    pageTitle: '请填写第二页标题',
    bulletItems: [
      '请填写第一个要点',
      '请填写第二个要点',
      '请填写第三个要点',
    ],
  },
}
