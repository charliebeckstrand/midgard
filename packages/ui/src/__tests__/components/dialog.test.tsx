import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '../../components/dialog'
import { DensityProvider } from '../../providers/density'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Dialog', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				Dialog content
			</Dialog>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

		expect(screen.getByText('Dialog content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Dialog open={false} onOpenChange={() => {}}>
				Hidden content
			</Dialog>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('opens uncontrolled from defaultOpen', () => {
		renderUI(<Dialog defaultOpen>Auto-open</Dialog>)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Auto-open')).toBeInTheDocument()
	})

	it('stays closed when uncontrolled with neither open nor defaultOpen', () => {
		renderUI(<Dialog>Hidden</Dialog>)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a DialogClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Dialog defaultOpen onOpenChange={onOpenChange}>
				<DialogClose>
					<button type="button">Done</button>
				</DialogClose>
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
			<Dialog open placement="top" onOpenChange={() => {}}>
				Top-placed
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
			<Dialog open dismissOnBackdrop={false} onOpenChange={onOpenChange}>
				Locked
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
			<Dialog open glass onOpenChange={() => {}}>
				Glassy
			</Dialog>,
		)

		// glass resolves the panel to the transparent glass surface variant;
		// the flat default fills with bg-white instead.
		const panel = bySlot(document.body, 'dialog')

		expect(panel?.className).toContain('bg-transparent')

		expect(panel?.className).not.toContain('bg-white')
	})

	it('DialogTitle holds the text-lg baseline at neutral density', () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
			</Dialog>,
		)

		expect(screen.getByText('Settings').className).toContain('text-lg')
	})

	it('DialogTitle scales down with an ambient compact density', () => {
		renderUI(
			<DensityProvider density="compact">
				<Dialog open onOpenChange={() => {}}>
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
					</DialogHeader>
				</Dialog>
			</DensityProvider>,
		)

		expect(screen.getByText('Settings').className).toContain('text-base')
	})
})
