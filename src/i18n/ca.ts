const ca = {
  // Navigation
  'nav.home': 'Inici',
  'nav.cats': 'Gats',
  'nav.about': 'Qui som?',
  'nav.collaborate': "Col\u00B7labora",
  'nav.colonies': 'Colonies felines',
  'nav.contact': 'Contacte',

  // CTAs
  'cta.adopt': "Adopta'm",
  'cta.donate': 'Fes un donatiu',
  'cta.contact': 'Contacta',
  'cta.sponsor': "Apadrina'm",

  // Common
  'common.language': 'Idioma',
  'common.switchLanguage': 'Castellano',
  'common.siteName': 'Animals Vida Digna',
  'common.copyright': 'Tots els drets reservats',

  // Cat fields
  'cat.age': 'Edat',
  'cat.gender': 'Genere',
  'cat.male': 'Mascle',
  'cat.female': 'Femella',
  'cat.status': 'Estat',
  'cat.status.available': 'Disponible',
  'cat.status.adopted': 'Adoptat',
  'cat.status.treatment': 'En tractament',
  'cat.status.unavailable': 'No disponible',
  'cat.size': 'Mida',
  'cat.size.small': 'Petit',
  'cat.size.medium': 'Mitja',
  'cat.size.large': 'Gran',
  'cat.personality': 'Personalitat',
  'cat.goodWith': "Es porta be amb",
  'cat.healthStatus': 'Estat de salut',
  'cat.vaccinated': 'Vacunat',
  'cat.microchipped': 'Microxipat',
  'cat.sterilized': 'Esterilitzat',
  'cat.weight': 'Pes',
  'cat.rescueDate': 'Data de rescat',
  'cat.race': 'Raca',
  'cat.featured': 'Destacat',

  // Footer
  'footer.shelter': 'Protectora d\'animals',
  'footer.socialLinks': 'Xarxes socials',
} as const;

export type TranslationKey = keyof typeof ca;
export default ca;
