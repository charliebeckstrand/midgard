import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Drawer, DrawerClose, DrawerPanel } from '../../components/drawer'
import {
	bySlot,
	densityStepOf,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	setupUser,
} from '../helpers'

describe('Drawer', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel>Drawer content</DrawerPanel>
			</Drawer>,
		)

		const el = screen.getByRole('dialog')

		expect(el).toBeInTheDocument()

		expect(el).toHaveAttribute('aria-modal', 'true')

		expect(screen.getByText('Drawer content')).toBeInTheDocument()
	})

	it('does not render when closed', () => {
		renderUI(
			<Drawer open={false} onOpenChange={() => {}}>
				<DrawerPanel>Hidden</DrawerPanel>
			</Drawer>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('names a title-less drawer via the aria-label escape hatch', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Filters">content</DrawerPanel>
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters')
	})

	it('moves initial focus to the initialFocus element on open', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel initialFocus={ref}>
					<button type="button">First tabbable</button>
					<input ref={ref} aria-label="Composer" />
				</DrawerPanel>
			</Drawer>,
		)

		expect(screen.getByLabelText('Composer')).toHaveFocus()
	})
})

describe('Drawer enter animation', () => {
	// The motion mock surfaces `initial.transform` as `data-initial-transform`, so the enter offset —
	// the slide the panel starts from — is observable without an animation runtime.
	const panel = () => getSlot(document.body, 'drawer')

	it('slides the panel up from the bottom edge on mount', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Resolve">content</DrawerPanel>
			</Drawer>,
		)

		expect(panel()).toHaveAttribute('data-initial-transform', 'translateY(100%)')
	})
})

describe('DrawerClose', () => {
	it('closes the drawer when the child is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer open onOpenChange={onOpenChange}>
				<DrawerPanel footer={null}>
					<DrawerClose>
						<button type="button">Close</button>
					</DrawerClose>
				</DrawerPanel>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('calls the child existing onClick before closing', () => {
		const childClick = vi.fn()

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel footer={null}>
					<DrawerClose>
						<button type="button" onClick={childClick}>
							Close
						</button>
					</DrawerClose>
				</DrawerPanel>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(childClick).toHaveBeenCalled()
	})
})

describe('Drawer height and size', () => {
	// Drawer panels render through Overlay's portal, so they live on
	// document.body rather than under the test container.
	const drawerPanel = () => document.querySelector<HTMLElement>('[data-slot="drawer"]')

	const buttonInDrawer = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('defaults to height="auto", capping rather than fixing the panel height', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel>content</DrawerPanel>
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-height', 'auto')

		expect(drawerPanel()).toHaveClass('max-h-[85%]')
	})

	it('fixes the panel height at half the screen', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height="half">content</DrawerPanel>
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-height', 'half')

		expect(drawerPanel()).toHaveClass('h-1/2')
	})

	it('squares the top corners at full height, which meets the screen edge', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height="full">content</DrawerPanel>
			</Drawer>,
		)

		expect(drawerPanel()).toHaveClass('h-full')

		expect(drawerPanel()).not.toHaveClass('rounded-t-xl')
	})

	// `fit` grows to its content like `auto` and stops at the screen rather than
	// short of it, and it travels between the heights its content asks for — see
	// `usePanelFit`. Both the travel and the squaring are measurements, and jsdom
	// lays nothing out, so what is left here is the cap and the standing down: the
	// browser suite (`drawer-fit-travel`) is where the travel itself is asserted.
	it('caps a fitted panel at the screen, and measures nothing until laid out', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel height="fit">content</DrawerPanel>
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-height', 'fit')

		expect(drawerPanel()).toHaveClass('max-h-full')

		expect(drawerPanel()).not.toHaveClass('max-h-[85%]')

		expect(drawerPanel()).toHaveClass('rounded-t-xl')

		// Nothing measured the panel, so it stands at neither its ceiling nor a
		// pinned height: it is left to its own classes rather than to the zero an
		// unlaid-out box reports.
		expect(drawerPanel()).not.toHaveAttribute('data-full')

		expect(drawerPanel()?.style.height).toBe('')
	})

	it('gives descendant Buttons the Drawer size', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel size="lg">
					<Button>Save</Button>
				</DrawerPanel>
			</Drawer>,
		)

		expect(densityStepOf(present(buttonInDrawer(), 'button'))).toBe('lg')
	})
})

