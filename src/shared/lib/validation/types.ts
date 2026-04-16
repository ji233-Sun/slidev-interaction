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
