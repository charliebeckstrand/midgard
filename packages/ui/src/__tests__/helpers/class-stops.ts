import type { DensityStep } from '../../core/density'
import { valuesByStep } from '../../core/density/steps'
import { k as button } from '../../recipes/kata/button'

/** The class strings of a recipe value, which can nest arrays. */
function classNames(classes: readonly unknown[]): string[] {
	return classes
		.flat(Number.POSITIVE_INFINITY)
		.filter((value): value is string => typeof value === 'string')
		.flatMap((value) => value.split(/\s+/))
}

/**
 * Reads the stop of the first class that starts with `prefix`, such as the `2`
 * of `px-ring-2` for the prefix `px-ring-`.
 *
 * @throws If no class has the prefix and a numeric stop.
 */
export function findStop(classes: readonly unknown[], prefix: string): number {
	for (const name of classNames(classes)) {
		if (!name.startsWith(prefix)) continue

		const stop = name.slice(prefix.length)

		if (/^\d+(\.\d+)?$/.test(stop)) return Number(stop)
	}

	throw new Error(`No class "${prefix}<stop>" in: ${JSON.stringify(classes)}`)
}

/**
 * Reads the value of each step from the first stepped class that starts with
 * `prefix`, such as `density-px-[1,2,3]` for the prefix `density-px-`. Three
 * values give `sm`, `md`, and `lg`, and each outer step takes the value of its
 * neighbor. It reads the list with `valuesByStep`, as the stepped utilities of
 * `core/density` do.
 *
 * @throws If no class has the prefix and a list of three or five values.
 */
export function findSteps(
	classes: readonly unknown[],
	prefix: string,
): Record<DensityStep, string> {
	for (const name of classNames(classes)) {
		if (!name.startsWith(`${prefix}[`) || !name.endsWith(']')) continue

		const values = valuesByStep(name.slice(prefix.length + 1, -1))

		if (values) return values
	}

	throw new Error(`No class "${prefix}[…]" in: ${JSON.stringify(classes)}`)
}

/**
 * Reads the icon-only pad of a bare button at `size`, from the stepped `bare`
 * variant of the button kata.
 */
export function findBareCompoundP(size: DensityStep): number {
	const bare = button.config.variants.variant?.bare as readonly unknown[]

	return Number(findSteps(bare, 'not-data-has-label:density-p-')[size])
}
