import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('Popover', () => {
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

	it('defaults to size="md" and exposes data-size on the content', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-size', 'md')
	})

	it('reflects an explicit size prop on data-size', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent size="lg">content</PopoverContent>
			</Popover>,
		)

		expect(popoverContent()).toHaveAttribute('data-size', 'lg')
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
			<DensityProvider density="compact">
				<Popover open>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>
					<PopoverContent>content</PopoverContent>
				</Popover>
			</DensityProvider>,
		)

		expect(popoverContent()).toHaveAttribute('data-size', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		renderUI(
			<DensityProvider density="compact">
				<Popover open>
					<PopoverTrigger>
						<button type="button">Open</button>
					</PopoverTrigger>
					<PopoverContent size="lg">content</PopoverContent>
				</Popover>
			</DensityProvider>,
		)

		expect(popoverContent()).toHaveAttribute('data-size', 'lg')
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

describe('Popover non-modal semantics', () => {
	const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')

	it('exposes a labelled, non-modal dialog with no aria-modal', () => {
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">Body</PopoverContent>
			</Popover>,
		)

		expect(content()).toHaveAttribute('role', 'dialog')

		expect(content()).toHaveAccessibleName('Details')

		// The defining attribute of a *modal* dialog is absent, so the rest of the
		// page stays in the accessibility tree and focus is not contained.
		expect(content()).not.toHaveAttribute('aria-modal')
	})

	it('exposes a single dialog wired to the trigger, with no role on the positioning wrapper', () => {
		const { container } = renderUI(
			<Popover open>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">Body</PopoverContent>
			</Popover>,
		)

		// floating-ui's `useRole` is suppressed (`role: null`), so only the panel
		// itself is `role="dialog"` — the positioning wrapper is not a second,
		// unnamed dialog around it.
		expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)

		const panel = content()

		expect(panel?.parentElement).not.toHaveAttribute('role')

		// The trigger's `aria-controls` resolves to the real panel id.
		const trigger = bySlot(container, 'popover-trigger')

		expect(panel?.id).toBeTruthy()

		expect(trigger).toHaveAttribute('aria-controls', panel?.id)
	})

	it('does not trap focus inside the panel', async () => {
		const user = userEvent.setup()

		renderUI(
			<Popover open>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent autoFocus aria-label="Details">
					<Button>Inside</Button>
				</PopoverContent>
			</Popover>,
		)

		// Focus starts on the panel (autoFocus); tabbing past its single control
		// leaves the panel — a modal focus trap would keep focus inside.
		await user.tab()
		await user.tab()

		expect(content()).not.toContainElement(document.activeElement as HTMLElement)
	})
})
