import type { ComponentPropsWithoutRef } from 'react'
import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

export type TabPanelsProps = SlotProps<'div'>

export const TabPanels = createSlot('div', 'tab-panels')

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
