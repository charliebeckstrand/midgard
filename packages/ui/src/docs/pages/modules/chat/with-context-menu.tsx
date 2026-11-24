import { Pencil, Trash } from 'lucide-react'
import { ChatMessage } from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'

// The menu holds Copy by default. `trigger="contextmenu"` opens it on a
// right-click on a device that hovers, in place of the menu button. This
// example has no transcript and no composer, so Edit and Delete have no
// action. The Edit a message example of the Conversation tab wires Edit.
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
				<PointerHint mouseText="Right-click a message" touchText="Press and hold a message" />
			</Text>
			<ChatMessage sender="assistant" trigger="contextmenu" contextMenu={menu}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" trigger="contextmenu" contextMenu={menu}>
				Got it. The door code is 4421.
			</ChatMessage>
		</>
	)
}
