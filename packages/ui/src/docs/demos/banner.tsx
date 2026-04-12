'use client'

import { useState } from 'react'
import { Banner } from '../../components/banner'
import { Button } from '../../components/button'
import { code } from '../code'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Feedback' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const
const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
const types = ['info', 'success', 'warning', 'error'] as const
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function ClosableDemo() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return <Button onClick={() => setVisible(true)}>Show banner</Button>
	}

	return (
		<Banner
			type="info"
			title="New version available"
			description="Version 2.0 has been released with new features and improvements."
			onClose={() => setVisible(false)}
		/>
	)
}

export default function BannerDemo() {
	const [variant, setVariant] = useState<(typeof variants)[number]>('soft')

	return (
		<div className="space-y-8">
			<Example
				title="Types"
				code={code`
					import { Banner } from 'ui/banner'

					<Banner type="info" title="Info banner" />
					<Banner type="success" title="Success banner" />
					<Banner type="warning" title="Warning banner" />
					<Banner type="error" title="Error banner" />
				`}
			>
				<div className="-mx-4 flex flex-col">
					{types.map((type) => (
						<Banner
							key={type}
							type={type}
							title={`${cap(type)} — this is a ${type} banner`}
							closable={false}
						/>
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
				code={code`
					import { Banner } from 'ui/banner'

					<Banner variant="soft" color="zinc" title="Zinc" />
					<Banner variant="soft" color="red" title="Red" />
					<Banner variant="soft" color="amber" title="Amber" />
					<Banner variant="soft" color="green" title="Green" />
					<Banner variant="soft" color="blue" title="Blue" />
				`}
			>
				<div className="-mx-4 flex flex-col">
					{colors.map((c) => (
						<Banner key={c} variant={variant} color={c} title={cap(c)} closable={false} />
					))}
				</div>
			</Example>
			<Example
				title="With description"
				code={code`
					import { Banner } from 'ui/banner'

					<Banner
						type="warning"
						title="Scheduled maintenance"
						description="The system will be offline on Sunday from 2am to 4am."
					/>
				`}
			>
				<div className="-mx-4">
					<Banner
						type="warning"
						title="Scheduled maintenance"
						description="The system will be offline on Sunday from 2am to 4am."
						closable={false}
					/>
				</div>
			</Example>
			<Example
				title="Closable"
				code={code`
					import { Banner } from 'ui/banner'

					<Banner
						type="info"
						title="New version available"
						description="Version 2.0 has been released."
						onClose={() => setVisible(false)}
					/>
				`}
			>
				<div className="-mx-4">
					<ClosableDemo />
				</div>
			</Example>
			<Example
				title="With actions"
				code={code`
					import { Banner } from 'ui/banner'
					import { Button } from 'ui/button'

					<Banner
						type="info"
						title="New version available"
						actions={<Button size="sm" color="blue">Update now</Button>}
					/>
				`}
			>
				<div className="-mx-4">
					<Banner
						type="info"
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
		</div>
	)
}
