import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { frames, renderUI, screen } from '../../helpers'

/**
 * A `bottom-auto` menu aligns to the edge of the trigger that is nearer to the
 * edge of the viewport, and it follows a layout that moves the trigger. The
 * alignment middleware runs only in the real floating engine, because the jsdom
 * suite mocks `@floating-ui/react`.
 */
describe('a Menu with the auto alignment (real floating engine)', () => {
	// The inset and the item width let the panel fit at either alignment, so
	// `flip` never changes the alignment and only the auto alignment can.
	function renderRow(justify: 'flex-start' | 'flex-end', inset = 160, itemWidth = 80) {
		return renderUI(
			<div data-testid="row" style={{ display: 'flex', justifyContent: justify, padding: inset }}>
				<Menu placement="bottom-auto" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>
							<span style={{ display: 'inline-block', width: itemWidth }}>Rename</span>
						</MenuItem>
					</MenuContent>
				</Menu>
			</div>,
		)
	}

	async function edges() {
		await frames()

		await frames()

		const trigger = screen.getByRole('button', { name: 'Open' }).getBoundingClientRect()

		const panel = screen.getByRole('menu').getBoundingClientRect()

		return { trigger, panel }
	}

	it('aligns to the start edge of a trigger on the left', async () => {
		renderRow('flex-start')

		const { trigger, panel } = await edges()

		expect(panel.width).toBeGreaterThan(trigger.width)

		expect(panel.left).toBeCloseTo(trigger.left, 0)
	})

	it('aligns to the end edge of a trigger on the right', async () => {
		renderRow('flex-end')

		const { trigger, panel } = await edges()

		expect(panel.right).toBeCloseTo(trigger.right, 0)
	})

	it('follows the trigger when the layout moves it to the other side', async () => {
		renderRow('flex-end')

		const before = await edges()

		expect(before.panel.right).toBeCloseTo(before.trigger.right, 0)

		screen.getByTestId('row').style.justifyContent = 'flex-start'

		const after = await edges()

		expect(after.panel.left).toBeCloseTo(after.trigger.left, 0)
	})

	it('lets flip and shift keep a panel that overflows at the auto alignment on screen', async () => {
		renderRow('flex-start', 150, 240)

		const { panel } = await edges()

		expect(panel.left).toBeGreaterThanOrEqual(0)

		expect(panel.right).toBeLessThanOrEqual(window.innerWidth)
	})

	it('keeps the auto alignment when flip moves the panel to the other side', async () => {
		// The trigger sits in the right half at the foot of the viewport, so the
		// panel has no room below it and flips above it.
		renderUI(
			<div
				style={{
					display: 'flex',
					justifyContent: 'flex-end',
					alignItems: 'flex-end',
					height: '100vh',
					boxSizing: 'border-box',
					padding: '0 160px 8px',
				}}
			>
				<Menu placement="bottom-auto" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>
							<span style={{ display: 'inline-block', width: 80 }}>Rename</span>
						</MenuItem>
					</MenuContent>
				</Menu>
			</div>,
		)

		const { trigger, panel } = await edges()

		expect(panel.bottom).toBeLessThanOrEqual(trigger.top)

		expect(panel.right).toBeCloseTo(trigger.right, 0)
	})
})
