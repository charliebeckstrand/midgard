import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Interactive-Tooltip focus trap against the real floating engine. The jsdom
 * and main browser suites mock `@floating-ui/react`, so the guards, the
 * `markOthers` pass, and the reference-first Tab cycle only run here; real
 * keystrokes are required, as testing-library simulation strands focus on a
 * guard sentinel.
 *
 * The contract: an `interactive` panel holding something tabbable contains Tab
 * (WCAG 2.1.2) across the trigger and its own controls, and restores focus to
 * the trigger when dismissed from inside. A panel with nothing to reach — and
 * any non-`interactive` panel, whose contents the pointer can't even hit —
 * leaves the tab order alone.
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

describe('Tooltip focus trap (real browser)', () => {
	it('cycles Tab across the trigger and the panel controls', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
				<button type="button">Dismiss</button>
			</Harness>,
		)

		// Captured before the trap marks it: `markOthers` aria-hides it, which
		// puts it out of reach of a default `getByRole`.
		const after = screen.getByRole('button', { name: 'After' })

		const trigger = await openByKeyboard()

		const undo = await screen.findByRole('button', { name: 'Undo' })

		const dismiss = screen.getByRole('button', { name: 'Dismiss' })

		// The probe engages the trap a commit after the panel mounts; the
		// aria-hidden sweep over outside content is that commit landing.
		await waitFor(() => expect(after).toHaveAttribute('aria-hidden', 'true'))

		// The trigger stays in the cycle, so it keeps the accessible name and
		// the `aria-describedby` pointing at the panel it opened.
		expect(trigger).not.toHaveAttribute('aria-hidden')

		// Tab steps off the trigger into the panel rather than on to `After`.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(dismiss).toHaveFocus())

		// Past the last control, the cycle wraps back to the trigger.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(trigger).toHaveFocus())

		// …and backward from the trigger lands on the last control.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(dismiss).toHaveFocus())
	})

	it('restores focus to the trigger when dismissed from inside', async () => {
		renderUI(
			<Harness>
				<button type="button">Undo</button>
			</Harness>,
		)

		const after = screen.getByRole('button', { name: 'After' })

		const trigger = await openByKeyboard()

		const undo = await screen.findByRole('button', { name: 'Undo' })

		await waitFor(() => expect(after).toHaveAttribute('aria-hidden', 'true'))

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(undo).toHaveFocus())

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull())

		// Focus can't be left on the panel that just left the DOM.
		await waitFor(() => expect(trigger).toHaveFocus())

		expect(after).not.toHaveAttribute('aria-hidden')
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
