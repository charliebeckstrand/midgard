// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'
import { k as aspectRatio } from '../../recipes/kata/aspect-ratio'
import { k as box } from '../../recipes/kata/box'
import { k as breadcrumb } from '../../recipes/kata/breadcrumb'
import { k as calendar } from '../../recipes/kata/calendar'
import { k as card } from '../../recipes/kata/card'
import { k as colorPicker } from '../../recipes/kata/color-picker'
import { k as combobox } from '../../recipes/kata/combobox'
import { k as container } from '../../recipes/kata/container'
import { k as datePicker } from '../../recipes/kata/date-picker'
import { k as descriptionList } from '../../recipes/kata/description-list'
import { k as dialog } from '../../recipes/kata/dialog'
import { k as events } from '../../recipes/kata/events'
import { k as fileUpload } from '../../recipes/kata/file-upload'
import { k as flex } from '../../recipes/kata/flex'
import { k as formFilters } from '../../recipes/kata/form-filters'
import { k as gridGroup } from '../../recipes/kata/grid-group'
import { k as input } from '../../recipes/kata/input'
import { k as jsonTree } from '../../recipes/kata/json-tree'
import { k as kanban } from '../../recipes/kata/kanban'
import { k as lightbox } from '../../recipes/kata/lightbox'
import { k as listbox } from '../../recipes/kata/listbox'
import { k as markdown } from '../../recipes/kata/markdown'
import { k as nav } from '../../recipes/kata/nav'
import { k as numberInput } from '../../recipes/kata/number-input'
import { k as offcanvas } from '../../recipes/kata/offcanvas'
import { k as overlay } from '../../recipes/kata/overlay'
import { k as panel } from '../../recipes/kata/panel'
import { k as passwordStrength } from '../../recipes/kata/password-strength'
import { k as pdfViewer } from '../../recipes/kata/pdf-viewer'
import { k as placeholder } from '../../recipes/kata/placeholder'
import { k as popover } from '../../recipes/kata/popover'
import { k as queryBuilder } from '../../recipes/kata/query-builder'
import { k as queryChips } from '../../recipes/kata/query-chips'
import { k as resizable } from '../../recipes/kata/resizable'
import { k as sheet } from '../../recipes/kata/sheet'
import { k as sidebarLayout } from '../../recipes/kata/sidebar-layout'
import { k as signaturePad } from '../../recipes/kata/signature-pad'
import { k as status } from '../../recipes/kata/status'
import { k as stepper } from '../../recipes/kata/stepper'
import { k as tableKata } from '../../recipes/kata/table'
import { k as tagInput } from '../../recipes/kata/tag-input'
import { k as textarea } from '../../recipes/kata/textarea'
import { k as timeline } from '../../recipes/kata/timeline'
import { k as toast } from '../../recipes/kata/toast'
import { k as toggleIconButton } from '../../recipes/kata/toggle-icon-button'
import { k as tooltip } from '../../recipes/kata/tooltip'
import { k as tree } from '../../recipes/kata/tree'
import { omote } from '../../recipes/kiso'
import { type Responsive, resolveVariant } from '../../types/responsive'

