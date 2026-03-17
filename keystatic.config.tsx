import { config, fields, singleton, collection } from '@keystatic/core';

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
    { label },
  );
}

/** SEO object with localized title & description */
function seoFields() {
  return fields.object(
    {
      title_ca: fields.text({ label: 'Meta title (CA)' }),
      title_es: fields.text({ label: 'Meta title (ES)' }),
      description_ca: fields.text({ label: 'Meta description (CA)', multiline: true }),
      description_es: fields.text({ label: 'Meta description (ES)', multiline: true }),
    },
    { label: 'SEO' },
  );
}

// ---------------------------------------------------------------------------
// Settings singleton
// ---------------------------------------------------------------------------

const settings = singleton({
  label: 'Configuracio general',
  path: 'src/content/settings/global',
  schema: {
    siteName_ca: fields.text({ label: 'Nom del lloc (CA)', validation: { isRequired: true } }),
    siteName_es: fields.text({ label: 'Nom del lloc (ES)', validation: { isRequired: true } }),
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
      { label: 'Xarxes socials' },
    ),
    seo: fields.object(
      {
        title_ca: fields.text({ label: 'Meta title (CA)' }),
        title_es: fields.text({ label: 'Meta title (ES)' }),
        description_ca: fields.text({ label: 'Meta description (CA)', multiline: true }),
        description_es: fields.text({ label: 'Meta description (ES)', multiline: true }),
        image: bilingualImage('Imatge SEO', 'public/images'),
      },
      { label: 'SEO' },
    ),
  },
});

// ---------------------------------------------------------------------------
// Cats collection
// ---------------------------------------------------------------------------

