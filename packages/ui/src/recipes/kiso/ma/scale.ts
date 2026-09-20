/**
 * Ma scale: the names of the spacing scale. `padding`, `margin`, and `gap` each
 * key their finished Tailwind utilities by this label set.
 *
 * Layer: kiso · Concern: spacing scale
 */

/**
 * Name of a spacing stop in the `ma` scale. `0` is the reset stop, spelled the
 * one way everywhere — not `'none'`, and never absent. It is a number so it
 * reads as the bottom of a scale rather than a sixth name.
 */
export type Ma = 0 | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
