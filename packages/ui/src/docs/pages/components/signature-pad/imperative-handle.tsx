import { useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { SignaturePad, type SignaturePadHandle } from 'ui/signature-pad'
import { Text } from 'ui/text'

export default function ImperativeHandle() {
	const pad = useRef<SignaturePadHandle>(null)

	const [status, setStatus] = useState('Not saved.')

	function save() {
		const image = pad.current?.isEmpty() ? null : pad.current?.toDataURL()

		setStatus(image ? `Saved a PNG of ${image.length} characters.` : 'Sign before you save.')
	}

	function clear() {
		pad.current?.clear()

		setStatus('Not saved.')
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
			<Text>{status}</Text>
		</>
	)
}
