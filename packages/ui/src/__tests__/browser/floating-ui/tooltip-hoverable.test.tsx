import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { renderUI, screen, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/**
 * The pointer can move from the trigger onto the content of a hover tooltip,
 * and the content stays (WCAG 2.2 SC 1.4.13). A reader under a screen
 * magnifier moves onto the text to read it. The tooltip is not `interactive`,
 * so the panel takes the pointer with no focus management.
 *
 * It runs in a real browser, because the test reads the hover of the real
 * floating engine, which the jsdom suites mock.
 */
describe('the content of a hover tooltip (real browser)', () => {
	function render() {
		renderUI(
			<div className="flex flex-col items-start gap-40 p-10">
				<Tooltip delay={0} placement="bottom">
					<TooltipTrigger>
						<Button>Rotate</Button>
					</TooltipTrigger>
					<TooltipContent>Turn the page a quarter turn to the right</TooltipContent>
				</Tooltip>
				<p>Away</p>
			</div>,
		)

		return screen.getByRole('button', { name: 'Rotate' })
	}

	it('stays open while the pointer rests on it', async () => {
		await userEvent.hover(render())

		const panel = await screen.findByRole('tooltip')

		await userEvent.hover(panel)

		// The close delay of a hover is 100 ms. The hold outlasts it.
		await pause(400)

		expect(screen.getByRole('tooltip')).toBeInTheDocument()
	})

	it('closes when the pointer leaves the trigger and the content', async () => {
		await userEvent.hover(render())

		const panel = await screen.findByRole('tooltip')

		await userEvent.hover(panel)

		await userEvent.hover(screen.getByText('Away'))

		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
