'use server'

import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '@payload-config'

export async function getVolunteers() {
  const payload = await getPayloadHMR({ config: configPromise })

  const volunteers = await payload.find({
    collection: 'volunteers',
    where: {
      isActive: {
        equals: true,
      },
    },
    sort: 'order',
    depth: 1, // Per obtenir les relacions (foto)
  })

  return volunteers.docs
}
