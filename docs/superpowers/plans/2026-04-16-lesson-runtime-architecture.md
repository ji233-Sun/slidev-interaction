# Lesson Runtime Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the app from a single hard-coded lesson into a reusable lesson runtime that supports multiple lessons, keeps `slides.md + live preview + validation` as the default flow, and leaves a narrow hook surface for exceptional lessons.

**Architecture:** Introduce a lesson module contract plus a registry, move Lesson 01 into `src/lessons/lesson-01-home/`, generalize persistence and sandbox input from a single markdown string to a `files` workspace, then replace the direct `App.vue` wiring with `AppShell + useLessonRuntime`. Keep temporary compatibility wrappers where needed so the refactor can land incrementally without breaking the existing app in the middle.

**Tech Stack:** Vue 3, Vite, TypeScript, WebContainer, Monaco Editor, Vitest, Vue Test Utils, jsdom

---

**Repository constraint:** This repo’s local instructions forbid planning `git commit` / branch steps unless the user explicitly asks. This plan intentionally omits commit steps.

### Task 1: Add a Minimal Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Update the package scripts and test dependencies**

Replace the `scripts` and `devDependencies` sections in [package.json](/Users/ji233/Documents/0MyProjects/slidev-interaction/package.json) with the following content:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@tsconfig/node24": "^24.0.4",
    "@types/node": "^24.12.0",
    "@vitejs/plugin-vue": "^6.0.5",
    "@vue/test-utils": "^2.4.6",
    "@vue/tsconfig": "^0.9.1",
    "jsdom": "^26.1.0",
    "npm-run-all2": "^8.0.4",
    "typescript": "~6.0.0",
    "vite": "^8.0.3",
    "vite-plugin-vue-devtools": "^8.1.1",
    "vitest": "^3.2.4",
    "vue-tsc": "^3.2.6"
  }
}
```

- [ ] **Step 2: Add Vitest configuration**

Create [vitest.config.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/vitest.config.ts):

```ts
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 3: Add shared test cleanup**

Create [src/test/setup.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/test/setup.ts):

```ts
import { afterEach, vi } from 'vitest'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
```

- [ ] **Step 4: Install the new dev dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` updates and the command exits with status `0`.

- [ ] **Step 5: Verify the test harness boots**

Run:

```bash
pnpm test
```

Expected: exit `0` with a Vitest message indicating no test files were found yet.

### Task 2: Introduce the Lesson Contract and Migrate Lesson 01

**Files:**
- Create: `src/shared/lib/validation/types.ts`
- Create: `src/app/types.ts`
- Create: `src/app/lessonRegistry.ts`
- Create: `src/app/lessonRegistry.test.ts`
- Create: `src/lessons/lesson-01-home/manifest.ts`
- Create: `src/lessons/lesson-01-home/validator.ts`
- Create: `src/lessons/lesson-01-home/index.ts`
- Create: `src/lessons/lesson-01-home/validator.test.ts`
- Modify: `src/components/ValidationChecklist.vue`
- Modify: `src/tasks/slidevHomeTask.ts`
- Modify: `src/lib/validation/slidevHomeValidator.ts`

- [ ] **Step 1: Write the failing registry and lesson validator tests**

Create [src/app/lessonRegistry.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/lessonRegistry.test.ts):

```ts
import { describe, expect, it } from 'vitest'

import { defaultLessonId, getLessonById, lessons } from './lessonRegistry'

describe('lessonRegistry', () => {
  it('registers the default lesson module and resolves it by id', () => {
    expect(defaultLessonId).toBe('lesson-01-home')
    expect(lessons.map(item => item.manifest.id)).toEqual(['lesson-01-home'])
    expect(getLessonById('lesson-01-home')?.manifest.entryFile).toBe('slides.md')
  })

  it('returns undefined for unknown ids', () => {
    expect(getLessonById('missing-lesson')).toBeUndefined()
  })
})
```

Create [src/lessons/lesson-01-home/validator.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lessons/lesson-01-home/validator.test.ts):

```ts
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
```

- [ ] **Step 2: Run the tests and verify they fail for the expected reason**

Run:

```bash
pnpm test -- src/app/lessonRegistry.test.ts src/lessons/lesson-01-home/validator.test.ts
```

Expected: FAIL with module resolution errors for `./lessonRegistry`, `./index`, or `./validator` because the lesson runtime files do not exist yet.

- [ ] **Step 3: Implement the shared validation types and lesson module contract**

Create [src/shared/lib/validation/types.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/lib/validation/types.ts):

```ts
export interface PreviewDomSnapshot {
  headings: string[]
  paragraphs: string[]
  currentPage: number | null
  capturedAt: string
}

