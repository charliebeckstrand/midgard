import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatList, ChatListItem } from '../../../modules/chat'
import { getSlot, noop, renderUI, screen } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The truncation reveal of a ChatListItem title (WCAG 1.4.10, 1.4.4). A narrow
 * list cuts a long title to one line, so the row shows the full title in a
 * tooltip on a hover of the row and on a keyboard focus of its select button.
 * The select button stretches its hit area over the row, so the pointer is on
 * the button, not on the title. The jsdom suite sees no overflow and mocks
 * `@floating-ui/react`, so the reveal shows only here.
 */
describe('chat list title truncation tooltip (real browser)', () => {
	const LONG = 'Late stops on the north route after the storm'

	function Conversations() {
		return (
			<>
				<button type="button">before</button>

				<div style={{ width: 200 }}>
					<ChatList aria-label="Conversations">
						<ChatListItem title={LONG} preview="The driver called" onSelect={noop} />
						<ChatListItem title="Kickoff" onSelect={noop} />
					</ChatList>
				</div>
			</>
		)
	}

	it('shows the full title in a tooltip on a hover of a cut row', async () => {
		const { container } = renderUI(<Conversations />)

		await userEvent.hover(getSlot(container, 'chat-list-item-select'))

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)
	})

	it('shows the full title when the keyboard focuses the select button of a cut row', async () => {
		renderUI(<Conversations />)

		const before = screen.getByRole('button', { name: 'before' })

		// The pointer rests away from the list, so a hover cannot open the tooltip.
		await userEvent.hover(before)

		// A real Tab, not `focus()`. The tooltip opens on a focus that matches
		// `:focus-visible`, and an earlier test can leave a pointer input.
		before.focus()

		await userEvent.tab()

		const select = screen.getByRole('button', { name: new RegExp(`^${LONG}`) })

		expect(document.activeElement).toBe(select)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		// The title names the button, so the reveal adds no description.
		expect(select).not.toHaveAttribute('aria-describedby')
	})

	it('opens no tooltip on a row whose title fits', async () => {
		const { container } = renderUI(<Conversations />)

		const rows = container.querySelectorAll<HTMLElement>('[data-slot="chat-list-item-select"]')

		await userEvent.hover(rows[1] as HTMLElement)

		expect(await tooltipAfterHover()).toBeNull()
	})
})
