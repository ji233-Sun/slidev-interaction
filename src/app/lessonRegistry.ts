import type { LessonModule } from './types'

import { lesson01HomeModule } from '@/lessons/lesson-01-home'

export const lessons: LessonModule[] = [lesson01HomeModule]

export const defaultLessonId = lessons[0]?.manifest.id ?? ''

export function getLessonById(id: string) {
  return lessons.find(lesson => lesson.manifest.id === id)
}
