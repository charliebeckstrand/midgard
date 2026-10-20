/**
 * The density utilities for Tailwind: the stepped utilities, the ring
 * utilities, and the base rules of the density scopes. `ui/tailwind.css` loads
 * this plugin with `@plugin`, and `utility-table.ts` lists each utility. The
 * `density-any` variant of `variants.ts` writes the same layer.
 *
 * A stepped utility writes one property at each step in one class. The class
 * takes the value of each step as a list, for example `density-p-[2,3,4]`.
 * Three values give `sm`, `md`, and `lg`, and each outer step takes the value
 * of its neighbor. Five values give the steps from `xs` to `xl`.
 *
 * Each density scope sets inherited custom properties that give its step (the
 * base rules below). Each stepped class is one rule, and its value is one
 * `calc()` of those custom properties. Thus the element takes the value of its
 * nearest scope at each depth, with no limit of depth. A pseudo-element
 * inherits the step of its element. A stepped utility takes each variant, as a
 * core utility does, for example `*:data-[slot=icon]:density-size-[3,4,5,6,6]`
 * or `before:density-rounded-ring-[1,1.5,2,2.5,3]`. The rule of a stepped class
 * has no selector of a scope, so it has the specificity of one class. Of two
 * stepped classes on one property, the later rule in the sheet wins.
 *
 * Each stepped rule is in the nested layer `density` of `utilities`. A plain
 * utility is in `utilities` itself, and it outranks each nested layer, so a
 * consumer `className` wins. `density-any` is in the same layer with no
 * specificity, so the one class of a stepped rule wins over it.
 *
 * A weighted sum takes only finite numbers and lengths. So these values
 * cannot be stepped:
 *
 * - A value that is not finite, such as the radius `full`. A weight of 0 times
 *   infinity is not a number, so the class writes no CSS.
 * - A name that is not a key of the theme. One unknown `var()` makes the sum
 *   invalid at each step, so the plugin checks each name, and the class writes
 *   no CSS.
 * - A keyword, such as a value of `display`, `box-shadow`, or
 *   `flex-direction`. No variant selects one step. A consumer adds a stepped
 *   entry to `utility-table.ts` for a numeric value, or reads the step in JS
 *   with `useDensityStep`, which paints `md` before hydration.
 *
 * A spacing utility takes stops of the spacing scale. A margin utility also
 * takes negative stops, for example `density-mb-[-3,-4,-5]`. `density-text`
 * takes the names of the text scale. It sets the line height to the text size
 * plus 8 px, and not to the line height of the Tailwind size, so the line, the
 * text, and the icon of each step move by the same 2 px (`geometry.ts`). A
 * `leading-*` class still wins. `density-rounded` takes the names of the
 * radius scale, or stops of the spacing scale as `rounded-[--spacing(n)]` does.
 * `density-w` takes the names of the container scale, or stops of the spacing
 * scale. A name must be a key of the theme, for example `--text-sm`, or the
 * class writes no CSS.
 *
 * `density-set` writes a custom property, and a plain utility reads it. The
 * modifier gives the name of the property in brackets, and the list gives
 * stops of the spacing scale, for example
 * `density-set-[4,5,6,7,8]/[--ui-panel-bottom]`. A stop can be negative.
 * A modifier that is not the name of a custom property, or no modifier, writes
 * no CSS. So does a name that the stepped classes read: a weight
 * (`--ui-d<step>` or `--ui-h<step>`), `--spacing`, or a name of Tailwind
 * (`--tw-*`). Such a property would read itself, and each stepped class below
 * it would write no value. The element that declares the property computes the `var()` of each
 * weight, so the property holds the length of the step of that element. Each
 * descendant reads that length, and not the length of its own step. Thus a
 * plain reader gives a value that the stepped utilities cannot give, for
 * example `pb-[calc(var(--ui-panel-bottom)+var(--ui-panel-safe,0px))]` or
 * `space-x-(--ui-avatar-overlap)`.
 *
 * A kasane surface draws a 1 px ring inside its box. A ring utility takes a
 * stop of the spacing scale and subtracts the ring, so the content lines up
 * with the inset fill and not with the outer ring. For example, `px-ring-2` is
 * `padding-inline: calc(--spacing(2) - 1px)`. A ring utility and its stepped
 * form, such as `density-px-ring-[2,3,4]`, take each quarter stop from 0.25 to
 * 8.
 */

import type { PluginAPI, PluginCreator } from 'tailwindcss/plugin'
import {
	type DensityStep,
	densitySteps,
	rootDensityClasses,
	slotStep,
	valuesByStep,
} from './steps.ts'
import { type UtilityEntry, type UtilityValue, utilityTable } from './utility-table.ts'

