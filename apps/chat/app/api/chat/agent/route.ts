import { NextResponse } from 'next/server'

import type { ChatMessage } from '../../../(chat)/types'

export async function POST(request: Request) {
	const body = (await request.json()) as { messages: ChatMessage[] }
	const messages = body.messages ?? []

	const lastUserMessage = messages.findLast((m) => m.role === 'user')

	const response = `This is a simulated agent response to: "${lastUserMessage?.message ?? ''}"`

	return NextResponse.json({ message: response })
}
