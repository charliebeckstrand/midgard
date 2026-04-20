import { Pencil, RotateCcw } from 'lucide-react'
import { ChatMessage } from '../../components/chat-message'
import { CopyButton } from '../../components/copy-button'
import { Stack } from '../../components/stack'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function ChatMessageDemo() {
	return (
		<Stack gap={6}>
			<Example
				title="Default"
				code={code`
					import { ChatMessage } from 'ui/chat-message'

					<ChatMessage type="assistant" timestamp="11:10 AM">
						Heading out now, ETA 3pm.
					</ChatMessage>
					<ChatMessage type="user" timestamp="11:12 AM">
						Got it — door code is 4421.
					</ChatMessage>
				`}
			>
				<Stack gap={2}>
					<ChatMessage type="assistant" timestamp="11:10 AM">
						Heading out now, ETA 3pm.
					</ChatMessage>
					<ChatMessage type="user" timestamp="11:12 AM">
						Got it — door code is 4421.
					</ChatMessage>
				</Stack>
			</Example>

			<Example
				title="System message"
				code={code`
					<ChatMessage type="system">
						Conversation started
					</ChatMessage>
				`}
			>
				<ChatMessage type="system">Conversation started</ChatMessage>
			</Example>

			<Example
				title="Streaming"
				code={code`
					<ChatMessage type="assistant" streaming>
						Thinking through the problem
					</ChatMessage>
				`}
			>
				<ChatMessage type="assistant" streaming>
					Thinking through the problem
				</ChatMessage>
			</Example>

			<Example
				title="With actions"
				code={code`
					import { CopyButton } from 'ui/copy-button'
					import { ToggleIconButton } from 'ui/toggle-icon-button'
					import { Pencil, RotateCcw } from 'lucide-react'

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
				`}
			>
				<ChatMessage
					type="assistant"
					timestamp="11:10 AM"
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