export interface ValidationItem {
  id: string
  label: string
  description: string
  source: 'ast' | 'dom'
  passed: boolean
  detail: string
}

export interface ValidationReport {
  items: ValidationItem[]
  completedCount: number
  totalCount: number
  completionRatio: number
}
```

Create [src/app/types.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/types.ts):

```ts
import type { Component } from 'vue'

import type { PreviewDomSnapshot, ValidationReport } from '@/shared/lib/validation/types'

export interface LessonCheckpoint {
  id: string
  label: string
  description: string
  source: 'ast' | 'dom'
}

export interface LessonManifest {
  id: string
  badge: string
  title: string
  summary: string
  objective: string
  instructions: string[]
  hints: string[]
  checkpoints: LessonCheckpoint[]
  starterFiles: Record<string, string>
  entryFile: string
  storageKey: string
}

export interface LessonContext {
  manifest: LessonManifest
  files: Record<string, string>
  domSnapshot: PreviewDomSnapshot | null
}

export interface EditorModel {
  path: string
  language: string
}

export interface LessonPanelDefinition {
  id: string
  title: string
  component: Component
}

export interface LessonRuntimeHooks {
  getEditorModel?(context: LessonContext): EditorModel
  getPreviewFiles?(context: LessonContext): Record<string, string>
  getSidebarPanels?(): LessonPanelDefinition[]
  getFooterHint?(context: LessonContext): string | null
}

export interface LessonModule {
  manifest: LessonManifest
  validate(context: LessonContext): ValidationReport
  runtime?: LessonRuntimeHooks
}
```

- [ ] **Step 4: Implement Lesson 01 as a real lesson module**

Create [src/lessons/lesson-01-home/manifest.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lessons/lesson-01-home/manifest.ts):

```ts
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
```

Create [src/lessons/lesson-01-home/validator.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lessons/lesson-01-home/validator.ts):

```ts
import { toString } from 'mdast-util-to-string'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parse as parseYaml } from 'yaml'

import type { LessonContext } from '@/app/types'
import type { ValidationItem, ValidationReport } from '@/shared/lib/validation/types'

import type { Lesson01HomeManifest } from './manifest'

type MarkdownNode = {
  type: string
  depth?: number
  value?: string
  children?: MarkdownNode[]
}

const parser = unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function countMeaningfulCharacters(value: string) {
  const normalized = normalizeText(value)
  const stripped = normalized.replace(/[\p{P}\p{S}\s]/gu, '')

  return Array.from(stripped).length
}

function isMeaningfulText(value: string, placeholder: string, minimumLength = 2) {
  const normalized = normalizeText(value)

  return normalized !== normalizeText(placeholder) && countMeaningfulCharacters(normalized) >= minimumLength
}

function getScalarText(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeText(String(value))
  }

  return ''
}

function extractText(node: MarkdownNode) {
  return normalizeText(toString(node as never))
}

function createPendingDomDetail() {
  return '等待 Slidev 预览启动后返回真实 DOM 检查结果。'
}

function createValidationItem(
  checkpointMap: Map<string, Lesson01HomeManifest['checkpoints'][number]>,
  id: string,
  passed: boolean,
  detail: string,
): ValidationItem {
  const checkpoint = checkpointMap.get(id)

  if (!checkpoint) {
    throw new Error(`Missing validation checkpoint: ${id}`)
  }

  return {
    id,
    label: checkpoint.label,
    description: checkpoint.description,
    source: checkpoint.source,
    passed,
    detail,
  }
}

