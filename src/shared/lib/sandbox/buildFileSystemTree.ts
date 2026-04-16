import type { FileSystemTree } from '@webcontainer/api'

type MutableDirectory = Record<string, FileSystemTree[string]>

export function buildFileSystemTree(files: Record<string, string>): FileSystemTree {
  const root: MutableDirectory = {}

  for (const [path, contents] of Object.entries(files)) {
    const segments = path.split('/').filter(Boolean)
    const fileName = segments.pop()

    if (!fileName) {
      continue
    }

    let cursor = root

    for (const segment of segments) {
      const next = cursor[segment]

      if (!next || !('directory' in next)) {
        cursor[segment] = {
          directory: {},
        }
      }

      cursor = (cursor[segment] as { directory: MutableDirectory }).directory
    }

    cursor[fileName] = {
      file: {
        contents,
      },
    }
  }

  return root
}
