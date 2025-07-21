import type { CollectionConfig } from 'payload';

export const VolunteersCollection: CollectionConfig = {
  slug: 'volunteers',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom',
    },
    {
      name: 'role',
      type: 'text',
      required: false,
      label: 'Rol',
    },
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      label: 'Cita',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Foto',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      label: 'Actiu',
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Ordre',
      admin: {
        description: 'Ordre en què apareixerà el voluntari (0 = primer)',
      },
    },
  ],
};
