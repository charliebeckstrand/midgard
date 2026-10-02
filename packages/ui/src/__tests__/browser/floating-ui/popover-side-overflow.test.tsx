import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { frames, renderUI, screen } from '../../helpers'

/**
 * A side placement on a phone. The panel is wider than the space on the left
 * and on the right of the trigger, so it fits on no horizontal side. It must
 * move to a vertical side and stay inside the viewport.
 */
describe('a Popover with a side placement on a phone (real floating engine)', () => {
	beforeAll(() => page.viewport(390, 844))

	it.each(['left', 'right'] as const)('keeps a wide %s panel on the screen', async (placement) => {
		renderUI(
			<div style={{ paddingLeft: 150, paddingTop: 300 }}>
				<Popover placement={placement} defaultOpen>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">
						<div style={{ width: 340 }}>Panel</div>
					</PopoverContent>
				</Popover>
			</div>,
		)

		await frames()

		await frames()

		const panel = screen.getByRole('dialog').getBoundingClientRect()

		const trigger = screen.getByRole('button', { name: 'Open' }).getBoundingClientRect()

		expect(panel.left).toBeGreaterThanOrEqual(0)

		expect(panel.right).toBeLessThanOrEqual(390)

		// On a vertical side, the panel does not cover its trigger.
		expect(panel.top >= trigger.bottom || panel.bottom <= trigger.top).toBe(true)
	})

	it('keeps a narrow left panel on the left side', async () => {
		renderUI(
			<div style={{ paddingLeft: 250, paddingTop: 300 }}>
				<Popover placement="left" defaultOpen>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">
						<div style={{ width: 120 }}>Panel</div>
					</PopoverContent>
				</Popover>
			</div>,
		)

		await frames()

		await frames()

		const panel = screen.getByRole('dialog').getBoundingClientRect()

		const trigger = screen.getByRole('button', { name: 'Open' }).getBoundingClientRect()

		expect(panel.right).toBeLessThanOrEqual(trigger.left)
	})
})
