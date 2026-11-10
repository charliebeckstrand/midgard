/**
 * The `surfaces-solid` Tailwind variant. `ui/tailwind.css` loads this plugin
 * with `@plugin`.
 *
 * The variant applies while the root element has the
 * {@link ROOT_SOLID_SURFACES_CLASS} class, that is, while the Surfaces setting
 * of the app is `'solid'`. A glass overlay panel and its backdrop use it to
 * paint the flat surface. A server can paint an open overlay before
 * hydration, and the class is on the root before the first paint. Thus that
 * paint has the surface that the reader chose. After hydration, the panel
 * renders the flat surface itself (`useResolvedSurface`).
 *
 * The selector is in `:where()`, so the variant adds no specificity.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { ROOT_SOLID_SURFACES_CLASS } from './root.ts'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant(
		'surfaces-solid',
		`&:where(.${ROOT_SOLID_SURFACES_CLASS}, .${ROOT_SOLID_SURFACES_CLASS} *)`,
	)
}
