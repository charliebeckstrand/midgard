import type { ReactElement } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import { Sheet, SheetBody, SheetHeader, SheetPanel, SheetTitle } from '../../../components/sheet'
import { type DensityStep, densitySteps, writeRootDensity } from '../../../core/density'
import { frames, getSlot, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/**
 * The grip of a panel sits on its edge and covers no control of the panel.
 *
 * The grip of a sheet docked across was a strip laid over the panel, thicker than
 * the inset of the slot under it. A press on the covered part of the Close button
 * started a resize, and the click did not reach the button. Each panel that takes
 * a `handle` has a case here at each density step, so a grip that covers a slot
 * fails.
 *
 * Rides the real browser because jsdom lays nothing out.
 */

type Edge = 'top' | 'right' | 'bottom' | 'left'

type Case = { name: string; slot: string; edge: Edge; render: () => ReactElement }

/** The edge of a sheet that faces the screen, where its grip sits. */
const FACING = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const

const cases: Case[] = [
	...(['top', 'bottom', 'left', 'right'] as const).map((side) => ({
		name: `a ${side} sheet`,
		slot: 'sheet',
		edge: FACING[side],
		render: () => (
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel side={side} handle>
					<SheetHeader>
						<SheetTitle>
							Title <button type="button">Help</button>
						</SheetTitle>
					</SheetHeader>
					<SheetBody>Body</SheetBody>
				</SheetPanel>
			</Sheet>
		),
	})),
	...(['half', 'full'] as const).map((height) => ({
		name: `a ${height} drawer`,
		slot: 'drawer',
		edge: 'top' as const,
		render: () => (
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height={height} handle aria-label="Probe">
					<DrawerTitle>
						Title <button type="button">Help</button>
					</DrawerTitle>
					<DrawerBody>Body</DrawerBody>
				</DrawerPanel>
			</Drawer>
		),
	})),
]

describe('panel grip cover (real browser)', () => {
	beforeAll(() => page.viewport(1100, 700))

	afterEach(() => writeRootDensity(document.documentElement, 'md'))

	it.for(
		cases.flatMap((c) =>
			densitySteps.map((step) => [c.name, step, c] as [string, DensityStep, Case]),
		),
	)('covers no control with the grip of %s at %s', async ([, step, { slot, edge, render }]) => {
		writeRootDensity(document.documentElement, step)

		renderUI(render())

		await frames()

		const panel = getSlot(document.body, slot)

		const grip = getSlot(panel, `${slot}-handle`).getBoundingClientRect()

		// The grip sits on the edge of the panel that faces the screen.
		expect(grip[edge]).toBeNear(panel.getBoundingClientRect()[edge], HALF_PIXEL)

		for (const control of panel.querySelectorAll('button')) {
			const box = control.getBoundingClientRect()

			const overlaps =
				box.left < grip.right &&
				grip.left < box.right &&
				box.top < grip.bottom &&
				grip.top < box.bottom

			expect(overlaps, control.textContent ?? '').toBe(false)
		}
	})
})
