<script setup lang="ts">
import { computed } from 'vue'

import MonacoMarkdownEditor from '@/components/MonacoMarkdownEditor.vue'
import SandboxPreview from '@/components/SandboxPreview.vue'
import ValidationChecklist from '@/components/ValidationChecklist.vue'
import { usePersistentDraft } from '@/composables/usePersistentDraft'
import { useSlidevSandbox } from '@/composables/useSlidevSandbox'
import { validateSlidevHome } from '@/lib/validation/slidevHomeValidator'
import { slidevHomeTask } from '@/tasks/slidevHomeTask'

const task = slidevHomeTask

const {
  content,
  isHydrated,
  lastSavedAt,
  resetToStarter,
  saveState,
} = usePersistentDraft(task)

const {
  canUseWebContainer,
  domSnapshot,
  ensureStarted,
  errorMessage,
  isBusy,
  logs,
  previewFrameKey,
  previewUrl,
  status,
} = useSlidevSandbox(content)

const validationReport = computed(() => validateSlidevHome(content.value, task, domSnapshot.value))
const pendingCount = computed(() => validationReport.value.totalCount - validationReport.value.completedCount)
const nextCheckpoint = computed(() => validationReport.value.items.find(item => !item.passed)?.label ?? '全部检查已通过')

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

const completionPercent = computed(() => `${Math.round(validationReport.value.completionRatio * 100)}%`)
</script>

<template>
  <div class="app-shell">
    <main class="ide-layout">
      <aside class="lesson-panel">
        <div class="lesson-scroll">
          <div class="module-meta">
            <span class="module-badge">{{ task.badge }}</span>
            <h1>{{ task.title }}</h1>
            <p>
              这是一个面向教学的 Slidev 互动首页实验台。目标不是展示一页静态页面，而是让学习者理解
              frontmatter、标题和封面布局如何一起工作。
            </p>
          </div>

          <section class="goal-card">
            <div class="goal-icon">◆</div>
            <div>
              <p class="section-kicker">The Goal</p>
              <h2>{{ task.objective }}</h2>
              <p>{{ task.summary }}</p>
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
              <li v-for="(instruction, index) in task.instructions" :key="instruction">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <p>{{ instruction }}</p>
              </li>
            </ul>
          </section>

          <section class="info-section">
            <p class="section-kicker">Hints</p>
            <div class="hint-stack">
              <article v-for="hint in task.hints" :key="hint" class="hint-card">
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
          <button type="button" class="next-button" disabled>
            下一课即将开放
          </button>
        </div>
      </aside>

      <section class="editor-panel">
        <div class="editor-head">
          <div>
            <p class="section-kicker">编辑区</p>
            <h2>封面页脚本</h2>
            <small>直接改 `slides.md`，预览区会跟着刷新。</small>
          </div>

          <div class="editor-head-actions">
            <span class="editor-save-state">{{ saveStateLabel }}</span>
            <button type="button" class="icon-button" @click="resetToStarter">
              重置
            </button>
          </div>
        </div>

        <div class="editor-surface">
          <MonacoMarkdownEditor v-model="content" />
        </div>

        <div class="editor-footer">
          <div class="editor-footer-copy">
            <strong>当前目标：{{ nextCheckpoint }}</strong>
            <small>建议先改标题和副标题，再观察预览与校验区的变化。</small>
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
  height: 100%;
}

.ide-layout {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(292px, 368px) minmax(0, 1fr) minmax(340px, 430px);
  height: 100%;
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

.next-button {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dim));
  border: 0;
  border-radius: 0.9rem;
  color: #09071d;
  font-weight: 700;
  opacity: 0.7;
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

  .editor-head-actions,
  .editor-footer-actions {
    width: 100%;
  }

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
