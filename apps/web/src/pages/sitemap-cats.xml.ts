import { listPublishedCats } from '@avd/content';
import type { APIRoute } from 'astro';
import { requireDb } from '../lib/db';
import { buildCatsSitemap } from '../lib/sitemap-cats';

export const prerender = false;

export const GET: APIRoute = async ({ locals, site }) => {
  const db = requireDb(locals);
  const cats = await listPublishedCats(db);
  const siteOrigin =
    site?.href?.replace(/\/$/, '') || 'https://animalsvidadigna.org';

  const body = buildCatsSitemap(
    cats.map((cat) => ({
      slugCa: cat.slugCa,
      slugEs: cat.slugEs,
      updatedAt: cat.updatedAt,
    })),
    siteOrigin
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
