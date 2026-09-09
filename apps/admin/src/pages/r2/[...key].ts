import type { APIRoute } from 'astro';
import { isDevPreviewEnabled, resolveR2PreviewKey } from '@/lib/r2-preview';

export const prerender = false;

/**
 * DEV-ONLY local image preview: streams objects straight out of the R2
 * bucket with no authentication. That is acceptable only because it must
 * never exist in a deployed Worker — `import.meta.env.DEV` is a
 * build-time constant, so Vite inlines and dead-code-eliminates this
 * whole handler in a production build; it is not a runtime env var a
 * misconfiguration could flip. Do not replace this check with a runtime
 * flag or a hostname check.
 */
export const GET: APIRoute = async (context) => {
  if (!isDevPreviewEnabled(import.meta.env.DEV)) {
    return new Response(null, { status: 404 });
  }

  const key = resolveR2PreviewKey(context.params.key);
  if (!key) {
    return new Response(null, { status: 404 });
  }

  const env = context.locals.runtime.env;
  const object = await env.IMAGES_BUCKET.get(key);
  if (!object) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  // Content-Type comes from the object's own stored metadata, never from
  // anything caller-supplied.
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers, status: 200 });
};