/** A CSS rule in the object form of the plugin API. */
type CssInJs = { [key: string]: string | CssInJs }

/** A value of each step. */
type ByStep<T> = Record<DensityStep, T>

/** The nested layer of each stepped rule. */
const LAYER = '@layer density'

/**
 * The custom property that holds the weight of `step` in a scope: 1 for the
 * step of the scope, and 0 for each other step.
 *
 * The weights inherit into each element of a consumer app. So each name has
 * the prefix `--ui-`, as Tailwind gives its own properties the prefix `--tw-`.
 * A consumer can give its own property a short private name such as `--_dmd`,
 * so a weight does not use such a name. A property of the consumer with the
 * name of a weight changes the density with no error.
 */
const toWeight = (step: DensityStep) => `--ui-d${step}`

/**
 * The custom property that holds the host weight of `step`. Only a scope with
 * a step sets it, so a control slot reads the weights of its host.
 */
const toHostWeight = (step: DensityStep) => `--ui-h${step}`

/** A stop of the spacing scale, such as `2` or `1.5`. */
const isStop = (value: string) => /^\d+(\.\d+)?$/.test(value)

/** A stop of the spacing scale, or a negative stop, such as `-4`. */
const isMargin = (value: string) => isStop(value.replace(/^-/, ''))

/** A word that can be the name of a theme key, such as `sm` or `2xl`. */
const isName = (value: string) => /^[a-z0-9]+$/.test(value)

/** The stops of a ring utility: each quarter stop from 0.25 to 8. */
const ringStops = Object.fromEntries(
	Array.from({ length: 32 }, (_, index) => {
		const stop = String((index + 1) / 4)

		return [stop, stop]
	}),
)

/** Declares `value` on each of `properties`. */
const each = (properties: readonly string[], value: string) =>
	Object.fromEntries(properties.map((property) => [property, value]))

/** Maps the value of each step through `map`. */
const mapSteps = <T>(values: ByStep<string>, map: (value: string) => T) =>
	Object.fromEntries(densitySteps.map((step) => [step, map(values[step])])) as ByStep<T>

/** Whether each step has the value of `md`. */
const isFlat = <T>(values: ByStep<T>) => densitySteps.every((step) => values[step] === values.md)

/** A number in CSS, with no trailing zeros. */
const format = (n: number) => String(Math.round(n * 1e6) / 1e6)

/** The term `factor` times `term`, with no factor of 1. */
const times = (factor: number, term: string) =>
	factor === 1 ? term : `${format(factor)} * ${term}`

/** The sum of `terms`, with a minus sign in place of each added negative term. */
const sum = (terms: readonly string[]) =>
	terms.length > 0
		? terms
				.join(' + ')
				.replace(/\+ -1 \* /g, '- ')
				.replace(/\+ -/g, '- ')
		: '0'

/** The weight of `step`. */
const weight = (step: DensityStep) => `var(${toWeight(step)})`

/** The sum of the weights of `steps`. */
const weights = (steps: readonly DensityStep[]) =>
	steps.length === 1 ? weight(steps[0] as DensityStep) : `(${steps.map(weight).join(' + ')})`

/** The steps of each distinct value of `values`, in the order of the steps. */
function groups<T>(values: ByStep<T>): Map<T, DensityStep[]> {
	const found = new Map<T, DensityStep[]>()

	for (const step of densitySteps)
		found.set(values[step], [...(found.get(values[step]) ?? []), step])

	return found
}

/**
 * The terms of a weighted sum of numbers: each distinct value times the sum of
 * the weights of its steps. With a `base`, each term is the difference from
 * the base, and the base is the first term. The weights of a scope sum to 1,
 * so the two forms give the same value.
 */
function terms(values: ByStep<number>, base: number | null): string {
	const deltas = Object.fromEntries(
		densitySteps.map((step) => [step, values[step] - (base ?? 0)]),
	) as ByStep<number>

	const parts = [...groups(deltas)]
		.filter(([delta]) => delta !== 0)
		.map(([delta, steps]) => times(delta, weights(steps)))

	if (base !== null && base !== 0) parts.unshift(format(base))

	return sum(parts)
}

/**
 * A number for each step. The base is the most frequent value, and `md` on a
 * tie. The function uses the base form only when it is shorter. The base
 * and each difference must also give each value exactly in double precision.
 */
