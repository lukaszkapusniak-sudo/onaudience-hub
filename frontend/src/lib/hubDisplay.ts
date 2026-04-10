/** Avatar palette — same algorithm as `www/hub/config.js` `PAL` + `getAv`. */
const PAL = [
  { bg: 'rgba(23,128,102,0.1)', fg: '#0F6E56' },
  { bg: 'rgba(26,79,138,0.1)', fg: '#1A4F8A' },
  { bg: 'rgba(122,66,0,0.1)', fg: '#7A4200' },
  { bg: 'rgba(75,45,158,0.1)', fg: '#4B2D9E' },
  { bg: 'rgba(107,107,100,0.1)', fg: '#6B6B64' },
] as const;

export function getAvatarColors(name: string): { bg: string; fg: string } {
  let h = 0;
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PAL[h % PAL.length];
}

/** Up to two initials — matches `www/hub/utils.js` `ini`. */
export function contactInitials(name: string): string {
  if (!name) return '?';
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return (
    words
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function escHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  const t = typeof s === 'string' ? s : String(s);
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatLemlistDate(ts: string): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}