describe('Drawer uncontrolled', () => {
	it('opens from defaultOpen', () => {
		renderUI(
			<Drawer defaultOpen>
				<DrawerPanel>Drawer body</DrawerPanel>
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Drawer body')).toBeInTheDocument()
	})

	it('stays closed with neither open nor defaultOpen', () => {
		renderUI(
			<Drawer>
				<DrawerPanel>Hidden</DrawerPanel>
			</Drawer>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a DrawerClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer defaultOpen onOpenChange={onOpenChange}>
				<DrawerPanel>
					<DrawerClose>
						<button type="button">Done</button>
					</DrawerClose>
				</DrawerPanel>
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

describe('Drawer drag handle', () => {
	/** A drawer with a grab bar, and the bar itself. */
	function renderHandled(props?: { onOpenChange?: (open: boolean) => void; open?: boolean }) {
		const rendered = renderUI(
			<Drawer open onOpenChange={() => {}} {...props}>
				<DrawerPanel handle height="half" aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		return {
			...rendered,
			handle: getSlot(rendered.container, 'drawer-handle'),
			panel: getSlot(rendered.container, 'drawer'),
		}
	}

	it('renders no handle unless asked, and a window splitter when asked', () => {
		const { container: plain } = renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		expect(bySlot(plain, 'drawer-handle')).toBeNull()

		const { handle } = renderHandled()

		// The splitter pattern: a resizer, not a button, and reachable by keyboard —
		// on a panel whose height it alone sets, a drag-only control would leave a
		// keyboard reader unable to open the panel up.
		expect(handle).toHaveAttribute('role', 'separator')

		expect(handle).toHaveAttribute('aria-orientation', 'horizontal')

		expect(handle).toHaveAttribute('aria-valuenow')

		expect(handle.tabIndex).toBe(0)

		// The APG window splitter names its primary pane: the drawer panel.
		const panel = handle.closest<HTMLElement>('[data-slot="drawer"]')

		expect(panel?.id).toBeTruthy()

		expect(handle).toHaveAttribute('aria-controls', panel?.id)
	})

	it.each(['auto', 'fit'] as const)(
		'shows no grip on a drawer grown to its content (%s)',
		(height) => {
			const { container } = renderUI(
				<Drawer open onOpenChange={() => {}}>
					<DrawerPanel handle height={height} aria-label="Panel">
						<p>Body</p>
					</DrawerPanel>
				</Drawer>,
			)

			// The content sets the height, so a grip there would resize nothing. The grip
			// does not close a panel either, so it has nothing to do.
			expect(bySlot(container, 'drawer-handle')).toBeNull()

			expect(getSlot(container, 'drawer')).not.toHaveAttribute('data-handle')
		},
	)

	it('stops a fast drag down at the floor, and keeps the drawer open', () => {
		const onOpenChange = vi.fn()

		const { handle, panel } = renderHandled({ onOpenChange })

		fireEvent.pointerDown(handle, {
			isPrimary: true,
			pointerType: 'touch',
			clientY: 100,
			timeStamp: 0,
		})

		fireEvent.pointerMove(window, { pointerType: 'touch', clientY: 600, timeStamp: 10 })

		fireEvent.pointerUp(window, { pointerType: 'touch', clientY: 900, timeStamp: 20 })

		// A flick down no longer throws the panel away. It only resizes.
		expect(onOpenChange).not.toHaveBeenCalled()

		expect(panel.style.translate).toBe('')
	})

	it('marks the bar as held while a pointer drags it, so the grab hand closes', () => {
		const { handle } = renderHandled()

		expect(handle).not.toHaveAttribute('data-dragging')

		fireEvent.pointerDown(handle, {
			isPrimary: true,
			pointerType: 'mouse',
			button: 0,
			clientY: 400,
		})

		expect(handle).toHaveAttribute('data-dragging')

		fireEvent.pointerUp(window, { pointerType: 'mouse', clientY: 400 })

		expect(handle).not.toHaveAttribute('data-dragging')
	})

	it('resizes on the arrow keys and never closes on them', async () => {
		const onOpenChange = vi.fn()

		const { handle, panel } = renderHandled({ onOpenChange })

		const user = setupUser()

		handle.focus()

		await user.keyboard('{ArrowUp}')

		// The height lands inline, because it is a measurement and no class says
		// "412 pixels".
		expect(panel.style.height).not.toBe('')

		// Escape is how a panel closes from the keyboard everywhere else, so an
		// arrow pressed to the floor must not shut this one.
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}')

		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	it('forgets a dragged height once closed', async () => {
		const { container, rerender, handle } = renderHandled()

		const user = setupUser()

		handle.focus()

		await user.keyboard('{ArrowUp}')

		rerender(
			<Drawer open={false} onOpenChange={() => {}}>
				<DrawerPanel handle height="half" aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		rerender(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel handle height="half" aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		// Back at the size the consumer asked for, which is the one a reader coming
		// back to the panel expects.
		expect(getSlot(container, 'drawer').style.height).toBe('')
	})

	it('ends a drag that the close interrupts, so a reopen keeps its own height', () => {
		const { container, rerender, handle } = renderHandled()

		fireEvent.pointerDown(handle, { isPrimary: true, pointerType: 'touch', clientY: 400 })

		fireEvent.pointerMove(window, { pointerType: 'touch', clientY: 300 })

		// Escape or the owner closes the panel while the finger is still down.
		rerender(
			<Drawer open={false} onOpenChange={() => {}}>
				<DrawerPanel handle height="half" aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		// The late release must not settle a size on the closed panel.
		fireEvent.pointerUp(window, { pointerType: 'touch', clientY: 300 })

		rerender(
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel handle height="half" aria-label="Panel">
					<p>Body</p>
				</DrawerPanel>
			</Drawer>,
		)

		const panel = getSlot(container, 'drawer')

		expect(panel.style.height).toBe('')

		expect(panel).not.toHaveAttribute('data-resizing')
	})
})
