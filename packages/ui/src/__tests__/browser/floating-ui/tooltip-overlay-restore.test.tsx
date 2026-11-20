import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * A surface that opens hides an open tooltip with the overlay signal. When that
 * surface closes and the mouse is still on the trigger, the tooltip opens again
 * at once, as a hover shows it. The mouse does not move, so no hover event
 * comes. A tooltip that a tap left on a touch screen does not open again.
 *
 * It runs in a real browser, because the test reads `:hover` and the hover of
 * the real floating engine, which the jsdom suites mock.
 */

function Harness() {
	return (
		<Popover placement="bottom">
			<Tooltip delay={0}>
				<TooltipTrigger>
					<PopoverTrigger>
						<Button>Search</Button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent>Search the document</TooltipContent>
			</Tooltip>
			<PopoverContent aria-label="Search">
				<input aria-label="Query" />
			</PopoverContent>
		</Popover>
	)
}

async function hoverAndOpen() {
	renderUI(<Harness />)

	const trigger = screen.getByRole('button', { name: 'Search' })

	await userEvent.hover(trigger)

	await screen.findByRole('tooltip')

	await userEvent.click(trigger)

	await screen.findByRole('dialog')

	await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())

	return trigger
}

describe('a tooltip that a surface hid (real browser)', () => {
	it('opens again when the surface closes on Escape under the mouse', async () => {
		await hoverAndOpen()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await screen.findByRole('tooltip')
	})

	it('opens again when a click on the trigger closes the surface', async () => {
		const trigger = await hoverAndOpen()

		// A click with no move of the mouse. The click of the test driver moves
		// the mouse to the trigger first, and the move alone shows the tooltip.
		trigger.click()

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await screen.findByRole('tooltip')
	})

	it('stays closed when the mouse left the trigger', async () => {
		await hoverAndOpen()

		await userEvent.hover(screen.getByRole('textbox', { name: 'Query' }))

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await frames(4)

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})

	it('stays closed when a touch press was the last pointer on the trigger', async () => {
		const trigger = await hoverAndOpen()

		// A tap on the trigger after the mouse hover: the touch press is the last
		// pointer on it, and a touch browser keeps `:hover` on a tapped node.
		trigger.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }),
		)

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		await frames(4)

		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
	})
})
