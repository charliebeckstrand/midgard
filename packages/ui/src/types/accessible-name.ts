/**
 * Requires an accessible name at the type level. A component that emits a role
 * with no other naming source (a `toolbar`, `tree`, `radiogroup`, an icon-only
 * button, a bare progressbar) intersects this so exactly one of `aria-label` /
 * `aria-labelledby` is mandatory — an unnamed instance becomes a compile error
 * rather than a silent runtime failure axe can't catch on a static render.
 *
 * Pair with `Omit<…, 'aria-label' | 'aria-labelledby'>` on the spread props so
 * the optional native pair doesn't widen the requirement back to optional.
 */
export type AccessibleName = { 'aria-label': string } | { 'aria-labelledby': string }
