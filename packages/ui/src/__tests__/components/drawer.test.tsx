import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Drawer, DrawerClose, DrawerTrigger } from '../../components/drawer'
import { settleResize, speedOf } from '../../components/drawer/use-drawer-resize'
import { DensityProvider } from '../../providers/density'
import { bySlot, fireEvent, present, renderUI, screen, userEvent } from '../helpers'

describe('Drawer', () => {
	it('renders children with role="dialog" when open', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				Drawer content
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
				Hidden
			</Drawer>,
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('names a title-less drawer via the aria-label escape hatch', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} aria-label="Filters">
				content
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toHaveAccessibleName('Filters')
	})

	it('greys out what shows through the backdrop when desaturate is set', () => {
		renderUI(
			<Drawer open desaturate onOpenChange={() => {}} aria-label="Resolve">
				content
			</Drawer>,
		)

		expect(present(bySlot(document.body, 'overlay-backdrop'), 'backdrop')).toHaveClass(
			'backdrop-grayscale',
		)
	})

	it('leaves the backdrop in colour by default', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} aria-label="Resolve">
				content
			</Drawer>,
		)

		expect(present(bySlot(document.body, 'overlay-backdrop'), 'backdrop')).not.toHaveClass(
			'backdrop-grayscale',
		)
	})

	it('moves initial focus to the initialFocus element on open', () => {
		const ref = createRef<HTMLInputElement>()

		renderUI(
			<Drawer open onOpenChange={() => {}} initialFocus={ref}>
				<button type="button">First tabbable</button>
				<input ref={ref} aria-label="Composer" />
			</Drawer>,
		)

		expect(screen.getByLabelText('Composer')).toHaveFocus()
	})
})

describe('Drawer enter animation', () => {
	// The motion mock surfaces `initial.y` as `data-initial-y`, so the enter offset —
	// the slide the panel starts from — is observable without an animation runtime.
	const panel = () => present(bySlot(document.body, 'drawer'), 'drawer panel')

	it('slides the panel up from the bottom edge on mount', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} aria-label="Resolve">
				content
			</Drawer>,
		)

		expect(panel()).toHaveAttribute('data-initial-y', '100%')
	})

	it('mounts an arriving drawer already in place when animateOnMount is false', () => {
		renderUI(
			<Drawer open animateOnMount={false} onOpenChange={() => {}} aria-label="Resolve">
				content
			</Drawer>,
		)

		expect(panel()).not.toHaveAttribute('data-initial-y')
	})

	it('slides on a reopen even while animateOnMount stays false', () => {
		const drawer = (open: boolean) => (
			<Drawer open={open} animateOnMount={false} onOpenChange={() => {}} aria-label="Resolve">
				content
			</Drawer>
		)

		const { rerender } = renderUI(drawer(true))

		// Minimize, then maximize: the panel unmounts while closed, so the flag would
		// otherwise suppress the slide on every trip back up for the life of the mount.
		rerender(drawer(false))
		rerender(drawer(true))

		expect(panel()).toHaveAttribute('data-initial-y', '100%')
	})
})

/*
 * `onOpenComplete` says the panel is up, not that an animation ran — so the arrival that
 * plays no slide has to report too, and that is the arrival these cases hold: the motion
 * mock models animations as instant but deliberately does not fire a mount's, the way the
 * library behaves under `initial={false}`.
 *
 * The slide's own landing rides on `onAnimationComplete`, and no suite exercises it. The
 * mock is global in jsdom and both browser instances keep it, so no real animation ever
 * resolves anywhere in the library's coverage.
 */
