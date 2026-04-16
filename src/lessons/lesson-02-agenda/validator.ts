import type { LessonContext } from '@/app/types'
import type { ValidationItem, ValidationReport } from '@/shared/lib/validation/types'

import type { Lesson02AgendaManifest } from './manifest'

import {
  extractText,
  isMeaningfulText,
  parseMarkdownDocument,
  type MarkdownNode,
  splitSlides,
} from '@/lessons/shared/markdownLesson'

function createPendingDomDetail() {
  return '等待 Slidev 预览启动后返回真实 DOM 检查结果。'
}

function createValidationItem(
  checkpointMap: Map<string, Lesson02AgendaManifest['checkpoints'][number]>,
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

function collectListTexts(nodes: MarkdownNode[]) {
  return nodes
    .filter(node => node.type === 'list')
    .flatMap(node => (node.children ?? []).map(extractText))
    .filter(Boolean)
}

export function validateLesson02Agenda(
  context: Omit<LessonContext, 'manifest'> & { manifest: Lesson02AgendaManifest },
): ValidationReport {
  const markdown = context.files[context.manifest.entryFile] ?? ''
  const tree = parseMarkdownDocument(markdown)
  const checkpointMap = new Map(context.manifest.checkpoints.map(checkpoint => [checkpoint.id, checkpoint]))
  const { slides } = splitSlides(tree.children)

  const secondSlideNodes: MarkdownNode[] = slides[1] ?? []
  const secondSlideHeading = secondSlideNodes.find(node => node.type === 'heading' && node.depth === 2)
  const secondSlideHeadingText = secondSlideHeading ? extractText(secondSlideHeading) : ''
  const secondSlideListTexts = collectListTexts(secondSlideNodes)
  const meaningfulListItems = secondSlideListTexts.filter(
    text => isMeaningfulText(text, context.manifest.placeholders.bulletItems, 4),
  )
  const isOnSecondPage = context.domSnapshot?.currentPage === 2
  const hasVisibleSecondSlideHeading = context.domSnapshot
    ? context.domSnapshot.headings.some(text => isMeaningfulText(text, context.manifest.placeholders.pageTitle, 2))
    : false

  const items: ValidationItem[] = [
    createValidationItem(
      checkpointMap,
      'second-slide-divider',
      slides.length >= 2,
      slides.length >= 2
        ? '已检测到第二页分隔符。'
        : '请在首页内容后输入 --- 来新增第二页。',
    ),
    createValidationItem(
      checkpointMap,
      'second-slide-heading',
      isMeaningfulText(secondSlideHeadingText, context.manifest.placeholders.pageTitle, 2),
      isMeaningfulText(secondSlideHeadingText, context.manifest.placeholders.pageTitle, 2)
        ? `第二页标题已更新为「${secondSlideHeadingText}」。`
        : '请在第二页写一个二级标题，并替换掉占位文案。',
    ),
    createValidationItem(
      checkpointMap,
      'second-slide-list',
      meaningfulListItems.length >= 3,
      meaningfulListItems.length >= 3
        ? `第二页已经写出 ${meaningfulListItems.length} 条有效要点。`
        : '请在第二页补充至少 3 条有意义的列表要点。',
    ),
    createValidationItem(
      checkpointMap,
      'preview-page-two',
      Boolean(isOnSecondPage),
      context.domSnapshot
        ? isOnSecondPage
            ? '预览已切换到第 2 页。'
            : '预览已启动，请先切到第 2 页再继续。'
        : createPendingDomDetail(),
    ),
    createValidationItem(
      checkpointMap,
      'preview-second-slide-heading',
      Boolean(isOnSecondPage && hasVisibleSecondSlideHeading),
      context.domSnapshot
        ? isOnSecondPage
            ? hasVisibleSecondSlideHeading
                ? '预览里已经渲染出第二页标题。'
                : '预览已切到第 2 页，但还没有检测到有效标题。'
            : '当前预览不在第 2 页，暂时无法检测第二页标题。'
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
