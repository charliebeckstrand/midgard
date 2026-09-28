/**
 * The stepped utilities of density. `ui/tailwind.css` loads this plugin with
 * `@plugin`.
 *
 * A stepped utility writes one property at each step in one class. The class
 * takes the value of each step as a list, for example `density-p-[2,3,4]`.
 * Three values give `sm`, `md`, and `lg`, and each outer step takes the value
 * of its neighbor. Five values give the steps from `xs` to `xl`. The class
 * writes the same rules as the triad `density-sm:p-2 density-md:p-3
 * density-lg:p-4`, so the element takes the value of its nearest scope, and a
 * consumer `className` wins. `rungs.ts` gives the rank.
 *
 * A spacing utility takes stops of the spacing scale. `density-text` takes the
 * names of the text scale. `density-rounded` takes the names of the radius
 * scale, or stops of the spacing scale as `rounded-[--spacing(n)]` does. A stepped utility takes each variant, as a core utility does, for
 * example `*:data-[slot=icon]:density-size-[3,4,5,6,6]`.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { stepped } from './rungs'

/** A stop of the spacing scale, such as `2` or `1.5`. */
const isStop = (value: string) => /^\d+(\.\d+)?$/.test(value)

/** A name of a theme scale, such as `sm` or `2xl`. */
const isName = (value: string) => /^[a-z0-9]+$/.test(value)

const spacing = (stop: string) => `calc(var(--spacing) * ${stop})`

/** The CSS properties of each stepped spacing utility. */
const spacingProperties = {
	p: ['padding'],
	px: ['padding-inline'],
	py: ['padding-block'],
	pt: ['padding-top'],
	pb: ['padding-bottom'],
	ps: ['padding-inline-start'],
	pe: ['padding-inline-end'],
	ms: ['margin-inline-start'],
	me: ['margin-inline-end'],
	gap: ['gap'],
	'gap-x': ['column-gap'],
	'gap-y': ['row-gap'],
	my: ['margin-block'],
	mb: ['margin-bottom'],
	size: ['width', 'height'],
	h: ['height'],
	'max-h': ['max-height'],
	w: ['width'],
	'min-w': ['min-width'],
	left: ['left'],
}

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ matchUtilities }) => {
	for (const [name, properties] of Object.entries(spacingProperties)) {
		matchUtilities({
			[`density-${name}`]: stepped(
				(stop) => Object.fromEntries(properties.map((property) => [property, spacing(stop)])),
				isStop,
			),
		})
	}

	matchUtilities({
		'density-text': stepped(
			(name) => ({
				'font-size': `var(--text-${name})`,
				'line-height': `var(--tw-leading, var(--text-${name}--line-height))`,
			}),
			isName,
		),
		'density-rounded': stepped(
			(value) => ({ 'border-radius': isStop(value) ? spacing(value) : `var(--radius-${value})` }),
			(value) => isStop(value) || isName(value),
		),
	})
}
