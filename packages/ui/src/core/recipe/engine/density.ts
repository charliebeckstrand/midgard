/**
 * Density rows: the classes a recipe adds when a caller omits its density
 * axis.
 *
 * A recipe that names a `densityAxis` follows the nearest density scope, an
 * element with `data-density`, when the caller omits that axis. The recipe
 * keeps the classes of its default step as the base. For each step in
 * {@link DENSITY_STEPS}, it adds the axis row and the compound rules of that
 * step under the `density-<step>:` variant of `ui/tailwind.css`. The md row is
 * not redundant: it resets an outer `sm` or `lg` scope under an inner `md` one.
 *
 * Tailwind reads only the class literals it finds in source, and these rows
 * are built at runtime. {@link densityClasses} lists every row class of a
 * recipe, and `density-classes.test.ts` writes the list to
 * `src/recipes/density.generated.txt`, which `ui/tailwind.css` names as a
 * source.
 */

import type { ClassValue } from 'clsx'
import clsx from 'clsx'

import type { ResolvedConfig } from './types'

/** The steps a density scope can carry. */
export const DENSITY_STEPS = ['sm', 'md', 'lg'] as const

/** One step of {@link DENSITY_STEPS}. */
export type DensityStep = (typeof DENSITY_STEPS)[number]

/**
 * Puts each class of `value` under the `density-<step>:` variant.
 *
 * @internal
 */
export function densityRow(step: DensityStep, value: ClassValue): string[] {
	return clsx(value)
		.split(/\s+/)
		.filter(Boolean)
		.map((name) => `density-${step}:${name}`)
}

/**
 * Every density row class a recipe config can emit, sorted and without
 * duplicates. It includes the compound rules of each step for every value of
 * the other axes. The list therefore holds each class that a call can return.
 *
 * @param config - The resolved config of a recipe, as `recipe.config` exposes it.
 * @returns An empty list when the config names no density axis.
 */
export function densityClasses({
	densityAxis: axis,
	variants,
	compound,
}: ResolvedConfig): string[] {
	if (axis === undefined) return []

	const names = DENSITY_STEPS.flatMap((step) =>
		densityRow(step, [
			variants[axis]?.[step],
			compound.filter((rule) => rule[axis] === step).map((rule) => rule.class),
		]),
	)

	return [...new Set(names)].sort()
}
