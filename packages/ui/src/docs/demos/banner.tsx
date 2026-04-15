'use client'

import { useState } from 'react'
import { Banner } from '../../components/banner'
import { Button } from '../../components/button'
import { Stack } from '../../components/stack'
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
		return (
			<div className="px-4">
				<Button onClick={() => setVisible(true)}>Show banner</Button>
			</div>
		)
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
		<Stack gap={8}>
			<Example title="Types">
				<Stack gap={0} className="-mx-4">
					{types.map((type) => (
						<Banner
							key={type}
							type={type}
							title={`${cap(type)} — this is a ${type} banner`}
							closable={false}
						/>
					))}
				</Stack>
			</Example>

			<Example
				title="Colors"
				actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
			>
				<Stack gap={0} className="-mx-4">
					{colors.map((c) => (
						<Banner key={c} variant={variant} color={c} title={cap(c)} closable={false} />
					))}
				</Stack>
			</Example>
			<Example title="With description">
				<div className="-mx-4">
					<Banner
						type="warning"
						title="Scheduled maintenance"
						description="The system will be offline on Sunday from 2am to 4am."
						closable={false}
					/>
				</div>
			</Example>
			<Example title="Closable">
				<div className="-mx-4">
					<ClosableDemo />
				</div>
			</Example>
			<Example title="With actions">
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
		</Stack>
	)
}
