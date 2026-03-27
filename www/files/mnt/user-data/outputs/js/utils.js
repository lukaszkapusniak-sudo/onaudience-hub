/* ═══════════════════════════════════════════════════════════════
   utils.js — Shared utility functions
   ═══════════════════════════════════════════════════════════════ */

import { TYPE_CLS, TYPE_COLOR } from './config.js';

/* ── Slug — canonical company ID ────────────────────────────── */
export function _slug(n) {
  return (n || '')
    .replace(/\s+(Ltd|Inc|LLC|S\.A\.|GmbH|Corp|B\.V\.|AG|PLC|SAS)\.?$/i, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ── Classify note text → type ──────────────────────────────── */
export function classify(note) {
  if (!note) return 'prospect';
  const n = note.toLowerCase();
  if (n.includes('client') || n.includes('active'))  return 'client';
  if (n.includes('partner') || n.includes('integ'))  return 'partner';
  if (n.includes('nogo') || n.includes('no-go'))     return 'nogo';
  if (n.includes('poc'))                              return 'poc';
  return 'prospect';
}

/* ── Tag class for type ──────────────────────────────────────── */
export function tagCls(type) {
  return TYPE_CLS[type] || 'tpr';
}

/* ── Avatar color for type ───────────────────────────────────── */
export function avatarColor(type) {
  return TYPE_COLOR[type] || '#7A4200';
}

/* ── Avatar initials ─────────────────────────────────────────── */
export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ── Escape HTML ─────────────────────────────────────────────── */
export function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/* ── Relative time ───────────────────────────────────────────── */
export function relTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' });
}

/* ── Debounce ────────────────────────────────────────────────── */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── ICP stars ───────────────────────────────────────────────── */
export function icpStars(n) {
  if (!n) return '';
  const full = Math.round(n / 2);
  return '⭐'.repeat(full);
}

/* ── Open Claude with prompt ─────────────────────────────────── */
export function openClaude(prompt) {
  const url = 'https://claude.ai/new?q=' + encodeURIComponent(prompt);
  window.open(url, '_blank');
}
