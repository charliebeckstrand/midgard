import type { BaseEvent } from '@ag-ui/core'
import { EventType } from '@ag-ui/core'
import { EventEncoder } from '@ag-ui/encoder'

import type { ChatMessage } from '../../../(chat)/types'

export async function POST(request: Request) {
	const body = (await request.json()) as { messages: ChatMessage[] }

	const messages = body.messages ?? []
	const lastUserMessage = [...messages].reverse().find((m: ChatMessage) => m.role === 'user')
	const response = `This is a simulated agent response to: "${lastUserMessage?.content ?? ''}"`

	const encoder = new EventEncoder()
	const textEncoder = new TextEncoder()
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()

	const words = response.split(/(\s+)/)

	const stream = new ReadableStream({
		async start(controller) {
			function send(event: BaseEvent) {
				controller.enqueue(textEncoder.encode(encoder.encodeSSE(event)))
			}

			send({ type: EventType.RUN_STARTED, threadId: '', runId } as BaseEvent)

			send({
				type: EventType.TEXT_MESSAGE_START,
				messageId,
				role: 'assistant',
			} as BaseEvent)

			for (const word of words) {
				send({
					type: EventType.TEXT_MESSAGE_CONTENT,
					messageId,
					delta: word,
				} as BaseEvent)

				await new Promise((resolve) => setTimeout(resolve, 30))
			}

			send({ type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent)

			send({ type: EventType.RUN_FINISHED, threadId: '', runId } as BaseEvent)

			controller.close()
		},
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	})
}
