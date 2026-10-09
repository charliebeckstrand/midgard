/**
 * The types of the Mimir API, in asgard, from its OpenAPI spec, and its client
 * in the browser. The places app and the picks app call Mimir through the
 * gateway, and both read these types, so the two apps cannot disagree about a
 * shape. `pnpm --filter shared openapi` generates `openapi.d.ts` from the spec
 * on the `main` branch of asgard.
 */
export { createMimirClient } from './client'
export type { components, paths } from './openapi'
