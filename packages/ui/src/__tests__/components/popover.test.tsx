import { describe, expect, it } from 'vitest'
import { Popover, PopoverTrigger } from '../../components/popover'
import { bySlot, renderUI, screen } from '../helpers'

describe('Popover', () => {
	it('renders with data-slot="popover"', () => {
		const { container } = renderUI(
			<Popover>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
			</Popover>,
		)

		const el = bySlot(container, 'popover')

		expect(el).toBeInTheDocument()
	})

	it('renders trigger content', () => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
			</Popover>,
		)

		expect(screen.getByText('Open')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Popover className="custom">
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
			</Popover>,
		)

		const el = bySlot(container, 'popover')

		expect(el?.className).toContain('custom')
	})
})
