/// <reference types="astro/client" />

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
