import { Ellipsis, Pencil, RotateCcw, SmilePlus, Trash2 } from 'lucide-react'
import { Button } from 'ui/button'
import { ChatMessage } from 'ui/chat'
import { CopyButton } from 'ui/copy-button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from 'ui/menu'
import { Stack } from 'ui/stack'

function MessageActions({ text, own }: { text: string; own: boolean }) {
	return (
		<>
			<Button variant="bare" size="sm" aria-label="Add reaction">
				<Icon icon={<SmilePlus />} />
			</Button>
			<CopyButton size="sm" text={text} />
			{own ? (
				<Button variant="bare" size="sm" aria-label="Edit">
					<Icon icon={<Pencil />} />
				</Button>
			) : (
				<Button variant="bare" size="sm" aria-label="Retry">
					<Icon icon={<RotateCcw />} />
				</Button>
			)}
			<Menu placement="bottom-end">
				<MenuTrigger>
					<Button variant="bare" size="sm" aria-label="More actions">
						<Icon icon={<Ellipsis />} />
					</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem>
						<Icon icon={<Trash2 />} />
						<MenuLabel>Delete</MenuLabel>
					</MenuItem>
				</MenuContent>
			</Menu>
		</>
	)
}

export default function WithActions() {
	// The toolbar floats above its message, and the box of the example clips it.
	// The padding keeps room for the toolbar of the first message.
	return (
		<Stack gap="xl" className="pt-6">
			<ChatMessage
				sender="assistant"
				hoverActions
				actions={<MessageActions text="Heading out now. ETA 3:00 PM." own={false} />}
			>
				Heading out now. ETA 3:00 PM.
			</ChatMessage>
			<ChatMessage
				sender="user"
				hoverActions
				actions={<MessageActions text="Got it. The door code is 4421." own />}
			>
				Got it. The door code is 4421.
			</ChatMessage>
		</Stack>
	)
}
