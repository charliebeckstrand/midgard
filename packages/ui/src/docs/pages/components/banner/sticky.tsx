import { Banner } from 'ui/banner'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const updates = [
	'The export now keeps the order of the columns.',
	'A shared view opens with the filters of its owner.',
	'The search finds a project by its code.',
	'A comment can mention a team.',
	'The calendar shows the holidays of your region.',
	'An invoice can hold a note for the client.',
]

// A sticky banner stays at the top of its scroll container.
export default function Sticky() {
	return (
		<div className="h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
			<Banner sticky severity="info" title="Release notes" closable={false} />
			<Stack gap="md" className="p-4">
				{updates.map((update) => (
					<Text key={update}>{update}</Text>
				))}
			</Stack>
		</div>
	)
}
