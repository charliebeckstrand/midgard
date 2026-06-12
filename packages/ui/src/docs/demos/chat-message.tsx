import { Pencil, RotateCcw } from 'lucide-react'
import { ChatMessage } from '../../components/chat-message'
import { CopyButton } from '../../components/copy-button'
import { Stack } from '../../components/stack'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { Example } from '../components/example'

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Stack gap="sm">
					<ChatMessage type="assistant" timestamp="11:10 AM">
						Heading out now, ETA 3pm.
					</ChatMessage>
					<ChatMessage type="user" timestamp="11:12 AM">
						Got it — door code is 4421.
					</ChatMessage>
				</Stack>
			</Example>

			<Example title="System message">
				<ChatMessage type="system">Conversation started</ChatMessage>
			</Example>

			<Example title="Streaming">
				<ChatMessage type="assistant" streaming>
					Thinking through the problem
				</ChatMessage>
			</Example>

			<Example title="With actions">
				<ChatMessage
					type="assistant"
					timestamp="11:10 AM"
					actions={
						<>
							<CopyButton size="xs" value="Heading out now, ETA 3pm." />
							<ToggleIconButton size="xs" pressed={false} icon={<RotateCcw />} aria-label="Retry" />
							<ToggleIconButton size="xs" pressed={false} icon={<Pencil />} aria-label="Edit" />
						</>
					}
				>
					Heading out now, ETA 3pm.
				</ChatMessage>
			</Example>
		</>
	)
}
