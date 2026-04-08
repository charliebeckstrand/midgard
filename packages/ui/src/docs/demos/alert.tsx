'use client'

import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { code } from '../code'
import { Example } from '../example'
import { VariantListbox } from '../variant-listbox'

export const meta = { category: 'Feedback' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const types = ['info', 'success', 'warning', 'error'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function AlertDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('soft')

	return (
		<div className="space-y-8">
			<Example
				title="Variants"
				code={code`
					import { Alert } from 'ui/alert'

					${variants.map((v) => `<Alert variant="${v}" title="${cap(v)} alert" />`)}
				`}
			>
				<div className="flex flex-col gap-3">
					{variants.map((variant) => (
						<Alert key={variant} variant={variant} title={`${cap(variant)} alert`} />
					))}
				</div>
			</Example>
			<Example
				title="Colors"
				actions={
					<VariantListbox
						variants={colorVariants}
						value={colorVariant}
						onChange={setColorVariant}
					/>
				}
				code={code`
					import { Alert } from 'ui/alert'

					${colors.map((c) => `<Alert variant="${colorVariant}" color="${c}" title="${cap(c)}" />`)}
				`}
			>
				<div className="flex flex-col gap-3">
					{colors.map((color) => (
						<Alert key={color} variant={colorVariant} color={color} title={cap(color)} />
					))}
				</div>
			</Example>
			<Example
				title="Types"
				code={code`
					import { Alert } from 'ui/alert'

					<Alert type="info" title="New update available" />
					<Alert type="success" title="Changes saved successfully" />
					<Alert type="warning" title="Storage is almost full" />
					<Alert type="error" title="Something went wrong" />
				`}
			>
				<div className="flex flex-col gap-3">
					{types.map((type) => (
						<Alert key={type} type={type} title={`${cap(type)} alert`} />
					))}
				</div>
			</Example>
			<Example
				title="With description"
				code={code`
					import { Alert } from 'ui/alert'

					<Alert
						type="info"
						title="New update available"
						description="Version 2.0 includes new features and performance improvements."
					/>
				`}
			>
				<div className="flex flex-col gap-3">
					{types.map((type) => (
						<Alert
							key={type}
							type={type}
							title={`${cap(type)} alert`}
							description="This is a description providing more details about the alert."
						/>
					))}
				</div>
			</Example>
			<Example
				title="Closable"
				code={code`
					import { Alert } from 'ui/alert'

					<Alert
						type="success"
						title="Changes saved"
						closable
						onClose={() => {}}
					/>
				`}
			>
				<ClosableDemo />
			</Example>
			<Example
				title="With actions"
				code={code`
					import { Alert } from 'ui/alert'
					import { Button } from 'ui/button'

					<Alert
						type="warning"
						title="Storage is almost full"
						description="You have used 90% of your available storage."
						actions={<Button size="sm" color="amber">Upgrade</Button>}
					/>
				`}
			>
				<Alert
					type="warning"
					title="Storage is almost full"
					description="You have used 90% of your available storage."
					actions={
						<Button size="sm" color="amber">
							Upgrade
						</Button>
					}
				/>
			</Example>
		</div>
	)
}

function ClosableDemo() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return (
			<Button variant="outline" size="sm" onClick={() => setVisible(true)}>
				Show alert
			</Button>
		)
	}

	return (
		<Alert
			type="success"
			title="Changes saved"
			description="Your changes have been saved successfully."
			closable
			onClose={() => setVisible(false)}
		/>
	)
}
