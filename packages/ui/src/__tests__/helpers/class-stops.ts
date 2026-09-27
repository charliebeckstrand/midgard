import { type DensityStep, densitySteps } from '../../core/density'

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
 * neighbor, as the stepped utilities of `core/density` do.
 *
 * @throws If no class has the prefix and a list of three or five values.
 */
export function findSteps(
	classes: readonly unknown[],
	prefix: string,
): Record<DensityStep, string> {
	for (const name of classNames(classes)) {
		if (!name.startsWith(`${prefix}[`) || !name.endsWith(']')) continue

		const values = name.slice(prefix.length + 1, -1).split(',')

		if (values.length === 5) {
			return Object.fromEntries(densitySteps.map((step, index) => [step, values[index]])) as Record<
				DensityStep,
				string
			>
		}

		if (values.length === 3) {
			const [sm, md, lg] = values as [string, string, string]

			return { xs: sm, sm, md, lg, xl: lg }
		}
	}

	throw new Error(`No class "${prefix}[…]" in: ${JSON.stringify(classes)}`)
}
