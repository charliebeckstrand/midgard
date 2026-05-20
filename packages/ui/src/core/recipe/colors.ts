/**
 * The palette colour set.
 *
 * Adding a colour: append to `colors`, add a row to every per-colour map in
 * `iro.ts`. The recipe engine reads `colors` to scaffold the `color` variant
 * axis on any kata that declares a palette.
 */

export const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export type Color = (typeof colors)[number]
