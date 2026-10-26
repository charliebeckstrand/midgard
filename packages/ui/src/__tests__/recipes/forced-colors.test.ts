// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as accordion } from '../../recipes/kata/accordion'
import { k as alert } from '../../recipes/kata/alert'
import { k as chart } from '../../recipes/kata/chart'
import { k as dashboard } from '../../recipes/kata/dashboard'
import { k as events } from '../../recipes/kata/events'
import { k as grid } from '../../recipes/kata/grid'
import { k as gridGroup } from '../../recipes/kata/grid-group'
import { k as jsonTree } from '../../recipes/kata/json-tree'
import { k as kanban } from '../../recipes/kata/kanban'
import { k as menu } from '../../recipes/kata/menu'
import { k as passwordStrength } from '../../recipes/kata/password-strength'
import { k as pdfViewer } from '../../recipes/kata/pdf-viewer'
import { k as popover } from '../../recipes/kata/popover'
import { k as resizable } from '../../recipes/kata/resizable'
import { k as tooltip } from '../../recipes/kata/tooltip'
import { omote } from '../../recipes/kiso/omote'
import { grip } from '../../recipes/kumi/panel'
import { classNames } from '../helpers/class-stops'

/**
 * Under forced colors, each part that the reader sees only by its background or
 * by a box-shadow keeps a paint.
 *
 * Forced colors replace a background and remove a box-shadow. The boundary test
 * `boundary/forced-colors-boundary.test.ts` finds a state ring from the gate in
 * its class. The parts here have no such gate: a resting edge, or a state that a
 * recipe variant or a prop turns on. Each part has a case here, so a part that
 * loses its fallback fails the table.
 */
