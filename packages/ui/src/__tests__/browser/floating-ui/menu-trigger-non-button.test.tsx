import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * Keyboard activation of a `MenuTrigger` wrapping a non-button child.
 *
 * `MenuTrigger` clones an arbitrary child element and opens the menu from
 * `onClick` alone. `handleTriggerKeyDown` never opens: on Enter/Space it arms
 * the auto-repeat guard and delegates to `rovingKeyDown`, which no-ops while the
 * panel is unmounted. A native `<button>` is carried by the browser, which
 * synthesizes a click from Enter and from Space-on-keyup, so the default path
 * works and hides the gap. Any other element gets no synthesized click, so the
 * menu cannot be opened from the keyboard at all.
 *
 * `useClick`'s `keyboardHandlers` covers exactly this: its `onKeyDown`/`onKeyUp`
 * bail through `isButtonTarget(event)` precisely because native buttons need no
 * help. `Popover` already routes through `useClick`; `Menu` does not.
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

	/** Focuses the rendered trigger, presses `key`, and resolves once the menu is up. */
	const opensFrom = vi.defineHelper(async (trigger: React.ReactElement, key: string) => {
		renderUI(tree(trigger))

		screen.getByTestId('trigger').focus()

		await userEvent.keyboard(key)

		await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument())
	})

	it.for<[string, React.ReactElement, string]>([
		['Enter on a native button (the covered path)', nativeButton, '{Enter}'],
		['Enter on a focusable non-button child', nonButton, '{Enter}'],
		['Space on a focusable non-button child', nonButton, ' '],
	])('opens from %s', async ([, trigger, key]) => {
		await opensFrom(trigger, key)
	})
})
