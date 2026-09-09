import type { ActionAPIContext } from 'astro:actions';
import { ActionError } from 'astro:actions';

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Every action handler in this app calls this first. The Phase 4 middleware
 * already redirects unauthenticated page loads to /login, but Actions can be
 * invoked directly (fetch to the action endpoint), so each handler re-checks.
 */
export function requireUser(context: ActionAPIContext): AdminUser {
  const user = context.locals.user;
  if (!user) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'Cal iniciar sessió (session required).',
    });
  }
  return user;
}
