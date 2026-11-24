import { Pencil, RotateCcw, Share, Trash } from 'lucide-react'
import { ChatMessage } from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

// On a device that hovers, the toolbar shows the first three actions of the
// menu as icon buttons. The reply has Copy and Retry, so it shows both. The
// message of the reader has five, so the ellipsis opens Delete. This example
// has no transcript, so the actions do nothing.
const reply: ContextMenuConfig = {
	items: [{ key: 'retry', label: 'Retry', icon: <RotateCcw /> }],
}

const message: ContextMenuConfig = {
	items: [
		{ key: 'edit', label: 'Edit', icon: <Pencil /> },
		{ key: 'share', label: 'Share', icon: <Share /> },
		{ separator: true },
		{ key: 'delete', label: 'Delete', icon: <Trash /> },
	],
}

export default function WithActions() {
	return (
		<>
			<Text tone="muted">
				<PointerHint mouseText="Hover a message" touchText="Press and hold a message" />
			</Text>
			<ChatMessage sender="assistant" contextMenu={reply}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" contextMenu={message}>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
