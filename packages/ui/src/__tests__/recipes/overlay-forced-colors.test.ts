// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as grid } from '../../recipes/kata/grid'
import { k as menu } from '../../recipes/kata/menu'
import { k as resizable } from '../../recipes/kata/resizable'
import { k as tooltip } from '../../recipes/kata/tooltip'
import { omote } from '../../recipes/kiso/omote'
import { panel } from '../../recipes/kiso/panel'
import { popover } from '../../recipes/kiso/popover'
import { classNames } from '../helpers/class-stops'

/**
 * Under forced colors, each part of the overlay family that the reader sees only
 * by its background or by a box-shadow keeps a paint.
 *
 * Forced colors replace a background and remove a box-shadow. A part drawn with
 * only those vanished: the grip of a panel, the edge of a flat popover or
 * tooltip, and the trail row of an open submenu. Each part has a case here, so a
 * new surface of the family that draws its edge with a ring alone fails the
 * table.
 */
describe('overlay family under forced colors', () => {
	const parts: [string, unknown][] = [
		['the panel surface', panel.surface.base],
		['the panel chrome', panel.surface.chrome],
		['the horizontal grip bar', panel.grip.bar.horizontal],
		['the vertical grip bar', panel.grip.bar.vertical],
		['the flat popover surface', omote.popover],
		['the popover panel', [popover.panel.base, popover.panel.surface]],
		['the glass popover panel', [popover.panel.base, popover.panel.glass, popover.panel.ring]],
		['the flat tooltip', tooltip.content.surface.default],
		['the glass tooltip', tooltip.content.surface.glass],
		['the open submenu row', menu.sub.trigger],
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
})

/**
 * Under forced colors, each resize grip keeps its shape and its focus mark.
 *
 * The grip is a bar that the reader sees only by its background, and the grip
 * color is the only focus mark of its handle. Forced colors remove both, so the
 * bar paints in `CanvasText` and the focused handle outlines the bar. The focus
 * color of the bar outranks the bare shape class, so the shape repeats under focus.
 */
describe('resize grips under forced colors', () => {
	const grips: [string, unknown, string][] = [
		['the horizontal Resizable grip', [resizable.grip.base, resizable.grip.horizontal], 'handle'],
		['the vertical Resizable grip', [resizable.grip.base, resizable.grip.vertical], 'handle'],
		['the Grid column resize grip', grid.resize.grip, 'grid-resize'],
	]

	it.each(grips)('keeps the shape of %s', (_name, grip) => {
		expect(classNames([grip])).toContain('forced-colors:bg-[CanvasText]')
	})

	it.each(grips)('keeps and outlines %s when its handle has focus', (_name, grip, group) => {
		const focus = `forced-colors:group-focus-visible/${group}:`

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
