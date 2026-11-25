import type { ChatActionPart, ChatPart, ChatTransport } from 'ui/chat'

/** Waits `ms`. The send races each wait against its stop, so the wait needs no signal. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transport that answers an ask with a revision of the message that holds
 * it, and opens no reply of its own. `revise` gives the parts that change,
 * from the answered ask. A real transport sends the result to the agent, such
 * as the tool result of the next run of an AG-UI agent.
 */
export function revisingTransport(revise: (action: ChatActionPart) => ChatPart[]): ChatTransport {
	return async function* (_content, _signal, message) {
		if (!message.action) return

		const { messageId, part } = message.action

		await wait(700)

		yield { revise: messageId, parts: revise(part) }
	}
}
