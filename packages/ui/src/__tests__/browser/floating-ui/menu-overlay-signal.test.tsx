import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A floating disclosure that opens sends the overlay signal, and an open tooltip
 * closes on it. A dropdown keeps the focus on its trigger, so a tooltip that a
 * keyboard focus opened on that trigger stays open unless the menu sends the
 * signal. The tooltip then shows over the open menu. The test opens each
 * disclosure from the keyboard, as a reader does.
 *
 * It runs in a real browser, because the tooltip opens on `:focus-visible`,
 * which jsdom does not match.
 */
describe('a disclosure that opens closes a tooltip (real browser)', () => {
	async function focusTrigger() {
		await userEvent.keyboard('{Tab}')

		await screen.findByRole('tooltip')
	}

	it('closes on a menu that opens', async () => {
		renderUI(
			<Menu placement="bottom-start">
				<Tooltip>
					<TooltipTrigger>
						<MenuTrigger>
							<Button>Actions</Button>
						</MenuTrigger>
					</TooltipTrigger>
					<TooltipContent>More actions</TooltipContent>
				</Tooltip>
				<MenuContent>
					<MenuItem>Edit</MenuItem>
				</MenuContent>
			</Menu>,
		)

		await focusTrigger()

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('menu')

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})

	it('closes on a popover that opens', async () => {
		renderUI(
			<Popover>
				<Tooltip>
					<TooltipTrigger>
						<PopoverTrigger>
							<Button>Filters</Button>
						</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent>Show the filters</TooltipContent>
				</Tooltip>
				<PopoverContent aria-label="Filters">Body</PopoverContent>
			</Popover>,
		)

		await focusTrigger()

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('dialog')

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
