'use client'

import { useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { ChatMessageData } from './engine/types'

/**
 * The state of a hold. Each state keeps `held`, the status that the transcript
 * spoke before the switch, and `live`, the live status that the state started
 * from.
 *
 * - An armed hold waits for the path that shows the version `id`.
 * - A bound hold speaks `held` while the live status stays `live`.
 */
type Hold =
	| { kind: 'armed'; id: string; held: string; live: string }
	| { kind: 'bound'; held: string; live: string }

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
 * that shows `id`. Then it holds while the live status stays the status of that
 * path, and it ends when the live status changes, such as for a new reply.
 * An armed hold ends when the live status changes before the path shows `id`,
 * such as when the owner refuses the switch and a new reply comes.
 *
 * The hold compares the text of the status, as the announcer does. An owner
 * that makes new message objects on each render thus keeps the hold.
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

	// The state changes during the render, so the effects of the commit read the
	// new state and speak nothing for the switched path.
	if (hold?.kind === 'armed') {
		if (messages.some((message) => message.id === hold.id)) {
			setHold({ kind: 'bound', held: hold.held, live: status })
		} else if (status !== hold.live) {
			setHold(null)
		}
	} else if (hold?.kind === 'bound' && status !== hold.live) {
		setHold(null)
	}

	const spoken = hold?.kind === 'bound' ? hold.held : status

	const arm = useStableEvent((id: string) =>
		setHold({ kind: 'armed', id, held: spoken, live: status }),
	)

	return { status: spoken, hold: arm }
}
