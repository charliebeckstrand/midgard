import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatMessage } from '../../modules/chat'
import { frames, getSlot, renderUI, screen, stubClipboard } from '../helpers'

/** A menu with an item after Copy, so the toolbar shows the menu button. */
const MENU = { items: [{ key: 'edit', label: 'Edit' }] }

/**
 * Copy moves the focus to the bubble. The hover toolbar thus goes when the
 * pointer leaves, and the next Tab goes to the button in the toolbar again.
 *
 * Rides the real browser because jsdom has no `:focus-visible` and no hover.
 */
describe('the focus after a copy from a chat message (real browser)', () => {
	it('goes to the bubble from the Copy button, so the toolbar goes when the pointer leaves', async () => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		// The padding keeps room for the toolbar above the bubble.
		const { container } = renderUI(
			<div className="p-16">
				<ChatMessage>Heading out now.</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		const toolbar = getSlot(container, 'chat-message-toolbar')

		const copy = screen.getByRole('button', { name: 'Copy' })

		await userEvent.hover(bubble)

		await userEvent.click(copy)

		await frames()

		// The focus that the pointer gave shows no ring.
		expect(document.activeElement).toBe(bubble)

		expect(bubble.matches(':focus-visible')).toBe(false)

		await userEvent.unhover(bubble)

		await expect.poll(() => getComputedStyle(toolbar).opacity).toBe('0')

		await userEvent.tab()

		expect(document.activeElement).toBe(copy)

		await expect.poll(() => getComputedStyle(toolbar).opacity).toBe('1')
	})

	it('goes to the bubble from the menu, and not back to the menu button', async () => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		const { container } = renderUI(
			<div className="p-16">
				<ChatMessage contextMenu={MENU}>Heading out now.</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		const toolbar = getSlot(container, 'chat-message-toolbar')

		const button = screen.getByRole('button', { name: 'Message actions' })

		await userEvent.hover(bubble)

		await userEvent.click(button)

		await userEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))

		await frames()

		expect(document.activeElement).toBe(bubble)

		expect(bubble.matches(':focus-visible')).toBe(false)

		await userEvent.unhover(bubble)

		await expect.poll(() => getComputedStyle(toolbar).opacity).toBe('0')

		await userEvent.tab()

		expect(document.activeElement).toBe(button)
	})

	it('goes to the bubble with a ring after a copy from the keyboard', async () => {
		stubClipboard({ writeText: vi.fn(() => Promise.resolve()) })

		const { container } = renderUI(
			<div className="p-16">
				<ChatMessage>Heading out now.</ChatMessage>
			</div>,
		)

		const bubble = getSlot(container, 'chat-message-bubble')

		await userEvent.tab()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Copy' }))

		await userEvent.keyboard('{Enter}')

		await frames()

		expect(document.activeElement).toBe(bubble)

		expect(bubble.matches(':focus-visible')).toBe(true)

		expect(getComputedStyle(bubble).outlineStyle).toBe('solid')
	})
})