// The output gate of the recipe migration. It resolves each part of each kata
// for each combination of its axes, and it compares the class sets with the
// snapshot that main gave. A migration of a kata to a new shape must keep the
// classes of each part, so a change to the snapshot is a change of the output.
//
// The gate reads a part in the same way for each shape of kata. The path of a
// part is its key path under the export. A unit that returns slots gives
// `k.<slot>` for each slot, the same path as a static slot or a sibling recipe
// of the old shape. A slot under a slot gives `k.<slot>.<child>`, the path of a
// nested part of the old shape. An axis that does not change the classes of a part is not
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
	'active-indicator.k.base': 'active-indicator.k.fill',
	'chrome.k.base': 'chrome.k.region',
	'icon.k.base': 'icon.k.ramp',
	'toggle.k.base': 'toggle.k.group',
	'timeline.k.color.amber': 'timeline.k.marker.palette.amber.dot',
	'timeline.k.color.blue': 'timeline.k.marker.palette.blue.dot',
	'timeline.k.color.green': 'timeline.k.marker.palette.green.dot',
	'timeline.k.color.red': 'timeline.k.marker.palette.red.dot',
	'timeline.k.color.zinc': 'timeline.k.marker.palette.zinc.dot',
	'resizable.k.base': 'resizable.k.group',
	'resizable.k.base()': 'resizable.k.group()',
	...Object.fromEntries(
		[['base', 'cell']].map(([current, main]) => [
			`grid-group.k.${current}`,
			`grid-group.k.${main}`,
		]),
	),
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
	'stepper.k.check': 'stepper.k.indicator.check',
	'stepper.k.fill': 'stepper.k.indicator.active',
	'stepper.k.glyph': 'stepper.k.indicator.content',
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
		/^((input|textarea|listbox|combobox|date-picker|color-picker)\.k\.(base|field|prefix|suffix)|panel\.k\.base|file-upload\.k\.input\.\w+|number-input\.k\.base|popover\.k\.(base|content)|nav\.k\.base|tooltip\.k\.(base|trigger)|toast\.k\.item|overlay\.k\.(base|backdrop)|description-list\.k\.base|dialog\.k\.(base|box)|toast\.k\.(base|scroll)|stepper\.k\.(base|content|indicator|item|separator|step|title)|offcanvas\.k\.(base|drawerBlock|inlineBlock|inlineFlex)|events\.k\.(button|pin)|query-builder\.k\.(parts|part|range)|sheet\.k\.base|(box|columns|container|flex|split|aspect-ratio|card|group|placeholder|status)\.k\.base|json-tree\.k\.(base|content|value)|grid-group\.k\.(outline|rule)|form-filters\.k\.row|calendar\.k\.day\.range|kanban\.k\.card\.handle|password-strength\.k\.rule\.(icon|text)|resizable\.k\.handle|table\.k\.(base|scroll)|pdf-viewer\.k\.(base|viewport\.page\.highlights\.(base|label|region)|viewport\.page\.magnifier\.lens|sidebar\.base|thumbnails|viewport\.base)|lightbox\.k\.(base|backdrop|close|controls|slot|step|thumbnail\.base|trigger\.base|trigger\.image)|query-chips\.k\.combinator|tag-input\.k\.(base|tags)|signature-pad\.k\.base|toggle-icon-button\.k\.(base|icon)|markdown\.k\.(heading|li|td|th)|breadcrumb\.k\.(base|link)|tree\.k\.(item\.content|group)|timeline\.k\.(marker\.dot|marker\.base))(\(\))?$|query-builder\.k\.group$|^sidebar-layout\.k\.(base|aside|navbar|panel|buffer|peek|wrapper|content|header|headerActions(\(\))?)$/,
	main: /^(file-upload\.k\.field|input\.k\.number|control\.k\.frame\.(base|radius)|select\.k\.(affix\.(base|prefix|suffix)|surface\.default)|select\.scale|input\.k(\.(affix\.(base|prefix|suffix)|frame|surface|surface\(\)))?|textarea\.k(\.(bare|frame|number|surface|surface\(\))|\(\))?|(listbox|combobox)\.k|(date|color)-picker\.k\.button|popover\.k\.(panel\.(base|glass|ring|surface)|text)|nav\.k\.list\.(base|orientation\.\w+)|tooltip\.k\.(content\.(base|surface\.\w+)|trigger\.(base|cursor))|toast\.k\.item\.\w+|overlay\.k\.(base|cover|frame|scoped|backdrop\.base)|description-list\.k\.(base|orientation\.\w+)|dialog\.k\.(panel(\(\))?|align\.\w+\.\w+)|toast\.k\.(viewport|scroll|position\.\w+\.[\w-]+)|stepper\.k\.((base|content|item|separator|step|title)\.(base(\(\))?|orientation\.\w+)|indicator\.(base|completed|current|interactive))|sidebar-layout\.k\.(header|layout\.\w+\.\w+)|offcanvas\.k\.(drawer|inline)\.\w+\.\w+|events\.k\.button\.\w+|query-builder\.k\.(group\.nested|parts\.\w+(\.\w+)?)|sheet\.k\.(panel(\(\))?|layout\.\w+\.\w+\.\w+)|box\.k\.\w+\.\w+(\.\w+)?|container\.k\.\w+\.\w+|flex\.k\.gap\.\w+|aspect-ratio\.k\.ratio\.[\w/]+|(card|group)\.k\.base|placeholder\.k\.(fill|pulse|shape)|status\.k\.pulse|json-tree\.k\.(base|windowed|content|highlight|color\.\w+)|grid-group\.k\.(outline\.\w+|rule\.(base|neutral|color\.\w+))|form-filters\.k\.rail|calendar\.k\.day\.range\.\w+|kanban\.k\.card\.handle\.\w+|password-strength\.k\.rule\.(icon|text)\.\w+|resizable\.k\.(grip|handle)\.\w+(\.\w+)?|table\.k\.(base|scroll|projection\.[\w.]+)|pdf-viewer\.k\.(base|fill|sidebar\.(base|closed|travel)|thumbnails\.\w+|viewport\.(base|scrolls)|viewport\.page\.(highlights\.(base|inert|label\.\w+|region\.[\w.]+)|magnifier\.(lens|size\.\w+)))|lightbox\.k\.((backdrop|close|frame|step)\.\w+|controls|slot|thumbnail\.(base|current)|trigger\.(base|button|image|raised))|query-chips\.k\.combinator\.\w+|tag-input\.k\.tags\.\w+|signature-pad\.k\.base|toggle-icon-button\.k\.icon\.\w+|markdown\.k\.(align\.\w+|heading\.\d|li|task|td|th)|breadcrumb\.k\.(crumb|link(\(\))?)|tree\.k\.(item\.content(\.current|\(\))?|group\.indent)|timeline\.k\.marker\.(base|dot|pulse|orientation\.\w+|palette\.\w+\.line\.\w+))$/,
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

