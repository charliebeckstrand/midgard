/**
 * The `text-trim` and `inline-trim` Tailwind variants. `ui/tailwind.css` loads
 * this plugin with `@plugin`.
 *
 * - `text-trim` applies in a browser that reads the trim of a text box to the
 *   cap height and the baseline ({@link TEXT_TRIM}). Chrome 133, Safari 18.2,
 *   and Firefox 154 read it. A block container takes it.
 * - `inline-trim` applies where `text-trim` applies, unless the root element
 *   has the {@link ROOT_NO_INLINE_TRIM_CLASS} class. A browser can read the
 *   trim and trim only a block container, as Safari 18.2 does, and no CSS
 *   query can see that. `AppearanceProvider` measures it, and it adds the
 *   class after hydration (`markInlineTrim`). An inline box takes this
 *   variant. Before hydration, such a browser paints the inline box with the
 *   larger padding and no trim.
 *
 * A browser that does not read the trim keeps the classes with no variant. The
 * root selector is in `:where()`, so the variant adds no specificity.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { ROOT_NO_INLINE_TRIM_CLASS, TEXT_TRIM } from './root.ts'

const QUERY = `@supports (text-box: ${TEXT_TRIM})`

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addVariant }) => {
	addVariant('text-trim', { [QUERY]: { '@slot': {} } })

	addVariant('inline-trim', {
		[QUERY]: { [`&:not(:where(.${ROOT_NO_INLINE_TRIM_CLASS} *))`]: { '@slot': {} } },
	})
}
