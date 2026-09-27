/**
 * The size steps.
 *
 * `steps` is the scale that density resolves against. The recipe engine adds
 * a density row for each step (`engine/density.ts`), and `recipes/kiso/sun.ts`
 * holds the tokens of each step.
 */

export const steps = ['sm', 'md', 'lg'] as const

/** A size step, which density resolves against. */
export type Step = (typeof steps)[number]
