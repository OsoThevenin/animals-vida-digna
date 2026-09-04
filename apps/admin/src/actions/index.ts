import { ActionError, defineAction } from 'astro:actions';
import { createAuth } from '../lib/auth';

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
};
