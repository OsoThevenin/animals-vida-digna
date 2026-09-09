import { ActionError, defineAction } from 'astro:actions';
import {
  createCat,
  createDb,
  deleteCat,
  getCatById,
  updateCat,
} from '@avd/content/cats';
import { catInputSchema } from '@avd/content/validate';
import { z } from 'astro/zod';
import { createAuth } from '../lib/auth';
import { deleteImagesFromBucket } from '../lib/image-store';
import { requireUser } from './require-user';

export const server = {
  auth: {
    signOut: defineAction({
      handler: async (_input, context) => {
        if (!context.locals.user) {
          throw new ActionError({
            code: 'UNAUTHORIZED',
            message: 'Not signed in.',
          });
        }
        const auth = createAuth(context.locals.runtime.env);
        await auth.api.signOut({ headers: context.request.headers });
        return { ok: true } as const;
      },
    }),
  },
  cats: {
    create: defineAction({
      input: catInputSchema,
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        return createCat(db, input, user.email);
      },
    }),
    update: defineAction({
      input: z.object({ id: z.string(), data: catInputSchema }),
      handler: async (input, context) => {
        const user = requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const existing = await getCatById(db, input.id);
        if (!existing) {
          throw new ActionError({
            code: 'NOT_FOUND',
            message: 'Gat no trobat.',
          });
        }
        return updateCat(db, input.id, input.data, user.email);
      },
    }),
    delete: defineAction({
      input: z.object({ id: z.string() }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const { r2Keys } = await deleteCat(db, input.id);
        await deleteImagesFromBucket(
          context.locals.runtime.env.IMAGES_BUCKET,
          r2Keys
        );
        return { ok: true } as const;
      },
    }),
  },
};
