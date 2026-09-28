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
 * The root element is the scope of the app. `AppearanceScript` writes the
 * stored step on it before the first paint. The root does not count as a
 * depth: its rung is in the layer of depth 1 with no specificity of its own, so
 * each other scope wins over it, and the trees keep each ranked depth. With
 * no step on the root, the `md` step applies outside each scope.
 *
 * A control slot, such as the prefix of an Input, is an element with
 * `data-density="slot"`. It is a scope one step below the scope above it
 * (`stepDown`), so a slot needs no step in JS. The slot counts as one depth,
 * and its rung names the step of the scope above it. A slot in a slot takes
 * the step of the outer slot, because a rung reads one slot after a scope.
 */

import { type DensityStep, densitySteps, stepDown } from './steps'

/** A CSS rule in the object form of the plugin API. */
type CssInJs = { [key: string]: string | CssInJs }

/** The deepest nesting that the rungs rank. When more scopes nest, an outer scope can win. */
const maxDepth = 6

/** Excludes the root element, which is the scope of the app and ranks below each depth. */
const notRoot = ':not(:root)'

/** A density scope under the root: an explicit scope or a control slot. */
const scope = `[data-density]${notRoot}`

/** A control slot: a scope one step below the scope above it. */
const slot = "[data-density='slot']"

/** Matches an element with one of `steps` on `data-density`. */
function stepIn(steps: readonly DensityStep[]): string {
	const each = steps.map((step) => `[data-density='${step}']`)

	return each.length === 1 ? `${each[0]}` : `:is(${each.join(', ')})`
}

/**
 * The rungs of a set of steps, keyed by the layer of each depth. Each rung
 * holds `body`: the `@slot` of a variant, or the declarations of a utility.
 */
export function rungs(steps: readonly DensityStep[], body: CssInJs): CssInJs {
	const layers: CssInJs = {}

	const own = stepIn(steps)

	// The steps whose slots take one of `steps`.
	const hosts = densitySteps.filter((host) => steps.includes(stepDown(host)))

	const host = hosts.length > 0 ? stepIn(hosts) : null

	for (let depth = 1; depth <= maxDepth; depth++) {
		const above = `${scope} `.repeat(depth - 1)

		const selectors = [`${above}${own}${notRoot} &`, `${above}&${own}${notRoot}`]

		if (depth === 1) {
			selectors.push(`:where(:root${own}) &`)

			if (host) selectors.push(`:where(:root${host}) ${slot} &`, `:where(:root${host}) &${slot}`)

			if (steps.includes('md')) {
				selectors.push(`:where(:root:not([data-density])) &:not(${scope}, ${scope} *)`)
			}

			if (hosts.includes('md')) {
				selectors.push(
					`:where(:root:not([data-density])) ${slot} &`,
					`:where(:root:not([data-density])) &${slot}`,
				)
			}
		} else if (host) {
			const aboveHost = `${scope} `.repeat(depth - 2)

			selectors.push(
				`${aboveHost}${host}${notRoot} ${slot} &`,
				`${aboveHost}${host}${notRoot} &${slot}`,
			)
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
