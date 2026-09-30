import { useState } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Axes, Example } from '../../engine'

function ClosableExample() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return (
			<Button variant="soft" color="red" onClick={() => setVisible(true)}>
				Reset
			</Button>
		)
	}

	return (
		<Alert
			severity="success"
			title="Changes saved"
			description="Your changes have been saved successfully."
			closable
			onOpenChange={(open) => setVisible(open)}
		/>
	)
}

function ClosableBlockExample() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return (
			<Button variant="soft" color="red" onClick={() => setVisible(true)}>
				Reset
			</Button>
		)
	}

	return (
		<Alert
			className="w-full"
			severity="info"
			title="Full-width alert"
			description="This alert stretches to fill its container."
			closable
			onOpenChange={(open) => setVisible(open)}
		/>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="Alert"
				omit={['open', 'defaultOpen']}
				render={(props, label) => <Alert {...props} title={label} />}
			/>

			<Example title="With description">
				<Alert
					severity="info"
					title="Scheduled maintenance"
					description="The system will be offline on Sunday from 2am to 4am."
				/>
			</Example>

			<Example title="Closable">
				<ClosableExample />
			</Example>

			<Example title="With actions">
				<Alert
					severity="warning"
					title="Storage is almost full"
					description="You have used 90% of your available storage."
					actions={<Button size="sm">Upgrade</Button>}
				/>
			</Example>

			<Example title="Block">
				<ClosableBlockExample />
			</Example>
		</>
	)
}
