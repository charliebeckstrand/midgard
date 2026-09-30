import { useState } from 'react'
import { Banner } from '../../../components/banner'
import { Button } from '../../../components/button'
import { Axes, Example } from '../../engine'

function ClosableExample() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return (
			<div className="px-4">
				<Button variant="soft" color="red" onClick={() => setVisible(true)}>
					Reset
				</Button>
			</div>
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

export function Demo() {
	return (
		<>
			<Axes
				of="Banner"
				omit={['open', 'defaultOpen', 'sticky']}
				render={(props, label) => <Banner {...props} title={label} />}
			/>

			<Example title="With description">
				<div className="-mx-4">
					<Banner
						severity="warning"
						title="Scheduled maintenance"
						description="The system will be offline on Sunday from 2am to 4am."
						closable={false}
					/>
				</div>
			</Example>

			<Example title="Closable">
				<div className="-mx-4">
					<ClosableExample />
				</div>
			</Example>

			<Example title="With actions">
				<div className="-mx-4">
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
				</div>
			</Example>
		</>
	)
}