/**
 * The key path of each class string of a unit output. A slot with child slots
 * gives a record, so its class strings take the key path under it.
 */
function slotPaths(output: Record<string, unknown>): string[][] {
	return Object.entries(output).flatMap(([key, value]) =>
		typeof value === 'object' && value !== null
			? slotPaths(value as Record<string, unknown>).map((rest) => [key, ...rest])
			: [[key]],
	)
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
				? slotPaths(defaults as Record<string, unknown>).map(
						(part) => [part, `${path}.${part.join('.')}`] as const,
					)
				: [[undefined, path] as const]

		for (const [part, partPath] of parts) {
			const pick = (result: unknown) =>
				classes(
					part === undefined
						? result
						: part.reduce<unknown>(
								(record, key) => (record as Record<string, unknown>)[key],
								result,
							),
				)

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

		check('number-input base', numberInput().base, read('input.k.number'), 'tabular-nums')

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

			// Each part and the main parts that it composes at this layout.
			for (const [slot, part, table] of [
				['base', 'base', read(`sidebar-layout.k.layout.base.${layout}`)],
				['navbar', 'navbar', shown('drawer')],
				['panel', 'panel', shown('inline')],
				['aside', 'aside', shown('inline')],
				['buffer', 'floating.buffer', shown('inline')],
				['peek', 'floating.peek', read(`sidebar-layout.k.layout.peek.${layout}`)],
				['wrapper', 'content.wrapper', read(`sidebar-layout.k.layout.wrapper.${layout}`)],
				['content', 'content.base', read(`sidebar-layout.k.layout.content.${layout}`)],
			] as const) {
				check(
					`sidebar-layout ${slot} ${layout}`,
					slots[slot],
					read(`sidebar-layout.k.${part}`),
					table,
				)
			}

			check(
				`sidebar-layout header ${layout}`,
				slots.header,
				read('sidebar-layout.k.header', 'stickyHeader=false'),
				read(`sidebar-layout.k.layout.header.${layout}`),
			)
			check(
				`sidebar-layout sticky header ${layout}`,
				sidebarLayout({ layout, stickyHeader: true }).header,
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

		// A sticky header by breakpoint: the compound rules that read the layout
		// take the prefix of each breakpoint, as the table of main did.
		const byBreakpoint = { initial: 'drawer', lg: 'inline' } as const

		check(
			'sidebar-layout sticky header by breakpoint',
			sidebarLayout({ layout: byBreakpoint, stickyHeader: true }).header,
			read('sidebar-layout.k.header', 'stickyHeader=true'),
			resolveVariant(byBreakpoint, table('sidebar-layout.k.layout.header', ['drawer', 'inline'])),
			resolveVariant(
				byBreakpoint,
				table('sidebar-layout.k.layout.stickyHeader', ['drawer', 'inline']),
			),
		)

		// The header button of the events, with the layout that the button resolved
		// by breakpoint on main.
		for (const layout of ['drawer', 'inline'] as const) {
			check(
				`events button ${layout}`,
				events({ layout }).button,
				'hidden [:root[data-events]_&]:contents',
				read(`events.k.button.${layout}`),
			)
			check(
				`events pin ${layout}`,
				events({ layout }).pin,
				read(`offcanvas.k.inline.inlineFlex.${layout}`),
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

		// The panel of a sheet, with the layout that the sheet resolved by
		// breakpoint on main: the classes of its side, and of a `fit` or a `full`
		// width on a side that a width docks across.

		const sheetLayout = (side: string, width: string, layout: Responsive<'flush' | 'floating'>) => [
			resolveVariant(layout, table(`sheet.k.layout.side.${side}`, ['flush', 'floating'])),
			(side === 'right' || side === 'left') && (width === 'fit' || width === 'full')
				? resolveVariant(layout, table(`sheet.k.layout.width.${width}`, ['flush', 'floating']))
				: '',
		]

		for (const side of ['right', 'left', 'top', 'bottom'] as const) {
			for (const width of ['sm', 'md', 'fit', 'full'] as const) {
				for (const surface of ['flat', 'glass'] as const) {
					for (const layout of ['flush', 'floating'] as const) {
						check(
							`sheet base ${side} ${width} ${surface} ${layout}`,
							sheet({ side, width, surface, layout }).base,
							read('sheet.k.panel', `side=${side},width=${width},surface=${surface}`),
							sheetLayout(side, width, layout),
						)
					}
				}

				const layout = { initial: 'flush', md: 'floating' } as const

				check(
					`sheet base ${side} ${width} by breakpoint`,
					sheet({ side, width, layout }).base,
					read('sheet.k.panel', `side=${side},width=${width},surface=flat`),
					sheetLayout(side, width, layout),
				)
			}
		}

		// The structure units, from the tables of main. The `0` step of the
		// spacing scale is now a stepped rule in the `density` layer, so a
		// breakpoint replaces it (a plain `p-0` outranked that layer).
		const spacing = (axis: string, step: string) =>
			step === '0'
				? `density-${axis}-[0,0,0,0,0]`
				: read(`box.k.${axis === 'p' ? 'padding' : axis}.${step}`)

		for (const step of ['0', 'xs', 'sm', 'md', 'lg', 'xl'] as const) {
			const value = step === '0' ? 0 : step

			for (const axis of ['p', 'px', 'py'] as const) {
				check(`box ${axis} ${step}`, box({ [axis]: value }).base, spacing(axis, step))
			}

			check(
				`flex gap ${step}`,
				flex({ gap: value }).base,
				'flex flex-row',
				step === '0' ? 'density-gap-[0,0,0,0,0]' : read(`flex.k.gap.${step}`),
			)
		}

		for (const radius of ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const) {
			check(`box radius ${radius}`, box({ radius }).base, read(`box.k.radius.${radius}`))
		}

		for (const bg of ['none', 'surface', 'tint', 'popover'] as const) {
			check(`box bg ${bg}`, box({ bg }).base, read(`box.k.bg.${bg}`))
		}

		check('box outline', box({ outline: true }).base, read('box.k.outline.base'))

		for (const outline of ['subtle', 'strong'] as const) {
			check(
				`box outline ${outline}`,
				box({ outline }).base,
				read(`box.k.outline.weight.${outline}`),
			)
		}

		for (const size of ['sm', 'md', 'lg', 'xl', 'full'] as const) {
			for (const padding of ['0', 'sm', 'md', 'lg'] as const) {
				check(
					`container ${size} ${padding}`,
					container({ width: size, padding: padding === '0' ? 0 : padding }).base,
					'w-full h-full mx-auto',
					read(`container.k.padding.${padding}`),
					read(`container.k.size.${size}`),
				)
			}
		}

		// The layout units, from the parts of main. The card and the aspect ratio
		// take the base classes that their components wrote. The group frame was
		// a function on main, so `group.test.tsx` holds it.
		check('card base', card().base, 'overflow-clip -outline-offset-1', read('card.k.base'))

		for (const ratio of ['21/9', '16/9', '4/3', '3/2', '1/1', 'auto', 'square', 'video'] as const) {
			check(
				`aspect-ratio ${ratio}`,
				aspectRatio({ ratio }).base,
				'overflow-hidden',
				read(`aspect-ratio.k.ratio.${ratio}`),
			)
		}

		// The small units: the placeholder and the status dot take the pulse when
		// the prop sets it, as their components did.
		for (const pulse of [false, true]) {
			check(
				`placeholder ${pulse}`,
				placeholder({ pulse }).base,
				read('placeholder.k.fill'),
				pulse && read('placeholder.k.pulse'),
				read('placeholder.k.shape'),
			)
			check(`status ${pulse}`, status({ pulse }).base, pulse && read('status.k.pulse'))
		}

		// The disclosure units. The JSON tree and the Markdown prose take an axis
		// where their components added a part of main.
		for (const windowed of [false, true]) {
			check(
				`json-tree base ${windowed}`,
				jsonTree({ windowed }).base,
				read('json-tree.k.base'),
				windowed && read('json-tree.k.windowed'),
			)
		}

		for (const highlighted of [false, true]) {
			check(
				`json-tree content ${highlighted}`,
				jsonTree({ highlighted }).content,
				read('json-tree.k.content'),
				highlighted && read('json-tree.k.highlight'),
			)
		}

		for (const type of ['key', 'string', 'number', 'boolean', 'null'] as const) {
			check(`json-tree value ${type}`, jsonTree({ type }).value, read(`json-tree.k.color.${type}`))
		}

		for (const level of [1, 2, 3, 4, 5, 6] as const) {
			check(
				`markdown heading ${level}`,
				markdown({ level }).heading,
				read(`markdown.k.heading.${level}`),
			)
		}

		for (const task of [false, true]) {
			check(
				`markdown li ${task}`,
				markdown({ task }).li,
				read('markdown.k.li'),
				task && read('markdown.k.task'),
			)
		}

		// The grid group unit: a group with no color takes the neutral rule and the
		// outline of the Card.
		for (const color of [
			'zinc',
			'red',
			'amber',
			'green',
			'blue',
			'rose',
			'violet',
			'sky',
		] as const) {
			const slots = gridGroup({ color })

			check(
				`grid-group rule ${color}`,
				slots.rule,
				read('grid-group.k.rule.base'),
				read(`grid-group.k.rule.color.${color}`),
			)
			check(`grid-group outline ${color}`, slots.outline, read(`grid-group.k.outline.${color}`))
		}

		check(
			'grid-group rule neutral',
			gridGroup().rule,
			read('grid-group.k.rule.base'),
			read('grid-group.k.rule.neutral'),
		)
		check('grid-group outline neutral', gridGroup().outline)

		// The form units. The signature pad takes the height that its component
		// wrote, and a row of the form filters takes the classes of each flag.
		check('signature-pad base', signaturePad().base, read('signature-pad.k.base'), 'h-40')

		for (const equal of [false, true]) {
			for (const rail of [false, true]) {
				check(
					`form-filters row ${equal} ${rail}`,
					formFilters({ equal, rail }).row,
					equal && '*:flex-1',
					rail && read('form-filters.k.rail'),
				)
			}
		}

		for (const start of [false, true]) {
			for (const end of [false, true]) {
				check(
					`calendar range ${start} ${end}`,
					calendar({ start, end }).day.range,
					start && read('calendar.k.day.range.start'),
					end && read('calendar.k.day.range.end'),
				)
			}
		}

		for (const lifted of [false, true]) {
			check(
				`kanban handle ${lifted}`,
				kanban({ lifted }).card.handle,
				read('kanban.k.card.handle.base'),
				lifted && read('kanban.k.card.handle.lifted'),
			)
		}

		// The lightbox unit. Its axes take the parts that its components chose.
		for (const flag of [false, true]) {
			const slots = lightbox({
				blurred: flag,
				chrome: flag,
				closable: flag,
				current: flag,
				ended: flag,
				interactive: flag,
				raised: flag,
			})

			const frame = [
				read('lightbox.k.frame.base'),
				read(`lightbox.k.frame.${flag ? 'controls' : 'bare'}`),
			]

			check(
				`lightbox backdrop ${flag}`,
				slots.backdrop,
				read(`lightbox.k.backdrop.${flag ? 'blurred' : 'base'}`),
			)
			check(
				`lightbox close ${flag}`,
				slots.close,
				read(`lightbox.k.close.${flag ? 'shown' : 'hidden'}`),
			)
			check(`lightbox controls ${flag}`, slots.controls, read('lightbox.k.controls'), frame)
			check(`lightbox slot ${flag}`, slots.slot, read('lightbox.k.slot'), frame)
			check(
				`lightbox step ${flag}`,
				slots.step,
				read('lightbox.k.step.base'),
				flag && read('lightbox.k.step.ended'),
			)
			check(
				`lightbox thumbnail ${flag}`,
				slots.thumbnail.base,
				read('lightbox.k.thumbnail.base'),
				flag && read('lightbox.k.thumbnail.current'),
			)
			check(
				`lightbox trigger ${flag}`,
				slots.trigger.base,
				read('lightbox.k.trigger.base'),
				flag && read('lightbox.k.trigger.button'),
			)
			check(
				`lightbox trigger image ${flag}`,
				slots.trigger.image,
				read('lightbox.k.trigger.image'),
				flag && read('lightbox.k.trigger.raised'),
			)
		}

		// The PDF viewer unit. Its axes take the parts that its components chose.
		for (const fit of ['page', 'width'] as const) {
			const slots = pdfViewer({ fit })

			check(
				`pdf-viewer base ${fit}`,
				slots.base,
				read('pdf-viewer.k.base'),
				fit === 'width' && read('pdf-viewer.k.fill'),
			)
			check(
				`pdf-viewer viewport ${fit}`,
				slots.viewport.base,
				read('pdf-viewer.k.viewport.base'),
				fit === 'width' && read('pdf-viewer.k.viewport.scrolls'),
			)
		}

		for (const flag of [false, true]) {
			const slots = pdfViewer({ animates: flag, open: flag, interactive: flag, behind: flag })

			check(
				`pdf-viewer sidebar ${flag}`,
				slots.sidebar.base,
				read('pdf-viewer.k.sidebar.base'),
				flag ? read('pdf-viewer.k.sidebar.travel') : read('pdf-viewer.k.sidebar.closed'),
			)
			check(
				`pdf-viewer highlights ${flag}`,
				slots.viewport.page.highlights.base,
				read('pdf-viewer.k.viewport.page.highlights.base'),
				!flag && read('pdf-viewer.k.viewport.page.highlights.inert'),
			)
			check(
				`pdf-viewer highlight label ${flag}`,
				slots.viewport.page.highlights.label,
				read('pdf-viewer.k.viewport.page.highlights.label.base'),
				flag && read('pdf-viewer.k.viewport.page.highlights.label.behind'),
			)
		}

		for (const layout of ['list', 'grid'] as const) {
			check(
				`pdf-viewer thumbnails ${layout}`,
				pdfViewer({ layout }).thumbnails,
				read(`pdf-viewer.k.thumbnails.${layout === 'grid' ? 'grid' : 'base'}`),
			)
		}

		for (const diameter of ['sm', 'md', 'lg'] as const) {
			check(
				`pdf-viewer lens ${diameter}`,
				pdfViewer({ diameter }).viewport.page.magnifier.lens,
				read('pdf-viewer.k.viewport.page.magnifier.lens'),
				read(`pdf-viewer.k.viewport.page.magnifier.size.${diameter}`),
			)
		}

		// A region as `pdf-viewer-highlights.tsx` composed it on main.
		const region = 'pdf-viewer.k.viewport.page.highlights.region'

		for (const color of ['zinc', 'red', 'amber', 'green', 'blue'] as const) {
			for (const active of [false, true]) {
				for (const dimmed of [false, true]) {
					check(
						`pdf-viewer region ${color} ${active} ${dimmed}`,
						pdfViewer({ color, active, dimmed }).viewport.page.highlights.region,
						read(`${region}.base`),
						read(active ? `${region}.active.fill.${color}` : `${region}.fill.${color}`),
						read(`${region}.ring.${color}`),
						active
							? read(`${region}.active.base`)
							: [read(`${region}.edge`), read(`${region}.hover`)],
						dimmed && read(`${region}.dimmed`),
					)
				}
			}
		}

		// The units of the kata that held inner recipes on main.
		for (const passed of [false, true]) {
			const slots = passwordStrength({ passed })

			check(
				`password-strength rule icon ${passed}`,
				slots.rule.icon,
				read('password-strength.k.rule.icon.base'),
				read(`password-strength.k.rule.icon.${passed ? 'pass' : 'fail'}`),
			)
			check(
				`password-strength rule text ${passed}`,
				slots.rule.text,
				read(`password-strength.k.rule.text.${passed ? 'pass' : 'base'}`),
			)
			check(
				`table scroll ${passed}`,
				tableKata({ scrolls: passed }).scroll,
				passed && read('table.k.scroll'),
			)
		}

		for (const orientation of ['horizontal', 'vertical'] as const) {
			check(
				`resizable handle ${orientation}`,
				resizable({ orientation }).handle,
				read('resizable.k.handle.base'),
				read(`resizable.k.handle.orientation.${orientation}`),
				read('resizable.k.grip.base'),
				read(`resizable.k.grip.orientation.${orientation}`),
			)
		}

		for (const outline of [false, true]) {
			for (const hover of [false, true]) {
				for (const stripe of [undefined, 'odd', 'even'] as const) {
					check(
						`table base ${outline} ${hover} ${stripe}`,
						tableKata({ outline, hover, stripe }).base,
						read('table.k.base'),
						outline && read('table.k.projection.outline'),
						stripe && read(`table.k.projection.striped.${stripe}`),
						hover && read('table.k.projection.hover'),
					)
				}
			}
		}

		for (const readOnly of [false, true]) {
			check(
				`query-chips combinator ${readOnly}`,
				queryChips({ readOnly }).combinator,
				read('query-chips.k.combinator.base'),
				!readOnly && read('query-chips.k.combinator.button'),
			)
		}

		for (const wrap of [false, true]) {
			check(
				`tag-input tags ${wrap}`,
				tagInput({ wrap }).tags,
				read('tag-input.k.tags.base'),
				!wrap && read('tag-input.k.tags.scroll'),
			)
		}

		for (const active of [false, true]) {
			check(
				`toggle-icon-button icon ${active}`,
				toggleIconButton({ active }).icon,
				read('toggle-icon-button.k.icon.base'),
				read(`toggle-icon-button.k.icon.${active ? 'active' : 'inactive'}`),
			)
		}

		for (const align of [undefined, 'left', 'right', 'center'] as const) {
			const slots = markdown({ align })

			const aligned = align && read(`markdown.k.align.${align}`)

			check(`markdown th ${align}`, slots.th, read('markdown.k.th'), aligned)
			check(`markdown td ${align}`, slots.td, read('markdown.k.td'), aligned)
		}

		for (const current of [false, true]) {
			for (const interactive of [false, true]) {
				check(
					`breadcrumb link ${current} ${interactive}`,
					breadcrumb({ current, interactive }).link,
					read('breadcrumb.k.crumb'),
					read('breadcrumb.k.link', `current=${current},interactive=${interactive}`),
				)
			}
		}

		for (const current of [false, true]) {
			check(
				`tree content ${current}`,
				tree({ current }).item.content,
				read('tree.k.item.content'),
				current && read('tree.k.item.content.current'),
			)
		}

		for (const indent of [false, true]) {
			check(`tree group ${indent}`, tree({ indent }).group, indent && read('tree.k.group.indent'))
		}

		for (const pulse of [false, true]) {
			check(
				`timeline dot ${pulse}`,
				timeline({ pulse }).marker.dot,
				read('timeline.k.marker.dot'),
				pulse && read('timeline.k.marker.pulse'),
			)
		}

		const hues = ['zinc', 'red', 'amber', 'green', 'blue'] as const

		for (const orientation of ['vertical', 'horizontal'] as const) {
			for (const lineBefore of hues) {
				for (const lineAfter of hues) {
					check(
						`timeline marker ${orientation} ${lineBefore} ${lineAfter}`,
						timeline({ orientation, lineBefore, lineAfter }).marker.base,
						read('timeline.k.marker.base'),
						read(`timeline.k.marker.orientation.${orientation}`),
						read(`timeline.k.marker.palette.${lineBefore}.line.before`),
						read(`timeline.k.marker.palette.${lineAfter}.line.after`),
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

/** The table of a responsive axis of main: the classes of each value, read at `path.value`. */
function table(path: string, values: string[]): Record<string, string> {
	return Object.fromEntries(values.map((value) => [value, read(`${path}.${value}`)]))
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
