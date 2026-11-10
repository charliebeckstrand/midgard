/**
 * The `surfaces-glass` Tailwind variant. `ui/tailwind.css` loads this plugin
 * with `@plugin`.
 *
 * The variant applies while the root element has the
 * {@link ROOT_GLASS_SURFACES_CLASS} class, that is, while the Surfaces setting
 * of the app is `'glass'`. A flat modal panel and its backdrop use it to paint
 * the glass surface. A server can paint an open modal panel before hydration,
 * and it paints the panel flat, because the server does not know the setting.
 * The class is on the root before the first paint, so that paint has the
 * surface that the reader chose. After hydration, the panel renders the glass
 * surface itself (`useReaderSurface`).
 *
 * The selector is in `:where()`, so the variant adds no specificity.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { ROOT_GLASS_SURFACES_CLASS } from './root.ts'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant(
		'surfaces-glass',
		`&:where(.${ROOT_GLASS_SURFACES_CLASS}, .${ROOT_GLASS_SURFACES_CLASS} *)`,
	)
}
