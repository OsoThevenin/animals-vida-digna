import type { APIRoute } from 'astro';
import { siteSettings } from '../../generated/settings';
import type { Locale } from '../../i18n/index';
import {
  sendAdoptionConfirmation,
  sendAdoptionNotification,
} from '../../lib/email';
import { validateAdoptionForm } from '../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const formData = await context.request.formData();

    const name = formData.get('name') as string | null;
    const email = formData.get('email') as string | null;
    const phone = formData.get('phone') as string | null;
    const livingSituation = formData.get('livingSituation') as string | null;
    const message = formData.get('message') as string | null;
    const catName = formData.get('catName') as string | null;
    const locale = (formData.get('locale') as string | null) || 'ca';
    const honeypot = formData.get('website') as string | null;

    // Honeypot: silently reject bots
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting via Cloudflare binding
    try {
      const env = (context.locals as Record<string, unknown>).runtime
        ? ((context.locals as Record<string, { env: Record<string, unknown> }>)
            .runtime.env as Record<string, unknown>)
        : {};
      const rateLimiter = env.FORM_RATE_LIMITER as
        | { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
        | undefined;
      if (rateLimiter) {
        const clientIp =
          context.request.headers.get('cf-connecting-ip') || 'unknown';
        const result = await rateLimiter.limit({ key: clientIp });
        if (!result.success) {
          return new Response(
            JSON.stringify({ success: false, error: 'rate_limited' }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch {
      // Rate limiter not available (local dev) -- continue
    }

    // Validate
    const validation = validateAdoptionForm({
      name: name ?? undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
      livingSituation: livingSituation ?? undefined,
      message: message ?? undefined,
      catName: catName ?? undefined,
    });
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Shelter contact email, generated at build time from Keystatic settings
    // (see scripts/generate-settings.ts) — avoids pulling the Keystatic
    // filesystem reader / node:fs into the Cloudflare Worker bundle.
    const contactEmail =
      siteSettings.contactEmail || 'info@animalsvidadigna.org';

    // Get Resend API key from env binding
    let resendApiKey: string | undefined;
    try {
      const env = (context.locals as Record<string, unknown>).runtime
        ? ((context.locals as Record<string, { env: Record<string, unknown> }>)
            .runtime.env as Record<string, unknown>)
        : {};
      resendApiKey = (env.RESEND_API_KEY as string) || undefined;
    } catch {
      // fallback
    }
    if (!resendApiKey) {
      resendApiKey = import.meta.env.RESEND_API_KEY;
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'server_error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Dynamic import Resend to avoid bundling issues
    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const emailLocale = (locale === 'es' ? 'es' : 'ca') as Locale;

    // Send both emails
    await sendAdoptionNotification(resend, {
      name: name!,
      email: email!,
      phone: phone || undefined,
      livingSituation: livingSituation!,
      message: message!,
      catName: catName!,
      contactEmail,
      locale: emailLocale,
    });

    await sendAdoptionConfirmation(resend, {
      email: email!,
      name: name!,
      catName: catName!,
      locale: emailLocale,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Adoption form error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'server_error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
