<script setup lang="ts">
import { RouterLink } from 'vue-router';

const year = new Date().getFullYear();
const hubRoot = `${import.meta.env.BASE_URL}`;
</script>

<template>
  <div class="home">
    <header class="hero">
      <p class="eyebrow">onAudience</p>
      <h1>Sales Intelligence Hub</h1>
      <p class="lead">
        Production shell is <strong>Vue + Vite + TypeScript</strong>. The product UI still loads the
        legacy hub module bundle inside a same-origin frame while we port features into
        <code>frontend/src/</code>.
      </p>
      <nav class="actions">
        <RouterLink class="btn primary" to="/"> Open hub (Vue shell) </RouterLink>
        <RouterLink class="btn ghost" to="/data"> Companies (Vue data) </RouterLink>
        <RouterLink class="btn ghost" to="/lemlist"> Lemlist (Vue) </RouterLink>
        <RouterLink class="btn ghost" to="/migrate"> Migration roadmap </RouterLink>
        <RouterLink class="btn ghost" to="/demo/contact-drawer"> Contact drawer (Vue) </RouterLink>
      </nav>
      <p class="hint">
        Root <code>{{ hubRoot }}</code> embeds <code>hub/index.html</code> — OAuth returns here
        first; session storage matches the legacy app.
      </p>
    </header>
    <footer class="foot">© {{ year }} · built with Vite</footer>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: radial-gradient(ellipse at top, #0f1419 0%, #0a0c0f 50%);
  color: #e8eaed;
}
.hero {
  max-width: 36rem;
  text-align: center;
}
.eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7dd3fc;
  margin: 0 0 0.75rem;
}
h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 1rem;
  line-height: 1.2;
}
.lead {
  margin: 0 0 1.5rem;
  line-height: 1.55;
  color: #b8bcc4;
  font-size: 0.95rem;
}
.lead strong {
  color: #e8eaed;
  font-weight: 600;
}
.lead code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
}
.hint {
  margin: 1.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #6b7280;
}
.hint code {
  font-size: 0.85em;
}
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e8eaed;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn.primary {
  background: #2563eb;
  border-color: #3b82f6;
  color: #fff;
}
.btn.primary:hover {
  background: #1d4ed8;
}
.btn.ghost {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.2);
}
.btn.ghost:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.05);
}
.foot {
  margin-top: auto;
  padding-top: 3rem;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
