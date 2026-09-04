import { collection, config, fields, singleton } from '@keystatic/core';
import { resolveKeystaticStorage } from './src/lib/keystatic-storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Bilingual image object (src + alt_ca + alt_es) */
function bilingualImage(label: string, directory: string) {
  return fields.object(
    {
      src: fields.image({
        label,
        directory,
        publicPath: directory.replace('public', ''),
      }),
      alt_ca: fields.text({ label: `${label} alt (CA)` }),
      alt_es: fields.text({ label: `${label} alt (ES)` }),
    },
    { label }
  );
}

/** SEO object with localized title & description */
function seoFields() {
  return fields.object(
    {
      title_ca: fields.text({ label: 'Meta title (CA)' }),
      title_es: fields.text({ label: 'Meta title (ES)' }),
      description_ca: fields.text({
        label: 'Meta description (CA)',
        multiline: true,
      }),
      description_es: fields.text({
        label: 'Meta description (ES)',
        multiline: true,
      }),
    },
    { label: 'SEO' }
  );
}

// ---------------------------------------------------------------------------
// Settings singleton
// ---------------------------------------------------------------------------

const settings = singleton({
  label: 'Configuracio general',
  path: 'src/content/settings/global',
  schema: {
    siteName_ca: fields.text({
      label: 'Nom del lloc (CA)',
      validation: { isRequired: true },
    }),
    siteName_es: fields.text({
      label: 'Nom del lloc (ES)',
      validation: { isRequired: true },
    }),
    logo: fields.image({
      label: 'Logo',
      directory: 'public/images',
      publicPath: '/images',
    }),
    primaryColor: fields.text({ label: 'Color principal' }),
    donateUrl: fields.url({ label: 'URL de donacio (Teaming)' }),
    contactEmail: fields.text({ label: 'Email de contacte' }),
    social: fields.object(
      {
        facebook: fields.url({ label: 'Facebook' }),
        instagram: fields.url({ label: 'Instagram' }),
        twitter: fields.url({ label: 'Twitter / X' }),
      },
      { label: 'Xarxes socials' }
    ),
    seo: fields.object(
      {
        title_ca: fields.text({ label: 'Meta title (CA)' }),
        title_es: fields.text({ label: 'Meta title (ES)' }),
        description_ca: fields.text({
          label: 'Meta description (CA)',
          multiline: true,
        }),
        description_es: fields.text({
          label: 'Meta description (ES)',
          multiline: true,
        }),
        image: bilingualImage('Imatge SEO', 'public/images'),
      },
      { label: 'SEO' }
    ),
  },
});

// ---------------------------------------------------------------------------
// Landing singleton — block-based sections
// ---------------------------------------------------------------------------

const landing = singleton({
  label: 'Pagina principal',
  path: 'src/content/landing/home',
  schema: {
    sections: fields.blocks(
      {
        hero: {
          label: 'Hero',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
            image: bilingualImage('Imatge hero', 'public/images'),
            ctaAdoptText_ca: fields.text({ label: 'Text CTA adopta (CA)' }),
            ctaAdoptText_es: fields.text({ label: 'Texto CTA adopta (ES)' }),
            ctaDonateText_ca: fields.text({ label: 'Text CTA dona (CA)' }),
            ctaDonateText_es: fields.text({ label: 'Texto CTA dona (ES)' }),
          }),
          itemLabel: () => 'Hero',
        },
        about: {
          label: 'Qui som',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({
              label: 'Contingut (CA)',
              extension: 'mdoc',
            }),
            content_es: fields.markdoc({
              label: 'Contenido (ES)',
              extension: 'mdoc',
            }),
            image: bilingualImage('Imatge', 'public/images'),
          }),
          itemLabel: () => 'Qui som',
        },
        stats: {
          label: 'Estadistiques',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            items: fields.array(
              fields.object({
                label_ca: fields.text({ label: 'Etiqueta (CA)' }),
                label_es: fields.text({ label: 'Etiqueta (ES)' }),
                value: fields.text({ label: 'Valor' }),
              }),
              {
                label: 'Estadistiques',
                itemLabel: (props) =>
                  props.fields.label_ca.value || 'Estadistica',
              }
            ),
          }),
          itemLabel: () => 'Estadistiques',
        },
        colonies: {
          label: 'Colonies',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({
              label: 'Contingut (CA)',
              extension: 'mdoc',
            }),
            content_es: fields.markdoc({
              label: 'Contenido (ES)',
              extension: 'mdoc',
            }),
            image: bilingualImage('Imatge', 'public/images'),
          }),
          itemLabel: () => 'Colonies',
        },
        adopt: {
          label: 'Adopta',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
          }),
          itemLabel: () => 'Adopta',
        },
        collaborate: {
          label: 'Col\u00B7labora',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({
              label: 'Contingut (CA)',
              extension: 'mdoc',
            }),
            content_es: fields.markdoc({
              label: 'Contenido (ES)',
              extension: 'mdoc',
            }),
            ctaText_ca: fields.text({ label: 'Text CTA (CA)' }),
            ctaText_es: fields.text({ label: 'Texto CTA (ES)' }),
          }),
          itemLabel: () => 'Col\u00B7labora',
        },
        contactCta: {
          label: 'Contacte CTA',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
            ctaText_ca: fields.text({ label: 'Text CTA (CA)' }),
            ctaText_es: fields.text({ label: 'Texto CTA (ES)' }),
          }),
          itemLabel: () => 'Contacte CTA',
        },
        newsletter: {
          label: 'Newsletter',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
          }),
          itemLabel: () => 'Newsletter',
        },
        faq: {
          label: 'FAQ',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            items: fields.array(
              fields.object({
                question_ca: fields.text({ label: 'Pregunta (CA)' }),
                question_es: fields.text({ label: 'Pregunta (ES)' }),
                answer_ca: fields.text({
                  label: 'Resposta (CA)',
                  multiline: true,
                }),
                answer_es: fields.text({
                  label: 'Respuesta (ES)',
                  multiline: true,
                }),
              }),
              {
                label: 'Preguntes',
                itemLabel: (props) =>
                  props.fields.question_ca.value || 'Pregunta',
              }
            ),
          }),
          itemLabel: () => 'FAQ',
        },
      },
      { label: 'Seccions' }
    ),
  },
});

// ---------------------------------------------------------------------------
// Pages collection
// ---------------------------------------------------------------------------

const pages = collection({
  label: 'Pagines',
  slugField: 'slug',
  path: 'src/content/pages/*',
  schema: {
    slug: fields.slug({ name: { label: 'Slug' } }),
    title_ca: fields.text({
      label: 'Titol (CA)',
      validation: { isRequired: true },
    }),
    title_es: fields.text({
      label: 'Titulo (ES)',
      validation: { isRequired: true },
    }),
    content_ca: fields.markdoc({ label: 'Contingut (CA)', extension: 'mdoc' }),
    content_es: fields.markdoc({ label: 'Contenido (ES)', extension: 'mdoc' }),
    seo: seoFields(),
  },
});

// ---------------------------------------------------------------------------
// Keystatic config
// ---------------------------------------------------------------------------

export default config({
  storage: resolveKeystaticStorage(import.meta.env),
  singletons: {
    settings,
    landing,
  },
  collections: {
    pages,
  },
});
