/**
 * The ring utilities for Tailwind. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * A kasane surface draws a 1 px ring inside its box. A ring utility takes a
 * stop of the spacing scale and subtracts the ring. Thus the content lines up
 * with the inset fill and not with the outer ring. For example, `px-ring-2` is
 * `padding-inline: calc(--spacing(2) - 1px)`. The utilities are `p-ring`,
 * `px-ring`, `py-ring`, `ps-ring`, `pe-ring`, `ms-ring`, `me-ring`, and
 * `rounded-ring`. They take each quarter stop from 0.25 to 8, and they take
 * each variant, as a core utility does.
 *
 * `core/tw-merge.ts` puts each ring utility in the class group of its
 * property, so a later `px-4` replaces a `px-ring-2`.
 *
 * Layer: kiso · Concern: ring-compensated spacing
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { stepped } from '../../../core/density/rungs'

/** The stops of a ring utility: each quarter step from 0.25 to 8. */
const stops = Object.fromEntries(
	Array.from({ length: 32 }, (_, index) => {
		const stop = String((index + 1) / 4)

		return [stop, stop]
	}),
)

/** The CSS property of each ring utility. */
const properties = {
	'p-ring': 'padding',
	'px-ring': 'padding-inline',
	'py-ring': 'padding-block',
	'ps-ring': 'padding-inline-start',
	'pe-ring': 'padding-inline-end',
	'ms-ring': 'margin-inline-start',
	'me-ring': 'margin-inline-end',
	'rounded-ring': 'border-radius',
}

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ matchUtilities }) => {
	for (const [name, property] of Object.entries(properties)) {
		const declare = (stop: string) => ({ [property]: `calc(var(--spacing) * ${stop} - 1px)` })

		matchUtilities({ [name]: declare }, { values: stops })

		matchUtilities({ [`density-${name}`]: stepped(declare, (stop) => Object.hasOwn(stops, stop)) })
	}
}
