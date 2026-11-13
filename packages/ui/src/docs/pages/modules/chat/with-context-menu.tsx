import { Copy, Pencil, Trash } from 'lucide-react'
import { ChatMessage } from 'ui/chat'
import type { ContextMenuEntry } from 'ui/context-menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

function entries(text: string): ContextMenuEntry[] {
	return [
		{
			key: 'copy',
			label: 'Copy',
			icon: <Copy />,
			onAction: () => void navigator.clipboard?.writeText(text),
		},
		{ key: 'edit', label: 'Edit', icon: <Pencil /> },
		{ key: 'delete', label: 'Delete', icon: <Trash /> },
	]
}

const assistant = entries('Heading out now. ETA 3:00 PM.')

const user = entries('Got it. The door code is 4421.')

export default function WithContextMenu() {
	return (
		<>
			<Text tone="muted">
				<PointerHint mouseText="Right-click a message" touchText="Press and hold a message" />
			</Text>
			<ChatMessage sender="assistant" contextMenu={assistant}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" contextMenu={user}>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
