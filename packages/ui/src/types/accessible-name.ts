/**
 * Requires an accessible name at the type level. A component that emits a role
 * with no other naming source (a `toolbar`, `tree`, `radiogroup`, an icon-only
 * button, a bare progressbar) intersects this; exactly one of `aria-label` /
 * `aria-labelledby` becomes mandatory, and an unnamed instance is a compile
 * error.
 *
 * Pair with `Omit<…, 'aria-label' | 'aria-labelledby'>` on the spread props;
 * the optional native pair widens the requirement back to optional.
 */
export type AccessibleName = { 'aria-label': string } | { 'aria-labelledby': string }
