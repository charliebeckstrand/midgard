import { describe, expect, it, vi } from 'vitest'
import { Card } from '../../components/card'
import {
	Dialog,
	DialogClose,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from '../../components/dialog'
import { DensityProvider } from '../../providers/density'
import { k as heading } from '../../recipes/kata/heading'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Dialog', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>Dialog content</DialogPanel>
			</Dialog>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

		expect(screen.getByText('Dialog content')).toBeInTheDocument()
	})

	it('renders the title as an h2, or at the level that it is given', () => {
		const { unmount } = renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogTitle>Modal title</DialogTitle>
				</DialogPanel>
			</Dialog>,
		)

		expect(screen.getByRole('heading', { level: 2, name: 'Modal title' })).toBeInTheDocument()

		unmount()

		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogTitle level={4}>Nested title</DialogTitle>
				</DialogPanel>
			</Dialog>,
		)

		const nested = screen.getByRole('heading', { level: 4, name: 'Nested title' })

		expect(nested).toHaveAttribute('data-slot', 'dialog-title')

		// The weight follows the level, as on `Heading`.
		expect(nested).toHaveClass(heading.weight[4])
	})

	it('does not render when closed', () => {
		renderUI(
			<Dialog open={false} onOpenChange={() => {}}>
				<DialogPanel>Hidden content</DialogPanel>
			</Dialog>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('opens uncontrolled from defaultOpen', () => {
		renderUI(
			<Dialog defaultOpen>
				<DialogPanel>Auto-open</DialogPanel>
			</Dialog>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Auto-open')).toBeInTheDocument()
	})

	it('stays closed when uncontrolled with neither open nor defaultOpen', () => {
		renderUI(
			<Dialog>
				<DialogPanel>Hidden</DialogPanel>
			</Dialog>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a DialogClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Dialog defaultOpen onOpenChange={onOpenChange}>
				<DialogPanel>
					<DialogClose>
						<button type="button">Done</button>
					</DialogClose>
				</DialogPanel>
			</Dialog>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		// Uncontrolled: the panel unmounts on its own, and the optional
		// onOpenChange still observes the transition.
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('renders with placement="top"', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel align="top">Top-placed</DialogPanel>
			</Dialog>,
		)

		// The panel's flex wrapper carries placementClasses[placement]; 'top'
		// aligns to the start, distinct from the 'center' default.
		const wrapper = bySlot(document.body, 'dialog')?.parentElement

		expect(wrapper?.className).toContain('sm:items-start')

		expect(wrapper?.className).not.toContain('sm:items-center')
	})

	it('respects dismissOnBackdrop=false', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogPanel dismissOnBackdrop={false}>Locked</DialogPanel>
			</Dialog>,
		)

		// The backdrop receives no click handler when dismissal is disabled, so
		// a press neither closes the dialog nor fires onOpenChange.
		const backdrop = bySlot(document.body, 'overlay-backdrop')

		expect(backdrop).not.toBeNull()

		fireEvent.click(backdrop as HTMLElement)

		expect(onOpenChange).not.toHaveBeenCalled()

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('renders with the glass surface', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel glass>Glassy</DialogPanel>
			</Dialog>,
		)

		// glass resolves the panel to the transparent glass surface variant;
		// the flat default fills with bg-white instead.
		const panel = bySlot(document.body, 'dialog')

		expect(panel?.className).toContain('bg-transparent')

		expect(panel?.className).not.toContain('bg-white')
	})

	it('marks the glass panel as the group the item wash keys on', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel glass>Glassy</DialogPanel>
			</Dialog>,
		)

		const panel = bySlot(document.body, 'dialog')

		expect(panel?.className).toContain('group/glass')

		expect(panel).toHaveAttribute('data-glass', '')
	})

	it('leaves the group marker off the flat panel', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>Flat</DialogPanel>
			</Dialog>,
		)

		const panel = bySlot(document.body, 'dialog')

		expect(panel?.className).not.toContain('group/glass')

		expect(panel).not.toHaveAttribute('data-glass')
	})

	it('DialogTitle sizes on the title ramp', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
					</DialogHeader>
				</DialogPanel>
			</Dialog>,
		)

		expect(screen.getByText('Settings')).toHaveClass('density-text-[sm,base,lg,xl,2xl]')
	})

	it('DialogTitle follows an ambient compact density through the portal', () => {
		renderUI(
			<DensityProvider density="compact">
				<Dialog open onOpenChange={() => {}}>
					<DialogPanel>
						<DialogHeader>
							<DialogTitle>Settings</DialogTitle>
						</DialogHeader>
					</DialogPanel>
				</Dialog>
			</DensityProvider>,
		)

		// The jsdom portal renders inline, so the provider span is an ancestor too.
		// The portal host must write the step itself.
		expect(screen.getByText('Settings').closest('[data-slot="portal"]')).toHaveAttribute(
			'data-density',
			'sm',
		)
	})
})

describe('Dialog click containment', () => {
	it('keeps a click in the panel from the click handler of a consumer ancestor', () => {
		const onRowClick = vi.fn()

		// A clickable card that opens its own Dialog. React carries a click in the
		// portal up the component tree, so the card sees it unless the panel stops it.
		renderUI(
			<Card onClick={onRowClick}>
				<Dialog open onOpenChange={() => {}}>
					<DialogPanel aria-label="Confirm">
						<button type="button">Delete</button>
					</DialogPanel>
				</Dialog>
			</Card>,
		)

		fireEvent.click(screen.getByText('Delete'))

		expect(onRowClick).not.toHaveBeenCalled()
	})
})

/*
 * `onOpenComplete` says the panel is up, not that an animation ran. Its landing rides on
 * `onAnimationComplete`, which the global motion mock fires only when the `animate` target
 * changes between renders — never on a mount — so no arrival resolves in jsdom. Dialog
 * picks its preset off the `sm` breakpoint rather than a prop, so it has no in-test way to
 * change that target either; the shared gate-and-latch shape is pinned on Sheet, which
 * does. The Drawer suite records the same gap.
 */
describe('Dialog onOpenComplete', () => {
	it('says nothing while the dialog is closed', () => {
		const onOpenComplete = vi.fn()

		renderUI(
			<Dialog open={false} onOpenChange={() => {}}>
				<DialogPanel onOpenComplete={onOpenComplete}>content</DialogPanel>
			</Dialog>,
		)

		expect(onOpenComplete).not.toHaveBeenCalled()
	})
})
