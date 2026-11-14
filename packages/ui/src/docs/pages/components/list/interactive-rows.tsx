import { List, ListItem, ListLabel } from 'ui/list'
import { stages } from './stages.ts'

export default function InteractiveRows() {
	return (
		<List variant="plain" items={stages} aria-label="Stages">
			{(stage) => (
				<ListItem interactive rounded>
					<ListLabel>{stage.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
