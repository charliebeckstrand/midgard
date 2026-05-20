'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { useTabsContext } from './context'

export type TabPanelsProps = SlotProps<'div'>

export const TabPanels = createSlot('div', 'tab-panels')

export type TabPanelProps = {
	/** Matches the corresponding Tab's id for `aria-labelledby`. Prefer `value` when the panel sits inside a `<Tabs>`. */
	id?: string
	/** Matches the corresponding Tab's `value`; auto-wires `aria-labelledby` / panel id via Tabs context. */
	value?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'id'>

export function TabPanel({ id, value, className, ...props }: TabPanelProps) {
	const tabsContext = useTabsContext()

	// id resolution mirrors <Tab>: explicit `id` (legacy) wins; otherwise derive a
	// stable pair from the parent Tabs' baseId + `value`.
	const panelId = id
		? `${id}-panel`
		: value !== undefined && tabsContext?.baseId
			? `${tabsContext.baseId}-panel-${value}`
			: undefined

	const labelledBy =
		id ??
		(value !== undefined && tabsContext?.baseId ? `${tabsContext.baseId}-tab-${value}` : undefined)

	return (
		<div
			data-slot="tab-panel"
			role="tabpanel"
			id={panelId}
			aria-labelledby={labelledBy}
			className={className}
			{...props}
		/>
	)
}
