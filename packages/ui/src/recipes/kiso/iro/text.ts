/**
 * Iro text — the per-colour foreground shade shared by the `plain`, `soft`,
 * and `outline` palette variants. It projects the ramp's `onTint` role: the
 * shade tuned to clear AA on the translucent 15% soft fill (and, one step
 * stronger, on a plain surface too). One source of truth so the colour-axis
 * shade can be retuned on the ramp without touching the palettes that
 * compose it.
 *
 * The semantic intent-colour bundle (`default` / `muted` / `primary`
 * / `success` / `warning` / `error`) — the public `iro.text` — lives in
 * `intent.ts` (the ramp's `onSurface` role); the barrel composes it under
 * the `text` key.
 *
 * Layer: kiso · Concern: text shade
 */

import { onTint } from './ramp'

export const text = onTint
