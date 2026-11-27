import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import {
	StackedLayout,
	StackedLayoutBody,
	StackedLayoutFooter,
	StackedLayoutHeader,
} from 'ui/layouts'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

const updates = [
	{ id: 'export', text: 'The export now keeps the order of the columns.' },
	{ id: 'shared-view', text: 'A shared view opens with the filters of its owner.' },
	{ id: 'search', text: 'The search finds a project by its code.' },
	{ id: 'mention', text: 'A comment can mention a team.' },
	{ id: 'calendar', text: 'The calendar shows the holidays of your region.' },
	{ id: 'invoice', text: 'An invoice can hold a note for the client.' },
	{ id: 'archive', text: 'An archived project keeps its history.' },
	{ id: 'theme', text: 'The dark theme follows the setting of your system.' },
	{ id: 'import', text: 'The import reads a file of up to ten thousand rows.' },
	{ id: 'reminder', text: 'A task can send a reminder a day before it is due.' },
	{ id: 'avatar', text: 'A team can have a photo of its own.' },
	{ id: 'print', text: 'A report prints on one page for each section.' },
	{ id: 'audit', text: 'The audit log shows who changed each setting.' },
]

// The layout has the height of the area, as a page shell has `h-dvh`. The
// body then scrolls between the header and the footer, which stay in place.
// The slots have no gap, so each slot has its own padding. While the body
// overflows, it is a Tab stop, so a keyboard can scroll it.
export default function ScrollingBody() {
	return (
		<StackedLayout className="h-[100cqh]">
			<StackedLayoutHeader className="border-b border-zinc-200 p-4 dark:border-zinc-800">
				<Heading level={2}>Release notes</Heading>
			</StackedLayoutHeader>
			<StackedLayoutBody className="p-4">
				<Stack gap="md">
					{updates.map((update) => (
						<Text key={update.id}>{update.text}</Text>
					))}
				</Stack>
			</StackedLayoutBody>
			<StackedLayoutFooter className="border-t border-zinc-200 p-4 dark:border-zinc-800">
				<Flex justify="end">
					<Button>Got it</Button>
				</Flex>
			</StackedLayoutFooter>
		</StackedLayout>
	)
}
