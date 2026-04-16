import { describe, expect, it } from 'vitest'

import { buildFileSystemTree } from './buildFileSystemTree'

describe('buildFileSystemTree', () => {
  it('converts nested file paths into a WebContainer tree', () => {
    const tree = buildFileSystemTree({
      'slides.md': '# Intro',
      'snippets/hero.md': 'Hello',
      'global-bottom.vue': '<template />',
    })

    expect(tree['slides.md']).toEqual({
      file: {
        contents: '# Intro',
      },
    })
    expect(tree.snippets).toEqual({
      directory: {
        'hero.md': {
          file: {
            contents: 'Hello',
          },
        },
      },
    })
    expect(tree['global-bottom.vue']).toEqual({
      file: {
        contents: '<template />',
      },
    })
  })
})
