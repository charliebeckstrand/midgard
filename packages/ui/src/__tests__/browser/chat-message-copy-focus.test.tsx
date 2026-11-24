import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatMessage } from '../../modules/chat'
import { frames, getSlot, renderUI, screen, stubClipboard } from '../helpers'

/**
 * The Copy item of the menu of a chat message moves the focus to the bubble.
 * The hover toolbar thus goes when the pointer leaves, and the next Tab goes
 * to the menu button again.
 *
 * Rides the real browser because jsdom has no `:focus-visible` and no hover.
 */
describe('the focus after a copy from a chat message (real browser)', () => {
	it('goes to the bubble, so the toolbar goes when the pointer leaves', async () => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		// The padding keeps room for the toolbar above the bubble.
		const { container } = renderUI(
			<div className="p-16">
				<ChatMessage>Heading out now.</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		const toolbar = getSlot(container, 'chat-message-toolbar')

		const button = screen.getByRole('button', { name: 'Message actions' })

		await userEvent.hover(bubble)

		await userEvent.click(button)

		await userEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))

		await frames()

		// The focus that the pointer gave shows no ring.
		expect(document.activeElement).toBe(bubble)

		expect(bubble.matches(':focus-visible')).toBe(false)

		await userEvent.unhover(bubble)

		await expect.poll(() => getComputedStyle(toolbar).opacity).toBe('0')

		await userEvent.tab()

		expect(document.activeElement).toBe(button)

		await expect.poll(() => getComputedStyle(toolbar).opacity).toBe('1')
	})

	it('goes to the bubble with a ring after a copy from the keyboard', async () => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		const { container } = renderUI(
			<div className="p-16">
				<ChatMessage>Heading out now.</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		await userEvent.click(screen.getByRole('button', { name: 'Message actions' }))

		// The pointer opens the menu with the focus on the panel. ArrowDown goes to
		// the first row, Copy, and Enter picks it.
		await userEvent.keyboard('{ArrowDown}')

		await expect.poll(() => document.activeElement?.getAttribute('role')).toBe('menuitem')

		await userEvent.keyboard('{Enter}')

		await frames()

		expect(document.activeElement).toBe(bubble)

		expect(bubble.matches(':focus-visible')).toBe(true)

		expect(getComputedStyle(bubble).outlineStyle).toBe('solid')
	})
})
