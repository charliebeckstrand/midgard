import { describe, expect, it, vi } from 'vitest'
import { Sheet, SheetClose, SheetTrigger } from '../../components/sheet'
import { panelAxis } from '../../hooks/use-panel-resize'
import { bySlot, fireEvent, present, renderUI, screen, userEvent } from '../helpers'

describe('Sheet', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}}>
				Sheet content
			</Sheet>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

		expect(screen.getByText('Sheet content')).toBeInTheDocument()
	})

	it('omits aria-modal on a non-modal sheet', () => {
		renderUI(
			<Sheet open modal={false} onOpenChange={() => {}}>
				Peek content
			</Sheet>,
		)

		// A hover-peek neither traps focus nor locks scroll; announcing it as
		// modal would tell AT the rest of the page is inert when it isn't.
		expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')
	})

	it('does not render when closed', () => {
		renderUI(
			<Sheet open={false} onOpenChange={() => {}}>
				Hidden
			</Sheet>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('paints a backdrop on a non-modal sheet when backdrop is set', () => {
		renderUI(
			<Sheet open modal={false} backdrop onOpenChange={() => {}} aria-label="Peek">
				Peek content
			</Sheet>,
		)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).not.toBeNull()

		// Backdrop without modality: still not announced modal, page not locked.
		expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')

		expect(document.body.style.overflow).toBe('')
	})

	it('renders no backdrop on a non-modal sheet by default', () => {
		renderUI(
			<Sheet open modal={false} onOpenChange={() => {}} aria-label="Peek">
				Peek content
			</Sheet>,
		)

		expect(document.querySelector('[data-slot="overlay-backdrop"]')).toBeNull()
	})

	it('greys out what shows through the backdrop when desaturate is set', () => {
		renderUI(
			<Sheet open desaturate onOpenChange={() => {}} aria-label="Filters">
				Filter content
			</Sheet>,
		)

		expect(present(bySlot(document.body, 'overlay-backdrop'), 'backdrop')).toHaveClass(
			'backdrop-grayscale',
		)
	})

	it('names a title-less sheet via the aria-label escape hatch', () => {
		renderUI(
			<Sheet open onOpenChange={() => {}} aria-label="Navigation">
				content
			</Sheet>,
		)

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Navigation')
	})
})

