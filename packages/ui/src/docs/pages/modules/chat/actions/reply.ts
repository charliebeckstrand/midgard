import {
	type ChatActionPart,
	type ChatActionResult,
	type ChatAgUiEvent,
	type ChatAgUiToolMessage,
	type ChatMessageData,
	type ChatTransport,
	fromAgUiEvents,
	toAgUiToolMessage,
} from 'ui/chat'

/** The name of the tool that asks the reader, as the agent declares it. */
const TOOL = 'ask_reader'

/** Waits `ms`. The send races each wait against its stop, so the wait needs no signal. */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** The new text of a line of an earlier message, by the id of its text part. */
type Revision = { id: string; text: string }

/**
 * A fake AG-UI agent. It answers the tool message of an ask with a run whose
 * snapshot changes one line of the message that asked.
 */
async function* run(tool: ChatAgUiToolMessage, revision: Revision): AsyncGenerator<ChatAgUiEvent> {
	await wait(700)

	yield { type: 'RUN_STARTED', threadId: 'demo', runId: tool.id }
	yield {
		type: 'MESSAGES_SNAPSHOT',
		messages: [{ id: revision.id, role: 'assistant', content: revision.text }, tool],
	}
	yield { type: 'RUN_FINISHED', threadId: 'demo', runId: tool.id }
}

/**
 * A transport over a fake AG-UI agent. The answer to an ask goes to the agent
 * as a tool message, and the events of the run come back as the chunks of the
 * reply. `revise` gives the line that the agent changes. `shown` gives the
 * shown path, so that a snapshot of the agent can revise an earlier message.
 *
 * A real transport posts a `RunAgentInput` to the agent, with the tool message
 * in its `messages`, and reads the event stream of the response.
 */
export function agentTransport(
	revise: (action: ChatActionPart & { result: ChatActionResult }) => Revision,
	shown: () => readonly ChatMessageData[],
): ChatTransport {
	return async function* (_content, _signal, message) {
		if (!message.action) return

		const { part } = message.action
		const tool = toAgUiToolMessage(part, crypto.randomUUID())

		yield* fromAgUiEvents(run(tool, revise(part)), { tool: TOOL, messages: shown() })
	}
}
