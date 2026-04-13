<script setup lang="ts">
import type { SandboxLogEntry } from '@/composables/useSlidevSandbox'

defineProps<{
  canUseWebContainer: boolean
  errorMessage: string | null
  isBusy: boolean
  logs: SandboxLogEntry[]
  previewFrameKey: number
  previewUrl: string | null
  status: 'idle' | 'booting' | 'installing' | 'running' | 'error'
}>()

const emit = defineEmits<{
  start: []
}>()

const statusCopy = {
  idle: '待启动',
  booting: '启动沙箱',
  installing: '安装依赖',
  running: '预览就绪',
  error: '启动失败',
}
</script>

<template>
  <section class="card preview-card">
    <div class="preview-header">
      <div>
        <p class="section-kicker">实时预览</p>
        <h2>iframe + Slidev dev server</h2>
      </div>

      <button class="ghost-button" type="button" :disabled="isBusy" @click="emit('start')">
        {{ status === 'running' ? '重新连接' : '启动预览' }}
      </button>
    </div>

    <div class="status-row">
      <span class="status-pill" :class="`status-${status}`">{{ statusCopy[status] }}</span>
      <small v-if="canUseWebContainer">首次加载会在浏览器内执行 `pnpm install`，耗时略长属于正常现象。</small>
      <small v-else>当前环境缺少 cross-origin isolation，WebContainer 无法工作。</small>
    </div>

    <p v-if="errorMessage" class="error-copy">
      {{ errorMessage }}
    </p>

    <div class="preview-frame">
      <iframe
        v-if="previewUrl"
        :key="previewFrameKey"
        :src="previewUrl"
        title="Slidev Preview"
      />

      <div v-else class="preview-placeholder">
        <strong>预览尚未就绪</strong>
        <p>沙箱启动后，这里会加载 Slidev 首页的真实渲染结果。</p>
      </div>
    </div>

    <section class="terminal-panel" aria-label="运行终端">
      <div class="terminal-head">
        <div>
          <p class="section-kicker">运行终端</p>
          <h3>pnpm / Slidev / system</h3>
        </div>
        <small>已过滤 spinner、ANSI 控制符与碎片化输出</small>
      </div>

      <div v-if="logs.length" class="terminal-body">
        <div
          v-for="log in logs"
          :key="log.id"
          class="terminal-line"
          :class="[`kind-${log.kind}`]"
        >
          <span class="terminal-time">{{ log.timestamp }}</span>
          <span class="terminal-source">{{ log.source }}</span>
          <code class="terminal-message">{{ log.message }}</code>
        </div>
      </div>

      <div v-else class="terminal-empty">
        <strong>终端尚未输出内容</strong>
        <p>启动沙箱后，这里会按行显示清洗后的安装与运行日志。</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.preview-card {
  display: grid;
  gap: 1rem;
}

.preview-header {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.section-kicker {
  color: var(--color-muted);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
}

.status-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.status-row small {
  color: var(--color-muted);
}

.status-pill {
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.28rem 0.7rem;
}

.status-idle,
.status-booting,
.status-installing {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-heading);
}

.status-running {
  background: rgba(54, 179, 126, 0.16);
  color: #72f0b0;
}

.status-error {
  background: rgba(255, 107, 107, 0.16);
  color: #ff9d9d;
}

.preview-frame {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
    rgba(6, 10, 19, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  min-height: 420px;
  overflow: hidden;
}

iframe {
  border: 0;
  display: block;
  height: 420px;
  width: 100%;
}

.preview-placeholder {
  align-content: center;
  color: var(--color-muted);
  display: grid;
  gap: 0.55rem;
  height: 420px;
  justify-items: center;
  padding: 1.5rem;
  text-align: center;
}

.preview-placeholder strong {
  color: var(--color-heading);
  font-size: 1.1rem;
}

.terminal-panel {
  background:
    linear-gradient(180deg, rgba(18, 24, 38, 0.96), rgba(10, 14, 24, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  display: grid;
  overflow: hidden;
}

.terminal-head {
  align-items: start;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 1rem 1rem 0.9rem;
}

.terminal-head h3 {
  color: var(--color-heading);
  font-size: 1rem;
  font-weight: 600;
}

.terminal-head small {
  color: var(--color-muted);
  line-height: 1.5;
  max-width: 24ch;
  text-align: right;
}

.terminal-body {
  display: grid;
  gap: 0.45rem;
  max-height: 300px;
  overflow: auto;
  padding: 1rem;
}

.terminal-line {
  align-items: start;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: auto auto minmax(0, 1fr);
  padding: 0.3rem 0;
}

.terminal-time {
  color: #6e7f9c;
  font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.74rem;
  white-space: nowrap;
}

.terminal-source {
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #d2def5;
  display: inline-flex;
  font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.72rem;
  justify-content: center;
  min-width: 4.75rem;
  padding: 0.12rem 0.5rem;
  text-transform: lowercase;
}

.terminal-message {
  color: #b8f4db;
  font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.kind-command .terminal-message {
  color: #8fc5ff;
}

.kind-success .terminal-message {
  color: #7ef0b7;
}

.kind-error .terminal-message {
  color: #ffadad;
}

.terminal-empty {
  color: var(--color-muted);
  display: grid;
  gap: 0.5rem;
  padding: 1.25rem 1rem 1.35rem;
}

.terminal-empty strong {
  color: var(--color-heading);
}

.error-copy {
  color: #ffb6b6;
  line-height: 1.6;
}

.ghost-button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-heading);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0.68rem 1rem;
}

.ghost-button:disabled {
  cursor: wait;
  opacity: 0.6;
}
</style>