describe('edges and state marks under forced colors', () => {
	const region = (active: boolean) => pdfViewer({ active }).viewport.page.highlights.region

	const parts: [string, unknown][] = [
		['the panel surface', omote.panel.base],
		['the panel chrome', omote.panel.chrome],
		['the horizontal grip bar', grip.bar.horizontal],
		['the vertical grip bar', grip.bar.vertical],
		['the flat popover surface', omote.popover],
		['the popover panel', popover({ surface: 'flat' }).base],
		['the glass popover panel', popover({ surface: 'glass' }).base],
		['the flat tooltip', tooltip({ surface: 'flat' }).base],
		['the glass tooltip', tooltip({ surface: 'glass' }).base],
		['the open submenu row', menu.sub.trigger],
		['the soft alert', alert({ variant: 'soft', color: 'red' }).base],
		['the solid alert', alert({ variant: 'solid', color: 'red' }).base],
		['the outline alert', alert({ variant: 'outline', color: 'red' }).base],
		['the PDF region', region(false)],
		['the selected PDF region', region(true)],
		['the landing placeholder of a dashboard drag', dashboard().placeholder],
		['the range legend track', chart.track],
		['the report dot of the events button', events().dot],
		['the end rule of a frozen Grid group', grid.pinned.border.end],
		['the start rule of a frozen Grid group', grid.pinned.border.start],
		['the rule of a Grid column group', gridGroup().rule],
		['the rule of a Grid column group with a color', gridGroup({ color: 'red' }).rule],
		['a JsonTree search match', jsonTree({ highlighted: true }).content],
		['the Kanban drop target column', kanban().column.base],
		...(['weak', 'fair', 'good', 'strong'] as const).map((level): [string, unknown] => [
			`the ${level} password-strength segment`,
			passwordStrength({ level }).segment,
		]),
	]

	it.each(parts)('keeps a paint on %s', (_name, part) => {
		const classes = classNames([part])

		const restores = classes.some(
			(className) =>
				/^forced-colors:(?:[\w-]+:)*(?:outline|bg-\[)/.test(className) ||
				// An outline drawn in every mode, which forced colors keep and recolor.
				className === 'outline',
		)

		expect(restores).toBe(true)
	})

	// The selected region draws a heavier stroke than a resting one, so the
	// selection does not depend on the wash, which forced colors remove.
	it('draws the selected PDF region heavier than a resting one', () => {
		expect(classNames([region(true)])).toContain('forced-colors:outline-2')
	})

	// The fill and the outline color of the drop target go, so only its outline
	// width tells it from the other columns.
	it('draws the Kanban drop target heavier than another column', () => {
		expect(classNames([kanban().column.base])).toContain('forced-colors:data-over:outline-2')
	})
})

/**
 * Under forced colors, each resize grip keeps its shape and its focus mark.
 *
 * The grip is a bar that the reader sees only by its background, and the grip
 * color is the only focus mark of its handle. Forced colors remove both, so the
 * bar paints in `CanvasText` and the focused handle outlines the bar. The focus
 * color of the bar outranks the bare shape class, so the shape repeats under focus.
 * The handle draws the bar as its `::after`, so each class gates the `::after`.
 */
describe('resize grips under forced colors', () => {
	const grips: [string, unknown][] = [
		['the horizontal Resizable grip', resizable({ orientation: 'horizontal' }).handle],
		['the vertical Resizable grip', resizable({ orientation: 'vertical' }).handle],
		['the Grid column resize grip', grid.resize.grip],
	]

	it.each(grips)('keeps the shape of %s', (_name, grip) => {
		expect(classNames([grip])).toContain('forced-colors:after:bg-[CanvasText]')
	})

	// A state color of the bar, such as the hover or the drag color, outranks the
	// bare shape class. Thus each state that paints the bar repeats the shape.
	it.each(grips)('keeps the shape of %s in each state of its handle', (_name, grip) => {
		const classes = classNames([grip])

		const states = new Set(
			classes.flatMap((className) => {
				const state = /^(?:dark:)?([\w-]+):after:bg-/.exec(className)?.[1]

				return state && state !== 'dark' && state !== 'forced-colors' ? [state] : []
			}),
		)

		expect(states.size).toBeGreaterThan(0)

		for (const state of states) {
			expect(classes).toContain(`forced-colors:${state}:after:bg-[CanvasText]`)
		}
	})

	it.each(grips)('keeps and outlines %s when its handle has focus', (_name, grip) => {
		const focus = 'forced-colors:focus-visible:after:'

		expect(classNames([grip])).toEqual(
			expect.arrayContaining([
				`${focus}outline-solid`,
				`${focus}outline-2`,
				`${focus}outline-offset-2`,
				`${focus}outline-[Highlight]`,
				`${focus}bg-[CanvasText]`,
			]),
		)
	})
})

/**
 * Under forced colors, the edit mode of a dashboard keeps its column guides and
 * the resize bars of its tiles.
 *
 * Forced colors remove a gradient background, so the guides paint a system-color
 * gradient with no adjust. Each resize bar is a bar that the reader sees only by
 * its background, so it paints in `CanvasText`, as a resize grip does.
 */
describe('dashboard edit mode under forced colors', () => {
	it('keeps the column guides', () => {
		const classes = classNames([dashboard({ editable: true }).base])

		expect(classes).toContain('forced-colors:before:forced-color-adjust-none')

		expect(
			classes.some((className) =>
				/^forced-colors:before:bg-\[linear-gradient\(.*GrayText/.test(className),
			),
		).toBe(true)
	})

	it.each(['e', 's', 'se'] as const)('keeps the shape of the %s resize bar', (edge) => {
		expect(classNames([dashboard({ edge }).resize.handle])).toContain(
			'forced-colors:after:bg-[CanvasText]',
		)
	})
})

/**
 * Under forced colors, the header of an accordion keeps one focus mark.
 *
 * The item draws the focus of its header with a box-shadow ring, and forced
 * colors remove a box-shadow. Thus the item draws a `Highlight` outline behind
 * the same gate. The header removes its own outline with `outline-none`, which
 * has no forced-colors outline, so the header does not draw a second mark.
 */
describe('accordion header focus under forced colors', () => {
	const gate = 'has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]'

	it('draws the focus outline of the item behind the gate of its ring', () => {
		const item = classNames([accordion().item])

		expect(item).toContain(`${gate}:ring-2`)
		expect(item).toContain(`forced-colors:${gate}:outline-[Highlight]`)
	})

	it('removes the outline of the header with no forced-colors outline', () => {
		const trigger = classNames([accordion().trigger])

		expect(trigger).toContain('focus-visible:outline-none')
		expect(trigger).not.toContain('focus-visible:outline-hidden')
	})
})
