# Lesson Runtime Architecture Design

## Background

The current project is organized around a single hard-coded lesson:

- [`src/App.vue`](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/App.vue) imports one task and one validator directly.
- [`src/tasks/slidevHomeTask.ts`](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/tasks/slidevHomeTask.ts) mixes lesson metadata, authoring content, and placeholder rules for Lesson 01 only.
- [`src/lib/validation/slidevHomeValidator.ts`](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/lib/validation/slidevHomeValidator.ts) is lesson-specific and cannot scale without copy-paste.
- [`src/composables/usePersistentDraft.ts`](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/composables/usePersistentDraft.ts) and [`src/composables/useSlidevSandbox.ts`](/Users/ji233/Documents/0MyProjects/slidev-interaction/src/composables/useSlidevSandbox.ts) are shaped around a single `slides.md` string instead of a lesson workspace.

That structure works for one demo lesson, but it is a poor fit for iterative development across multiple courses. Each new lesson would push more conditionals into the app entry, duplicate validation logic, and make it harder to support small lesson-specific behavior.

## Goals

- Restructure the app around reusable lesson modules instead of one hard-coded lesson.
- Keep the common authoring experience centered on `slides.md + live preview + validation`.
- Allow a small amount of lesson-specific Vue logic for exceptional lessons without polluting the global app shell.
- Prepare the runtime for limited multi-file lessons without forcing immediate platform-level complexity.
- Preserve the current Lesson 01 behavior while improving extension points.

## Non-Goals

- Do not introduce a plugin marketplace or dynamic remote loading.
- Do not build a full course management system, quiz engine, or CMS.
- Do not add route-heavy navigation unless a later requirement proves it necessary.
- Do not redesign the visual layout unless it is required to support the new boundaries.

## Recommended Architecture

The app should become a small lesson platform with three layers:

1. `app` layer
   Owns lesson selection, runtime orchestration, and shell composition.

2. `lessons` layer
   Contains independent lesson modules. Each lesson owns its content metadata, validation rules, and optional local runtime customizations.

3. `shared` layer
   Contains generic UI, composables, persistence, sandbox helpers, and validation types that are reusable across lessons.

This keeps the extensibility point at the lesson boundary instead of the app entry boundary.

## Directory Structure

```text
src/
  app/
    AppShell.vue
    lessonRegistry.ts
    types.ts
    useLessonRuntime.ts
  lessons/
    lesson-01-home/
      manifest.ts
      validator.ts
      index.ts
      runtime.ts           # optional
      extensions/          # optional
    lesson-02-layout-basics/
      manifest.ts
      validator.ts
      index.ts
  shared/
    components/
    composables/
    lib/
```

### Responsibilities

- `src/app/AppShell.vue`
  Renders the shell and consumes runtime state. It must not import any concrete lesson implementation directly.

- `src/app/lessonRegistry.ts`
  Registers all lesson modules in one place and resolves the active lesson.

- `src/app/useLessonRuntime.ts`
  Composes the selected lesson with persistence, sandbox sync, validation, progress, and optional lesson hooks.

- `src/lessons/<lesson-id>/manifest.ts`
  Defines lesson metadata and starter workspace files.

- `src/lessons/<lesson-id>/validator.ts`
  Implements the validation logic for that lesson only.

- `src/lessons/<lesson-id>/runtime.ts`
  Optional lesson hook surface for small custom behaviors.

- `src/shared/*`
  Stores reusable logic only. Nothing in `shared` should know about `lesson-01-home`.

## Lesson Module Contract

Each lesson should implement one explicit contract.

```ts
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
```

### Contract Rules

- Normal lessons should only need `manifest` and `validate`.
- `starterFiles` is required even for single-file lessons so the runtime is future-proof for limited multi-file lessons.
- `entryFile` defaults authoring to one primary file such as `slides.md`.
- `runtime` remains optional and intentionally small. It is not a second application framework.
- Lesson-specific Vue logic must stay local to the lesson directory unless it becomes broadly reusable.

## Runtime Data Flow

The runtime should work as a predictable pipeline:

1. The app resolves the active lesson from `lessonRegistry`.
2. `useLessonRuntime` loads the lesson manifest and draft workspace.
3. The draft store hydrates `files` by `storageKey`.
4. The editor binds to `entryFile` by default.
5. The sandbox receives a full virtual workspace instead of a single markdown string.
6. The validator receives `manifest + files + domSnapshot`.
7. The shell renders lesson metadata, progress, and validation from generic runtime state.

This change moves the central state shape from:

```ts
content: string
```

to:

```ts
files: Record<string, string>
entryFile: string
```

That is the minimum useful generalization. It is enough for:

