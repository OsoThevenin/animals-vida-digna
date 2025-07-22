import type { CollectionConfig } from 'payload';

export const CatsCollection: CollectionConfig = {
  slug: 'cats',
  admin: {
    useAsTitle: 'givenName',
    defaultColumns: ['givenName', 'race', 'age', 'status', 'rescueDate'],
  },
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'givenName',
      type: 'text',
      required: true,
      label: 'Nom',
      admin: {
        description: 'Nom que li hem posat al gat',
      },
    },
    {
      name: 'race',
      type: 'text',
      required: false,
      label: 'Raça',
      admin: {
        description: 'Raça del gat (si es coneix)',
      },
    },
    {
      name: 'age',
      type: 'number',
      required: true,
      label: 'Edat (anys)',
      admin: {
        description: 'Edat aproximada en anys',
      },
    },
    {
      name: 'gender',
      type: 'select',
      required: true,
      label: 'Gènere',
      options: [
        { label: 'Mascle', value: 'male' },
        { label: 'Femella', value: 'female' },
      ],
    },
    {
      name: 'size',
      type: 'select',
      required: true,
      label: 'Mida',
      options: [
        { label: 'Petit', value: 'small' },
        { label: 'Mitjà', value: 'medium' },
        { label: 'Gran', value: 'large' },
      ],
    },
    {
      name: 'rescueDate',
      type: 'date',
      required: true,
      label: 'Data de Rescat',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'adoptionDate',
      type: 'date',
      required: false,
      label: "Data d'Adopció",
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Deixar buit si encara no ha estat adoptat',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Estat',
      defaultValue: 'available',
      options: [
        { label: 'Disponible per Adopció', value: 'available' },
        { label: 'Adoptat', value: 'adopted' },
        { label: 'En Tractament', value: 'treatment' },
        { label: 'No Disponible', value: 'unavailable' },
      ],
    },
    {
      name: 'personality',
      type: 'select',
      required: false,
      label: 'Personalitat',
      hasMany: true,
      options: [
        { label: 'Juganer', value: 'playful' },
        { label: 'Tranquil', value: 'calm' },
        { label: 'Timid', value: 'shy' },
        { label: 'Afectuós', value: 'affectionate' },
        { label: 'Independent', value: 'independent' },
        { label: 'Sociable', value: 'social' },
        { label: 'Curiós', value: 'curious' },
        { label: 'Protector', value: 'protective' },
      ],
    },
    {
      name: 'goodWith',
      type: 'select',
      required: false,
      label: 'Es porta bé amb',
      hasMany: true,
      options: [
        { label: 'Nens', value: 'children' },
        { label: 'Altres gats', value: 'other-cats' },
        { label: 'Gossos', value: 'dogs' },
        { label: 'Persones grans', value: 'elderly' },
      ],
    },
    {
      name: 'healthStatus',
      type: 'select',
      required: true,
      label: 'Estat de Salut',
      defaultValue: 'healthy',
      options: [
        { label: 'Sà', value: 'healthy' },
        { label: 'En Tractament', value: 'treatment' },
        { label: 'Especial', value: 'special-needs' },
      ],
    },
    {
      name: 'vaccinated',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      label: 'Vacunat',
    },
    {
      name: 'microchipped',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      label: 'Microxipat',
    },
    {
      name: 'sterilized',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      label: 'Esterilitzat',
    },
    {
      name: 'specialNeeds',
      type: 'textarea',
      required: false,
      label: 'Necessitats Especials',
      admin: {
        description: 'Descripció de necessitats especials, discapacitats, etc.',
      },
    },
    {
      name: 'observations',
      type: 'textarea',
      required: false,
      label: 'Observacions',
      admin: {
        description: 'Tractaments, malalties, comportament, etc.',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Foto Principal',
    },
    {
      name: 'additionalPhotos',
      type: 'array',
      required: false,
      label: 'Fotos Addicionals',
      fields: [
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Foto',
        },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      label: 'Destacat',
      admin: {
        description: 'Apareixerà destacat a la pàgina principal',
      },
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Ordre',
      admin: {
        description: 'Ordre en què apareixerà el gat (0 = primer)',
      },
    },
  ],
};
