import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * A non-modal Popover: Tab from the trigger moves into the panel, and Tab
 * from the last control in the panel moves on to the control after the trigger.
 */
describe('a non-modal Popover (real floating engine)', () => {
	it('puts the panel in the tab order right after the trigger', async () => {
		renderUI(
			<>
				<Popover>
					<PopoverTrigger>
						<Button>Open</Button>
					</PopoverTrigger>

					<PopoverContent aria-label="Details">
						<button type="button">Inside</button>
					</PopoverContent>
				</Popover>

				<Button>After</Button>
			</>,
		)

		const trigger = screen.getByRole('button', { name: 'Open' })

		await userEvent.click(trigger)

		await screen.findByRole('dialog')

		await frames()

		await waitFor(() => expect(trigger).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus())

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(screen.getByRole('button', { name: 'After' })).toHaveFocus())
	})
})
