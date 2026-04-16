<script setup lang="ts">
import { computed } from 'vue'

import MonacoMarkdownEditor from '@/components/MonacoMarkdownEditor.vue'
import SandboxPreview from '@/components/SandboxPreview.vue'
import ValidationChecklist from '@/components/ValidationChecklist.vue'

import { defaultLessonId, getLessonById, getNextLessonId, getPreviousLessonId, lessons } from './lessonRegistry'
import { useLessonRuntime } from './useLessonRuntime'

function resolveLessonIdFromLocation() {
  if (typeof window === 'undefined') {
    return defaultLessonId
  }

  const requestedLessonId = new URLSearchParams(window.location.search).get('lesson')

  return getLessonById(requestedLessonId ?? '')?.manifest.id ?? defaultLessonId
}

function createLessonHref(id: string) {
  if (typeof window === 'undefined') {
    return `/?lesson=${id}`
  }

  const params = new URLSearchParams(window.location.search)
  params.set('lesson', id)

  return `${window.location.pathname || '/'}?${params.toString()}`
}

const activeLessonId = resolveLessonIdFromLocation()
const previousLessonId = getPreviousLessonId(activeLessonId)
const nextLessonId = getNextLessonId(activeLessonId)
const lesson = getLessonById(activeLessonId)

if (!lesson) {
  throw new Error(`Missing lesson registration: ${activeLessonId}`)
}

const {
  canUseWebContainer,
  completionPercent,
  editorValue,
  ensureStarted,
  errorMessage,
  footerHint,
  isBusy,
  isHydrated,
  lastSavedAt,
  logs,
  manifest,
  nextCheckpoint,
  pendingCount,
  previewFrameKey,
  previewUrl,
  resetToStarter,
  saveState,
  status,
  validationReport,
} = useLessonRuntime(lesson)

