import { Pencil, RotateCcw } from 'lucide-react'
import { Button } from 'ui/button'
import { ChatMessage } from 'ui/chat'
import { CopyButton } from 'ui/copy-button'
import { Icon } from 'ui/icon'

export default function WithActions() {
	return (
		<ChatMessage
			role="assistant"
			actions={
				<>
					<CopyButton size="sm" text="Heading out now, ETA 3pm." />
					<Button variant="bare" size="sm" aria-label="Retry">
						<Icon icon={<RotateCcw />} />
					</Button>
					<Button variant="bare" size="sm" aria-label="Edit">
						<Icon icon={<Pencil />} />
					</Button>
				</>
			}
		>
			Heading out now, ETA 3pm.
		</ChatMessage>
	)
}
