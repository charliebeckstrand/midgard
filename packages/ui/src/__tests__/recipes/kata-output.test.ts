// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'
import { k as colorPicker } from '../../recipes/kata/color-picker'
import { k as combobox } from '../../recipes/kata/combobox'
import { k as datePicker } from '../../recipes/kata/date-picker'
import { k as input } from '../../recipes/kata/input'
import { k as listbox } from '../../recipes/kata/listbox'
import { k as panel } from '../../recipes/kata/panel'
import { k as textarea } from '../../recipes/kata/textarea'
import { omote } from '../../recipes/kiso'

// The output gate of the recipe migration. It resolves each part of each kata
// for each combination of its axes, and it compares the class sets with the
// snapshot that main gave. A migration of a kata to a new shape must keep the
// classes of each part, so a change to the snapshot is a change of the output.
//
// The gate reads a part in the same way for each shape of kata. The path of a
// part is its key path under the export. A unit that returns slots gives
// `k.<slot>` for each slot, the same path as a static slot or a sibling recipe
// of the old shape. An axis that does not change the classes of a part is not
// in the key of that part. Thus a part keeps its key when a kata merges its
// recipes into one unit with more axes.
//
// A part can also move to an element that held the classes of several parts
// on main. The control units are an example: the frame of an Input held the
// classes of ControlFrame, of the surface recipe, and of the affix layout. The
// gate then composes the parts of main, and it compares the result with the
// slot of the unit (`COMPOSED`).
//
// The snapshot is the output of main. It does not change while the migration
// runs. This gate is temporary. Delete it when the recipe migration ends.

/** The kata modules, by file. */
const modules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

/**
 * The parts that a migration renamed, from the new path to the path on main. The
 * root slot of a unit is `base`, so the part that was the root recipe of a kata
 * takes that name.
 */
const RENAMES: Record<string, string> = {
	'tabs.k.base': 'tabs.k.group',
	'tabs.k.base()': 'tabs.k.group()',
	'button.k.base': 'button.k',
	'button.k.base()': 'button.k()',
	'slider.k.base': 'slider.k',
	'slider.k.base()': 'slider.k()',
	'checkbox.k.base': 'checkbox.k',
	'checkbox.k.base()': 'checkbox.k()',
	'radio.k.base': 'radio.k',
	'radio.k.base()': 'radio.k()',
	'dialog.k.base': 'dialog.k.panel',
	'dialog.k.base()': 'dialog.k.panel()',
	'drawer.k.base': 'drawer.k.panel',
	'drawer.k.base()': 'drawer.k.panel()',
	'sheet.k.base': 'sheet.k.panel',
	'sheet.k.base()': 'sheet.k.panel()',
	'panel.k.stack': 'panel.k.base',
}

/**
 * The new paths that repeat a part of main, to the path of that part. A unit
 * that extends a group gets each slot of the group, so it can hold a slot that
 * only another unit held on main.
 */
const REPEATS: Record<string, string> = {
	...Object.fromEntries(
		['title', 'description', 'header', 'body', 'footer', 'content'].map((slot) => [
			`dialog.k.${slot}`,
			`panel.k.${slot}`,
		]),
	),
	'sheet.k.content': 'panel.k.content',
	'panel.k.backdrop': 'dialog.k.backdrop',
	'panel.k.backdrop()': 'dialog.k.backdrop()',
}

/** The parts of main that left the surface of each kata: fragments that only a kata reads. */
const DROPPED = /^panel\.k\.(gap|inset)\./

/**
 * The paths that a composition replaces. The new paths are the slots of the
 * control units, and the main paths are the parts that each slot composes.
 */
const COMPOSED = {
	current:
		/^((input|textarea|listbox|combobox|date-picker|color-picker)\.k\.(base|field|prefix|suffix)|panel\.k\.base)(\(\))?$/,
	main: /^(control\.k\.frame\.(base|radius)|select\.k\.(affix\.(base|prefix|suffix)|surface\.default)|select\.scale|input\.k(\.(affix\.(base|prefix|suffix)|frame|surface|surface\(\)))?|textarea\.k(\.(bare|frame|number|surface|surface\(\))|\(\))?|(listbox|combobox)\.k|(date|color)-picker\.k\.button)$/,
}

/** The output of main, by path. */
const main = JSON.parse(
	readFileSync(join(import.meta.dirname, '__snapshots__/kata-output.json'), 'utf8'),
) as Record<string, string | Record<string, string>>

