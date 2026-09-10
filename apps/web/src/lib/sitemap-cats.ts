export interface SitemapCat {
  slugCa: string;
  slugEs: string;
  updatedAt: string;
}

/**
 * Escape the five XML-significant characters. Slugs and updatedAt are
 * volunteer/CMS-controlled data interpolated straight into XML text nodes
 * and attribute values below -- an apostrophe or ampersand in a slug would
 * otherwise produce invalid XML (or, in an attribute value, prematurely
 * close it).
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(
  loc: string,
  lastmod: string,
  caUrl: string,
  esUrl: string
): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <xhtml:link rel="alternate" hreflang="ca" href="${escapeXml(caUrl)}" />
    <xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esUrl)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(caUrl)}" />
  </url>`;
}

/**
 * Build the dynamic cats sitemap: one <url> per locale per published cat,
 * each carrying xhtml:link alternates for ca/es and x-default (always CA).
 */
export function buildCatsSitemap(cats: SitemapCat[], site: string): string {
  const entries = cats.flatMap((cat) => {
    const caUrl = `${site}/cat/${cat.slugCa}`;
    const esUrl = `${site}/es/cat/${cat.slugEs}`;
    return [
      urlEntry(caUrl, cat.updatedAt, caUrl, esUrl),
      urlEntry(esUrl, cat.updatedAt, caUrl, esUrl),
    ];
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}
