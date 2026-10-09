import { describe, expect, it } from 'vitest'
import { ChatPrompt } from '../../modules/chat'
import { getSlot, noop, renderUI, screen } from '../helpers'

const name = `${'long-attachment-name-'.repeat(12)}.pdf`

/**
 * A chip with a long file name stays inside a narrow prompt and ends the name
 * with an ellipsis, as a TagInput chip does.
 *
 * Rides the real browser because the claim is a layout one: jsdom has no
 * layout.
 */
describe('a chat attachment chip with a long name (real browser)', () => {
	it('truncates the name inside a narrow prompt', () => {
		const file = new File(['a'], name, { type: 'application/pdf' })

		const { container } = renderUI(
			<div style={{ width: 240 }}>
				<ChatPrompt
					value=""
					onValueChange={noop}
					onSubmit={noop}
					attachments={[file]}
					onRemoveAttachment={noop}
				/>
			</div>,
		)

		const list = getSlot(container, 'chat-prompt-attachments')

		const label = screen.getByText(name)

		const button = screen.getByRole('button', { name: `Remove ${name}` })

		const row = list.getBoundingClientRect()

		expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)

		expect(getComputedStyle(label).textOverflow).toBe('ellipsis')

		expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(row.right)
	})
})