/** The limit of the combinations of one recipe. A larger recipe varies one axis at a time. */
const COMBINATION_CAP = 4096

/** A recipe of the engine: a callable with its resolved config. */
type RecipeLike = ((props?: Record<string, string>) => unknown) & {
	config: { variants: Record<string, Record<string, unknown>> }
}

/** The classes of a class value, merged as `cn` merges them, in sorted order. */
function classes(value: unknown): string {
	return twMerge(clsx(value as ClassValue))
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(' ')
}

/** True when the value is a class list: a string, or an array of class lists. */
function isClassList(value: unknown): boolean {
	if (typeof value === 'string') return true

	if (value === null || value === undefined || value === false) return true

	return Array.isArray(value) && value.every(isClassList)
}

function isRecipe(value: unknown): value is RecipeLike {
	return typeof value === 'function' && 'config' in value
}

/** Each combination of the axis values, or one axis at a time when the product is too large. */
function combinations(axes: [string, string[]][]): Record<string, string>[] {
	const product = axes.reduce((count, [, values]) => count * values.length, 1)

	if (product > COMBINATION_CAP) {
		return axes.flatMap(([axis, values]) => values.map((value) => ({ [axis]: value })))
	}

	return axes.reduce<Record<string, string>[]>(
		(rows, [axis, values]) =>
			rows.flatMap((row) => values.map((value) => ({ ...row, [axis]: value }))),
		[{}],
	)
}

function comboKey(combo: Record<string, string>, axes: string[]): string {
	return axes.map((axis) => `${axis}=${combo[axis]}`).join(',')
}

/**
 * Removes the axes that do not change the output. An axis does not change the
 * output when each two combinations that differ only in that axis give the same
 * classes.
 */
function reduce(
	rows: { combo: Record<string, string>; out: string }[],
	axes: string[],
): Record<string, string> | string {
	const keep = axes.filter((axis) => {
		const others = axes.filter((name) => name !== axis)

		const seen = new Map<string, string>()

		for (const { combo, out } of rows) {
			const key = comboKey(combo, others)

			const prior = seen.get(key)

			if (prior !== undefined && prior !== out) return true

			seen.set(key, out)
		}

		return false
	})

	const table: Record<string, string> = {}

	for (const { combo, out } of rows) table[comboKey(combo, keep)] = out

	const values = Object.values(table)

	return keep.length === 0 && values.length === 1 ? (values[0] as string) : table
}

function walk(value: unknown, path: string, out: Record<string, unknown>): void {
	if (isRecipe(value)) {
		const axes = Object.entries(value.config.variants).map(
			([axis, map]) => [axis, Object.keys(map).sort()] as [string, string[]],
		)

		const names = axes.map(([axis]) => axis)

		const results = combinations(axes).map((combo) => ({ combo, result: value(combo) }))

		const defaults = value()

		const parts =
			typeof defaults === 'object' && defaults !== null
				? Object.keys(defaults as Record<string, unknown>).map(
						(part) => [part, `${path}.${part}`] as const,
					)
				: [[undefined, path] as const]

		for (const [part, partPath] of parts) {
			const pick = (result: unknown) =>
				classes(part === undefined ? result : (result as Record<string, unknown>)[part])

			const reduced = reduce(
				results.map(({ combo, result }) => ({ combo, out: pick(result) })),
				names,
			)

			out[partPath] = reduced

			// A part with axes also records the classes of a call with no props, which
			// hold its defaults.
			if (typeof reduced !== 'string') out[`${partPath}()`] = pick(defaults)
		}

		for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, out)

		return
	}

	if (typeof value === 'function') {
		out[path] = 'function'

		return
	}

	if (isClassList(value)) {
		out[path] = classes(value)

		return
	}

	if (typeof value !== 'object') {
		out[path] = String(value)

		return
	}

	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		walk(child, `${path}.${key}`, out)
	}
}

