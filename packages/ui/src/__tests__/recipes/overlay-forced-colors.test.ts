// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as menu } from '../../recipes/kata/menu'
import { k as tooltip } from '../../recipes/kata/tooltip'
import { omote } from '../../recipes/kiso/omote'
import { panel } from '../../recipes/kiso/panel'
import { popover } from '../../recipes/kiso/popover'

/** Every class of a recipe part, nested arrays and all. */
function classesOf(part: unknown): string[] {
	if (typeof part === 'string') return part.split(/\s+/)

	if (Array.isArray(part)) return part.flatMap(classesOf)

	return []
}

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
		const classes = classesOf(part)

		const restores = classes.some(
			(cls) =>
				/^forced-colors:(?:[\w-]+:)*(?:outline|bg-\[)/.test(cls) ||
				// An outline drawn in every mode, which forced colors keep and recolor.
				cls === 'outline',
		)

		expect(restores).toBe(true)
	})
})
