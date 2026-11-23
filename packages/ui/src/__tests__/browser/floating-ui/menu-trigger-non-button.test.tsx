import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Keyboard activation of a `MenuTrigger` wrapping a non-button child.
 *
 * The browser clicks a native `<button>` on Enter, and on the keyup of Space.
 * It gives no click to other elements, such as a `<div role="button">`. The
 * trigger clicks such an element itself on Enter, and `useClick` opens it on
 * Space. A key open moves the focus to the first row before the default action
 * of the key runs, so the trigger cancels the Enter. If it did not, the Enter
 * would click the first row and close the menu.
 */
describe('MenuTrigger keyboard activation (real floating engine)', () => {
	function tree(trigger: React.ReactElement) {
		return (
			<Menu placement="bottom-start">
				<MenuTrigger>{trigger}</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
					<MenuItem>Duplicate</MenuItem>
				</MenuContent>
			</Menu>
		)
	}

	/** A trigger that the browser gives a synthesized click. */
	const nativeButton = (
		<button type="button" data-testid="trigger">
			Open
		</button>
	)

	/** A trigger shape `cloneElement` accepts and the browser gives no synthesized click for. */
	const nonButton = (
		// biome-ignore lint/a11y/useSemanticElements: the non-semantic trigger is the subject under test
		<div role="button" tabIndex={0} data-testid="trigger">
			Open
		</div>
	)

	/** Focuses the rendered trigger, presses `key`, and resolves once the first row has the focus. */
	const opensFrom = vi.defineHelper(async (trigger: React.ReactElement, key: string) => {
		renderUI(tree(trigger))

		screen.getByTestId('trigger').focus()

		await userEvent.keyboard(key)

		await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus())

		expect(screen.getByRole('menu')).toBeInTheDocument()
	})

	it.for<[string, React.ReactElement, string]>([
		['Enter on a native button (the covered path)', nativeButton, '{Enter}'],
		['Enter on a focusable non-button child', nonButton, '{Enter}'],
		['Space on a focusable non-button child', nonButton, ' '],
	])('opens from %s', async ([, trigger, key]) => {
		await opensFrom(trigger, key)
	})
})
