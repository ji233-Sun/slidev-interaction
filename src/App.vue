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
  previewUrl,
  status,
} = useSlidevSandbox(content)

const validationReport = computed(() => validateSlidevHome(content.value, task, domSnapshot.value))

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
    <header class="hero">
      <div class="hero-copy">
        <span class="hero-badge">{{ task.badge }}</span>
        <h1>Slidev 首页实验台</h1>
        <p class="hero-summary">
          这是一个面向教学的 Slidev 互动首页 MVP。当前课程只聚焦一件事：带着学习者做出第一张能开场的首页。
        </p>
      </div>

      <div class="hero-metrics">
        <article class="metric-card">
          <span>当前任务</span>
          <strong>{{ task.title }}</strong>
          <small>{{ task.summary }}</small>
        </article>
        <article class="metric-card">
          <span>完成进度</span>
          <strong>{{ completionPercent }}</strong>
          <small>{{ validationReport.completedCount }}/{{ validationReport.totalCount }} 项已通过</small>
        </article>
        <article class="metric-card">
          <span>本地状态</span>
          <strong>{{ saveStateLabel }}</strong>
          <small>草稿优先保存到 IndexedDB，异常时回退到 localStorage。</small>
        </article>
      </div>
    </header>

    <main class="workspace-grid">
      <aside class="card sidebar-card">
        <p class="section-kicker">任务说明</p>
        <h2>{{ task.objective }}</h2>
        <p class="sidebar-lead">
          学习者需要理解 frontmatter、cover 布局、标题和副标题之间的关系。这个 MVP 先把首页闭环打通，后续再扩展到更多页面与任务。
        </p>

        <section class="sidebar-section">
          <h3>你要完成的动作</h3>
          <ul class="ordered-list">
            <li v-for="instruction in task.instructions" :key="instruction">
              {{ instruction }}
            </li>
          </ul>
        </section>

        <section class="sidebar-section">
          <h3>提示</h3>
          <ul class="tip-list">
            <li v-for="hint in task.hints" :key="hint">
              {{ hint }}
            </li>
          </ul>
        </section>
      </aside>

      <section class="editor-column">
        <div class="card editor-toolbar">
          <div>
            <p class="section-kicker">编辑区</p>
            <h2>slides.md</h2>
          </div>

          <div class="toolbar-actions">
            <span class="toolbar-meta">{{ saveStateLabel }}</span>
            <button type="button" class="secondary-button" @click="resetToStarter">
              还原起始代码
            </button>
          </div>
        </div>

        <div class="card editor-card">
          <MonacoMarkdownEditor v-model="content" />
        </div>
      </section>

      <section class="preview-column">
        <SandboxPreview
          :can-use-web-container="canUseWebContainer"
          :error-message="errorMessage"
          :is-busy="isBusy"
          :logs="logs"
          :preview-url="previewUrl"
          :status="status"
          @start="ensureStarted"
        />

        <ValidationChecklist :report="validationReport" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  gap: 1.5rem;
}

.hero {
  align-items: stretch;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
}

.hero-copy,
.metric-card,
.card {
  backdrop-filter: blur(18px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(8, 11, 20, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  box-shadow: 0 18px 70px rgba(5, 8, 15, 0.35);
}

.hero-copy {
  display: grid;
  gap: 1rem;
  padding: 2rem;
}

.hero-badge {
  align-items: center;
  background: rgba(77, 175, 124, 0.14);
  border: 1px solid rgba(77, 175, 124, 0.3);
  border-radius: 999px;
  color: #94f0b4;
  display: inline-flex;
  font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  padding: 0.4rem 0.75rem;
  text-transform: uppercase;
  width: fit-content;
}

.hero-copy h1 {
  color: var(--color-heading);
  font-size: clamp(2.5rem, 4vw, 4.3rem);
  line-height: 0.96;
  max-width: 12ch;
}

.hero-summary {
  color: var(--color-muted);
  font-size: 1.02rem;
  line-height: 1.75;
  max-width: 58ch;
}

.hero-metrics {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
  align-content: start;
  display: grid;
  gap: 0.55rem;
  padding: 1.35rem;
}

.metric-card span {
  color: var(--color-muted);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.metric-card strong {
  color: var(--color-heading);
  font-size: 1.1rem;
  line-height: 1.4;
}

.metric-card small {
  color: var(--color-muted);
  line-height: 1.6;
}

.workspace-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr) minmax(360px, 440px);
}

.card {
  padding: 1.35rem;
}

.sidebar-card {
  align-content: start;
  display: grid;
  gap: 1.1rem;
}

.section-kicker {
  color: var(--color-muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sidebar-card h2,
.editor-toolbar h2 {
  color: var(--color-heading);
  font-size: 1.35rem;
}

.sidebar-lead {
  color: var(--color-muted);
  line-height: 1.75;
}

.sidebar-section {
  display: grid;
  gap: 0.75rem;
}

.sidebar-section h3 {
  color: var(--color-heading);
  font-size: 0.98rem;
}

.ordered-list,
.tip-list {
  color: var(--color-muted);
  display: grid;
  gap: 0.7rem;
  line-height: 1.65;
  padding-left: 1.15rem;
}

.editor-column,
.preview-column {
  display: grid;
  gap: 1rem;
}

.editor-toolbar {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.toolbar-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

.toolbar-meta {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.secondary-button {
  background: linear-gradient(135deg, rgba(125, 169, 255, 0.18), rgba(125, 169, 255, 0.08));
  border: 1px solid rgba(125, 169, 255, 0.32);
  border-radius: 999px;
  color: var(--color-heading);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0.72rem 1rem;
}

.editor-card {
  min-height: 560px;
  padding: 0;
  overflow: hidden;
}

@media (max-width: 1280px) {
  .hero,
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .hero-copy,
  .metric-card,
  .card {
    border-radius: 22px;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .editor-toolbar {
    align-items: start;
    flex-direction: column;
  }

  .toolbar-actions {
    justify-content: start;
  }
}
</style>
