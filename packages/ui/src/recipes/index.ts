/**
 * Design-token recipes.
 *
 *   ryu/  — substrate scales and cross-cutting currents. Re-exported below
 *           and consumed by kata, by components, and (via this barrel) by
 *           any internal call site that wants a substrate scale.
 *   kata/ — per-component recipes (1:1 with src/components/<name>/). Internal
 *           to the package; not re-exported from this barrel. Components
 *           consume kata via a relative path: `from '../../recipes/kata/<name>'`.
 *   waku/ — control primitives composed by panel-shaped kata (Dialog, Drawer,
 *           Sheet, etc.). Same internal status as kata.
 *
 * package.json `exports` deliberately omits `./recipes` and `./recipes/*`,
 * so kata and waku are unreachable from outside the package. The contract
 * is pinned by src/__tests__/recipes/internal-boundary.test.ts — that test
 * fails if the boundary drifts.
 */

export { iro } from './ryu/iro'
export { ji } from './ryu/ji'
export { kokkaku } from './ryu/kokkaku'
export { ma } from './ryu/ma'
export { narabi } from './ryu/narabi'
export { omote } from './ryu/omote'
export { sawari } from './ryu/sawari'
export { sen } from './ryu/sen'
export { take } from './ryu/take'
export { ugoki } from './ryu/ugoki'
