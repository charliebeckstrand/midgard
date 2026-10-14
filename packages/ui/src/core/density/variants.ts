/**
 * The `density-any` Tailwind variant. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * `density-any` applies at each step. It is in the nested layer `density` of
 * `utilities`, with the stepped rules of `utilities.ts`, and it has no
 * specificity (`:where()`). So the one class of a stepped rule wins over it,
 * and a plain utility, which is in `utilities` itself, also wins over it. A
 * default that a stepped class can replace, such as the height of the line of
 * a text skeleton, uses it.
 *
 * No variant selects one step. A stepped utility of `utilities.ts` gives the
 * value of each step, and it takes the step of the nearest scope at each depth.
 * A keyword, such as a value of `box-shadow` or `display`, cannot be stepped.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant('density-any', { '@layer density': { ':where(&)': { '@slot': {} } } })
}
