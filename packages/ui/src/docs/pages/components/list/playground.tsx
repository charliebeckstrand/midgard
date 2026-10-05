import { List, ListItem, ListLabel, type ListProps } from 'ui/list'
import { type Stage, stages } from './stages.ts'

export default function ListPlayground(props: ListProps<Stage>) {
	return (
		<List {...props} items={stages} getKey={(stage) => stage.id} aria-label="Stages">
			{(stage) => (
				<ListItem>
					<ListLabel>{stage.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
