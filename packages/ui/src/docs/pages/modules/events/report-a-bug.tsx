import { Component, type ReactNode, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { ResetButton } from '../../../kit/reset-button.tsx'

/** An error boundary that shows the message of the error, with a reset. */
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
	override state: { error?: Error } = {}

	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	override render() {
		const { error } = this.state

		if (!error) return this.props.children

		return (
			<Flex align="center" gap="sm">
				<Text tone="muted">Caught: {error.message}</Text>
				<ResetButton size="sm" onClick={() => this.setState({ error: undefined })} />
			</Flex>
		)
	}
}

function Thrower(): ReactNode {
	throw new Error('render fails')
}

export default function ReportABug() {
	const [broken, setBroken] = useState(false)

	// Turn on Debug in the settings. Each button makes a bug that React or the
	// browser reports, and the bug shows in the Bugs tab of the Events sheet.
	return (
		<Stack gap="md">
			<Boundary key={String(broken)}>
				{broken ? <Thrower /> : <Text tone="muted">The boundary holds no error.</Text>}
			</Boundary>
			<Flex wrap gap="sm">
				<Button onClick={() => setBroken((prev) => !prev)}>Throw in render</Button>
				<Button
					onClick={() => {
						throw new Error('handler fails')
					}}
				>
					Throw in a handler
				</Button>
				<Button onClick={() => void Promise.reject(new Error('request fails'))}>
					Reject a promise
				</Button>
			</Flex>
		</Stack>
	)
}
