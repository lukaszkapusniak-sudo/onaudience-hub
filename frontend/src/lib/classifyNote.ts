/** Mirrors `www/hub/utils.js` `classify` for company `type` when missing. */
export function classifyNote(note: string | null | undefined): string {
  const s = (note || '').toLowerCase();
  if (
    s.includes('no outreach') ||
    s.includes('no fit') ||
    s.includes('no business') ||
    s.includes('internal') ||
    s.includes('closed') ||
    s.includes('unwanted')
  )
    return 'nogo';
  if (s.includes('poc client')) return 'poc';
  if (s.includes('client')) return 'client';
  if (s.includes('partner')) return 'partner';
  if (s.includes('prospect') || s.includes('to check') || s.includes('to continue'))
    return 'prospect';
  return 'partner';
}
