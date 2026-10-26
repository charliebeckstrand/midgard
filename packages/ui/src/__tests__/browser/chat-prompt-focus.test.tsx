import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatPrompt } from '../../modules/chat'
import { frames, renderUI, screen } from '../helpers'

/** A prompt whose send clears the draft and whose stop ends the stream, as `useChatDraft` and `useChatSend` do. */
function Harness({
	initial,
	streaming: initialStreaming,
}: {
	initial: string
	streaming: boolean
}) {
	const [value, setValue] = useState(initial)

	const [streaming, setStreaming] = useState(initialStreaming)

	return (
		<ChatPrompt
			value={value}
			onValueChange={setValue}
			onSubmit={() => setValue('')}
			onStop={() => setStreaming(false)}
			streaming={streaming}
		/>
	)
}

/**
 * The send button keeps the focus when a send or a stop empties the draft.
 *
 * Rides the real browser because jsdom does not move the focus off a button
 * that becomes `disabled`, which Chromium does.
 */
describe('the send button of a chat prompt (real browser)', () => {
	it('keeps the focus after a send empties the draft', async () => {
		renderUI(<Harness initial="hello" streaming={false} />)

		const send = screen.getByRole('button', { name: 'Send message' })

		await userEvent.click(send)

		await frames()

		expect(send).toHaveAttribute('aria-disabled', 'true')

		expect(document.activeElement).toBe(send)
	})

	it('keeps the focus after a stop ends the stream with an empty draft', async () => {
		renderUI(<Harness initial="" streaming />)

		await userEvent.click(screen.getByRole('button', { name: 'Stop generating' }))

		await frames()

		const send = screen.getByRole('button', { name: 'Send message' })

		expect(document.activeElement).toBe(send)
	})
})
