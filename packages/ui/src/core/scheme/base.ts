/**
 * The base color scheme of the page. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * The plugin sets `color-scheme` on the root element: `light`, and `dark`
 * while the root has the `dark` class. The browser draws its own parts of the
 * page in that scheme, such as the scrollbars and the parts of a native
 * control. Without the property, the browser draws these
 * parts light in dark mode, such as a light scrollbar on a dark sheet.
 *
 * `AppearanceProvider` sets the `dark` class, and its script sets it before the
 * first paint. Thus the first paint has the correct scheme, and an app adds no
 * style of its own.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addBase }) => {
	addBase({
		':root': { 'color-scheme': 'light' },
		':root.dark': { 'color-scheme': 'dark' },
	})
}
