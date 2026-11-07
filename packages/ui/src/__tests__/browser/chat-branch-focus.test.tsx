import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatTranscript, type ChatTransport, useChatSend } from '../../modules/chat'
import { act, renderUI, screen, within } from '../helpers'

/** A transport that numbers each reply, so each branch reads apart from the others. */
function numbered(): ChatTransport {
	let count = 0

	return () => {
		count += 1

		const text = `Reply ${count}`

		return (async function* () {
			yield text
		})()
	}
}

const transport = numbered()

/** A chat with one question and its reply, and a retry the test calls. */
function Chat({ onReady }: { onReady: (retry: () => Promise<void>) => void }) {
	const chat = useChatSend({
		transport,
		initialMessages: [
			{ id: 'u1', sender: 'user', content: 'How are late stops trending?' },
			{ id: 'r0', sender: 'assistant', content: 'Reply 0' },
		],
	})

	onReady(chat.retry)

	return (
		<div style={{ height: 400, display: 'flex' }}>
			<ChatTranscript
				messages={chat.messages}
				streaming={chat.streaming}
				branches={chat.branches}
				onBranchChange={chat.showBranch}
			/>
		</div>
	)
}

/**
 * The switcher of a message keeps the focus across a switch, and at each end.
 *
 * Rides the real browser because Chromium moves the focus to the body when a
 * focused element leaves the page or turns `disabled`, and jsdom does not. The
 * row of each branch keeps one key, so the switch keeps the button. The button
 * at an end is `aria-disabled` and not `disabled`, so it keeps the focus too.
 */
describe('the branch switcher of a chat message (real browser)', () => {
	it('keeps the focus on its button through each switch', async () => {
		let retry!: () => Promise<void>

		renderUI(
			<Chat
				onReady={(next) => {
					retry = next
				}}
			/>,
		)

		await act(() => retry())

		// The live region also speaks a settled reply, so each query reads the transcript.
		const transcript = within(screen.getByRole('log'))

		await transcript.findByText('Reply 1')

		const previous = screen.getByRole('button', { name: 'Previous version' })

		previous.focus()

		await userEvent.keyboard('{Enter}')

		await transcript.findByText('Reply 0')

		expect(screen.getByRole('group', { name: 'Versions' })).toHaveTextContent('1 of 2')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous version' }))

		expect(screen.getByRole('button', { name: 'Previous version' })).toHaveAttribute(
			'aria-disabled',
			'true',
		)

		await userEvent.keyboard('{Tab}{Enter}')

		await transcript.findByText('Reply 1')

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next version' }))
	})
})
