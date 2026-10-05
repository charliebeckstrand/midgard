import { Card, CardBody, CardHeader, CardTitle } from 'ui/card'
import { ScrollArea } from 'ui/scroll-area'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { paragraphs } from './paragraphs.ts'

export default function BareNestedInAContainer() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Paragraphs</CardTitle>
			</CardHeader>
			<CardBody>
				<ScrollArea bare extent="md">
					<Stack gap="lg">
						{paragraphs.map((paragraph) => (
							<Text key={paragraph.id}>{paragraph.text}</Text>
						))}
					</Stack>
				</ScrollArea>
			</CardBody>
		</Card>
	)
}
