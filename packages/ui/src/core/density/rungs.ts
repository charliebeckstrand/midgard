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
 * Other forms do not work. An ancestor selector alone does not follow nesting,
 * because the source order wins and the nearest scope does not. `@scope` and
 * container style queries ship in Firefox after the browser floor. Custom
 * properties move the styles out of the Tailwind classes.
 *
 * The root element is the scope of the app. `md` is the base of each stepped
 * class: its rung is in the layer `density-0` and reads no ancestor. For each
 * other step, `AppearanceScript` writes a class on the root before the first
 * paint ({@link rootDensityClasses}), and the rung of that class is in the
 * same layer. The class gives the rung one more class of specificity, so it
 * wins over the base. At `md` the root has no mark. The root does not count as
 * a depth: `density-0` is below the layer of each depth, so each other scope
 * wins over it, and the trees keep each ranked depth. The rungs write
 * `density-0` first, so it is the first layer in the output. Tailwind writes
 * nested layers in the order of first use, and it moves a `@layer` order
 * statement after the utilities, so only the order of the rules sets the
 * order of the layers. `density-any` is
 * in the same layer with no specificity, so the base wins over it.
 *
 * A scope element with a step is its own nearest scope, so its rung reads no
 * depth. It is in the layer of the deepest depth. When the element is not
 * deeper than `maxDepth`, no rung of a scope above it is in that layer.
 *
 * Each rung of a depth names the class once, and the scopes that it reads
 * are in `:where()`. So each rung of a depth has the specificity of its class
 * and one attribute, and of two density classes on one element, the later
 * class wins, as with two plain utilities.
 *
 * Chromium rejects a rung through its ancestor filter when no ancestor has a
 * name in the rung: a class, or the name of an attribute. The filter reads no
 * name in `:where()`. So the rung of an element under a scope names
 * `[data-density]` outside its `:where()`, and the filter rejects it when no
 * scope is above the element. Each root rung is its own selector with its
 * class outside `:where()`, so the filter rejects the rung of each step that
 * the root does not hold.
 *
 * The rungs of one layer match the same element only for the nearest scope.
 * So the rank does not use specificity, and a selector list of one layer keeps
 * its rank when Tailwind wraps it in `:is()`. Tailwind does that for a variant
 * before a pseudo-element, such as `density-md:before:p-2`.
 *
 * A control slot, such as the prefix of an Input, is an element with
 * `data-density="slot"`. It is a scope one step below the scope above it, so a
 * slot needs no step in JS. No step is below `xs`, so in an `xs` scope the
 * slot takes `xs` (`slotStep`). The slot counts as one depth, and its rung
 * names the step of the scope above it. A slot in a slot takes the step of the outer slot, because a rung reads one
 * slot after a scope.
 */

import {
	type DensityStep,
	densitySteps,
	type MarkedStep,
	rootDensityClasses,
	slotStep,
} from './steps'

/** A CSS rule in the object form of the plugin API. */
export type CssInJs = { [key: string]: string | CssInJs }

/**
 * The deepest nesting that the rungs rank. When more scopes nest, an outer
 * scope can win. The output grows with the square of this value. The apps nest
 * one scope deep and the docs site two. The smoke test of the docs pages
 * (`page-smoke.test.tsx`) fails when a page nests deeper.
 */
export const maxDepth = 2

/** A density scope under the root: an explicit scope or a control slot. */
const scope = '[data-density]'

/** A control slot: a scope one step below the scope above it, and `xs` in an `xs` scope. */
const slot = "[data-density='slot']"

/** Matches an element with one of `steps` on `data-density`. */
function stepIn(steps: readonly DensityStep[]): string {
	const each = steps.map((step) => `[data-density='${step}']`)

	return each.length === 1 ? `${each[0]}` : `:is(${each.join(', ')})`
}

/** Returns `true` when the root marks `step` with a class. */
function isMarked(step: DensityStep): step is MarkedStep {
	return Object.hasOwn(rootDensityClasses, step)
}

/** The selector of the root class for `step`. */
const rootMark = (step: MarkedStep) => `.${rootDensityClasses[step]}`

/**
 * Matches the root element when it holds one of `steps`. The root has no mark
 * at `md`, so a set with `md` names the marks that the root must not hold.
 */
function rootIn(steps: readonly DensityStep[]): string {
	if (steps.includes('md')) {
		const others = densitySteps.filter(isMarked).filter((step) => !steps.includes(step))

		return others.length > 0 ? `:root:not(${others.map(rootMark).join(', ')})` : ':root'
	}

	const marks = steps.filter(isMarked).map(rootMark)

	return marks.length === 1 ? `${marks[0]}` : `:is(${marks.join(', ')})`
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
 * The host of a slot at `depth` with one of `hosts`: the root at the first
 * depth, and a scope under `depth - 2` scopes at each other depth.
 */
function hostAt(depth: number, hosts: readonly DensityStep[]): string {
	return depth === 1 ? rootIn(hosts) : `${`${scope} `.repeat(depth - 2)}${stepIn(hosts)}`
}

/**
 * The scopes at `depth` that give one of `steps`: a scope with one of `steps`
 * under `depth - 1` scopes, and a slot under a host of `hosts`.
 */
function scopesAt(
	depth: number,
	steps: readonly DensityStep[],
	hosts: readonly DensityStep[],
): string[] {
	const scopes = [`${`${scope} `.repeat(depth - 1)}${stepIn(steps)}`]

	return hosts.length > 0 ? [...scopes, `${hostAt(depth, hosts)} ${slot}`] : scopes
}

/**
 * The rungs of a set of steps, keyed by layer. Each rung holds `body`: the
 * `@slot` of a variant, or the declarations of a utility.
 *
 * The layer of each depth holds the rung of an element under a scope at that
 * depth, and the rung of a slot element. The layer of the deepest depth also
 * holds the rung of a scope element with one of `steps`.
 */
export function rungs(steps: readonly DensityStep[], body: CssInJs): CssInJs {
	// The steps whose slots take one of `steps`.
	const hosts = densitySteps.filter((host) => steps.includes(slotStep(host)))

	const layers: CssInJs = { '@layer density-0': rootRungs(steps, body) }

	for (let depth = 1; depth <= maxDepth; depth++) {
		const selectors = [`${scope}:where(${scopesAt(depth, steps, hosts).join(', ')}) &`]

		if (hosts.length > 0) selectors.push(`:where(${hostAt(depth, hosts)}) &${slot}`)

		if (depth === maxDepth) selectors.push(`&${stepIn(steps)}`)

		layers[`@layer density-${depth}`] = { [selectors.join(', ')]: body }
	}

	return layers
}
