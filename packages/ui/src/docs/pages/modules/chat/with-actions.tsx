import { FaceSlightlySmilingPlus, Pencil, RotateCcw, Trash } from 'lucide-react'
import { Button } from 'ui/button'
import { ChatMessage } from 'ui/chat'
import type { ContextMenuConfig } from 'ui/context-menu'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'

// The menu holds Copy by default, and each message adds its own actions.
function menu(own: boolean): ContextMenuConfig {
	return {
		items: [
			own
				? { key: 'edit', label: 'Edit', icon: <Pencil /> }
				: { key: 'retry', label: 'Retry', icon: <RotateCcw /> },
			{ key: 'delete', label: 'Delete', icon: <Trash /> },
		],
	}
}

const reply = menu(false)

const own = menu(true)

// A control that is not a menu action, such as a reaction, shows beside the menu button.
const react = (
	<Button variant="bare" size="sm" aria-label="Add reaction">
		<Icon icon={<FaceSlightlySmilingPlus />} />
	</Button>
)

export default function WithActions() {
	// The toolbar floats above its message, and the box of the example clips it.
	// The padding keeps room for the toolbar of the first message.
	return (
		<Stack gap="xl" className="pt-6">
			<ChatMessage sender="assistant" actions={react} contextMenu={reply}>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage sender="user" actions={react} contextMenu={own}>
				Got it. The door code is 4421.
			</ChatMessage>
		</Stack>
	)
}
