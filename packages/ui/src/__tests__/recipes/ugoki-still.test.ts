// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as dialog } from '../../recipes/kata/dialog'
import { k as drawer } from '../../recipes/kata/drawer'
import { k as sheet } from '../../recipes/kata/sheet'
import { k as toast } from '../../recipes/kata/toast'
import { k as tooltip } from '../../recipes/kata/tooltip'

// Each pair is the preset a component shows, and the copy it shows under reduced
// motion. `MotionConfig` does not hold a `transform` still, so the copy must.
const pairs = [
	['sheet right', sheet.motion.right, sheet.still.right],
	['sheet left', sheet.motion.left, sheet.still.left],
	['sheet top', sheet.motion.top, sheet.still.top],
	['sheet bottom', sheet.motion.bottom, sheet.still.bottom],
	['drawer', drawer.motion, drawer.still],
	['dialog on a phone', dialog.motion.mobile, dialog.still.mobile],
	['toast top', toast.motion.top, toast.still.top],
	['toast bottom', toast.motion.bottom, toast.still.bottom],
	['tooltip', tooltip.motion, tooltip.still],
] as const

describe('ugoki still', () => {
	it.each(pairs)('moves the %s by `transform`, off the main thread', (_, preset) => {
		expect(preset.initial).toHaveProperty('transform')

		expect(preset.initial).not.toHaveProperty('x')

		expect(preset.initial).not.toHaveProperty('y')

		expect(preset.initial).not.toHaveProperty('scale')
	})

	it.each(pairs)(
		'lands the %s transform at once under reduced motion (WCAG 2.3.3)',
		(_, preset, still) => {
			expect(still.transition).toEqual({ ...preset.transition, transform: { duration: 0 } })
		},
	)

	// `useOpenComplete` matches the landed target by identity.
	it.each(pairs)('keeps the targets of the %s', (_, preset, still) => {
		expect(still.initial).toBe(preset.initial)

		expect(still.animate).toBe(preset.animate)

		expect(still.exit).toBe(preset.exit)
	})

	it('leaves the desktop dialog fade as it is, because it moves no box', () => {
		expect(dialog.still.desktop).toBe(dialog.motion.desktop)
	})
})
