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
