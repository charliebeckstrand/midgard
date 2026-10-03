import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Focus order of an interactive Tooltip against the real floating engine. The
 * jsdom suite and the main browser suite mock `@floating-ui/react`. Thus the
 * portal guards and the focus manager run only here. The tests use real key
 * presses, because a testing-library simulation leaves focus on a guard.
 *
 * The contract: an `interactive` panel that holds a tabbable control is a
 * non-modal dialog. Tab goes from the trigger into the panel controls, and Tab
 * after the last control goes to the element after the trigger. Shift+Tab goes
 * back the same way. Focus does not stay in the panel, and the page stays
 * visible to assistive tech. When the tooltip closes from inside the panel,
 * focus goes back to the trigger. A panel with no tabbable control, and a
 * panel that is not `interactive`, add nothing to the tab order.
 */

function Harness({ interactive = true, children }: { interactive?: boolean; children: ReactNode }) {
	return (
		<>
			<Tooltip delay={0} interactive={interactive}>
				<TooltipTrigger>
					<button type="button">Details</button>
				</TooltipTrigger>
				<TooltipContent>{children}</TooltipContent>
			</Tooltip>
			<button type="button">After</button>
		</>
	)
}

/** Tabs to the trigger, opening the tooltip on focus, and returns it. @internal */
async function openByKeyboard() {
	await userEvent.keyboard('{Tab}')

	const trigger = screen.getByRole('button', { name: 'Details' })

	await waitFor(() => expect(trigger).toHaveFocus())

	return trigger
}

describe('Tooltip focus order (real browser)', () => {
	it('puts the panel controls in the tab order after the trigger', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
				<button type="button">Dismiss</button>
			</Harness>,
		)

		const after = screen.getByRole('button', { name: 'After' })

		const trigger = await openByKeyboard()

		const undo = await screen.findByRole('button', { name: 'Undo' })

		const dismiss = screen.getByRole('button', { name: 'Dismiss' })

		// The focus manager starts a commit after the panel mounts, when the role
		// changes to dialog.
		await screen.findByRole('dialog', { name: 'Details' })

		// Tab goes from the trigger into the panel, not to `After`.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(dismiss).toHaveFocus())

		// Shift+Tab goes back through the panel to the trigger.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(trigger).toHaveFocus())

		// After the last control, Tab goes on to the element after the trigger.
		// It does not go back to the trigger.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(dismiss).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(after).toHaveFocus())
	})

	it('keeps the page visible to assistive tech while the dialog is open', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
			</Harness>,
		)

		const after = screen.getByRole('button', { name: 'After' })

		const trigger = await openByKeyboard()

		const panel = await screen.findByRole('dialog', { name: 'Details' })

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus())

		// A non-modal dialog hides nothing outside it, and has no `aria-modal`.
		expect(panel).not.toHaveAttribute('aria-modal')

		expect(after).not.toHaveAttribute('aria-hidden')

		expect(trigger).not.toHaveAttribute('aria-hidden')

		// Floating-ui adds empty `aria-hidden` sentinels that keep the tab order.
		// They hide no content. A modal manager hides the page itself, so the
		// check looks for a hidden element that holds content.
		const hidden = [...document.querySelectorAll('[aria-hidden="true"]')].filter(
			(node) => !node.closest('svg') && node.childNodes.length > 0,
		)

		expect(hidden).toEqual([])

		expect(document.querySelectorAll('[inert]')).toHaveLength(0)
	})

	it('puts focus back on the trigger when the tooltip closes from inside', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
			</Harness>,
		)

		const trigger = await openByKeyboard()

		const undo = await screen.findByRole('button', { name: 'Undo' })

		await screen.findByRole('dialog', { name: 'Details' })

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull())

		// Focus cannot stay on a panel that is no longer in the DOM.
		await waitFor(() => expect(trigger).toHaveFocus())
	})

	it('leaves the tab order alone for a panel with nothing tabbable', async () => {
		renderUI(
			<Harness>
				<span>Last edited 3 minutes ago</span>
			</Harness>,
		)

		const after = screen.getByRole('button', { name: 'After' })

		await openByKeyboard()

		await screen.findByText('Last edited 3 minutes ago')

		// Prose the pointer can reach is not a keyboard surface; Tab moves on.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(after).toHaveFocus())

		expect(after).not.toHaveAttribute('aria-hidden')
	})

	it('leaves the tab order alone for a non-interactive panel', async () => {
		renderUI(
			<Harness interactive={false}>
				<button type="button">Undo</button>
			</Harness>,
		)

		const after = screen.getByRole('button', { name: 'After' })

		await openByKeyboard()

		await screen.findByRole('button', { name: 'Undo' })

		// A panel the pointer passes through never claims the keyboard either,
		// tabbable contents or not.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(after).toHaveFocus())

		expect(after).not.toHaveAttribute('aria-hidden')
	})
})

describe('Tooltip role (real browser)', () => {
	it('makes an interactive panel with a control a dialog that the trigger names', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
			</Harness>,
		)

		const trigger = await openByKeyboard()

		await screen.findByRole('button', { name: 'Undo' })

		// The probe finds the control a commit after the panel mounts, and the
		// role follows it. A non-modal dialog carries no `aria-modal`.
		const panel = await screen.findByRole('dialog', { name: 'Details' })

		expect(panel).not.toHaveAttribute('aria-modal')

		expect(screen.queryByRole('tooltip')).toBeNull()

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		expect(trigger).toHaveAttribute('aria-controls', panel.id)

		expect(trigger).not.toHaveAttribute('aria-describedby')

		expect(panel).toHaveAttribute('aria-labelledby', trigger.id)
	})

	it('names the dialog through the trigger id that the consumer gives', async () => {
		renderUI(
			<Tooltip delay={0} interactive>
				<TooltipTrigger>
					<button type="button" id="own-trigger">
						Details
					</button>
				</TooltipTrigger>
				<TooltipContent>
					<button type="button">Undo</button>
				</TooltipContent>
			</Tooltip>,
		)

		const trigger = await openByKeyboard()

		expect(trigger).toHaveAttribute('id', 'own-trigger')

		const panel = await screen.findByRole('dialog', { name: 'Details' })

		expect(panel).toHaveAttribute('aria-labelledby', 'own-trigger')
	})

	it.each([
		['an interactive panel with prose only', true, <span key="p">Last edited</span>],
		[
			'a non-interactive panel',
			false,
			<button key="b" type="button">
				Undo
			</button>,
		],
	])('keeps the tooltip role for %s', async (_, interactive, content) => {
		renderUI(<Harness interactive={interactive}>{content}</Harness>)

		const trigger = await openByKeyboard()

		const panel = await screen.findByRole('tooltip')

		expect(screen.queryByRole('dialog')).toBeNull()

		expect(trigger).toHaveAttribute('aria-describedby', panel.id)

		expect(trigger).not.toHaveAttribute('aria-haspopup')
	})
})
