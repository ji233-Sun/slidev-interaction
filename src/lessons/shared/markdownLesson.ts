import { toString } from 'mdast-util-to-string'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parse as parseYaml } from 'yaml'

export type MarkdownNode = {
  type: string
  depth?: number
  value?: string
  children?: MarkdownNode[]
}

const parser = unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])

export function parseMarkdownDocument(markdown: string) {
  return parser.parse(markdown) as { children: MarkdownNode[] }
}

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function countMeaningfulCharacters(value: string) {
  const normalized = normalizeText(value)
  const stripped = normalized.replace(/[\p{P}\p{S}\s]/gu, '')

  return Array.from(stripped).length
}

export function isMeaningfulText(value: string, placeholders: string | string[], minimumLength = 2) {
  const normalized = normalizeText(value)
  const candidates = Array.isArray(placeholders) ? placeholders : [placeholders]

  return (
    !candidates.some(item => normalizeText(item) === normalized)
    && countMeaningfulCharacters(normalized) >= minimumLength
  )
}

export function getScalarText(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeText(String(value))
  }

  return ''
}

export function extractText(node: MarkdownNode) {
  return normalizeText(toString(node as never))
}

export function parseFrontmatter(frontmatterText: string) {
  if (frontmatterText.trim().length === 0) {
    return {}
  }

  try {
    return (parseYaml(frontmatterText) as Record<string, unknown> | null) ?? {}
  }
  catch {
    return {}
  }
}

export function splitSlides(nodes: MarkdownNode[]) {
  let frontmatterText = ''
  const slides: MarkdownNode[][] = [[]]

  for (const node of nodes) {
    if (node.type === 'yaml' && !frontmatterText) {
      frontmatterText = node.value ?? ''
      continue
    }

    if (node.type === 'thematicBreak') {
      slides.push([])
      continue
    }

    slides[slides.length - 1]?.push(node)
  }

  return {
    frontmatterText,
    slides,
  }
}
