'use client'

import { useState } from 'react'
import { Banner } from '../../components/banner'
import { Button } from '../../components/button'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { capitalize } from '../components/format'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Feedback' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const
const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
const types = ['info', 'success', 'warning', 'error'] as const

function ClosableExample() {
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
			severity="info"
			title="New version available"
			description="Version 2.0 has been released with new features and improvements."
			onOpenChange={(open) => setVisible(open)}
		/>
	)
}

export function Demo() {
	const [variant, setVariant] = useState<(typeof variants)[number]>('soft')

	return (
		<>
			<Example title="Severity">
				<Stack className="gap-0 -mx-4">
					{types.map((type) => (
						<Banner
							key={type}
							severity={type}
							title={`${capitalize(type)} — this is a ${type} banner`}
							closable={false}
						/>
					))}
				</Stack>
			</Example>

			<Example
				title="Colors"
				actions={<VariantListbox variants={variants} value={variant} onValueChange={setVariant} />}
			>
				<Stack className="gap-0 -mx-4">
					{colors.map((c) => (
						<Banner key={c} variant={variant} color={c} title={capitalize(c)} closable={false} />
					))}
				</Stack>
			</Example>
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
