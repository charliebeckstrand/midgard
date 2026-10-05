import { ScrollArea } from 'ui/scroll-area'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { paragraphs } from './paragraphs.ts'

export default function VerticalWithExtent() {
	return (
		<ScrollArea extent="md" rounded>
			<Stack gap="lg">
				{paragraphs.map((paragraph) => (
					<Text key={paragraph.id}>{paragraph.text}</Text>
				))}
			</Stack>
		</ScrollArea>
	)
}
