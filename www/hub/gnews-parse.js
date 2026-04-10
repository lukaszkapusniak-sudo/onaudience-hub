/**
 * Google News RSS → press rows (same shape as legacy DOMParser path in api.js).
 * Pure string parsing so it can run in a Web Worker (no DOMParser there).
 */

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').trim();
}

function getInnerTag(block, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  let inner = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  inner = decodeXmlEntities(stripTags(inner.trim()));
  return inner;
}

function cleanTitle(raw) {
  return raw.replace(/ - [^-]+$/, '').trim();
}

function extractLinkUrl(block) {
  const rest1 = block;
  const m = rest1.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (!m) return '';
  const inner = decodeXmlEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')).trim();
  if (inner) return inner;
  const idx = rest1.indexOf(m[0]);
  if (idx === -1) return '';
  const afterClose = rest1.slice(idx + m[0].length);
  const urlTok = afterClose.match(/^[\s\n\r]*(\S+)/);
  if (urlTok && /^https?:\/\//.test(urlTok[1])) return urlTok[1];
  return '';
}

function formatPubDate(dateRaw) {
  if (!dateRaw) return '';
  const d = new Date(dateRaw.trim());
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

/**
 * @param {string} xml
 * @returns {Array<{ title: string, url: string, source: string, date: string, link_type: string, summary: string }>}
 */
export function parseGoogleNewsRss(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const t = xml.trim();
  if (t.startsWith('<!DOCTYPE html') || (t.includes('<html') && !t.includes('<rss'))) {
    return [];
  }
  const items = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null && items.length < 10) {
    const block = m[1];
    const rawTitle = getInnerTag(block, 'title');
    const title = cleanTitle(rawTitle);
    const url = extractLinkUrl(block);
    let source = getInnerTag(block, 'source') || 'Google News';
    if (!source || source === '') source = 'Google News';
    const dateRaw = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const date = formatPubDate(
      dateRaw ? dateRaw[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '',
    );
    if (title && url) {
      items.push({
        title,
        url,
        source,
        date,
        link_type: 'press',
        summary: '',
      });
    }
  }
  return items;
}