describe('kata output', () => {
	it('keeps the classes of each kata part', () => {
		const out: Record<string, unknown> = {}

		for (const [file, exports] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
			const name = file.replace(/^.*\/(.*)\.ts$/, '$1')

			for (const [key, value] of Object.entries(exports)) walk(value, `${name}.${key}`, out)
		}

		for (const [path, source] of Object.entries(REPEATS)) {
			expect(out[path], path).toEqual(main[source])
		}

		const current = Object.entries(out)
			.filter(([path]) => !COMPOSED.current.test(path) && !Object.hasOwn(REPEATS, path))
			.map(([path, value]) => [RENAMES[path] ?? path, value] as const)
			.sort(([a], [b]) => a.localeCompare(b))

		const expected = Object.entries(main)
			.filter(([path]) => !COMPOSED.main.test(path) && !DROPPED.test(path))
			.sort(([a], [b]) => a.localeCompare(b))

		expect(Object.fromEntries(current.map(sortAxes))).toEqual(
			Object.fromEntries(expected.map(sortAxes)),
		)
	})

	it('composes each slot of a control unit from the parts of main', () => {
		const rows: [label: string, current: string, expected: string][] = []

		const check = (label: string, current: unknown, ...expected: unknown[]) =>
			rows.push([label, classes(current), classes(expected)])

		const frame = [read('control.k.frame.base'), read('control.k.frame.radius')]

		for (const variant of ['default', 'outline', 'glass'] as const) {
			for (const affixed of [false, true]) {
				const slots = input({ variant, affixed })

				const layout = affixed ? read('input.k.frame') : ''

				check(
					`input base ${variant} ${affixed}`,
					slots.base,
					frame,
					read('input.k.surface', `variant=${variant}`),
					layout,
				)
				check(`input field ${variant}`, slots.field, read('input.k'))
				check(
					'input prefix',
					slots.prefix,
					read('input.k.affix.base'),
					read('input.k.affix.prefix'),
				)
				check(
					'input suffix',
					slots.suffix,
					read('input.k.affix.base'),
					read('input.k.affix.suffix'),
				)
			}

			for (const actions of [false, true]) {
				for (const resize of ['none', 'vertical', 'horizontal'] as const) {
					const slots = textarea({ variant, actions, resize })

					const bare = actions ? read('textarea.k.bare') : ''

					check(
						`textarea base ${variant} ${actions}`,
						slots.base,
						frame,
						actions ? read('textarea.k.frame') : '',
						read('textarea.k.surface', `variant=${variant}`),
					)
					check(
						`textarea field ${resize} ${actions}`,
						slots.field,
						read('textarea.k', `resize=${resize}`),
						bare,
					)
				}
			}
		}

		const triggers = [
			['listbox', listbox, 'listbox.k'],
			['combobox', combobox, 'combobox.k'],
			['date-picker', datePicker, 'date-picker.k.button'],
			['color-picker', colorPicker, 'color-picker.k.button'],
		] as const

		for (const [name, unit, field] of triggers) {
			const filled = (unit as typeof listbox)({ variant: 'default' })

			// A trigger in a glass overlay takes the `outline` surface: no fill.
			const glass = (unit as typeof listbox)({ variant: 'outline' })

			check(`${name} base`, filled.base, frame, read('select.k.surface.default'))
			check(`${name} base glass`, glass.base, frame)
			check(
				`${name} prefix`,
				filled.prefix,
				read('select.k.affix.base'),
				read('select.k.affix.prefix'),
			)
			check(
				`${name} suffix`,
				filled.suffix,
				read('select.k.affix.base'),
				read('select.k.affix.suffix'),
			)
			check(`${name} field`, filled.field, read(field))
		}

		// The root of the panel unit: the panel surface, moved from kiso as it was on
		// main, over the column of the slots.
		for (const surface of ['flat', 'glass'] as const) {
			check(
				`panel base ${surface}`,
				panel({ surface }).base,
				omote.panel.chrome,
				read('panel.k.base'),
				omote.panel.axis[surface],
			)
		}

		expect(rows.filter(([, current, expected]) => current !== expected)).toEqual([])
	})
})

/**
 * A path with the axes of each combination in sorted order. A unit lists the
 * axes of its group first, so the order of the axes in a key can change.
 */
function sortAxes([path, value]: readonly [string, unknown]): [string, unknown] {
	if (typeof value !== 'object' || value === null) return [path, value]

	const entries = Object.entries(value).map(([key, classes]) => [
		key.split(',').sort().join(','),
		classes,
	])

	return [path, Object.fromEntries(entries)]
}

/** The classes of a path of main, or of one combination of its axes. */
function read(path: string, combination?: string): string {
	const value = main[path]

	if (typeof value === 'string') return value

	const classes = combination === undefined ? undefined : value?.[combination]

	if (classes === undefined)
		throw new Error(`kata output: main has no "${path}" ${combination ?? ''}`)

	return classes
}
