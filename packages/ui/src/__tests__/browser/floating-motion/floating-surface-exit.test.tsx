import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuSub, MenuTrigger } from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'

/**
 * A closed floating surface stays on screen for its exit, and `AnimatePresence`
 * keeps the subtree of the last open render. `FloatingSurface` makes the
 * surface `inert` for the exit and moves the focus out, as `Overlay` does. Thus
 * a row of a closing menu takes no second Enter, no arrow key, and no press.
 *
 * The real engine and real Motion are necessary. The instant Motion mock
 * removes the surface in the commit that closes it, so no exit occurs. The
 * mocked engine renders the surface inline, with no focus manager.
 *
 * Most closes go through `fireEvent`, which commits in the same task, so the
 * checks run inside the exit. A `userEvent` call is a round trip to the browser
 * process, and under load it can take more time than the exit.
 */
const motionCases = [
	{ reduced: false, name: 'the full exit' },
	{ reduced: true, name: 'the reduced exit' },
]

const row = (name: string) => screen.getByRole('menuitem', { name })

const focused = () => present(document.activeElement, 'the focused element')

/** Whether a press at the center of `element` lands on it or inside it. */
function hits(element: Element) {
	const at = getCenter(element)

	return element.contains(document.elementFromPoint(at.x, at.y))
}

/** Asserts that `panel` is still on screen, and that it takes no input. */
function expectExiting(panel: HTMLElement) {
	expect(panel).toBeInTheDocument()

	expect(panel.closest('[inert]')).not.toBeNull()

	expect(panel).not.toContainElement(focused())
}

const gone = (panel: HTMLElement) => waitFor(() => expect(panel).not.toBeInTheDocument())

function Motion({ reduced, children }: { reduced: boolean; children: ReactNode }) {
	return <ReducedMotionContext value={reduced}>{children}</ReducedMotionContext>
}

/** Opens a context menu with a right-click, and returns its panel. */
async function openContextMenu(onAction: (name: string) => void, reduced = false) {
	renderUI(
		<Motion reduced={reduced}>
			<Menu>
				<div data-testid="surface" style={{ width: 300, height: 200 }}>
					Surface
				</div>
				<MenuContent aria-label="Actions">
					<MenuItem onAction={() => onAction('Edit')}>Edit</MenuItem>
					<MenuItem onAction={() => onAction('Copy')}>Copy</MenuItem>
					<MenuSub label="More">
						<MenuItem onAction={() => onAction('Nested')}>Nested</MenuItem>
					</MenuSub>
				</MenuContent>
			</Menu>
		</Motion>,
	)

	const surface = screen.getByTestId('surface')

	const at = getCenter(surface)

	fireEvent.contextMenu(surface, { clientX: at.x, clientY: at.y })

	const panel = await screen.findByRole('menu', { name: 'Actions' })

	await waitFor(() => expect(row('Edit')).toBeVisible())

	return panel
}

/** Moves the pointer onto a row, which takes the cursor of its level. */
function hover(element: HTMLElement) {
	const at = getCenter(element)

	fireEvent.pointerMove(element, { clientX: at.x, clientY: at.y, pointerType: 'mouse' })
}

