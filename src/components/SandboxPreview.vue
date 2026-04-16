<script setup lang="ts">
import { computed } from 'vue'

import type { SandboxLogEntry } from '@/shared/composables/useSlidevSandbox'

const props = defineProps<{
  canUseWebContainer: boolean
  errorMessage: string | null
  logs: SandboxLogEntry[]
  previewFrameKey: number
  previewUrl: string | null
  status: 'idle' | 'booting' | 'installing' | 'running' | 'error'
}>()

const latestLog = computed(() => props.logs.at(-1) ?? null)

const previewPlaceholder = computed(() => {
  if (!props.canUseWebContainer) {
    return {
      title: '预览不可用',
      description: '当前环境未启用 cross-origin isolation，暂时无法运行 WebContainer。',
    }
  }

  if (props.errorMessage) {
    return {
      title: '预览启动失败',
      description: props.errorMessage,
    }
  }

  if (props.status === 'booting' || props.status === 'installing') {
    return {
      title: '正在准备预览',
      description: 'WebContainer 与 Slidev 正在启动，请稍候。',
    }
  }

  if (props.status === 'running') {
    return {
      title: '预览刷新中',
      description: '正在重新连接 Slidev 预览窗口。',
    }
  }

  return {
    title: '等待启动预览',
    description: '在编辑区点击“启动预览”后，这里会显示 Slidev 首页。',
  }
})
</script>

<template>
  <section class="preview-card">
    <section class="preview-window">
      <div class="window-header">
        <p class="section-kicker">Live Preview</p>
      </div>

      <div class="preview-stage">
        <div class="preview-grid" aria-hidden="true" />
        <div class="preview-frame">
          <iframe
            v-if="previewUrl"
            :key="previewFrameKey"
            :src="previewUrl"
            title="Slidev Preview"
          />

          <div v-else class="preview-placeholder">
            <strong>{{ previewPlaceholder.title }}</strong>
            <p>{{ previewPlaceholder.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="terminal-panel" aria-label="运行终端">
      <div class="terminal-head">
        <p class="section-kicker">Console Output</p>
      </div>

      <div v-if="latestLog" class="terminal-body terminal-body-single">
        <div
          :key="latestLog.id"
          class="terminal-line terminal-line-single"
          :class="[`kind-${latestLog.kind}`]"
        >
          <span class="terminal-time">{{ latestLog.timestamp }}</span>
          <span class="terminal-source">[{{ latestLog.source }}]</span>
          <code class="terminal-message" :title="latestLog.message">{{ latestLog.message }}</code>
        </div>
      </div>

      <div v-else class="terminal-empty">
        <strong>终端尚未输出内容</strong>
        <p>启动预览后，这里只展示最新一条运行日志。</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

.preview-window,
.terminal-panel {
  background: linear-gradient(180deg, rgba(15, 25, 48, 0.96), rgba(9, 16, 31, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem;
  overflow: hidden;
}

.preview-window {
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.window-header {
  align-items: center;
  display: flex;
  padding: 1rem 1rem 0.45rem;
}

.section-kicker {
  color: var(--color-muted-strong);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
}

.preview-stage {
  display: flex;
  justify-content: center;
  min-height: 0;
  overflow: auto;
  padding: 0 1rem 1rem;
  position: relative;
}

.preview-grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(163, 166, 255, 0.18) 1px, transparent 0);
  background-size: 20px 20px;
  inset: 0 1rem 1rem;
  opacity: 0.12;
  pointer-events: none;
  position: absolute;
}

.preview-frame {
  backdrop-filter: blur(12px);
  background: rgba(25, 37, 64, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.35rem;
  aspect-ratio: 9 / 16;
  height: auto;
  min-height: 360px;
  overflow: hidden;
  position: relative;
  width: 100%;
  z-index: 1;
}

iframe {
  background: #0a0f1c;
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
}

.preview-placeholder {
  align-content: center;
  color: var(--color-muted);
  display: grid;
  gap: 0.55rem;
  height: 100%;
  justify-items: center;
  padding: 1.5rem;
  text-align: center;
}

.preview-placeholder strong {
  color: var(--color-heading);
  font-size: 1.1rem;
}

.terminal-panel {
  background: linear-gradient(180deg, rgba(7, 11, 20, 0.98), rgba(2, 5, 12, 0.98));
  display: grid;
  flex: 0 0 clamp(88px, 14vh, 132px);
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.terminal-head {
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 1rem;
  padding: 0.95rem 1rem;
}

.terminal-body {
  display: grid;
  min-height: 0;
  gap: 0.45rem;
  padding: 0.9rem 1rem 1rem;
}

.terminal-body-single {
  max-height: none;
  overflow: hidden;
}

.terminal-line {
  align-items: start;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: auto auto minmax(0, 1fr);
  padding: 0.3rem 0;
}

.terminal-line-single {
  align-items: center;
}

.terminal-time {
  color: #6e7f9c;
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.74rem;
  white-space: nowrap;
}

.terminal-source {
  color: #d2def5;
  display: inline-flex;
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
}

.terminal-message {
  color: #d6deff;
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kind-command .terminal-message {
  color: var(--color-primary);
}

.kind-success .terminal-message {
  color: #86f2bb;
}

.kind-error .terminal-message {
  color: #ffadad;
}

.terminal-empty {
  color: var(--color-muted);
  display: grid;
  gap: 0.5rem;
  padding: 0.9rem 1rem 1rem;
}

.ghost-button {
  background: rgba(25, 37, 64, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.9rem;
  color: var(--color-heading);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0.7rem 1rem;
}

.ghost-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media (max-width: 1040px) {
  .preview-frame {
    aspect-ratio: 10 / 15;
  }

  .terminal-panel {
    flex-basis: clamp(84px, 12vh, 116px);
  }
}
</style>
