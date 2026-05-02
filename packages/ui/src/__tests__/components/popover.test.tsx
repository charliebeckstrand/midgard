import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
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

describe('PopoverContent size context', () => {
	// PopoverContent renders through FloatingPortal — query the document.
	const popoverContent = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')
	const buttonInPopover = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('defaults to size="md" and exposes data-step on the content', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-step', 'md')
	})

	it('reflects an explicit size prop on data-step', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent size="lg">content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-step', 'lg')
	})

	it('descendant Buttons inherit the PopoverContent size', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent size="sm">
					<Button>Save</Button>
				</PopoverContent>
			</Popover>,
		)

		// sun.sm.text = 'sm' → ji.size.sm = 'text-sm'
		expect(buttonInPopover()?.className).toContain('text-sm')
	})
})
