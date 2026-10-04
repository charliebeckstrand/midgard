import { useState } from 'react'
import { Banner } from '../../../components/banner'
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
		<Banner
			severity="info"
			title="New version available"
			description="Version 2.0 has been released with new features and improvements."
			onOpenChange={(open) => setVisible(open)}
		/>
	)
}

export default function Demo() {
	return (
		<>
			<Axes
				of="Banner"
				captions={false}
				omit={['open', 'defaultOpen', 'closable', 'sticky', 'titleLevel']}
				render={(props, label) => <Banner {...props} title={label} closable={false} />}
			/>

			<Example title="With description">
				<Banner
					severity="warning"
					title="Scheduled maintenance"
					description="The system will be offline on Sunday from 2am to 4am."
					closable={false}
				/>
			</Example>

			<Example title="Closable">
				<ClosableExample />
			</Example>

			<Example title="With actions">
				<Banner
					severity="info"
					title="New version available"
					description="Version 2.0 has been released with new features and improvements."
					actions={
						<Button size="sm" color="blue">
							Update now
						</Button>
					}
					closable={false}
				/>
			</Example>
		</>
	)
}
