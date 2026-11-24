import { Pencil, Trash } from 'lucide-react'
import { ChatMessage } from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

// The menu holds Copy by default. This example has no transcript and no
// composer, so Edit and Delete have no action. The Edit a message example of
// the Conversation tab wires Edit.
const menu: ContextMenuConfig = {
	items: [
		{ key: 'edit', label: 'Edit', icon: <Pencil /> },
		{ key: 'delete', label: 'Delete', icon: <Trash /> },
	],
}

export default function WithContextMenu() {
	return (
		<>
			<Text tone="muted">
				<PointerHint
					mouseText="Hover a message for its menu"
					touchText="Press and hold a message"
				/>
			</Text>
			<ChatMessage sender="assistant" contextMenu={menu}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" contextMenu={menu}>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
