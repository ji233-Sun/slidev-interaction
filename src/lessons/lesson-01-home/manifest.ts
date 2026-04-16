import type { LessonManifest } from '@/app/types'

export interface Lesson01Placeholders {
  deckTitle: string
  pageTitle: string
  subtitle: string
}

export interface Lesson01HomeManifest extends LessonManifest {
  placeholders: Lesson01Placeholders
}

export const lesson01HomeManifest: Lesson01HomeManifest = {
  id: 'lesson-01-home',
  storageKey: 'slidev-home-mvp-draft',
  title: '制作 Slidev 的第一页（首页）',
  badge: 'Lesson 01',
  summary: '完成一个 cover 首页，让观众一眼看出主题、标题和演示目标。',
  objective: '用最小的 Slidev 语法，做出一页能开场、能说明主题的首页。',
  instructions: [
    '在 frontmatter 中保留默认主题，并把 layout 改成 cover。',
    '把演示文稿标题改成你自己的主题，不要保留占位文案。',
    '为第一页写一个 H1 标题，让它成为观众看到的第一行内容。',
    '补上一句副标题，说明这份 Slidev 想解决什么问题。',
  ],
  hints: [
    'Slidev 的 frontmatter 位于文件最顶部，使用 --- 包裹。',
    'cover 布局适合首页，因为它默认就是开场页的视觉语义。',
    '校验会同时检查 markdown AST 和真实预览 DOM，所以只改注释是不会通过的。',
  ],
  checkpoints: [
    {
      id: 'frontmatter-layout',
      label: '使用 cover 布局',
      description: 'frontmatter 中需要显式设置 layout: cover。',
      source: 'ast',
    },
    {
      id: 'frontmatter-title',
      label: '更新演示文稿标题',
      description: 'frontmatter.title 不能继续使用占位文本。',
      source: 'ast',
    },
    {
      id: 'first-slide-heading',
      label: '编写首页主标题',
      description: '第一页需要有一个非占位的一级标题。',
      source: 'ast',
    },
    {
      id: 'first-slide-subtitle',
      label: '补充首页副标题',
      description: '第一页需要至少一段解释主题的正文。',
      source: 'ast',
    },
    {
      id: 'preview-heading',
      label: '预览中出现标题',
      description: 'Slidev 预览页面应渲染出可见标题。',
      source: 'dom',
    },
    {
      id: 'preview-subtitle',
      label: '预览中出现副标题',
      description: 'Slidev 预览页面应渲染出可见副标题。',
      source: 'dom',
    },
  ],
  starterFiles: {
    'slides.md': `---
theme: default
title: 请填写演示文稿标题
layout: cover
class: text-center
transition: fade
---

# 请填写首页标题

请用一句话说明这份 Slidev 想解决什么问题
`,
  },
  entryFile: 'slides.md',
  placeholders: {
    deckTitle: '请填写演示文稿标题',
    pageTitle: '请填写首页标题',
    subtitle: '请用一句话说明这份 Slidev 想解决什么问题',
  },
}
