import { Component, type ReactNode, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { ResetButton } from '../../../kit/reset-button.tsx'

/** An error boundary that shows the message of the error, with a reset. */
class Boundary extends Component<{ children: ReactNode; onReset: () => void }, { error?: Error }> {
	override state: { error?: Error } = {}

	static getDerivedStateFromError(error: Error) {
		return { error }
	}

	override render() {
		const { error } = this.state

		if (!error) return this.props.children

		return (
			<Flex align="center" gap="sm">
				<Text tone="muted">Last error: {error.message}</Text>
				<ResetButton size="sm" onClick={this.props.onReset} />
			</Flex>
		)
	}
}

function Thrower(): ReactNode {
	throw new Error('Render failed')
}

export default function ReportABug() {
	const [broken, setBroken] = useState(false)

	// Turn on Debug in the settings. Each button makes a bug that React or the
	// browser reports, and the bug shows in the Bugs tab of the Events sheet.
	return (
		<Stack gap="md">
			{/* The reset removes the component that throws. The new key then mounts a new boundary with no error. */}
			<Boundary key={String(broken)} onReset={() => setBroken(false)}>
				{broken ? <Thrower /> : <Text tone="muted">Last error: None</Text>}
			</Boundary>
			<Flex wrap gap="sm">
				<Button onClick={() => setBroken(true)}>Throw in render</Button>
				<Button
					onClick={() => {
						throw new Error('Handler failed')
					}}
				>
					Throw in a handler
				</Button>
				<Button onClick={() => void Promise.reject(new Error('Request failed'))}>
					Reject a promise
				</Button>
			</Flex>
		</Stack>
	)
}
