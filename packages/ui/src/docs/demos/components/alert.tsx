import { useState } from 'react'
import { Alert } from '../../../components/alert'
import { Button } from '../../../components/button'
import { Stack } from '../../../components/stack'
import { capitalize, Example, VariantListbox } from '../../engine'

const variants = ['solid', 'soft', 'outline', 'plain'] as const

const colorVariants = ['solid', 'soft', 'outline', 'plain'] as const

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const severities = ['info', 'success', 'warning', 'error'] as const

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
			block
			severity="info"
			title="Full-width alert"
			description="This alert stretches to fill its container."
			closable
			onOpenChange={(open) => setVisible(open)}
		/>
	)
}

export function Demo() {
	const [colorVariant, setColorVariant] = useState<(typeof colorVariants)[number]>('soft')

	return (
		<>
			<Example title="Variants">
				<Stack gap="md">
					{variants.map((variant) => (
						<Alert key={variant} variant={variant} title={`${capitalize(variant)} alert`} />
					))}
				</Stack>
			</Example>

			<Example
				title="Colors"
				actions={
					<VariantListbox
						variants={colorVariants}
						value={colorVariant}
						onValueChange={setColorVariant}
					/>
				}
			>
				<Stack gap="md">
					{colors.map((color) => (
						<Alert key={color} variant={colorVariant} color={color} title={capitalize(color)} />
					))}
				</Stack>
			</Example>

			<Example title="Severity">
				<Stack gap="md">
					{severities.map((severity) => (
						<Alert key={severity} severity={severity} title={`${capitalize(severity)} alert`} />
					))}
				</Stack>
			</Example>

			<Example title="With description">
				<Stack gap="md">
					{severities.map((severity) => (
						<Alert
							key={severity}
							severity={severity}
							title={`${capitalize(severity)} alert`}
							description="This is a description providing more details about the alert."
						/>
					))}
				</Stack>
			</Example>

			<Example title="Closable">
				<ClosableExample />
			</Example>

			<Example title="With actions">
				<Alert
					severity="warning"
					title="Storage is almost full"
					description="You have used 90% of your available storage."
					actions={
						<Button size="sm" color="amber">
							Upgrade
						</Button>
					}
				/>
			</Example>

			<Example title="Block">
				<ClosableBlockExample />
			</Example>
		</>
	)
}
