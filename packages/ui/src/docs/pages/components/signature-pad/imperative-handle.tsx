import { useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { useIntl } from 'ui/primitives/intl'
import { SignaturePad, type SignaturePadHandle } from 'ui/signature-pad'
import { Text } from 'ui/text'

/** The state of the last save, or the length of the data URL of the saved PNG. */
type SaveStatus = 'unsaved' | 'empty' | { characters: number }

function StatusText({ status }: { status: SaveStatus }) {
	const intl = useIntl()

	if (status === 'unsaved') return 'Not saved'

	if (status === 'empty') return 'Sign before you save.'

	const characters = intl.formatNumber(status.characters)

	return `Saved a PNG of ${characters} characters`
}

export default function ImperativeHandle() {
	const pad = useRef<SignaturePadHandle>(null)

	const [status, setStatus] = useState<SaveStatus>('unsaved')

	function save() {
		const image = pad.current?.isEmpty() ? null : pad.current?.toDataURL()

		setStatus(image ? { characters: image.length } : 'empty')
	}

	function clear() {
		pad.current?.clear()

		setStatus('unsaved')
	}

	return (
		<>
			<SignaturePad ref={pad} clearable={false} />
			<Flex gap="sm">
				<Button onClick={save}>Save</Button>
				<Button variant="plain" onClick={clear}>
					Clear
				</Button>
			</Flex>
			<Text>
				<StatusText status={status} />
			</Text>
		</>
	)
}
