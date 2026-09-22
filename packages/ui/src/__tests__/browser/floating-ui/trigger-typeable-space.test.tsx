import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { frames, renderUI, screen } from '../../helpers'

/**
 * Space on a typeable trigger, before the first open.
 *
 * `useClick` reads the reference node on each key event: a Space press on a
 * typeable reference types a space and opens nothing. Both triggers hold their
 * reference back until the first open, so a typeable child must register at
 * mount, or the check reads `null` and the press opens the panel instead.
 */
describe('a typeable trigger keeps Space (real floating engine)', () => {
	const input = <input aria-label="Filter" data-testid="trigger" />

	/** Focuses the trigger, presses Space, and settles the keyup's commit. */
	async function pressSpace(tree: ReactElement): Promise<HTMLInputElement> {
		renderUI(tree)

		const trigger = screen.getByTestId<HTMLInputElement>('trigger')

		trigger.focus()

		await userEvent.keyboard(' ')

		await frames()

		return trigger
	}

	it('types a space into a Popover trigger and leaves the panel shut', async () => {
		const trigger = await pressSpace(
			<Popover>
				<PopoverTrigger>{input}</PopoverTrigger>
				<PopoverContent>Panel</PopoverContent>
			</Popover>,
		)

		expect(trigger).toHaveValue(' ')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByText('Panel')).not.toBeInTheDocument()
	})

	it('types a space into a Menu trigger and leaves the menu shut', async () => {
		const trigger = await pressSpace(
			<Menu placement="bottom-start">
				<MenuTrigger>{input}</MenuTrigger>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		expect(trigger).toHaveValue(' ')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(screen.queryByRole('menu')).not.toBeInTheDocument()
	})
})