export function validateLesson01Home(
  context: Omit<LessonContext, 'manifest'> & { manifest: Lesson01HomeManifest },
): ValidationReport {
  const markdown = context.files[context.manifest.entryFile] ?? ''
  const tree = parser.parse(markdown) as { children: MarkdownNode[] }
  const checkpointMap = new Map(context.manifest.checkpoints.map(checkpoint => [checkpoint.id, checkpoint]))

  let frontmatterText = ''
  const firstSlideNodes: MarkdownNode[] = []

  for (const node of tree.children) {
    if (node.type === 'yaml' && !frontmatterText) {
      frontmatterText = node.value ?? ''
      continue
    }

    if (node.type === 'thematicBreak') {
      break
    }

    firstSlideNodes.push(node)
  }

  let frontmatter: Record<string, unknown> = {}

  if (frontmatterText.trim().length > 0) {
    try {
      frontmatter = (parseYaml(frontmatterText) as Record<string, unknown> | null) ?? {}
    }
    catch {
      frontmatter = {}
    }
  }

  const titleValue = getScalarText(frontmatter.title)
  const layoutValue = typeof frontmatter.layout === 'string' ? normalizeText(frontmatter.layout) : ''
  const firstHeadingNode = firstSlideNodes.find(node => node.type === 'heading' && node.depth === 1)
  const paragraphTexts = firstSlideNodes
    .filter(node => node.type === 'paragraph')
    .map(extractText)
    .filter(Boolean)

  const firstHeadingText = firstHeadingNode ? extractText(firstHeadingNode) : ''
  const subtitleText = paragraphTexts.find(text => isMeaningfulText(text, context.manifest.placeholders.subtitle, 6)) ?? ''
  const domHeadings = context.domSnapshot?.headings ?? []
  const domParagraphs = context.domSnapshot?.paragraphs ?? []

  const items: ValidationItem[] = [
    createValidationItem(
      checkpointMap,
      'frontmatter-layout',
      layoutValue === 'cover',
      layoutValue === 'cover'
        ? '已检测到 layout: cover。'
        : '请在 frontmatter 中加入 layout: cover。',
    ),
    createValidationItem(
      checkpointMap,
      'frontmatter-title',
      isMeaningfulText(titleValue, context.manifest.placeholders.deckTitle, 2),
      isMeaningfulText(titleValue, context.manifest.placeholders.deckTitle, 2)
        ? `演示标题已更新为「${titleValue}」。`
        : '请把 frontmatter.title 改成你自己的演示标题。',
    ),
    createValidationItem(
      checkpointMap,
      'first-slide-heading',
      isMeaningfulText(firstHeadingText, context.manifest.placeholders.pageTitle, 2),
      isMeaningfulText(firstHeadingText, context.manifest.placeholders.pageTitle, 2)
        ? `首页标题已更新为「${firstHeadingText}」。`
        : '请在第一页写一个一级标题，并替换掉占位文案。',
    ),
    createValidationItem(
      checkpointMap,
      'first-slide-subtitle',
      Boolean(subtitleText),
      subtitleText
        ? `已找到副标题内容：「${subtitleText}」。`
        : '请在首页标题下补一段说明主题的副标题。',
    ),
    createValidationItem(
      checkpointMap,
      'preview-heading',
      context.domSnapshot
        ? domHeadings.some(text => isMeaningfulText(text, context.manifest.placeholders.pageTitle, 2))
        : false,
      context.domSnapshot
        ? domHeadings.some(text => isMeaningfulText(text, context.manifest.placeholders.pageTitle, 2))
            ? '预览里已经渲染出首页标题。'
            : '预览已启动，但还没有检测到有效标题。'
        : createPendingDomDetail(),
    ),
    createValidationItem(
      checkpointMap,
      'preview-subtitle',
      context.domSnapshot
        ? domParagraphs.some(text => isMeaningfulText(text, context.manifest.placeholders.subtitle, 6))
        : false,
      context.domSnapshot
        ? domParagraphs.some(text => isMeaningfulText(text, context.manifest.placeholders.subtitle, 6))
            ? '预览里已经渲染出副标题段落。'
            : '预览已启动，但还没有检测到有效副标题。'
        : createPendingDomDetail(),
    ),
  ]

  const completedCount = items.filter(item => item.passed).length

  return {
    items,
    completedCount,
    totalCount: items.length,
    completionRatio: items.length === 0 ? 0 : completedCount / items.length,
  }
}
```

Create [src/lessons/lesson-01-home/index.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lessons/lesson-01-home/index.ts):

```ts
import type { LessonModule } from '@/app/types'

