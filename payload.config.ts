import path from 'node:path'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { es } from 'payload/i18n/es'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

import { UsersCollection } from '@/cms/collections/Users'
import { MediaCollection } from '@/cms/collections/Media'
import { VolunteersCollection } from '@/cms/collections/Volunteers'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'set-a-secret-in-your-env',
  collections: [UsersCollection, MediaCollection, VolunteersCollection],
  // the type of DB you would like to use
  db: postgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL,
    },
  }),
  plugins: process.env.BLOB_READ_WRITE_TOKEN
    ? [
        vercelBlobStorage({
          collections: {
            [MediaCollection.slug]: true,
          },
          token: process.env.BLOB_READ_WRITE_TOKEN || '',
        }),
      ]
    : [],
  // richText editor
  editor: lexicalEditor(),
  typescript: {
    outputFile: path.resolve(dirname, 'src/types/payload-types.ts'),
  },
  i18n: {
    supportedLanguages: { es },
  },
  async onInit(payload) {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
    })

    // This is useful for local development
    // so you do not need to create a first-user every time
    if (existingUsers.docs.length === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: 'animals.vidadigna@gmail.com',
          password: 'rbm*PQC8wug*cdq4jpd',
        },
      })
    }
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  sharp,
})
