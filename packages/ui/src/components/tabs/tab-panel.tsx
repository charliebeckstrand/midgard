import type { ComponentPropsWithoutRef } from 'react'
export type TabPanelsProps = ComponentPropsWithoutRef<'div'>

export function TabPanels({ className, ...props }: TabPanelsProps) {
	return <div data-slot="tab-panels" className={className} {...props} />
}

export type TabPanelProps = {
	/** Matches the corresponding Tab's id for aria-labelledby. */
	id?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'id'>

export function TabPanel({ id, className, ...props }: TabPanelProps) {
	return (
		<div
			data-slot="tab-panel"
			role="tabpanel"
			id={id ? `${id}-panel` : undefined}
			aria-labelledby={id}
			className={className}
			{...props}
		/>
	)
}
