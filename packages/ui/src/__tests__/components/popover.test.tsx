import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { Density } from '../../providers/density'
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

	it('renders a default button when PopoverTrigger has non-element manual children', () => {
		const { container } = renderUI(
			<Popover>
				<PopoverTrigger manual>Open</PopoverTrigger>
			</Popover>,
		)

		const trigger = bySlot(container, 'popover-trigger')

		expect(trigger?.tagName).toBe('BUTTON')

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger?.textContent).toBe('Open')
	})

	it('preserves the original child element when manual is set on an element trigger', () => {
		const { container } = renderUI(
			<Popover>
				<PopoverTrigger manual>
					<button type="button" data-testid="manual-child">
						Open
					</button>
				</PopoverTrigger>
			</Popover>,
		)

		const trigger = bySlot(container, 'popover-trigger')

		expect(trigger).toHaveAttribute('data-testid', 'manual-child')
	})
})

describe('PopoverContent size context', () => {
	// PopoverContent renders through FloatingPortal — query the document.
	const popoverContent = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')
	const buttonInPopover = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('defaults to size="md" and exposes data-density on the content', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-density', 'md')
	})

	it('reflects an explicit size prop on data-density', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent size="lg">content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-density', 'lg')
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

	it('inherits an ambient Density when no size prop is given', () => {
		renderUI(
			<Density density="compact">
				<Popover open>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>
					<PopoverContent>content</PopoverContent>
				</Popover>
			</Density>,
		)

		expect(popoverContent()).toHaveAttribute('data-density', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		renderUI(
			<Density density="compact">
				<Popover open>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>
					<PopoverContent size="lg">content</PopoverContent>
				</Popover>
			</Density>,
		)

		expect(popoverContent()).toHaveAttribute('data-density', 'lg')
	})
})

describe('Popover open/close control', () => {
	const popoverContent = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')

	it('respects an explicit placement prop without throwing', () => {
		renderUI(
			<Popover open placement="right-start">
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>placed</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).not.toBeNull()
	})

	it('renders with a controlled open=true prop and forwards onOpenChange', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Popover open onOpenChange={onOpenChange}>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>panel</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).not.toBeNull()
	})

	it('omits content when controlled open=false', () => {
		renderUI(
			<Popover open={false} onOpenChange={() => {}}>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>hidden</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toBeNull()
	})

	it('accepts an onExitComplete callback prop without throwing', () => {
		const onExitComplete = vi.fn()

		renderUI(
			<Popover open onExitComplete={onExitComplete}>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>panel</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).not.toBeNull()
	})
})
