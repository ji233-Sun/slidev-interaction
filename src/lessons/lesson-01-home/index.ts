import type { LessonModule } from '@/app/types'

import { lesson01HomeManifest } from './manifest'
import { validateLesson01Home } from './validator'

export const lesson01HomeModule = {
  manifest: lesson01HomeManifest,
  validate: validateLesson01Home,
} satisfies LessonModule
