import { describe, expect, it } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { bySlot, renderUI, screen } from '../helpers'

describe('Tooltip', () => {
	it('renders with data-slot="tooltip"', () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const el = bySlot(container, 'tooltip')

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
})
