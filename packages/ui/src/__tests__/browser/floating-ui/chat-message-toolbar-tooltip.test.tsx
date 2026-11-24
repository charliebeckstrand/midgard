import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatMessage } from '../../../modules/chat'
import { getSlot, renderUI, screen } from '../../helpers'

/** A menu with Retry after Copy, so the toolbar shows two icon buttons. */
const MENU = { items: [{ key: 'retry', label: 'Retry', icon: <svg /> }] }

/**
 * The tooltip of a button in the toolbar of a chat message portals out of the
 * message. A hover on the tooltip is thus no hover on the bubble or on the
 * toolbar, and the open tooltip holds the toolbar. The reader can move onto the
 * tooltip (WCAG 2.2 SC 1.4.13), and the toolbar and the tooltip go together.
 *
 * It runs in a real browser, because the test reads the hover of the real
 * floating engine and the computed opacity of the toolbar.
 */
describe('the tooltips of the toolbar of a chat message (real browser)', () => {
	it('holds the toolbar while the pointer rests on a tooltip, and both go together', async () => {
		// The padding keeps room for the toolbar and its tooltip above the bubble.
		const { container } = renderUI(
			<div className="flex flex-col items-start gap-20 p-24">
				<ChatMessage contextMenu={MENU}>Heading out now.</ChatMessage>
				<p>Away</p>
			</div>,
		)

		const toolbar = getSlot(container, 'chat-message-toolbar')

		const opacity = () => getComputedStyle(toolbar).opacity

		await userEvent.hover(getSlot(container, 'chat-message-bubble'))

		await userEvent.hover(screen.getByRole('button', { name: 'Retry' }))

		const tooltip = await screen.findByRole('tooltip')

		expect(tooltip).toHaveTextContent('Retry')

		await userEvent.hover(tooltip)

		// The pointer is on the tooltip alone, and the toolbar stays.
		expect(toolbar.matches(':hover')).toBe(false)

		expect(screen.getByRole('tooltip')).toBe(tooltip)

		expect(opacity()).toBe('1')

		await userEvent.hover(screen.getByText('Away'))

		await expect.poll(() => screen.queryByRole('tooltip')).toBeNull()

		await expect.poll(opacity).toBe('0')
	})
})
