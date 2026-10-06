/**
 * The `motion-reduce` and `motion-safe` Tailwind variants. `ui/tailwind.css`
 * loads this plugin with `@plugin`.
 *
 * The plugin replaces the two built-in variants of Tailwind with the same
 * names, so each class of ui and of the apps keeps its variant. The built-in
 * variants read only `prefers-reduced-motion`. These variants also read the
 * Motion setting of the app: the {@link rootReducedMotionClass} class on the
 * root element.
 *
 * - `motion-reduce` applies when the platform asks for reduced motion, or when
 *   the root has the class.
 * - `motion-safe` applies when the platform asks for no reduction, and the root
 *   does not have the class.
 *
 * Each selector is in `:where()`, so the variants add no specificity, as the
 * media queries of the built-in variants add none. A replaced variant keeps the
 * sort position of the built-in variant.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { rootReducedMotionClass } from './root'

const reduced = `:where(.${rootReducedMotionClass}, .${rootReducedMotionClass} *)`

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant('motion-reduce', {
		'@media (prefers-reduced-motion: reduce)': { '@slot': {} },
		[`&${reduced}`]: { '@slot': {} },
	})

	addVariant('motion-safe', {
		'@media (prefers-reduced-motion: no-preference)': {
			[`&:not(${reduced})`]: { '@slot': {} },
		},
	})
}