describe('a pointer-opened context menu in its exit (real engine, real Motion)', () => {
	it.each(motionCases)('takes no key and no press under $name', async ({ reduced }) => {
		const onAction = vi.fn()

		const panel = await openContextMenu(onAction, reduced)

		hover(row('Edit'))

		expect(row('Edit')).toHaveFocus()

		fireEvent.click(row('Edit'))

		expect(onAction).toHaveBeenCalledExactlyOnceWith('Edit')

		expectExiting(panel)

		// An arrow key goes to the focused element, and that is not a row.
		fireEvent.keyDown(focused(), { key: 'ArrowDown' })

		expect(panel).not.toContainElement(focused())

		// A press at a row lands on what lies under the panel.
		expect(hits(row('Copy'))).toBe(false)

		await gone(panel)

		expect(onAction).toHaveBeenCalledOnce()
	})

	it.each(motionCases)(
		'runs a row once for two quick Enter presses under $name',
		async ({ reduced }) => {
			const onAction = vi.fn()

			const panel = await openContextMenu(onAction, reduced)

			hover(row('Edit'))

			expect(row('Edit')).toHaveFocus()

			await userEvent.keyboard('{Enter}{Enter}')

			await gone(panel)

			expect(onAction).toHaveBeenCalledExactlyOnceWith('Edit')
		},
	)

	it('keeps the focus on the row the pointer moves to when a swept submenu closes', async () => {
		await openContextMenu(() => {})

		hover(row('More'))

		const submenu = await screen.findByRole('menu', { name: 'More' })

		await waitFor(() => expect(row('Nested')).toBeVisible())

		hover(row('Edit'))

		expectExiting(submenu)

		expect(row('Edit')).toHaveFocus()

		expect(row('Edit').closest('[inert]')).toBeNull()

		await gone(submenu)

		expect(row('Edit')).toHaveFocus()
	})

	it('puts the focus on the parent row when the back arrow closes a submenu', async () => {
		await openContextMenu(() => {})

		row('More').focus()

		fireEvent.keyDown(row('More'), { key: 'Enter' })

		const submenu = await screen.findByRole('menu', { name: 'More' })

		await waitFor(() => expect(row('Nested')).toHaveFocus())

		fireEvent.keyDown(row('Nested'), { key: 'ArrowLeft' })

		expectExiting(submenu)

		expect(row('More')).toHaveFocus()

		await gone(submenu)

		expect(row('More')).toHaveFocus()
	})

	// A row of the submenu closes the root, and the submenu closes with it. Its
	// own surface portals apart from the root, so it must go inert by itself.
	it.each(motionCases)(
		'runs a submenu row once for a double-click under $name',
		async ({ reduced }) => {
			const onAction = vi.fn()

			const panel = await openContextMenu(onAction, reduced)

			row('More').focus()

			fireEvent.keyDown(row('More'), { key: 'Enter' })

			const submenu = await screen.findByRole('menu', { name: 'More' })

			await waitFor(() => expect(row('Nested')).toHaveFocus())

			const nested = row('Nested')

			fireEvent.click(nested)

			expect(onAction).toHaveBeenCalledExactlyOnceWith('Nested')

			expectExiting(panel)

			expectExiting(submenu)

			expect(submenu.closest('[data-slot="floating-surface"]')).not.toHaveAttribute('data-open')

			// The second press of a double-click lands on what lies under the panel.
			expect(hits(nested)).toBe(false)

			await gone(submenu)

			expect(onAction).toHaveBeenCalledOnce()
		},
	)
})

describe('a dropdown menu in its exit (real engine, real Motion)', () => {
	it('keeps the focus on the trigger, and the rows take no press', async () => {
		const onEdit = vi.fn()

		renderUI(
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem onAction={onEdit}>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		trigger.focus()

		await userEvent.click(trigger)

		const panel = await screen.findByRole('menu')

		await waitFor(() => expect(row('Edit')).toBeVisible())

		fireEvent.keyDown(trigger, { key: 'ArrowDown' })

		expect(row('Edit')).toHaveAttribute('data-active')

		fireEvent.keyDown(trigger, { key: 'Enter' })

		expect(onEdit).toHaveBeenCalledOnce()

		expectExiting(panel)

		expect(trigger).toHaveFocus()

		expect(hits(row('Duplicate'))).toBe(false)

		await gone(panel)

		expect(trigger).toHaveFocus()
	})
})

describe('a surface that holds the focus in its exit (real engine, real Motion)', () => {
	// `useFloatingPanel` returns the focus to the trigger in an effect. The move
	// out of the panel runs before it, so the two do not compete.
	it('puts the focus on the Popover trigger when Escape closes it from inside', async () => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>
				<PopoverContent aria-label="Details" autoFocus>
					<button type="button">Inside</button>
				</PopoverContent>
			</Popover>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		const panel = await screen.findByRole('dialog', { name: 'Details' })

		const inside = screen.getByRole('button', { name: 'Inside' })

		inside.focus()

		expect(inside).toHaveFocus()

		fireEvent.keyDown(inside, { key: 'Escape' })

		expectExiting(panel)

		expect(trigger).toHaveFocus()

		await gone(panel)

		expect(trigger).toHaveFocus()
	})

	// The focus manager of an interactive Tooltip returns the focus at unmount,
	// after the exit. The move out of the panel does not cancel that return.
	it('puts the focus on the Tooltip trigger when Escape closes it from inside', async () => {
		renderUI(
			<Tooltip delay={0} interactive>
				<TooltipTrigger>
					<button type="button">Details</button>
				</TooltipTrigger>
				<TooltipContent>
					<button type="button">Undo</button>
				</TooltipContent>
			</Tooltip>,
		)

		await userEvent.keyboard('{Tab}')

		const trigger = screen.getByRole('button', { name: 'Details' })

		await waitFor(() => expect(trigger).toHaveFocus())

		const panel = await screen.findByRole('dialog', { name: 'Details' })

		await userEvent.keyboard('{Tab}')

		const undo = screen.getByRole('button', { name: 'Undo' })

		await waitFor(() => expect(undo).toHaveFocus())

		fireEvent.keyDown(undo, { key: 'Escape' })

		expectExiting(panel)

		await gone(panel)

		await waitFor(() => expect(trigger).toHaveFocus())
	})
})