const cats = collection({
  label: 'Gats',
  slugField: 'slug_ca',
  path: 'src/content/cats/*',
  schema: {
    slug_ca: fields.slug({ name: { label: 'Slug (CA)' } }),
    slug_es: fields.text({ label: 'Slug (ES)' }),
    name_ca: fields.text({ label: 'Nom (CA)', validation: { isRequired: true } }),
    name_es: fields.text({ label: 'Nom (ES)', validation: { isRequired: true } }),
    race_ca: fields.text({ label: 'Raca (CA)' }),
    race_es: fields.text({ label: 'Raza (ES)' }),
    status: fields.select({
      label: 'Estat',
      options: [
        { label: 'Disponible', value: 'available' },
        { label: 'Adoptat', value: 'adopted' },
        { label: 'En tractament', value: 'treatment' },
        { label: 'No disponible', value: 'unavailable' },
      ],
      defaultValue: 'available',
    }),
    age: fields.integer({ label: 'Edat (anys)' }),
    gender: fields.select({
      label: 'Genere',
      options: [
        { label: 'Mascle', value: 'male' },
        { label: 'Femella', value: 'female' },
      ],
      defaultValue: 'male',
    }),
    size: fields.select({
      label: 'Mida',
      options: [
        { label: 'Petit', value: 'small' },
        { label: 'Mitja', value: 'medium' },
        { label: 'Gran', value: 'large' },
      ],
      defaultValue: 'medium',
    }),
    personality: fields.multiselect({
      label: 'Personalitat',
      options: [
        { label: 'Juganer', value: 'playful' },
        { label: 'Tranquil', value: 'calm' },
        { label: 'Timid', value: 'shy' },
        { label: 'Afectuos', value: 'affectionate' },
        { label: 'Independent', value: 'independent' },
        { label: 'Social', value: 'social' },
        { label: 'Curios', value: 'curious' },
        { label: 'Protector', value: 'protective' },
      ],
    }),
    goodWith: fields.multiselect({
      label: 'Es porta be amb',
      options: [
        { label: 'Nens', value: 'children' },
        { label: 'Altres gats', value: 'other-cats' },
        { label: 'Gossos', value: 'dogs' },
        { label: 'Gent gran', value: 'elderly' },
      ],
    }),
    healthStatus: fields.select({
      label: 'Estat de Salut',
      options: [
        { label: 'Sa', value: 'healthy' },
        { label: 'En tractament', value: 'treatment' },
        { label: 'Necessitats especials', value: 'special-needs' },
      ],
      defaultValue: 'healthy',
    }),
    vaccinated: fields.checkbox({ label: 'Vacunat', defaultValue: false }),
    microchipped: fields.checkbox({ label: 'Microxipat', defaultValue: false }),
    sterilized: fields.checkbox({ label: 'Esterilitzat', defaultValue: false }),
    weight: fields.number({ label: 'Pes (kg)' }),
    rescueDate: fields.date({ label: 'Data de Rescat' }),
    adoptionDate: fields.date({ label: "Data d'Adopcio" }),
    specialNeeds_ca: fields.text({ label: 'Necessitats especials (CA)', multiline: true }),
    specialNeeds_es: fields.text({ label: 'Necesidades especiales (ES)', multiline: true }),
    observations_ca: fields.text({ label: 'Observacions (CA)', multiline: true }),
    observations_es: fields.text({ label: 'Observaciones (ES)', multiline: true }),
    coverImage: bilingualImage('Imatge principal', 'public/images/cats'),
    gallery: fields.array(
      bilingualImage('Imatge', 'public/images/cats'),
      {
        label: 'Galeria',
        itemLabel: (props) => props.fields.alt_ca.value || 'Imatge',
      },
    ),
    shortDescription_ca: fields.text({ label: 'Descripcio curta (CA)', multiline: true }),
    shortDescription_es: fields.text({ label: 'Descripcion corta (ES)', multiline: true }),
    description_ca: fields.markdoc({ label: 'Descripcio (CA)', extension: 'mdoc' }),
    description_es: fields.markdoc({ label: 'Descripcion (ES)', extension: 'mdoc' }),
    featured: fields.checkbox({ label: 'Destacat', defaultValue: false }),
    order: fields.integer({ label: 'Ordre', defaultValue: 0 }),
    seo: seoFields(),
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
          itemLabel: 'Hero',
        },
        about: {
          label: 'Qui som',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({ label: 'Contingut (CA)', extension: 'mdoc' }),
            content_es: fields.markdoc({ label: 'Contenido (ES)', extension: 'mdoc' }),
            image: bilingualImage('Imatge', 'public/images'),
          }),
          itemLabel: 'Qui som',
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
                itemLabel: (props) => props.fields.label_ca.value || 'Estadistica',
              },
            ),
          }),
          itemLabel: 'Estadistiques',
        },
        colonies: {
          label: 'Colonies',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({ label: 'Contingut (CA)', extension: 'mdoc' }),
            content_es: fields.markdoc({ label: 'Contenido (ES)', extension: 'mdoc' }),
            image: bilingualImage('Imatge', 'public/images'),
          }),
          itemLabel: 'Colonies',
        },
        adopt: {
          label: 'Adopta',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
          }),
          itemLabel: 'Adopta',
        },
        collaborate: {
          label: "Col\u00B7labora",
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            content_ca: fields.markdoc({ label: 'Contingut (CA)', extension: 'mdoc' }),
            content_es: fields.markdoc({ label: 'Contenido (ES)', extension: 'mdoc' }),
            ctaText_ca: fields.text({ label: 'Text CTA (CA)' }),
            ctaText_es: fields.text({ label: 'Texto CTA (ES)' }),
          }),
          itemLabel: "Col\u00B7labora",
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
          itemLabel: 'Contacte CTA',
        },
        newsletter: {
          label: 'Newsletter',
          schema: fields.object({
            title_ca: fields.text({ label: 'Titol (CA)' }),
            title_es: fields.text({ label: 'Titulo (ES)' }),
            subtitle_ca: fields.text({ label: 'Subtitol (CA)' }),
            subtitle_es: fields.text({ label: 'Subtitulo (ES)' }),
          }),
          itemLabel: 'Newsletter',
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
                answer_ca: fields.text({ label: 'Resposta (CA)', multiline: true }),
                answer_es: fields.text({ label: 'Respuesta (ES)', multiline: true }),
              }),
              {
                label: 'Preguntes',
                itemLabel: (props) => props.fields.question_ca.value || 'Pregunta',
              },
            ),
          }),
          itemLabel: 'FAQ',
        },
      },
      { label: 'Seccions' },
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
    title_ca: fields.text({ label: 'Titol (CA)', validation: { isRequired: true } }),
    title_es: fields.text({ label: 'Titulo (ES)', validation: { isRequired: true } }),
    content_ca: fields.markdoc({ label: 'Contingut (CA)', extension: 'mdoc' }),
    content_es: fields.markdoc({ label: 'Contenido (ES)', extension: 'mdoc' }),
    seo: seoFields(),
  },
});

// ---------------------------------------------------------------------------
// Keystatic config
// ---------------------------------------------------------------------------

export default config({
  storage: { kind: 'local' },
  singletons: {
    settings,
    landing,
  },
  collections: {
    cats,
    pages,
  },
});
