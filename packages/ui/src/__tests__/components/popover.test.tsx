import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../../components/popover'
import { bySlot, densityStepOf, present, renderUI, screen, setupUser } from '../helpers'

describe('Popover', () => {
	it('renders a default button when PopoverTrigger has non-element children', () => {
		const { container } = renderUI(
			<Popover>
				<PopoverTrigger>Open</PopoverTrigger>
			</Popover>,
		)

		const trigger = bySlot(container, 'popover-trigger')

		expect(trigger?.tagName).toBe('BUTTON')

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger?.textContent).toBe('Open')
	})

	it('preserves the original child element on an element trigger', () => {
		const { container } = renderUI(
			<Popover>
				<PopoverTrigger>
					<button type="button" data-testid="manual-child">
						Open
					</button>
				</PopoverTrigger>
			</Popover>,
		)

		const trigger = bySlot(container, 'popover-trigger')

		expect(trigger).toHaveAttribute('data-testid', 'manual-child')
	})

	it('keeps the anchor of a component child', () => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
			</Popover>,
		)

		expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('data-slot', 'button')
	})

	it('lets the className of the child win over the className of the trigger', () => {
		renderUI(
			<Popover>
				<PopoverTrigger className="p-1">
					<button type="button" className="p-2">
						Open
					</button>
				</PopoverTrigger>
			</Popover>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(trigger).toHaveClass('p-2')

		expect(trigger).not.toHaveClass('p-1')
	})

	it('merges the floating ref with a ref already on the child', () => {
		const ref = createRef<HTMLButtonElement>()

		const { container } = renderUI(
			<Popover>
				<PopoverTrigger>
					<button ref={ref} type="button">
						Open
					</button>
				</PopoverTrigger>
			</Popover>,
		)

		// The consumer's ref still receives the node; it is composed with the
		// floating reference, not clobbered by it.
		expect(ref.current).toBe(bySlot(container, 'popover-trigger'))
	})
})

describe('Popover root', () => {
	it('renders a span root, which is valid in phrasing content', () => {
		const { container } = renderUI(
			<p>
				See the{' '}
				<Popover>
					<PopoverTrigger>note</PopoverTrigger>
				</Popover>
			</p>,
		)

		// A `<div>` inside a `<p>` is invalid HTML. The panel renders in a portal.
		expect(bySlot(container, 'popover')?.tagName).toBe('SPAN')
	})
})

describe('PopoverContent size scope', () => {
	// PopoverContent renders through FloatingPortal; query the document.
	const buttonInPopover = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('gives descendant Buttons the PopoverContent size', () => {
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

		expect(densityStepOf(present(buttonInPopover(), 'button'))).toBe('sm')
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

	it('opens uncontrolled from defaultOpen, with the trigger reflecting it', () => {
		renderUI(
			<Popover defaultOpen>
				<PopoverTrigger>
					<button type="button">Open</button>
				</PopoverTrigger>
				<PopoverContent>panel</PopoverContent>
			</Popover>,
		)

		// Uncontrolled: the panel starts open with no `open` prop, and the
		// disclosure's state reaches the trigger's aria-expanded.
		expect(popoverContent()).not.toBeNull()

		expect(document.querySelector('button')).toHaveAttribute('aria-expanded', 'true')
	})
})

describe('Popover non-modal semantics', () => {
	const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')

	it('exposes a labeled, non-modal dialog with no aria-modal', () => {
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
		renderUI(
			<Popover open>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">Body</PopoverContent>
			</Popover>,
		)

		// floating-ui's `useRole` is suppressed (`role: null`); only the panel
		// itself carries `role="dialog"`, not the positioning wrapper.
		expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)

		const panel = content()

		expect(panel?.parentElement).not.toHaveAttribute('role')

		// The trigger's `aria-controls` resolves to the real panel id.
		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(panel?.id).toBeTruthy()

		expect(trigger).toHaveAttribute('aria-controls', panel?.id)
	})

	// The trigger announces a dialog popup only when the panel is a dialog, and an
	// unlabeled panel is a generic surface.
	it.each([
		['an unlabeled panel', {}, null],
		['a labeled panel', { 'aria-label': 'Details' }, 'dialog'],
	])('sets aria-haspopup on the trigger to match %s', (_name, nameProps, haspopup) => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent {...nameProps}>Body</PopoverContent>
			</Popover>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		expect(trigger.getAttribute('aria-haspopup')).toBe(haspopup)
	})

	it('does not trap focus inside the panel', async () => {
		const user = setupUser()

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
		// leaves the panel, where a modal focus trap would keep focus inside.
		await user.tab()

		await user.tab()

		expect(content()).not.toContainElement(document.activeElement as HTMLElement)
	})
})

describe('PopoverClose', () => {
	const content = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')

	it('renders the standard Close button, which closes an uncontrolled popover', async () => {
		const user = setupUser()

		const onOpenChange = vi.fn()

		renderUI(
			<Popover defaultOpen onOpenChange={onOpenChange}>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">
					<PopoverClose />
				</PopoverContent>
			</Popover>,
		)

		const close = present(bySlot(document.body, 'popover-close'), 'close')

		expect(close).toHaveTextContent('Close')

		await user.click(close)

		expect(content()).toBeNull()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('closes on a click on its child, after the own onClick of the child', async () => {
		const user = setupUser()

		const calls: string[] = []

		const onOpenChange = vi.fn(() => calls.push('close'))

		renderUI(
			<Popover defaultOpen onOpenChange={onOpenChange}>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">
					<PopoverClose>
						<Button onClick={() => calls.push('child')}>Done</Button>
					</PopoverClose>
				</PopoverContent>
			</Popover>,
		)

		await user.click(screen.getByRole('button', { name: 'Done' }))

		expect(content()).toBeNull()

		expect(calls).toEqual(['child', 'close'])
	})

	it('returns focus to the trigger', async () => {
		const user = setupUser()

		renderUI(
			<Popover defaultOpen>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details">
					<PopoverClose />
				</PopoverContent>
			</Popover>,
		)

		await user.click(present(bySlot(document.body, 'popover-close'), 'close'))

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open' }))
	})
})
