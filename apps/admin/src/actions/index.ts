import { ActionError, defineAction } from 'astro:actions';
import {
  createCat,
  createDb,
  deleteCat,
  getCatById,
  removeCatImage,
  setCoverImage,
  updateCat,
  updateCatImages,
} from '@avd/content/cats';
import { imageKey } from '@avd/content/image-url';
import { catInputSchema } from '@avd/content/validate';
import { z } from 'astro/zod';
import { nanoid } from 'nanoid';
import { createAuth } from '../lib/auth';
import {
  deleteImagesFromBucket,
  uploadImageToBucket,
} from '../lib/image-store';
import { validateUploadFile } from '../lib/image-upload';
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
  images: {
    upload: defineAction({
      accept: 'form',
      input: z.object({
        catId: z.string(),
        file: z.instanceof(File),
        width: z.coerce.number().int().positive(),
        height: z.coerce.number().int().positive(),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const validation = validateUploadFile({
          type: input.file.type,
          size: input.file.size,
        });
        if (!validation.ok) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message:
              validation.reason === 'type'
                ? 'invalid_file_type'
                : 'file_too_large',
          });
        }
        const db = createDb(context.locals.runtime.env.DB);
        const imageId = nanoid();
        const key = imageKey(input.catId, imageId);
        return uploadImageToBucket(
          context.locals.runtime.env.IMAGES_BUCKET,
          db,
          {
            catId: input.catId,
            key,
            file: input.file,
            width: input.width,
            height: input.height,
          }
        );
      },
    }),
    update: defineAction({
      input: z.object({
        catId: z.string(),
        images: z.array(
          z.object({
            id: z.string(),
            altCa: z.string(),
            altEs: z.string(),
            position: z.number().int().nonnegative(),
          })
        ),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        await updateCatImages(db, input.catId, input.images);
        return { ok: true } as const;
      },
    }),
    remove: defineAction({
      input: z.object({ imageId: z.string() }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        const removed = await removeCatImage(db, input.imageId);
        if (removed) {
          await deleteImagesFromBucket(
            context.locals.runtime.env.IMAGES_BUCKET,
            [removed.r2Key]
          );
        }
        return { ok: true } as const;
      },
    }),
    setCover: defineAction({
      input: z.object({
        catId: z.string(),
        imageId: z.string().nullable(),
      }),
      handler: async (input, context) => {
        requireUser(context);
        const db = createDb(context.locals.runtime.env.DB);
        await setCoverImage(db, input.catId, input.imageId);
        return { ok: true } as const;
      },
    }),
  },
};
