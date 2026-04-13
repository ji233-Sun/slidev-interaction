import { toString } from 'mdast-util-to-string'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parse as parseYaml } from 'yaml'

import type { SlidevLessonTask } from '@/tasks/slidevHomeTask'

type MarkdownNode = {
  type: string
  depth?: number
  value?: string
  children?: MarkdownNode[]
}

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

export function validateSlidevHome(
  markdown: string,
  task: SlidevLessonTask,
  domSnapshot: PreviewDomSnapshot | null,
): ValidationReport {
  const tree = parser.parse(markdown) as { children: MarkdownNode[] }
  const checkpointMap = new Map(task.checkpoints.map(checkpoint => [checkpoint.id, checkpoint]))

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

  const firstHeadingNode = firstSlideNodes.find(
    node => node.type === 'heading' && node.depth === 1,
  )

  const paragraphTexts = firstSlideNodes
    .filter(node => node.type === 'paragraph')
    .map(extractText)
    .filter(Boolean)

  const firstHeadingText = firstHeadingNode ? extractText(firstHeadingNode) : ''
  const subtitleText = paragraphTexts.find(text => isMeaningfulText(text, task.placeholders.subtitle, 6)) ?? ''

  const domHeadings = domSnapshot?.headings ?? []
  const domParagraphs = domSnapshot?.paragraphs ?? []

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
      isMeaningfulText(titleValue, task.placeholders.deckTitle, 2),
      isMeaningfulText(titleValue, task.placeholders.deckTitle, 2)
        ? `演示标题已更新为「${titleValue}」。`
        : '请把 frontmatter.title 改成你自己的演示标题。',
    ),
    createValidationItem(
      checkpointMap,
      'first-slide-heading',
      isMeaningfulText(firstHeadingText, task.placeholders.pageTitle, 2),
      isMeaningfulText(firstHeadingText, task.placeholders.pageTitle, 2)
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
      domSnapshot
        ? domHeadings.some(text => isMeaningfulText(text, task.placeholders.pageTitle, 2))
        : false,
      domSnapshot
        ? domHeadings.some(text => isMeaningfulText(text, task.placeholders.pageTitle, 2))
            ? '预览里已经渲染出首页标题。'
            : '预览已启动，但还没有检测到有效标题。'
        : createPendingDomDetail(),
    ),
    createValidationItem(
      checkpointMap,
      'preview-subtitle',
      domSnapshot
        ? domParagraphs.some(text => isMeaningfulText(text, task.placeholders.subtitle, 6))
        : false,
      domSnapshot
        ? domParagraphs.some(text => isMeaningfulText(text, task.placeholders.subtitle, 6))
            ? '预览里已经渲染出副标题段落。'
            : '预览已启动，但还没有检测到有效副标题。'
        : createPendingDomDetail(),
    ),
  ]

  const completedCount = items.filter(item => item.passed).length
  const totalCount = items.length

  return {
    items,
    completedCount,
    totalCount,
    completionRatio: totalCount === 0 ? 0 : completedCount / totalCount,
  }
}

function createValidationItem(
  checkpointMap: Map<string, SlidevLessonTask['checkpoints'][number]>,
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