- current single-file lessons
- lessons with one primary file and a few support files
- future lesson-specific preview assembly through `runtime.getPreviewFiles`

It avoids overdesign such as file trees, tabs, permissions, or full workspace editors that are not required yet.

## Shared Composable Changes

### `usePersistentDraft`

Current issue:
- It persists one `content` string only.

Target change:
- Persist a `files` object keyed by path.
- Reset should restore the full starter workspace, not only `slides.md`.

Expected shape:

```ts
interface DraftRecord {
  files: Record<string, string>
  updatedAt: string
}
```

### `useSlidevSandbox`

Current issue:
- It mounts one baked-in project and rewrites `slides.md`.

Target change:
- Accept a virtual file map and an entry file.
- Keep the current WebContainer lifecycle, but move lesson content assembly out of the composable.
- Reserve lesson-specific file transforms for optional runtime hooks.

This keeps WebContainer management generic and prevents per-lesson branching in the sandbox layer.

## UI Boundary Changes

`App.vue` should stop being the concrete lesson implementation. The preferred split is:

- `src/App.vue`
  Very thin app bootstrap that renders `AppShell`.

- `src/app/AppShell.vue`
  The lesson shell. Reads generic runtime state and delegates to shared components.

The existing components such as `MonacoMarkdownEditor`, `SandboxPreview`, and `ValidationChecklist` should remain generic. They may need prop changes to support the new runtime state, but they should not know which lesson is active.

## Lesson 01 Migration

Lesson 01 should be migrated without changing its user-facing behavior:

- Move the lesson metadata from `src/tasks/slidevHomeTask.ts` into `src/lessons/lesson-01-home/manifest.ts`.
- Move the validator from `src/lib/validation/slidevHomeValidator.ts` into `src/lessons/lesson-01-home/validator.ts`.
- Export the lesson from `src/lessons/lesson-01-home/index.ts` as one `LessonModule`.
- Register it in `src/app/lessonRegistry.ts`.

Starter files for Lesson 01 should become:

```ts
{
  'slides.md': `---
theme: default
title: 请填写演示文稿标题
layout: cover
class: text-center
transition: fade
---

# 请填写首页标题

请用一句话说明这份 Slidev 想解决什么问题
`
}
```

This keeps the current lesson authoring model intact while shifting the architecture to a scalable boundary.

## Error Handling

The runtime should standardize a few failure states:

- Missing lesson registration
  Show a shell-level error state with a clear message instead of crashing.

- Draft hydration failure
  Fall back to starter files and preserve current local fallback behavior.

- Sandbox startup failure
  Keep the current error surface in the preview panel.

- Validator mismatch
  If a validator references an undefined checkpoint, fail fast in development with a clear error.

The runtime should centralize these states so that lesson modules stay focused on lesson logic.

## Testing Strategy

The current project has no tests. This refactor should add a minimal safety net focused on behavior that is easy to regress.

### Required coverage

- `lessonRegistry`
  Verifies registration and active lesson resolution.

- `usePersistentDraft`
  Verifies hydration, save, and reset behavior for `files` workspaces.

- `lesson-01-home/validator`
  Locks the current lesson behavior before and after migration.

- optional runtime adapter utilities
  Verifies default `entryFile`, preview file assembly, and fallback hook behavior if these are extracted into pure helpers.

### Not required for this refactor

- Full browser E2E coverage.
- Visual regression tests.
- Heavy WebContainer integration tests.

The goal is not maximum coverage. The goal is to protect the new extension boundaries and preserve Lesson 01 behavior during migration.

## Incremental Migration Plan

The refactor should be executed in four small steps:

1. Introduce shared app types and the `LessonModule` contract.
2. Move Lesson 01 into `src/lessons/lesson-01-home/`.
3. Upgrade draft persistence and sandbox input from `content` to `files`.
4. Replace direct lesson wiring in `App.vue` with `AppShell + useLessonRuntime + lessonRegistry`.

This sequence minimizes churn because the lesson contract exists before the runtime depends on it.

## Expected Outcome

After the refactor:

- adding a normal lesson should mainly mean creating a new lesson folder and registering it
- special lessons may add a small local runtime hook or extension component
- app-level code should stop accumulating lesson-specific branches
- the sandbox and persistence layers should be reusable across lessons
- the project should be ready for multiple lessons without premature platform complexity

## Trade-Offs

- This adds a small amount of structural overhead now, but it prevents repeated duplication later.
- A `files` workspace model is slightly more abstract than a single string, but it is the smallest generalization that supports the expected roadmap.
- Optional runtime hooks introduce flexibility, so the interface must stay deliberately narrow to avoid turning into a second uncontrolled app layer.
