/**
 * The `sidebar-offcanvas` Tailwind variant. `ui/tailwind.css` loads this plugin
 * with `@plugin`.
 *
 * The variant applies while the root element has the
 * {@link rootOffcanvasSidebarClass} class, that is, while the Sidebar setting of
 * the app is `'offcanvas'`. `SidebarLayout` uses it to show the floating sheet
 * in place of the inline panel. The class is on the root before the first
 * paint, so the first paint has the correct sidebar.
 *
 * The selector is in `:where()`, so the variant adds no specificity.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { rootOffcanvasSidebarClass } from './root'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant(
		'sidebar-offcanvas',
		`&:where(.${rootOffcanvasSidebarClass}, .${rootOffcanvasSidebarClass} *)`,
	)
}
