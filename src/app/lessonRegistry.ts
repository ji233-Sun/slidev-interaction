import type { LessonModule } from './types'

import { lesson01HomeModule } from '@/lessons/lesson-01-home'
import { lesson02AgendaModule } from '@/lessons/lesson-02-agenda'

export const lessons: LessonModule[] = [lesson01HomeModule, lesson02AgendaModule]

export const defaultLessonId = lessons[0]?.manifest.id ?? ''

export function getLessonById(id: string) {
  return lessons.find(lesson => lesson.manifest.id === id)
}

function getLessonIndex(id: string) {
  return lessons.findIndex(lesson => lesson.manifest.id === id)
}

export function getPreviousLessonId(id: string) {
  const index = getLessonIndex(id)

  if (index <= 0) {
    return undefined
  }

  return lessons[index - 1]?.manifest.id
}

export function getNextLessonId(id: string) {
  const index = getLessonIndex(id)

  if (index === -1) {
    return undefined
  }

  return lessons[index + 1]?.manifest.id
}
