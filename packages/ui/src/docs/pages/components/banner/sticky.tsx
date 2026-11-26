import { Banner } from 'ui/banner'
import { useScrollRegion } from 'ui/hooks'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const updates = [
	{ id: 'export', text: 'The export now keeps the order of the columns.' },
	{ id: 'shared-view', text: 'A shared view opens with the filters of its owner.' },
	{ id: 'search', text: 'The search finds a project by its code.' },
	{ id: 'mention', text: 'A comment can mention a team.' },
	{ id: 'calendar', text: 'The calendar shows the holidays of your region.' },
	{ id: 'invoice', text: 'An invoice can hold a note for the client.' },
]

// A sticky banner stays at the top of its scroll container.
export default function Sticky() {
	// The container takes a name and a Tab stop while its content overflows, so a
	// keyboard can scroll it.
	const scrollRegion = useScrollRegion({ label: 'Release notes' })

	return (
		<div
			ref={scrollRegion}
			className="h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
		>
			<Banner sticky severity="info" title="Release notes" closable={false} />
			<Stack gap="md" className="p-4">
				{updates.map((update) => (
					<Text key={update.id}>{update.text}</Text>
				))}
			</Stack>
		</div>
	)
}
