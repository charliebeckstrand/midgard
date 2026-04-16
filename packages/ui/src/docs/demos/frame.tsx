import { Card } from '../../components/card'
import { Frame } from '../../components/frame'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function FrameDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Frame gap={2}>
					<Card className="w-64">Sidebar</Card>
					<Card className="flex-1">Content</Card>
				</Frame>
			</Example>

			<Example title="Column direction">
				<Frame gap={2} direction="col">
					<Card className="shrink-0">Header</Card>
					<Card className="flex-1">Body</Card>
					<Card className="shrink-0">Footer</Card>
				</Frame>
			</Example>

			<Example title="Nested layout shell">
				<Frame gap={2}>
					<Card className="w-64">Sidebar</Card>
					<Frame gap={2} direction="col" className="flex-1 min-w-0">
						<Card className="shrink-0">Toolbar</Card>
						<Card className="flex-1">
							<Text>Main content area</Text>
						</Card>
					</Frame>
				</Frame>
			</Example>

			<Example title="Responsive direction">
				<Frame gap={2} direction={{ initial: 'row', lg: 'col' }}>
					<Card className="shrink-0 w-64">Sidebar</Card>
					<Card className="flex-1">Content</Card>
				</Frame>
			</Example>
		</Stack>
	)
}
