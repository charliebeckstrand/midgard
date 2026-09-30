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
 * The root element is the scope of the app. `md` is the base of each stepped
 * class: its rung is in the layer `density-0` and reads no ancestor. For each
 * other step, `AppearanceScript` writes a class on the root before the first
 * paint ({@link rootDensityClasses}), and the rung of that class is in the
 * same layer. The class gives the rung one more class of specificity, so it
 * wins over the base. At `md` the root has no mark. The root does not count as
 * a depth: `density-0` is below the layer of each depth, so each other scope
 * wins over it, and the trees keep each ranked depth. The rungs write
 * `density-0` first, so it is the first layer in the output. `density-any` is
 * in the same layer with no specificity, so the base wins over it.
 *
 * Chromium rejects a rung through its ancestor filter when no ancestor has a
 * name in the rung: a class, or the name of an attribute. A class for each
 * step of the root lets it reject the rung of each other step, and a group of
 * steps names `[data-density]` outside its `:is()`, because the filter reads
 * no name in `:is()`.
 *
 * The rungs of one layer match the same element only for the nearest scope.
 * So the rank does not use specificity, and a selector list of one layer keeps
 * its rank when Tailwind wraps it in `:is()`. Tailwind does that for a variant
 * before a pseudo-element, such as `density-md:before:p-2`.
 *
 * A control slot, such as the prefix of an Input, is an element with
 * `data-density="slot"`. It is a scope one step below the scope above it
 * (`stepDown`), so a slot needs no step in JS. The slot counts as one depth,
 * and its rung names the step of the scope above it. A slot in a slot takes
 * the step of the outer slot, because a rung reads one slot after a scope.
 */

import {
	type DensityStep,
	densitySteps,
	type MarkedStep,
	rootDensityClasses,
	stepDown,
} from './steps'

/** A CSS rule in the object form of the plugin API. */
export type CssInJs = { [key: string]: string | CssInJs }

/**
 * The deepest nesting that the rungs rank. When more scopes nest, an outer
 * scope can win. The output grows with the square of this value. The apps nest
 * one scope deep and the docs site two, so 3 keeps one depth free. The demo
 * smoke test fails when a docs page nests deeper.
 */
export const maxDepth = 3

/** A density scope under the root: an explicit scope or a control slot. */
const scope = '[data-density]'

/** A control slot: a scope one step below the scope above it. */
const slot = "[data-density='slot']"

/**
 * Matches an element with one of `steps` on `data-density`. A group names the
 * attribute outside its `:is()`, so the ancestor filter of Chromium can reject
 * it.
 */
function stepIn(steps: readonly DensityStep[]): string {
	const each = steps.map((step) => `[data-density='${step}']`)

	return each.length === 1 ? `${each[0]}` : `[data-density]:is(${each.join(', ')})`
}

/** Returns `true` when the root marks `step` with a class. */
function isMarked(step: DensityStep): step is MarkedStep {
	return Object.hasOwn(rootDensityClasses, step)
}

/** The selector of the root class for `step`. */
const rootMark = (step: MarkedStep) => `.${rootDensityClasses[step]}`

/** The root element with no mark: its step is `md`. */
const unmarked = `:root:not(${Object.values(rootDensityClasses)
	.map((name) => `.${name}`)
	.join(', ')})`

/**
 * The rungs of the first depth that read the root element: a slot under a
 * root step whose slots take one of `steps`.
 */
function firstDepth(hosts: readonly DensityStep[]): string[] {
	const selectors: string[] = []

	for (const host of hosts) {
		const root = isMarked(host) ? `:where(${rootMark(host)})` : `:where(${unmarked})`

		selectors.push(`${root} ${slot} &`, `${root} &${slot}`)
	}

	return selectors
}

/**
 * The rungs of the root, in the layer `density-0`: the base for `md`, and a
 * class of the root for each other step. Each rung is its own rule, so the
 * `:is()` of a variant before a pseudo-element does not give the base the
 * specificity of a root class. Each step has a rung here, so `density-0` is
 * the first layer in the output.
 */
function rootRungs(steps: readonly DensityStep[], body: CssInJs): CssInJs {
	const rules: CssInJs = {}

	if (steps.includes('md')) rules['&'] = body

	for (const step of steps) if (isMarked(step)) rules[`${rootMark(step)} &`] = body

	return rules
}

/**
 * The rungs of a set of steps, keyed by the layer of each depth. Each rung
 * holds `body`: the `@slot` of a variant, or the declarations of a utility.
 */
export function rungs(steps: readonly DensityStep[], body: CssInJs): CssInJs {
	const own = stepIn(steps)

	// The steps whose slots take one of `steps`.
	const hosts = densitySteps.filter((host) => steps.includes(stepDown(host)))

	const host = hosts.length > 0 ? stepIn(hosts) : null

	const layers: CssInJs = { '@layer density-0': rootRungs(steps, body) }

	const first = firstDepth(hosts)

	for (let depth = 1; depth <= maxDepth; depth++) {
		const above = `${scope} `.repeat(depth - 1)

		const selectors = [`${above}${own} &`, `${above}&${own}`]

		if (depth === 1) {
			selectors.push(...first)
		} else if (host) {
			const aboveHost = `${scope} `.repeat(depth - 2)

			selectors.push(`${aboveHost}${host} ${slot} &`, `${aboveHost}${host} &${slot}`)
		}

		layers[`@layer density-${depth}`] = { [selectors.join(', ')]: body }
	}

	return layers
}
