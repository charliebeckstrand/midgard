import { describe, expect, it } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { notifyOverlayOpened } from '../../primitives/overlay'
import { act, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

describe('Tooltip', () => {
	it('renders with data-slot="tooltip-trigger"', () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const el = bySlot(container, 'tooltip-trigger')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger content', () => {
		renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		expect(screen.getByText('Hover me')).toBeInTheDocument()
	})

	it('closes when an overlay opens', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger')

		if (!trigger) throw new Error('trigger missing')

		await user.click(trigger)

		await waitFor(() => expect(screen.getByText('Tooltip text')).toBeInTheDocument())

		act(() => notifyOverlayOpened())

		expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
	})
})