function numberSum(values: ByStep<number>): string {
	const counts = new Map<number, number>()

	for (const step of densitySteps) counts.set(values[step], (counts.get(values[step]) ?? 0) + 1)

	let base = values.md

	for (const [value, count] of counts) if (count > (counts.get(base) ?? 0)) base = value

	const exact = densitySteps.every(
		(step) => Number(format(base)) + Number(format(values[step] - base)) === values[step],
	)

	const plain = terms(values, null)

	if (!exact) return plain

	const based = terms(values, base)

	return based.length < plain.length ? based : plain
}

/** A length for each step: each distinct length times the sum of the weights of its steps. */
function lengthSum(values: ByStep<string>): string {
	return [...groups(values)].map(([length, steps]) => `${length} * ${weights(steps)}`).join(' + ')
}

/**
 * The seam of the emitter: the CSS expression of a value for each step, with
 * no `calc()` around it. `number` takes unitless numbers, and `length` takes
 * CSS lengths, such as `var(--text-sm)`. Only this function and the base rules
 * know how a scope gives its step.
 *
 * Each scope sets a weight of 1 for its step and 0 for each other step, so the
 * value is a weighted sum. A weighted sum takes only finite numbers and
 * lengths.
 *
 * Each change below starts when the floor of `.browserslistrc` moves, not at a
 * date:
 *
 * - When each browser of the floor ships `if()`, this function can write
 *   `if(style(…))`. It can then take keywords and values that are not finite.
 *   Chrome 137 ships `if()`, and Chrome 142 adds the range syntax in
 *   `style()`. Firefox and Safari do not ship it.
 * - A container style query reads the nearest ancestor container, not the
 *   element. So it can give a variant for a descendant or a pseudo-element,
 *   but not for a scope element itself. It does not replace the weights. A
 *   style query on a custom property needs Chrome 111, Firefox 151, and
 *   Safari 18, so the floor does not have it. Safari does not let the root
 *   element be a container.
 * - `@scope` with proximity gives the nearest scope for each rule. But each
 *   rule needs its own `@scope` block, which Tailwind does not write from a
 *   variant. The weights already give the nearest scope for each stepped value.
 * - `inherit()` would let a control slot read the step of its parent with no
 *   host weights. No browser ships it.
 *
 * The versions come from MDN browser-compat-data 8.1.5 (October 2026).
 */
function pick(kind: 'number', values: ByStep<number>): string
function pick(kind: 'length', values: ByStep<string>): string
function pick(kind: 'number' | 'length', values: ByStep<number> | ByStep<string>): string {
	return kind === 'number'
		? numberSum(values as ByStep<number>)
		: lengthSum(values as ByStep<string>)
}

/** The CSS of a list of stops of the spacing scale, less the 1 px ring for a ring utility. */
function stops(values: ByStep<string>, ring = false): string {
	const rest = ring ? ' - 1px' : ''

	if (isFlat(values)) return `calc(var(--spacing) * ${values.md}${rest})`

	return `calc(var(--spacing) * (${pick('number', mapSteps(values, Number))})${rest})`
}

/** The CSS of a list of lengths. */
function lengths(values: ByStep<string>): string {
	return isFlat(values) ? values.md : `calc(${pick('length', values)})`
}

/** The theme scale of the names that each kind of stepped utility takes. */
const scaleByValue: Partial<Record<UtilityValue, string>> = { radius: 'radius', size: 'container' }

/** The declarations of a stepped utility of `entry` with `values`. */
function declare(entry: UtilityEntry, values: ByStep<string>): CssInJs {
	const { properties, value: kind } = entry

	if (kind === 'text') {
		const size = isFlat(values)
			? `var(--text-${values.md})`
			: pick(
					'length',
					mapSteps(values, (name) => `var(--text-${name})`),
				)

		return {
			'font-size': isFlat(values) ? size : `calc(${size})`,
			'line-height': `var(--tw-leading, calc(${size} + 0.5rem))`,
		}
	}

	if (densitySteps.every((step) => isMargin(values[step]))) {
		return each(properties, stops(values))
	}

	const named = (value: string) =>
		isStop(value) ? `calc(var(--spacing) * ${value})` : `var(--${scaleByValue[kind]}-${value})`

	return each(properties, lengths(mapSteps(values, named)))
}

/**
 * The checks of the values that each kind of stepped utility takes. A name
 * must be a key of the theme, because one unknown `var()` makes the sum
 * invalid at each step. `full` is not a radius here: its value is infinite,
 * and a weight of 0 times infinity is not a number.
 */
function checks(theme: PluginAPI['theme']): Record<UtilityValue, (value: string) => boolean> {
	const inTheme = (scale: string) => (value: string) =>
		isName(value) && theme(`--${scale}-${value}`) != null

	const isText = inTheme('text')

	const isRadius = inTheme('radius')

	const isContainer = inTheme('container')

	return {
		spacing: isStop,
		margin: isMargin,
		text: isText,
		radius: (value) => isStop(value) || (value !== 'full' && isRadius(value)),
		size: (value) => isStop(value) || isContainer(value),
	}
}

