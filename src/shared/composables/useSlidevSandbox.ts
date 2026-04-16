import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { WebContainer } from '@webcontainer/api'
import type { FileSystemTree, WebContainer as WebContainerInstance, WebContainerProcess } from '@webcontainer/api'
import type { Ref } from 'vue'

import type { PreviewDomSnapshot } from '@/shared/lib/validation/types'
import { buildFileSystemTree } from '@/shared/lib/sandbox/buildFileSystemTree'

const DEV_SERVER_PORT = 3030
const PREVIEW_SOURCE = 'slidev-interaction-preview'
const LOG_LIMIT = 120
const ANSI_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g
const BACKSPACE_PATTERN = /[^\n]\u0008/g
const CONTROL_CODE_FRAGMENT_PATTERN = /(^|\s)\[(?:\?25[hl]|\d+(?:;\d+)*)[A-Za-z](?=\s|$)/g
const SPINNER_PATTERN = /^[|/\\-]$/

type SandboxStatus = 'idle' | 'booting' | 'installing' | 'running' | 'error'
type SandboxLogSource = 'system' | 'pnpm' | 'slidev'
type SandboxLogKind = 'info' | 'success' | 'error' | 'command'

let bootPromise: Promise<WebContainerInstance> | null = null

export interface SandboxLogEntry {
  id: string
  kind: SandboxLogKind
  message: string
  source: SandboxLogSource
  timestamp: string
}

function createSandboxPackageJson() {
  return JSON.stringify(
    {
      name: 'slidev-playground',
      private: true,
      packageManager: 'pnpm@10.33.0',
      type: 'module',
      scripts: {
        dev: `slidev slides.md --bind 0.0.0.0 --port ${DEV_SERVER_PORT} --remote --log warn`,
        build: 'slidev build',
      },
      devDependencies: {
        '@slidev/cli': 'latest',
        '@slidev/client': 'latest',
        '@slidev/theme-default': 'latest',
        vue: 'latest',
      },
    },
    null,
    2,
  )
}

function createGlobalBottomComponent() {
  return `<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useNav } from '@slidev/client'

const { currentPage } = useNav()
let observer: MutationObserver | null = null

async function emitDomReport() {
  if (typeof window === 'undefined') {
    return
  }

  await nextTick()

  const root =
    document.querySelector('.slidev-layout')
    ?? document.querySelector('.slidev-page')
    ?? document.body

  const headings = Array.from(root.querySelectorAll('h1, h2, h3'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 6)

  const paragraphs = Array.from(root.querySelectorAll('p'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 8)

  window.parent?.postMessage(
    {
      source: '${PREVIEW_SOURCE}',
      type: 'dom-report',
      payload: {
        headings,
        paragraphs,
        currentPage: currentPage.value,
        capturedAt: new Date().toISOString(),
      },
    },
    '*',
  )
}

onMounted(() => {
  void emitDomReport()

  observer = new MutationObserver(() => {
    void emitDomReport()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
})

watch(currentPage, () => {
  void emitDomReport()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div aria-hidden="true" class="slidev-dom-probe" />
</template>

<style scoped>
.slidev-dom-probe {
  display: none;
}
</style>
`
}

function createSandboxFiles(files: Record<string, string>): FileSystemTree {
  return buildFileSystemTree({
    'package.json': createSandboxPackageJson(),
    'global-bottom.vue': createGlobalBottomComponent(),
    ...files,
  })
}

function getWebContainer() {
  if (!bootPromise) {
    bootPromise = WebContainer.boot()
  }

  return bootPromise
}

export function useSlidevSandbox(
  files: Ref<Record<string, string>>,
  entryFile: Ref<string>,
) {
  const canUseWebContainer = typeof window !== 'undefined' && window.crossOriginIsolated

  const logs = ref<SandboxLogEntry[]>([])
  const previewFrameKey = ref(0)
  const previewUrl = ref<string | null>(null)
  const status = ref<SandboxStatus>('idle')
  const errorMessage = ref<string | null>(null)
  const domSnapshot = ref<PreviewDomSnapshot | null>(null)

  let container: WebContainerInstance | null = null
  let devProcess: WebContainerProcess | null = null
  let dependenciesInstalled = false
  let startPromise: Promise<void> | null = null
  let syncTimer: number | null = null
  let projectMounted = false
  let serverListenerAttached = false

  const isBusy = computed(() => status.value === 'booting' || status.value === 'installing')

  function createTimestamp() {
    return new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function appendLog(source: SandboxLogSource, message: string, kind: SandboxLogKind = 'info') {
    const normalizedMessage = message.trim()

    if (!normalizedMessage) {
      return
    }

    const lastEntry = logs.value.at(-1)

    if (lastEntry && lastEntry.source === source && lastEntry.message === normalizedMessage) {
      return
    }

    logs.value = [
      ...logs.value,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        message: normalizedMessage,
        source,
        timestamp: createTimestamp(),
      },
    ].slice(-LOG_LIMIT)
  }

  function refreshPreviewFrame() {
    previewFrameKey.value += 1
  }

  function sanitizeTerminalChunk(chunk: string) {
    let sanitized = chunk.replace(ANSI_PATTERN, '')

    while (BACKSPACE_PATTERN.test(sanitized)) {
      sanitized = sanitized.replace(BACKSPACE_PATTERN, '')
    }

    return sanitized.replace(/\u0000/g, '')
  }

  function normalizeTerminalLine(rawLine: string) {
    return rawLine
      .replace(CONTROL_CODE_FRAGMENT_PATTERN, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function detectLogKind(message: string): SandboxLogKind {
    const normalized = message.toLowerCase()

    if (
      normalized.includes('error')
      || normalized.includes('failed')
      || normalized.includes('err_')
      || normalized.includes('cannot')
    ) {
      return 'error'
    }

    if (
      normalized.includes('done in')
      || normalized.includes('ready in')
      || normalized.includes('server ready')
      || normalized.includes('local:')
    ) {
      return 'success'
    }

    if (normalized.startsWith('$ ') || normalized.startsWith('> ')) {
      return 'command'
    }

    return 'info'
  }

  function transformTerminalLine(source: SandboxLogSource, line: string) {
    if (!line || SPINNER_PATTERN.test(line) || /^\++$/.test(line)) {
      return null
    }

    if (line.startsWith('Progress:')) {
      return null
    }

    if (line === 'dependencies:' || line === 'devDependencies:' || line === '.') {
      return null
    }

    if (/^[├└│]/.test(line) || /^\+\s/.test(line)) {
      return null
    }

    if (/^Packages:\s+\+\d+/.test(line)) {
      return {
        kind: 'info' as const,
        message: '正在写入并链接依赖包...',
      }
    }

    if (line.startsWith('WARN Issues with peer dependencies found')) {
      return {
        kind: 'info' as const,
        message: '检测到 peer dependency 警告，当前预览通常不受影响。',
      }
    }

    if (source === 'slidev' && line.startsWith('[oxc-parser] Downloading')) {
      return {
        kind: 'info' as const,
        message: 'Slidev 首次运行，正在下载 oxc parser 运行时。',
      }
    }

    if (line.startsWith('> slidev-playground@ dev') || line.startsWith('> slidev slides.md')) {
      return null
    }

    return {
      kind: detectLogKind(line),
      message: line,
    }
  }

  function attachProcessOutput(process: WebContainerProcess, source: SandboxLogSource) {
    let bufferedOutput = ''

    void process.output.pipeTo(
      new WritableStream({
        write(chunk) {
          bufferedOutput += sanitizeTerminalChunk(chunk)

          const segments = bufferedOutput.split(/\r?\n|\r/g)
          bufferedOutput = segments.pop() ?? ''

          for (const segment of segments) {
            const line = normalizeTerminalLine(segment)
            const transformed = transformTerminalLine(source, line)

            if (!transformed) {
              continue
            }

            appendLog(source, transformed.message, transformed.kind)
          }
        },
        close() {
          const line = normalizeTerminalLine(bufferedOutput)
          const transformed = transformTerminalLine(source, line)

          if (!transformed) {
            return
          }

          appendLog(source, transformed.message, transformed.kind)
        },
      }),
    )
  }

  async function syncWorkspaceFiles(nextFiles: Record<string, string>) {
    if (!container) {
      return
    }

    for (const [path, contents] of Object.entries(nextFiles)) {
      await container.fs.writeFile(path, contents)
    }
  }

  async function syncSandboxSupportFiles() {
    if (!container) {
      return
    }

    await container.fs.writeFile('/package.json', createSandboxPackageJson())
    await container.fs.writeFile('/global-bottom.vue', createGlobalBottomComponent())
  }

  function watchDevProcess(process: WebContainerProcess) {
    devProcess = process

    void process.exit.then((exitCode) => {
      if (devProcess !== process) {
        return
      }

      devProcess = null

      if (exitCode === 0) {
        status.value = 'idle'
        appendLog('system', 'Slidev dev server 已停止。')
        return
      }

      status.value = 'error'
      errorMessage.value = `Slidev dev server 异常退出（code ${exitCode}）。`
      appendLog('system', errorMessage.value, 'error')
    })
  }

  async function ensureStarted() {
    if (!canUseWebContainer) {
      status.value = 'error'
      errorMessage.value = '当前页面没有启用 cross-origin isolation，WebContainer 无法启动。'
      return
    }

    if (status.value === 'running' || isBusy.value) {
      return
    }

    if (startPromise) {
      return startPromise
    }

    startPromise = (async () => {
      try {
        status.value = 'booting'
        errorMessage.value = null
        logs.value = []
        appendLog('system', '正在启动 WebContainer。')

        container = await getWebContainer()

        if (!serverListenerAttached) {
          container.on('server-ready', (_port, url) => {
            previewUrl.value = url
            status.value = 'running'
            appendLog('system', `Slidev 预览服务已就绪：${url}`, 'success')
          })

          serverListenerAttached = true
        }

        if (!projectMounted) {
          await container.mount(createSandboxFiles(files.value))
          projectMounted = true
          appendLog('system', '已挂载内置 Slidev 工程文件。', 'success')
        }
        else {
          await syncSandboxSupportFiles()
          await syncWorkspaceFiles(files.value)
          appendLog('system', '已刷新沙箱配置文件。')
        }

        if (!dependenciesInstalled) {
          status.value = 'installing'
          appendLog('system', '首次启动会在浏览器内安装 Slidev 依赖，请稍等。')
          appendLog('pnpm', '$ pnpm install --reporter=append-only --color=never', 'command')

          const installProcess = await container.spawn('pnpm', ['install', '--reporter=append-only', '--color=never'])
          attachProcessOutput(installProcess, 'pnpm')

          const installExitCode = await installProcess.exit

          if (installExitCode !== 0) {
            throw new Error('pnpm install 执行失败。')
          }

          dependenciesInstalled = true
        }

        appendLog('system', '依赖安装完成，正在启动 Slidev dev server。', 'success')
        appendLog('slidev', '$ pnpm dev', 'command')
        const process = await container.spawn('pnpm', ['dev'])
        attachProcessOutput(process, 'slidev')
        watchDevProcess(process)

        await syncWorkspaceFiles({
          [entryFile.value]: files.value[entryFile.value] ?? '',
        })
      }
      catch (error) {
        status.value = 'error'
        errorMessage.value = error instanceof Error ? error.message : 'WebContainer 启动失败。'
        appendLog('system', errorMessage.value, 'error')
      }
      finally {
        startPromise = null
      }
    })()

    return startPromise
  }

  function handlePreviewMessage(event: MessageEvent<{
    source?: string
    type?: string
    payload?: PreviewDomSnapshot
  }>) {
    if (event.data?.source !== PREVIEW_SOURCE || event.data.type !== 'dom-report' || !event.data.payload) {
      return
    }

    domSnapshot.value = event.data.payload
  }

  onMounted(() => {
    window.addEventListener('message', handlePreviewMessage)
    void ensureStarted()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', handlePreviewMessage)

    if (syncTimer !== null) {
      window.clearTimeout(syncTimer)
    }
  })

  watch(files, (value) => {
    if (!projectMounted) {
      return
    }

    if (syncTimer !== null) {
      window.clearTimeout(syncTimer)
    }

    syncTimer = window.setTimeout(() => {
      void syncWorkspaceFiles(value)
      appendLog('system', '已同步课程工作区到 WebContainer。')
      refreshPreviewFrame()

      if (!devProcess && !isBusy.value) {
        appendLog('system', '检测到 Slidev 进程未运行，正在尝试重启。')
        void ensureStarted()
      }
    }, 350)
  }, { deep: true })

  return {
    canUseWebContainer,
    domSnapshot,
    ensureStarted,
    errorMessage,
    isBusy,
    logs,
    previewFrameKey,
    previewUrl,
    status,
  }
}