const saveStateLabel = computed(() => {
  if (!isHydrated.value) {
    return '草稿加载中'
  }

  if (saveState.value === 'saving') {
    return '草稿保存中'
  }

  if (!lastSavedAt.value) {
    return 'IndexedDB 已启用'
  }

  return `最近保存于 ${new Date(lastSavedAt.value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
</script>

<template>
  <div class="app-shell">
    <header class="lesson-track">
      <div class="track-copy">
        <p class="section-kicker">Lesson Track</p>
        <h1>Slidev Interaction Lab</h1>
        <p>按顺序完成首页与第二页，逐步把一份完整的演示搭起来。</p>
      </div>

      <nav class="track-list" aria-label="课程列表">
        <a
          v-for="item in lessons"
          :key="item.manifest.id"
          :data-lesson-id="item.manifest.id"
          :href="createLessonHref(item.manifest.id)"
          class="track-link"
          :class="{ 'track-link--active': item.manifest.id === manifest.id }"
        >
          <span>{{ item.manifest.badge }}</span>
          <strong>{{ item.manifest.title }}</strong>
          <small>{{ item.manifest.summary }}</small>
        </a>
      </nav>
    </header>

    <main class="ide-layout">
      <aside class="lesson-panel">
        <div class="lesson-scroll">
          <div class="module-meta">
            <span class="module-badge">{{ manifest.badge }}</span>
            <h1>{{ manifest.title }}</h1>
            <p>
              这是一个面向教学的 Slidev 互动实验台。通过编辑主文件、观察预览和完成校验项来推进课程。
            </p>
          </div>

          <section class="goal-card">
            <div class="goal-icon">◆</div>
            <div>
              <p class="section-kicker">The Goal</p>
              <h2>{{ manifest.objective }}</h2>
              <p>{{ manifest.summary }}</p>
            </div>
          </section>

          <section class="info-block">
            <div class="info-head">
              <p class="section-kicker">Current Focus</p>
              <strong>{{ nextCheckpoint }}</strong>
            </div>
            <div class="progress-strip">
              <span class="progress-bar" :style="{ width: completionPercent }" />
            </div>
            <small>{{ validationReport.completedCount }}/{{ validationReport.totalCount }} 项校验已通过</small>
          </section>

          <ValidationChecklist class="validation-embed" :report="validationReport" />

          <section class="info-section">
            <p class="section-kicker">Steps</p>
            <ul class="step-list">
              <li v-for="(instruction, index) in manifest.instructions" :key="instruction">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <p>{{ instruction }}</p>
              </li>
            </ul>
          </section>

          <section class="info-section">
            <p class="section-kicker">Hints</p>
            <div class="hint-stack">
              <article v-for="hint in manifest.hints" :key="hint" class="hint-card">
                <strong>提示</strong>
                <p>{{ hint }}</p>
              </article>
            </div>
          </section>

          <section class="info-section">
            <p class="section-kicker">Runtime Notes</p>
            <ul class="meta-list">
              <li>
                <strong>保存状态</strong>
                <span>{{ saveStateLabel }}</span>
              </li>
            </ul>
          </section>
        </div>

        <div class="lesson-footer">
          <div class="footer-progress">
            <span>当前进度</span>
            <strong>{{ completionPercent }}</strong>
            <small>{{ pendingCount === 0 ? '这一关已经完成。' : `还有 ${pendingCount} 项待完成。` }}</small>
          </div>
          <div class="lesson-footer-actions">
            <a
              v-if="previousLessonId"
              :href="createLessonHref(previousLessonId)"
              class="footer-link secondary-button"
              data-nav="previous"
            >
              返回上一课
            </a>
            <span v-else class="footer-link footer-link--disabled secondary-button">
              当前是第一课
            </span>

            <a
              v-if="nextLessonId"
              :href="createLessonHref(nextLessonId)"
              class="footer-link next-button"
              data-nav="next"
            >
              进入下一课
            </a>
            <span v-else class="footer-link footer-link--disabled next-button">
              课程已全部开放
            </span>
          </div>
        </div>
      </aside>

      <section class="editor-panel">
        <div class="editor-head">
          <div>
            <p class="section-kicker">编辑区</p>
            <h2>{{ manifest.entryFile }}</h2>
            <small>默认编辑课程入口文件，预览区会跟着刷新。</small>
          </div>

          <div class="editor-head-actions">
            <span class="editor-save-state">{{ saveStateLabel }}</span>
            <button type="button" class="icon-button" @click="resetToStarter">
              重置
            </button>
          </div>
        </div>

        <div class="editor-surface">
          <MonacoMarkdownEditor v-model="editorValue" />
        </div>

        <div class="editor-footer">
          <div class="editor-footer-copy">
            <strong>当前目标：{{ nextCheckpoint }}</strong>
            <small>{{ footerHint }}</small>
          </div>

          <div class="editor-footer-actions">
            <button type="button" class="secondary-button" @click="resetToStarter">
              还原起始代码
            </button>
            <button type="button" class="primary-button" :disabled="isBusy" @click="ensureStarted">
              {{ status === 'running' ? '重启预览' : '启动预览' }}
            </button>
          </div>
        </div>
      </section>

      <section class="monitor-panel">
        <SandboxPreview
          :can-use-web-container="canUseWebContainer"
          :error-message="errorMessage"
          :logs="logs"
          :preview-frame-key="previewFrameKey"
          :preview-url="previewUrl"
          :status="status"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
}

.lesson-track {
  display: grid;
  gap: 1rem;
  padding: 1.2rem 1.3rem;
  background: linear-gradient(180deg, rgba(15, 25, 48, 0.96), rgba(9, 16, 31, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.5rem;
  box-shadow: var(--shadow-soft);
}

.track-copy {
  display: grid;
  gap: 0.45rem;
}

.track-copy h1 {
  color: var(--color-heading);
  font-family: "Space Grotesk", "Avenir Next", sans-serif;
  font-size: clamp(1.55rem, 2vw, 2.1rem);
  line-height: 1.05;
}

.track-copy p:last-child {
  color: var(--color-muted);
  line-height: 1.7;
}

.track-list {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.track-link {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.05rem;
  background: linear-gradient(180deg, rgba(25, 37, 64, 0.96), rgba(20, 31, 56, 0.96));
  border: 1px solid rgba(163, 166, 255, 0.12);
  border-radius: 1rem;
  color: inherit;
  text-decoration: none;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.track-link:hover {
  transform: translateY(-1px);
  border-color: rgba(163, 166, 255, 0.28);
}

.track-link--active {
  border-color: rgba(163, 166, 255, 0.34);
  box-shadow: inset 0 0 0 1px rgba(163, 166, 255, 0.18);
}

.track-link span {
  color: var(--color-secondary);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.track-link strong {
  color: var(--color-heading);
  font-size: 1rem;
  line-height: 1.35;
}

.track-link small {
  color: var(--color-muted);
  line-height: 1.65;
}

.ide-layout {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(292px, 368px) minmax(0, 1fr) minmax(340px, 430px);
  height: 100%;
  min-height: 0;
}

.lesson-panel,
.editor-panel,
.monitor-panel {
  background: linear-gradient(180deg, rgba(15, 25, 48, 0.96), rgba(9, 16, 31, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.5rem;
  box-shadow: var(--shadow-soft);
  min-height: 0;
}

.lesson-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.lesson-scroll {
  display: grid;
  gap: 1.35rem;
  overflow: auto;
  padding: 1.8rem;
}

.module-meta {
  display: grid;
  gap: 0.85rem;
}

.module-badge {
  color: var(--color-secondary);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.module-meta h1 {
  color: var(--color-heading);
  font-family: "Space Grotesk", "Avenir Next", sans-serif;
  font-size: clamp(2rem, 2.4vw, 2.75rem);
  line-height: 1.03;
  max-width: 13ch;
}

.module-meta p {
  color: var(--color-muted);
  line-height: 1.75;
}

.goal-card,
.info-block,
.hint-card {
  background: linear-gradient(180deg, rgba(25, 37, 64, 0.96), rgba(20, 31, 56, 0.96));
  border: 1px solid rgba(163, 166, 255, 0.12);
  border-radius: 1rem;
}

.goal-card {
  display: grid;
  gap: 0.95rem;
  grid-template-columns: auto 1fr;
  padding: 1rem;
}

.goal-icon {
  align-items: center;
  background: linear-gradient(135deg, rgba(163, 166, 255, 0.18), rgba(96, 99, 238, 0.22));
  border-radius: 0.9rem;
  color: var(--color-primary);
  display: inline-flex;
  font-size: 1rem;
  font-weight: 700;
  height: 2.4rem;
  justify-content: center;
  width: 2.4rem;
}

.section-kicker {
  color: var(--color-muted-strong);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.goal-card h2,
.editor-head h2 {
  color: var(--color-heading);
  font-family: "Space Grotesk", "Avenir Next", sans-serif;
  font-size: 1.2rem;
  margin-top: 0.3rem;
}

.goal-card p:last-child {
  color: var(--color-muted);
  line-height: 1.7;
  margin-top: 0.35rem;
}

.info-section {
  display: grid;
  gap: 0.85rem;
}

.info-block {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
}

.info-head {
  display: grid;
  gap: 0.3rem;
}

.info-head strong,
.editor-footer-copy strong {
  color: var(--color-heading);
  font-size: 0.98rem;
}

.info-block small,
.editor-head small,
.editor-footer-copy small {
  color: var(--color-muted);
  line-height: 1.6;
}

.progress-strip {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  height: 0.4rem;
  overflow: hidden;
}

.progress-bar {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dim));
  display: block;
  height: 100%;
}

.step-list,
.meta-list {
  display: grid;
  gap: 0.85rem;
  list-style: none;
  padding: 0;
}

.step-list li {
  align-items: start;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: auto 1fr;
}

.step-list span {
  align-items: center;
  background: rgba(163, 166, 255, 0.12);
  border: 1px solid rgba(163, 166, 255, 0.18);
  border-radius: 999px;
  color: var(--color-primary);
  display: inline-flex;
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.74rem;
  height: 1.7rem;
  justify-content: center;
  margin-top: 0.05rem;
  width: 1.7rem;
}

.step-list p,
.meta-list span,
.hint-card p {
  color: var(--color-muted);
  line-height: 1.72;
}

.hint-stack {
  display: grid;
  gap: 0.75rem;
}

.hint-card {
  display: grid;
  gap: 0.35rem;
  padding: 0.95rem 1rem;
}

.hint-card strong,
.meta-list strong {
  color: var(--color-heading);
  font-size: 0.9rem;
}

.meta-list li {
  display: grid;
  gap: 0.25rem;
}

.lesson-footer {
  align-items: center;
  background: rgba(6, 10, 19, 0.86);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1.2rem 1.35rem;
}

.footer-progress {
  display: grid;
  gap: 0.12rem;
}

.footer-progress span {
  color: var(--color-muted-strong);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.footer-progress strong {
  color: var(--color-heading);
  font-size: 1.3rem;
}

.footer-progress small {
  color: var(--color-muted);
}

.lesson-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.footer-link {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  text-decoration: none;
}

.footer-link--disabled {
  cursor: default;
  opacity: 0.55;
  pointer-events: none;
}

.next-button {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dim));
  border: 0;
  border-radius: 0.9rem;
  color: #09071d;
  font-weight: 700;
  padding: 0.92rem 1.2rem;
}

.editor-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.editor-head {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 0.9rem;
}

.editor-head-actions {
  align-items: center;
  display: flex;
  gap: 0.8rem;
}

.editor-save-state {
  color: var(--color-muted);
  font-size: 0.88rem;
}

.icon-button,
.secondary-button,
.primary-button {
  border-radius: 0.9rem;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.icon-button:hover,
.secondary-button:hover,
.primary-button:hover {
  transform: translateY(-1px);
}

.icon-button:disabled,
.secondary-button:disabled,
.primary-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.icon-button {
  background: rgba(25, 37, 64, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-heading);
  padding: 0.72rem 1rem;
}

.editor-surface {
  background: #151413;
  border-block: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 0;
  overflow: hidden;
}

.editor-footer {
  align-items: center;
  background: rgba(9, 16, 31, 0.94);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1rem 1.25rem 1.1rem;
}

.editor-footer-copy {
  display: grid;
  gap: 0.2rem;
}

.editor-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.secondary-button {
  background: rgba(25, 37, 64, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-primary);
  padding: 0.78rem 1rem;
}

.primary-button {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dim));
  border: 0;
  color: #09071d;
  padding: 0.78rem 1.15rem;
}

.monitor-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  padding: 1rem;
}

.validation-embed {
  align-self: start;
}

@media (max-width: 1380px) {
  .ide-layout {
    grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  }

  .monitor-panel {
    grid-column: 1 / -1;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1040px) {
  .ide-layout,
  .monitor-panel {
    grid-template-columns: 1fr;
  }

  .lesson-panel,
  .editor-panel,
  .monitor-panel {
    min-height: auto;
  }

  .lesson-footer,
  .editor-footer,
  .editor-head {
    align-items: start;
    flex-direction: column;
  }

  .lesson-footer-actions,
  .editor-head-actions,
  .editor-footer-actions {
    width: 100%;
  }

  .footer-link,
  .next-button,
  .secondary-button,
  .primary-button {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .lesson-scroll,
  .monitor-panel {
    padding: 1rem;
  }

  .editor-head,
  .editor-footer {
    padding-inline: 1rem;
  }

  .module-meta h1 {
    max-width: none;
  }
}
</style>
