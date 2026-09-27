/**
 * The rungs of density: the rules that the Tailwind plugins of density write.
 * The `density-*` variants of `variants.ts` and each stepped utility use them.
 *
 * A density scope is an element with `data-density`. The depth of a match is
 * the number of scopes on the path to the element, the element itself
 * included. Each rung matches one depth, and it is in a nested cascade layer of
 * `utilities` with the number of that depth. The nearest scope gives the
 * deepest match, and the last layer wins. Thus the nearest scope wins. A plain
 * utility is in `utilities` itself, and it outranks each nested layer. So a
 * consumer `className` always wins over a density class.
 *
 * Outside each scope, the `md` step applies through its rung at depth 1.
 */

import { type DensityStep, densitySteps } from './steps'

/** A CSS rule in the object form of the plugin API. */
type CssInJs = { [key: string]: string | CssInJs }

/** The deepest nesting that the rungs rank. When more scopes nest, an outer scope can win. */
const maxDepth = 6

/**
 * The rungs of a set of steps, keyed by the layer of each depth. Each rung
 * holds `body`: the `@slot` of a variant, or the declarations of a utility.
 */
export function rungs(steps: readonly DensityStep[], body: CssInJs): CssInJs {
	const layers: CssInJs = {}

	for (let depth = 1; depth <= maxDepth; depth++) {
		const above = '[data-density] '.repeat(depth - 1)

		const selectors = steps.flatMap((step) => [
			`${above}[data-density='${step}'] &`,
			`${above}&[data-density='${step}']`,
		])

		if (depth === 1 && steps.includes('md')) {
			selectors.push('&:not([data-density], [data-density] *)')
		}

		layers[`@layer density-${depth}`] = { [selectors.join(', ')]: body }
	}

	return layers
}

/**
 * Reads the value of a stepped utility: a list of three or five values,
 * separated by commas. Five values give the steps from `xs` to `xl`. Three
 * values give `sm`, `md`, and `lg`, and each outer step takes the value of its
 * neighbor. The function returns `null` for a list of a different length.
 */
function spread(list: string): Record<DensityStep, string> | null {
	const values = list.split(',').map((value) => value.trim())

	if (values.length === 5) {
		return Object.fromEntries(densitySteps.map((step, index) => [step, values[index]])) as Record<
			DensityStep,
			string
		>
	}

	if (values.length !== 3) return null

	const [sm, md, lg] = values as [string, string, string]

	return { xs: sm, sm, md, lg, xl: lg }
}

/**
 * Makes the callback of a stepped utility for `matchUtilities`. The utility
 * takes one arbitrary value with the value of each step, for example
 * `density-p-[2,3,4]`. It writes the declarations of each value on the rungs of
 * the steps with that value. Thus the element takes the value of its nearest
 * scope. A value that `valid` rejects, or a list of the wrong length, writes no
 * CSS.
 */
export function stepped(declare: (value: string) => CssInJs, valid: (value: string) => boolean) {
	return (list: string): CssInJs[] => {
		const values = spread(list)

		if (!values || !densitySteps.every((step) => valid(values[step]))) return []

		const groups = new Map<string, DensityStep[]>()

		for (const step of densitySteps)
			groups.set(values[step], [...(groups.get(values[step]) ?? []), step])

		return [...groups].map(([value, steps]) => rungs(steps, declare(value)))
	}
}
