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
  const subtitleText = paragraphTexts.find(
    text => isMeaningfulText(text, context.manifest.placeholders.subtitle, 6),
  ) ?? ''
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
