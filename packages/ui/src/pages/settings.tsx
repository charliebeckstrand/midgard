import type React from 'react'
import { Fieldset } from '../components/fieldset/component'
import { SettingsLayout } from '../layouts/settings'

export type SettingsPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	submitting?: boolean
	heading?: React.ReactNode
	tabs?: React.ReactNode
	children: React.ReactNode
	actions?: React.ReactNode
}

export function SettingsPage({
	onSubmit,
	submitting,
	heading,
	tabs,
	children,
	actions,
}: SettingsPageProps) {
	return (
		<form onSubmit={onSubmit}>
			<SettingsLayout heading={heading} tabs={tabs} actions={actions}>
				<Fieldset disabled={submitting} className="grid gap-6">
					{children}
				</Fieldset>
			</SettingsLayout>
		</form>
	)
}
