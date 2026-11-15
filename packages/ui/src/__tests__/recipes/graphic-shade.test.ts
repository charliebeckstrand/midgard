// @vitest-environment node
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import type { Color } from '../../core/recipe'
import { k as timeline } from '../../recipes/kata/timeline'
import { kasane, zu } from '../../recipes/kiso'
import { validation as checkValidation } from '../../recipes/kumi/check'
import { slider } from '../../recipes/kumi/slider'

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const satisfies readonly Color[]

/** The palette shade, such as `amber-600`, of a class: a color utility or a color variable. */
const parseShade = (name: string) =>
	/(?:^|:)(?:bg|text|fill|stroke)-([a-z]+-\d+)$/.exec(name)?.[1] ??
	/var\(--color-([a-z]+-\d+)\)/.exec(name)?.[1]

/** The light and the dark shade of a list of classes, each class of one hue. */
function readShades(classes: ClassValue, hue: string) {
	const names = clsx(classes)
		.split(' ')
		.filter((name) => parseShade(name)?.startsWith(`${hue}-`))

	const light = names.filter((name) => !name.startsWith('dark:')).map(parseShade)
	const dark = names.filter((name) => name.startsWith('dark:')).map(parseShade)

	return { light: [...new Set(light)], dark: [...new Set(dark)] }
}

/**
 * A hue that marks a value or a state as a graphic, not as text, has one shade in each mode: the
 * shade of its series slot (`zu.palette.series`). A dot, a timeline rail, a slider fill, a meter,
 * and a chart mark in one hue thus show one shade. `zu.marker` takes the text of the slot, which
 * must have the shade of its fill. The slider fill and the timeline rails are CSS that Tailwind
 * must find whole, so they copy the shade. Thus each one is held to the slot here.
 */
describe('one graphic shade for each hue', () => {
	it.each(COLORS)('gives %s the shade of its series slot in each copy', (hue) => {
		const slot = readShades(zu.palette.series[hue].bg, hue)

		expect(slot.light).toHaveLength(1)
		expect(slot.dark).toHaveLength(1)

		expect(readShades(zu.marker[hue], hue)).toEqual(slot)
		expect(readShades(zu.meter[hue].fill, hue)).toEqual(slot)
		expect(readShades(slider.slots.base.color[hue], hue)).toEqual(slot)
	})

	// The zinc rail is a structural line, not a mark of a state, so it takes the zinc border tone.
	it.each(COLORS.filter((hue) => hue !== 'zinc'))(
		'gives the %s timeline rails the shade of the slot',
		(hue) => {
			const slot = readShades(zu.palette.series[hue].bg, hue)

			expect(readShades(timeline({ lineBefore: hue, lineAfter: hue }).marker.base, hue)).toEqual(
				slot,
			)
		},
	)

	// A validation ring marks the state of a control as a graphic, so it takes the slot shade too.
	it.each([
		['a control frame', kasane.layers],
		['a check, a radio, and a switch', checkValidation],
	] as const)('gives each validation ring of %s the shade of its slot', (_, layers) => {
		for (const [state, hue] of [
			['invalid', 'red'],
			['warning', 'amber'],
			['valid', 'green'],
		] as const) {
			expectRing(clsx(layers), state, hue)
		}
	})
})

/** Expects the `state` ring classes in `classes` to take the shade of the `hue` slot in each mode. */
function expectRing(classes: string, state: string, hue: 'red' | 'amber' | 'green') {
	const slot = readShades(zu.palette.series[hue].bg, hue)

	const rings = classes.split(' ').filter((name) => name.includes(`has-[[data-${state}]]:`))

	const shades = (names: string[]) => [
		...new Set(names.flatMap((name) => /:ring-([a-z]+-\d+)$/.exec(name)?.[1] ?? [])),
	]

	const light = shades(rings.filter((name) => !name.startsWith('dark:')))
	const dark = shades(rings.filter((name) => name.startsWith('dark:')))

	// A ring with no dark class keeps its light shade in dark mode.
	expect({ state, light, dark: dark.length > 0 ? dark : light }).toEqual({ state, ...slot })
}
