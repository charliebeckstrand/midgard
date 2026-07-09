import { Pencil, RotateCcw } from 'lucide-react'
import { CopyButton } from '../../../../components/copy-button'
import { Stack } from '../../../../components/stack'
import { ToggleIconButton } from '../../../../components/toggle-icon-button'
import { ChatMessage } from '../../../../modules/chat'
import { Example } from '../../../engine'

export const meta = { name: 'Chat' }

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<Stack gap="sm">
					<ChatMessage type="assistant">Hi there! How can I help you today?</ChatMessage>
					<ChatMessage type="user">Can you help me plan the project kickoff?</ChatMessage>
				</Stack>
			</Example>

			<Example title="System">
				<ChatMessage type="system">Conversation started</ChatMessage>
			</Example>

			<Example title="Streaming">
				<ChatMessage type="assistant" streaming>
					Thinking through the problem
				</ChatMessage>
			</Example>

			<Example title="Timestamped">
				<ChatMessage type="assistant" timestamp="11:10 AM">
					Heading out now, ETA 3pm.
				</ChatMessage>
				<ChatMessage type="user" timestamp="11:12 AM">
					Got it — door code is 4421.
				</ChatMessage>
			</Example>

			<Example title="With actions">
				<ChatMessage
					type="assistant"
					actions={
						<>
							<CopyButton size="sm" value="Heading out now, ETA 3pm." />
							<ToggleIconButton size="sm" pressed={false} icon={<RotateCcw />} aria-label="Retry" />
							<ToggleIconButton size="sm" pressed={false} icon={<Pencil />} aria-label="Edit" />
						</>
					}
				>
					Heading out now, ETA 3pm.
				</ChatMessage>
			</Example>
		</Stack>
	)
}
