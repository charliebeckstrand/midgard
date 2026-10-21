// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'
import { k as colorPicker } from '../../recipes/kata/color-picker'
import { k as combobox } from '../../recipes/kata/combobox'
import { k as datePicker } from '../../recipes/kata/date-picker'
import { k as descriptionList } from '../../recipes/kata/description-list'
import { k as dialog } from '../../recipes/kata/dialog'
import { k as events } from '../../recipes/kata/events'
import { k as fileUpload } from '../../recipes/kata/file-upload'
import { k as input } from '../../recipes/kata/input'
import { k as listbox } from '../../recipes/kata/listbox'
import { k as nav } from '../../recipes/kata/nav'
import { k as numberInput } from '../../recipes/kata/number-input'
import { k as offcanvas } from '../../recipes/kata/offcanvas'
import { k as overlay } from '../../recipes/kata/overlay'
import { k as panel } from '../../recipes/kata/panel'
import { k as popover } from '../../recipes/kata/popover'
import { k as queryBuilder } from '../../recipes/kata/query-builder'
import { k as sidebarLayout } from '../../recipes/kata/sidebar-layout'
import { k as stepper } from '../../recipes/kata/stepper'
import { k as textarea } from '../../recipes/kata/textarea'
import { k as toast } from '../../recipes/kata/toast'
import { k as tooltip } from '../../recipes/kata/tooltip'
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
	'menu.k.base': 'menu.k.content',
	'menu.k.header': 'menu.k.header.base',
	'menu.k.title': 'menu.k.header.title',
	'menu.k.description': 'menu.k.header.description',
	'menu.k.item.base': 'menu.k.item',
	'menu.k.item.label': 'menu.k.label',
	'menu.k.item.text': 'menu.k.text',
	'menu.k.item.description': 'menu.k.description',
	'menu.k.item.shortcut': 'menu.k.shortcut',
	'command-palette.k.base': 'command-palette.k.list',
	'popover.k.body': 'popover.k.padding',
	'nav.k.bar': 'nav.k.bar.base',
	'nav.k.bar()': 'nav.k.bar.base()',
	'nav.k.rail': 'nav.k.bar.rail',
	'toast.k.base': 'toast.k.viewport',
	'events.k.base': 'events.k.panel.base',
	'events.k.body': 'events.k.panel.body',
	'events.k.footer': 'events.k.panel.footer',
	...Object.fromEntries(
		[
			['group()', 'group.base'],
			['handle', 'sortable.handle'],
			['instant.duration', 'sortable.instant.duration'],
			['item', 'sortable.base'],
			['node', 'sortable.node'],
			['separator', 'sortable.separator'],
			['sortable', 'sortable.list'],
		].map(([current, main]) => [`query-builder.k.${current}`, `query-builder.k.${main}`]),
	),
	'stepper.k.button': 'stepper.k.item.button',
	'stepper.k.title()': 'stepper.k.title.base()',
	...Object.fromEntries(
		[
			['base()', 'base'],
			['aside()', 'aside'],
			['navbar()', 'navbar'],
			['panel()', 'panel'],
			['buffer()', 'floating.buffer'],
			['peek()', 'floating.peek'],
			['sheet', 'floating.sheet'],
			['sheetBody', 'floating.body'],
			['wrapper()', 'content.wrapper'],
			['content()', 'content.base'],
		].map(([current, main]) => [`sidebar-layout.k.${current}`, `sidebar-layout.k.${main}`]),
	),
	'stepper.k.check': 'stepper.k.indicator.check',
	'stepper.k.fill': 'stepper.k.indicator.active',
	'stepper.k.glyph': 'stepper.k.indicator.content',
	...Object.fromEntries(
		[
			'animate.opacity',
			'animate.scale',
			'exit.opacity',
			'exit.scale',
			'initial.opacity',
			'initial.scale',
			'transition.duration',
			'transition.ease',
		].map((key) => [`popover.k.motion.${key}`, `popover.k.panel.motion.${key}`]),
	),
	'command-palette.k.item.base': 'command-palette.k.item',
	'command-palette.k.item.label': 'command-palette.k.label',
	'command-palette.k.item.text': 'command-palette.k.text',
	'command-palette.k.item.description': 'command-palette.k.description',
	'command-palette.k.item.shortcut': 'command-palette.k.shortcut',
}

/**
 * The new paths that repeat a part of main, to the path of that part. A unit
 * that extends a group gets each slot of the group, so it can hold a slot that
 * only another unit held on main.
 */
