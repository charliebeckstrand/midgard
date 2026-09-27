/**
 * The `density-*` Tailwind variants. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * A density scope is an element with `data-density`, one value for each of
 * {@link densitySteps}. DensityProvider writes one. A component with an
 * explicit `size` writes one on its own element. That element is then its own
 * nearest scope, and its subtree follows it. A kata writes the classes of each
 * step under the matching variant, for example
 * `density-sm:px-1.5 density-md:px-2 density-lg:px-2.5`. The element takes the
 * step of the nearest scope, itself included, and reads no context.
 *
 * Rank: the depth of a match is the number of scopes on the path to the
 * element, the element itself included. Each rung matches one depth, and it is
 * in a nested cascade layer of `utilities` with the number of that depth. The
 * nearest scope gives the deepest match. Each variant lists its rungs from
 * depth 1 up, so Tailwind emits the layers in that order, and the last layer
 * wins. Thus the nearest scope wins. A plain utility is in `utilities` itself,
 * and it outranks each nested layer. So a consumer `className` always wins over
 * a density class.
 *
 * Outside each scope, `density-md` applies through its rung at depth 1. A kata
 * therefore writes no separate base class for the md step.
 *
 * `density-any` is the rank below each step: it applies at each density, in
 * layer 0, so each step and each plain utility wins over it. A default that a
 * step must replace, such as the height of a Placeholder, uses it. The plugin
 * adds it first, so Tailwind emits layer 0 first.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { densitySteps } from './steps'

/** The deepest nesting that the variants rank. When more scopes nest, an outer scope can win. */
const maxDepth = 6

/** A nested CSS rule in the object form of the plugin API. */
type Rule = { [key: string]: Rule }

/** The selectors of each depth for one step, keyed by the layer of that depth. */
function rungs(step: string): Rule {
	const layers: Rule = {}

	for (let depth = 1; depth <= maxDepth; depth++) {
		const above = '[data-density] '.repeat(depth - 1)

		const selectors = [`${above}[data-density='${step}'] &`, `${above}&[data-density='${step}']`]

		if (step === 'md' && depth === 1) selectors.push('&:not([data-density], [data-density] *)')

		layers[`@layer density-${depth}`] = { [selectors.join(', ')]: { '@slot': {} } }
	}

	return layers
}

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant('density-any', { '@layer density-0': { '&': { '@slot': {} } } })

	for (const step of densitySteps) addVariant(`density-${step}`, rungs(step))
}
