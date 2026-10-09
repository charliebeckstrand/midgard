/**
 * The density utilities for Tailwind: the stepped utilities and the ring
 * utilities. `ui/tailwind.css` loads this plugin with `@plugin`, and
 * `utility-table.ts` lists each utility.
 *
 * A stepped utility writes one property at each step in one class. The class
 * takes the value of each step as a list, for example `density-p-[2,3,4]`.
 * Three values give `sm`, `md`, and `lg`, and each outer step takes the value
 * of its neighbor. Five values give the steps from `xs` to `xl`. The class
 * writes the same rules as the triad `density-sm:p-2 density-md:p-3
 * density-lg:p-4`, so the element takes the value of its nearest scope, and a
 * consumer `className` wins. `rungs.ts` gives the rank.
 *
 * A spacing utility takes stops of the spacing scale. A margin utility also
 * takes negative stops, for example `density-mb-[-3,-4,-5]`. `density-text` takes the
 * names of the text scale. It sets the line height to the text size plus 8 px,
 * and not to the line height of the Tailwind size, so the line, the text, and
 * the icon of each step move by the same 2 px (`geometry.ts`). A `leading-*`
 * class still wins. `density-rounded` takes the names of the radius
 * scale, or stops of the spacing scale as `rounded-[--spacing(n)]` does. A
 * stepped utility takes each variant, as a core utility does, for example
 * `*:data-[slot=icon]:density-size-[3,4,5,6,6]`. After a pseudo-element
 * variant it writes no rule that a browser matches, so a pseudo-element takes
 * a density variant instead (`variants.ts`).
 *
 * A kasane surface draws a 1 px ring inside its box. A ring utility takes a
 * stop of the spacing scale and subtracts the ring, so the content lines up
 * with the inset fill and not with the outer ring. For example, `px-ring-2` is
 * `padding-inline: calc(--spacing(2) - 1px)`. A ring utility and its stepped
 * form, such as `density-px-ring-[2,3,4]`, take each quarter stop from 0.25 to
 * 8.
 */

import type { PluginCreator } from 'tailwindcss/plugin'
import { type CssInJs, rungs } from './rungs'
import { type DensityStep, densitySteps, valuesByStep } from './steps'
import { type UtilityValue, utilityTable } from './utility-table'

/** A stop of the spacing scale, such as `2` or `1.5`. */
const isStop = (value: string) => /^\d+(\.\d+)?$/.test(value)

/** A stop of the spacing scale, or a negative stop, such as `-4`. */
const isMargin = (value: string) => isStop(value.replace(/^-/, ''))

/** A name of a theme scale, such as `sm` or `2xl`. */
const isName = (value: string) => /^[a-z0-9]+$/.test(value)

/** The stops of a ring utility: each quarter stop from 0.25 to 8. */
const ringStops = Object.fromEntries(
	Array.from({ length: 32 }, (_, index) => {
		const stop = String((index + 1) / 4)

		return [stop, stop]
	}),
)

/** A stop of the spacing scale in CSS, less the 1 px ring for a ring utility. */
const spacing = (stop: string, ring = false) =>
	`calc(var(--spacing) * ${stop}${ring ? ' - 1px' : ''})`

/** Declares `value` on each of `properties`. */
const each = (properties: readonly string[], value: string) =>
	Object.fromEntries(properties.map((property) => [property, value]))

/** The values that each kind of stepped utility takes. */
const valid: Record<UtilityValue, (value: string) => boolean> = {
	spacing: isStop,
	margin: isMargin,
	text: isName,
	radius: (value) => isStop(value) || isName(value),
}

/** The declarations of one value of each kind of stepped utility. */
const declare: Record<UtilityValue, (properties: readonly string[], value: string) => CssInJs> = {
	spacing: (properties, stop) => each(properties, spacing(stop)),
	margin: (properties, stop) => each(properties, spacing(stop)),
	text: (_, name) => ({
		'font-size': `var(--text-${name})`,
		'line-height': `var(--tw-leading, calc(var(--text-${name}) + 0.5rem))`,
	}),
	radius: (properties, value) =>
		each(properties, isStop(value) ? spacing(value) : `var(--radius-${value})`),
}

/**
 * Makes the callback of a stepped utility for `matchUtilities`. The utility
 * takes one arbitrary value with the value of each step, for example
 * `density-p-[2,3,4]`. It writes the declarations of each value on the rungs of
 * the steps with that value. Thus the element takes the value of its nearest
 * scope. A value that `isValid` rejects, or a list of the wrong length, writes
 * no CSS.
 */
function stepped(declareValue: (value: string) => CssInJs, isValid: (value: string) => boolean) {
	return (list: string): CssInJs[] => {
		const values = valuesByStep(list)

		if (!values || !densitySteps.every((step) => isValid(values[step]))) return []

		const groups = new Map<string, DensityStep[]>()

		for (const step of densitySteps) {
			groups.set(values[step], [...(groups.get(values[step]) ?? []), step])
		}

		return [...groups].map(([value, steps]) => rungs(steps, declareValue(value)))
	}
}

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ matchUtilities }) => {
	for (const [name, entry] of Object.entries(utilityTable)) {
		const { properties, value } = entry

		matchUtilities({
			[`density-${name}`]: stepped((v) => declare[value](properties, v), valid[value]),
		})

		if (!('ring' in entry)) continue

		const declareRing = (stop: string) => each(properties, spacing(stop, true))

		matchUtilities({ [`${name}-ring`]: declareRing }, { values: ringStops })

		matchUtilities({
			[`density-${name}-ring`]: stepped(declareRing, (stop) => Object.hasOwn(ringStops, stop)),
		})
	}
}
