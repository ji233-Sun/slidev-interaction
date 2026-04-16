import { describe, expect, it } from 'vitest'

import { defaultLessonId, getLessonById, getNextLessonId, getPreviousLessonId, lessons } from './lessonRegistry'

describe('lessonRegistry', () => {
  it('registers the default lesson module and resolves lessons by id', () => {
    expect(defaultLessonId).toBe('lesson-01-home')
    expect(lessons.map(item => item.manifest.id)).toEqual([
      'lesson-01-home',
      'lesson-02-agenda',
    ])
    expect(getLessonById('lesson-01-home')?.manifest.entryFile).toBe('slides.md')
    expect(getLessonById('lesson-02-agenda')?.manifest.badge).toBe('Lesson 02')
  })

  it('resolves adjacent lessons for sequential navigation', () => {
    expect(getPreviousLessonId('lesson-01-home')).toBeUndefined()
    expect(getNextLessonId('lesson-01-home')).toBe('lesson-02-agenda')
    expect(getPreviousLessonId('lesson-02-agenda')).toBe('lesson-01-home')
    expect(getNextLessonId('lesson-02-agenda')).toBeUndefined()
  })

  it('returns undefined for unknown ids', () => {
    expect(getLessonById('missing-lesson')).toBeUndefined()
    expect(getPreviousLessonId('missing-lesson')).toBeUndefined()
    expect(getNextLessonId('missing-lesson')).toBeUndefined()
  })
})
