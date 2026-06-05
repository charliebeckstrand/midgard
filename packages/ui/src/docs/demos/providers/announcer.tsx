import { useRef, useState } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { AnnouncerProvider, useAnnounce } from '../../../providers/announcer'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

type Entry = { id: number; label: string }

function ConsoleExample() {
	const announce = useAnnounce()

	const [log, setLog] = useState<Entry[]>([])

	const nextId = useRef(0)

	function say(message: string, assertive = false) {
		announce(message, { assertive })

		nextId.current += 1

		setLog((prev) =>
			[
				{ id: nextId.current, label: `${assertive ? 'assertive' : 'polite'} · ${message}` },
				...prev,
			].slice(0, 10),
		)
	}

	return (
		<Stack gap="sm">
			<Flex gap="sm">
				<Button onClick={() => say('Changes saved')}>Announce (polite)</Button>
				<Button color="red" variant="soft" onClick={() => say('Connection lost', true)}>
					Announce (assertive)
				</Button>
			</Flex>

			<Stack gap="xs" aria-hidden>
				{log.length === 0 ? (
					<Text variant="muted">Nothing announced yet.</Text>
				) : (
					log.map((entry) => <Text key={entry.id}>{entry.label}</Text>)
				)}
			</Stack>
		</Stack>
	)
}

export function Demo() {
	return (
		<Example title="AnnouncerProvider">
			<Stack>
				<AnnouncerProvider>
					<Alert severity="info">
						The announcer is used to communicate important updates to users of assistive
						technologies like screen readers.
					</Alert>
					<ConsoleExample />
				</AnnouncerProvider>
			</Stack>
		</Example>
	)
}
