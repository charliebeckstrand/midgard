/**
 * The `touch-gap-x`, `touch-gap-y`, and `touch-gap` utilities: a gap between
 * hosts of a hit area (`TouchTarget`), and the part of that gap that each hit
 * area can fill. `ui/tailwind.css` loads this plugin with `@plugin`.
 *
 * A row or a stack of hosts sets `--touch-target-gap-x` or
 * `--touch-target-gap-y` to the space between two hosts, so the hit areas meet
 * and do not overlap. When the space is the gap of the container, the gap and
 * the variable are one length. Each utility writes the two from one stop:
 * `touch-gap-y-0.5` is `gap-y-0.5` and `[--touch-target-gap-y:--spacing(0.5)]`.
 * A container whose hosts have padding around them, so that the space is not
 * the gap, writes the two apart.
 *
 * The stops are 0 and each quarter stop from 0.25 to 8, as the ring utilities
 * take. The stepped gaps of `dan.gap` have their own touch ramps
 * (`dan.gap.touch`).
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/** The stops of a touch gap: 0 and each quarter stop from 0.25 to 8. */
const stops = Object.fromEntries(
	Array.from({ length: 33 }, (_, index) => {
		const stop = String(index / 4)

		return [stop, stop]
	}),
)

/** The length of a stop of the spacing scale. */
const length = (stop: string) => `calc(var(--spacing) * ${stop})`

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ matchUtilities }) => {
	matchUtilities(
		{
			'touch-gap-x': (stop: string) => ({
				'column-gap': length(stop),
				'--touch-target-gap-x': length(stop),
			}),
			'touch-gap-y': (stop: string) => ({
				'row-gap': length(stop),
				'--touch-target-gap-y': length(stop),
			}),
			'touch-gap': (stop: string) => ({
				gap: length(stop),
				'--touch-target-gap-x': length(stop),
				'--touch-target-gap-y': length(stop),
			}),
		},
		{ values: stops },
	)
}