import { lesson01HomeManifest } from './manifest'
import { validateLesson01Home } from './validator'

export const lesson01HomeModule: LessonModule = {
  manifest: lesson01HomeManifest,
  validate: validateLesson01Home,
}
```

Create [src/app/lessonRegistry.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/lessonRegistry.ts):

```ts
import type { LessonModule } from './types'

import { lesson01HomeModule } from '@/lessons/lesson-01-home'

export const lessons: LessonModule[] = [lesson01HomeModule]

export const defaultLessonId = lessons[0]?.manifest.id ?? ''

export function getLessonById(id: string) {
  return lessons.find(lesson => lesson.manifest.id === id)
}
```

- [ ] **Step 5: Add compatibility wrappers so the current app still builds mid-refactor**

Replace the script block in [src/components/ValidationChecklist.vue](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/components/ValidationChecklist.vue) with:

```vue
<script setup lang="ts">
import type { ValidationReport } from '@/shared/lib/validation/types'

defineProps<{
  report: ValidationReport
}>()
</script>
```

Replace [src/tasks/slidevHomeTask.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/tasks/slidevHomeTask.ts) with:

```ts
import { lesson01HomeManifest } from '@/lessons/lesson-01-home/manifest'

export type SlidevLessonTask = typeof lesson01HomeManifest & {
  starterCode: string
}

export const slidevHomeTask: SlidevLessonTask = {
  ...lesson01HomeManifest,
  starterCode: lesson01HomeManifest.starterFiles[lesson01HomeManifest.entryFile] ?? '',
}
```

Replace [src/lib/validation/slidevHomeValidator.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lib/validation/slidevHomeValidator.ts) with:

```ts
import type { ValidationReport } from '@/shared/lib/validation/types'
import type { PreviewDomSnapshot } from '@/shared/lib/validation/types'

import { lesson01HomeManifest } from '@/lessons/lesson-01-home/manifest'
import { validateLesson01Home } from '@/lessons/lesson-01-home/validator'
import type { SlidevLessonTask } from '@/tasks/slidevHomeTask'

export type { PreviewDomSnapshot, ValidationItem, ValidationReport } from '@/shared/lib/validation/types'

export function validateSlidevHome(
  markdown: string,
  task: SlidevLessonTask,
  domSnapshot: PreviewDomSnapshot | null,
): ValidationReport {
  return validateLesson01Home({
    manifest: {
      ...lesson01HomeManifest,
      ...task,
      starterFiles: {
        [lesson01HomeManifest.entryFile]: markdown,
      },
    },
    files: {
      [lesson01HomeManifest.entryFile]: markdown,
    },
    domSnapshot,
  })
}
```

- [ ] **Step 6: Run the tests again and verify they pass**

Run:

```bash
pnpm test -- src/app/lessonRegistry.test.ts src/lessons/lesson-01-home/validator.test.ts
```

Expected: PASS with `4 passed`.

### Task 3: Generalize Draft Persistence from `content` to `files`

**Files:**
- Create: `src/shared/composables/usePersistentDraft.ts`
- Create: `src/shared/composables/usePersistentDraft.test.ts`
- Modify: `src/lib/persistence/draftStorage.ts`
- Modify: `src/composables/usePersistentDraft.ts`

- [ ] **Step 1: Write the failing workspace draft tests**

Create [src/shared/composables/usePersistentDraft.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/composables/usePersistentDraft.test.ts):

```ts
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
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm test -- src/shared/composables/usePersistentDraft.test.ts
```

Expected: FAIL because `@/shared/composables/usePersistentDraft` does not exist yet.

- [ ] **Step 3: Implement workspace-aware draft storage**

Replace [src/lib/persistence/draftStorage.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lib/persistence/draftStorage.ts) with:

```ts
export interface DraftRecord {
  files: Record<string, string>
  updatedAt: string
}

export interface LegacyDraftRecord {
  content: string
  updatedAt: string
}

const DATABASE_NAME = 'slidev-interaction'
const STORE_NAME = 'editor-drafts'

let databasePromise: Promise<IDBDatabase> | null = null

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise
  }

  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return databasePromise
}

