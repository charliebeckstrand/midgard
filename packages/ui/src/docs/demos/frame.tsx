import { Card } from '../../components/card'
import { Frame } from '../../components/frame'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Frame gap="sm">
					<Card className="w-64">Sidebar</Card>
					<Card className="flex-1">Content</Card>
				</Frame>
			</Example>

			<Example title="Column direction">
				<Frame gap="sm" direction="col">
					<Card className="shrink-0">Header</Card>
					<Card className="flex-1">Body</Card>
					<Card className="shrink-0">Footer</Card>
				</Frame>
			</Example>

			<Example title="Nested layout shell">
				<Frame gap="sm">
					<Card className="w-64">Sidebar</Card>
					<Frame gap="sm" direction="col" className="flex-1 min-w-0">
						<Card className="shrink-0">Toolbar</Card>
						<Card className="flex-1">
							<Text>Main content area</Text>
						</Card>
					</Frame>
				</Frame>
			</Example>

			<Example title="Responsive direction">
				<Frame gap="sm" direction={{ initial: 'col', lg: 'row' }}>
					<Card className="shrink-0 w-64">Sidebar</Card>
					<Card className="flex-1">Content</Card>
				</Frame>
			</Example>
		</>
	)
}
