import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';

import { buildConfig } from 'payload';
import { es } from 'payload/i18n/es';
import sharp from 'sharp';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

import { CatsCollection } from '@/cms/collections/Cats';
import { MediaCollection } from '@/cms/collections/Media';
import { UsersCollection } from '@/cms/collections/Users';
import { VolunteersCollection } from '@/cms/collections/Volunteers';

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'set-a-secret-in-your-env',
  collections: [
    UsersCollection,
    MediaCollection,
    VolunteersCollection,
    CatsCollection,
  ],
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
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.
  sharp,
});
