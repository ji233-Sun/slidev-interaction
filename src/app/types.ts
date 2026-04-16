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