describe('SheetTrigger', () => {
	it('invokes onClick and preserves the child onClick when clicked', () => {
		const childOnClick = vi.fn()

		const onClick = vi.fn()

		renderUI(
			<SheetTrigger onClick={onClick}>
				<button type="button" onClick={childOnClick}>
					Open
				</button>
			</SheetTrigger>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Open' }))

		expect(childOnClick).toHaveBeenCalledOnce()

		expect(onClick).toHaveBeenCalledOnce()
	})
})

describe('SheetClose', () => {
	it('invokes the child onClick and closes the sheet when clicked', () => {
		const childOnClick = vi.fn()

		const onOpenChange = vi.fn()

		renderUI(
			<Sheet open onOpenChange={onOpenChange}>
				<SheetClose>
					<button type="button" onClick={childOnClick}>
						Close
					</button>
				</SheetClose>
			</Sheet>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))

		expect(childOnClick).toHaveBeenCalledOnce()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('renders with side="left"', () => {
		renderUI(
			<Sheet open side="left" onOpenChange={() => {}}>
				Left sheet
			</Sheet>,
		)

		expect(screen.getByText('Left sheet')).toBeInTheDocument()
	})

	it('renders with side="top"', () => {
		renderUI(
			<Sheet open side="top" onOpenChange={() => {}}>
				Top sheet
			</Sheet>,
		)

		expect(screen.getByText('Top sheet')).toBeInTheDocument()
	})

	it('renders with side="bottom"', () => {
		renderUI(
			<Sheet open side="bottom" onOpenChange={() => {}}>
				Bottom sheet
			</Sheet>,
		)

		expect(screen.getByText('Bottom sheet')).toBeInTheDocument()
	})
})

describe('Sheet uncontrolled', () => {
	it('opens from defaultOpen', () => {
		renderUI(<Sheet defaultOpen>Sheet body</Sheet>)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Sheet body')).toBeInTheDocument()
	})

	it('stays closed with neither open nor defaultOpen', () => {
		renderUI(<Sheet>Hidden</Sheet>)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a SheetClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Sheet defaultOpen onOpenChange={onOpenChange}>
				<SheetClose>
					<button type="button">Done</button>
				</SheetClose>
			</Sheet>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

/*
 * `onOpenComplete` says the panel is up, not that an animation ran. The enter slide's own
 * landing rides on `onAnimationComplete`, and the global motion mock fires that only when
 * the `animate` target *changes* between renders — never on a mount — so no arrival slide
 * resolves anywhere in the library's coverage. The same gap the Drawer suite records.
 *
 * What these cases do pin is everything around it: that the callback is wired to the
 * landing at all, that the definition gate accepts the enter target rather than the exit,
 * and that the latch holds it to one report. A `side` swap changes the preset, which is
 * the one target change the mock will resolve.
 */
describe('Sheet onOpenComplete', () => {
	const sheet = (props: { open: boolean; side?: 'right' | 'top'; onOpenComplete: () => void }) => (
		<Sheet {...props} onOpenChange={() => {}} aria-label="Resolve">
			content
		</Sheet>
	)

	it('reports the landing once, not once per render', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(sheet({ open: true, side: 'right', onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()

		rerender(sheet({ open: true, side: 'top', onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledOnce()

		rerender(sheet({ open: true, side: 'right', onOpenComplete }))

		// Still one arrival. The latch resets when the sheet closes, not on every landing.
		expect(onOpenComplete).toHaveBeenCalledOnce()
	})

	it('says nothing while the sheet is closed', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(sheet({ open: false, side: 'right', onOpenComplete }))

		rerender(sheet({ open: false, side: 'top', onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()
	})
})

describe('Sheet handle', () => {
	/** A sheet with a grab bar, and the bar itself. */
	function renderHandled(side: 'top' | 'right' | 'bottom' | 'left') {
		const rendered = renderUI(
			<Sheet open handle side={side} onOpenChange={() => {}} aria-label="Panel">
				<p>Body</p>
			</Sheet>,
		)

		return {
			handle: present(bySlot(rendered.container, 'sheet-handle'), 'drag handle'),
			panel: present(bySlot(rendered.container, 'sheet'), 'panel'),
		}
	}

	/** The size the panel settles at after `key` is pressed twice. */
	async function pressed(side: 'top' | 'right' | 'bottom' | 'left', key: string) {
		const { handle, panel } = renderHandled(side)

		handle.focus()

		// Twice, because the first press lands on the floor from either direction —
		// an unmeasured panel starts at nothing, so the floor is what clamps it.
		// The second is the one that says which way the key moves the edge.
		await userEvent.setup({ delay: null }).keyboard(`${key}${key}`)

		return Number.parseFloat(panel.style[panelAxis(side)])
	}

	it('states a dragged size on the axis the panel is docked across', async () => {
		const { handle, panel } = renderHandled('top')

		handle.focus()

		await userEvent.setup({ delay: null }).keyboard('{ArrowDown}{ArrowDown}')

		// A sheet along the top is resized by its height, so a width here would
		// state a number the gesture never took — and clamp the panel with it.
		expect(panel.style.height).not.toBe('')

		expect(panel.style.width).toBe('')
	})

	it('renders no handle unless asked, and a window splitter when asked', () => {
		const { container } = renderUI(
			<Sheet open onOpenChange={() => {}} aria-label="Panel">
				<p>Body</p>
			</Sheet>,
		)

		expect(bySlot(container, 'sheet-handle')).toBeNull()

		const { handle } = renderHandled('right')

		expect(handle).toHaveAttribute('role', 'separator')

		// The separator's own line, not the axis it moves on: a grip on the inner
		// edge of a right-hand sheet stands vertically and resizes horizontally.
		expect(handle).toHaveAttribute('aria-orientation', 'vertical')

		expect(handle).toHaveAttribute('aria-valuenow')

		expect(handle.tabIndex).toBe(0)
	})

	it('grows a panel away from the edge it is docked to, whichever edge that is', async () => {
		// The gesture is keyed on the docked side and not the axis, because the
		// axis alone cannot say which way is bigger. A sheet on the left grows as
		// its inner edge travels right, and one on the right as it travels left;
		// keyed on the axis, one of each pair runs backwards.
		expect(await pressed('right', '{ArrowLeft}')).toBeGreaterThan(
			await pressed('right', '{ArrowRight}'),
		)

		expect(await pressed('left', '{ArrowRight}')).toBeGreaterThan(
			await pressed('left', '{ArrowLeft}'),
		)

		expect(await pressed('bottom', '{ArrowUp}')).toBeGreaterThan(
			await pressed('bottom', '{ArrowDown}'),
		)

		expect(await pressed('top', '{ArrowDown}')).toBeGreaterThan(await pressed('top', '{ArrowUp}'))
	})
})
