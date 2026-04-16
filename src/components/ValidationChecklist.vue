<script setup lang="ts">
import type { ValidationReport } from '@/lib/validation/slidevHomeValidator'

defineProps<{
  report: ValidationReport
}>()
</script>

<template>
  <section class="checklist-card">
    <div class="card-head">
      <div>
        <p class="section-kicker">Validation</p>
        <h2>AST + DOM 双重检查</h2>
      </div>
      <div class="score-chip">
        <strong>{{ report.completedCount }}/{{ report.totalCount }}</strong>
        <small>{{ Math.round(report.completionRatio * 100) }}%</small>
      </div>
    </div>

    <div class="progress-track">
      <span class="progress-fill" :style="{ width: `${Math.round(report.completionRatio * 100)}%` }" />
    </div>

    <ul class="checklist">
      <li
        v-for="item in report.items"
        :key="item.id"
        :class="['checklist-item', item.passed ? 'is-passed' : 'is-pending']"
      >
        <div class="item-row">
          <span class="status-dot" />
          <div class="item-copy">
            <div class="item-title-row">
              <h3>{{ item.label }}</h3>
              <span class="source-tag">{{ item.source.toUpperCase() }}</span>
            </div>
            <p>{{ item.description }}</p>
            <small>{{ item.detail }}</small>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.checklist-card {
  background: linear-gradient(180deg, rgba(15, 25, 48, 0.96), rgba(9, 16, 31, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1.25rem;
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.card-head {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.section-kicker {
  color: var(--color-muted-strong);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
}

.card-head h2 {
  color: var(--color-heading);
  font-family: "Space Grotesk", "Avenir Next", sans-serif;
  font-size: 1.1rem;
}

.score-chip {
  align-items: end;
  display: grid;
  justify-items: end;
}

.score-chip strong {
  color: var(--color-heading);
  font-size: 1.2rem;
}

.score-chip small {
  color: var(--color-muted);
}

.progress-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  height: 0.36rem;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-dim));
  display: block;
  height: 100%;
}

.checklist {
  display: grid;
  gap: 0.75rem;
  list-style: none;
  padding: 0;
}

.checklist-item {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 1rem;
  padding: 0.95rem;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.checklist-item:hover {
  transform: translateY(-1px);
}

.is-passed {
  background: rgba(134, 242, 187, 0.08);
  border-color: rgba(134, 242, 187, 0.28);
}

.is-pending {
  background: rgba(255, 255, 255, 0.02);
}

.item-row {
  display: flex;
  gap: 0.85rem;
}

.status-dot {
  border-radius: 999px;
  flex: 0 0 0.7rem;
  height: 0.7rem;
  margin-top: 0.45rem;
  width: 0.7rem;
}

.is-passed .status-dot {
  background: var(--color-success);
}

.is-pending .status-dot {
  background: rgba(255, 255, 255, 0.16);
}

.item-copy {
  display: grid;
  gap: 0.25rem;
}

.item-title-row {
  align-items: center;
  display: flex;
  gap: 0.6rem;
  justify-content: space-between;
}

.item-title-row h3 {
  color: var(--color-heading);
  font-size: 0.98rem;
  font-weight: 600;
}

.item-copy p,
.item-copy small {
  color: var(--color-muted);
}

.item-copy small {
  line-height: 1.45;
}

.source-tag {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: var(--color-muted);
  font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  font-size: 0.72rem;
  padding: 0.18rem 0.55rem;
}
</style>