/**
 * Makes the callback of a stepped utility for `matchUtilities`. The utility
 * takes one arbitrary value with the value of each step, for example
 * `density-p-[2,3,4]`, and writes one rule in the layer `density`. A value
 * that `isValid` rejects, or a list of the wrong length, writes no CSS. Tailwind
 * gives the modifier of the class to `toRule`, and a rule of `null` writes no
 * CSS.
 */
function stepped(
	isValid: (value: string) => boolean,
	toRule: (values: ByStep<string>, modifier: string | null) => CssInJs | null,
) {
	return (list: string, extra?: { modifier: string | null }): CssInJs[] => {
		const values = valuesByStep(list)

		if (!values || !densitySteps.every((step) => isValid(values[step]))) return []

		const rule = toRule(values, extra?.modifier ?? null)

		return rule ? [{ [LAYER]: rule }] : []
	}
}

/**
 * The custom property that the modifier of `density-set` gives, such as
 * `--ui-panel-bottom` for `/[--ui-panel-bottom]`, or `null` for each other
 * modifier and for a name that the stepped classes read. Tailwind removes the brackets of an arbitrary modifier, and
 * the function also removes them if they are there.
 */
function parseProperty(modifier: string | null): string | null {
	const name = modifier?.replace(/^\[(.*)\]$/, '$1')

	return name && /^--[a-z0-9-]+$/i.test(name) && !RESERVED.test(name) ? name : null
}

/** The custom properties that the stepped classes read: the weights, `--spacing`, and the names of Tailwind. */
const RESERVED = /^--(?:ui-[dh](?:xs|sm|md|lg|xl)|spacing|tw-[a-z0-9-]*)$/i

/** The selectors of the scopes of `step`: a root class, if the step has one, and `data-density`. */
function formatScope(step: DensityStep): string {
	const attribute = `[data-density='${step}']`

	const mark = (rootDensityClasses as Partial<ByStep<string>>)[step]

	return mark ? `:root.${mark}, ${attribute}` : attribute
}

/** The weights and the host weights of a scope at `step`. */
function weightsAt(step: DensityStep): Record<string, string> {
	return Object.fromEntries(
		densitySteps.flatMap((other) => {
			const on = other === step ? '1' : '0'

			return [
				[toWeight(other), on],
				[toHostWeight(other), on],
			]
		}),
	)
}

/**
 * The base rules of the density scopes, from `densitySteps`,
 * `rootDensityClasses`, and `slotStep`.
 *
 * The root is `md` with no mark. A root class has the specificity of `:root`
 * and a class, so it wins over `:root`. Each other scope sets the weights of
 * its step, and `md` sets them again. A control slot sets the weight of each
 * step to the sum of the host weights of the hosts whose slot takes that step.
 * The slot sets no host weight, so a slot in a slot takes the step of the
 * outer slot.
 */
function scopes(): CssInJs {
	const rules: CssInJs = { ':root': weightsAt('md') }

	for (const step of densitySteps) rules[formatScope(step)] = weightsAt(step)

	rules["[data-density='slot']"] = Object.fromEntries(
		densitySteps.map((step) => {
			const hosts = densitySteps
				.filter((host) => slotStep(host) === step)
				.map((host) => `var(${toHostWeight(host)})`)

			const total =
				hosts.length === 0 ? '0' : hosts.length === 1 ? hosts[0] : `calc(${hosts.join(' + ')})`

			return [toWeight(step), total as string]
		}),
	)

	return rules
}

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addBase, matchUtilities, theme }) => {
	addBase(scopes())

	const valid = checks(theme)

	matchUtilities({
		'density-set': stepped(valid.margin, (values, modifier) => {
			const property = parseProperty(modifier)

			return property ? { [property]: stops(values) } : null
		}),
	})

	for (const [name, entry] of Object.entries(utilityTable) as [string, UtilityEntry][]) {
		const { properties, value } = entry

		matchUtilities({
			[`density-${name}`]: stepped(valid[value], (values) => declare(entry, values)),
		})

		if (!entry.ring) continue

		matchUtilities(
			{
				[`${name}-ring`]: (stop: string) =>
					each(properties, `calc(var(--spacing) * ${stop} - 1px)`),
			},
			{ values: ringStops },
		)

		matchUtilities({
			[`density-${name}-ring`]: stepped(
				(stop) => Object.hasOwn(ringStops, stop),
				(values) => each(properties, stops(values, true)),
			),
		})
	}
}
