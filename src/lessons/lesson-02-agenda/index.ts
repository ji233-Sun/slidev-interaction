import type { LessonModule } from '@/app/types'

import { lesson02AgendaManifest } from './manifest'
import { lesson02AgendaRuntime } from './runtime'
import { validateLesson02Agenda } from './validator'

export const lesson02AgendaModule = {
  manifest: lesson02AgendaManifest,
  validate: validateLesson02Agenda,
  runtime: lesson02AgendaRuntime,
} satisfies LessonModule
