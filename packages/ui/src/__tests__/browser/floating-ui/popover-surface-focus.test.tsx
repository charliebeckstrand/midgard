import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * The floating element of a panel takes the focus on a press on the padding
 * of the panel, because the focus manager makes it focusable. On a visible
 * focus it draws the focus ring of the package, not the ring of the user
 * agent, which WebKit draws on such a focus.
 */
describe('the floating surface of a Popover (real floating engine)', () => {
	it('draws the focus ring of the package on a visible focus', async () => {
		renderUI(
			<Popover>
				<PopoverTrigger>
					<Button>Open</Button>
				</PopoverTrigger>

				<PopoverContent aria-label="Details">
					<button type="button">Inside</button>
				</PopoverContent>
			</Popover>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		await screen.findByRole('dialog')

		await frames()

		const surface = document.querySelector<HTMLElement>('[data-slot="floating-surface"]')

		if (!surface) throw new Error('expected the floating surface')

		surface.focus({ focusVisible: true } as FocusOptions)

		await waitFor(() => expect(surface).toHaveFocus())

		expect(surface.matches(':focus-visible')).toBe(true)

		const style = getComputedStyle(surface)

		expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual([
			'solid',
			'2px',
			'2px',
		])
	})
})
