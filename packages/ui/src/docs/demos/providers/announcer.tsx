import { useRef, useState } from 'react'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Stack } from '../../../components/stack'
import { Text } from '../../../components/text'
import { AnnouncerProvider, useAnnounce } from '../../../providers/announcer'
import { Example } from '../../components/example'

export const meta = { category: 'Providers' }

// The announcer is imperative and visually silent, so the rendered preview
// can't show it directly. Surface the idiomatic usage as the code block and
// mirror each announcement into a visible log beside the live buttons.
const USAGE = `import { AnnouncerProvider, useAnnounce } from 'ui/providers/announcer'

// Mount once, at the app root, alongside your other providers.
function App() {
	return (
		<AnnouncerProvider>
			<Routes />
		</AnnouncerProvider>
	)
}

// Anywhere below it, announce imperatively — for state changes that have no
// natural focus or DOM home (copied, saved, item removed, results filtered).
function SaveButton() {
	const announce = useAnnounce()

	return <Button onClick={() => announce('Changes saved')}>Save</Button>
}

// Polite by default. Pass { assertive: true } to interrupt for time-sensitive
// messages such as errors or lost connectivity.
announce('Connection lost', { assertive: true })`

type Entry = { id: number; label: string }

function Console() {
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
			].slice(0, 5),
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

			<Text variant="muted">
				The live region is visually hidden — turn on a screen reader to hear these. The log below
				mirrors what was sent.
			</Text>

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
		<Example code={USAGE}>
			<AnnouncerProvider>
				<Console />
			</AnnouncerProvider>
		</Example>
	)
}