describe('Drawer onOpenComplete', () => {
	const drawer = (props: {
		open: boolean
		animateOnMount?: boolean
		onOpenComplete: () => void
	}) => (
		<Drawer {...props} onOpenChange={() => {}} aria-label="Resolve">
			content
		</Drawer>
	)

	it('reports a panel that arrives already in place, once per arrival not once per render', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(drawer({ open: true, animateOnMount: false, onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledOnce()

		rerender(drawer({ open: true, animateOnMount: false, onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledOnce()
	})

	it('says nothing while the drawer is closed', () => {
		const onOpenComplete = vi.fn()

		renderUI(drawer({ open: false, animateOnMount: false, onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()
	})

	it('says nothing on the way out', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(drawer({ open: true, animateOnMount: false, onOpenComplete }))

		rerender(drawer({ open: false, animateOnMount: false, onOpenComplete }))

		// Leaving is not arriving. A reopen reports again — but it slides to get there, and
		// that landing is uncovered (see this block's note).
		expect(onOpenComplete).toHaveBeenCalledOnce()
	})
})

describe('DrawerTrigger', () => {
	it('invokes the provided onClick when the child is clicked', () => {
		const onClick = vi.fn()

		renderUI(
			<DrawerTrigger onClick={onClick}>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(onClick).toHaveBeenCalled()
	})

	it('calls the child existing onClick as well', () => {
		const childClick = vi.fn()

		renderUI(
			<DrawerTrigger>
				<button type="button" onClick={childClick}>
					Open
				</button>
			</DrawerTrigger>,
		)

		fireEvent.click(screen.getByText('Open'))

		expect(childClick).toHaveBeenCalled()
	})

	it('marks the trigger as a dialog disclosure', () => {
		renderUI(
			<DrawerTrigger open={false}>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		const trigger = screen.getByText('Open')

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	it('reflects the open state via aria-expanded', () => {
		renderUI(
			<DrawerTrigger open>
				<button type="button">Open</button>
			</DrawerTrigger>,
		)

		expect(screen.getByText('Open')).toHaveAttribute('aria-expanded', 'true')
	})
})

describe('DrawerClose', () => {
	it('closes the drawer when the child is clicked', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer open onOpenChange={onOpenChange}>
				<DrawerClose>
					<button type="button">Close</button>
				</DrawerClose>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('calls the child existing onClick before closing', () => {
		const childClick = vi.fn()

		renderUI(
			<Drawer open onOpenChange={() => {}}>
				<DrawerClose>
					<button type="button" onClick={childClick}>
						Close
					</button>
				</DrawerClose>
			</Drawer>,
		)

		fireEvent.click(screen.getByText('Close'))

		expect(childClick).toHaveBeenCalled()
	})
})

describe('Drawer size context', () => {
	// Drawer panels render through Overlay's portal, so they live on
	// document.body rather than under the test container.
	const drawerPanel = () => document.querySelector<HTMLElement>('[data-slot="drawer"]')

	const buttonInDrawer = () => document.querySelector<HTMLElement>('[data-slot="button"]')

	it('defaults to size="md" and exposes data-size on the panel', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'md')
	})

	it('reflects an explicit size prop on data-size', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} size="lg">
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'lg')
	})

	it('defaults to height="auto", capping rather than fixing the panel height', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}}>
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-height', 'auto')

		expect(drawerPanel()).toHaveClass('max-h-[85dvh]')
	})

	it('fixes the panel height at half the screen', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} height="half">
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveAttribute('data-height', 'half')

		expect(drawerPanel()).toHaveClass('h-[50dvh]')
	})

	it('squares the top corners at full height, which meets the screen edge', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} height="full">
				content
			</Drawer>,
		)

		expect(drawerPanel()).toHaveClass('h-dvh')

		expect(drawerPanel()).not.toHaveClass('rounded-t-xl')
	})

	it('descendant Buttons inherit the Drawer size', () => {
		renderUI(
			<Drawer open onOpenChange={() => {}} size="lg">
				<Button>Save</Button>
			</Drawer>,
		)

		// sun.lg.text = 'lg' → ji.size.lg = 'text-lg'
		expect(buttonInDrawer()?.className).toContain('text-lg')
	})

	it('inherits an ambient Density when no size prop is given', () => {
		renderUI(
			<DensityProvider density="compact">
				<Drawer open onOpenChange={() => {}}>
					content
				</Drawer>
			</DensityProvider>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'sm')
	})

	it('explicit size prop wins over an ambient Density', () => {
		renderUI(
			<DensityProvider density="compact">
				<Drawer open onOpenChange={() => {}} size="lg">
					content
				</Drawer>
			</DensityProvider>,
		)

		expect(drawerPanel()).toHaveAttribute('data-size', 'lg')
	})
})

