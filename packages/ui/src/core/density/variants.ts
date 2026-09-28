/**
 * The `density-*` Tailwind variants. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * A density scope is an element with `data-density`, one value for each of
 * {@link densitySteps}. The root element is the scope of the app, and
 * DensityProvider writes a nested one. A component with an explicit `size`
 * writes one on its own element. That element is then its own
 * nearest scope, and its subtree follows it. A kata writes the classes of each
 * step under the matching variant, for example
 * `density-sm:px-1.5 density-md:px-2 density-lg:px-2.5`. The element takes the
 * step of the nearest scope, itself included, and reads no context. `rungs.ts`
 * gives the rank of each match.
 *
 * `density-[xs,sm]` matches each step of the list, as the triad of its steps
 * does. It serves a class of a pseudo-element, such as
 * `density-[xs,sm]:before:rounded-ring-1.5`. A pseudo-element ends a selector,
 * so the density variant comes before it. A stepped utility after a
 * pseudo-element writes no rule that a browser can match.
 *
 * `density-any` is the rank below each step: it applies at each density. It is
 * in the layer of the root rung (`density-0`) with no specificity, so each step
 * and each plain utility wins over it. A default that a step must replace, such
 * as the height of a Placeholder, uses it.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { rungs } from './rungs'
import { type DensityStep, densitySteps } from './steps'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant, matchVariant }) => {
	addVariant('density-any', { '@layer density-0': { ':where(&)': { '@slot': {} } } })

	for (const step of densitySteps) addVariant(`density-${step}`, rungs([step], { '@slot': {} }))

	matchVariant('density', (list) => {
		const steps = list.split(',').map((step) => step.trim())

		if (!steps.every((step): step is DensityStep => densitySteps.includes(step as DensityStep))) {
			return []
		}

		// `matchVariant` takes each rule as a string: an at-rule that holds the
		// selector, with no body. Tailwind writes the `@slot` into it.
		return Object.entries(rungs(steps, {})).map(
			([layer, rule]) => `${layer} { ${Object.keys(rule)[0]} }`,
		)
	})
}
