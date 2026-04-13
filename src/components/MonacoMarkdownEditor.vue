<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js'

const props = withDefaults(defineProps<{
  language?: string
  modelValue: string
}>(), {
  language: 'markdown',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let changeSubscription: monaco.IDisposable | null = null

const monacoEnvironment = self as typeof self & {
  MonacoEnvironment?: {
    getWorker: (_workerId: string, label: string) => Worker
  }
}

monacoEnvironment.MonacoEnvironment = {
  getWorker(_workerId, label) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker()
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      default:
        return new editorWorker()
    }
  },
}

onMounted(() => {
  if (!containerRef.value) {
    return
  }

  editor = monaco.editor.create(containerRef.value, {
    automaticLayout: true,
    fontFamily: '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace',
    fontLigatures: true,
    fontSize: 14,
    language: props.language,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    padding: {
      top: 20,
      bottom: 20,
    },
    roundedSelection: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
    theme: 'vs-dark',
    value: props.modelValue,
    wordWrap: 'on',
  })

  changeSubscription = editor.onDidChangeModelContent(() => {
    if (!editor) {
      return
    }

    emit('update:modelValue', editor.getValue())
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || editor.getValue() === value) {
      return
    }

    editor.setValue(value)
  },
)

onBeforeUnmount(() => {
  changeSubscription?.dispose()
  editor?.dispose()
})
</script>

<template>
  <div ref="containerRef" class="monaco-editor-host" />
</template>

<style scoped>
.monaco-editor-host {
  min-height: 460px;
  width: 100%;
}
</style>