describe('Drawer uncontrolled', () => {
	it('opens from defaultOpen', () => {
		renderUI(<Drawer defaultOpen>Drawer body</Drawer>)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('Drawer body')).toBeInTheDocument()
	})

	it('stays closed with neither open nor defaultOpen', () => {
		renderUI(<Drawer>Hidden</Drawer>)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('closes itself when uncontrolled and a DrawerClose is activated', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Drawer defaultOpen onOpenChange={onOpenChange}>
				<DrawerClose>
					<button type="button">Done</button>
				</DrawerClose>
			</Drawer>,
		)

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		fireEvent.click(screen.getByText('Done'))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})

describe('Drawer drag handle', () => {
	// What a released drag means is arithmetic, and it is the half a synthetic
	// pointer cannot reach — the gesture writes the height straight to the element
	// across real pointer frames. Driven directly instead.
	describe('settleResize', () => {
		it('keeps whatever height the drag landed on', () => {
			// Not a step: the reader is deciding how much of the screen the panel
			// gets, and the answer is wherever they let go.
			expect(settleResize(420, 0)).toBe(420)

			expect(settleResize(140, 0)).toBe(140)
		})

		it('keeps the panel at the floor rather than taking it away there', () => {
			// The smallest size is still a size. Closing when the reader reaches it
			// would take the panel from someone who was still placing it.
			expect(settleResize(140, 0.1)).toBe(140)
		})

		it('throws the panel away on a flick, whatever height it was left at', () => {
			// Speed, not position, is what separates a resize from a dismissal — a
			// reader placing an edge slows to a stop, and one dismissing does not.
			expect(settleResize(600, 0.9)).toBe('close')

			expect(settleResize(140, 0.9)).toBe('close')
		})

		it('never reads an upward flick as a dismissal', () => {
			expect(settleResize(600, -2)).toBe(600)
		})
	})

	describe('speedOf', () => {
		it('measures the last sample before the release, not the whole gesture', () => {
			// A reader who drags slowly and then flicks means the flick; averaged over
			// the travel it would disappear.
			expect(speedOf({ y: 100, t: 0 }, 160, 100)).toBeCloseTo(0.6, 5)
		})

		it('reads no speed from a gesture with nothing behind it', () => {
			expect(speedOf(null, 160, 100)).toBe(0)
		})

		it('reads no speed from a release in the same instant as the last move', () => {
			// The interval is the divisor, so a zero one has no speed to give.
			expect(speedOf({ y: 100, t: 100 }, 160, 100)).toBe(0)
		})
	})

	/** A drawer with a grab bar, and the bar itself. */
	function renderHandled(props?: { onOpenChange?: (open: boolean) => void; open?: boolean }) {
		const rendered = renderUI(
			<Drawer open handle height="half" onOpenChange={() => {}} aria-label="Panel" {...props}>
				<p>Body</p>
			</Drawer>,
		)

		return {
			...rendered,
			handle: present(bySlot(rendered.container, 'drawer-handle'), 'drag handle'),
			panel: present(bySlot(rendered.container, 'drawer'), 'panel') as HTMLElement,
		}
	}

	it('renders no handle unless asked, and a window splitter when asked', () => {
		const { container: plain } = renderUI(
			<Drawer open onOpenChange={() => {}} aria-label="Panel">
				<p>Body</p>
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
	})

	it('resizes on the arrow keys and never closes on them', async () => {
		const onOpenChange = vi.fn()

		const { handle, panel } = renderHandled({ onOpenChange })

		const user = userEvent.setup({ delay: null })

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

		const user = userEvent.setup({ delay: null })

		handle.focus()

		await user.keyboard('{ArrowUp}')

		rerender(
			<Drawer open={false} handle height="half" onOpenChange={() => {}} aria-label="Panel">
				<p>Body</p>
			</Drawer>,
		)

		rerender(
			<Drawer open handle height="half" onOpenChange={() => {}} aria-label="Panel">
				<p>Body</p>
			</Drawer>,
		)

		// Back at the size the consumer asked for, which is the one a reader coming
		// back to the panel expects.
		expect((present(bySlot(container, 'drawer'), 'panel') as HTMLElement).style.height).toBe('')
	})
})
