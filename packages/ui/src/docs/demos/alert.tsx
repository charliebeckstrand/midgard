'use client'

import { useState } from 'react'
import { Alert } from '../../components/alert'
import { Button } from '../../components/button'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Feedback' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const types = ['info', 'success', 'warning', 'error'] as const

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function ClosableDemo() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return <Button onClick={() => setVisible(true)}>Show alert</Button>
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

function ClosableBlockDemo() {
	const [visible, setVisible] = useState(true)

	if (!visible) {
		return <Button onClick={() => setVisible(true)}>Show alert</Button>
	}

	return (
		<Alert
			block
			type="info"
			title="Full-width alert"
			description="This alert stretches to fill its container."
			closable
			onClose={() => setVisible(false)}
		/>
	)
}

export default function AlertDemo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('soft')

	return (
		<Stack gap={8}>
			<Example title="Variants">
				<Stack gap={3}>
					{variants.map((variant) => (
						<Alert key={variant} variant={variant} title={`${cap(variant)} alert`} />
					))}
				</Stack>
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
			>
				<Stack gap={3}>
					{colors.map((color) => (
						<Alert key={color} variant={colorVariant} color={color} title={cap(color)} />
					))}
				</Stack>
			</Example>

			<Example title="Types">
				<Stack gap={3}>
					{types.map((type) => (
						<Alert key={type} type={type} title={`${cap(type)} alert`} />
					))}
				</Stack>
			</Example>

			<Example title="With description">
				<Stack gap={3}>
					{types.map((type) => (
						<Alert
							key={type}
							type={type}
							title={`${cap(type)} alert`}
							description="This is a description providing more details about the alert."
						/>
					))}
				</Stack>
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

			<Example title="With actions">
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

			<Example
				title="Block"
				code={code`
					import { Alert } from 'ui/alert'

					<Alert block type="info" title="Full-width alert" />
				`}
			>
				<ClosableBlockDemo />
			</Example>
		</Stack>
	)
}