export function createDraftStorage(storageKey: string) {
  const localStorageKey = `${DATABASE_NAME}:${storageKey}`

  async function getFromIndexedDb() {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const record = await promisifyRequest(store.get(storageKey))

    return (record as DraftRecord | LegacyDraftRecord | undefined) ?? null
  }

  async function setToIndexedDb(record: DraftRecord) {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await promisifyRequest(store.put(record, storageKey))
  }

  async function clearFromIndexedDb() {
    const database = await openDatabase()
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await promisifyRequest(store.delete(storageKey))
  }

  return {
    async get(): Promise<DraftRecord | LegacyDraftRecord | null> {
      try {
        return await getFromIndexedDb()
      }
      catch {
        const raw = window.localStorage.getItem(localStorageKey)

        if (!raw) {
          return null
        }

        return JSON.parse(raw) as DraftRecord | LegacyDraftRecord
      }
    },
    async set(record: DraftRecord) {
      try {
        await setToIndexedDb(record)
      }
      catch {
        window.localStorage.setItem(localStorageKey, JSON.stringify(record))
      }
    },
    async clear() {
      try {
        await clearFromIndexedDb()
      }
      catch {
        window.localStorage.removeItem(localStorageKey)
      }
    },
  }
}
```

Create [src/shared/composables/usePersistentDraft.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/composables/usePersistentDraft.ts):

```ts
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

  function setFileContent(path: string, value: string) {
    files.value = {
      ...files.value,
      [path]: value,
    }
  }

  onMounted(async () => {
    const draft = await storage.get()
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
```

Replace [src/composables/usePersistentDraft.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/composables/usePersistentDraft.ts) with a compatibility adapter:

```ts
import type { SlidevLessonTask } from '@/tasks/slidevHomeTask'

import { usePersistentDraft as useSharedPersistentDraft } from '@/shared/composables/usePersistentDraft'

export function usePersistentDraft(task: SlidevLessonTask) {
  return useSharedPersistentDraft({
    ...task,
    starterFiles: {
      slides.md: task.starterCode,
    },
    entryFile: 'slides.md',
  })
}
```

- [ ] **Step 4: Run the draft persistence test and verify it passes**

Run:

```bash
pnpm test -- src/shared/composables/usePersistentDraft.test.ts
```

Expected: PASS with `2 passed`.

### Task 4: Extract Runtime Helpers and Generalize Sandbox Input

**Files:**
- Create: `src/app/runtimeHelpers.ts`
- Create: `src/app/runtimeHelpers.test.ts`
- Create: `src/shared/lib/sandbox/buildFileSystemTree.ts`
- Create: `src/shared/lib/sandbox/buildFileSystemTree.test.ts`
- Create: `src/shared/composables/useSlidevSandbox.ts`
- Modify: `src/composables/useSlidevSandbox.ts`

- [ ] **Step 1: Write the failing helper tests**

Create [src/app/runtimeHelpers.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/runtimeHelpers.test.ts):

```ts
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
```

Create [src/shared/lib/sandbox/buildFileSystemTree.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/lib/sandbox/buildFileSystemTree.test.ts):

```ts
import { describe, expect, it } from 'vitest'

import { buildFileSystemTree } from './buildFileSystemTree'

describe('buildFileSystemTree', () => {
  it('converts nested file paths into a WebContainer tree', () => {
    const tree = buildFileSystemTree({
      'slides.md': '# Intro',
      'snippets/hero.md': 'Hello',
      'global-bottom.vue': '<template />',
    })

    expect(tree['slides.md']).toEqual({
      file: {
        contents: '# Intro',
      },
    })
    expect(tree.snippets).toEqual({
      directory: {
        'hero.md': {
          file: {
            contents: 'Hello',
          },
        },
      },
    })
    expect(tree['global-bottom.vue']).toEqual({
      file: {
        contents: '<template />',
      },
    })
  })
})
```

- [ ] **Step 2: Run the helper tests and verify they fail**

Run:

```bash
pnpm test -- src/app/runtimeHelpers.test.ts src/shared/lib/sandbox/buildFileSystemTree.test.ts
```

Expected: FAIL because `runtimeHelpers.ts` and `buildFileSystemTree.ts` do not exist yet.

- [ ] **Step 3: Implement the runtime helpers**

Create [src/app/runtimeHelpers.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/runtimeHelpers.ts):

```ts
import type { LessonContext, LessonModule } from './types'

export function resolveEditorValue(files: Record<string, string>, entryFile: string) {
  return files[entryFile] ?? ''
}

export function updateEditorValue(
  files: Record<string, string>,
  entryFile: string,
  value: string,
) {
  return {
    ...files,
    [entryFile]: value,
  }
}

export function resolvePreviewFiles(lesson: LessonModule, context: LessonContext) {
  return lesson.runtime?.getPreviewFiles?.(context) ?? context.files
}

export function resolveFooterHint(
  lesson: LessonModule,
  context: LessonContext,
  fallback: string,
) {
  return lesson.runtime?.getFooterHint?.(context) ?? fallback
}
```

Create [src/shared/lib/sandbox/buildFileSystemTree.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/lib/sandbox/buildFileSystemTree.ts):

```ts
import type { FileSystemTree } from '@webcontainer/api'

type MutableDirectory = Record<string, FileSystemTree[string]>

export function buildFileSystemTree(files: Record<string, string>): FileSystemTree {
  const root: MutableDirectory = {}

  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/').filter(Boolean)
    const fileName = segments.pop()

    if (!fileName) {
      continue
    }

    let cursor = root

    for (const segment of segments) {
      const next = cursor[segment]

      if (!next || !('directory' in next)) {
        cursor[segment] = {
          directory: {},
        }
      }

      cursor = (cursor[segment] as { directory: MutableDirectory }).directory
    }

    cursor[fileName] = {
      file: {
        contents,
      },
    }
  }

  return root
}
```

- [ ] **Step 4: Generalize the sandbox composable to work from a workspace**

Create [src/shared/composables/useSlidevSandbox.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/shared/composables/useSlidevSandbox.ts) by copying the current [src/composables/useSlidevSandbox.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/composables/useSlidevSandbox.ts) and applying these exact structural changes:

1. Change the function signature to:

```ts
export function useSlidevSandbox(
  files: Ref<Record<string, string>>,
  entryFile: Ref<string>,
) {
```

2. Replace the old `createSandboxFiles(markdown: string)` helper with:

```ts
function createSandboxFiles(files: Record<string, string>): FileSystemTree {
  return buildFileSystemTree({
    'package.json': createSandboxPackageJson(),
    'global-bottom.vue': createGlobalBottomComponent(),
    ...files,
  })
}
```

3. Add this import near the top:

```ts
import { buildFileSystemTree } from '@/shared/lib/sandbox/buildFileSystemTree'
```

4. Replace every `markdown.value` read with `files.value[entryFile.value] ?? ''` only where the code needs the currently edited entry file content, and replace every whole-project mount / sync call so it uses the full `files.value` object instead of a single markdown string.

5. Replace the mount and sync branches inside `ensureStarted()` with:

```ts
if (!projectMounted) {
  await container.mount(createSandboxFiles(files.value))
  projectMounted = true
  appendLog('system', '已挂载内置 Slidev 工程文件。', 'success')
}
else {
  await syncSandboxSupportFiles()
  await syncWorkspaceFiles(files.value)
  appendLog('system', '已刷新沙箱配置文件。')
}
```

6. Replace the old `syncSlideMarkdown` helper with a new workspace sync helper:

```ts
async function syncWorkspaceFiles(nextFiles: Record<string, string>) {
  if (!container) {
    return
  }

  for (const [path, contents] of Object.entries(nextFiles)) {
    await container.fs.writeFile(path, contents)
  }
}
```

7. Replace the bottom watcher with:

```ts
watch(files, (value) => {
  if (!projectMounted) {
    return
  }

  if (syncTimer !== null) {
    window.clearTimeout(syncTimer)
  }

  syncTimer = window.setTimeout(() => {
    void syncWorkspaceFiles(value)
    appendLog('system', '已同步课程工作区到 WebContainer。')
    refreshPreviewFrame()

    if (!devProcess && !isBusy.value) {
      appendLog('system', '检测到 Slidev 进程未运行，正在尝试重启。')
      void ensureStarted()
    }
  }, 350)
}, { deep: true })
```

8. Keep the rest of the WebContainer lifecycle unchanged. Do not redesign the DOM probe, process output, or preview panel state machine in this task.

Replace [src/composables/useSlidevSandbox.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/composables/useSlidevSandbox.ts) with a compatibility wrapper:

```ts
import { computed, type Ref } from 'vue'

export type { SandboxLogEntry } from '@/shared/composables/useSlidevSandbox'

import { useSlidevSandbox as useSharedSlidevSandbox } from '@/shared/composables/useSlidevSandbox'

export function useSlidevSandbox(markdown: Ref<string>) {
  return useSharedSlidevSandbox(
    computed(() => ({
      'slides.md': markdown.value,
    })),
    computed(() => 'slides.md'),
  )
}
```

- [ ] **Step 5: Run the helper tests and verify they pass**

Run:

```bash
pnpm test -- src/app/runtimeHelpers.test.ts src/shared/lib/sandbox/buildFileSystemTree.test.ts
```

Expected: PASS with `3 passed`.

### Task 5: Replace Direct `App.vue` Wiring with `AppShell + useLessonRuntime`

**Files:**
- Create: `src/app/useLessonRuntime.ts`
- Create: `src/app/AppShell.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Write the failing runtime integration test**

Create [src/app/useLessonRuntime.test.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/useLessonRuntime.test.ts):

```ts
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
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm test -- src/app/useLessonRuntime.test.ts
```

Expected: FAIL because `./useLessonRuntime` does not exist yet.

- [ ] **Step 3: Implement `useLessonRuntime`**

Create [src/app/useLessonRuntime.ts](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/useLessonRuntime.ts):

```ts
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
```

- [ ] **Step 4: Move the existing shell into `AppShell.vue` and make `App.vue` thin**

Create [src/app/AppShell.vue](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/app/AppShell.vue) with the current [src/App.vue](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/App.vue) template and style block, then replace the script and lesson-specific copy with this exact content:

```vue
<script setup lang="ts">
import { computed } from 'vue'

import MonacoMarkdownEditor from '@/components/MonacoMarkdownEditor.vue'
import SandboxPreview from '@/components/SandboxPreview.vue'
import ValidationChecklist from '@/components/ValidationChecklist.vue'

import { defaultLessonId, getLessonById } from './lessonRegistry'
import { useLessonRuntime } from './useLessonRuntime'

const lesson = getLessonById(defaultLessonId)

if (!lesson) {
  throw new Error(`Missing lesson registration: ${defaultLessonId}`)
}

const {
  canUseWebContainer,
  completionPercent,
  editorValue,
  ensureStarted,
  errorMessage,
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
} = useLessonRuntime(lesson)

const saveStateLabel = computed(() => {
  if (!isHydrated.value) {
    return '草稿加载中'
  }

  if (saveState.value === 'saving') {
    return '草稿保存中'
  }

  if (!lastSavedAt.value) {
    return 'IndexedDB 已启用'
  }

  return `最近保存于 ${new Date(lastSavedAt.value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
</script>

<template>
  <div class="app-shell">
    <main class="ide-layout">
      <aside class="lesson-panel">
        <div class="lesson-scroll">
          <div class="module-meta">
            <span class="module-badge">{{ manifest.badge }}</span>
            <h1>{{ manifest.title }}</h1>
            <p>
              这是一个面向教学的 Slidev 互动实验台。通过编辑主文件、观察预览和完成校验项来推进课程。
            </p>
          </div>

          <section class="goal-card">
            <div class="goal-icon">◆</div>
            <div>
              <p class="section-kicker">The Goal</p>
              <h2>{{ manifest.objective }}</h2>
              <p>{{ manifest.summary }}</p>
            </div>
          </section>

          <section class="info-block">
            <div class="info-head">
              <p class="section-kicker">Current Focus</p>
              <strong>{{ nextCheckpoint }}</strong>
            </div>
            <div class="progress-strip">
              <span class="progress-bar" :style="{ width: completionPercent }" />
            </div>
            <small>{{ validationReport.completedCount }}/{{ validationReport.totalCount }} 项校验已通过</small>
          </section>

          <ValidationChecklist class="validation-embed" :report="validationReport" />

          <section class="info-section">
            <p class="section-kicker">Steps</p>
            <ul class="step-list">
              <li v-for="(instruction, index) in manifest.instructions" :key="instruction">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <p>{{ instruction }}</p>
              </li>
            </ul>
          </section>

          <section class="info-section">
            <p class="section-kicker">Hints</p>
            <div class="hint-stack">
              <article v-for="hint in manifest.hints" :key="hint" class="hint-card">
                <strong>提示</strong>
                <p>{{ hint }}</p>
              </article>
            </div>
          </section>

          <section class="info-section">
            <p class="section-kicker">Runtime Notes</p>
            <ul class="meta-list">
              <li>
                <strong>保存状态</strong>
                <span>{{ saveStateLabel }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div class="lesson-footer">
          <div class="footer-progress">
            <span>当前进度</span>
            <strong>{{ completionPercent }}</strong>
            <small>{{ pendingCount === 0 ? '这一关已经完成。' : `还有 ${pendingCount} 项待完成。` }}</small>
          </div>
          <button type="button" class="next-button" disabled>
            下一课即将开放
          </button>
        </div>
      </aside>

      <section class="editor-panel">
        <div class="editor-head">
          <div>
            <p class="section-kicker">编辑区</p>
            <h2>{{ manifest.entryFile }}</h2>
            <small>默认编辑课程入口文件，预览区会跟着刷新。</small>
          </div>

          <div class="editor-head-actions">
            <span class="editor-save-state">{{ saveStateLabel }}</span>
            <button type="button" class="icon-button" @click="resetToStarter">
              重置
            </button>
          </div>
        </div>

        <div class="editor-surface">
          <MonacoMarkdownEditor v-model="editorValue" />
        </div>

        <div class="editor-footer">
          <div class="editor-footer-copy">
            <strong>当前目标：{{ nextCheckpoint }}</strong>
            <small>{{ footerHint }}</small>
          </div>

          <div class="editor-footer-actions">
            <button type="button" class="secondary-button" @click="resetToStarter">
              还原起始代码
            </button>
            <button type="button" class="primary-button" :disabled="isBusy" @click="ensureStarted">
              {{ status === 'running' ? '重启预览' : '启动预览' }}
            </button>
          </div>
        </div>
      </section>

      <section class="monitor-panel">
        <SandboxPreview
          :can-use-web-container="canUseWebContainer"
          :error-message="errorMessage"
          :logs="logs"
          :preview-frame-key="previewFrameKey"
          :preview-url="previewUrl"
          :status="status"
        />
      </section>
    </main>
  </div>
</template>
```

After pasting that script and template, move the existing `<style scoped>` block from [src/App.vue](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/App.vue) into the bottom of `src/app/AppShell.vue` unchanged.

Replace [src/App.vue](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/App.vue) with:

```vue
<script setup lang="ts">
import AppShell from '@/app/AppShell.vue'
</script>

<template>
  <AppShell />
</template>
```

- [ ] **Step 5: Run the focused runtime test, then the full verification suite**

Run:

```bash
pnpm test -- src/app/useLessonRuntime.test.ts
pnpm test
pnpm type-check
pnpm build
```

Expected:
- `pnpm test -- src/app/useLessonRuntime.test.ts`: PASS
- `pnpm test`: PASS across all added test files
- `pnpm type-check`: exit `0`
- `pnpm build`: exit `0`

### Task 6: Optional Cleanup After Explicit User Confirmation

**Files:**
- Delete: `src/tasks/slidevHomeTask.ts`
- Delete: `src/lib/validation/slidevHomeValidator.ts`
- Delete: `src/composables/usePersistentDraft.ts`
- Delete: `src/composables/useSlidevSandbox.ts`

- [ ] **Step 1: Stop and request confirmation before removing legacy compatibility files**

Use this exact prompt because the repo instructions require confirmation before file deletion:

```text
⚠️ 危险操作检测！
操作类型：删除兼容层文件
影响范围：src/tasks/slidevHomeTask.ts、src/lib/validation/slidevHomeValidator.ts、src/composables/usePersistentDraft.ts、src/composables/useSlidevSandbox.ts
风险评估：删除后旧入口和旧导入路径将失效，必须确认新的 AppShell、lesson runtime、shared composables 已全部接管。

请确认是否继续？[需要明确的"是"、"确认"、"继续"]
```

- [ ] **Step 2: Only after confirmation, delete the wrappers and rerun the full verification**

Run:

```bash
pnpm test
pnpm type-check
pnpm build
```

Expected: all commands still pass after the legacy files are removed.
