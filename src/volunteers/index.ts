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
