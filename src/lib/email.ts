import type { Locale } from '../i18n/index';

// --- Template helpers ---

const emailWrapper = (body: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #3d2c1e; max-width: 600px; margin: 0 auto; padding: 24px;">
${body}
<hr style="border: none; border-top: 1px solid #e8ddd0; margin: 32px 0 16px;" />
<p style="font-size: 12px; color: #8a7a6a;">Animals Vida Digna</p>
</body>
</html>`;

// --- Contact notification (to shelter) ---

const notificationLabels = {
  ca: { subject: 'Nou missatge de contacte', nameLabel: 'Nom', emailLabel: 'Email', messageLabel: 'Missatge' },
  es: { subject: 'Nuevo mensaje de contacto', nameLabel: 'Nombre', emailLabel: 'Email', messageLabel: 'Mensaje' },
} as const;

export function getContactNotificationSubject(locale: Locale): string {
  return notificationLabels[locale].subject;
}

export function getContactNotificationHtml(
  data: { name: string; email: string; message: string },
  locale: Locale,
): string {
  const l = notificationLabels[locale];
  return emailWrapper(`
    <h2 style="color: #6b4c3b;">${l.subject}</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.nameLabel}:</td><td style="padding: 8px 0;">${data.name}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.emailLabel}:</td><td style="padding: 8px 0;">${data.email}</td></tr>
    </table>
    <h3 style="margin-top: 24px; color: #6b4c3b;">${l.messageLabel}:</h3>
    <p style="white-space: pre-wrap; background: #faf7f4; padding: 16px; border-radius: 8px;">${data.message}</p>
  `);
}

// --- Contact confirmation (to submitter) ---

const confirmationLabels = {
  ca: {
    subject: 'Hem rebut el teu missatge - Animals Vida Digna',
    greeting: (name: string) => `Hola ${name},`,
    body: 'Gracies per contactar amb nosaltres! Hem rebut el teu missatge i et respondrem el mes aviat possible.',
    closing: 'Una abracada,',
    team: "L'equip d'Animals Vida Digna",
  },
  es: {
    subject: 'Hemos recibido tu mensaje - Animals Vida Digna',
    greeting: (name: string) => `Hola ${name},`,
    body: 'Gracias por contactar con nosotros! Hemos recibido tu mensaje y te responderemos lo antes posible.',
    closing: 'Un abrazo,',
    team: 'El equipo de Animals Vida Digna',
  },
} as const;

export function getContactConfirmationSubject(locale: Locale): string {
  return confirmationLabels[locale].subject;
}

export function getContactConfirmationHtml(name: string, locale: Locale): string {
  const l = confirmationLabels[locale];
  return emailWrapper(`
    <p style="font-size: 18px;">${l.greeting(name)}</p>
    <p>${l.body}</p>
    <p style="margin-top: 24px;">${l.closing}<br/><strong>${l.team}</strong></p>
  `);
}

// --- Send functions (using Resend SDK) ---

interface ResendClient {
  emails: {
    send(params: {
      from: string;
      to: string;
      replyTo?: string;
      subject: string;
      html: string;
    }): Promise<{ id?: string; error?: unknown }>;
  };
}

const FROM_ADDRESS = 'Animals Vida Digna <no-reply@animalsvidadigna.org>';

export async function sendContactNotification(
  resend: ResendClient,
  params: { name: string; email: string; message: string; contactEmail: string; locale: Locale },
): Promise<void> {
  const { name, email, message, contactEmail, locale } = params;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: contactEmail,
    replyTo: email,
    subject: getContactNotificationSubject(locale),
    html: getContactNotificationHtml({ name, email, message }, locale),
  });
}

export async function sendContactConfirmation(
  resend: ResendClient,
  params: { email: string; name: string; locale: Locale },
): Promise<void> {
  const { email, name, locale } = params;
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: getContactConfirmationSubject(locale),
    html: getContactConfirmationHtml(name, locale),
  });
}

// --- Adoption email functions (for Plan 02) ---

const adoptionNotificationLabels = {
  ca: {
    subject: (catName: string) => `Nova sol·licitud d'adopcio: ${catName}`,
    nameLabel: 'Nom', emailLabel: 'Email', phoneLabel: 'Telefon',
    livingSituationLabel: 'Situacio de vivenda', catLabel: 'Gat', messageLabel: 'Missatge',
  },
  es: {
    subject: (catName: string) => `Nueva solicitud de adopcion: ${catName}`,
    nameLabel: 'Nombre', emailLabel: 'Email', phoneLabel: 'Telefono',
    livingSituationLabel: 'Situacion de vivienda', catLabel: 'Gato', messageLabel: 'Mensaje',
  },
} as const;

const adoptionConfirmationLabels = {
  ca: {
    subject: (catName: string) => `Hem rebut la teva sol·licitud per ${catName} - Animals Vida Digna`,
    greeting: (name: string) => `Hola ${name},`,
    body: (catName: string) => `Gracies pel teu interes en adoptar ${catName}! Revisarem la teva sol·licitud i et contactarem aviat.`,
    closing: 'Una abracada,',
    team: "L'equip d'Animals Vida Digna",
  },
  es: {
    subject: (catName: string) => `Hemos recibido tu solicitud para ${catName} - Animals Vida Digna`,
    greeting: (name: string) => `Hola ${name},`,
    body: (catName: string) => `Gracias por tu interes en adoptar a ${catName}! Revisaremos tu solicitud y te contactaremos pronto.`,
    closing: 'Un abrazo,',
    team: 'El equipo de Animals Vida Digna',
  },
} as const;

export async function sendAdoptionNotification(
  resend: ResendClient,
  params: {
    name: string; email: string; phone?: string; livingSituation: string;
    message: string; catName: string; contactEmail: string; locale: Locale;
  },
): Promise<void> {
  const { name, email, phone, livingSituation, message, catName, contactEmail, locale } = params;
  const l = adoptionNotificationLabels[locale];
  const html = emailWrapper(`
    <h2 style="color: #6b4c3b;">${l.subject(catName)}</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.nameLabel}:</td><td style="padding: 8px 0;">${name}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.emailLabel}:</td><td style="padding: 8px 0;">${email}</td></tr>
      ${phone ? `<tr><td style="padding: 8px 0; font-weight: bold;">${l.phoneLabel}:</td><td style="padding: 8px 0;">${phone}</td></tr>` : ''}
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.livingSituationLabel}:</td><td style="padding: 8px 0;">${livingSituation}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">${l.catLabel}:</td><td style="padding: 8px 0;">${catName}</td></tr>
    </table>
    <h3 style="margin-top: 24px; color: #6b4c3b;">${l.messageLabel}:</h3>
    <p style="white-space: pre-wrap; background: #faf7f4; padding: 16px; border-radius: 8px;">${message}</p>
  `);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: contactEmail,
    replyTo: email,
    subject: l.subject(catName),
    html,
  });
}

export async function sendAdoptionConfirmation(
  resend: ResendClient,
  params: { email: string; name: string; catName: string; locale: Locale },
): Promise<void> {
  const { email, name, catName, locale } = params;
  const l = adoptionConfirmationLabels[locale];
  const html = emailWrapper(`
    <p style="font-size: 18px;">${l.greeting(name)}</p>
    <p>${l.body(catName)}</p>
    <p style="margin-top: 24px;">${l.closing}<br/><strong>${l.team}</strong></p>
  `);
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: l.subject(catName),
    html,
  });
}