const REPEATS: Record<string, string> = {
	'option.k.shortcut': 'menu.k.shortcut',
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
const DROPPED = /^(panel\.k\.(gap|inset)\.|overlay\.k\.backdrop\.glass$)/

/**
 * The paths that a composition replaces. The new paths are the slots of the
 * control units, and the main paths are the parts that each slot composes.
 */
const COMPOSED = {
	current:
		/^((input|textarea|listbox|combobox|date-picker|color-picker)\.k\.(base|field|prefix|suffix)|panel\.k\.base|file-upload\.k\.input\.\w+|number-input\.k\.field|popover\.k\.(base|content)|nav\.k\.base|tooltip\.k\.(base|trigger)|toast\.k\.item|overlay\.k\.(base|backdrop)|description-list\.k\.base|dialog\.k\.(base|box)|toast\.k\.(base|scroll)|stepper\.k\.(base|content|indicator|item|separator|step|title)|offcanvas\.k\.(base|drawerBlock|inlineBlock|inlineFlex|inlineInlineFlex)|events\.k\.button|query-builder\.k\.(parts|part|range))(\(\))?$|query-builder\.k\.group$|^sidebar-layout\.k\.(base|aside|navbar|panel|buffer|peek|wrapper|content|header|pin|headerActions|(pin|headerActions)\(\))$/,
	main: /^(file-upload\.k\.field|input\.k\.number|control\.k\.frame\.(base|radius)|select\.k\.(affix\.(base|prefix|suffix)|surface\.default)|select\.scale|input\.k(\.(affix\.(base|prefix|suffix)|frame|surface|surface\(\)))?|textarea\.k(\.(bare|frame|number|surface|surface\(\))|\(\))?|(listbox|combobox)\.k|(date|color)-picker\.k\.button|popover\.k\.(panel\.(base|glass|ring|surface)|text)|nav\.k\.list\.(base|orientation\.\w+)|tooltip\.k\.(content\.(base|surface\.\w+)|trigger\.(base|cursor))|toast\.k\.item\.\w+|overlay\.k\.(base|cover|frame|scoped|backdrop\.base)|description-list\.k\.(base|orientation\.\w+)|dialog\.k\.(panel(\(\))?|align\.\w+\.\w+)|toast\.k\.(viewport|scroll|position\.\w+\.[\w-]+)|stepper\.k\.((base|content|item|separator|step|title)\.(base(\(\))?|orientation\.\w+)|indicator\.(base|completed|current|interactive))|sidebar-layout\.k\.(header|layout\.\w+\.\w+)|offcanvas\.k\.(drawer|inline)\.\w+\.\w+|events\.k\.button\.\w+|query-builder\.k\.(group\.nested|parts\.\w+(\.\w+)?))$/,
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

		// The field of FileUpload is the field of an Input with the layout of the
		// display button. Its frame and affixes are those of an affixed Input.
		for (const variant of ['default', 'outline', 'glass'] as const) {
			const own = fileUpload.input({ variant, affixed: true })

			const shared = input({ variant, affixed: true })

			check(`file-upload base ${variant}`, own.base, shared.base)
			check(`file-upload prefix ${variant}`, own.prefix, shared.prefix)
			check(`file-upload suffix ${variant}`, own.suffix, shared.suffix)
			check(`file-upload field ${variant}`, own.field, shared.field, read('file-upload.k.field'))
		}

		check('number-input field', numberInput.field, read('input.k.number'), 'tabular-nums')

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

		// The root of the popover unit: the panel, with the surface that PopoverPanel
		// added on main. The content takes the glass fill that PopoverContent added.
		check(
			'popover base flat',
			popover({ surface: 'flat' }).base,
			read('popover.k.panel.surface'),
			read('popover.k.panel.base'),
		)
		check(
			'popover base glass',
			popover({ surface: 'glass' }).base,
			'group/glass',
			read('popover.k.panel.glass'),
			read('popover.k.panel.ring'),
			read('popover.k.panel.base'),
		)
		check('popover content flat', popover({ surface: 'flat' }).content, read('popover.k.text'))
		check(
			'popover content glass',
			popover({ surface: 'glass' }).content,
			read('popover.k.text'),
			read('popover.k.panel.glass'),
		)

		// The root of the nav unit: the list, with the orientation that NavList
		// added on main.
		for (const orientation of ['horizontal', 'vertical'] as const) {
			check(
				`nav base ${orientation}`,
				nav({ orientation }).base,
				read('nav.k.list.base'),
				read(`nav.k.list.orientation.${orientation}`),
			)
		}

		// The tooltip bubble with the surface, and the trigger with the cursor, that
		// the components added on main. The `default` surface of main is `flat`.
		for (const [surface, main] of [
			['flat', 'default'],
			['glass', 'glass'],
		] as const) {
			check(
				`tooltip base ${surface}`,
				tooltip({ surface }).base,
				read('tooltip.k.content.base'),
				read(`tooltip.k.content.surface.${main}`),
			)
		}
		check('tooltip trigger', tooltip({ enabled: false }).trigger, read('tooltip.k.trigger.base'))
		check(
			'tooltip trigger enabled',
			tooltip({ enabled: true }).trigger,
			read('tooltip.k.trigger.base'),
			read('tooltip.k.trigger.cursor'),
		)

		for (const edge of ['top', 'bottom'] as const) {
			check(`toast item ${edge}`, toast({ edge }).item, read(`toast.k.item.${edge}`))
		}

		// The overlay box: the rung and the box that Overlay picked on main.
		for (const cover of [false, true]) {
			for (const scoped of [false, true]) {
				check(
					`overlay base ${cover} ${scoped}`,
					overlay({ cover, scoped }).base,
					read(cover ? 'overlay.k.cover' : 'overlay.k.base'),
					read(scoped ? 'overlay.k.scoped' : 'overlay.k.frame'),
				)
			}
		}
		check(
			'overlay backdrop',
			overlay().backdrop,
			'absolute inset-0',
			read('overlay.k.backdrop.base'),
		)

		// The root of the description list: the grid, with the orientation that the
		// list resolved by breakpoint on main.
		check('description-list base', descriptionList().base, read('description-list.k.base'))

		for (const orientation of ['horizontal', 'vertical'] as const) {
			check(
				`description-list base ${orientation}`,
				descriptionList({ orientation }).base,
				read('description-list.k.base'),
				read(`description-list.k.orientation.${orientation}`),
			)
		}

		// The viewport and the stack of a toast, with the position that the stack
		// resolved by breakpoint on main.
		for (const position of [
			'top-right',
			'top-left',
			'bottom-right',
			'bottom-left',
			'top',
			'bottom',
		] as const) {
			const slots = toast({ position })

			check(
				`toast base ${position}`,
				slots.base,
				read('toast.k.viewport'),
				read(`toast.k.position.viewport.${position}`),
			)
			check(
				`toast scroll ${position}`,
				slots.scroll,
				read('toast.k.scroll'),
				read(`toast.k.position.scroll.${position}`),
			)
		}

		// The parts of a stepper, with the orientation that the stepper resolved by
		// breakpoint on main.
		for (const orientation of ['horizontal', 'vertical'] as const) {
			const slots = stepper({ orientation })

			for (const part of ['base', 'content', 'item', 'separator', 'step'] as const) {
				check(
					`stepper ${part} ${orientation}`,
					slots[part],
					read(`stepper.k.${part}.base`),
					read(`stepper.k.${part}.orientation.${orientation}`),
				)
			}

			// The title of main is a string in which `text-sm` sorts after
			// `leading-none`, so a merge of it drops the leading. Thus the title with no
			// orientation is compared as a set, and this check adds the orientation to it.
			for (const interactive of [false, true]) {
				check(
					`stepper title ${orientation} ${interactive}`,
					stepper({ orientation, interactive }).title,
					stepper({ interactive }).title,
					read(`stepper.k.title.orientation.${orientation}`),
				)
			}
		}

		for (const interactive of [false, true]) {
			expect(stepper({ interactive }).title.split(' ').sort()).toEqual(
				read('stepper.k.title.base', `interactive=${interactive}`).split(' ').sort(),
			)
		}

		// The indicator of a step, with the marks that the indicator added on main.
		for (const interactive of [false, true]) {
			for (const state of ['completed', 'current', 'upcoming'] as const) {
				check(
					`stepper indicator ${interactive} ${state}`,
					stepper({ interactive, state }).indicator,
					read('stepper.k.indicator.base'),
					interactive && read('stepper.k.indicator.interactive'),
					state !== 'upcoming' && read(`stepper.k.indicator.${state}`),
				)
			}
		}

		// The parts of the offcanvas and of the sidebar layout, with the layout that
		// each part resolved by breakpoint on main.
		for (const layout of ['drawer', 'inline'] as const) {
			const parts = offcanvas({ layout })

			check(
				`offcanvas drawerBlock ${layout}`,
				parts.drawerBlock,
				read(`offcanvas.k.drawer.block.${layout}`),
			)

			for (const [slot, display] of [
				['inlineBlock', 'block'],
				['inlineFlex', 'flex'],
				['inlineInlineFlex', 'inlineFlex'],
			] as const) {
				check(
					`offcanvas ${slot} ${layout}`,
					parts[slot],
					read(`offcanvas.k.inline.${display}.${layout}`),
				)
			}

			const slots = sidebarLayout({ layout })

			const shown = (only: 'drawer' | 'inline', display = 'block') =>
				read(`offcanvas.k.${only}.${display}.${layout}`)

			check(
				`sidebar-layout base ${layout}`,
				slots.base,
				read('sidebar-layout.k.base'),
				read(`sidebar-layout.k.layout.base.${layout}`),
			)
			check(
				`sidebar-layout navbar ${layout}`,
				slots.navbar,
				read('sidebar-layout.k.navbar'),
				shown('drawer'),
			)
			check(
				`sidebar-layout panel ${layout}`,
				slots.panel,
				read('sidebar-layout.k.panel'),
				shown('inline'),
			)
			check(
				`sidebar-layout aside ${layout}`,
				slots.aside,
				read('sidebar-layout.k.aside'),
				shown('inline'),
			)
			check(
				`sidebar-layout buffer ${layout}`,
				slots.buffer,
				read('sidebar-layout.k.floating.buffer'),
				shown('inline'),
			)
			check(
				`sidebar-layout peek ${layout}`,
				slots.peek,
				read('sidebar-layout.k.floating.peek'),
				read(`sidebar-layout.k.layout.peek.${layout}`),
			)
			check(
				`sidebar-layout wrapper ${layout}`,
				slots.wrapper,
				read('sidebar-layout.k.content.wrapper'),
				read(`sidebar-layout.k.layout.wrapper.${layout}`),
			)
			check(
				`sidebar-layout content ${layout}`,
				slots.content,
				read('sidebar-layout.k.content.base'),
				read(`sidebar-layout.k.layout.content.${layout}`),
			)
			check(
				`sidebar-layout header ${layout}`,
				slots.header,
				read('sidebar-layout.k.header', 'stickyHeader=false'),
				read(`sidebar-layout.k.layout.header.${layout}`),
			)
			check(
				`sidebar-layout sticky header ${layout}`,
				[slots.header, slots.pin],
				read('sidebar-layout.k.header', 'stickyHeader=true'),
				read(`sidebar-layout.k.layout.header.${layout}`),
				read(`sidebar-layout.k.layout.stickyHeader.${layout}`),
			)
			check(
				`sidebar-layout header actions ${layout}`,
				slots.headerActions,
				read('sidebar-layout.k.actions'),
				shown('inline', 'flex'),
			)
		}

		// The header button of the events, with the layout that the button resolved
		// by breakpoint on main.
		for (const layout of ['drawer', 'inline'] as const) {
			check(
				`events button ${layout}`,
				events({ layout }).button,
				'hidden [:root[data-events]_&]:contents',
				read(`events.k.button.${layout}`),
			)
		}

		// The group of a query builder, and the parts of a rule with the orientation
		// that the rule resolved by breakpoint on main.
		check('query-builder group', queryBuilder().group, read('query-builder.k.group.base'))
		check(
			'query-builder group nested',
			queryBuilder({ nested: true }).group,
			read('query-builder.k.group.base'),
			read('query-builder.k.group.nested'),
		)

		for (const orientation of ['horizontal', 'vertical'] as const) {
			const slots = queryBuilder({ orientation })

			check(
				`query-builder parts ${orientation}`,
				slots.parts,
				read(`query-builder.k.parts.base.${orientation}`),
			)
			check(
				`query-builder part ${orientation}`,
				slots.part,
				read('query-builder.k.parts.width'),
				read(`query-builder.k.parts.item.${orientation}`),
			)
			check(
				`query-builder range ${orientation}`,
				slots.range,
				read('query-builder.k.parts.width'),
				read(`query-builder.k.parts.range.${orientation}`),
			)
		}

		// The panel and the box of a dialog, with the align that the dialog
		// resolved by breakpoint on main.
		for (const align of ['bottom', 'center', 'top'] as const) {
			check(
				`dialog box ${align}`,
				dialog({ align }).box,
				'pointer-events-none absolute inset-0 flex min-h-full justify-center',
				read(`dialog.k.align.box.${align}`),
			)

			for (const surface of ['flat', 'glass'] as const) {
				for (const width of ['sm', 'lg', 'full'] as const) {
					check(
						`dialog base ${align} ${surface} ${width}`,
						dialog({ align, surface, width }).base,
						read('dialog.k.panel', `surface=${surface},width=${width}`),
						read(`dialog.k.align.panel.${align}`),
					)
				}
			}
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
