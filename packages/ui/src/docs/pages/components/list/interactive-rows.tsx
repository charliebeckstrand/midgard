import { useState } from 'react'
import { List, ListItem, ListLabel } from 'ui/list'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { type Stage, stages } from './stages.ts'

// An `onClick` makes a row interactive: the row takes the hover wash, the
// pointer, and a Tab stop.
export default function InteractiveRows() {
	const [opened, setOpened] = useState<Stage>()

	return (
		<Stack gap="md">
			<List variant="plain" items={stages} aria-label="Stages">
				{(stage) => (
					<ListItem rounded onClick={() => setOpened(stage)}>
						<ListLabel>{stage.label}</ListLabel>
					</ListItem>
				)}
			</List>
			<Text>{opened ? `Opened ${opened.label}` : 'No stage opened'}</Text>
		</Stack>
	)
}
