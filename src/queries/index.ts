'use server';

import { getPayloadClient } from '@/lib/payload';

export async function getVolunteers() {
  const payload = await getPayloadClient();

  const volunteers = await payload.find({
    collection: 'volunteers',
    where: {
      isActive: {
        equals: true,
      },
    },
    sort: 'order',
    depth: 1, // Per obtenir les relacions (foto)
  });

  return volunteers.docs;
}

export async function getCats() {
  try {
    const payload = await getPayloadClient();

    const catsResponse = await payload.find({
      collection: 'cats',
      where: {
        status: {
          equals: 'available',
        },
      },
      sort: 'order',
      limit: 6,
    });

    return catsResponse.docs;
  } catch (error) {
    // Fallback for build time or when database is not available
    console.log('Could not fetch cats from database:', error);
    return [];
  }
}

export async function getCat(id: string) {
  const payload = await getPayloadClient();

  try {
    return await payload.findByID({
      collection: 'cats',
      id,
    });
  } catch (error) {
    console.log('Could not fetch cat from database:', error);
    return null;
  }
}
