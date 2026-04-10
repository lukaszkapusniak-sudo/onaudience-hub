<script setup lang="ts">
const year = new Date().getFullYear();
const hubEntry = `${import.meta.env.BASE_URL}hub/index.html`;
</script>

<template>
  <div class="home">
    <header class="hero">
      <p class="eyebrow">onAudience</p>
      <h1>Sales Intelligence Hub</h1>
      <p class="lead">
        Vue + Vite + TypeScript shell. The legacy hub remains available under
        <code>/hub/</code> until modules are ported here.
      </p>
      <nav class="actions">
        <a class="btn primary" :href="hubEntry"> Open legacy hub </a>
      </nav>
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
.lead code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
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
.foot {
  margin-top: auto;
  padding-top: 3rem;
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
