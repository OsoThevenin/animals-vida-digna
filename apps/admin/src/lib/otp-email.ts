/**
 * Builds the bilingual (Catalan first, Spanish second — matches the site's
 * i18n default locale order in src/i18n/index.ts) sign-in code email sent
 * by better-auth's emailOTP plugin. Pure function: no Resend import here,
 * so it is testable without a network client (src/lib/auth.ts wires this
 * into Resend's `emails.send`).
 */
export function buildOtpEmail(otp: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Codi d'accés / Código de acceso — Animals Vida Digna";

  const text = [
    `Català: El teu codi d'accés és ${otp}. Caduca en 5 minuts. Si no has demanat aquest codi, ignora aquest missatge.`,
    '',
    `Español: Tu código de acceso es ${otp}. Caduca en 5 minutos. Si no has solicitado este código, ignora este mensaje.`,
  ].join('\n');

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2D1B0E; max-width: 600px; margin: 0 auto; padding: 24px;">
<h2 style="color: #8B5E3C;">Codi d'accés / Código de acceso</h2>
<p><strong>Català:</strong> El teu codi d'accés és <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong>. Caduca en 5 minuts. Si no has demanat aquest codi, ignora aquest missatge.</p>
<p><strong>Español:</strong> Tu código de acceso es <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong>. Caduca en 5 minutos. Si no has solicitado este código, ignora este mensaje.</p>
<hr style="border: none; border-top: 1px solid #e8ddd0; margin: 32px 0 16px;" />
<p style="font-size: 12px; color: #6B5B4F;">Animals Vida Digna</p>
</body>
</html>`;

  return { subject, text, html };
}
