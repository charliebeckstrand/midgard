'use client'

import { useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { ChatMessageData } from './engine/types'

/**
 * The state of a hold. An armed hold waits for the path that shows the version
 * `id`. A bound hold keeps `status` while the last message of that path stays.
 */
type Hold =
	| { kind: 'armed'; id: string; status: string }
	| { kind: 'bound'; last: ChatMessageData | undefined; status: string }

/**
 * The status that the transcript speaks, held through a switch of a branch.
 *
 * @remarks
 * A switch shows another version of a message, so the path below that message
 * changes, and so does its last reply. That reply is not new, and it can be far
 * below the switched message. The switcher speaks its new position, and the
 * transcript keeps the status that it spoke before the switch.
 *
 * `hold` arms the hold for the version `id`. The hold binds on the first path
 * that shows `id`, and it ends when the last message changes again, such as for
 * a new reply or a streamed chunk. An owner that refuses the switch never shows
 * `id`, so the hold never binds and the status stays live.
 *
 * @param status - The live status of the transcript.
 * @param messages - The messages of the shown path.
 * @returns The status to speak, and the call that arms a hold before a switch.
 * @internal
 */
export function useChatTranscriptStatus(
	status: string,
	messages: readonly ChatMessageData[],
): { status: string; hold: (id: string) => void } {
	const [hold, setHold] = useState<Hold | null>(null)

	const last = messages.at(-1)

	// The state changes during the render, so the effects of the commit read the
	// bound status and speak nothing for the new path.
	if (hold?.kind === 'armed' && messages.some((message) => message.id === hold.id)) {
		setHold({ kind: 'bound', last, status: hold.status })
	} else if (hold?.kind === 'bound' && hold.last !== last) {
		setHold(null)
	}

	const spoken = hold?.kind === 'bound' ? hold.status : status

	const arm = useStableEvent((id: string) => setHold({ kind: 'armed', id, status: spoken }))

	return { status: spoken, hold: arm }
}
