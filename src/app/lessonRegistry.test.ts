import { describe, expect, it } from 'vitest'

import { defaultLessonId, getLessonById, lessons } from './lessonRegistry'

describe('lessonRegistry', () => {
  it('registers the default lesson module and resolves it by id', () => {
    expect(defaultLessonId).toBe('lesson-01-home')
    expect(lessons.map(item => item.manifest.id)).toEqual(['lesson-01-home'])
    expect(getLessonById('lesson-01-home')?.manifest.entryFile).toBe('slides.md')
  })

  it('returns undefined for unknown ids', () => {
    expect(getLessonById('missing-lesson')).toBeUndefined()
  })
})
