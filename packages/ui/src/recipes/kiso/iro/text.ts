/**
 * Iro text: the per-colour foreground shade shared by the `plain`, `soft`,
 * and `outline` palette variants. Projects the ramp's `onTint` role: the
 * shade tuned to clear AA on the translucent 15% soft fill.
 *
 * The semantic intent-colour bundle (`default` / `muted` / `primary`
 * / `success` / `warning` / `error`), the public `iro.text`, lives in
 * `intent.ts` (the ramp's `onSurface` role); the barrel composes it under
 * the `text` key.
 *
 * Layer: kiso · Concern: text shade
 */

import { onTint } from './ramp'

export const text = onTint
