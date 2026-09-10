// Node-only config for `@better-auth/cli generate`. Never imported by the
// Worker at runtime (it is not referenced from src/lib/auth.ts or any
// route) — it exists solely so the CLI can introspect the plugin list
// (emailOTP) and schema shape, then emit the Drizzle table definitions
// into packages/content/src/schema-auth.ts. The Drizzle instance below
// never executes a query; the CLI only reads config off the returned
// betterAuth() instance, so an empty object stands in for the D1Database
// binding shape at the type level (a real binding only exists inside a
// deployed Worker or `wrangler dev`, neither of which this CLI run has).

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../../packages/content/src/schema';

const dummyD1 = {} as unknown as D1Database;
const db = drizzle(dummyD1, { schema });

export const auth = betterAuth({
  secret: 'cli-generate-only',
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  rateLimit: { enabled: true, storage: 'database' },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      async sendVerificationOTP() {
        // never called by the CLI; required only to satisfy the plugin's
        // option type
      },
    }),
  ],
});
