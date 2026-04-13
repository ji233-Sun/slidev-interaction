<script setup lang="ts">
import type { ValidationReport } from '@/lib/validation/slidevHomeValidator'

defineProps<{
  report: ValidationReport
}>()
</script>

<template>
  <section class="card checklist-card">
    <div class="card-head">
      <div>
        <p class="section-kicker">校验结果</p>
        <h2>AST + DOM 双重检查</h2>
      </div>
      <strong>{{ report.completedCount }}/{{ report.totalCount }}</strong>
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
  display: grid;
  gap: 1rem;
}

.card-head {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.card-head strong {
  color: var(--color-heading);
  font-size: 1.3rem;
}

.section-kicker {
  color: var(--color-muted);
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
}

.checklist {
  display: grid;
  gap: 0.85rem;
  list-style: none;
  padding: 0;
}

.checklist-item {
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.checklist-item:hover {
  transform: translateY(-1px);
}

.is-passed {
  border-color: rgba(54, 179, 126, 0.55);
  background: rgba(54, 179, 126, 0.08);
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
  background: rgba(255, 255, 255, 0.18);
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
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  font-family: "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;
  font-size: 0.72rem;
  padding: 0.18rem 0.55rem;
}
</style>
